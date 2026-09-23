import React, { useState } from 'react'
import { fill, LIKES, IMPROVES } from './engine'
import { fmtTime, fmtDay } from './store'
import { IconStar, IconGoogleG, IconLock, IconCheck, IconArrowLeft, IconCalendar, IconShield } from '../lib/icons'

/* =========================================================================
   The patient's phone: the WhatsApp chat, then the feedback pages the
   "Share Feedback" button opens. Every patient sees both choices — Google
   and private — whatever they think of the visit.
   ========================================================================= */
export default function Phone({ state, req, screen, setScreen, act, flash }) {
  const { clinic, templates } = state
  const vars = { clinic_name: clinic.name, patient_name: (req?.name || '').split(' ')[0], doctor_name: req?.doctor || clinic.doctor }
  const now = state.now

  return (
    <div className="rf-phone">
      <div className="rf-screen">
        <div className="rf-sbar"><span>{fmtTime(now).replace(/\s?[ap]m/i, '')}</span><span>5G ▮▮▮</span></div>

        {screen === 'chat' || !req ? (
          <Chat req={req} clinic={clinic} templates={templates} vars={vars} onOpen={() => { act('open'); setScreen('landing') }} />
        ) : (
          <>
            <div className="rf-urlbar"><IconLock size={9} /> reviews.srtdigital.in/{clinic.initials.toLowerCase()}</div>
            {screen === 'landing' && <Landing clinic={clinic} flash={flash} setScreen={setScreen} optOut={() => { act('optout'); setScreen('optedout') }} />}
            {screen === 'google' && <GoogleStep clinic={clinic} back={() => setScreen('landing')} go={() => { act('google'); setScreen('googledone') }} />}
            {screen === 'googledone' && <Done title="Thank you!" text={clinic.google ? 'Google opened in a new tab. Choose your stars there and press Post — in your own words.' : 'In the live product this opens your Google review page. Add your Google link in Settings.'} clinic={clinic} />}
            {screen === 'private' && <PrivateForm back={() => setScreen('landing')} send={(d) => { act('private', d); setScreen('thanks') }} />}
            {screen === 'thanks' && <Done title="Thank You" text="Your feedback has been shared with the clinic." clinic={clinic} booking />}
            {screen === 'optedout' && <Done title="Done" text={`${clinic.name} will not send you feedback messages again.`} clinic={clinic} icon={<IconShield size={26} />} />}
          </>
        )}
      </div>
    </div>
  )
}

function Chat({ req, clinic, templates, vars, onOpen }) {
  if (!req) {
    return (
      <>
        <WaHead clinic={clinic} />
        <div className="rf-chat"><div className="rf-sys">No message yet.<br />Complete a visit or press <b>Run Patient Demo</b>.</div></div>
      </>
    )
  }
  const sent = req.events.filter(e => e.type === 'sent' || e.type === 'reminder')
  return (
    <>
      <WaHead clinic={clinic} />
      <div className="rf-chat">
        {req.status === 'scheduled' && (
          <div className="rf-sys">Message scheduled for <b>{fmtTime(req.nextAt)}</b>.<br />Use the clock above to skip ahead.</div>
        )}
        {req.status === 'skipped' && <div className="rf-sys">No message sent.<br />{req.reason}.</div>}
        {req.status === 'queued' && sent.length === 0 && (
          <div className="rf-sys">Message is ready.<br />Reception taps <b>Send</b> on the dashboard.</div>
        )}
        {sent.length > 0 && <div className="day"><span>{fmtDay(sent[0].at)}</span></div>}
        {sent.map((e, i) => (
          <div key={i} className="rf-bubble biz">
            {fill(e.type === 'sent' ? templates.request : templates.reminder, vars)}
            <time>{fmtTime(e.at)}</time>
            <button className="cta" onClick={onOpen}>↗ Share Feedback</button>
          </div>
        ))}
        {sent.length > 0 && (
          <div className="rf-faint" style={{ textAlign: 'center', marginTop: 10, fontSize: 10.5, color: '#54656F' }}>
            Reply STOP to opt out
          </div>
        )}
      </div>
    </>
  )
}

const WaHead = ({ clinic }) => (
  <div className="rf-wa-head">
    <div className="av">{clinic.initials}</div>
    <div><b>{clinic.name}</b><small>Business account</small></div>
  </div>
)

function Landing({ clinic, flash, setScreen, optOut }) {
  return (
    <div className="rf-pg">
      <div className="rf-clogo">{clinic.initials}</div>
      <h2>How was your experience today?</h2>
      <p className="lead">Your honest feedback helps us improve.</p>
      <button className={`rf-choice ${flash ? 'flash' : ''}`} onClick={() => setScreen('google')}>
        <span className="ic"><IconGoogleG size={18} /></span>
        <span><b>Continue to Google Review</b><small>Share it publicly, in your own words</small></span>
      </button>
      <button className={`rf-choice ${flash ? 'flash' : ''}`} onClick={() => setScreen('private')}>
        <span className="ic" style={{ color: 'var(--p-d)' }}><IconLock size={16} /></span>
        <span><b>Share Private Feedback</b><small>Only {clinic.name} will see it</small></span>
      </button>
      <button className="rf-optout" onClick={optOut}>Don&apos;t send me these messages</button>
    </div>
  )
}

function GoogleStep({ clinic, back, go }) {
  const open = () => {
    if (clinic.google) window.open(clinic.google, '_blank', 'noopener')
    go()
  }
  return (
    <div className="rf-pg">
      <button className="rf-optout" style={{ margin: 0, textAlign: 'left', paddingTop: 0 }} onClick={back}><IconArrowLeft size={10} /> Back</button>
      <div className="rf-clogo" style={{ background: '#fff', border: '1px solid var(--bd)' }}><IconGoogleG size={24} /></div>
      <h2>Thank you for sharing your experience.</h2>
      <p className="lead">Google will open {clinic.name}&apos;s review page. Rate and write whatever you honestly feel — it posts under your own Google account.</p>
      <button className="rf-btn pri lg block" onClick={open}><IconGoogleG size={14} /> Continue to Google</button>
    </div>
  )
}

function PrivateForm({ back, send }) {
  const [rating, setRating] = useState(0)
  const [liked, setLiked] = useState([])
  const [improve, setImprove] = useState([])
  const [comment, setComment] = useState('')
  const tog = (arr, set, v) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])
  const empty = !rating && !liked.length && !improve.length && !comment.trim()
  return (
    <div className="rf-pg" style={{ paddingTop: 10 }}>
      <button className="rf-optout" style={{ margin: 0, textAlign: 'left', paddingTop: 0 }} onClick={back}><IconArrowLeft size={10} /> Back</button>
      <h2 style={{ marginTop: 8, fontSize: 18 }}>Tell us about your experience</h2>
      <p className="lead" style={{ marginBottom: 10 }}>Every field is optional.</p>
      <div className="rf-pstars">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} className={rating >= n ? 'on' : ''} onClick={() => setRating(n)} aria-label={`${n} star`}>
            <IconStar size={28} filled={rating >= n} />
          </button>
        ))}
      </div>
      <div className="rf-field"><label>What did you like?</label>
        <div className="rf-chips">{LIKES.map(t => <button key={t} className={`rf-chip ${liked.includes(t) ? 'on' : ''}`} onClick={() => tog(liked, setLiked, t)}>{t}</button>)}</div>
      </div>
      <div className="rf-field"><label>What could we improve?</label>
        <div className="rf-chips">{IMPROVES.map(t => <button key={t} className={`rf-chip ${improve.includes(t) ? 'on' : ''}`} onClick={() => tog(improve, setImprove, t)}>{t}</button>)}</div>
      </div>
      <div className="rf-field"><label>Anything else?</label>
        <textarea className="rf-in" style={{ minHeight: 64 }} value={comment} onChange={e => setComment(e.target.value)} placeholder="Type in English or Tamil" />
      </div>
      <button className="rf-btn pri lg block" disabled={empty} onClick={() => send({ rating, liked, improve, comment: comment.trim() })}>Send Feedback</button>
    </div>
  )
}

function Done({ title, text, clinic, booking, icon }) {
  return (
    <div className="rf-pg" style={{ textAlign: 'center' }}>
      <div className="rf-done">{icon || <IconCheck size={28} />}</div>
      <h2>{title}</h2>
      <p className="lead">{text}</p>
      <button className="rf-btn pri block" onClick={() => {}}>Done</button>
      {booking && clinic.booking && (
        <a className="rf-btn block" style={{ marginTop: 8, textDecoration: 'none' }}
          href={`https://wa.me/${clinic.phone.replace(/\D/g, '')}?text=${encodeURIComponent('Hi, I would like to book my next appointment.')}`}
          target="_blank" rel="noreferrer">
          <IconCalendar size={13} /> Book Next Appointment
        </a>
      )}
    </div>
  )
}
