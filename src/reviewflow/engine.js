/* =========================================================================
   SRT ReviewFlow — the automation engine.

   Pure functions over plain data, so the same rules can move to the server
   unchanged (a scheduler calls advance() every minute; WhatsApp webhooks
   call patientAction()). Time is passed in, never read from the clock, so
   the demo can fast-forward a day in one click.
   ========================================================================= */

export const MIN = 60 * 1000
export const HOUR = 60 * MIN
export const DAY = 24 * HOUR

export const DEFAULT_CONFIG = {
  enabled: true,
  sendAfter: 30 * MIN,        // after the visit is completed
  reminderAfter: 24 * HOUR,   // after the request, if nothing happened
  stopAfter: 48 * HOUR,       // after the last reminder, give up quietly
  maxReminders: 1,            // 1 reminder = 2 messages in total, ever
  quietHours: true,           // never message between 9 pm and 9 am
  capDays: 60,                // ask the same number at most once in this many days
  sendMode: 'manual',         // 'manual' = reception taps Send · 'auto' = WhatsApp API sends
}

export const DEFAULT_TEMPLATES = {
  request: 'Hello {{patient_name}}, thank you for visiting {{clinic_name}} today.\n\nWe value your experience and would appreciate your honest feedback.',
  reminder: 'Hello {{patient_name}}, a gentle reminder from {{clinic_name}}. If you have a moment, we would love to hear how your visit went.',
}

/* statuses in the order a request moves through them */
export const STATUS = {
  scheduled: { label: 'Scheduled', tone: 'slate' },
  queued: { label: 'Ready to send', tone: 'amber' },
  sent: { label: 'Sent', tone: 'blue' },
  delivered: { label: 'Delivered', tone: 'blue' },
  opened: { label: 'Opened', tone: 'amber' },
  clicked: { label: 'Clicked', tone: 'amber' },
  completed: { label: 'Completed', tone: 'green' },
  no_response: { label: 'No response', tone: 'slate' },
  opted_out: { label: 'Opted out', tone: 'red' },
  skipped: { label: 'Not sent', tone: 'slate' },
}
const ACTIVE = new Set(['scheduled', 'queued', 'sent', 'delivered', 'opened', 'clicked'])
export const isActive = (r) => ACTIVE.has(r.status)

export const fill = (tpl, vars) =>
  String(tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? '')

const uid = (p) => p + Math.random().toString(36).slice(2, 9)
const ev = (at, type, text) => ({ at, type, text })

/* move a send time out of 9 pm – 9 am */
export function nextSendable(t, quiet) {
  if (!quiet) return t
  const d = new Date(t)
  const h = d.getHours()
  if (h >= 9 && h < 21) return t
  const out = new Date(d)
  if (h >= 21) out.setDate(out.getDate() + 1)
  out.setHours(9, 0, 0, 0)
  return out.getTime()
}

const digits = (m) => String(m || '').replace(/\D/g, '').slice(-10)

/* ---------------------------------------------------------------------------
   Reception pressed "Complete Visit". Creates the visit and, unless a rule
   says not to, schedules the review request. Returns { state, note }.
   --------------------------------------------------------------------------- */
export function completeVisit(state, visit, now) {
  const v = { id: uid('v'), ...visit, mobile: digits(visit.mobile), completedAt: now }
  const s = { ...state, visits: [v, ...state.visits] }
  const cfg = state.config

  const skip = (reason) => ({
    state: { ...s, requests: [{ id: uid('q'), visitId: v.id, name: v.name, mobile: v.mobile, doctor: v.doctor, createdAt: now, status: 'skipped', reason, reminders: 0, nextAt: null, events: [ev(now, 'skip', reason)] }, ...s.requests] },
    note: `Visit completed. No request sent — ${reason.toLowerCase()}.`,
  })

  if (visit.noRequest) return skip('Reception chose not to ask this patient')
  if (state.optOuts.includes(v.mobile)) return skip('Patient opted out of messages')
  if (!cfg.enabled) return skip('Automation is paused')
  const recent = state.requests.find(r => r.mobile === v.mobile && r.status !== 'skipped' && now - r.createdAt < cfg.capDays * DAY)
  if (recent) {
    const days = Math.max(1, Math.round((now - recent.createdAt) / DAY))
    return skip(`Already asked ${days} day${days > 1 ? 's' : ''} ago`)
  }

  const sendAt = nextSendable(now + cfg.sendAfter, cfg.quietHours)
  const req = {
    id: uid('q'), visitId: v.id, name: v.name, mobile: v.mobile, doctor: v.doctor,
    createdAt: now, status: 'scheduled', reminders: 0, nextAt: sendAt, outcome: null,
    events: [ev(now, 'scheduled', `Visit completed · request scheduled`)],
  }
  return { state: { ...s, requests: [req, ...s.requests] }, note: 'Visit completed. ReviewFlow automation started.' }
}

/* what actually goes out — used by the API sender and by the Send button */
function deliver(r, cfg, at, kind) {
  if (kind === 'reminder') {
    const n = r.reminders + 1
    return {
      ...r, status: 'delivered', reminders: n, queued: null, lastAt: at,
      nextAt: at + (n < cfg.maxReminders ? cfg.reminderAfter : cfg.stopAfter),
      events: [...r.events, ev(at, 'reminder', `Reminder ${n} sent — no action yet`)],
    }
  }
  return {
    ...r, status: 'delivered', sentAt: at, queued: null, lastAt: at,
    nextAt: at + (cfg.maxReminders > 0 ? cfg.reminderAfter : cfg.stopAfter),
    events: [...r.events, ev(at, 'sent', 'WhatsApp review request sent'), ev(at + MIN, 'delivered', 'Delivered')],
  }
}

/* Reception tapped Send. Same rules as the API path — only the sending differs. */
export function sendNow(state, id, now) {
  const r = state.requests.find(x => x.id === id)
  if (!r || r.status !== 'queued') return state
  return { ...state, requests: state.requests.map(x => (x.id === id ? deliver(x, state.config, now, x.queued) : x)) }
}

/* one due step for one request */
function step(r, cfg, at) {
  const manual = cfg.sendMode === 'manual'
  if (r.status === 'scheduled') {
    if (manual) return { ...r, status: 'queued', queued: 'request', nextAt: null, lastAt: at, events: [...r.events, ev(at, 'queued', 'Ready to send — waiting for reception')] }
    return deliver(r, cfg, at, 'request')
  }
  if (r.reminders < cfg.maxReminders) {
    const n = r.reminders + 1
    const sendAt = nextSendable(at, cfg.quietHours)
    if (sendAt !== at) return { ...r, nextAt: sendAt }           // wait for morning
    if (manual) return { ...r, status: 'queued', queued: 'reminder', nextAt: null, lastAt: at, events: [...r.events, ev(at, 'queued', 'Reminder ready to send — waiting for reception')] }
    return deliver(r, cfg, at, 'reminder')
  }
  return { ...r, status: 'no_response', nextAt: null, lastAt: at, events: [...r.events, ev(at, 'stop', 'No action — automation stopped')] }
}

/* ---------------------------------------------------------------------------
   Run everything that falls due up to `to`, in time order, so timestamps
   are exact even when the demo jumps a whole day.
   --------------------------------------------------------------------------- */
export function advance(state, to) {
  let requests = state.requests
  for (let guard = 0; guard < 500; guard++) {
    const due = requests.filter(r => isActive(r) && r.nextAt != null && r.nextAt <= to)
    if (!due.length) break
    const first = due.reduce((a, b) => (a.nextAt <= b.nextAt ? a : b))
    const at = first.nextAt
    requests = requests.map(r => (r.id === first.id ? step(r, state.config, at) : r))
  }
  return { ...state, requests, now: to }
}

/* ---------------------------------------------------------------------------
   What the patient did. Any real action stops every reminder.
   --------------------------------------------------------------------------- */
export function patientAction(state, id, action, data = {}, now) {
  const r = state.requests.find(x => x.id === id)
  if (!r) return state
  const put = (patch, e) => ({
    ...state,
    requests: state.requests.map(x => (x.id === id ? { ...x, ...patch, lastAt: now, events: e ? [...x.events, e] : x.events } : x)),
  })

  if (action === 'open') {
    if (!['sent', 'delivered'].includes(r.status)) return state
    return put({ status: 'opened' }, ev(now, 'opened', 'Patient opened the feedback page'))
  }
  if (action === 'google') {
    if (r.outcome) return state
    return put({ status: 'completed', outcome: 'google', nextAt: null, queued: null }, ev(now, 'google', 'Continued to Google — reminders stopped'))
  }
  if (action === 'private') {
    if (r.outcome === 'private') return state
    const fb = { id: uid('f'), requestId: id, name: r.name, doctor: r.doctor, at: now, reviewed: false, ...analyse(data), ...data }
    return {
      ...put({ status: 'completed', outcome: r.outcome || 'private', nextAt: null, queued: null }, ev(now, 'private', 'Private feedback sent — reminders stopped')),
      feedback: [fb, ...state.feedback],
    }
  }
  if (action === 'optout') {
    const next = put({ status: 'opted_out', nextAt: null, queued: null }, ev(now, 'optout', 'Patient asked not to be messaged'))
    return { ...next, optOuts: [...new Set([...state.optOuts, r.mobile])] }
  }
  return state
}

/* ---------------------------------------------------------------------------
   Feedback analysis. Tags come from what the patient actually said — the
   chips they tapped and keywords in their words. Nothing is invented.
   (Production swaps the keyword pass for an LLM, which also reads Tamil.)
   --------------------------------------------------------------------------- */
export const TOPICS = {
  'Doctor communication': /explain|clear|doctor|listen|patient with/i,
  'Friendly staff': /friendly|staff|reception|polite|kind|caring/i,
  'Painless treatment': /pain(less)?|gentle|no pain|comfort/i,
  'Cleanliness': /clean|hygien|neat/i,
  'Waiting time': /wait|late|delay|queue|long time/i,
  'Billing': /bill|cost|price|charge|expensive|payment/i,
  'Scheduling': /schedul|slot|booking|book an|reschedul|no appointment/i,
}
export const LIKES = ['Doctor communication', 'Friendly staff', 'Painless treatment', 'Cleanliness']
export const IMPROVES = ['Waiting time', 'Billing', 'Scheduling', 'Cleanliness']

export function analyse({ rating = 0, liked = [], improve = [], comment = '' }) {
  const likedT = new Set(liked)
  const improveT = new Set(improve)
  const words = String(comment || '')
  for (const [topic, rx] of Object.entries(TOPICS)) {
    if (!rx.test(words)) continue
    if (/wait|late|delay|expensive|rude|dirty|pain(?!less)|not|never|bad|poor/i.test(words) && IMPROVES.includes(topic)) improveT.add(topic)
    else if (!IMPROVES.includes(topic) || rating >= 4) likedT.add(topic)
  }
  const sentiment = rating >= 4 && !improveT.size ? 'positive'
    : (rating > 0 && rating <= 2) || (improveT.size && rating <= 3) ? 'negative'
      : improveT.size ? 'mixed' : rating === 3 ? 'mixed' : 'positive'
  const priority = sentiment === 'negative' ? 'high' : improveT.size ? 'medium' : 'low'
  const category = [...improveT][0] || [...likedT][0] || 'General'
  return { topicsLiked: [...likedT], topicsImprove: [...improveT], sentiment, priority, category }
}

/* the summary a dentist reads — built only from counts of real feedback */
export function insights(feedback) {
  const count = (key) => {
    const m = {}
    feedback.forEach(f => (f[key] || []).forEach(t => { m[t] = (m[t] || 0) + 1 }))
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }
  const likes = count('topicsLiked')
  const improves = count('topicsImprove')
  const rated = feedback.filter(f => f.rating > 0)
  const avg = rated.length ? rated.reduce((s, f) => s + f.rating, 0) / rated.length : 0
  let summary = ''
  if (feedback.length) {
    const parts = []
    if (likes.length) parts.push(`Patients most often mentioned ${likes.slice(0, 2).map(([t]) => t.toLowerCase()).join(' and ')}`)
    if (improves.length) parts.push(`${improves[0][0]} was the most common improvement topic (${improves[0][1]} mention${improves[0][1] > 1 ? 's' : ''})`)
    if (!parts.length) parts.push('Feedback so far did not name a specific topic')
    summary = parts.join('. ') + '.'
  }
  return { likes, improves, avg, summary, n: feedback.length }
}

/* everything waiting for reception to tap Send, oldest first */
export const sendQueue = (state) =>
  state.requests.filter(r => r.status === 'queued').sort((a, b) => a.lastAt - b.lastAt)
