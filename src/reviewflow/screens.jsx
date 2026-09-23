import React, { useMemo, useState } from 'react'
import qrcode from 'qrcode-generator'
import { STATUS, MIN, HOUR, fill, insights, isActive, sendQueue } from './engine'
import { waLink } from '../lib/links'
import { LineChart } from '../components/Charts'
import { fmtTime, fmtWhen, fmtDur, fmtDay, initialsOf } from './store'
import {
  IconWhatsApp, IconGoogleG, IconCheck, IconClock, IconAlert, IconStar, IconArrowRight, IconSparkle,
  IconX, IconDownload, IconPrint, IconFile, IconBranch, IconMail, IconShield, IconQr,
  IconTrendUp, IconLock, IconUsers,
} from '../lib/icons'

/* ---------- small shared pieces ---------- */
const Badge = ({ tone, children }) => <span className={`rf-badge ${tone || ''}`}>{children}</span>
const StatusBadge = ({ s }) => <Badge tone={STATUS[s]?.tone}>{STATUS[s]?.label || s}</Badge>
const Switch = ({ on, onChange }) => <button className={`rf-switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on}><i /></button>
const Stars = ({ n }) => <span className="rf-stars">{[1, 2, 3, 4, 5].map(i => <IconStar key={i} size={11} filled={i <= n} />)}</span>
const Head = ({ title, sub, children }) => (
  <div className="rf-row" style={{ alignItems: 'flex-start', marginBottom: 2 }}>
    <div className="rf-sp"><h1 className="rf-h1">{title}</h1><p className="rf-sub">{sub}</p></div>
    {children}
  </div>
)
const Card = ({ title, sub, right, children, className = '', style }) => (
  <div className={`rf-card ${className}`} style={style}>
    {(title || right) && (
      <div className="rf-card-h">
        <div className="rf-sp">{title && <h3>{title}</h3>}{sub && <p>{sub}</p>}</div>{right}
      </div>
    )}
    {children}
  </div>
)
const Kpi = ({ label, value, foot, hero, alert }) => (
  <div className={`rf-card rf-kpi ${hero ? 'hero' : ''} ${alert && value > 0 ? 'alert' : ''}`}>
    <small>{label}</small><b>{value}</b>{foot && <em>{foot}</em>}
  </div>
)

export const stats = (state) => {
  const r = state.requests
  const sent = r.filter(x => x.sentAt)
  const engaged = r.filter(x => ['opened', 'clicked', 'completed'].includes(x.status) || x.outcome)
  const completed = r.filter(x => x.status === 'completed')
  const attention = state.feedback.filter(f => !f.reviewed && f.priority !== 'low')
  return {
    visits: state.visits.length, sent: sent.length, engaged: engaged.length,
    completed: completed.length, google: completed.filter(x => x.outcome === 'google').length,
    feedback: state.feedback.length, attention: attention.length,
    noResponse: r.filter(x => x.status === 'no_response').length,
    delivered: sent.length, opened: engaged.length,
  }
}

/* =========================================================================
   Send queue — the automation decides WHEN; until the WhatsApp Business API
   is live, reception taps Send and the patient's chat opens with the message
   already written (a wa.me link, exactly like Dentivo's bill).
   ========================================================================= */
export function SendQueue({ state, send, compact }) {
  const queue = sendQueue(state)
  if (state.config.sendMode !== 'manual') {
    return compact ? null : (
      <Card title="Sending" sub="Automatic">
        <div className="rf-row"><IconCheck size={14} style={{ color: 'var(--ok)' }} />
          <span>Messages go out by themselves through the WhatsApp Business API. Nobody touches anything.</span></div>
      </Card>
    )
  }
  const text = (r) => fill(r.queued === 'reminder' ? state.templates.reminder : state.templates.request,
    { clinic_name: state.clinic.name, patient_name: (r.name || '').split(' ')[0], doctor_name: r.doctor || state.clinic.doctor })

  return (
    <Card title={`Ready to send${queue.length ? ` · ${queue.length}` : ''}`}
      sub="One tap each — the chat opens with the message written"
      right={queue.length > 1 ? <Badge tone="amber">{queue.length} waiting</Badge> : null}>
      {queue.length === 0 ? (
        <div className="rf-empty" style={{ padding: 16 }}><b>Nothing waiting</b>Messages appear here when the automation says it is time.</div>
      ) : queue.map(r => (
        <div key={r.id} className="rf-tag">
          <div className="rf-sp" style={{ minWidth: 0 }}>
            <b style={{ fontSize: 12.5 }}>{r.name || r.mobile}</b>
            <span className="rf-faint"> · {r.queued === 'reminder' ? 'reminder' : 'review request'} · ready {fmtWhen(r.lastAt, state.now)}</span>
          </div>
          <a className="rf-btn sm pri" href={waLink(r.mobile, text(r))} target="_blank" rel="noreferrer"
            onClick={() => send(r.id)} style={{ textDecoration: 'none' }}>
            <IconWhatsApp size={11} color="currentColor" /> Send
          </a>
        </div>
      ))}
      {queue.length > 0 && (
        <p className="rf-faint" style={{ marginTop: 8 }}>
          About 3 seconds each. With the WhatsApp Business API connected, this queue empties itself.
        </p>
      )}
    </Card>
  )
}

/* =========================================================================
   Dashboard
   ========================================================================= */
export function Dashboard({ state, go, openPhone, runDemo, running, send }) {
  const s = stats(state)
  const hour = new Date(state.now).getHours()
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const top = insights(state.feedback).improves[0]
  const feed = state.requests
    .flatMap(r => r.events.map(e => ({ ...e, r })))
    .filter(e => e.at <= state.now)
    .sort((a, b) => b.at - a.at).slice(0, 8)

  return (
    <>
      <Head title={`${hello}, ${state.clinic.doctor}`} sub="Your patient review journey is running automatically." />

      <div className="rf-grid rf-g5" style={{ marginBottom: 12 }}>
        <Kpi hero label="Visits Completed" value={s.visits} foot="by reception" />
        <Kpi label="Requests Sent" value={s.sent} foot="automatically" />
        <Kpi label="Patients Engaged" value={s.engaged} foot="opened or responded" />
        <Kpi label="Feedback Received" value={s.completed} foot={`${s.google} to Google · ${s.feedback} private`} />
        <Kpi alert label="Needs Attention" value={s.attention} foot="unreviewed concerns" />
      </div>

      <div className="rf-grid rf-main-side">
        <div className="rf-grid" style={{ alignContent: 'start' }}>
          <Card className="rf-status-card">
            <div>
              <div className="rf-row"><h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                {state.config.enabled ? 'Automation is Running' : 'Automation is Paused'}</h3>
                <Badge tone={state.config.enabled ? 'green' : 'amber'}>{state.config.enabled ? 'Live' : 'Paused'}</Badge>
              </div>
              <div className="rf-status-list">
                <span><i className={`rf-dot ${state.whatsapp ? '' : 'off'}`} /> WhatsApp Connected</span>
                <span><i className={`rf-dot ${state.config.enabled ? '' : 'warn'}`} /> Review Automation Active</span>
                <span><i className={`rf-dot ${state.clinic.google ? '' : 'warn'}`} /> Google Review Link {state.clinic.google ? 'Active' : 'Missing'}</span>
              </div>
              <p className="rf-muted" style={{ margin: 0, fontWeight: 600 }}>
                “No manual action required for completed visits.”
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <button className="rf-btn pri" onClick={() => go('automation')}>View Automation <IconArrowRight size={12} /></button>
              <button className="rf-btn soft" onClick={runDemo} disabled={running}>▶ Run Patient Demo</button>
            </div>
          </Card>

          <SendQueue state={state} send={send} />

          <Card title="Recent activity" sub="Every step below was decided by the automation"
            right={<button className="rf-btn sm" onClick={() => go('requests')}>All requests</button>}>
            {feed.length === 0 ? (
              <div className="rf-empty"><b>Nothing yet</b>Complete a visit, or press Run Patient Demo to watch one patient go through.</div>
            ) : (
              <div className="rf-feed">
                {feed.map((e, i) => (
                  <div key={i} className="rf-feed-i" style={{ cursor: 'pointer' }} onClick={() => openPhone(e.r.id)}>
                    <time>{fmtWhen(e.at, state.now)}</time>
                    <span><b>{e.r.name}</b> · {e.text}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="rf-grid" style={{ alignContent: 'start' }}>
          <Card title="Your daily summary" sub={`Sent to ${state.clinic.doctor} on WhatsApp at 8 pm — no need to log in`}>
            <div className="rf-wa">
              <div className="rf-bubble biz">
                <b>SRT ReviewFlow · {fmtDay(state.now)}</b>{'\n'}
                {s.visits} visit{s.visits === 1 ? '' : 's'} completed.{'\n'}
                {s.sent} review request{s.sent === 1 ? ' was' : 's were'} sent automatically.{'\n'}
                {s.completed} feedback response{s.completed === 1 ? '' : 's'} received.{'\n'}
                {s.attention} item{s.attention === 1 ? '' : 's'} may need attention.
                {top ? `\n\nMost mentioned to improve: ${top[0].toLowerCase()}.` : ''}
                <time>8:00 pm</time>
              </div>
            </div>
          </Card>
          <Card title="You are only told about" sub="Not every review — just what matters">
            {[
              [<IconMail size={13} />, 'Daily summary', 'Every evening at 8 pm'],
              [<IconAlert size={13} />, 'Important feedback', 'A patient raises a real concern'],
              [<IconSparkle size={13} />, 'Weekly insight', 'The trend, every Monday morning'],
            ].map(([ic, t, d]) => (
              <div key={t} className="rf-tag"><span style={{ color: 'var(--p-d)' }}>{ic}</span><b style={{ fontSize: 12.5 }}>{t}</b><span className="rf-sp" /><span className="rf-faint">{d}</span></div>
            ))}
          </Card>
        </div>
      </div>
    </>
  )
}

/* =========================================================================
   Visits — the receptionist's only job
   ========================================================================= */
const TYPES = ['Check-up', 'Cleaning', 'Filling', 'Root canal', 'Extraction', 'Braces review', 'Other']

export function Visits({ state, complete, openPhone }) {
  const blank = { mobile: '', name: '', doctor: state.clinic.doctors[0] || state.clinic.doctor, type: '', inProgress: false, noRequest: false }
  const [f, setF] = useState(blank)
  const known = useMemo(() => {
    const d = f.mobile.replace(/\D/g, '').slice(-10)
    return d.length === 10 ? state.visits.find(v => v.mobile === d) : null
  }, [f.mobile, state.visits])
  const name = f.name || known?.name || ''
  const valid = f.mobile.replace(/\D/g, '').length >= 10 && name.trim()

  const submit = (e) => {
    e.preventDefault()
    if (!valid) return
    complete({ name: name.trim(), mobile: f.mobile, doctor: f.doctor, visitType: f.type || 'Visit', noRequest: f.noRequest || f.inProgress })
    setF({ ...blank, doctor: f.doctor })
  }
  const reqOf = (v) => state.requests.find(r => r.visitId === v.id)

  return (
    <>
      <Head title="Visits" sub="Reception enters the visit once. Everything after that is automatic." />
      <div className="rf-grid rf-main-side">
        <Card title="Add Visit" sub="About 10 seconds per patient">
          <form onSubmit={submit}>
            <div className="rf-grid rf-g2" style={{ gap: 10 }}>
              <div className="rf-field"><label>Mobile Number</label>
                <input className="rf-in" inputMode="tel" value={f.mobile} autoFocus placeholder="98400 12345"
                  onChange={e => setF({ ...f, mobile: e.target.value })} />
                {known && <span className="hint" style={{ color: 'var(--p-d)' }}>Returning patient — {known.name}</span>}
              </div>
              <div className="rf-field"><label>Patient Name</label>
                <input className="rf-in" value={name} placeholder="Full name" onChange={e => setF({ ...f, name: e.target.value })} />
              </div>
            </div>
            <div className="rf-field"><label>Doctor</label>
              <div className="rf-chips">{state.clinic.doctors.map(d => (
                <button type="button" key={d} className={`rf-chip ${f.doctor === d ? 'on' : ''}`} onClick={() => setF({ ...f, doctor: d })}>{d}</button>
              ))}</div>
            </div>
            <div className="rf-field"><label>Visit Type <span className="rf-faint">(optional)</span></label>
              <div className="rf-chips">{TYPES.map(t => (
                <button type="button" key={t} className={`rf-chip ${f.type === t ? 'on' : ''}`} onClick={() => setF({ ...f, type: f.type === t ? '' : t })}>{t}</button>
              ))}</div>
            </div>
            <label className="rf-check"><input type="checkbox" checked={f.inProgress} onChange={e => setF({ ...f, inProgress: e.target.checked })} />
              <span>Treatment continues next visit<small>Ask for feedback after the final sitting, not mid-treatment</small></span></label>
            <label className="rf-check"><input type="checkbox" checked={f.noRequest} onChange={e => setF({ ...f, noRequest: e.target.checked })} />
              <span>Don&apos;t ask this patient<small>For a complaint, a dispute or a patient who said no</small></span></label>
            <button className="rf-btn pri lg block" style={{ marginTop: 8 }} disabled={!valid}>
              <IconCheck size={14} /> Complete Visit
            </button>
          </form>
        </Card>

        <Card title="Today's visits" sub={`${state.visits.length} completed`}>
          {state.visits.length === 0 ? <div className="rf-empty"><b>No visits yet</b>Completed visits appear here with their request status.</div> : (
            <table className="rf-tbl">
              <thead><tr><th>Patient</th><th>Completed</th><th>Request</th></tr></thead>
              <tbody>{state.visits.slice(0, 12).map(v => {
                const r = reqOf(v)
                return (
                  <tr key={v.id} onClick={() => r && openPhone(r.id)}>
                    <td><b>{v.name}</b><div className="rf-faint">{v.doctor} · {v.visitType}</div></td>
                    <td className="rf-muted">{fmtWhen(v.completedAt, state.now)}</td>
                    <td>{r ? <StatusBadge s={r.status} /> : '—'}</td>
                  </tr>
                )
              })}</tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  )
}

/* =========================================================================
   Automation
   ========================================================================= */
const opt = (list) => list.map(v => <option key={v} value={v}>{fmtDur(v)}</option>)

export function Automation({ state, setConfig }) {
  const c = state.config
  const on = c.enabled
  const Wait = ({ k, list }) => (
    <div className={`rf-node wait ${on ? '' : 'off'}`}>
      <span className="ic"><IconClock size={12} /></span><span className="rf-muted" style={{ fontWeight: 700 }}>Wait</span>
      <select value={c[k]} onChange={e => setConfig({ [k]: Number(e.target.value) })}>{opt(list)}</select>
    </div>
  )
  const Node = ({ icon, title, sub, cls = '' }) => (
    <div className={`rf-node ${cls} ${on ? '' : 'off'}`}>
      <span className="ic">{icon}</span>
      <span><b style={{ display: 'block' }}>{title}</b><span className="rf-faint">{sub}</span></span>
    </div>
  )
  const Link = () => <div className="rf-link" />

  return (
    <>
      <Head title="Automation" sub="Already set up for you. Change a timing only if you want to.">
        <div className="rf-card rf-row" style={{ padding: '8px 12px' }}>
          <b>{on ? 'Automation Active' : 'Automation Paused'}</b>
          <Switch on={on} onChange={v => setConfig({ enabled: v })} />
        </div>
      </Head>

      <div className="rf-grid rf-main-side">
        <Card title="The journey every completed visit follows">
          <div className={`rf-flow ${on ? 'live' : ''}`}>
            <Node icon={<IconCheck size={15} />} title="Visit Completed" sub="Reception presses Complete Visit" />
            <Link /><Wait k="sendAfter" list={[15 * MIN, 30 * MIN, HOUR, 2 * HOUR, 4 * HOUR]} /><Link />
            <Node icon={<IconWhatsApp size={15} color="currentColor" />} title="WhatsApp Review Request" sub="Your template, with a Share Feedback button" />
            {c.maxReminders > 0 && (<>
              <Link /><Wait k="reminderAfter" list={[12 * HOUR, 24 * HOUR, 48 * HOUR]} /><Link />
              <Node icon={<IconClock size={15} />} title={c.maxReminders > 1 ? `Reminder (up to ${c.maxReminders})` : 'One Reminder'} sub="Only if the patient has done nothing" />
            </>)}
            <Link /><Wait k="stopAfter" list={[24 * HOUR, 48 * HOUR, 72 * HOUR]} /><Link />
            <Node cls="stop" icon={<IconX size={15} />} title="Stop" sub="No more messages to this patient" />
          </div>
          <div className="rf-banner" style={{ marginTop: 14, marginBottom: 0 }}>
            <IconCheck size={13} /> The moment the patient taps anything, every remaining reminder is cancelled.
          </div>
        </Card>

        <div className="rf-grid" style={{ alignContent: 'start' }}>
          <Card title="Rules" sub="Keep patients comfortable">
            <div className="rf-field"><label>Reminders if there is no response</label>
              <div className="rf-seg">{[0, 1, 2].map(n => (
                <button key={n} className={c.maxReminders === n ? 'on' : ''} onClick={() => setConfig({ maxReminders: n })}>{n === 0 ? 'None' : n}</button>
              ))}</div>
              <span className="hint">We recommend 1 — two messages in total, ever.</span>
            </div>
            <div className="rf-field"><label>Ask the same patient at most once every</label>
              <div className="rf-seg">{[30, 60, 90].map(n => (
                <button key={n} className={c.capDays === n ? 'on' : ''} onClick={() => setConfig({ capDays: n })}>{n} days</button>
              ))}</div>
              <span className="hint">Regular patients are not asked after every cleaning.</span>
            </div>
            <div className="rf-row" style={{ padding: '4px 0' }}>
              <div className="rf-sp"><b>Quiet hours</b><div className="rf-faint">No messages between 9 pm and 9 am</div></div>
              <Switch on={c.quietHours} onChange={v => setConfig({ quietHours: v })} />
            </div>
            <div className="rf-field" style={{ marginTop: 10 }}><label>How messages go out</label>
              <div className="rf-seg">
                <button className={c.sendMode === 'manual' ? 'on' : ''} onClick={() => setConfig({ sendMode: 'manual' })}>Reception taps Send</button>
                <button className={c.sendMode === 'auto' ? 'on' : ''} onClick={() => setConfig({ sendMode: 'auto' })}>WhatsApp API sends</button>
              </div>
              <span className="hint">
                {c.sendMode === 'manual'
                  ? 'Works today: the chat opens with the message ready. Timing, reminders and stop rules are still automatic.'
                  : 'Needs the WhatsApp Business Platform — Meta verification and template approval.'}
              </span></div>
          </Card>
          <Card title="Never sent to">
            {['Patients who replied STOP or tapped “Don’t send me these”', 'Visits marked “Don’t ask this patient”', 'Treatments still in progress (asked after the final sitting)', 'Anyone already asked within the limit above'].map(t => (
              <div key={t} className="rf-tag"><IconShield size={12} style={{ color: 'var(--p-d)' }} /><span style={{ fontSize: 12.5 }}>{t}</span></div>
            ))}
          </Card>
        </div>
      </div>
    </>
  )
}

/* =========================================================================
   Review requests
   ========================================================================= */
export function Requests({ state, openPhone, phoneId, send }) {
  const [filter, setFilter] = useState('all')
  const s = stats(state)
  const sent = state.requests.filter(r => r.sentAt)
  const clicked = state.requests.filter(r => r.outcome || r.status === 'clicked')
  const rows = state.requests.filter(r => filter === 'all' ? true
    : filter === 'active' ? isActive(r) : filter === 'done' ? r.status === 'completed' : !isActive(r) && r.status !== 'completed')
  const last = (r) => r.events[r.events.length - 1]

  return (
    <>
      <Head title="Review Requests" sub="Every request the automation sent, and where each patient is now.">
        <div className="rf-seg">{[['all', 'All'], ['active', 'In progress'], ['done', 'Completed'], ['closed', 'Stopped']].map(([k, l]) => (
          <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>
        ))}</div>
      </Head>
      <div className="rf-grid rf-g6" style={{ marginBottom: 12 }}>
        <Kpi label="Requests Sent" value={sent.length} />
        <Kpi label="Delivered" value={s.delivered} />
        <Kpi label="Opened" value={s.opened} />
        <Kpi label="Clicked" value={clicked.length} />
        <Kpi label="Completed" value={s.completed} />
        <Kpi label="No Response" value={s.noResponse} />
      </div>
      <div style={{ marginBottom: 12 }}><SendQueue state={state} send={send} /></div>
      <Card>
        {rows.length === 0 ? <div className="rf-empty"><b>No requests here</b>They appear the moment a visit is completed.</div> : (
          <table className="rf-tbl">
            <thead><tr><th>Patient</th><th>Date</th><th>Channel</th><th>Status</th><th>Last Activity</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id} className={phoneId === r.id ? 'sel' : ''} onClick={() => openPhone(r.id)}>
                <td><b>{r.name}</b><div className="rf-faint">{r.doctor}</div></td>
                <td className="rf-muted">{fmtWhen(r.createdAt, state.now)}</td>
                <td><Badge tone="green"><IconWhatsApp size={10} color="currentColor" /> WhatsApp</Badge></td>
                <td><StatusBadge s={r.status} />{r.reminders > 0 && <span className="rf-faint"> · {r.reminders} reminder{r.reminders > 1 ? 's' : ''}</span>}</td>
                <td className="rf-muted" style={{ fontSize: 12 }}>
                  {r.status === 'scheduled' ? `Sends at ${fmtTime(r.nextAt)}` : last(r).text}
                  {isActive(r) && r.status !== 'scheduled' && r.nextAt && <div className="rf-faint">Next step {fmtWhen(r.nextAt, state.now)}</div>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
      <p className="rf-faint" style={{ marginTop: 10 }}>
        “Completed” for Google means the patient continued to Google. Google does not tell any app whether a review was
        then posted; the live product matches new Google reviews through the Business Profile API.
      </p>
    </>
  )
}

/* =========================================================================
   Feedback inbox
   ========================================================================= */
export function Feedback({ state, markReviewed }) {
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null)
  const list = state.feedback.filter(f => filter === 'all' ? true
    : filter === 'attention' ? !f.reviewed && f.priority !== 'low'
      : filter === 'positive' ? f.sentiment === 'positive' : f.reviewed)
  const tone = { positive: ['green', 'Positive'], mixed: ['amber', 'Mixed'], negative: ['red', 'Needs Attention'] }

  return (
    <>
      <Head title="Feedback" sub="Private feedback from patients. Only your clinic sees this.">
        <div className="rf-seg">{[['all', 'All'], ['attention', 'Needs attention'], ['positive', 'Positive'], ['reviewed', 'Reviewed']].map(([k, l]) => (
          <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>
        ))}</div>
      </Head>
      {list.length === 0 ? <Card><div className="rf-empty"><b>No feedback here</b>When a patient chooses “Share Private Feedback”, it lands in this inbox.</div></Card> : (
        <div className="rf-grid">
          {list.map(f => {
            const [t, l] = tone[f.sentiment] || tone.mixed
            const quote = f.comment || [...(f.improve || []).map(x => `Could improve: ${x.toLowerCase()}`), ...(f.liked || []).map(x => `Liked: ${x.toLowerCase()}`)].join(' · ')
            return (
              <div key={f.id} className={`rf-card rf-fb ${f.priority === 'high' && !f.reviewed ? 'high' : ''} ${f.reviewed ? 'reviewed' : ''}`}>
                <div className="rf-av">{initialsOf(f.name)}</div>
                <div className="rf-sp" style={{ minWidth: 0 }}>
                  <div className="rf-row" style={{ flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13.5 }}>{f.name}</b><Badge tone={t}>{l}</Badge>
                    {f.rating > 0 && <Stars n={f.rating} />}
                    <span className="rf-sp" /><span className="rf-faint">{fmtWhen(f.at, state.now)}</span>
                  </div>
                  <p className="rf-quote">{quote ? `“${quote}”` : <span className="rf-muted">Rating only, no comment.</span>}</p>
                  <div className="rf-row" style={{ flexWrap: 'wrap' }}>
                    <span className="rf-faint">Category</span><Badge tone="teal">{f.category}</Badge>
                    <span className="rf-faint">Priority</span><Badge tone={f.priority === 'high' ? 'red' : f.priority === 'medium' ? 'amber' : ''}>{f.priority}</Badge>
                    <span className="rf-sp" />
                    <button className="rf-btn sm" onClick={() => setOpen(open === f.id ? null : f.id)}>{open === f.id ? 'Hide' : 'View'}</button>
                    {!f.reviewed && <button className="rf-btn sm soft" onClick={() => markReviewed(f.id)}><IconCheck size={11} /> Mark Reviewed</button>}
                  </div>
                  {open === f.id && (
                    <div className="rf-card" style={{ marginTop: 10, background: 'var(--bg)', boxShadow: 'none' }}>
                      <div className="rf-faint">Doctor: <b>{f.doctor}</b> · Rating: <b>{f.rating || '—'}</b></div>
                      <div className="rf-faint">Liked: <b>{(f.liked || []).join(', ') || '—'}</b></div>
                      <div className="rf-faint">Improve: <b>{(f.improve || []).join(', ') || '—'}</b></div>
                      <div className="rf-faint">Comment: <b>{f.comment || '—'}</b></div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

/* =========================================================================
   AI insights — from real feedback only
   ========================================================================= */
export function Insights({ state }) {
  const ins = insights(state.feedback)
  const s = stats(state)
  const max = (list) => Math.max(1, ...list.map(([, n]) => n))
  const List = ({ rows, color }) => rows.length === 0 ? <div className="rf-faint">Not mentioned yet.</div> : rows.slice(0, 5).map(([t, n]) => (
    <div key={t} className="rf-tag"><b style={{ fontSize: 12.5 }}>{t}</b><span className="rf-sp" />
      <span className="rf-bar"><i style={{ width: `${(n / max(rows)) * 100}%`, background: color }} /></span>
      <span className="rf-faint" style={{ width: 60, textAlign: 'right' }}>{n} mention{n > 1 ? 's' : ''}</span></div>
  ))

  return (
    <>
      <Head title="AI Insights" sub="What patients are telling you, summarised from their actual feedback." />
      <Card className="rf-ai" style={{ marginBottom: 12 }}>
        <small><IconSparkle size={11} /> AI Patient Experience Summary · based on {ins.n} response{ins.n === 1 ? '' : 's'}</small>
        <p>{ins.n ? ins.summary : 'No feedback yet. The summary writes itself once patients respond — it never invents statements.'}</p>
        {ins.n > 0 && ins.n < 5 && <small style={{ display: 'block', marginTop: 8 }}>Early read — trends become reliable after about 5 responses.</small>}
      </Card>
      <div className="rf-grid rf-g2" style={{ marginBottom: 12 }}>
        <Card title="Patients Like"><List rows={ins.likes} color="var(--ok)" /></Card>
        <Card title="Improvement Areas"><List rows={ins.improves} color="var(--warn)" /></Card>
      </div>
      <div className="rf-grid rf-g2">
        <Card title="Weekly summary" sub="Sent to the dentist every Monday">
          <div className="rf-wa"><div className="rf-bubble biz">
            <b>This week at {state.clinic.name}</b>{'\n'}
            {s.visits} visits · {s.sent} requests · {s.completed} responses{ins.avg ? ` · average ${ins.avg.toFixed(1)}★` : ''}.{'\n'}
            {ins.improves[0] ? `${ins.improves[0][0]} was the most frequently mentioned improvement topic this week.` : 'No improvement topic stood out this week.'}
            <time>Mon 9:00 am</time>
          </div></div>
        </Card>
        <Card title="How this is produced">
          {['Reads only feedback your patients actually sent', 'Every topic above links back to real responses in Feedback', 'Never writes or edits a patient’s words', 'Live product: an AI model that also reads Tamil and Tanglish'].map(t => (
            <div key={t} className="rf-tag"><IconCheck size={12} style={{ color: 'var(--ok)' }} /><span style={{ fontSize: 12.5 }}>{t}</span></div>
          ))}
        </Card>
      </div>
    </>
  )
}

/* =========================================================================
   Templates
   ========================================================================= */
export function Templates({ state, setTemplates }) {
  const vars = { clinic_name: state.clinic.name, patient_name: 'Priya', doctor_name: state.clinic.doctor }
  const T = ({ k, title, sub }) => (
    <Card title={title} sub={sub} right={<Badge tone="green"><IconCheck size={10} /> Approved by Meta</Badge>}>
      <div className="rf-grid rf-g2" style={{ alignItems: 'start' }}>
        <div>
          <textarea className="rf-in" style={{ minHeight: 130 }} value={state.templates[k]} onChange={e => setTemplates({ [k]: e.target.value })} />
          <div className="rf-chips" style={{ marginTop: 7 }}>{['clinic_name', 'patient_name', 'doctor_name'].map(v => (
            <button key={v} className="rf-chip" onClick={() => setTemplates({ [k]: state.templates[k] + ` {{${v}}}` })}>{`{{${v}}}`}</button>
          ))}</div>
        </div>
        <div className="rf-wa"><div className="rf-bubble biz">{fill(state.templates[k], vars)}<time>11:00 am</time>
          <button className="cta">↗ Share Feedback</button></div></div>
      </div>
    </Card>
  )
  return (
    <>
      <Head title="Templates" sub="Edit once. Every future patient gets it automatically." />
      <div className="rf-grid">
        <T k="request" title="Review request" sub="Sent after the visit" />
        <T k="reminder" title="Reminder" sub="Sent once, only if there was no response" />
      </div>
      <p className="rf-faint" style={{ marginTop: 10 }}>In the live product, each edit is re-submitted to Meta for approval (usually minutes to a day) before it is used.</p>
    </>
  )
}

/* =========================================================================
   Integrations
   ========================================================================= */
export function Integrations({ state, set, go }) {
  const cards = [
    { icon: <IconWhatsApp size={18} color="currentColor" />, name: 'WhatsApp', on: state.whatsapp, onL: 'Connected', offL: 'Not Connected',
      text: 'WhatsApp Business Platform. Sends requests and reminders, reports delivery and read status.', action: <button className="rf-btn sm" onClick={() => set(s => ({ ...s, whatsapp: !s.whatsapp }))}>{state.whatsapp ? 'Disconnect' : 'Connect'}</button> },
    { icon: <IconGoogleG size={18} />, name: 'Google Review', on: !!state.clinic.google, onL: 'Configured', offL: 'Not Configured',
      text: 'Your Google Business Profile review link. Patients who choose Google land straight on it.', action: <button className="rf-btn sm" onClick={() => go('settings')}>Set link</button> },
    { icon: <IconBranch size={18} />, name: 'Clinic Software', on: false, onL: 'Connected', offL: 'Not Connected',
      text: 'Start the journey automatically when a bill is closed in your clinic software. Webhook and CSV import ready; Dentivo first.', action: <button className="rf-btn sm" disabled>Coming soon</button> },
    { icon: <IconMail size={18} />, name: 'SMS', on: null, onL: 'Available', offL: 'Available',
      text: 'Fallback for numbers not on WhatsApp. Needs TRAI DLT sender and template registration.', action: <button className="rf-btn sm" disabled>Request</button> },
  ]
  return (
    <>
      <Head title="Integrations" sub="Connect once. New providers can be added later without changing your setup." />
      <div className="rf-grid rf-g2">
        {cards.map(c => (
          <Card key={c.name}>
            <div className="rf-row" style={{ marginBottom: 8 }}>
              <span className="rf-av" style={{ borderRadius: 10, background: 'var(--bg)', color: 'var(--tx)' }}>{c.icon}</span>
              <b style={{ fontSize: 14 }}>{c.name}</b><span className="rf-sp" />
              <Badge tone={c.on === null ? 'teal' : c.on ? 'green' : ''}>{c.on ? c.onL : c.offL}</Badge>
            </div>
            <p className="rf-muted" style={{ margin: '0 0 10px', lineHeight: 1.55 }}>{c.text}</p>
            {c.action}
          </Card>
        ))}
      </div>
    </>
  )
}

/* =========================================================================
   Settings (+ the optional QR)
   ========================================================================= */
function Qr({ text, size = 168 }) {
  const { n, d } = useMemo(() => {
    const q = qrcode(0, 'M'); q.addData(text); q.make()
    const n = q.getModuleCount()
    let d = ''
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c},${r}h1v1h-1z`
    return { n, d }
  }, [text])
  return (
    <svg width={size} height={size} viewBox={`-2 -2 ${n + 4} ${n + 4}`} shapeRendering="crispEdges" role="img" aria-label="QR code">
      <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" /><path d={d} fill="#0F172A" />
    </svg>
  )
}

export function Settings({ state, setClinic, toast, reset }) {
  const c = state.clinic
  const scanUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/reviewflow/scan`
  const copy = () => { navigator.clipboard?.writeText(scanUrl).then(() => toast('Link copied'), () => toast(scanUrl)) }
  const download = () => {
    const q = qrcode(0, 'M'); q.addData(scanUrl); q.make()
    const blob = new Blob([q.createSvgTag({ cellSize: 10, margin: 4 })], { type: 'image/svg+xml' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'reviewflow-qr.svg'; a.click()
  }
  return (
    <>
      <Head title="Settings" sub="Clinic details, your Google link and the optional QR code." />
      <div className="rf-grid rf-main-side">
        <div className="rf-grid" style={{ alignContent: 'start' }}>
          <Card title="Clinic details">
            <div className="rf-grid rf-g2" style={{ gap: 10 }}>
              <div className="rf-field"><label>Clinic Name</label><input className="rf-in" value={c.name} onChange={e => setClinic({ name: e.target.value, initials: initialsOf(e.target.value) || 'C' })} /></div>
              <div className="rf-field"><label>Phone</label><input className="rf-in" value={c.phone} onChange={e => setClinic({ phone: e.target.value })} /></div>
              <div className="rf-field"><label>Address</label><input className="rf-in" value={c.address} onChange={e => setClinic({ address: e.target.value })} /></div>
              <div className="rf-field"><label>Dentist greeted on the dashboard</label><input className="rf-in" value={c.doctor} onChange={e => setClinic({ doctor: e.target.value })} /></div>
            </div>
            <div className="rf-field"><label>Doctors</label>
              <input className="rf-in" value={c.doctors.join(', ')} onChange={e => setClinic({ doctors: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} />
              <span className="hint">Comma separated — shown as one-tap choices on Add Visit.</span></div>
          </Card>
          <Card title="Google review link">
            <div className="rf-field"><input className="rf-in" value={c.google} placeholder="https://g.page/r/…/review" onChange={e => setClinic({ google: e.target.value.trim() })} />
              <span className="hint">Google Business Profile → Ask for reviews → copy the link.</span></div>
          </Card>
          <Card title="Thank-you screen">
            <div className="rf-row"><div className="rf-sp"><b>Show “Book Next Appointment”</b><div className="rf-faint">Opens a WhatsApp chat with the clinic</div></div>
              <Switch on={c.booking} onChange={v => setClinic({ booking: v })} /></div>
          </Card>
          <Card title="Demo data">
            <div className="rf-row"><div className="rf-sp rf-muted">Clears visits, requests and feedback in this browser.</div>
              <button className="rf-btn sm" onClick={reset}>Reset demo</button></div>
          </Card>
        </div>
        <Card title="Clinic QR Code" sub="Optional — for the reception desk, billing counter or printed cards" right={<IconQr size={16} />}>
          <div style={{ display: 'grid', placeItems: 'center', padding: '6px 0 12px' }}>
            <div style={{ padding: 12, border: '1px solid var(--bd)', borderRadius: 14 }}><Qr text={scanUrl} /></div>
            <b style={{ marginTop: 10, fontSize: 14 }}>Scan to Share Your Feedback</b>
            <span className="rf-faint">Patient enters name and mobile — nothing else</span>
          </div>
          <div className="rf-row" style={{ justifyContent: 'center' }}>
            <button className="rf-btn sm" onClick={download}><IconDownload size={11} /> Download QR</button>
            <button className="rf-btn sm" onClick={copy}><IconFile size={11} /> Copy Link</button>
            <button className="rf-btn sm" onClick={() => window.print()}><IconPrint size={11} /> Print</button>
          </div>
        </Card>
      </div>
    </>
  )
}

/* =========================================================================
   Google reviews — the number that proves the product works.
   Typed in by hand here; the Google Business Profile API fills it later.
   ========================================================================= */
export function GoogleReviews({ state, addGoogle, toast }) {
  const hist = [...(state.google.history || [])].sort((a, b) => a.at - b.at)
  const first = hist[0], last = hist[hist.length - 1]
  const gained = first && last ? last.count - first.count : 0
  const ratingMove = first && last ? last.rating - first.rating : 0
  const days = first && last ? Math.max(1, Math.round((last.at - first.at) / (24 * 60 * 60 * 1000))) : 0
  const clicks = state.requests.filter(r => r.outcome === 'google').length
  const [count, setCount] = useState('')
  const [rating, setRating] = useState('')

  const add = (e) => {
    e.preventDefault()
    const c = Number(count), rt = Number(rating)
    if (!c || !rt || rt < 1 || rt > 5) return toast('Enter the review count and a rating between 1 and 5')
    addGoogle({ at: state.now, count: c, rating: rt })
    setCount(''); setRating('')
    toast(hist.length ? 'Reading added' : 'Starting point saved')
  }

  return (
    <>
      <Head title="Google Reviews" sub="What actually changed on your Google listing since ReviewFlow started." />
      <div className="rf-grid rf-g5" style={{ marginBottom: 12 }}>
        <Kpi hero label="Reviews gained" value={gained > 0 ? `+${gained}` : gained} foot={days ? `in ${days} day${days > 1 ? 's' : ''}` : 'add a second reading'} />
        <Kpi label="Reviews now" value={last ? last.count : '—'} foot={first ? `${first.count} at the start` : 'not recorded yet'} />
        <Kpi label="Rating now" value={last ? last.rating.toFixed(1) : '—'} foot={first ? `${ratingMove >= 0 ? '+' : ''}${ratingMove.toFixed(1)} since the start` : ''} />
        <Kpi label="Google link taps" value={clicks} foot="patients who went to Google" />
        <Kpi label="Posted reviews" value="—" foot="Google never reports this per patient" />
      </div>

      <div className="rf-grid rf-main-side">
        <Card title="Reviews gained since the start" sub={hist.length < 2 ? 'Add a second reading to see the line move' : `${hist.length} readings`}>
          {hist.length < 2 ? (
            <div className="rf-empty"><b>Two readings needed</b>Note today&apos;s number, then again next week.</div>
          ) : (
            <LineChart points={hist.map(h => h.count - first.count)} labels={hist.map(h => fmtDay(h.at).replace(/^\w+,\s*/, ''))}
              h={180} color="var(--p)" unit=" review" />
          )}
          {hist.length > 0 && (
            <table className="rf-tbl" style={{ marginTop: 10 }}>
              <thead><tr><th>Date</th><th>Reviews</th><th>Rating</th><th>Change</th></tr></thead>
              <tbody>{[...hist].reverse().map((h, i, arr) => {
                const prev = arr[i + 1]
                return (
                  <tr key={h.at} style={{ cursor: 'default' }}>
                    <td className="rf-muted">{fmtDay(h.at)}</td>
                    <td><b>{h.count}</b></td>
                    <td><Stars n={Math.round(h.rating)} /> <span className="rf-faint">{h.rating.toFixed(1)}</span></td>
                    <td>{prev
                      ? <Badge tone={h.count > prev.count ? 'green' : ''}>{h.count - prev.count >= 0 ? '+' : ''}{h.count - prev.count}</Badge>
                      : <span className="rf-faint">starting point</span>}</td>
                  </tr>
                )
              })}</tbody>
            </table>
          )}
        </Card>

        <div className="rf-grid" style={{ alignContent: 'start' }}>
          <Card title={hist.length ? 'Add today’s numbers' : 'Record your starting point'}
            sub="Open your Google listing and copy the two numbers">
            <form onSubmit={add}>
              <div className="rf-grid rf-g2" style={{ gap: 10 }}>
                <div className="rf-field"><label>Total reviews</label>
                  <input className="rf-in" inputMode="numeric" value={count} onChange={e => setCount(e.target.value)} placeholder="47" /></div>
                <div className="rf-field"><label>Average rating</label>
                  <input className="rf-in" inputMode="decimal" value={rating} onChange={e => setRating(e.target.value)} placeholder="4.3" /></div>
              </div>
              <button className="rf-btn pri block"><IconTrendUp size={13} /> Save reading</button>
            </form>
          </Card>
          <Card title="Why it is typed in by hand">
            {['Google tells no app whether a patient posted a review',
              'A Google link tap is interest, not a posted review',
              'Connecting Google Business Profile fills this in automatically later',
              'Comparing before and after is the honest measure'].map(t => (
                <div key={t} className="rf-tag"><IconShield size={12} style={{ color: 'var(--p-d)' }} /><span style={{ fontSize: 12.5 }}>{t}</span></div>
              ))}
            <button className="rf-btn block" style={{ marginTop: 8 }} disabled>Connect Google Business Profile — later</button>
          </Card>
        </div>
      </div>
    </>
  )
}

/* =========================================================================
   Reviews — everything patients sent back, in one list
   ========================================================================= */
export function Reviews({ state, openPhone }) {
  const [filter, setFilter] = useState('all')
  const fbOf = (id) => state.feedback.find(f => f.requestId === id)
  const sent = state.requests.filter(r => r.sentAt).length
  const rows = state.requests
    .filter(r => r.outcome)
    .map(r => ({ r, f: fbOf(r.id) }))
    .filter(({ r, f }) => (filter === 'all' ? true : filter === 'google' ? r.outcome === 'google' : !!f))
    .sort((a, b) => b.r.lastAt - a.r.lastAt)
  const rated = state.feedback.filter(f => f.rating > 0)
  const avg = rated.length ? rated.reduce((s, f) => s + f.rating, 0) / rated.length : 0
  const googleCount = state.requests.filter(r => r.outcome === 'google').length
  const responded = state.requests.filter(r => r.outcome).length

  return (
    <>
      <Head title="Reviews" sub="Every patient response, public and private, newest first.">
        <div className="rf-seg">{[['all', 'All'], ['google', 'Went to Google'], ['private', 'Private']].map(([k, l]) => (
          <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>
        ))}</div>
      </Head>
      <div className="rf-grid rf-g3" style={{ marginBottom: 12 }}>
        <Kpi hero label="Responses" value={responded} foot={`${googleCount} to Google · ${state.feedback.length} private`} />
        <Kpi label="Average private rating" value={rated.length ? avg.toFixed(1) : '—'} foot={`${rated.length} rated`} />
        <Kpi label="Response rate" value={`${sent ? Math.round((responded / sent) * 100) : 0}%`} foot="of messages sent" />
      </div>
      {rows.length === 0 ? (
        <Card><div className="rf-empty"><b>No responses yet</b>They land here the moment a patient chooses Google or private feedback.</div></Card>
      ) : (
        <div className="rf-grid">
          {rows.map(({ r, f }) => (
            <div key={r.id} className="rf-card rf-fb">
              <div className="rf-av">{initialsOf(r.name || 'P')}</div>
              <div className="rf-sp" style={{ minWidth: 0 }}>
                <div className="rf-row" style={{ flexWrap: 'wrap' }}>
                  <b style={{ fontSize: 13.5 }}>{r.name || r.mobile}</b>
                  {r.outcome === 'google'
                    ? <Badge tone="blue"><IconGoogleG size={9} /> Went to Google</Badge>
                    : <Badge tone="teal"><IconLock size={9} /> Private</Badge>}
                  {f?.rating > 0 && <Stars n={f.rating} />}
                  <span className="rf-sp" /><span className="rf-faint">{fmtWhen(r.lastAt, state.now)}</span>
                </div>
                <p className="rf-quote">
                  {f?.comment ? `“${f.comment}”`
                    : f ? <span className="rf-muted">{[...(f.liked || []), ...(f.improve || [])].join(' · ') || 'Rating only.'}</span>
                      : <span className="rf-muted">Posted on Google in their own words — we cannot see the text, and Google does not confirm whether it was posted.</span>}
                </p>
                <div className="rf-row">
                  {f && <Badge tone="teal">{f.category}</Badge>}
                  <span className="rf-sp" />
                  <button className="rf-btn sm" onClick={() => openPhone(r.id)}>See what they saw</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
