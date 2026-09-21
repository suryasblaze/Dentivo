/* =========================================================================
   Groq chat client.

   SECURITY — read this before going live:
   The key is kept in this browser and sent straight to api.groq.com from the
   page. Anyone who opens DevTools, or reads your deployed JavaScript, can
   take it. That is acceptable for a demo on your own machine and nowhere else.

   For production, move the call behind your Flask app:
       POST /api/assistant  { messages }  ->  streams back the reply
   and change ENDPOINT below to that route. Nothing else here needs to change.
   ========================================================================= */

import { localISO } from './format'

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', note: 'Best answers · default' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', note: 'Fastest, cheapest' },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', note: 'Strong reasoning' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', note: 'Good balance' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout', note: 'Newer, long context' },
  { id: 'qwen/qwen3-32b', label: 'Qwen 3 32B', note: 'Alternative' },
]

export const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

/* =========================================================================
   Turn the store into a compact brief the model can reason over.
   Kept deliberately small — names and numbers, no ids, no noise.
   ========================================================================= */
export function buildContext(db) {
  const { clinic, patients = [], visits = [], appointments = [], submissions = [], staff = [], plan } = db

  const name = (id) => patients.find(p => p.id === id)?.name || 'Unknown'
  const paid = (v) => (v.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0)
  const money = (n) => Math.round(Number(n) || 0)

  return {
    today: localISO(),
    currency: 'INR',
    clinic: {
      name: clinic?.name, branch: clinic?.branch, phone: clinic?.phone,
      plan: plan?.name,
    },
    staff: staff.map(s => ({ name: s.name, role: s.role })),

    totals: {
      patients: patients.length,
      visits: visits.length,
      appointments: appointments.length,
      submissionsWaiting: submissions.filter(s => s.status === 'new').length,
      collectedAllTime: money(visits.reduce((s, v) => s + paid(v), 0)),
      billedAllTime: money(visits.reduce((s, v) => s + (v.invoice?.total || 0), 0)),
      outstanding: money(patients.reduce((s, p) => s + Number(p.balance || 0), 0)),
      inClinicNow: visits.filter(v => v.stage !== 'done').length,
    },

    patients: patients.slice(0, 200).map(p => ({
      name: p.name, id: p.uhid, age: p.age || null, gender: p.gender || null,
      mobile: p.phone, problem: p.issue || null,
      conditions: (p.medical || []).filter(m => m !== 'none'),
      allergies: p.allergies || [],
      visits: p.visits || 0,
      balanceDue: money(p.balance),
      registered: p.createdAt,
    })),

    visits: visits.slice(0, 80).map(v => ({
      date: v.date, patient: name(v.patientId), stage: v.stage,
      type: v.visitType, reason: v.reason || null,
      diagnosis: v.diagnosis || [],
      findings: v.findings || [],
      teethCharted: Object.entries(v.teeth || {}).map(([t, c]) => `${t}:${c}`),
      proceduresDone: (v.plan || []).filter(p => p.status === 'done')
        .map(p => ({ name: p.name, tooth: p.tooth, price: money(p.price), category: p.cat })),
      prescription: (v.rx || []).map(d => d.name),
      invoiceTotal: money(v.invoice?.total),
      collected: money(paid(v)),
      payments: (v.payments || []).map(p => ({ mode: p.mode, amount: money(p.amount) })),
      rating: v.rating || null,
      reviewRoute: v.reviewRoute || null,
      nextVisit: v.nextVisit || null,
    })),

    appointments: appointments.slice(0, 80).map(a => ({
      date: a.date, time: a.time, minutes: a.mins,
      patient: name(a.patientId), reason: a.reason || null, status: a.status,
    })),

    submissions: submissions.slice(0, 40).map(s => ({
      date: s.date, time: s.time, name: s.name, mobile: s.phone,
      gender: s.gender, problem: s.issue, note: s.note || null, status: s.status,
    })),
  }
}

const SYSTEM = `You are the assistant inside Dentivo, dental clinic software used in India.

You are given a JSON snapshot of ONE clinic's saved data. Answer only from it.

Rules:
- Money is Indian rupees. Write it like ₹12,500 with Indian digit grouping.
- If the snapshot does not contain what was asked, say so plainly and say what
  the user would need to record for you to answer it. Never invent a patient,
  a number, a date or a procedure.
- Be brief and concrete. Lead with the answer, then the supporting detail.
- Use short markdown: **bold** for key figures, "- " bullets for lists, and
  simple tables only when comparing three or more things.
- When asked to analyse, do the arithmetic yourself and show what you compared.
  Point out what looks off — unpaid bills, patients not returning, gaps in the
  day, treatments nobody accepts.
- You may give general dental-practice management advice, but never clinical
  advice about treating a specific patient; for that, defer to the dentist.
- Do not mention JSON, snapshots, or that you were given context.`

/* =========================================================================
   Streaming call. onToken fires for each chunk of text.
   Returns the full reply, or throws with a readable message.
   ========================================================================= */
export async function askGroq({ key, model, history, question, context, onToken, signal }) {
  if (!key) throw new Error('No API key set. Add one in Settings → AI Assistant.')

  const messages = [
    { role: 'system', content: SYSTEM },
    { role: 'system', content: 'CLINIC DATA:\n' + JSON.stringify(context) },
    ...history.slice(-10).map(m => ({ role: m.me ? 'user' : 'assistant', content: m.text || '' })),
    { role: 'user', content: question },
  ]

  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 1200,
        stream: true,
      }),
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new Error('Could not reach Groq. Check your internet connection.')
  }

  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json())?.error?.message || '' } catch { /* body not json */ }
    if (res.status === 401) throw new Error('That API key was rejected. Check it in Settings → AI Assistant.')
    if (res.status === 404) throw new Error(`Model "${model}" is not available on your Groq account. Pick another in Settings.`)
    if (res.status === 429) throw new Error('Groq rate limit hit. Wait a moment and try again.')
    throw new Error(detail || `Groq returned ${res.status}.`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''          // keep the partial line for next round

    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('data:')) continue
      const payload = t.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const chunk = JSON.parse(payload)
        const bit = chunk.choices?.[0]?.delta?.content
        if (bit) { full += bit; onToken?.(bit) }
      } catch { /* partial json, ignore */ }
    }
  }
  return full
}

/* Quick check used by the Settings screen */
export async function testKey(key, model) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
      max_tokens: 5,
    }),
  })
  if (res.status === 401) throw new Error('Key rejected')
  if (!res.ok) {
    let d = ''
    try { d = (await res.json())?.error?.message || '' } catch { /* ignore */ }
    throw new Error(d || `Groq returned ${res.status}`)
  }
  return true
}
