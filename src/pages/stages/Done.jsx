import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Tile, DataRow, Eyebrow, Blank } from '../../components/UI'
import { VisitStrip } from '../../components/Layout'
import NoVisit from './NoVisit'
import { LogoMark } from '../../components/Logo'
import { useClinic } from '../../store/ClinicStore'
import { inr } from '../../lib/format'
import {
  IconHeart, IconCheck, IconToothFilled, IconQr, IconQueue, IconStar,
  IconRupee, IconReceipt, IconWhatsApp, IconTooth, IconClock,
} from '../../lib/icons'

export default function Done() {
  const { visit, patient, clinic, bill, dispatch, toast } = useClinic()
  const nav = useNavigate()

  if (!visit || !patient) {
    return (
      <>
        <Blank icon={<IconHeart size={20} />} title="No visit open"
          action={<button className="btn btn-primary btn-sm" onClick={() => nav('/checkin')}>Check someone in</button>}>
          Finish a visit and this page shows the summary before resetting for the next patient.
        </Blank>
      </>
    )
  }

  const first = (patient.name || '').split(' ')[0]
  const closed = !!visit.closedAt

  const close = () => {
    dispatch({ type: 'CLOSE_VISIT' })
    toast('Visit closed — ready for the next patient')
    nav('/checkin')
  }

  const RECAP = [
    [IconQueue, 'blue', 'Checked in', `${visit.token} at ${visit.arrivedAt}`],
    [IconTooth, 'violet', 'Treatment', `${bill.done.length} procedure(s)`],
    [IconReceipt, 'amber', 'Invoice', visit.invoice?.no || '—'],
    [IconRupee, 'teal', 'Collected', inr(bill.paid)],
    [IconWhatsApp, 'green', 'Bill sent', visit.whatsappSent ? patient.phone : 'Not sent'],
    [IconStar, 'clay', 'Rating', visit.rating ? `${visit.rating}★ ${visit.reviewRoute === 'google' ? '→ Google' : '→ Private'}` : 'Not rated'],
  ]

  return (
    <>
      <VisitStrip />

      <div className="page-head">
        <div>
          <Eyebrow>Step 12 · finish</Eyebrow>
          <h1>Thank You / Reset</h1>
          <p>Close the visit. The chart is saved to the patient file and the desk resets.</p>
        </div>
      </div>

      <div className="grid g-main">
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ background: 'var(--dark)', padding: '6px 12px' }}>
            <Badge tone="green" dot>Reception tablet</Badge>
          </div>
          <div className="review-screen" style={{ padding: '34px 20px' }}>
            <div className="success-ring pulse" style={{ width: 58, height: 58 }}>
              <IconHeart size={24} style={{ color: 'var(--g-600)' }} />
            </div>
            <h2 style={{ fontSize: 21, marginBottom: 4 }}>Thank you, {first}!</h2>
            <p className="muted" style={{ fontSize: 'var(--fs-md)', maxWidth: '38ch' }}>
              {visit.whatsappSent ? 'Your bill and care instructions are on WhatsApp.' : 'Take care.'}
              {visit.nextVisit ? ` See you ${visit.nextVisit.toLowerCase()}.` : ''}
            </p>

            <div className="row wrap" style={{ justifyContent: 'center', gap: 5, marginTop: 14 }}>
              {visit.whatsappSent && <Badge tone="green"><IconCheck size={8} /> Bill sent</Badge>}
              {(visit.rx || []).length > 0 && <Badge tone="green"><IconCheck size={8} /> {visit.rx.length} medicines</Badge>}
              {visit.nextVisit && <Badge tone="green"><IconClock size={8} /> {visit.nextVisit}</Badge>}
              {visit.rating > 0 && <Badge tone="green"><IconStar size={8} filled color="currentColor" /> {visit.rating}★</Badge>}
            </div>

            <div className="divider" style={{ width: 150 }} />
            <div className="row" style={{ gap: 6 }}>
              <LogoMark size={22} />
              <div style={{ textAlign: 'left' }}>
                <div className="strong" style={{ fontSize: 'var(--fs-sm)' }}>{clinic.name}</div>
                {clinic.phone && <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{clinic.phone}</div>}
              </div>
            </div>
          </div>
        </Card>

        <div className="col" style={{ gap: 10 }}>
          <Card title="This visit" sub={patient.name}>
            <div style={{ margin: '0 -9px' }}>
              {RECAP.map(([Icon, tone, t, v]) => (
                <DataRow key={t} lead={<Tile tone={tone}><Icon size={12} /></Tile>} title={t} value={v} />
              ))}
            </div>
            {bill.due > 0 && (
              <>
                <div className="divider-x" />
                <div className="rcp-line">
                  <span className="lb">Balance carried to their account</span>
                  <span className="vl" style={{ color: 'var(--a-rose)' }}>{inr(bill.due)}</span>
                </div>
              </>
            )}
          </Card>

          <Card title={closed ? 'This visit is closed' : 'Closing the visit'}>
            {closed ? (
              <>
                <div className="lrow" style={{ background: 'var(--g-50)', borderColor: 'var(--g-200)', marginBottom: 10 }}>
                  <IconCheck size={15} style={{ color: 'var(--g-600)' }} />
                  <div>
                    <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>Closed at {visit.closedAt}</div>
                    <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>
                      Everything below is kept on the record permanently.
                    </div>
                  </div>
                </div>
                <button className="btn btn-ghost btn-block" onClick={() => nav('/patients/' + patient.id)}>
                  Open {first}&apos;s file
                </button>
              </>
            ) : (
              <>
                <p className="muted" style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.6, marginBottom: 10 }}>
                  Everything charted today is merged into {first}&apos;s permanent dental chart, and the
                  visit leaves the live queue. Nothing is deleted — you can reopen this visit any time
                  from the patient file.
                </p>
                <button className="btn btn-primary btn-lg btn-block" onClick={close}>
                  <IconCheck size={15} /> Close visit & reset
                </button>
                <button className="btn btn-ghost btn-block" style={{ marginTop: 6 }} onClick={() => nav('/link')}>
                  <IconQr size={13} /> Show the intake QR for the next patient
                </button>
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
