/* =========================================================================
   Local answer engine for the in-app assistant.

   IMPORTANT: this is NOT a language model. There is no backend and no API
   key in this build, so instead of faking an LLM it reads the real store and
   computes real answers. Everything it says is derived from your saved data,
   so it is never wrong or invented.

   To swap in a real LLM later, replace `ask()` with a call to your Flask
   endpoint and keep the same return shape:
     { text, list?, table?, note?, chips? }
   ========================================================================= */

import { inr, prettyDate } from './format'

const todayISO = () => new Date().toISOString().slice(0, 10)
const daysAgoISO = (n) => {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
const paidOf = (v) => (v.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0)
const doneOf = (v) => (v.plan || []).filter(p => p.status === 'done')

/* ---------- small helpers the rules reuse ---------- */
const collectedBetween = (visits, from) =>
  visits.filter(v => v.date >= from).reduce((s, v) => s + paidOf(v), 0)

const findPatient = (q, patients) => {
  const clean = q.toLowerCase().replace(/[?.,!]/g, '')
  return patients.find(p => {
    const n = (p.name || '').toLowerCase()
    return n && (clean.includes(n) || (n.split(' ')[0].length > 2 && clean.includes(n.split(' ')[0])))
  }) || patients.find(p => p.phone && clean.includes(p.phone.replace(/\D/g, '').slice(-10)))
}

const patientLine = (p, visits) => {
  const hist = visits.filter(v => v.patientId === p.id)
  return {
    title: p.name,
    sub: `${p.uhid} · ${p.phone || 'no number'}${p.age ? ` · ${p.age}y` : ''}${p.gender ? ` ${p.gender}` : ''}`,
    value: hist.length ? `${hist.length} visit${hist.length > 1 ? 's' : ''}` : 'no visits',
  }
}

/* ========================================================================= */

const RULES = [
  /* ---------- help ---------- */
  {
    k: /^(hi|hello|hey|help|what can you do|how do you work)/i,
    run: () => ({
      text: 'I can answer questions about the data saved in this clinic. Ask me things like:',
      chips: [
        'How many patients do we have?',
        "What's today's collection?",
        'Who is in the clinic right now?',
        'Show unpaid bills',
        'Which patients owe money?',
        'Appointments today',
        'Top procedures',
        'How is business this month?',
      ],
    }),
  },

  /* ---------- counts ---------- */
  {
    k: /how many patient|total patient|patient count|number of patient/i,
    run: (db) => {
      const n = db.patients.length
      if (!n) return { text: 'No patients registered yet.', note: 'Add one from Patient Records, or convert a submission from the intake link.' }
      const thisMonth = db.patients.filter(p => p.createdAt >= daysAgoISO(30)).length
      return {
        text: `You have **${n}** registered patient${n > 1 ? 's' : ''}. ${thisMonth} added in the last 30 days.`,
        list: db.patients.slice(0, 5).map(p => patientLine(p, db.visits)),
        note: n > 5 ? `Showing the 5 most recent of ${n}.` : null,
      }
    },
  },
  {
    k: /how many (visit|appointment)|total visit/i,
    run: (db) => ({
      text: `**${db.visits.length}** visit${db.visits.length === 1 ? '' : 's'} recorded, **${db.appointments.length}** appointment${db.appointments.length === 1 ? '' : 's'} booked.`,
    }),
  },
  {
    k: /submission|intake form|qr form|link form/i,
    run: (db) => {
      const news = db.submissions.filter(s => s.status === 'new')
      const conv = db.submissions.filter(s => s.status === 'converted')
      if (!db.submissions.length) return { text: 'No submissions yet. Share the intake QR and whatever patients type lands in Submissions.' }
      return {
        text: `**${db.submissions.length}** submission${db.submissions.length > 1 ? 's' : ''} in total — ${news.length} waiting, ${conv.length} already turned into patient records.`,
        list: news.slice(0, 5).map(s => ({ title: s.name, sub: `${s.phone} · ${s.issue}`, value: s.time })),
      }
    },
  },

  /* ---------- who is here ---------- */
  {
    k: /who is (in|at) the clinic|in clinic|right now|currently|who.s here|live queue|waiting/i,
    run: (db) => {
      const open = db.visits.filter(v => v.stage !== 'done')
      if (!open.length) return { text: 'Nobody is in the clinic right now.', note: 'Check someone in from the Check-In page.' }
      return {
        text: `**${open.length}** patient${open.length > 1 ? 's' : ''} in the clinic right now.`,
        list: open.map(v => {
          const p = db.patients.find(x => x.id === v.patientId)
          return { title: p?.name || 'Unknown', sub: `${v.token} · arrived ${v.arrivedAt} · ${v.visitType}`, value: v.stage }
        }),
      }
    },
  },

  /* ---------- money ---------- */
  {
    k: /today'?s? ?(collection|revenue|earning|income|sale)|collected today|how much.*today|today.*(collect|earn|revenue)/i,
    run: (db) => {
      const t = db.visits.filter(v => v.date === todayISO())
      const got = t.reduce((s, v) => s + paidOf(v), 0)
      const billed = t.reduce((s, v) => s + (v.invoice?.total || 0), 0)
      if (!t.length) return { text: 'No visits recorded today, so nothing collected yet.' }
      return {
        text: `Collected **${inr(got)}** today across ${t.length} visit${t.length > 1 ? 's' : ''}.`,
        note: billed > got ? `${inr(billed - got)} was billed but not collected.` : 'Everything billed today has been collected.',
      }
    },
  },
  {
    k: /(this|last) week|week.s (revenue|collection)|7 days/i,
    run: (db) => {
      const got = collectedBetween(db.visits, daysAgoISO(7))
      const n = db.visits.filter(v => v.date >= daysAgoISO(7)).length
      return {
        text: `**${inr(got)}** collected in the last 7 days, from ${n} visit${n === 1 ? '' : 's'}.`,
        note: n ? `That averages ${inr(Math.round(got / Math.max(1, n)))} per visit.` : null,
      }
    },
  },
  {
    k: /(this|last) month|month.s (revenue|collection)|30 days/i,
    run: (db) => {
      const got = collectedBetween(db.visits, daysAgoISO(30))
      const n = db.visits.filter(v => v.date >= daysAgoISO(30)).length
      return { text: `**${inr(got)}** collected in the last 30 days, from ${n} visit${n === 1 ? '' : 's'}.` }
    },
  },
  {
    k: /total (revenue|collection|earning)|how much.*(made|earned|collected)|all time/i,
    run: (db) => {
      const got = db.visits.reduce((s, v) => s + paidOf(v), 0)
      const billed = db.visits.reduce((s, v) => s + (v.invoice?.total || 0), 0)
      return {
        text: `**${inr(got)}** collected in total, against ${inr(billed)} billed.`,
        note: billed > got ? `${inr(billed - got)} is still outstanding.` : null,
      }
    },
  },
  {
    k: /who owes|owes?|owing|outstanding|dues|balance|money pending/i,
    run: (db) => {
      const owing = db.patients.filter(p => Number(p.balance) > 0)
      const total = owing.reduce((s, p) => s + Number(p.balance), 0)
      if (!owing.length) return { text: 'Nothing outstanding — every patient account is settled.' }
      return {
        text: `**${inr(total)}** outstanding across ${owing.length} patient${owing.length > 1 ? 's' : ''}.`,
        list: owing.map(p => ({ title: p.name, sub: `${p.uhid} · ${p.phone || 'no number'}`, value: inr(p.balance) })),
        note: 'Send reminders from the patient file.',
      }
    },
  },
  {
    k: /payment method|how do (people|patients) pay|upi|cash or card/i,
    run: (db) => {
      const modes = {}
      db.visits.forEach(v => (v.payments || []).forEach(p => {
        const k = String(p.mode).split(' ')[0]
        modes[k] = (modes[k] || 0) + Number(p.amount || 0)
      }))
      const rows = Object.entries(modes).sort((a, b) => b[1] - a[1])
      if (!rows.length) return { text: 'No payments recorded yet.' }
      const total = rows.reduce((s, [, v]) => s + v, 0)
      return {
        text: 'Payments by method:',
        list: rows.map(([m, v]) => ({ title: m, sub: `${Math.round(v / total * 100)}% of collections`, value: inr(v) })),
      }
    },
  },

  /* ---------- appointments ---------- */
  {
    k: /appointment.*(today|now)|today.*appointment|schedule today|booked today/i,
    run: (db) => {
      const a = db.appointments.filter(x => x.date === todayISO())
      if (!a.length) return { text: 'No appointments booked for today.' }
      return {
        text: `**${a.length}** appointment${a.length > 1 ? 's' : ''} today.`,
        list: a.sort((x, y) => x.time.localeCompare(y.time)).map(x => {
          const p = db.patients.find(z => z.id === x.patientId)
          return { title: p?.name || 'Unknown', sub: `${x.time} · ${x.reason || 'Consultation'}`, value: x.status }
        }),
      }
    },
  },
  {
    k: /appointment|upcoming|scheduled|who.s coming/i,
    run: (db) => {
      const up = db.appointments.filter(x => x.date >= todayISO() && x.status === 'scheduled')
      if (!up.length) return { text: 'No upcoming appointments booked.', note: 'Book one from the Appointments page.' }
      return {
        text: `**${up.length}** upcoming appointment${up.length > 1 ? 's' : ''}.`,
        list: up.sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time)).slice(0, 8).map(x => {
          const p = db.patients.find(z => z.id === x.patientId)
          return { title: p?.name || 'Unknown', sub: `${prettyDate(x.date)} at ${x.time}`, value: x.reason || '—' }
        }),
      }
    },
  },

  /* ---------- billing ---------- */
  {
    k: /unpaid|not paid|pending (bill|invoice)|part paid|partially paid/i,
    run: (db) => {
      const open = db.visits.filter(v => v.invoice && paidOf(v) < (v.invoice.total || 0))
      if (!open.length) return { text: 'No unpaid invoices — everything billed has been collected.' }
      return {
        text: `**${open.length}** invoice${open.length > 1 ? 's' : ''} not fully paid.`,
        list: open.map(v => {
          const p = db.patients.find(x => x.id === v.patientId)
          return {
            title: p?.name || 'Unknown',
            sub: `${v.invoice.no} · ${prettyDate(v.date)}`,
            value: inr((v.invoice.total || 0) - paidOf(v)),
          }
        }),
      }
    },
  },
  {
    k: /invoice|bill(s|ing)?\b/i,
    run: (db) => {
      const withInv = db.visits.filter(v => v.invoice)
      if (!withInv.length) return { text: 'No invoices raised yet.' }
      const total = withInv.reduce((s, v) => s + (v.invoice.total || 0), 0)
      return {
        text: `**${withInv.length}** invoice${withInv.length > 1 ? 's' : ''} raised, ${inr(total)} in total.`,
        list: withInv.slice(0, 6).map(v => {
          const p = db.patients.find(x => x.id === v.patientId)
          return { title: v.invoice.no, sub: `${p?.name || 'Unknown'} · ${prettyDate(v.date)}`, value: inr(v.invoice.total || 0) }
        }),
      }
    },
  },

  /* ---------- clinical ---------- */
  {
    k: /top procedure|most (done|common) (procedure|treatment)|popular treatment/i,
    run: (db) => {
      const c = {}
      db.visits.forEach(v => doneOf(v).forEach(p => { c[p.name] = (c[p.name] || 0) + 1 }))
      const rows = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6)
      if (!rows.length) return { text: 'No procedures completed yet.' }
      return {
        text: 'Most done procedures:',
        list: rows.map(([n, v]) => ({ title: n, sub: `${v} time${v > 1 ? 's' : ''}`, value: `${v}×` })),
      }
    },
  },
  {
    k: /revenue by (speciality|specialty|category)|which treatment.*(money|revenue)|speciality/i,
    run: (db) => {
      const m = {}
      db.visits.forEach(v => doneOf(v).forEach(p => { m[p.cat || 'Other'] = (m[p.cat || 'Other'] || 0) + Number(p.price || 0) }))
      const rows = Object.entries(m).sort((a, b) => b[1] - a[1])
      if (!rows.length) return { text: 'No completed procedures yet, so there is no revenue split to show.' }
      const total = rows.reduce((s, [, v]) => s + v, 0)
      return {
        text: 'Revenue by speciality:',
        list: rows.map(([n, v]) => ({ title: n, sub: `${Math.round(v / total * 100)}% of treatment revenue`, value: inr(v) })),
      }
    },
  },
  {
    k: /(allerg|medical alert|diabet|blood pressure|hypertens|condition)/i,
    run: (db) => {
      const flagged = db.patients.filter(p => (p.medical || []).length || (p.allergies || []).length)
      if (!flagged.length) return { text: 'No patients have medical conditions or allergies recorded.' }
      return {
        text: `**${flagged.length}** patient${flagged.length > 1 ? 's have' : ' has'} medical alerts on file.`,
        list: flagged.map(p => ({
          title: p.name,
          sub: [...(p.medical || []), ...(p.allergies || []).map(a => `allergic to ${a}`)].join(', ') || '—',
          value: p.uhid,
        })),
        note: 'These show in red at check-in and on the prescription pad.',
      }
    },
  },

  /* ---------- reviews ---------- */
  {
    k: /rating|review|feedback|google|star/i,
    run: (db) => {
      const rated = db.visits.filter(v => v.rating > 0)
      if (!rated.length) return { text: 'No ratings captured yet.', note: 'The review screen runs after the WhatsApp bill step.' }
      const avg = (rated.reduce((s, v) => s + v.rating, 0) / rated.length).toFixed(1)
      const g = rated.filter(v => v.reviewRoute === 'google').length
      const p = rated.filter(v => v.reviewRoute === 'private').length
      return {
        text: `Average rating **${avg} / 5** from ${rated.length} patient${rated.length > 1 ? 's' : ''}.`,
        list: [
          { title: 'Routed to Google', sub: '4 stars and above', value: g },
          { title: 'Kept private', sub: '3 stars and below — sent to the owner', value: p },
        ],
      }
    },
  },

  /* ---------- analysis ---------- */
  {
    k: /how is (business|the clinic|it going)|summary|overview|how are we doing|performance/i,
    run: (db) => {
      if (!db.visits.length) return { text: 'Nothing to summarise yet — no visits recorded.', note: 'Complete one visit and this becomes useful.' }
      const got = db.visits.reduce((s, v) => s + paidOf(v), 0)
      const week = collectedBetween(db.visits, daysAgoISO(7))
      const rated = db.visits.filter(v => v.rating > 0)
      const avg = rated.length ? (rated.reduce((s, v) => s + v.rating, 0) / rated.length).toFixed(1) : null
      const dues = db.patients.reduce((s, p) => s + Number(p.balance || 0), 0)
      return {
        text: 'Here is where the clinic stands:',
        list: [
          { title: 'Patients registered', sub: 'All time', value: db.patients.length },
          { title: 'Visits recorded', sub: 'All time', value: db.visits.length },
          { title: 'Collected', sub: 'All time', value: inr(got) },
          { title: 'Last 7 days', sub: 'Collections', value: inr(week) },
          { title: 'Outstanding', sub: 'Across patient accounts', value: inr(dues) },
          ...(avg ? [{ title: 'Average rating', sub: `${rated.length} rated`, value: `${avg} / 5` }] : []),
        ],
      }
    },
  },
  {
    k: /busiest|best day|which day/i,
    run: (db) => {
      const byDay = {}
      db.visits.forEach(v => { byDay[v.date] = (byDay[v.date] || 0) + paidOf(v) })
      const rows = Object.entries(byDay).sort((a, b) => b[1] - a[1]).slice(0, 5)
      if (!rows.length) return { text: 'No visits recorded yet.' }
      return {
        text: `Your best day so far was **${prettyDate(rows[0][0])}** with ${inr(rows[0][1])}.`,
        list: rows.map(([d, v]) => ({ title: prettyDate(d), sub: `${db.visits.filter(x => x.date === d).length} visits`, value: inr(v) })),
      }
    },
  },
  {
    k: /average (per visit|ticket|bill|spend)/i,
    run: (db) => {
      if (!db.visits.length) return { text: 'No visits yet.' }
      const got = db.visits.reduce((s, v) => s + paidOf(v), 0)
      return { text: `Average of **${inr(Math.round(got / db.visits.length))}** collected per visit, across ${db.visits.length} visits.` }
    },
  },
  {
    k: /conversion|how many.*(convert|became patient)/i,
    run: (db) => {
      if (!db.submissions.length) return { text: 'No submissions yet, so there is nothing to convert.' }
      const conv = db.submissions.filter(s => s.status === 'converted').length
      const pct = Math.round(conv / db.submissions.length * 100)
      return { text: `**${conv} of ${db.submissions.length}** submissions became patient records — a ${pct}% conversion.` }
    },
  },
]

/* ========================================================================= */

export function ask(question, db) {
  const q = (question || '').trim()
  if (!q) return { text: 'Ask me something about your patients, appointments or billing.' }

  /* a named patient takes priority over a generic rule */
  const named = findPatient(q, db.patients)
  if (named && /\b(who|what|show|tell|about|detail|history|visit|owe|balance|contact|number)\b/i.test(q)) {
    const hist = db.visits.filter(v => v.patientId === named.id)
    const billed = hist.reduce((s, v) => s + (v.invoice?.total || 0), 0)
    const paid = hist.reduce((s, v) => s + paidOf(v), 0)
    return {
      text: `**${named.name}** — ${named.uhid}`,
      list: [
        { title: 'Mobile', sub: 'Contact', value: named.phone || '—' },
        { title: 'Age / gender', sub: 'Basics', value: [named.age, named.gender].filter(Boolean).join(' · ') || '—' },
        { title: 'Reported problem', sub: 'From intake', value: named.issue || '—' },
        { title: 'Visits', sub: `Since ${prettyDate(named.createdAt)}`, value: hist.length },
        { title: 'Billed / paid', sub: 'Lifetime', value: `${inr(billed)} / ${inr(paid)}` },
        { title: 'Balance', sub: named.balance > 0 ? 'Outstanding' : 'Settled', value: inr(named.balance || 0) },
        ...((named.medical || []).length || (named.allergies || []).length
          ? [{ title: 'Medical alerts', sub: [...(named.medical || []), ...(named.allergies || [])].join(', '), value: '⚠' }]
          : []),
      ],
      link: `/patients/${named.id}`,
    }
  }

  for (const r of RULES) if (r.k.test(q)) return r.run(db)

  return {
    text: "I could not match that to anything in your data. I can answer questions about patients, appointments, billing, treatments and reviews.",
    chips: [
      'How is business?',
      "Today's collection",
      'Who is in the clinic?',
      'Which patients owe money?',
      'Top procedures',
      'Appointments today',
    ],
  }
}

/* Questions offered when the chat is opened fresh */
export const STARTERS = [
  'How is business?',
  "Today's collection",
  'Who is in the clinic?',
  'Which patients owe money?',
  'Appointments today',
  'Top procedures',
  'Medical alerts',
  'Ratings and reviews',
]
