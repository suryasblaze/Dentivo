import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClinic } from '../store/ClinicStore'
import { BotMark, BotFull } from './Logo'
import { ask, STARTERS } from '../lib/assistant'
import { askGroq, buildContext, DEFAULT_MODEL } from '../lib/ai'
import {
  IconSparkle, IconX, IconArrowRight, IconArrowUpRight, IconShield,
  IconSettings, IconAlert, IconLock, IconCheck, IconExpand, IconCollapse,
} from '../lib/icons'

/* ---------- very small markdown: **bold**, `code`, "- " bullets, headings ---------- */
function Rich({ text = '' }) {
  const blocks = String(text).split('\n')
  const out = []
  let bullets = []

  const inline = (s, k) => {
    const parts = String(s).split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) return <b key={k + i}>{p.slice(2, -2)}</b>
      if (p.startsWith('`') && p.endsWith('`')) return <code key={k + i} className="ai-code">{p.slice(1, -1)}</code>
      return <span key={k + i}>{p}</span>
    })
  }
  const flush = (k) => {
    if (!bullets.length) return
    out.push(<ul className="ai-ul" key={'u' + k}>{bullets.map((b, i) => <li key={i}>{inline(b, k + i)}</li>)}</ul>)
    bullets = []
  }

  blocks.forEach((line, i) => {
    const t = line.trim()
    if (/^[-•*]\s+/.test(t)) { bullets.push(t.replace(/^[-•*]\s+/, '')); return }
    flush(i)
    if (!t) { out.push(<div key={'s' + i} style={{ height: 6 }} />); return }
    if (/^#{1,4}\s/.test(t)) {
      out.push(<div className="ai-h" key={'h' + i}>{inline(t.replace(/^#{1,4}\s/, ''), i)}</div>)
      return
    }
    out.push(<p className="ai-p" key={'p' + i}>{inline(t, i)}</p>)
  })
  flush('end')
  return <>{out}</>
}

/* ---------- structured answer from the offline engine ---------- */
function LocalAnswer({ a, onChip, onOpen }) {
  return (
    <>
      <Rich text={a.text} />
      {a.list?.length > 0 && (
        <div className="ai-list">
          {a.list.map((r, i) => (
            <div className="ai-row" key={i}>
              <div style={{ minWidth: 0 }}>
                <div className="ai-row-t">{r.title}</div>
                {r.sub && <div className="ai-row-s">{r.sub}</div>}
              </div>
              {r.value != null && <span className="ai-row-v">{r.value}</span>}
            </div>
          ))}
        </div>
      )}
      {a.note && <div className="ai-note">{a.note}</div>}
      {a.link && (
        <button className="btn btn-soft btn-sm" style={{ marginTop: 8 }} onClick={() => onOpen(a.link)}>
          Open the record <IconArrowUpRight size={11} />
        </button>
      )}
      {a.chips?.length > 0 && (
        <div className="ai-chips">
          {a.chips.map(c => <button key={c} className="ai-chip" onClick={() => onChip(c)}>{c}</button>)}
        </div>
      )}
    </>
  )
}

const AI_STARTERS = [
  'Summarise how the clinic is doing this month',
  'Which patients should we chase for money, and what should I say?',
  'Which treatments earn us the most, and which are we under-selling?',
  'Are there gaps in tomorrow’s schedule I should fill?',
  'Any patients who came once and never returned?',
  'Write a WhatsApp message to bring back lapsed patients',
]

export default function Assistant() {
  const store = useClinic()
  const nav = useNavigate()
  const { clinic, hasFeature, plan } = store

  const [open, setOpen] = useState(false)
  const [full, setFull] = useState(() => {
    try { return localStorage.getItem('dentivo.ai.full') === '1' } catch { return false }
  })
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState([])
  const [err, setErr] = useState('')
  const bodyRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  const key = clinic.aiKey || ''
  const model = clinic.aiModel || DEFAULT_MODEL
  const live = !!key && clinic.aiEnabled !== false
  const allowed = hasFeature('assistant')

  const db = {
    clinic, plan,
    patients: store.patients, visits: store.visits,
    appointments: store.appointments, submissions: store.submissions, staff: store.staff,
  }

  /* remember whichever size the user prefers */
  const setSize = (v) => {
    setFull(v)
    try { localStorage.setItem('dentivo.ai.full', v ? '1' : '0') } catch { /* blocked storage */ }
  }

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 60) }, [open])
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [log, busy])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key !== 'Escape' || busy) return
      if (full) setSize(false); else setOpen(false)   // shrink first, close second
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy, full])

  const stop = () => { abortRef.current?.abort(); abortRef.current = null; setBusy(false) }

  const send = async (text) => {
    const question = (text ?? q).trim()
    if (!question || busy) return
    setErr('')
    setQ('')

    const history = log
    setLog(l => [...l, { me: true, text: question }])

    /* ---------- offline rule engine ---------- */
    if (!live) {
      setBusy(true)
      setTimeout(() => {
        setLog(l => [...l, { me: false, local: ask(question, db) }])
        setBusy(false)
      }, 320)
      return
    }

    /* ---------- Groq, streamed ---------- */
    setBusy(true)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLog(l => [...l, { me: false, text: '', streaming: true }])

    try {
      await askGroq({
        key, model, history, question,
        context: buildContext(db),
        signal: ctrl.signal,
        onToken: (bit) => setLog(l => {
          const copy = [...l]
          const last = copy[copy.length - 1]
          if (last && !last.me) copy[copy.length - 1] = { ...last, text: (last.text || '') + bit }
          return copy
        }),
      })
      setLog(l => l.map((m, i) => (i === l.length - 1 ? { ...m, streaming: false } : m)))
    } catch (e) {
      if (e.name === 'AbortError') {
        setLog(l => l.map((m, i) => (i === l.length - 1 ? { ...m, streaming: false } : m)))
      } else {
        setErr(e.message)
        setLog(l => l.slice(0, -1))
      }
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  const openLink = (to) => { setOpen(false); nav(to) }
  const starters = live ? AI_STARTERS : STARTERS

  return (
    <>
      {!open && (
        <button className="ai-fab" onClick={() => setOpen(true)} title="Ask about your clinic">
          <IconSparkle size={17} />
          <span>Ask AI</span>
          {live && <i className="ai-live-dot" />}
        </button>
      )}

      {open && full && <div className="ai-backdrop" onClick={() => setSize(false)} />}

      {open && (
        <div className={`ai-panel ${full ? 'full' : ''}`}>
          <div className="ai-head">
            <BotMark size={28} />
            <div style={{ minWidth: 0 }}>
              <div className="ai-title">DentiBot</div>
              <div className="ai-sub">
                {!allowed ? 'Not on your plan'
                  : live ? `Groq · ${model.split('/').pop()}`
                    : 'Offline mode · no key set'}
              </div>
            </div>
            <div className="spacer" />
            {log.length > 0 && <button className="ai-clear" onClick={() => { setLog([]); setErr('') }}>Clear</button>}
            <button className="icon-btn" style={{ width: 26, height: 26 }}
              title={full ? 'Shrink to the corner' : 'Open full screen'}
              onClick={() => setSize(!full)}>
              {full ? <IconCollapse size={13} /> : <IconExpand size={13} />}
            </button>
            <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => setOpen(false)}>
              <IconX size={13} />
            </button>
          </div>

          <div className="ai-body" ref={bodyRef}>
            <div className={full ? 'ai-inner' : ''}>
            {/* not on plan */}
            {!allowed && (
              <div className="ai-msg">
                <div className="row" style={{ marginBottom: 6 }}>
                  <IconLock size={14} style={{ color: 'var(--a-amber)' }} />
                  <b style={{ fontSize: 'var(--fs-base)' }}>AI assistant is on Professional and above</b>
                </div>
                <Rich text={`Your plan is **${plan.name}**. Upgrade to ask free-form questions about your own data and get written analysis.`} />
                <div className="ai-chips">
                  <button className="ai-chip" onClick={() => openLink('/subscription')}>See plans</button>
                </div>
              </div>
            )}

            {/* intro */}
            {/* roomier welcome when full screen */}
            {allowed && log.length === 0 && full && (
              <div className="ai-hero">
                <BotFull width={190} />
                <h3 style={{ marginTop: 14 }}>What would you like to know?</h3>
                <p>
                  {live
                    ? 'Ask anything about this clinic — patients, money, the schedule, treatments, reviews. I can analyse, compare, spot problems and draft messages for you.'
                    : 'Running offline with built-in queries. Add a Groq key in Settings to ask anything in your own words.'}
                </p>
                <div className="ai-starters">
                  {starters.map(c => <button key={c} className="ai-chip" onClick={() => send(c)}>{c}</button>)}
                </div>
                {!live && (
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 14 }}
                    onClick={() => openLink('/settings')}>
                    <IconSettings size={12} /> Connect an AI model
                  </button>
                )}
              </div>
            )}

            {allowed && log.length === 0 && !full && (
              <>
                <div className="ai-msg">
                  <Rich text={live
                    ? 'Ask me anything about this clinic — patients, money, schedule, treatments, reviews. I can analyse, compare, spot problems and draft messages for you.'
                    : 'I am running **offline** right now, answering from your saved data with built-in queries. Add a Groq API key in Settings to ask anything in your own words.'} />
                  <div className="ai-chips">
                    {starters.map(c => <button key={c} className="ai-chip" onClick={() => send(c)}>{c}</button>)}
                  </div>
                </div>

                {!live && (
                  <div className="ai-note" style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                    <IconSettings size={12} style={{ marginTop: 1, flexShrink: 0 }} />
                    <span>
                      Want real conversation? Settings → AI Assistant, paste a Groq key.
                      <button className="ai-inline-link" onClick={() => openLink('/settings')}>Open Settings</button>
                    </span>
                  </div>
                )}

                {store.patients.length === 0 && (
                  <div className="ai-note">
                    There is no clinic data yet, so answers will be empty. Register a patient first.
                  </div>
                )}
              </>
            )}

            {/* conversation */}
            {log.map((m, i) => m.me
              ? <div className="ai-me" key={i}>{m.text}</div>
              : (
                <div className="ai-turn" key={i}>
                  <BotMark size={22} />
                  <div className="ai-msg">
                  {m.local
                    ? <LocalAnswer a={m.local} onChip={send} onOpen={openLink} />
                    : <>
                      <Rich text={m.text} />
                      {m.streaming && <span className="ai-caret" />}
                    </>}
                  </div>
                </div>
              ))}

            {busy && !log[log.length - 1]?.streaming && (
              <div className="ai-turn">
                <BotMark size={22} />
                <div className="ai-msg"><div className="ai-typing"><i /><i /><i /></div></div>
              </div>
            )}

            {err && (
              <div className="ai-err">
                <IconAlert size={13} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {err}
                  <button className="ai-inline-link" onClick={() => openLink('/settings')}>Settings</button>
                </div>
              </div>
            )}
            </div>
          </div>

          <div className="ai-foot">
            <div className={full ? 'ai-foot-inner' : ''}>
            <div className="ai-input">
              <input ref={inputRef} value={q} disabled={!allowed}
                placeholder={live ? 'Ask anything about your clinic…' : 'Ask about patients, bills, appointments…'}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') send() }} />
              {busy && live
                ? <button className="ai-send stop" onClick={stop} title="Stop"><IconX size={13} /></button>
                : <button className="ai-send" disabled={!q.trim() || busy || !allowed} onClick={() => send()}>
                  <IconArrowRight size={14} />
                </button>}
            </div>
            <div className="ai-disclaimer">
              {live
                ? <><IconSparkle size={11} /> Sends your clinic data to Groq to answer. Verify anything important.</>
                : <><IconShield size={11} /> Reads your saved data only. Nothing is sent anywhere.</>}
              <span className="faint" style={{ marginLeft: 5 }}>· Esc to {full ? 'shrink' : 'close'}</span>
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
