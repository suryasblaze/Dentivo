import { DEFAULT_CONFIG, DEFAULT_TEMPLATES } from './engine'

/* Demo storage — this browser only, separate from Dentivo's data. */
export const RF_KEY = 'srt-reviewflow.v1'

const startOfDemo = () => {
  const d = new Date()
  d.setHours(10, 30, 0, 0)
  return d.getTime()
}

export const initialState = () => ({
  clinic: {
    name: 'Smile Care Dental', initials: 'SC', doctor: 'Dr. Arun',
    doctors: ['Dr. Arun', 'Dr. Meena'], phone: '+91 98400 12345',
    address: 'Anna Nagar, Chennai', google: '', booking: true,
  },
  config: { ...DEFAULT_CONFIG },
  templates: { ...DEFAULT_TEMPLATES },
  whatsapp: true,       // demo: a sandbox number is "connected"
  visits: [], requests: [], feedback: [], optOuts: [],
  google: { history: [] },   // hand-entered Google review count + rating over time
  now: startOfDemo(),
})

export function loadRF() {
  try {
    const raw = localStorage.getItem(RF_KEY)
    if (!raw) return initialState()
    const s = JSON.parse(raw)
    const base = initialState()
    return {
      ...base, ...s,
      clinic: { ...base.clinic, ...s.clinic },
      config: { ...base.config, ...s.config },
      templates: { ...base.templates, ...s.templates },
      google: { ...base.google, ...s.google },
    }
  } catch {
    return initialState()
  }
}

export function saveRF(state) {
  try { localStorage.setItem(RF_KEY, JSON.stringify(state)) } catch { /* private mode: demo still works */ }
}

export const fmtTime = (t) => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
export const fmtDay = (t) => new Date(t).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
export const fmtWhen = (t, now) => {
  const sameDay = new Date(t).toDateString() === new Date(now).toDateString()
  return sameDay ? fmtTime(t) : `${new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${fmtTime(t)}`
}
export const fmtDur = (ms) => {
  const m = Math.round(ms / 60000)
  if (m < 60) return `${m} min`
  const h = m / 60
  return h % 24 === 0 ? `${h / 24} day${h / 24 > 1 ? 's' : ''}` : `${h} hours`
}
export const initialsOf = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
