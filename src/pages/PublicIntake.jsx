import React, { useState } from 'react'
import { useClinic } from '../store/ClinicStore'
import { GENDERS, ISSUES } from '../data/config'
import { LogoMark, LogoFull } from '../components/Logo'
import { IconToothFilled, IconCheck, IconArrowRight } from '../lib/icons'

/* =========================================================================
   The page the QR code opens. Public — no login, no sidebar.
   Four things only: name, mobile, gender, issue.
   ========================================================================= */
export default function PublicIntake() {
  const { clinic, submitIntake } = useClinic()
  const [f, setF] = useState({ name: '', phone: '', gender: '', issue: '', note: '' })
  const [sent, setSent] = useState(null)
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))

  const valid = f.name.trim().length > 1 && f.phone.replace(/\D/g, '').length >= 10 && f.gender && f.issue

  const submit = () => {
    if (sent) return                       // guard against a double tap
    const sub = submitIntake(f)            // append-only write, cannot clobber
    setSent({ ...f, at: sub.time })
  }

  /* Terminal screen. Deliberately no way back into the form —
     one submission per person, per open link. */
  if (sent) {
    return (
      <div className="pub">
        <div className="pub-card" style={{ textAlign: 'center' }}>
          <div className="success-ring pulse"><IconCheck size={26} style={{ color: 'var(--g-600)' }} /></div>
          <h2 style={{ fontSize: 20, marginBottom: 6 }}>Thank you, {sent.name.split(' ')[0]}</h2>
          <p className="muted" style={{ fontSize: 'var(--fs-md)', lineHeight: 1.6 }}>
            Your details have reached the front desk. Please take a seat —
            we will call you shortly.
          </p>

          <div className="pub-receipt">
            <div className="rcp-line">
              <span className="lb">Name</span><span className="vl">{sent.name}</span>
            </div>
            <div className="rcp-line">
              <span className="lb">Mobile</span><span className="vl">{sent.phone}</span>
            </div>
            <div className="rcp-line">
              <span className="lb">Reason</span><span className="vl">{sent.issue}</span>
            </div>
            <div className="rcp-line">
              <span className="lb">Received at</span><span className="vl">{sent.at}</span>
            </div>
          </div>

          <div className="divider" />
          <div className="row" style={{ justifyContent: 'center', gap: 7 }}>
            <LogoMark size={26} />
            <div style={{ textAlign: 'left' }}>
              <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>{clinic.name}</div>
              {clinic.phone && <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{clinic.phone}</div>}
            </div>
          </div>

          <p className="faint" style={{ fontSize: 'var(--fs-micro)', marginTop: 14, lineHeight: 1.5 }}>
            You can close this page now.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="pub">
      <div className="pub-card">
        {/* header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'grid', placeItems: 'center', marginBottom: 12 }}>
            <LogoFull width={168} />
          </div>
          <h2 style={{ fontSize: 19, marginBottom: 3 }}>{clinic.name}</h2>
          <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
            Fill this in and hand your phone back. Takes under a minute.
          </p>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="field">
            <label>Your name</label>
            <input className="input pub-input" autoFocus value={f.name} placeholder="Full name"
              onChange={e => set('name', e.target.value)} />
          </div>

          <div className="field">
            <label>Mobile number</label>
            <input className="input pub-input" value={f.phone} inputMode="tel" placeholder="10-digit mobile"
              onChange={e => set('phone', e.target.value)} />
          </div>

          <div className="field">
            <label>Gender</label>
            <div className="pub-opts">
              {GENDERS.map(g => (
                <button key={g} className={`pub-opt ${f.gender === g ? 'on' : ''}`} onClick={() => set('gender', g)}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>What is the problem?</label>
            <div className="chip-grid">
              {ISSUES.map(i => (
                <button key={i} className={`chip ${f.issue === i ? 'on' : ''}`} onClick={() => set('issue', i)}>{i}</button>
              ))}
            </div>
          </div>

          {f.issue && (
            <div className="field fade-up">
              <label>Anything else? (optional)</label>
              <textarea className="textarea" style={{ minHeight: 54 }} value={f.note}
                placeholder="Since when, which side, any medicines you take…"
                onChange={e => set('note', e.target.value)} />
            </div>
          )}

          <button className="btn btn-primary btn-lg btn-block" disabled={!valid} onClick={submit}>
            Submit <IconArrowRight size={15} />
          </button>

          {!valid && (
            <div className="faint" style={{ fontSize: 'var(--fs-micro)', textAlign: 'center' }}>
              Name, mobile, gender and problem are needed
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
