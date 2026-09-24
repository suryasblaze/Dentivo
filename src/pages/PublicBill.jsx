import React, { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useClinic } from '../store/ClinicStore'
import { LogoMark } from '../components/Logo'
import { inr, prettyDate } from '../lib/format'
import { readBillLink, upiLink, downloadBlob } from '../lib/links'
import {
  IconStar, IconCheck, IconGoogleG, IconDownload, IconRx, IconCalendar, IconPhone, IconUpi, IconAlert, IconX,
} from '../lib/icons'

const WORDS = ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Excellent!']

/* =========================================================================
   What the patient opens from WhatsApp: their bill, a PDF download, and —
   once the treatment is finished — one tap to review the clinic on Google.

   Every patient is offered Google, whatever they think of the visit.
   Sending only happy patients to Google ("review gating") breaks Google's
   review policy and can get a clinic's reviews removed.
   ========================================================================= */
export default function PublicBill() {
  const { id } = useParams()
  const { hash } = useLocation()
  const { submitFeedback } = useClinic()
  /* the bill is compressed inside the link, so unpacking it is async */
  const [data, setData] = useState(undefined)
  useEffect(() => { let on = true; readBillLink(hash).then(d => on && setData(d)); return () => { on = false } }, [hash])

  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [opened, setOpened] = useState(false)
  const [privateOpen, setPrivateOpen] = useState(false)
  const [note, setNote] = useState('')
  const [noteSent, setNoteSent] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pop, setPop] = useState(false)      // the review ask, right after the download

  if (data === undefined) {
    return <div className="pub"><div className="pub-card" style={{ textAlign: 'center' }}>Opening your bill…</div></div>
  }

  if (!data) {
    return (
      <div className="pub">
        <div className="pub-card" style={{ textAlign: 'center' }}>
          <IconAlert size={26} style={{ color: 'var(--a-amber)' }} />
          <h2 style={{ fontSize: 18, margin: '10px 0 6px' }}>This bill link is incomplete</h2>
          <p className="muted" style={{ fontSize: 'var(--fs-md)', lineHeight: 1.6 }}>
            Part of the link may have been cut off. Please open it again from the WhatsApp message,
            or ask the clinic to send it again.
          </p>
        </div>
      </div>
    )
  }

  const { clinic, patient, visit, bill, askReview } = data
  const first = (patient.name || '').split(' ')[0]
  const google = clinic.google
  const show = hover || rating
  const pay = bill.due > 0 && clinic.upiId
    ? upiLink({ vpa: clinic.upiId, name: clinic.name, amount: bill.due, note: `Bill ${visit.invoice.no || ''}` })
    : ''

  const rate = (n) => {
    setRating(n)
    submitFeedback({ visitId: id, rating: n, text: '', wentToGoogle: !!google })
    if (google) {
      window.open(google, '_blank', 'noopener')
      setOpened(true)
    }
  }

  const sendNote = () => {
    submitFeedback({ visitId: id, rating, text: note.trim(), wentToGoogle: opened })
    setNoteSent(true)
  }

  const pdf = async () => {
    setPdfBusy(true)
    try {
      const { billPdf } = await import('../lib/pdf')
      const { blob, file } = billPdf({ clinic, patient, visit, bill, reviewUrl: askReview ? google : '' })
      downloadBlob(blob, file)
      /* they have what they came for — now is the moment to ask */
      if (askReview && !opened) setTimeout(() => setPop(true), 900)
    } finally {
      setPdfBusy(false)
    }
  }

  const popGoogle = () => {
    submitFeedback({ visitId: id, rating: 0, text: '', wentToGoogle: !!google })
    if (google) window.open(google, '_blank', 'noopener')
    setOpened(true)
    setPop(false)
  }

  return (
    <div className="pub">
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ---------- the bill ---------- */}
        <div className="pub-card pbill">
          <div className="pbill-head">
            <LogoMark size={34} />
            <div style={{ minWidth: 0 }}>
              <div className="strong" style={{ fontSize: 'var(--fs-lg)', lineHeight: 1.2 }}>{clinic.name}</div>
              {clinic.address && <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{clinic.address}</div>}
            </div>
          </div>

          <p style={{ fontSize: 'var(--fs-md)', margin: '14px 0 12px' }}>
            Hello {first}, here is your bill. Thank you for visiting us.
          </p>

          <div className={`pbill-total ${bill.due > 0 ? 'owed' : ''}`}>
            <div>
              <small>{visit.invoice.no} · {prettyDate(visit.invoice.date)}</small>
              <b>{inr(bill.total)}</b>
            </div>
            <span className="pbill-pill">
              {bill.due > 0 ? `Balance ${inr(bill.due)}` : <><IconCheck size={11} /> Paid</>}
            </span>
          </div>

          <div className="pbill-lines">
            {bill.done.map((l, i) => (
              <div key={i} className="pbill-line">
                <span>{l.name}{l.tooth ? <em> · tooth {l.tooth}</em> : null}</span>
                <b>{inr(l.price)}</b>
              </div>
            ))}
            {bill.discount > 0 && <div className="pbill-line sub"><span>Discount</span><b>- {inr(bill.discount)}</b></div>}
            {bill.gstAmt > 0 && <div className="pbill-line sub"><span>GST</span><b>{inr(bill.gstAmt)}</b></div>}
            <div className="pbill-line sub"><span>Paid{visit.payments.length ? ` (${visit.payments.map(p => p.mode.split(' ')[0]).join(', ')})` : ''}</span>
              <b style={{ color: 'var(--g-700)' }}>{inr(bill.paid)}</b></div>
          </div>

          {pay && (
            <a className="btn btn-primary btn-lg btn-block" href={pay} style={{ marginTop: 12 }}>
              <IconUpi size={15} /> Pay {inr(bill.due)} by UPI
            </a>
          )}
          <button className={`btn ${pay ? 'btn-ghost' : 'btn-primary btn-lg'} btn-block`} style={{ marginTop: pay ? 8 : 12 }}
            onClick={pdf} disabled={pdfBusy}>
            <IconDownload size={pay ? 13 : 15} /> {pdfBusy ? 'Preparing…' : 'Download bill (PDF)'}
          </button>
        </div>

        {/* ---------- medicines + next visit ---------- */}
        {(visit.rx.length > 0 || visit.nextVisit) && (
          <div className="pub-card" style={{ padding: '16px 18px' }}>
            {visit.rx.length > 0 && (
              <>
                <div className="pbill-sec"><IconRx size={13} /> Your medicines</div>
                {visit.rx.map((d, i) => (
                  <div key={i} className="pbill-line">
                    <span>{d.name}</span><em>{d.dose} · {d.days} days</em>
                  </div>
                ))}
              </>
            )}
            {visit.nextVisit && (
              <div className="pbill-sec" style={{ marginTop: visit.rx.length ? 12 : 0, marginBottom: 0 }}>
                <IconCalendar size={13} /> Next visit: <b style={{ color: 'var(--ink)' }}>{visit.nextVisit}</b>
              </div>
            )}
          </div>
        )}

        {/* ---------- review ---------- */}
        {askReview && (
          <div className="pub-card previ" style={{ textAlign: 'center' }}>
            {!opened ? (
              <>
                <h2 style={{ fontSize: 18, marginBottom: 4 }}>How was your visit{first ? `, ${first}` : ''}?</h2>
                <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
                  {google ? 'Tap a star to review us on Google. It takes 10 seconds.' : 'Tap a star to rate your visit.'}
                </p>
                <div className="stars" style={{ justifyContent: 'center' }} onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} className={`star-btn ${show >= n ? 'on' : ''}`}
                      onMouseEnter={() => setHover(n)} onClick={() => rate(n)} aria-label={`${n} star`}>
                      <IconStar size={38} filled={show >= n} />
                    </button>
                  ))}
                </div>
                <div className="rating-word">{WORDS[show]}</div>
                {google && (
                  <div className="faint previ-g"><IconGoogleG size={11} /> Your review is posted on Google by you, under your name</div>
                )}
                {rating > 0 && !google && <p className="muted" style={{ marginTop: 8 }}>Thank you — the clinic has your rating.</p>}
              </>
            ) : (
              <>
                <div className="success-ring pulse" style={{ width: 52, height: 52 }}><IconCheck size={22} style={{ color: 'var(--g-600)' }} /></div>
                <h2 style={{ fontSize: 18, margin: '8px 0 4px' }}>Thank you{first ? `, ${first}` : ''}!</h2>
                <p className="muted" style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}>
                  Google has opened. Choose your {rating} star{rating > 1 ? 's' : ''} there and press <b>Post</b>.
                </p>
                <a className="btn btn-ghost btn-sm" href={google} target="_blank" rel="noreferrer" style={{ marginTop: 10 }}>
                  <IconGoogleG size={12} /> Open Google again
                </a>
              </>
            )}

            {/* private channel — offered to everyone, never instead of Google */}
            {noteSent ? (
              <p className="faint" style={{ fontSize: 'var(--fs-sm)', marginTop: 14 }}>Your note went to the clinic. Thank you.</p>
            ) : privateOpen ? (
              <div className="fade-up" style={{ marginTop: 14, textAlign: 'left' }}>
                <textarea className="textarea" value={note} autoFocus
                  placeholder="Anything we should fix? This goes only to the clinic."
                  onChange={e => setNote(e.target.value)} />
                <button className="btn btn-dark btn-block" style={{ marginTop: 7 }} disabled={!note.trim()} onClick={sendNote}>
                  Send to the clinic
                </button>
              </div>
            ) : (
              <button className="link-btn" style={{ marginTop: 14 }} onClick={() => setPrivateOpen(true)}>
                Something not right? Tell the clinic privately
              </button>
            )}
          </div>
        )}

        {pop && (
          <div className="pop" role="dialog" aria-modal="true" onClick={() => setPop(false)}>
            <div className="pop-card" onClick={e => e.stopPropagation()}>
              <button className="pop-x" onClick={() => setPop(false)} aria-label="Close"><IconX size={14} /></button>
              <div className="pop-ico"><IconCheck size={22} /></div>
              <h3>Your bill is downloaded</h3>
              <p>
                {google
                  ? <>One last thing{first ? `, ${first}` : ''} — would you tell others how it went? It takes 10 seconds.</>
                  : <>How was your visit{first ? `, ${first}` : ''}?</>}
              </p>
              {google ? (
                <button className="btn btn-primary btn-lg btn-block" onClick={popGoogle}>
                  <IconGoogleG size={15} /> Review us on Google
                </button>
              ) : (
                <div className="stars" style={{ justifyContent: 'center', margin: '4px 0 2px' }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} className={`star-btn ${rating >= n ? 'on' : ''}`}
                      onClick={() => { rate(n); setPop(false) }} aria-label={`${n} star`}>
                      <IconStar size={32} filled={rating >= n} />
                    </button>
                  ))}
                </div>
              )}
              <button className="link-btn" style={{ marginTop: 12 }} onClick={() => { setPop(false); setPrivateOpen(true) }}>
                Something not right? Tell the clinic privately
              </button>
              <button className="link-btn" style={{ marginTop: 8 }} onClick={() => setPop(false)}>Not now</button>
            </div>
          </div>
        )}

        {clinic.phone && (
          <a className="pbill-call" href={`tel:${clinic.phone.replace(/\s/g, '')}`}>
            <IconPhone size={12} /> Questions about your bill? Call {clinic.phone}
          </a>
        )}
      </div>
    </div>
  )
}
