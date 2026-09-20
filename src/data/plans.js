/* =========================================================================
   Subscription model, role permissions and paid-feature pricing.
   Amounts are INR, aimed at the Indian dental clinic market.
   Annual billing = 10 months for 12 (two months free).
   ========================================================================= */

export const TRIAL_DAYS = 30

/* ---------- what a plan can switch on ---------- */
export const FEATURES = [
  { key: 'intake',      label: 'QR patient intake link',        group: 'Front desk' },
  { key: 'records',     label: 'Patient records & history',     group: 'Front desk' },
  { key: 'appointments',label: 'Appointment calendar',          group: 'Front desk' },
  { key: 'checkin',     label: 'Check-in & live queue',         group: 'Front desk' },

  { key: 'charting',    label: 'Dental charting (odontogram)',  group: 'Clinical' },
  { key: 'treatment',   label: 'Treatment plans',               group: 'Clinical' },
  { key: 'prescription',label: 'Prescriptions & drug safety',   group: 'Clinical' },
  { key: 'imaging',     label: 'Radiograph records',            group: 'Clinical' },

  { key: 'billing',     label: 'Billing & invoices',            group: 'Money' },
  { key: 'payments',    label: 'UPI / card / cash / EMI',       group: 'Money' },
  { key: 'dues',        label: 'Outstanding dues tracking',     group: 'Money' },

  { key: 'whatsapp',    label: 'WhatsApp bills & reminders',    group: 'Growth' },
  { key: 'reviews',     label: 'Review capture & Google gate',  group: 'Growth' },
  { key: 'recalls',     label: 'Automatic recalls',             group: 'Growth' },

  { key: 'reports',     label: 'Reports & analytics',           group: 'Insight' },
  { key: 'assistant',   label: 'DentiBot AI assistant',           group: 'Insight' },
  { key: 'exports',     label: 'Data export (Excel / Tally)',   group: 'Insight' },

  { key: 'roles',       label: 'Custom roles & permissions',    group: 'Admin' },
  { key: 'multibranch', label: 'Multiple branches',             group: 'Admin' },
  { key: 'audit',       label: 'Audit trail',                   group: 'Admin' },
  { key: 'api',         label: 'API access',                    group: 'Admin' },
]

/* ---------- the plans ---------- */
export const PLANS = [
  {
    id: 'trial',
    name: 'Free Trial',
    tagline: 'Everything in Professional, free for 30 days',
    monthly: 0,
    yearly: 0,
    badge: 'No card needed',
    limits: { branches: 1, chairs: 4, users: 10, patients: Infinity },
    features: [
      'intake', 'records', 'appointments', 'checkin', 'charting', 'treatment',
      'prescription', 'imaging', 'billing', 'payments', 'dues', 'whatsapp',
      'reviews', 'recalls', 'reports', 'assistant', 'exports', 'roles',
    ],
    note: 'After 30 days you pick a plan. Nothing is deleted — your data waits for you.',
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'A single dentist finding their feet',
    monthly: 1499,
    yearly: 14990,
    limits: { branches: 1, chairs: 1, users: 3, patients: 500 },
    features: ['intake', 'records', 'appointments', 'checkin', 'billing', 'payments', 'dues', 'reports'],
    best: ['Solo practice', 'One chair', 'Up to 500 patients'],
  },
  {
    id: 'professional',
    name: 'Professional',
    tagline: 'The full workflow, QR scan to Google review',
    monthly: 2999,
    yearly: 29990,
    popular: true,
    limits: { branches: 1, chairs: 4, users: 10, patients: Infinity },
    features: [
      'intake', 'records', 'appointments', 'checkin', 'charting', 'treatment',
      'prescription', 'imaging', 'billing', 'payments', 'dues', 'whatsapp',
      'reviews', 'recalls', 'reports', 'assistant', 'exports', 'roles', 'audit',
    ],
    best: ['2–4 chairs', 'Multiple dentists', 'Wants reviews and WhatsApp'],
  },
  {
    id: 'multi',
    name: 'Multi-Clinic',
    tagline: 'One login across every branch',
    monthly: 6999,
    yearly: 69990,
    limits: { branches: 5, chairs: Infinity, users: 30, patients: Infinity },
    features: FEATURES.map(f => f.key),
    best: ['2–5 branches', 'Consolidated reporting', 'Branch-wise permissions'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Chains, DSOs and teaching hospitals',
    monthly: null,
    yearly: null,
    custom: true,
    limits: { branches: Infinity, chairs: Infinity, users: Infinity, patients: Infinity },
    features: FEATURES.map(f => f.key),
    best: ['6+ branches', 'Dedicated database', 'SLA & onboarding', 'Includes custom development hours'],
  },
]

export const planById = (id) => PLANS.find(p => p.id === id) || PLANS[0]
export const planHas = (planId, featureKey) => planById(planId).features.includes(featureKey)

/* ---------- add-ons ---------- */
export const ADDONS = [
  { key: 'user',     label: 'Extra staff login',      price: 199,  per: 'user / month' },
  { key: 'branch',   label: 'Extra branch',           price: 1499, per: 'branch / month' },
  { key: 'wa',       label: 'WhatsApp Business API',  price: 499,  per: 'month + Meta usage at cost' },
  { key: 'sms',      label: 'SMS credits',            price: 299,  per: '1,000 messages' },
  { key: 'storage',  label: 'Extra imaging storage',  price: 399,  per: '50 GB / month' },
  { key: 'training', label: 'On-site staff training', price: 4999, per: 'half-day visit' },
]

/* =========================================================================
   Permissions — what a role may do. The admin toggles these per role.
   ========================================================================= */
export const PERMISSIONS = [
  { group: 'Front desk', items: [
    { key: 'patients.view',   label: 'View patient records' },
    { key: 'patients.edit',   label: 'Add & edit patients' },
    { key: 'patients.delete', label: 'Delete a patient' },
    { key: 'appts.view',      label: 'View the calendar' },
    { key: 'appts.edit',      label: 'Book, move & cancel appointments' },
    { key: 'checkin',         label: 'Check patients in' },
    { key: 'submissions',     label: 'Handle intake submissions' },
  ]},
  { group: 'Clinical', items: [
    { key: 'chart.view',  label: 'View dental charts' },
    { key: 'chart.edit',  label: 'Chart teeth & record findings' },
    { key: 'treatment',   label: 'Create treatment plans' },
    { key: 'prescribe',   label: 'Write prescriptions' },
  ]},
  { group: 'Money', items: [
    { key: 'billing.view',    label: 'View bills' },
    { key: 'billing.create',  label: 'Raise invoices' },
    { key: 'billing.discount',label: 'Apply discounts' },
    { key: 'payments',        label: 'Record payments' },
    { key: 'refund',          label: 'Issue refunds & cancel invoices' },
  ]},
  { group: 'Growth & insight', items: [
    { key: 'whatsapp',   label: 'Send WhatsApp messages' },
    { key: 'reviews',    label: 'See reviews & private feedback' },
    { key: 'reports',    label: 'View reports & revenue' },
    { key: 'assistant',  label: 'Use the AI assistant' },
  ]},
  { group: 'Administration', items: [
    { key: 'staff',        label: 'Add & remove staff' },
    { key: 'roles',        label: 'Create roles & set permissions' },
    { key: 'settings',     label: 'Change clinic settings' },
    { key: 'subscription', label: 'Manage the subscription & pay invoices' },
    { key: 'requests',     label: 'Raise feature requests' },
    { key: 'data.reset',   label: 'Erase all clinic data' },
  ]},
]

export const ALL_PERMISSIONS = PERMISSIONS.flatMap(g => g.items.map(i => i.key))

/* ---------- roles every new account starts with ---------- */
export const DEFAULT_ROLES = [
  {
    id: 'r_admin', name: 'Admin / Owner', system: true, color: '#197E65',
    desc: 'Full control of the clinic and the subscription',
    perms: ALL_PERMISSIONS,
  },
  {
    id: 'r_dentist', name: 'Dentist', system: true, color: '#2B63D9',
    desc: 'Clinical work, no money or admin control',
    perms: [
      'patients.view', 'patients.edit', 'appts.view', 'appts.edit', 'checkin',
      'chart.view', 'chart.edit', 'treatment', 'prescribe',
      'billing.view', 'whatsapp', 'reviews', 'assistant',
    ],
  },
  {
    id: 'r_reception', name: 'Reception', system: true, color: '#C8860D',
    desc: 'Front desk, billing and messaging',
    perms: [
      'patients.view', 'patients.edit', 'appts.view', 'appts.edit', 'checkin',
      'submissions', 'chart.view', 'billing.view', 'billing.create', 'payments',
      'whatsapp', 'assistant',
    ],
  },
  {
    id: 'r_assistant', name: 'Dental Assistant', system: true, color: '#6A44CC',
    desc: 'Chairside support, read-only on records',
    perms: ['patients.view', 'appts.view', 'checkin', 'chart.view'],
  },
  {
    id: 'r_accounts', name: 'Accounts', system: true, color: '#0E7C7B',
    desc: 'Money only — no clinical access',
    perms: ['patients.view', 'billing.view', 'billing.create', 'billing.discount', 'payments', 'refund', 'reports'],
  },
]

/* =========================================================================
   Paid custom development — what a client pays when they ask for
   something the product does not do yet.
   ========================================================================= */
export const REQUEST_TYPES = [
  {
    key: 'field', label: 'New field', band: 'Small',
    from: 4999, to: 9999, days: '1–2 working days',
    eg: 'Add "referred by doctor" to the patient form',
  },
  {
    key: 'tweak', label: 'Change to something existing', band: 'Small',
    from: 4999, to: 12999, days: '1–3 working days',
    eg: 'Show GST split on the printed bill',
  },
  {
    key: 'report', label: 'Custom report or export', band: 'Medium',
    from: 12999, to: 24999, days: '3–5 working days',
    eg: 'Doctor-wise monthly incentive statement',
  },
  {
    key: 'feature', label: 'New feature', band: 'Medium',
    from: 14999, to: 39999, days: '1–2 weeks',
    eg: 'Inventory with low-stock alerts',
  },
  {
    key: 'integration', label: 'Third-party integration', band: 'Large',
    from: 24999, to: 74999, days: '2–4 weeks',
    eg: 'Tally sync, insurance TPA portal, X-ray sensor',
  },
  {
    key: 'module', label: 'Whole new module', band: 'Large',
    from: 49999, to: 149999, days: '3–6 weeks',
    eg: 'Orthodontic case tracking with photo timelines',
  },
]

export const REQUEST_STAGES = [
  { key: 'submitted', label: 'Submitted',      tone: 'blue',   desc: 'We have it. Reviewing within 2 working days.' },
  { key: 'reviewing', label: 'Under review',   tone: 'violet', desc: 'We are scoping the work and checking feasibility.' },
  { key: 'quoted',    label: 'Quoted',         tone: 'amber',  desc: 'Price and timeline sent. Waiting on your approval.' },
  { key: 'approved',  label: 'Approved',       tone: 'teal',   desc: 'Approved and queued. 50% advance invoiced.' },
  { key: 'building',  label: 'In development', tone: 'green',  desc: 'Being built and tested.' },
  { key: 'delivered', label: 'Delivered',      tone: '',       desc: 'Live in your account. Balance invoiced.' },
  { key: 'declined',  label: 'Not taken up',   tone: 'red',    desc: 'Either withdrawn or outside what we can build.' },
]

export const REQUEST_TERMS = [
  'Every request is quoted in writing before any work starts — nothing is charged without your approval.',
  '50% on approval, 50% on delivery. Both invoiced from your account.',
  'Anything built for you stays in your account at no extra monthly cost.',
  'If we judge a request useful to every clinic, we may build it into the product and waive the fee.',
  'Urgent delivery (half the normal timeline) carries a 40% surcharge.',
  'A bug in existing features is never charged — report it and we fix it.',
]
