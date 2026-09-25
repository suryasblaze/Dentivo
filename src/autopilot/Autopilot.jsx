import React, { useEffect, useRef, useState } from 'react'
import './ap.css'
import {
  AGENTS, EVENTS, NEEDS_HUMAN, agentById, handle, resolve, counts, minutesSaved, MIN, HOUR,
} from './engine'
import {
  IconSparkle, IconCheck, IconAlert, IconClock, IconWhatsApp, IconPhone, IconUsers,
  IconCalendar, IconRupee, IconStar, IconFile, IconChart, IconX, IconArrowRight, IconShield,
} from '../lib/icons'

const KEY = 'dentivo.autopilot.v1'
const ICONS = {
  frontdesk: IconWhatsApp, intake: IconFile, scheduler: IconCalendar, calls: IconPhone,
  billing: IconRupee, reviews: IconStar, triage: IconAlert, manager: IconChart,
}

/* the day the demo plays out, in the order a real morning happens */
const SCRIPT = [
  { type: 'form', patient: 'Kavya Ramesh', text: 'Tooth sensitivity, cold water hurts', wait: 0 },
  { type: 'question', patient: 'Mohan Das', text: 'How much for a root canal?', wait: 12 * MIN },
  { type: 'missed_call', patient: 'Lakshmi Iyer', when: '11:04 am', wait: 22 * MIN },
  { type: 'cancellation', text: '4:00 pm tomorrow', wait: 35 * MIN },
  { type: 'visit_done', patient: 'Arun Kumar', wait: 55 * MIN },
  { type: 'balance', patient: 'Vignesh M', amount: 1800, days: 7, wait: 70 * MIN },
  { type: 'question', patient: 'Priya Selvam', text: 'My gum is bleeding a lot since yesterday', wait: 85 * MIN },
  { type: 'feedback', patient: 'Suresh B', rating: 2, text: 'Waited 40 minutes past my appointment time', wait: 100 * MIN },
  { type: 'recall', patient: 'Deepa N', wait: 120 * MIN },
]

const start = () => { const d = new Date(); d.setHours(10, 30, 0, 0); return d.getTime() }
const fresh = () => ({
  autopilot: true,
  agentModes: Object.fromEntries(AGENTS.map(a => [a.id, 'auto'])),
  items: [], now: start(), played: 0,
})
const load = () => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fresh()
    const s = JSON.parse(raw)
    return { ...fresh(), ...s, agentModes: { ...fresh().agentModes, ...s.agentModes } }
  } catch { return fresh() }
}
const fmt = (t) => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })

/* =========================================================================
   Autopilot — a standalone console. Agents read what comes in, do the work,
   and hand a person only what policy says a person must handle.
   ========================================================================= */
export default function Autopilot() {
  const [state, setState] = useState(load)
  const ref = useRef(state); ref.current = state
  const [running, setRunning] = useState(false)
  const [open, setOpen] = useState(null)

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private mode */ } }, [state])
  useEffect(() => { document.title = 'Autopilot — agents run the clinic' }, [])

  const commit = (s) => { ref.current = s; setState(s) }
  const c = counts(state)

  const fire = (ev) => {
    const s = ref.current
    commit(handle({ ...s, now: s.now + 3 * MIN }, { ...ev, at: s.now + 3 * MIN }))
  }

  /* play the scripted morning, one event at a time */
  const playDay = async () => {
    if (running) return
    setRunning(true)
    try {
      for (const ev of SCRIPT) {
        const s = ref.current
        const at = start() + ev.wait
        commit(handle({ ...s, now: Math.max(s.now, at) }, { ...ev, at }))
        await new Promise(r => setTimeout(r, 850))
      }
    } finally { setRunning(false) }
  }

  const setMode = (id, mode) => commit({ ...ref.current, agentModes: { ...ref.current.agentModes, [id]: mode } })
  const toggleAuto = () => commit({ ...ref.current, autopilot: !ref.current.autopilot })
  const act = (id, how) => commit(resolve(ref.current, id, how, ref.current.now))
  const reset = () => { commit(fresh()); setOpen(null) }

  const waiting = state.items.filter(i => i.status === 'waiting')
  const recent = state.items.filter(i => i.status !== 'waiting').slice(0, 14)

  return (
    <div className="ap">
      {/* ------------------------------- top ------------------------------ */}
      <header className="ap-top">
        <div className="ap-brand">
          <span className="ap-mark"><IconSparkle size={15} /></span>
          <div><small>DENTIVO LABS</small><b>Autopilot</b></div>
        </div>
        <span className="ap-sp" />
        <div className="ap-clock">
          <IconClock size={12} /> {fmt(state.now)}
          <button onClick={() => commit({ ...ref.current, now: ref.current.now + HOUR })}>+1 h</button>
        </div>
        <button className="ap-btn acc" onClick={playDay} disabled={running}>
          {running ? 'Playing…' : '▶ Play a morning'}
        </button>
        <div className={`ap-master ${state.autopilot ? 'on' : ''}`}>
          <div>
            <b>Autopilot {state.autopilot ? 'ON' : 'OFF'}</b>
            <small>{state.autopilot ? 'Agents act · you are told after' : 'Agents draft · nothing sends without you'}</small>
          </div>
          <button className={`ap-sw ${state.autopilot ? 'on' : ''}`} onClick={toggleAuto} aria-pressed={state.autopilot}><i /></button>
        </div>
      </header>

      <div className="ap-body">
        <h1 className="ap-h1">Your clinic ran itself this morning</h1>
        <p className="ap-lead">
          Eight agents read everything that came in. They did the ordinary work and stopped at the
          things a person must decide — anything clinical, anything about money, anyone unhappy.
        </p>

        {/* ------------------------------ numbers --------------------------- */}
        <div className="ap-grid ap-4" style={{ marginBottom: 14 }}>
          <div className="ap-card ap-kpi hero">
            <small>Handled by agents</small><b>{c.handled}</b><em>nobody touched these</em>
          </div>
          <div className="ap-card ap-kpi warn">
            <small>Waiting for you</small><b>{c.waiting}</b><em>{state.autopilot ? 'policy says a person decides' : 'autopilot is off'}</em>
          </div>
          <div className="ap-card ap-kpi">
            <small>You approved</small><b>{c.approved}</b><em>one tap each</em>
          </div>
          <div className="ap-card ap-kpi">
            <small>Desk time saved</small><b>{minutesSaved(state)}<span style={{ fontSize: 15 }}> min</span></b><em>today, at 2 min a task</em>
          </div>
        </div>

        <div className="ap-grid ap-main">
          {/* ----------------------------- stream --------------------------- */}
          <div>
            {waiting.length > 0 && (
              <div className="ap-card" style={{ marginBottom: 14, borderColor: '#FDE68A' }}>
                <div className="ap-head">
                  <IconAlert size={15} style={{ color: 'var(--wait)' }} />
                  <h3>Needs you · {waiting.length}</h3>
                </div>
                <p className="sub">Everything else was already done. These are the ones agents must not decide alone.</p>
                {waiting.map(i => <Item key={i.id} i={i} open={open} setOpen={setOpen} act={act} />)}
              </div>
            )}

            <div className="ap-card">
              <div className="ap-head">
                <span className="ap-busy" />
                <h3>What the agents did</h3>
                <span className="ap-sp" />
                <button className="ap-btn" onClick={reset}>Reset</button>
              </div>
              <p className="sub">Newest first. Open any one to see how it decided.</p>
              {recent.length === 0
                ? <div className="ap-empty"><b>Quiet so far</b>Press “Play a morning”, or send in an event from the right.</div>
                : recent.map(i => <Item key={i.id} i={i} open={open} setOpen={setOpen} act={act} />)}
            </div>
          </div>

          {/* ------------------------------ side ---------------------------- */}
          <div className="ap-grid" style={{ alignContent: 'start' }}>
            <div className="ap-card">
              <div className="ap-head"><h3>The agents</h3></div>
              <p className="sub">Auto does it · Suggest drafts it · Off stays quiet</p>
              <div className="ap-agents">
                {AGENTS.map(a => {
                  const Icon = ICONS[a.id] || IconSparkle
                  const mode = state.agentModes[a.id] || 'auto'
                  const did = state.items.filter(i => i.agent === a.id && i.status === 'done').length
                  return (
                    <div key={a.id} className={`ap-agent ${mode === 'off' ? 'off' : ''}`}>
                      <span className="ap-ic"><Icon size={14} color="currentColor" /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="ap-row">
                          <b>{a.name}</b>
                          {did > 0 && <span className="ap-tag green">{did} done</span>}
                        </div>
                        <p>{a.does}</p>
                        <div className="ap-modes" style={{ marginTop: 7 }}>
                          {['auto', 'suggest', 'off'].map(m => (
                            <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(a.id, m)}>
                              {m === 'auto' ? 'Auto' : m === 'suggest' ? 'Suggest' : 'Off'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="ap-card">
              <div className="ap-head"><h3>Send something in</h3></div>
              <p className="sub">Whatever a real day throws at the desk</p>
              <div className="ap-fire">
                <button onClick={() => fire({ type: 'form', patient: 'Nithya R', text: 'Chipped front tooth' })}>QR form</button>
                <button onClick={() => fire({ type: 'question', patient: 'Ravi S', text: 'Do you do braces for adults?' })}>Question</button>
                <button onClick={() => fire({ type: 'missed_call', patient: 'Anitha K', when: fmt(state.now) })}>Missed call</button>
                <button onClick={() => fire({ type: 'question', patient: 'Bala V', text: 'Severe pain and swelling since night' })}>Emergency</button>
                <button onClick={() => fire({ type: 'question', patient: 'Geetha M', text: 'Can I speak to someone please' })}>Asks for a person</button>
                <button onClick={() => fire({ type: 'balance', patient: 'Hari P', amount: 2500, days: 9 })}>Unpaid balance</button>
                <button onClick={() => fire({ type: 'feedback', patient: 'Sandhya L', rating: 2, text: 'Billing was not explained clearly' })}>Bad feedback</button>
                <button onClick={() => fire({ type: 'recall', patient: 'Karthik R' })}>Six-month recall</button>
              </div>
            </div>

            <div className="ap-card">
              <div className="ap-head"><IconShield size={14} style={{ color: 'var(--stop)' }} /><h3>What agents never do alone</h3></div>
              {Object.entries(NEEDS_HUMAN).map(([k, why]) => (
                <div key={k} className="ap-rule"><IconX size={11} style={{ color: 'var(--stop)', marginTop: 3, flexShrink: 0 }} /><span>{why}</span></div>
              ))}
              <p className="sub" style={{ margin: '10px 0 0' }}>
                These stay with a person even on full autopilot. A clinic that lets an agent answer
                a bleeding gum has no business selling software to dentists.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- one item */
function Item({ i, open, setOpen, act }) {
  const a = agentById(i.agent)
  const Icon = ICONS[i.agent] || IconSparkle
  const isOpen = open === i.id
  const kind = EVENTS[i.event.type]?.label || i.event.type
  return (
    <div className={`ap-item ${i.status}`}>
      <div className="ap-row">
        <span className="ap-ic" style={{ width: 24, height: 24, borderRadius: 7 }}><Icon size={12} color="currentColor" /></span>
        <b style={{ fontSize: 13 }}>{a.name}</b>
        <span className="ap-tag">{kind}</span>
        {i.status === 'done' && <span className="ap-tag green"><IconCheck size={9} /> {i.byHuman ? 'You approved' : 'Done by agent'}</span>}
        {i.status === 'waiting' && <span className="ap-tag amber">Waiting for you</span>}
        {i.status === 'skipped' && <span className="ap-tag">Skipped</span>}
        <span className="ap-sp" />
        <span style={{ fontSize: 11, color: 'var(--faint)' }}>{fmt(i.at)}</span>
      </div>

      <p className="ap-read">{i.read}</p>

      {i.action && (
        <div className="ap-draft">
          <b>{i.action.kind === 'callback' ? `Task → ${i.action.to}` : `Message → ${i.action.to}`} · {i.action.title}</b>
          <p>{i.action.body}</p>
        </div>
      )}

      {i.reason && i.status === 'waiting' && (
        <div className="ap-why"><IconAlert size={12} /> {NEEDS_HUMAN[i.reason]}</div>
      )}

      {isOpen && i.steps?.length > 0 && (
        <div className="ap-steps">
          {i.steps.map((s, n) => (
            <div key={n} className="ap-step"><code>{s.tool}</code><span>{s.detail}</span></div>
          ))}
        </div>
      )}

      <div className="ap-acts">
        {i.status === 'waiting' ? (
          <>
            <button className="ap-btn go" onClick={() => act(i.id, 'do')}>
              {i.action?.kind === 'callback' ? 'Assign it' : 'Send it'} <IconArrowRight size={11} />
            </button>
            <button className="ap-btn" onClick={() => act(i.id, 'skip')}>Skip</button>
          </>
        ) : null}
        <button className="ap-btn" onClick={() => setOpen(isOpen ? null : i.id)}>
          {isOpen ? 'Hide steps' : 'How it decided'}
        </button>
      </div>
    </div>
  )
}
