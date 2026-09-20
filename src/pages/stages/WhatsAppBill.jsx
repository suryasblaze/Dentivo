import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Avatar, Tile, DataRow, Eyebrow } from '../../components/UI'
import { VisitStrip } from '../../components/Layout'
import { PhoneFrame } from '../../components/Visuals'
import NoVisit from './NoVisit'
import { useClinic } from '../../store/ClinicStore'
import { POSTOP } from '../../data/catalog'
import { inr, nowTime, prettyDate } from '../../lib/format'
import { IconWhatsApp, IconCheck, IconFile, IconRx, IconCalendar, IconArrowRight, IconTooth } from '../../lib/icons'

export default function WhatsAppBill() {
  const { visit, patient, clinic, bill, dispatch, nextStage, toast } = useClinic()
  const nav = useNavigate()
  const [sending, setSending] = useState(false)

  if (!visit || !patient) return <NoVisit stage="WhatsApp Bill" />

  const sent = visit.whatsappSent
  const first = (patient.name || '').split(' ')[0]

  const send = () => {
    setSending(true)
    setTimeout(() => {
      setSending(false)
      dispatch({ type: 'PATCH_VISIT', patch: { whatsappSent: true } })
      toast('Bill sent on WhatsApp')
    }, 1200)
  }

  return (
    <>
      <VisitStrip />

      <div className="page-head">
        <div>
          <Eyebrow>Step 10 · automatic</Eyebrow>
          <h1>WhatsApp Bill</h1>
          <p>Bill, medicines and care instructions in one message</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-primary btn-sm" disabled={!sent}
            onClick={() => { nextStage(); nav('/review') }}>
            Review screen <IconArrowRight size={12} />
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '282px 1fr', gap: 12, alignItems: 'start' }}>
        <PhoneFrame>
          <div className="wa-head">
            <Avatar name={clinic.name} color="#197E65" size={26} />
            <div>
              <div className="nm">{clinic.name}</div>
              <div className="st">{sending ? 'typing...' : 'Business account'}</div>
            </div>
          </div>
          <div className="wa-body">
            {(sent || sending) ? (
              <>
                <div className="wa-msg fade-up">
                  <div className="wa-doc">
                    <div style={{ width: 24, height: 24, borderRadius: 5, background: '#E44D42', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#fff', fontSize: 7, fontWeight: 800 }}>PDF</span>
                    </div>
                    <div>
                      <div className="dn">{visit.invoice?.no}.pdf</div>
                      <div className="dm">1 page</div>
                    </div>
                  </div>
                  Hi {first}, here is your bill from today.<br />
                  <b>Amount:</b> {inr(bill.total)}<br />
                  <b>Paid:</b> {inr(bill.paid)}<br />
                  {bill.due > 0 && <><b>Balance:</b> {inr(bill.due)}<br /></>}
                  <b>Date:</b> {prettyDate(visit.date)}
                  <div className="wa-time">{nowTime()} {sent && 'done'}</div>
                </div>

                {bill.done.length > 0 && (
                  <div className="wa-msg fade-up">
                    <b>Treatment done today</b><br />
                    {bill.done.map((p, i) => (
                      <span key={i}>- {p.name}{p.tooth !== '-' ? ` (${p.tooth})` : ''}<br /></span>
                    ))}
                    <div className="wa-time">{nowTime()} {sent && 'done'}</div>
                  </div>
                )}

                {(visit.rx || []).length > 0 && (
                  <div className="wa-msg fade-up">
                    <b>Your medicines</b><br />
                    {visit.rx.map((d, i) => (
                      <span key={i}>{i + 1}. {d.name} - {d.dose}, {d.days}d<br /></span>
                    ))}
                    <div className="wa-time">{nowTime()} {sent && 'done'}</div>
                  </div>
                )}

                {visit.postOp && (
                  <div className="wa-msg fade-up">
                    <b>Care instructions</b><br />
                    {POSTOP[visit.postOp].slice(0, 4).map((l, i) => <span key={i}>- {l}<br /></span>)}
                    <div className="wa-time">{nowTime()} {sent && 'done'}</div>
                  </div>
                )}

                {visit.nextVisit && (
                  <div className="wa-msg fade-up">
                    Next visit: <b>{visit.nextVisit}</b>
                    <div className="wa-time">{nowTime()} {sent && 'done'}</div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ margin: 'auto', textAlign: 'center', color: '#667781', fontSize: 12 }}>
                Nothing sent yet
              </div>
            )}
          </div>
          <div className="wa-input">
            <span className="fake">Type a message...</span>
            <IconWhatsApp size={16} color="#075E54" />
          </div>
        </PhoneFrame>

        <Card>
          <div className="row" style={{ marginBottom: 12 }}>
            <Tile tone="green" size="lg"><IconWhatsApp size={17} color="currentColor" /></Tile>
            <div>
              <div className="strong" style={{ fontSize: 'var(--fs-md)' }}>
                Send to {patient.phone || 'no number on file'}
              </div>
              <div className="muted" style={{ fontSize: 'var(--fs-xs)' }}>WhatsApp Business</div>
            </div>
            <div className="spacer" />
            {sent && <Badge tone="green"><IconCheck size={9} /> Sent</Badge>}
          </div>

          <div style={{ margin: '0 -9px 12px' }}>
            {[
              [IconFile, 'blue', 'Invoice', visit.invoice?.no ? `${visit.invoice.no} · ${inr(bill.total)}` : 'No invoice'],
              [IconTooth, 'green', 'Treatment summary', `${bill.done.length} procedure(s)`],
              [IconRx, 'violet', 'Prescription', `${(visit.rx || []).length} medicine(s)`],
              [IconCalendar, 'amber', 'Next visit', visit.nextVisit || 'Not set'],
            ].map(([Icon, tone, t, d]) => (
              <DataRow key={t} lead={<Tile tone={tone}><Icon size={13} /></Tile>} title={t} sub={d}
                trail={sent ? <IconCheck size={12} style={{ color: 'var(--g-600)' }} /> : null} />
            ))}
          </div>

          {!sent ? (
            <button className="btn btn-primary btn-lg btn-block" disabled={sending} onClick={send}>
              {sending ? 'Sending...' : <><IconWhatsApp size={15} color="currentColor" /> Send on WhatsApp</>}
            </button>
          ) : (
            <div className="lrow fade-up" style={{ borderColor: 'var(--g-200)', background: 'var(--g-50)' }}>
              <IconCheck size={15} style={{ color: 'var(--g-600)' }} />
              <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>Delivered at {nowTime()}</div>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
