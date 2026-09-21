export const inr = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

export const inrShort = (n) => {
  const v = Number(n || 0)
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(1).replace('.0', '') + 'Cr'
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1).replace('.0', '') + 'L'
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1).replace('.0', '') + 'k'
  return '₹' + v
}

export const prettyDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const shortDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export const nowTime = () =>
  new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

/* The LOCAL calendar date as YYYY-MM-DD. toISOString() is UTC, which in India
   reports yesterday's date between midnight and 5:30 am. */
export const localISO = (d = new Date()) => {
  const t = new Date(d)
  t.setMinutes(t.getMinutes() - t.getTimezoneOffset())
  return t.toISOString().slice(0, 10)
}
export const todayISO = () => localISO()

/* "HH:MM" for the current local time, used to stop booking in the past */
export const nowHM = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const todayLong = () =>
  new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export const maskPhone = (p) => (p || '').replace(/(\+91 \d{5}) (\d{5})/, '$1 $2')

/* Generates a sequential-looking UHID for new demo registrations */
export const makeUHID = (n) => `SDC-2026-0${418 + n}`
export const makeToken = (n) => `A-${18 + n}`
export const makeInvoiceNo = (n) => `INV/26-27/${1284 + n}`
export const makeReceiptNo = (n) => `RCP/26-27/${991 + n}`

export const initialsOf = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

export const ageBand = (age) => (age < 13 ? 'Child' : age < 20 ? 'Teen' : age < 60 ? 'Adult' : 'Senior')

/* "Mon, 21 Sep" — for chart tooltips */
export const prettyDay = (iso) =>
  new Date(iso + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
