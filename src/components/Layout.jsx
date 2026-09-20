import React, { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useClinic } from '../store/ClinicStore'
import { VISIT_STAGES } from '../data/config'
import { NAV } from '../data/nav'
import { Avatar, Badge } from './UI'
import Assistant from './Assistant'
import { LogoMark } from './Logo'
import {
  IconGrid, IconQr, IconFile, IconUsers, IconCalendar, IconQueue, IconStethoscope,
  IconTooth, IconReceipt, IconRupee, IconWhatsApp, IconStar, IconHeart, IconChart,
  IconSettings, IconLogout, IconSearch, IconBell, IconToothFilled, IconCheck,
  IconChevronDown, IconUsers as IconUser, IconShield, IconSparkle, IconAlert,
} from '../lib/icons'

function Sidebar() {
  const { clinic, user, patients, submissions, appointments, visits, visit, featureRequests, canOpen, hasFeature, dispatch } = useClinic()
  const nav = useNavigate()

  const counts = {
    subs: submissions.filter(s => s.status === 'new').length,
    patients: patients.length,
    appts: appointments.filter(a => a.status === 'scheduled').length,
    queue: visits.filter(v => v.stage !== 'done').length,
    reqs: (featureRequests || []).filter(r => r.stage === 'quoted').length,
  }

  /* how far the active visit has travelled, so the nav can tick off stages */
  const stageIdx = visit ? VISIT_STAGES.indexOf(visit.stage) : -1
  const stageOfNav = { 5: 'checkin', 6: 'consultation', 7: 'treatment', 8: 'billing', 9: 'payment', 10: 'whatsapp', 11: 'review', 12: 'done' }

  return (
    <aside className="sidebar">
      <div className="brand">
        <LogoMark size={28} />
        <div style={{ minWidth: 0 }}>
          <div className="brand-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {clinic.name}
          </div>
          <div className="brand-sub">{clinic.branch || 'Dental clinic'}</div>
        </div>
      </div>

      <div className="nav-scroll">
        {NAV.map(sec => {
          const items = sec.items.filter(i => canOpen(i.key) && (!i.feature || hasFeature(i.feature)))
          if (!items.length) return null
          return (
          <React.Fragment key={sec.label}>
            <div className="nav-label">{sec.label}</div>
            {items.map(({ n, to, label, Icon, badge }) => {
              const myStage = stageOfNav[n]
              const passed = myStage && stageIdx > -1 && VISIT_STAGES.indexOf(myStage) < stageIdx
              const isNow = myStage && visit?.stage === myStage
              return (
                <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Icon size={15} />
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                  {badge && counts[badge] > 0 && <span className="nav-count">{counts[badge]}</span>}
                  {!badge && passed && <IconCheck size={12} style={{ marginLeft: 'auto', color: 'var(--g-500)' }} />}
                  {!badge && isNow && <span className="nav-count">now</span>}
                </NavLink>
              )
            })}
          </React.Fragment>
          )
        })}

      </div>

      <div className="promo">
        <div className="promo-glow" />
        <h5>Patient intake link</h5>
        <p>Share the QR so patients fill their own details.</p>
        <button className="promo-btn" onClick={() => nav('/link')}>Open QR page</button>
      </div>

      {/* always visible, never scrolls away */}
      <div className="side-foot">
        <Avatar name={user?.name} initials={user?.short} color={user?.color} size={26} />
        <div className="who">
          <div className="nm">{user?.name}</div>
          <div className="rl">{user?.role}</div>
        </div>
        <button className="out" title="Sign out"
          onClick={() => { dispatch({ type: 'LOGOUT' }); nav('/') }}>
          <IconLogout size={14} />
        </button>
      </div>
    </aside>
  )
}

function Topbar() {
  const { user, patients } = useClinic()
  const nav = useNavigate()
  const [q, setQ] = React.useState('')
  const hits = q.length > 1
    ? patients.filter(p => (p.name + p.uhid + p.phone).toLowerCase().includes(q.toLowerCase())).slice(0, 5)
    : []

  return (
    <header className="topbar">
      <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
        <div className="search">
          <IconSearch size={14} style={{ color: 'var(--faint)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patient or mobile…" />
        </div>
        {hits.length > 0 && (
          <div className="card" style={{ position: 'absolute', top: 38, left: 0, right: 0, zIndex: 40, padding: 4, boxShadow: 'var(--sh-3)' }}>
            {hits.map(p => (
              <button key={p.id} className="drow" onClick={() => { nav('/patients/' + p.id); setQ('') }}>
                <Avatar name={p.name} color="#197E65" size={22} />
                <div style={{ minWidth: 0 }}>
                  <div className="drow-t">{p.name}</div>
                  <div className="drow-s">{p.uhid} · {p.phone}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="topbar-right">
        <button className="icon-btn"><IconBell size={15} /></button>
        <UserMenu />
      </div>
    </header>
  )
}

function UserMenu() {
  const { user, dispatch } = useClinic()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  /* close on outside click or Escape */
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const signOut = () => { dispatch({ type: 'LOGOUT' }); nav('/') }

  return (
    <div className="umenu-wrap" ref={ref}>
      <button className={`user-chip ${open ? 'open' : ''}`} onClick={() => setOpen(v => !v)}>
        <div style={{ textAlign: 'right' }}>
          <div className="nm">{user?.name}</div>
          <div className="rl">{user?.role}</div>
        </div>
        <Avatar name={user?.name} initials={user?.short} color={user?.color} size={26} />
        <IconChevronDown size={13} className="chev" />
      </button>

      {open && (
        <div className="umenu">
          <div className="umenu-head">
            <Avatar name={user?.name} initials={user?.short} color={user?.color} size={32} />
            <div style={{ minWidth: 0 }}>
              <div className="nm">{user?.name}</div>
              <div className="rl">{user?.role}{user?.email ? ` · ${user.email}` : ''}</div>
            </div>
          </div>
          <div className="umenu-sep" />
          <button className="umenu-item" onClick={() => { setOpen(false); nav('/settings') }}>
            <IconUser size={15} /> My clinic &amp; team
          </button>
          <button className="umenu-item" onClick={() => { setOpen(false); nav('/settings') }}>
            <IconSettings size={15} /> Settings
          </button>
          <div className="umenu-sep" />
          <button className="umenu-item danger" onClick={signOut}>
            <IconLogout size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

/* Shows on every workflow page so you never lose who is in the chair */
export function VisitStrip() {
  const { visit, patient, dispatch } = useClinic()
  const nav = useNavigate()
  if (!visit || !patient) return null

  const labels = {
    checkin: 'Check-in', consultation: 'Consultation', treatment: 'Treatment',
    billing: 'Billing', payment: 'Payment', whatsapp: 'WhatsApp', review: 'Review', done: 'Done',
  }
  const paths = {
    checkin: '/checkin', consultation: '/consultation', treatment: '/treatment',
    billing: '/billing', payment: '/payment', whatsapp: '/whatsapp', review: '/review', done: '/done',
  }
  const idx = VISIT_STAGES.indexOf(visit.stage)

  return (
    <div className="visit-strip">
      <Avatar name={patient.name} color="#197E65" size={26} />
      <div style={{ minWidth: 0 }}>
        <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>{patient.name}</div>
        <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>
          {patient.uhid} · {visit.token} · arrived {visit.arrivedAt}
        </div>
      </div>
      <div className="spacer" />
      <div className="visit-steps">
        {VISIT_STAGES.map((st, i) => (
          <button key={st} className={`vstep ${i < idx ? 'done' : ''} ${i === idx ? 'now' : ''}`}
            onClick={() => nav(paths[st])}>
            <span className="vd">{i < idx ? <IconCheck size={8} /> : i + 5}</span>
            <span className="vl">{labels[st]}</span>
          </button>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm"
        onClick={() => { dispatch({ type: 'SET_ACTIVE_VISIT', id: null }); nav('/dashboard') }}>
        Close
      </button>
    </div>
  )
}

function TrialBar() {
  const { onTrial, trialLeft, plan } = useClinic()
  const nav = useNavigate()
  if (!onTrial) return null
  const over = trialLeft === 0
  const warn = trialLeft <= 7
  return (
    <div className={`trial-bar ${over ? 'over' : warn ? 'warn' : ''}`}>
      <IconSparkle size={14} />
      {over
        ? <span>Your free trial has ended. Pick a plan to carry on — <b>nothing has been deleted</b>.</span>
        : <span><b>{trialLeft} day{trialLeft === 1 ? '' : 's'} left</b> of your free trial. Everything in {plan.name} is switched on.</span>}
      <div className="spacer" />
      <button className="btn" style={{ background: '#fff', color: 'var(--ink)' }}
        onClick={() => nav('/subscription')}>
        {over ? 'Choose a plan' : 'See plans'}
      </button>
    </div>
  )
}

export default function Layout({ children }) {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar />
        <TrialBar />
        <div className="content">{children}</div>
      </div>
      <Assistant />
    </div>
  )
}
