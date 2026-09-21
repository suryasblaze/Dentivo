/* Editable defaults only — no demo records.
   The clinic fills these in Settings. */

export const DEFAULT_CLINIC = {
  name: 'Your Clinic Name',
  tagline: 'Dental Clinic',
  branch: '',
  phone: '',
  email: '',
  address: '',
  gstin: '',
  regNo: '',
  upiId: '',
  googlePlaceUrl: '',
}

export const DEFAULT_STAFF = [
  { id: 'u1', name: 'Clinic Admin', role: 'Owner', short: 'CA', color: '#197E65', email: '', spec: '', reg: '' },
]

export const DEFAULT_CHAIRS = [
  { id: 'c1', name: 'Chair 1', label: '' },
]

export const ROLES = ['Owner', 'Dentist', 'Reception', 'Assistant']

export const ROLE_COLORS = ['#197E65', '#2B63D9', '#6A44CC', '#C8860D', '#C93F4A', '#0E7C7B', '#B65A2E', '#3B4B9A']

/* The stages a visit moves through — these are the side-navigation items */
export const STAGES = [
  { key: 'link', n: 1, label: 'Patient Link / QR', path: '/link', owner: 'Patient' },
  { key: 'submissions', n: 2, label: 'Submissions', path: '/submissions', owner: 'Patient' },
  { key: 'patients', n: 3, label: 'Patient Records', path: '/patients', owner: 'System' },
  { key: 'appointments', n: 4, label: 'Appointments', path: '/appointments', owner: 'Reception' },
  { key: 'checkin', n: 5, label: 'Check-In', path: '/checkin', owner: 'Reception' },
  { key: 'consultation', n: 6, label: 'Consultation', path: '/consultation', owner: 'Dentist' },
  { key: 'treatment', n: 7, label: 'Treatment', path: '/treatment', owner: 'Dentist' },
  { key: 'billing', n: 8, label: 'Billing & Checkout', path: '/billing', owner: 'Reception' },
  { key: 'payment', n: 9, label: 'Payments', path: '/payment', owner: 'Reception' },
  { key: 'review', n: 10, label: 'Reviews', path: '/review', owner: 'Patient' },
]

/* Visit stage order used for the "next stage" button */
export const VISIT_STAGES = ['checkin', 'consultation', 'treatment', 'billing', 'done']

/* Where to open a visit from any list. A finished visit opens its bill. */
export const stagePath = (stage) =>
  ({ checkin: '/checkin', consultation: '/consultation', treatment: '/treatment',
     billing: '/billing', done: '/billing' }[stage] || '/billing')

export const GENDERS = ['Female', 'Male', 'Other']

export const ISSUES = [
  'Tooth pain', 'Sensitivity', 'Bleeding gums', 'Swelling', 'Broken tooth',
  'Cavity', 'Cleaning', 'Braces enquiry', 'Whitening', 'Denture problem',
  'Wisdom tooth', 'Routine check-up', 'Other',
]

export const VISIT_TYPES = ['Scheduled appointment', 'Walk-in', 'Emergency', 'Follow-up']
