import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ClinicProvider, useClinic } from './store/ClinicStore'
import Layout from './components/Layout'
import { pageByPath } from './data/nav'

import PublicIntake from './pages/PublicIntake'
import PublicReview from './pages/PublicReview'
import PublicBill from './pages/PublicBill'
import ShortReview from './pages/ShortReview'
/* separate product — loaded only when /reviewflow is opened */
const ReviewFlow = React.lazy(() => import('./reviewflow/ReviewFlow'))
const ReviewFlowScan = React.lazy(() => import('./reviewflow/Scan'))
const Autopilot = React.lazy(() => import('./autopilot/Autopilot'))
const Loading = () => <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading SRT ReviewFlow…</div>
import Payments from './pages/Payments'
import Reviews from './pages/Reviews'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PatientLink from './pages/PatientLink'
import Submissions from './pages/Submissions'
import Patients from './pages/Patients'
import PatientFile from './pages/PatientFile'
import Appointments from './pages/Appointments'
import CheckIn from './pages/CheckIn'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Subscription from './pages/Subscription'
import Roles from './pages/Roles'
import FeatureRequests from './pages/FeatureRequests'

import Consultation from './pages/stages/Consultation'
import Treatment from './pages/stages/Treatment'
import Billing from './pages/stages/Billing'

/* Side navigation = the 10 stages, in order */
const PAGES = [
  ['/dashboard', Dashboard],
  ['/link', PatientLink],
  ['/submissions', Submissions],
  ['/patients', Patients],
  ['/patients/:id', PatientFile],
  ['/appointments', Appointments],
  ['/checkin', CheckIn],
  ['/consultation', Consultation],
  ['/treatment', Treatment],
  ['/billing', Billing],
  ['/payment', Payments],
  ['/review', Reviews],
  ['/reports', Reports],
  ['/settings', Settings],
  ['/roles', Roles],
  ['/subscription', Subscription],
  ['/requests', FeatureRequests],
]

function Guard({ children, path }) {
  const { user, trialOver, canOpen } = useClinic()
  if (!user) return <Navigate to="/" replace />
  /* trial over: everything except the plans page is read-locked */
  if (trialOver && path !== '/subscription') return <Navigate to="/subscription" replace />
  /* the admin switched this page off for this role */
  const page = pageByPath(path)
  if (page && !canOpen(page.key)) return <Layout><NoAccess label={page.label} /></Layout>
  return <Layout>{children}</Layout>
}

function NoAccess({ label }) {
  return (
    <div className="lock-wrap">
      <div className="lock-card">
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>{label} is switched off for your role</h2>
        <p className="muted" style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}>
          Your clinic admin controls which pages each role can open, under Roles &amp; Access.
          Ask them to switch this one on if you need it.
        </p>
      </div>
    </div>
  )
}

function Toasts() {
  const { toasts } = useClinic()
  if (!toasts.length) return null
  return (
    <div className="toast-wrap">
      {toasts.slice(-2).map(t => <div key={t.id} className="toast fade-up">{t.text}</div>)}
    </div>
  )
}

function Router() {
  const { user } = useClinic()
  return (
    <>
      <Routes>
        {/* public — what the QR opens */}
        <Route path="/intake" element={<PublicIntake />} />
        <Route path="/r/:id" element={<PublicReview />} />
        <Route path="/b/:id" element={<PublicBill />} />
        <Route path="/go/:slug" element={<ShortReview />} />

        {/* SRT ReviewFlow — separate product demo, no login */}
        <Route path="/reviewflow" element={<React.Suspense fallback={<Loading />}><ReviewFlow /></React.Suspense>} />
        <Route path="/reviewflow/scan" element={<React.Suspense fallback={<Loading />}><ReviewFlowScan /></React.Suspense>} />

        {/* Autopilot — standalone agent console, not part of the clinic app */}
        <Route path="/autopilot" element={<React.Suspense fallback={<Loading />}><Autopilot /></React.Suspense>} />

        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        {PAGES.map(([path, Comp]) => (
          <Route key={path} path={path} element={<Guard path={path}><Comp /></Guard>} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </>
  )
}

export default function App() {
  return (
    <ClinicProvider>
      <Router />
    </ClinicProvider>
  )
}
