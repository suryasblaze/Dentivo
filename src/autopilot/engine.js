/* =========================================================================
   Autopilot — the agent layer.

   An event happens (a form arrives, a patient asks a price, a call is
   missed). An agent picks it up, decides what to do, and either does it or
   asks a human. Pure functions over plain data, so the same rules can move
   to a server worker and be tested without a browser.

   Two settings decide who acts:
     · autopilot ON   — agents act on their own, except where policy says a
                        human must approve
     · autopilot OFF  — agents still do the thinking, but every action waits
                        as a draft for someone to press Do it

   Policy, not cleverness, decides what needs a human: money, clinical
   questions, complaints and anything a patient asked a person for.
   ========================================================================= */

export const MIN = 60 * 1000
export const HOUR = 60 * MIN

/* ---------------------------------------------------------------- agents */
export const AGENTS = [
  { id: 'frontdesk', name: 'Front Desk', tone: 'green', does: 'Answers WhatsApp, books and reschedules, quotes from your price list' },
  { id: 'intake', name: 'Intake', tone: 'blue', does: 'Turns a QR form into a patient record and asks the pre-visit questions' },
  { id: 'scheduler', name: 'Scheduler', tone: 'violet', does: 'Fills cancelled slots from the waitlist, confirms, recalls after 6 months' },
  { id: 'calls', name: 'Call Assistant', tone: 'amber', does: 'Picks up missed calls, offers a callback, hands urgent ones to a person' },
  { id: 'billing', name: 'Billing', tone: 'rose', does: 'Sends bills, follows up on balances, matches UPI receipts' },
  { id: 'reviews', name: 'Reviews', tone: 'green', does: 'Asks for a Google review once treatment is finished' },
  { id: 'triage', name: 'Feedback Triage', tone: 'rose', does: 'Reads private feedback, drafts the reply, flags anything clinical' },
  { id: 'manager', name: 'Clinic Manager', tone: 'slate', does: 'Evening brief: what happened, what needs you tomorrow' },
]
export const agentById = (id) => AGENTS.find(a => a.id === id) || AGENTS[0]

/* ------------------------------------------------------------- the rules
   Why an action needs a person, in plain words. This list is the product:
   everything else an agent may simply do. */
export const NEEDS_HUMAN = {
  clinical: 'A clinical question — only a dentist may answer',
  money: 'Changes what a patient pays',
  complaint: 'An unhappy patient — a person should reply',
  asked: 'The patient asked to speak to someone',
  urgent: 'Possible emergency — someone must call now',
}

const uid = (p) => p + Math.random().toString(36).slice(2, 9)
const CLINICAL = /pain|bleed|swell|swollen|infection|pus|abscess|broke|knocked|fever|emergency|urgent|numb|allerg/i
const HUMAN_ASK = /speak to (someone|a person|doctor|reception)|call me|human|talk to/i

/* ---------------------------------------------------------------- events */
export const EVENTS = {
  form: { label: 'QR form submitted', agent: 'intake' },
  question: { label: 'WhatsApp question', agent: 'frontdesk' },
  missed_call: { label: 'Missed call', agent: 'calls' },
  visit_done: { label: 'Visit completed', agent: 'reviews' },
  balance: { label: 'Balance unpaid', agent: 'billing' },
  feedback: { label: 'Private feedback', agent: 'triage' },
  cancellation: { label: 'Slot freed up', agent: 'scheduler' },
  recall: { label: 'Six months since last visit', agent: 'scheduler' },
}

/* What the agent decided to do about one event: the steps it took, the
   action it proposes, and whether policy lets it act alone. */
export function decide(event, clinic = {}) {
  const text = String(event.text || '')
  const name = (event.patient || '').split(' ')[0] || 'there'
  const step = (tool, detail) => ({ tool, detail })

  /* anything that smells clinical never gets an agent answer */
  if ((event.type === 'question' || event.type === 'missed_call') && CLINICAL.test(text)) {
    return {
      agent: 'calls',
      read: `${event.patient} mentions ${text.match(CLINICAL)[0].toLowerCase()} — possible emergency`,
      steps: [step('patient_history', 'Last visit, current treatment, allergies'), step('doctor_on_duty', 'Dr. Arun is in clinic until 7 pm')],
      action: { kind: 'callback', title: `Call ${event.patient} now`, to: 'Dr. Arun', body: `${name} reports: “${text}”. Last visit ${event.lastVisit || 'not recorded'}. Suggested: see today if swelling or fever.` },
      reason: 'urgent',
    }
  }
  if (HUMAN_ASK.test(text)) {
    return {
      agent: 'frontdesk',
      read: `${event.patient} asked to speak to a person`,
      steps: [step('patient_history', 'Pulled the file so whoever calls has it')],
      action: { kind: 'callback', title: `Call ${event.patient} back`, to: 'Reception', body: `Asked for a person: “${text}”` },
      reason: 'asked',
    }
  }

  switch (event.type) {
    case 'form':
      return {
        agent: 'intake',
        read: `New form from ${event.patient} · ${event.text || 'no reason given'}`,
        steps: [
          step('find_patient', 'No existing record with this mobile — new patient'),
          step('create_patient', `Created ${event.patient}, UHID assigned`),
          step('get_slots', 'Three openings in the next two days'),
        ],
        action: { kind: 'whatsapp', title: `Offer ${event.patient} three slots`, to: event.patient, body: `Hello ${name}, thank you for your details. Dr. Arun can see you tomorrow at 10:30 am, 4:00 pm, or Friday 11:00 am. Reply 1, 2 or 3.` },
        reason: null,
      }
    case 'question':
      return {
        agent: 'frontdesk',
        read: `${event.patient} asked: “${text}”`,
        steps: [
          step('price_list', 'Root canal ₹6,500–8,500 depending on the tooth'),
          step('get_slots', 'Tomorrow 10:30 am and 4:00 pm free'),
        ],
        action: { kind: 'whatsapp', title: `Answer ${event.patient}`, to: event.patient, body: `Hello ${name}, a root canal with us is ₹6,500 to ₹8,500 depending on the tooth, including the crown consultation. Dr. Arun can look at it tomorrow at 10:30 am or 4:00 pm — shall I book one?` },
        reason: null,
      }
    case 'missed_call':
      return {
        agent: 'calls',
        read: `Missed call from ${event.patient}${event.when ? ` at ${event.when}` : ''} — nobody free at the desk`,
        steps: [step('find_patient', 'Existing patient, last visit 5 months ago'), step('get_slots', 'Two openings tomorrow')],
        action: { kind: 'whatsapp', title: `Reply to ${event.patient}'s missed call`, to: event.patient, body: `Hello ${name}, sorry we missed your call — we were with a patient. Shall I book you in tomorrow at 10:30 am or 4:00 pm? Or reply CALL and we will ring you back.` },
        reason: null,
      }
    case 'visit_done':
      return {
        agent: 'reviews',
        read: `${event.patient}'s treatment finished — the review ask is due in 30 minutes`,
        steps: [step('check_rules', 'Treatment complete · not asked in 60 days · not opted out')],
        action: { kind: 'whatsapp', title: `Send ${event.patient} the bill and review link`, to: event.patient, body: `Hello ${name}, thank you for visiting. Your bill is ready, and if you have 10 seconds we would love your feedback.` },
        reason: null,
      }
    case 'balance':
      return {
        agent: 'billing',
        read: `${event.patient} owes ₹${event.amount || 0}, ${event.days || 7} days old`,
        steps: [step('check_payments', 'Nothing received since the visit'), step('upi_link', 'Payment link ready')],
        action: { kind: 'whatsapp', title: `Remind ${event.patient} politely`, to: event.patient, body: `Hello ${name}, a gentle reminder of the ₹${event.amount || 0} balance from your visit. You can pay by UPI here, or at the clinic next time — whichever is easier.` },
        reason: null,
      }
    case 'feedback':
      return {
        agent: 'triage',
        read: `${event.rating || 2}★ from ${event.patient}: “${text}”`,
        steps: [
          step('classify', 'Waiting time · negative · not clinical'),
          step('history', 'Second visit, no previous complaint'),
          step('draft_reply', 'Apology written, no discount offered'),
        ],
        action: { kind: 'reply', title: `Reply to ${event.patient}`, to: event.patient, body: `Hello ${name}, thank you for telling us — waiting 40 minutes is not the experience we want. Dr. Arun has asked me to apologise, and we are spacing appointments differently from next week.` },
        reason: 'complaint',
      }
    case 'cancellation':
      return {
        agent: 'scheduler',
        read: `${event.text || '4:00 pm tomorrow'} came free — 3 patients are waiting for an earlier slot`,
        steps: [step('waitlist', 'Ranked by how long they have waited'), step('check_rules', 'One message each, nothing repeated')],
        action: { kind: 'whatsapp', title: 'Offer the slot to the waitlist', to: '3 patients', body: 'Hello, a slot has opened tomorrow at 4:00 pm. Reply YES and it is yours — first reply gets it.' },
        reason: null,
      }
    case 'recall':
      return {
        agent: 'scheduler',
        read: `${event.patient} last came 6 months ago — due a check-up`,
        steps: [step('history', 'Cleaning done twice, no treatment pending'), step('check_rules', 'Not contacted in 60 days')],
        action: { kind: 'whatsapp', title: `Invite ${event.patient} for a check-up`, to: event.patient, body: `Hello ${name}, it has been six months since your cleaning. Shall we book your next check-up? Mornings are usually quieter.` },
        reason: null,
      }
    default:
      return { agent: 'frontdesk', read: 'Unrecognised event', steps: [], action: null, reason: 'asked' }
  }
}

/* ------------------------------------------------------------- the switch
   Autopilot ON  → act, unless policy names a reason for a human.
   Autopilot OFF → everything waits as a draft. */
export function route(decision, { autopilot, agentModes = {} }) {
  const mode = agentModes[decision.agent] || 'auto'
  if (mode === 'off') return 'off'
  if (!autopilot || mode === 'suggest') return 'waiting'
  return decision.reason ? 'waiting' : 'done'
}

export function handle(state, event) {
  const decision = decide(event, state.clinic)
  const status = route(decision, state)
  const item = {
    id: uid('t'), at: event.at ?? state.now, event, ...decision, status,
    doneAt: status === 'done' ? (event.at ?? state.now) : null,
  }
  return { ...state, items: [item, ...state.items] }
}

/* a human pressed Do it, or Skip */
export function resolve(state, id, how, now) {
  return {
    ...state,
    items: state.items.map(i => (i.id === id
      ? { ...i, status: how === 'skip' ? 'skipped' : 'done', doneAt: now, byHuman: true }
      : i)),
  }
}

export const counts = (state) => ({
  handled: state.items.filter(i => i.status === 'done' && !i.byHuman).length,
  waiting: state.items.filter(i => i.status === 'waiting').length,
  approved: state.items.filter(i => i.byHuman && i.status === 'done').length,
  skipped: state.items.filter(i => i.status === 'skipped').length,
  total: state.items.length,
})

/* What the clinic saved: every action an agent finished on its own is work
   nobody had to do. Two minutes each is deliberately conservative. */
export const minutesSaved = (state) => counts(state).handled * 2
