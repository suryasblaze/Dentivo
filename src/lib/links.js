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

export function billMessage({ clinic, patient, visit, bill }) {
  const first = (patient?.name || '').split(' ')[0]
  const done = bill?.done || []
  const lines = [
    `Hello ${first}, here is your bill from *${clinic?.name || 'our clinic'}*.`,
    '',
    `*Invoice:* ${visit?.invoice?.no || '-'}`,
    `*Date:* ${prettyDate(visit?.date)}`,
  ]

  if (done.length) {
    lines.push('', '*Treatment done today*')
    done.forEach(p => lines.push(`• ${p.name}${p.tooth && p.tooth !== '—' ? ` (tooth ${p.tooth})` : ''} — ${inr(p.price)}`))
  }

  lines.push('', `*Total:* ${inr(bill?.total || 0)}`, `*Paid:* ${inr(bill?.paid || 0)}`)
  if ((bill?.due || 0) > 0) lines.push(`*Balance:* ${inr(bill.due)}`)

  if ((visit?.rx || []).length) {
    lines.push('', '*Your medicines*')
    visit.rx.forEach((d, i) => lines.push(`${i + 1}. ${d.name} — ${d.dose}, ${d.days} days`))
  }

  if (visit?.nextVisit) lines.push('', `*Next visit:* ${visit.nextVisit}`)
  if (clinic?.phone) lines.push('', `Any questions, call us on ${clinic.phone}.`)
  return lines.join('\n')
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
