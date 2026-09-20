import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Avatar, Eyebrow, Tile } from '../../components/UI'
import { VisitStrip } from '../../components/Layout'
import NoVisit from './NoVisit'
import { LogoMark } from '../../components/Logo'
import { useClinic } from '../../store/ClinicStore'
import { IconStar, IconGoogleG, IconCheck, IconAlert, IconToothFilled, IconArrowRight } from '../../lib/icons'

const WORDS = ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Excellent!']
const ASPECTS = ['Doctor explained well', 'No waiting', 'Painless', 'Clean clinic', 'Friendly staff', 'Fair price']

export default function ReviewStage() {
  const { visit, patient, clinic, dispatch, nextStage, toast } = useClinic()
  const nav = useNavigate()
  const [hover, setHover] = useState(0)
  const [aspects, setAspects] = useState([])
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [posted, setPosted] = useState(false)

  if (!visit || !patient) return <NoVisit stage="Review" />

  const rating = visit.rating || 0
  const show = hover || rating
  const happy = rating >= 4
  const first = (patient.name || '').split(' ')[0]

  const choose = (n) => {
    dispatch({ type: 'PATCH_VISIT', patch: { rating: n, reviewRoute: n >= 4 ? 'google' : 'private' } })
    if (n >= 4 && !text) {
      setText(`Had a good experience at ${clinic.name}. The treatment was explained clearly and it was painless. Clean clinic and hardly any waiting.`)
    }
  }

  const finish = (route) => {
    setPosted(true)
    dispatch({
      type: 'PATCH_VISIT',
      patch: route === 'google' ? { reviewText: text } : { privateFeedback: msg },
    })
    toast(route === 'google' ? 'Review posted to Google' : 'Feedback sent privately to the owner')
  }

  return (
    <>
      <VisitStrip />

      <div className="page-head">
        <div>
          <Eyebrow>Steps 11 · patient</Eyebrow>
          <h1>Review & Google</h1>
          <p>4 stars or more goes to Google. 3 or less goes privately to the owner.</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-primary btn-sm" disabled={!posted && !rating}
            onClick={() => { nextStage(); nav('/done') }}>
            Finish visit <IconArrowRight size={12} />
          </button>
        </div>
      </div>

      <div className="grid g-main">
        {/* ---------- The tablet screen ---------- */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ background: 'var(--dark)', padding: '6px 12px' }}>
            <Badge tone="green" dot>Reception tablet</Badge>
          </div>
          <div className="review-screen" style={{ padding: '28px 20px' }}>
            <div style={{ marginBottom: 12 }}><LogoMark size={38} /></div>
            <h2 style={{ fontSize: 19, marginBottom: 4 }}>How was your visit, {first}?</h2>
            <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>Takes 10 seconds.</p>

            <div className="stars" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} className={`star-btn ${show >= n ? 'on' : ''}`}
                  onMouseEnter={() => setHover(n)} onClick={() => choose(n)}>
                  <IconStar size={34} filled={show >= n} />
                </button>
              ))}
            </div>
            <div className="rating-word">{WORDS[show]}</div>

            {rating > 0 && (
              <div className="fade-up" style={{ marginTop: 16, width: '100%', maxWidth: 400 }}>
                <div className="strong" style={{ fontSize: 'var(--fs-base)', marginBottom: 6 }}>
                  {happy ? 'What did we do well?' : 'What should we fix?'}
                </div>
                <div className="chip-grid" style={{ justifyContent: 'center' }}>
                  {ASPECTS.map(a => (
                    <button key={a} className={`chip ${aspects.includes(a) ? 'on' : ''}`}
                      onClick={() => setAspects(v => v.includes(a) ? v.filter(x => x !== a) : [...v, a])}>{a}</button>
                  ))}
                </div>
                <div className="lrow" style={{
                  marginTop: 14, textAlign: 'left', alignItems: 'flex-start',
                  background: happy ? 'var(--g-50)' : 'var(--a-amber-bg)',
                  borderColor: happy ? 'var(--g-200)' : 'rgba(200,134,13,.25)',
                }}>
                  {happy ? <IconCheck size={14} style={{ color: 'var(--g-600)', marginTop: 1 }} />
                    : <IconAlert size={14} style={{ color: 'var(--a-amber)', marginTop: 1 }} />}
                  <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.5 }}>
                    {happy ? 'Routing to Google Reviews' : 'Routing privately to the clinic owner — not published'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ---------- Where it goes ---------- */}
        <Card title={rating === 0 ? 'Waiting for a rating' : happy ? 'Google review' : 'Private feedback'}>
          {rating === 0 && (
            <div className="empty">Tap a star on the left to see where the review goes.</div>
          )}

          {rating > 0 && happy && (
            <div className="fade-up">
              <div className="row" style={{ marginBottom: 10 }}>
                <IconGoogleG size={18} />
                <span className="g-logo">Google</span>
                <div className="spacer" />
                <span className="row" style={{ gap: 2 }}>
                  {[1, 2, 3, 4, 5].map(n => <IconStar key={n} size={13} filled={n <= rating} />)}
                </span>
              </div>
              {!posted ? (
                <>
                  <textarea className="textarea" style={{ minHeight: 96 }} value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="The patient writes or edits this themselves" />
                  <button className="btn btn-primary btn-block" style={{ marginTop: 10 }}
                    onClick={() => finish('google')}>Post review</button>
                  {clinic.googlePlaceUrl && (
                    <a className="btn btn-ghost btn-block" style={{ marginTop: 6 }}
                      href={clinic.googlePlaceUrl} target="_blank" rel="noreferrer">
                      Open the real Google page
                    </a>
                  )}
                  <div className="faint" style={{ fontSize: 'var(--fs-micro)', textAlign: 'center', marginTop: 8 }}>
                    Nothing posts without the patient tapping this.
                  </div>
                </>
              ) : (
                <div className="fade-up">
                  <div className="lrow" style={{ background: 'var(--g-50)', borderColor: 'var(--g-200)', marginBottom: 8 }}>
                    <IconCheck size={15} style={{ color: 'var(--g-600)' }} />
                    <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>Review published</div>
                  </div>
                  <div className="lrow" style={{ alignItems: 'flex-start' }}>
                    <Avatar name={patient.name} color="#197E65" size={26} />
                    <div>
                      <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>{patient.name}</div>
                      <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.5, color: 'var(--ink-2)' }}>{text}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {rating > 0 && !happy && (
            <div className="fade-up">
              {!posted ? (
                <>
                  <textarea className="textarea" style={{ minHeight: 96 }} value={msg}
                    onChange={e => setMsg(e.target.value)}
                    placeholder="What went wrong? This goes to the owner, not to Google." />
                  <div className="chip-grid" style={{ margin: '10px 0' }}>
                    {['Waited too long', 'Painful', 'Bill higher than quoted', 'Staff was rude'].map(r => (
                      <button key={r} className="chip" onClick={() => setMsg(m => (m ? m + '. ' : '') + r)}>{r}</button>
                    ))}
                  </div>
                  <button className="btn btn-primary btn-block" disabled={msg.length < 3}
                    onClick={() => finish('private')}>Send privately to the owner</button>
                </>
              ) : (
                <div className="lrow fade-up" style={{ background: 'var(--g-50)', borderColor: 'var(--g-200)', alignItems: 'flex-start' }}>
                  <Tile tone="green"><IconCheck size={13} /></Tile>
                  <div>
                    <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>Sent to the owner</div>
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)', marginTop: 3 }}>
                      &ldquo;{msg}&rdquo;
                    </div>
                    <div className="faint" style={{ fontSize: 'var(--fs-micro)', marginTop: 4 }}>
                      Call {patient.phone} to resolve it.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
