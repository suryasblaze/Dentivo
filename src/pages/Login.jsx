import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClinic } from '../store/ClinicStore'
import { LogoMark, LogoWordmark } from '../components/Logo'
import {
  IconToothFilled, IconEye, IconEyeOff, IconGoogleG, IconPhone, IconMail,
  IconQueue, IconWhatsApp, IconStar, IconRupee, IconX,
} from '../lib/icons'

/* Drop your generated art in /public with these names and it appears automatically.
   Until then a built-in placeholder is shown. */
const FLOATS = [
  { cls: 'f1', tone: 'blue',   Icon: IconQueue,    t: '8 waiting',  sub: "Today's queue" },
  { cls: 'f2', tone: 'green',  Icon: IconWhatsApp, t: 'Bill sent',  sub: 'On WhatsApp' },
  { cls: 'f3', tone: 'amber',  Icon: IconStar,     t: '4.8 rating', sub: 'Google reviews' },
  { cls: 'f4', tone: 'violet', Icon: IconRupee,    t: '₹48.2k',     sub: 'Collected today' },
]

const SLIDE_MS = 5000

const SLIDES = [
  { a: 'Make your clinic easier and organised with ', b: 'Dentivo' },
  { a: 'Patients fill their own details from ',       b: 'one QR code' },
  { a: 'From check-in to Google review in ',           b: 'one flow' },
  { a: 'Bill, prescription and care notes on ',        b: 'WhatsApp' },
]

const ART = '/login-illustration.png'
const FACE_1 = '/avatar-1.png'
const FACE_2 = '/avatar-2.png'

/* Fallback art — a simple dental scene so the page never looks broken */
function ArtPlaceholder() {
  return (
    <svg className="auth-art" viewBox="0 0 380 320" fill="none">
      <ellipse cx="190" cy="288" rx="118" ry="14" fill="var(--g-200)" opacity=".5" />
      <path d="M190 74c22-20 55-27 75-11 23 19 23 57 15 90-7 27-10 46-14 72-4 25-9 50-26 50s-19-31-24-58c-4-20-8-35-26-35s-22 15-26 35c-5 27-7 58-24 58s-22-25-26-50c-4-26-7-45-14-72-8-33-8-71 15-90 20-16 53-9 75 11Z"
        fill="#fff" stroke="var(--g-600)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M190 120c-14 0-24 9-24 22s10 20 24 20 24-7 24-20-10-22-24-22Z" fill="var(--g-100)" />
      <circle cx="298" cy="92" r="26" fill="var(--g-600)" opacity=".12" />
      <circle cx="84" cy="128" r="18" fill="var(--g-600)" opacity=".12" />
      <path d="M296 84v16M288 92h16" stroke="var(--g-700)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function Art({ src, children }) {
  const [ok, setOk] = useState(true)
  if (!ok) return children
  return <img className="auth-art" src={src} alt="" onError={() => setOk(false)} />
}

function Face({ src, className }) {
  const [ok, setOk] = useState(true)
  return (
    <div className={`auth-bubble ${className}`}>
      {ok
        ? <img src={src} alt="" onError={() => setOk(false)} />
        : <IconToothFilled size={22} color="var(--g-600)" />}
    </div>
  )
}

/* =========================================================================
   Sign up — what a new clinic fills in before its 30-day trial starts.
   Four fields, because nothing else is needed to open a clinic: the rest
   is filled in later from Settings.
   ========================================================================= */
function SignUp({ onClose, onDone }) {
  const [f, setF] = useState({ clinic: '', owner: '', mobile: '', email: '', pw: '' })
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }))
  const valid = f.clinic.trim() && f.owner.trim() && f.mobile.replace(/\D/g, '').length >= 10

  return (
    <div className="pop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="pop-card auth-signup" onClick={e => e.stopPropagation()}>
        <button className="pop-x" onClick={onClose} aria-label="Close"><IconX size={14} /></button>
        <h3>Start your free trial</h3>
        <p>30 days of everything. No card, cancel any time.</p>

        <form onSubmit={e => { e.preventDefault(); if (valid) onDone(f) }}>
          <div className="auth-input-wrap">
            <input className="auth-input" value={f.clinic} autoFocus placeholder="Clinic name" onChange={set('clinic')} />
          </div>
          <div className="auth-input-wrap">
            <input className="auth-input" value={f.owner} placeholder="Your name" onChange={set('owner')} />
          </div>
          <div className="auth-input-wrap">
            <input className="auth-input" value={f.mobile} inputMode="tel" placeholder="Mobile number" onChange={set('mobile')} />
          </div>
          <div className="auth-input-wrap">
            <input className="auth-input" value={f.email} type="email" placeholder="Email (optional)" onChange={set('email')} />
          </div>
          <button className="auth-btn" type="submit" disabled={!valid}>Create my clinic</button>
        </form>

        <p className="auth-fine">
          By continuing you agree to let us message your patients on your behalf, and confirm you
          have their consent to be contacted.
        </p>
      </div>
    </div>
  )
}

export default function Login() {
  const { clinic, staff, dispatch } = useClinic()
  const nav = useNavigate()
  const [pick, setPick] = useState(staff[0]?.id)
  const [user, setUser] = useState(staff[0]?.name || '')
  const [pw, setPw] = useState('demo')
  const [show, setShow] = useState(false)
  const [slide, setSlide] = useState(0)
  const [paused, setPaused] = useState(false)
  const [signup, setSignup] = useState(false)

  /* auto-advance the tagline; hovering the panel pauses it */
  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => setSlide(i => (i + 1) % SLIDES.length), SLIDE_MS)
    return () => clearTimeout(t)
  }, [slide, paused])

  const choose = (s) => { setPick(s.id); setUser(s.name) }
  const signIn = () => { dispatch({ type: 'LOGIN', id: pick }); nav('/dashboard') }

  /* A new clinic: name it, name its owner, start the trial, walk straight in. */
  const createClinic = ({ clinic: name, owner, mobile, email }) => {
    dispatch({ type: 'SET_CLINIC', patch: { name: name.trim(), phone: mobile.trim(), email: email.trim() } })
    const first = staff[0]
    if (first) dispatch({ type: 'UPDATE_STAFF', id: first.id, patch: { name: owner.trim(), email: email.trim() } })
    dispatch({ type: 'LOGIN', id: first?.id })
    setSignup(false)
    nav('/dashboard')
  }

  return (
    <div className="auth">
      {/* ---------------- Left: the form ---------------- */}
      <div className="auth-left">
        <div className="auth-form">
          <div className="row" style={{ gap: 9, marginBottom: 26 }}>
            <LogoMark size={30} />
            <LogoWordmark width={96} />
          </div>

          <h1>Welcome back!</h1>
          <p className="auth-sub">
            Run your whole clinic from one screen with <b>{clinic.name}</b>.
            Patients, treatment, billing and reviews.
          </p>

          {staff.length > 1 && (
            <div className="auth-roles">
              {staff.map(s => (
                <button key={s.id} className={`auth-role ${pick === s.id ? 'on' : ''}`} onClick={() => choose(s)}>
                  {s.role}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={e => { e.preventDefault(); signIn() }}>
            <div className="auth-input-wrap">
              <input className="auth-input" value={user} placeholder="Username"
                onChange={e => setUser(e.target.value)} />
            </div>

            <div className="auth-input-wrap">
              <input className="auth-input has-icon" type={show ? 'text' : 'password'} value={pw}
                placeholder="Password" onChange={e => setPw(e.target.value)} />
              <button type="button" className="auth-eye" onClick={() => setShow(v => !v)}
                aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <IconEye size={17} /> : <IconEyeOff size={17} />}
              </button>
            </div>

            <a className="auth-forgot" href="#forgot" onClick={e => e.preventDefault()}>Forgot Password?</a>

            <button className="auth-btn" type="submit">Login</button>
          </form>

          <div className="auth-or"><i /><span>or continue with</span><i /></div>

          <div className="auth-social">
            <button title="Google" onClick={signIn}><IconGoogleG size={19} /></button>
            <button title="Mobile OTP" onClick={signIn}><IconPhone size={19} /></button>
            <button title="Email link" onClick={signIn}><IconMail size={19} /></button>
          </div>

          <div className="auth-foot">
            Don&apos;t have an account?{' '}
            <button type="button" className="auth-link" onClick={() => setSignup(true)}>Sign up free</button>
            <span className="auth-foot-note">30-day trial · no card needed</span>
          </div>
        </div>
      </div>

      {signup && <SignUp onClose={() => setSignup(false)} onDone={createClinic} />}

      {/* ---------------- Right: illustration panel ---------------- */}
      <div className="auth-right">
        <div className="auth-panel"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}>
          <div className="auth-stage">
            <Face src={FACE_1} className="b1" />
            <Face src={FACE_2} className="b2" />

            <Art src={ART}><ArtPlaceholder /></Art>

            {FLOATS.map(({ cls, tone, Icon, t, sub }) => (
              <div className={`fcard ${cls}`} key={cls}>
                <span className={`tile sm ${tone}`}>
                  {cls === 'f3'
                    ? <Icon size={12} filled color="currentColor" />
                    : <Icon size={12} />}
                </span>
                <span>
                  <span className="ft" style={{ display: 'block' }}>{t}</span>
                  <span className="fs">{sub}</span>
                </span>
              </div>
            ))}
          </div>

          <div className={`auth-dots ${paused ? 'paused' : ''}`}>
            {SLIDES.map((_, i) => (
              <button key={i} className={i === slide ? 'on' : ''}
                style={{ '--slide-ms': `${SLIDE_MS}ms` }}
                onClick={() => setSlide(i)}
                aria-label={`Slide ${i + 1}`} />
            ))}
          </div>

          <div className="auth-tag-wrap">
            <div className="auth-tag" key={slide}>
              {SLIDES[slide].a}<b>{SLIDES[slide].b}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
