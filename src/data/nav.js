/* =========================================================================
   The side navigation, defined once.
   · Layout renders it
   · Roles & Access toggles it per role
   · App.jsx guards routes with it
   `feature` ties an item to the subscription plan.
   ========================================================================= */
import {
  IconGrid, IconQr, IconFile, IconUsers, IconCalendar, IconQueue, IconStethoscope,
  IconTooth, IconReceipt, IconRupee, IconWhatsApp, IconStar, IconHeart, IconChart,
  IconSettings, IconShield, IconSparkle,
} from '../lib/icons'

export const NAV = [
  {
    label: 'Overview',
    items: [
      { key: 'dashboard', to: '/dashboard', label: 'Dashboard', Icon: IconGrid },
    ],
  },
  {
    label: 'Patient flow',
    items: [
      { n: 1,  key: 'link',         to: '/link',         label: 'Patient Link / QR', Icon: IconQr,          feature: 'intake' },
      { n: 2,  key: 'submissions',  to: '/submissions',  label: 'Submissions',       Icon: IconFile,        feature: 'intake',  badge: 'subs' },
      { n: 3,  key: 'patients',     to: '/patients',     label: 'Patient Records',   Icon: IconUsers,       feature: 'records', badge: 'patients' },
      { n: 4,  key: 'appointments', to: '/appointments', label: 'Appointments',      Icon: IconCalendar,    feature: 'appointments', badge: 'appts' },
      { n: 5,  key: 'checkin',      to: '/checkin',      label: 'Check-In',          Icon: IconQueue,       feature: 'checkin', badge: 'queue' },
      { n: 6,  key: 'consultation', to: '/consultation', label: 'Consultation',      Icon: IconStethoscope, feature: 'charting' },
      { n: 7,  key: 'treatment',    to: '/treatment',    label: 'Treatment',         Icon: IconTooth,       feature: 'treatment' },
      { n: 8,  key: 'billing',      to: '/billing',      label: 'Billing',           Icon: IconReceipt,     feature: 'billing' },
      { n: 9,  key: 'payment',      to: '/payment',      label: 'Payment',           Icon: IconRupee,       feature: 'payments' },
      { n: 10, key: 'whatsapp',     to: '/whatsapp',     label: 'WhatsApp Bill',     Icon: IconWhatsApp,    feature: 'whatsapp' },
      { n: 11, key: 'review',       to: '/review',       label: 'Review & Google',   Icon: IconStar,        feature: 'reviews' },
      { n: 12, key: 'done',         to: '/done',         label: 'Thank You / Reset', Icon: IconHeart },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { key: 'reports', to: '/reports', label: 'Reports', Icon: IconChart, feature: 'reports' },
    ],
  },
  {
    label: 'Account',
    items: [
      { key: 'roles',        to: '/roles',        label: 'Roles & Access',    Icon: IconShield,  feature: 'roles' },
      { key: 'requests',     to: '/requests',     label: 'Feature Requests',  Icon: IconSparkle, badge: 'reqs' },
      { key: 'subscription', to: '/subscription', label: 'Subscription',      Icon: IconReceipt },
      { key: 'settings',     to: '/settings',     label: 'Settings',          Icon: IconSettings },
    ],
  },
]

export const NAV_ITEMS = NAV.flatMap(s => s.items)
export const ALL_PAGES = NAV_ITEMS.map(i => i.key)
export const pageByPath = (path) => NAV_ITEMS.find(i => i.to === path)

/* Pages a role can never lose, or it would lock itself out of the app */
export const ALWAYS_ON = ['dashboard', 'subscription']

/* Sensible page sets for the built-in roles */
export const ROLE_PAGES = {
  r_admin: ALL_PAGES,
  r_dentist: ['dashboard', 'patients', 'appointments', 'checkin', 'consultation', 'treatment',
    'billing', 'review', 'done', 'reports', 'requests', 'subscription'],
  r_reception: ['dashboard', 'link', 'submissions', 'patients', 'appointments', 'checkin',
    'billing', 'payment', 'whatsapp', 'review', 'done', 'requests', 'subscription'],
  r_assistant: ['dashboard', 'patients', 'appointments', 'checkin', 'consultation', 'subscription'],
  r_accounts: ['dashboard', 'patients', 'billing', 'payment', 'reports', 'subscription'],
}
