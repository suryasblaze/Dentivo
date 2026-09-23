import React, { useEffect, useRef, useState } from 'react'
import './rf.css'
import { completeVisit, advance, patientAction, sendNow, sendQueue, MIN, HOUR, DAY } from './engine'
import { loadRF, saveRF, initialState, fmtTime, fmtDay } from './store'
import Phone from './Phone'
import {
  Dashboard, Visits, Automation, Requests, Feedback, Reviews, GoogleReviews,
  Insights, Templates, Integrations, Settings, stats,
} from './screens'
import {
  IconGrid, IconUsers, IconClock, IconWhatsApp, IconMail, IconSparkle, IconFile, IconBranch, IconSettings, IconX,
  IconStar, IconGoogleG,
} from '../lib/icons'

const NAV = [
  ['dashboard', 'Dashboard', IconGrid],
  ['visits', 'Visits', IconUsers],
  ['requests', 'Review Requests', IconWhatsApp],
  ['feedback', 'Feedback', IconMail],
  ['reviews', 'Reviews', IconStar],
  ['google', 'Google Reviews', IconGoogleG],
  ['automation', 'Automation', IconClock],
  ['insights', 'Insights', IconSparkle],
  ['templates', 'Templates', IconFile],
  ['integrations', 'Integrations', IconBranch],
  ['settings', 'Settings', IconSettings],
]

const DEMO_PATIENTS = [
  ['Karthik Raman', '98410 22331'], ['Divya Sundar', '99401 55120'], ['Arun Kumar', '97890 44120'],
  ['Priya Selvam', '90030 71842'], ['Vignesh M', '98843 20917'], ['Lakshmi Narayanan', '94440 63015'],
]
const wait = (ms) => new Promise(r => setTimeout(r, ms))

/* =========================================================================
   SRT ReviewFlow — standalone demo at /reviewflow.
   Visit completed → WhatsApp → patient feedback → Google or private →
   reminders stop → dashboard. A simulated clock replaces real waiting.
   ========================================================================= */
export default function ReviewFlow() {
  const [state, setState] = useState(loadRF)
  const ref = useRef(state)
  ref.current = state
  const [page, setPage] = useState('dashboard')
  const [phone, setPhone] = useState({ id: null, screen: 'chat' })
  const [banner, setBanner] = useState('')
  const [toastText, setToastText] = useState('')
  const [running, setRunning] = useState(false)
  const [flash, setFlash] = useState(false)

  useEffect(() => { saveRF(state) }, [state])
  useEffect(() => { document.title = 'SRT ReviewFlow' }, [])

  const commit = (next) => { ref.current = next; setState(next) }
  const toast = (t) => { setToastText(t); setTimeout(() => setToastText(x => (x === t ? '' : x)), 2800) }
  const req = state.requests.find(r => r.id === phone.id) || null

  /* ---------- actions ---------- */
  const complete = (visit) => {
    const { state: next, note } = completeVisit(ref.current, visit, ref.current.now)
    commit(next)
    setPhone({ id: next.requests[0].id, screen: 'chat' })
    toast(note)
    return next.requests[0].id
  }
  const forward = (ms) => {
    const s = ref.current
    commit(advance(s, s.now + ms))
  }
  const act = (action, data) => {
    if (!phone.id) return
    const s = ref.current
    commit(patientAction(s, phone.id, action, data, s.now))
    setFlash(false)
    if (action === 'google' || action === 'private') setBanner('')
  }
  const openPhone = (id) => setPhone({ id, screen: 'chat' })
  const send = (id) => {
    const s0 = ref.current
    commit(sendNow(s0, id, s0.now))          // the chat opens from the link itself
  }

  /* ---------- the guided demo ---------- */
  const runDemo = async () => {
    if (running) return
    setRunning(true)
    try {
      const used = new Set(ref.current.visits.map(v => v.mobile))
      const pick = DEMO_PATIENTS.find(([, m]) => !used.has(m.replace(/\D/g, ''))) ||
        [`Patient ${ref.current.visits.length + 1}`, `9${String(Date.now()).slice(-9)}`]
      setPage('dashboard')

      setBanner('1 / 4 · Reception taps “Complete Visit” — that is their only step')
      await wait(900)
      const id = complete({ name: pick[0], mobile: pick[1], doctor: ref.current.clinic.doctors[0] || ref.current.clinic.doctor, visitType: 'Check-up' })
      await wait(1500)

      const r = ref.current.requests.find(x => x.id === id)
      if (r?.status !== 'scheduled') { setBanner(''); return }
      const manual = ref.current.config.sendMode === 'manual'
      setBanner(`2 / 4 · ReviewFlow waits ${Math.round((r.nextAt - ref.current.now) / MIN)} minutes, then ${manual ? 'puts the message in the send queue' : 'sends the WhatsApp message by itself'}`)
      await wait(1400)
      commit(advance(ref.current, r.nextAt + MIN))
      setPhone({ id, screen: 'chat' })
      await wait(manual ? 1200 : 1800)

      if (ref.current.requests.find(x => x.id === id)?.status === 'queued') {
        setBanner('2 / 4 · Reception taps Send — the chat opens with the message already written')
        await wait(1300)
        commit(sendNow(ref.current, id, ref.current.now))
        await wait(1400)
      }

      setBanner('3 / 4 · The patient taps “Share Feedback” — no app, no login')
      await wait(1200)
      commit(advance(ref.current, ref.current.now + 4 * MIN))
      commit(patientAction(ref.current, id, 'open', {}, ref.current.now))
      setPhone({ id, screen: 'landing' })
      await wait(900)

      setBanner('4 / 4 · Your turn — tap a choice on the phone, as the patient would')
      setFlash(true)
    } finally {
      setRunning(false)
    }
  }

  const reset = () => {
    if (!window.confirm('Clear all ReviewFlow demo data in this browser?')) return
    const fresh = { ...initialState(), clinic: ref.current.clinic, templates: ref.current.templates, config: ref.current.config }
    commit(fresh)
    setPhone({ id: null, screen: 'chat' })
    setBanner('')
    toast('Demo data cleared')
  }

  const set = (fn) => commit(fn(ref.current))
  const setClinic = (p) => set(s => ({ ...s, clinic: { ...s.clinic, ...p } }))
  const setConfig = (p) => set(s => ({ ...s, config: { ...s.config, ...p } }))
  const setTemplates = (p) => set(s => ({ ...s, templates: { ...s.templates, ...p } }))
  const markReviewed = (id) => set(s => ({ ...s, feedback: s.feedback.map(f => (f.id === id ? { ...f, reviewed: true } : f)) }))
  const addGoogle = (entry) => set(s => ({ ...s, google: { ...s.google, history: [...(s.google.history || []), entry] } }))

  const s = stats(state)
  const queued = sendQueue(state).length
  const common = { state, go: setPage, openPhone, toast }
  const screens = {
    dashboard: <Dashboard {...common} runDemo={runDemo} running={running} send={send} />,
    visits: <Visits {...common} complete={complete} />,
    automation: <Automation {...common} setConfig={setConfig} />,
    requests: <Requests {...common} phoneId={phone.id} send={send} />,
    feedback: <Feedback {...common} markReviewed={markReviewed} />,
    reviews: <Reviews {...common} />,
    google: <GoogleReviews {...common} addGoogle={addGoogle} />,
    insights: <Insights {...common} />,
    templates: <Templates {...common} setTemplates={setTemplates} />,
    integrations: <Integrations {...common} set={set} />,
    settings: <Settings {...common} setClinic={setClinic} reset={reset} />,
  }

  return (
    <div className="rf">
      {/* ---------- sidebar ---------- */}
      <aside className="rf-side">
        <div className="rf-brand">
          <small>SRT DIGITAL SOLUTIONS</small>
          <b><span className="rf-mark"><IconSparkle size={13} /></span> SRT ReviewFlow</b>
        </div>
        {NAV.map(([k, label, Icon], i) => (
          <React.Fragment key={k}>
            {i === 6 && <div className="rf-sep">SETUP</div>}
            <button className={`rf-nav ${page === k ? 'on' : ''}`} onClick={() => setPage(k)}>
              <Icon size={14} /> {label}
              {k === 'feedback' && s.attention > 0 && <span className="n">{s.attention}</span>}
              {k === 'requests' && queued > 0 && <span className="n" style={{ background: 'var(--warn)' }}>{queued}</span>}
            </button>
          </React.Fragment>
        ))}
        <div className="rf-side-foot">
          “Set it up once. Let it run.”<br />
          Demo · data stays in this browser.<br />
          <a href="/">← Back to Dentivo</a>
        </div>
      </aside>

      {/* ---------- main ---------- */}
      <main className="rf-main">
        <div className="rf-top">
          <div className="rf-clock" title="Demo clock — skip ahead instead of waiting">
            <IconClock size={12} /> <span>Demo clock</span> {fmtDay(state.now)}, {fmtTime(state.now)}
            <button className="rf-ff" onClick={() => forward(30 * MIN)}>+30 min</button>
            <button className="rf-ff" onClick={() => forward(3 * HOUR)}>+3 h</button>
            <button className="rf-ff" onClick={() => forward(DAY)}>+1 day</button>
          </div>
          <span className="rf-sp" />
          {toastText && <span className="rf-badge teal" style={{ padding: '5px 10px' }}>{toastText}</span>}
          <button className="rf-btn pri" onClick={runDemo} disabled={running}>▶ Run Patient Demo</button>
        </div>
        <div className="rf-body">
          {banner && (
            <div className="rf-banner"><i /> <span className="rf-sp">{banner}</span>
              <button className="rf-btn sm" onClick={() => { setBanner(''); setFlash(false) }} aria-label="Dismiss"><IconX size={10} /></button>
            </div>
          )}
          {screens[page]}
        </div>
      </main>

      {/* ---------- patient phone ---------- */}
      <section className="rf-phone-col">
        <div className="rf-phone-cap">
          <b>Patient&apos;s phone</b><span className="rf-sp" />
          {req && <span className="rf-faint">{req.name}</span>}
        </div>
        <Phone key={req?.id || 'none'} state={state} req={req} screen={phone.screen}
          setScreen={(sc) => setPhone(p => ({ ...p, screen: sc }))} act={act} flash={flash} />
        {req && phone.screen !== 'chat' && (
          <button className="rf-btn sm" style={{ marginTop: 10 }} onClick={() => setPhone(p => ({ ...p, screen: 'chat' }))}>
            <IconWhatsApp size={11} color="currentColor" /> Back to WhatsApp
          </button>
        )}
      </section>
    </div>
  )
}
