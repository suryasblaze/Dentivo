import React, { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useClinic } from '../store/ClinicStore'
import { LogoMark } from '../components/Logo'
import { IconStar, IconCheck, IconGoogleG, IconArrowRight } from '../lib/icons'

const WORDS = ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Excellent!']

/* =========================================================================
   What the patient sees when they tap the review link in their bill.
   Public, no login. Clinic name and Google link travel in the URL, so this
   works on the patient's own phone.
   ========================================================================= */
export default function PublicReview() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { submitFeedback, clinic } = useClinic()

  const clinicName = params.get('c') || clinic.name || 'our clinic'
  const first = params.get('n') || ''
  const google = params.get('g') || clinic.googlePlaceUrl || ''

  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const show = hover || rating
  const happy = rating >= 4

  const submit = (goGoogle) => {
    submitFeedback({ visitId: id, rating, text: text.trim(), wentToGoogle: !!goGoogle })
    setDone(true)
    if (goGoogle && google) window.open(google, '_blank', 'noopener')
  }

  if (done) {
    return (
      <div className="pub">
        <div className="pub-card" style={{ textAlign: 'center' }}>
          <div className="success-ring pulse"><IconCheck size={26} style={{ color: 'var(--g-600)' }} /></div>
          <h2 style={{ fontSize: 20, marginBottom: 6 }}>Thank you{first ? `, ${first}` : ''}</h2>
          <p className="muted" style={{ fontSize: 'var(--fs-md)', lineHeight: 1.6 }}>
            {happy
              ? 'That means a lot to us. See you at your next visit.'
              : 'We are sorry we fell short. Someone from the clinic will get in touch.'}
          </p>
          {google && !happy && (
            <a className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} href={google} target="_blank" rel="noreferrer">
              <IconGoogleG size={12} /> Post publicly on Google instead
            </a>
          )}
          <p className="faint" style={{ fontSize: 'var(--fs-micro)', marginTop: 16 }}>You can close this page now.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pub">
      <div className="pub-card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'grid', placeItems: 'center', marginBottom: 10 }}><LogoMark size={40} /></div>
        <h2 style={{ fontSize: 19, marginBottom: 4 }}>
          How was your visit{first ? `, ${first}` : ''}?
        </h2>
        <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>{clinicName} · takes 10 seconds</p>

        <div className="stars" style={{ justifyContent: 'center' }} onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} className={`star-btn ${show >= n ? 'on' : ''}`}
              onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} aria-label={`${n} star`}>
              <IconStar size={40} filled={show >= n} />
            </button>
          ))}
        </div>
        <div className="rating-word">{WORDS[show]}</div>

        {rating > 0 && (
          <div className="fade-up" style={{ marginTop: 16, textAlign: 'left' }}>
            {happy ? (
              <>
                <p style={{ fontSize: 'var(--fs-md)', lineHeight: 1.55, textAlign: 'center', marginBottom: 12 }}>
                  Would you share that on Google? It helps other people find a dentist they can trust.
                </p>
                {google ? (
                  <button className="btn btn-primary btn-lg btn-block" onClick={() => submit(true)}>
                    <IconGoogleG size={15} /> Post my review on Google
                  </button>
                ) : null}
                <button className="btn btn-ghost btn-block" style={{ marginTop: 7 }} onClick={() => submit(false)}>
                  {google ? 'Just send my rating' : 'Send my rating'}
                </button>
              </>
            ) : (
              <>
                <div className="field">
                  <label style={{ textTransform: 'none', letterSpacing: 0, fontSize: 'var(--fs-sm)', color: 'var(--ink)' }}>
                    What should we have done better?
                  </label>
                  <textarea className="textarea" value={text} autoFocus
                    placeholder="This goes straight to the clinic, not to a public page."
                    onChange={e => setText(e.target.value)} />
                </div>
                <div className="chip-grid" style={{ margin: '8px 0 12px' }}>
                  {['Waited too long', 'It hurt', 'Bill was higher than expected', 'Not explained clearly', 'Staff'].map(r => (
                    <button key={r} className="chip" onClick={() => setText(t => (t ? t + '. ' : '') + r)}>{r}</button>
                  ))}
                </div>
                <button className="btn btn-primary btn-lg btn-block" onClick={() => submit(false)}>
                  Send to the clinic <IconArrowRight size={14} />
                </button>
                {google && (
                  <a className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 7 }}
                    href={google} target="_blank" rel="noreferrer"
                    onClick={() => submitFeedback({ visitId: id, rating, text: text.trim(), wentToGoogle: true })}>
                    <IconGoogleG size={11} /> Or post on Google
                  </a>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
