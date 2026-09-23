import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Field, Chip, Eyebrow, Tile, DataRow } from '../../components/UI'
import { VisitStrip } from '../../components/Layout'
import CollectPayment from '../../components/CollectPayment'
import NoVisit from './NoVisit'
import { useClinic } from '../../store/ClinicStore'
import { inr, prettyDate } from '../../lib/format'
import { billMessage, billLink, googleReviewUrl, downloadBlob, waLink, isLocalLink } from '../../lib/links'
import { treatmentComplete } from '../../lib/bill'
import {
  IconReceipt, IconArrowRight, IconAlert, IconWhatsApp, IconCheck, IconFile,
  IconStar, IconDownload, IconRx,
} from '../../lib/icons'

const DISCOUNTS = [
  { label: 'None', pct: 0 },
  { label: 'Senior 10%', pct: 10 },
  { label: 'Staff / family 20%', pct: 20 },
  { label: 'Camp 15%', pct: 15 },
]

/* =========================================================================
   Checkout. Invoice, payment, the WhatsApp bill (PDF + review link) and
   closing the visit — one screen, because they are one conversation at
   the desk.
   ========================================================================= */
export default function Billing() {
  const { visit, patient, clinic, bill, dispatch, toast } = useClinic()
  const nav = useNavigate()
  const [askReview, setAskReview] = useState(null)   // null = follow the treatment plan

  /* keep the invoice amounts current; the number itself is issued once */
  useEffect(() => {
    if (!visit || visit.stage === 'done') return
    dispatch({
      type: 'MAKE_INVOICE',
      invoice: { subtotal: bill.subtotal, discount: bill.discount, gst: bill.gstAmt, total: bill.total },
    })
  }, [visit?.id, bill.subtotal, bill.discount, bill.gstAmt])

  if (!visit || !patient) return <NoVisit stage="Billing & Checkout" />

  const closed = visit.stage === 'done'
  const pctOf = (p) => Math.round(bill.subtotal * (p / 100))
  const google = googleReviewUrl(clinic)
  const complete = treatmentComplete(visit)
  const ask = askReview ?? complete

  const buildPdf = async () => {
    /* jsPDF is ~400 KB, so it loads only when someone actually wants a PDF */
    const { billPdf } = await import('../../lib/pdf')
    return billPdf({ clinic, patient, visit, bill, reviewUrl: ask ? google : '' })
  }

  /* One message, one link: bill + PDF + (when treatment is finished) review.
     The window is opened first, while we are still inside the click, and the
     address filled in once the link is built — otherwise the browser treats
     it as a pop-up and blocks it. */
  const send = () => {
    if (!patient.phone) return false
    const tab = window.open('', '_blank', 'noopener')
    billLink({ clinic, patient, visit, bill, askReview: ask }).then(link => {
      const url = waLink(patient.phone, billMessage({ clinic, patient, visit, bill, link, askReview: ask }))
      if (tab) tab.location.href = url
      else window.open(url, '_blank', 'noopener')
    })
    dispatch({ type: 'MARK_SENT', id: visit.id, review: ask })
    return true
  }

  const finish = (andSend) => {
    const sent = andSend ? send() : false
    dispatch({ type: 'FINISH_VISIT' })
    const first = patient.name.split(' ')[0]
    toast([
      'Visit closed',
      bill.due > 0 ? `${inr(bill.due)} carried to ${first}'s account` : '',
      andSend ? (sent ? 'bill sent on WhatsApp' : 'no mobile number — bill not sent') : '',
    ].filter(Boolean).join(' · '))
    nav('/checkin')
  }

  const resend = () => toast(send() ? 'Bill link opened in WhatsApp' : 'No mobile number saved for this patient')

  return (
    <>
      <VisitStrip />

      <div className="page-head">
        <div>
          <Eyebrow>Step 8 · reception</Eyebrow>
          <h1>Billing & Checkout</h1>
          <p>Bill, take payment, send it on WhatsApp with the review link, and close the visit.</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost btn-sm" disabled={!bill.done.length}
            onClick={async () => { const { blob, file } = await buildPdf(); downloadBlob(blob, file) }}>
            <IconDownload size={12} /> PDF
          </button>
        </div>
      </div>

      {closed && (
        <div className="lrow" style={{ marginBottom: 10, background: 'var(--g-50)', borderColor: 'var(--g-200)' }}>
          <IconCheck size={15} style={{ color: 'var(--g-600)' }} />
          <div>
            <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>
              This visit was closed at {visit.closedAt}{visit.receiptNo ? ` · receipt ${visit.receiptNo}` : ''}
            </div>
            <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>
              Read-only. You can still download or resend the bill.
            </div>
          </div>
        </div>
      )}

      <div className="grid g-main">
        {/* ================= the invoice ================= */}
        <div className="col" style={{ gap: 10 }}>
          <div className="panel">
            <div className="panel-head" style={{ alignItems: 'flex-start', padding: 14 }}>
              <div>
                <div className="strong" style={{ fontSize: 'var(--fs-lg)' }}>{clinic.name}</div>
                <div className="faint" style={{ fontSize: 'var(--fs-micro)', lineHeight: 1.5 }}>
                  {clinic.address}{clinic.gstin ? ` · GSTIN ${clinic.gstin}` : ''}
                </div>
              </div>
              <div className="spacer" />
              <div style={{ textAlign: 'right' }}>
                <Badge tone="green"><IconReceipt size={10} /> Invoice</Badge>
                <div className="strong mono-num" style={{ fontSize: 'var(--fs-base)', marginTop: 4 }}>
                  {visit.invoice?.no || '—'}
                </div>
                <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{prettyDate(visit.date)}</div>
              </div>
            </div>

            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <div className="field"><label>Bill to</label></div>
              <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>{patient.name}</div>
              <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>
                {patient.uhid} · {patient.phone} · token {visit.token}
              </div>
            </div>

            <div style={{ padding: '10px 14px' }}>
              {bill.done.length === 0 ? (
                <div className="empty">
                  <IconAlert size={18} style={{ color: 'var(--faint)' }} />
                  <div style={{ marginTop: 6 }}>Nothing ticked as done in Treatment.</div>
                  <button className="btn btn-soft btn-sm" style={{ marginTop: 8 }}
                    onClick={() => nav('/treatment')}>Back to Treatment</button>
                </div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr><th>Procedure</th><th>Tooth</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
                  </thead>
                  <tbody>
                    {bill.done.map((l, i) => (
                      <tr key={i}>
                        <td>
                          <div className="cell-strong">{l.name}</div>
                          <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>
                            {l.code}{l.gst ? ` · GST ${l.gst}%` : ' · exempt'}
                          </div>
                        </td>
                        <td><Badge>{l.tooth}</Badge></td>
                        <td className="cell-strong mono-num" style={{ textAlign: 'right' }}>{inr(l.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {bill.done.length > 0 && (
              <div style={{ padding: '0 14px 14px' }}>
                <div style={{ maxWidth: 280, marginLeft: 'auto' }}>
                  <div className="rcp-line"><span className="lb">Subtotal</span><span className="vl">{inr(bill.subtotal)}</span></div>
                  {bill.discount > 0 && (
                    <div className="rcp-line"><span className="lb">Discount</span>
                      <span className="vl" style={{ color: 'var(--a-rose)' }}>- {inr(bill.discount)}</span></div>
                  )}
                  {bill.gstAmt > 0 && (
                    <div className="rcp-line"><span className="lb">GST 18%</span><span className="vl">{inr(bill.gstAmt)}</span></div>
                  )}
                  <div className="rcp-line rcp-total">
                    <span className="lb">Payable</span>
                    <span className="vl" style={{ color: 'var(--g-700)' }}>{inr(bill.total)}</span>
                  </div>
                  <div className="rcp-line"><span className="lb">Paid</span>
                    <span className="vl" style={{ color: 'var(--g-700)' }}>{inr(bill.paid)}</span></div>
                  {bill.due > 0 && (
                    <div className="rcp-line"><span className="lb">Balance</span>
                      <span className="vl" style={{ color: 'var(--a-rose)' }}>{inr(bill.due)}</span></div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!closed && bill.done.length > 0 && (
            <Card title="Discount">
              <div className="chip-grid">
                {DISCOUNTS.map(d => (
                  <Chip key={d.label}
                    on={(d.pct === 0 && !bill.discount) || (d.pct > 0 && bill.discount === pctOf(d.pct))}
                    onClick={() => dispatch({ type: 'PATCH_VISIT', patch: { discount: pctOf(d.pct) } })}>
                    {d.label}
                  </Chip>
                ))}
              </div>
              <div style={{ height: 10 }} />
              <Field label="Exact amount">
                <input className="input mono-num" type="number" value={visit.discount || 0} style={{ maxWidth: 150 }}
                  onChange={e => dispatch({ type: 'PATCH_VISIT', patch: { discount: Number(e.target.value) || 0 } })} />
              </Field>
              {patient.balance > 0 && (
                <div className="rcp-line" style={{ marginTop: 8 }}>
                  <span className="lb">Previous balance on account</span>
                  <span className="vl" style={{ color: 'var(--a-rose)' }}>{inr(patient.balance)}</span>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* ================= checkout column ================= */}
        <div className="col" style={{ gap: 10 }}>
          {bill.done.length > 0 && <CollectPayment locked={closed} />}

          <Card title={closed ? 'Bill sent to patient' : 'Finish & send'}
            sub={visit.whatsappSent ? `Sent on WhatsApp at ${visit.sentAt || '—'}` : 'One WhatsApp message, one link'}>
            <div style={{ margin: '0 -9px 8px' }}>
              <DataRow lead={<Tile tone="blue"><IconFile size={12} /></Tile>}
                title="Bill page + PDF download" sub={`${visit.invoice?.no || 'Invoice'} · items, payments${bill.due > 0 ? ', UPI to pay the balance' : ''}`} />
              {(visit.rx || []).length > 0 && (
                <DataRow lead={<Tile tone="violet"><IconRx size={12} /></Tile>}
                  title="Prescription" sub={`${visit.rx.length} medicine${visit.rx.length > 1 ? 's' : ''}${visit.nextVisit ? ` · next visit ${visit.nextVisit}` : ''}`} />
              )}
            </div>

            {!closed && (
              <label className={`rv-toggle ${ask ? 'on' : ''}`}>
                <input type="checkbox" checked={ask} onChange={e => setAskReview(e.target.checked)} />
                <IconStar size={13} filled={ask} />
                <span>
                  <b>Ask for a Google review</b>
                  <small>
                    {complete
                      ? (google ? 'Treatment finished — a good moment to ask' : 'Add your Google review link in Settings first')
                      : 'Off: treatment is still in progress. Ask after the last sitting.'}
                  </small>
                </span>
              </label>
            )}

            {!closed && bill.due > 0 && bill.total > 0 && (
              <div className="lrow" style={{ margin: '8px 0 0', background: 'var(--a-amber-bg)', borderColor: 'rgba(200,134,13,.25)' }}>
                <IconAlert size={14} style={{ color: 'var(--a-amber)' }} />
                <span style={{ fontSize: 'var(--fs-sm)' }}>
                  {inr(bill.due)} unpaid will be carried to {patient.name.split(' ')[0]}&apos;s account.
                  The bill page shows a UPI button for it.
                </span>
              </div>
            )}

            <div style={{ height: 10 }} />
            {closed ? (
              <button className="btn btn-primary btn-block" onClick={resend}>
                <IconWhatsApp size={14} color="currentColor" /> {visit.whatsappSent ? 'Send the bill again' : 'Send bill on WhatsApp'}
              </button>
            ) : (
              <>
                <button className="btn btn-primary btn-lg btn-block" disabled={!bill.done.length} onClick={() => finish(true)}>
                  <IconWhatsApp size={15} color="currentColor" /> Finish & send bill <IconArrowRight size={13} />
                </button>
                <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 6 }}
                  disabled={!bill.done.length} onClick={() => finish(false)}>
                  Finish without sending
                </button>
              </>
            )}
            <p className="faint" style={{ fontSize: 'var(--fs-micro)', lineHeight: 1.5, marginTop: 8 }}>
              Closing saves today&apos;s charting to the patient record and frees the chair.
              Nothing is deleted.
            </p>
            {isLocalLink(window.location.origin) && (
              <div className="lrow" style={{ marginTop: 8, background: 'var(--a-amber-bg)', borderColor: 'rgba(200,134,13,.25)' }}>
                <IconAlert size={13} style={{ color: 'var(--a-amber)' }} />
                <span style={{ fontSize: 'var(--fs-micro)', lineHeight: 1.5 }}>
                  You are on <b>localhost</b>, so the bill link only opens on this computer.
                  Send it from the deployed site for it to work on a patient&apos;s phone.
                </span>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
