import React, { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useClinic } from '../store/ClinicStore'
import { LogoMark } from '../components/Logo'
import { clinicBySlug } from '../data/clinics'
import { googleReviewUrl } from '../lib/links'
import { IconGoogleG, IconCheck, IconLock, IconAlert } from '../lib/icons'

/* =========================================================================
   The short review link: /go/<clinic>

   Carries no patient data, so it stays short enough to read out loud, print
   on a card or put under a QR at the desk. Both choices are offered to
   everyone — sending only happy patients to Google is review gating, which
   Google forbids.
   ========================================================================= */
export default function ShortReview() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const { submitFeedback, clinic: local } = useClinic()

  const listed = clinicBySlug(slug)
  const name = params.get('c') || listed?.name || local.name
  const google = params.get('g') || listed?.google || googleReviewUrl(local)

  const [step, setStep] = useState('ask')     // ask · private · done
  const [note, setNote] = useState('')

  const goGoogle = () => {
    submitFeedback({ visitId: `go-${slug}-${Date.now()}`, rating: 0, text: '', wentToGoogle: true, source: 'short-link' })
    if (google) window.open(google, '_blank', 'noopener')
    setStep('done')
  }
  const sendNote = () => {
    submitFeedback({ visitId: `go-${slug}-${Date.now()}`, rating: 0, text: note.trim(), wentToGoogle: false, source: 'short-link' })
    setStep('done')
  }

  if (!name) {
    return (
      <div className="pub"><div className="pub-card" style={{ textAlign: 'center' }}>
        <IconAlert size={24} style={{ color: 'var(--a-amber)' }} />
        <h2 style={{ fontSize: 18, margin: '10px 0 6px' }}>This review link is not set up yet</h2>
        <p className="muted">Ask the clinic for a new link.</p>
      </div></div>
    )
  }

  return (
    <div className="pub">
      <div className="pub-card" style={{ textAlign: 'center' }}>
        {step === 'done' ? (
          <>
            <div className="success-ring pulse"><IconCheck size={26} style={{ color: 'var(--g-600)' }} /></div>
            <h2 style={{ fontSize: 20, marginBottom: 6 }}>Thank you</h2>
            <p className="muted" style={{ fontSize: 'var(--fs-md)', lineHeight: 1.6 }}>
              {google ? 'Google has opened — write whatever you honestly feel and press Post.' : 'Your note has reached the clinic.'}
            </p>
            {google && (
              <a className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} href={google} target="_blank" rel="noreferrer">
                <IconGoogleG size={12} /> Open Google again
              </a>
            )}
          </>
        ) : step === 'private' ? (
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: 19, marginBottom: 4, textAlign: 'center' }}>Tell {name}</h2>
            <p className="muted" style={{ fontSize: 'var(--fs-sm)', textAlign: 'center', marginBottom: 12 }}>
              This goes only to the clinic.
            </p>
            <textarea className="textarea" value={note} autoFocus rows={5}
              placeholder="What could we have done better?" onChange={e => setNote(e.target.value)} />
            <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 10 }}
              disabled={!note.trim()} onClick={sendNote}>Send</button>
            <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 6 }} onClick={() => setStep('ask')}>Back</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', placeItems: 'center', marginBottom: 10 }}><LogoMark size={40} /></div>
            <h2 style={{ fontSize: 20, marginBottom: 4 }}>How was your visit?</h2>
            <p className="muted" style={{ fontSize: 'var(--fs-md)' }}>{name}</p>
            <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 18 }} onClick={goGoogle}>
              <IconGoogleG size={15} /> Review us on Google
            </button>
            <p className="faint" style={{ fontSize: 'var(--fs-micro)', marginTop: 7 }}>Takes about 10 seconds</p>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => setStep('private')}>
              <IconLock size={12} /> Tell the clinic privately instead
            </button>
          </>
        )}
      </div>
    </div>
  )
}
