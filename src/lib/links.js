/* =========================================================================
   Real deep links — these are not mocks.

   · upiLink()  builds a standard UPI intent URI. Put it in a QR and any
     GPay / PhonePe / Paytm scan opens a pre-filled payment.
   · waLink()   builds a wa.me URL. Opens WhatsApp with the message typed
     out, ready to send. Works on desktop WhatsApp and on phones.
   ========================================================================= */

import { inr, prettyDate } from './format'

/* ---------- UPI ---------- */
export function upiLink({ vpa, name, amount, note }) {
  if (!vpa) return ''
  const p = new URLSearchParams()
  p.set('pa', vpa)
  if (name) p.set('pn', name)
  if (amount) p.set('am', Number(amount).toFixed(2))
  p.set('cu', 'INR')
  if (note) p.set('tn', note.slice(0, 50))
  return `upi://pay?${p.toString()}`
}

/* ---------- WhatsApp ---------- */
const digits = (phone) => {
  const d = String(phone || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.length === 10) return '91' + d          // assume India when no country code
  if (d.startsWith('0') && d.length === 11) return '91' + d.slice(1)
  return d
}

export function waLink(phone, text) {
  const n = digits(phone)
  if (!n) return ''
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}

export function openWhatsApp(phone, text) {
  const url = waLink(phone, text)
  if (!url) return false
  window.open(url, '_blank', 'noopener')
  return true
}

/* =========================================================================
   Message templates. Plain text — WhatsApp renders *bold* with asterisks.
   ========================================================================= */

/* ---------- Google review ----------
   Google gives every Business Profile an "Ask for reviews" link
   (g.page/r/…/review) that opens the write-a-review box directly. A bare
   Place ID works too. Google does not let any app post a review for the
   patient — the patient taps the stars on Google, signed in as themselves. */
export function googleReviewUrl(clinic) {
  const v = String(clinic?.googlePlaceUrl || '').trim()
  if (!v) return ''
  if (/^ChIJ[\w-]+$/.test(v)) return `https://search.google.com/local/writereview?placeid=${v}`
  return /^https?:\/\//.test(v) ? v : `https://${v}`
}

/* ---------- The bill link ----------
   The patient's phone has none of the clinic's data, so the bill travels
   inside the link, after the # — the part of a URL that browsers never send
   to any server. It is squeezed first: empty fields are dropped and the rest
   is deflate-compressed, which roughly halves the link.

   With a backend this becomes a short token (/b/x7k2p) and the bill is
   looked up on the server, which is the right answer for production. */
const b64 = (bytes) => {
  let bin = ''
  bytes.forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

const squeeze = async (bytes) => {
  if (typeof CompressionStream === 'undefined') return null
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}
const unsqueeze = async (bytes) => {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/* only what the bill page and the PDF actually show — empty fields cost
   characters in the link, so they are left out entirely */
export function billPayload({ clinic, patient, visit, bill, askReview }) {
  const keep = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) =>
    v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && !v.length)))
  return keep({
    v: 1,
    c: keep({ n: clinic?.name, a: clinic?.address, p: clinic?.phone, g: clinic?.gstin, u: clinic?.upiId, r: googleReviewUrl(clinic) }),
    p: keep({ n: patient?.name, id: patient?.uhid }),
    i: keep({ no: visit?.invoice?.no, d: visit?.invoice?.date || visit?.date, t: visit?.token, rs: visit?.reason }),
    l: (bill?.done || []).map(x => [x.name, x.tooth && x.tooth !== '—' ? x.tooth : '', Number(x.price) || 0]),
    m: [bill?.subtotal, bill?.discount, bill?.gstAmt, bill?.total, bill?.paid, bill?.due].map(n => Number(n) || 0),
    pay: (visit?.payments || []).map(x => [x.mode, Number(x.amount) || 0]),
    rx: (visit?.rx || []).map(d => [d.name, d.dose, d.days]),
    nx: visit?.nextVisit || '',
    ask: askReview ? 1 : 0,
  })
}

const origin = () => (typeof window !== 'undefined' ? window.location.origin : '')

/* A link that only works on this computer is the usual reason a demo link
   "does nothing" on a phone. */
export const isLocalLink = (url) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(String(url || ''))

/* compressed — what actually gets sent */
export async function billLink(args) {
  const id = args?.visit?.id
  if (!id) return ''
  const json = new TextEncoder().encode(JSON.stringify(billPayload(args)))
  const small = await squeeze(json).catch(() => null)
  const body = small && small.length < json.length ? 'z' + b64(small) : 'j' + b64(json)
  return `${origin()}/b/${id}#${body}`
}

/* uncompressed — for anywhere a link is needed without waiting */
export function billLinkSync(args) {
  const id = args?.visit?.id
  if (!id) return ''
  return `${origin()}/b/${id}#j${b64(new TextEncoder().encode(JSON.stringify(billPayload(args))))}`
}

/* Back to the shapes billPdf() and the bill page use. Null if the link was
   cut short, which is what a half-copied link looks like. */
export async function readBillLink(hash) {
  try {
    const raw = String(hash || '').replace(/^#/, '')
    const kind = raw[0] === 'z' || raw[0] === 'j' ? raw[0] : 'j'
    const body = raw[0] === 'z' || raw[0] === 'j' ? raw.slice(1) : raw
    const bytes = unb64(body)
    const json = new TextDecoder().decode(kind === 'z' ? await unsqueeze(bytes) : bytes)
    const d = JSON.parse(json)
    if (d?.v !== 1) return null
    const [subtotal, discount, gstAmt, total, paid, due] = d.m || []
    return {
      clinic: { name: d.c?.n, address: d.c?.a, phone: d.c?.p, gstin: d.c?.g, upiId: d.c?.u, google: d.c?.r },
      patient: { name: d.p?.n, uhid: d.p?.id },
      visit: {
        invoice: { no: d.i?.no, date: d.i?.d }, date: d.i?.d, token: d.i?.t, reason: d.i?.rs,
        payments: (d.pay || []).map(([mode, amount]) => ({ mode, amount })),
        rx: (d.rx || []).map(([name, dose, days]) => ({ name, dose, days })),
        nextVisit: d.nx || '',
      },
      bill: { done: (d.l || []).map(([name, tooth, price]) => ({ name, tooth, price })), subtotal, discount, gstAmt, total, paid, due },
      askReview: !!d.ask,
    }
  } catch {
    return null
  }
}

/* The one WhatsApp message: a short summary and one link. The link opens the
   bill, the PDF download and — when the treatment is finished — the review. */
export function billMessage({ clinic, patient, visit, bill, link, askReview }) {
  const first = (patient?.name || '').split(' ')[0]
  const lines = [
    `Hello ${first}, thank you for visiting *${clinic?.name || 'our clinic'}* today.`,
    '',
    `*Bill ${visit?.invoice?.no || ''}*   ${inr(bill?.total || 0)}`,
    `Paid ${inr(bill?.paid || 0)}${(bill?.due || 0) > 0 ? `   ·   Balance *${inr(bill.due)}*` : '   ✓'}`,
  ]
  if (visit?.nextVisit) lines.push(`Next visit: ${visit.nextVisit}`)
  lines.push('', askReview
    ? 'View or download your bill and prescription, and tell us how we did:'
    : 'View or download your bill and prescription:', link)
  if (clinic?.phone) lines.push('', `Questions? Call ${clinic.phone}.`)
  return lines.join('\n')
}

export function downloadBlob(blob, file) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function paymentLinkMessage({ clinic, patient, amount, upi }) {
  const first = (patient?.name || '').split(' ')[0]
  return [
    `Hello ${first}, your balance at *${clinic?.name || 'our clinic'}* is *${inr(amount)}*.`,
    '',
    upi ? `You can pay by UPI to: ${upi}` : '',
    '',
    'Please ignore this if you have already paid. Thank you.',
  ].filter(Boolean).join('\n')
}

export function apptMessage(kind, { clinic, patient, appt, doctor }) {
  const first = (patient?.name || '').split(' ')[0]
  const when = `${prettyDate(appt?.date)} at ${appt?.time}`
  const who = doctor ? ` with ${doctor}` : ''
  const clinicName = clinic?.name || 'our clinic'

  const bodies = {
    confirm: [
      `Hello ${first}, your appointment at *${clinicName}* is confirmed.`,
      '',
      `*When:* ${when}`,
      doctor ? `*Doctor:* ${doctor}` : '',
      appt?.reason ? `*For:* ${appt.reason}` : '',
      '',
      'Please arrive 10 minutes early. Reply here if you need to change it.',
    ],
    remind: [
      `Hello ${first}, a reminder of your appointment at *${clinicName}*${who}.`,
      '',
      `*When:* ${when}`,
      '',
      'Reply here if you cannot make it, so we can offer the slot to someone else.',
    ],
    reschedule: [
      `Hello ${first}, we need to move your appointment at *${clinicName}*.`,
      '',
      `It was booked for ${when}.`,
      '',
      'Please reply with a time that suits you and we will rebook it.',
    ],
    cancel: [
      `Hello ${first}, your appointment at *${clinicName}* on ${when} has been cancelled.`,
      '',
      'Reply here whenever you would like to book another time.',
    ],
    recall: [
      `Hello ${first}, it has been a while since your last visit to *${clinicName}*.`,
      '',
      'Shall we book you in for a check-up and cleaning? Just reply with a day that suits you.',
    ],
  }
  return (bodies[kind] || bodies.confirm).filter(l => l !== '').join('\n').replace(/\n(?=\*)/g, '\n')
}

/* ---------- The short review link ----------
   Carries no patient data, so it stays short: dentivo.app/go/sree
   A clinic listed in src/data/clinics.js needs nothing else; one that is
   not listed carries its name and Google link as readable parameters. */
export function shortReviewUrl(clinic, { listed = false } = {}) {
  const slug = String(clinic?.slug || '').trim()
  if (!slug) return ''
  const base = `${origin()}/go/${slug}`
  if (listed) return base
  const q = new URLSearchParams()
  if (clinic?.name) q.set('c', clinic.name)
  const g = googleReviewUrl(clinic)
  if (g) q.set('g', g)
  const s = q.toString()
  return s ? `${base}?${s}` : base
}

/* "Rate us on Google" on its own — no bill, no PDF, one short link */
export function reviewOnlyMessage({ clinic, patient, link }) {
  const first = (patient?.name || '').split(' ')[0]
  return [
    `Hello ${first}, thank you for visiting *${clinic?.name || 'our clinic'}* today.`,
    '',
    'If you have 10 seconds, would you tell us how we did? It helps other people find us:',
    link,
  ].join('\n')
}
