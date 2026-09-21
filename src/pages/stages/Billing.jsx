import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Field, Chip, Eyebrow, Tile, DataRow } from '../../components/UI'
import { VisitStrip } from '../../components/Layout'
import CollectPayment from '../../components/CollectPayment'
import NoVisit from './NoVisit'
import { useClinic } from '../../store/ClinicStore'
import { inr, prettyDate } from '../../lib/format'
import { billMessage, reviewUrl, shareBill, downloadBlob, openWhatsApp } from '../../lib/links'
import {
  IconReceipt, IconArrowRight, IconAlert, IconWhatsApp, IconCheck, IconFile,
  IconStar, IconDownload, IconHeart, IconRx,
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
  const [sending, setSending] = useState(false)

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
  const review = reviewUrl({ visit, patient, clinic })

  /* jsPDF is ~400 KB, so it is fetched only when a bill is actually sent or
     downloaded — never on the patient's phone when they open the QR form. */
  const buildPdf = async () => {
    const { billPdf } = await import('../../lib/pdf')
    return billPdf({ clinic, patient, visit, bill, reviewUrl: review })
  }

  const sendBill = async () => {
    if (!patient.phone) return toast('No mobile number saved for this patient')
    setSending(true)
    try {
      const { blob, file } = await buildPdf()
      const text = billMessage({ clinic, patient, visit, bill, review })
      const how = await shareBill({ blob, file, text, phone: patient.phone })
      if (how === 'cancelled') return toast('Not sent')
      dispatch({ type: 'MARK_SENT', id: visit.id })
      toast(how === 'shared'
        ? 'Bill shared — pick the patient in WhatsApp'
        : 'PDF downloaded and chat opened — drag the PDF into it')
    } catch (e) {
      toast('Could not build the PDF')
    } finally {
      setSending(false)
    }
  }

  const textOnly = () => {
    const ok = openWhatsApp(patient.phone, billMessage({ clinic, patient, visit, bill, review }))
    if (ok) dispatch({ type: 'MARK_SENT', id: visit.id })
    toast(ok ? 'Chat opened with the bill summary' : 'No mobile number saved for this patient')
  }

  const finish = () => {
    dispatch({ type: 'FINISH_VISIT' })
    toast(bill.due > 0 ? `Visit closed · ${inr(bill.due)} carried to ${patient.name.split(' ')[0]}'s account` : 'Visit closed')
    nav('/checkin')
  }

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

          <Card title="Send to patient" sub={visit.whatsappSent ? `Sent at ${visit.sentAt || '—'}` : 'On WhatsApp'}>
            <div style={{ margin: '0 -9px 10px' }}>
              <DataRow lead={<Tile tone="blue"><IconFile size={12} /></Tile>}
                title="Bill as a PDF" sub={`${visit.invoice?.no || 'Invoice'} · itemised, with payments`} />
              <DataRow lead={<Tile tone="green"><IconWhatsApp size={12} color="currentColor" /></Tile>}
                title="Short description" sub="Treatment, total, paid, balance" />
              {(visit.rx || []).length > 0 && (
                <DataRow lead={<Tile tone="violet"><IconRx size={12} /></Tile>}
                  title="Prescription" sub={`${visit.rx.length} medicine${visit.rx.length > 1 ? 's' : ''}`} />
              )}
              <DataRow lead={<Tile tone="amber"><IconStar size={12} /></Tile>}
                title="Review link" sub={clinic.googlePlaceUrl ? 'Opens a 10-second rating, then Google' : 'Rating page — add your Google link in Settings'} />
            </div>

            <button className="btn btn-primary btn-lg btn-block" disabled={!bill.done.length || sending} onClick={sendBill}>
              <IconWhatsApp size={15} color="currentColor" />
              {sending ? 'Preparing…' : visit.whatsappSent ? 'Send again' : 'Send bill on WhatsApp'}
            </button>
            <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 6 }}
              disabled={!bill.done.length} onClick={textOnly}>
              Send text only, without the PDF
            </button>

            <p className="faint" style={{ fontSize: 'var(--fs-micro)', lineHeight: 1.5, marginTop: 8 }}>
              On a phone, or Chrome on Windows and Mac, this opens the share sheet with the PDF
              attached — pick WhatsApp, then the patient. Where files cannot be shared, the PDF
              downloads and the chat opens with the message ready; drag the PDF in.
            </p>
          </Card>

          {!closed && (
            <Card title="Finish the visit">
              {bill.due > 0 && bill.total > 0 && (
                <div className="lrow" style={{ marginBottom: 10, background: 'var(--a-amber-bg)', borderColor: 'rgba(200,134,13,.25)' }}>
                  <IconAlert size={14} style={{ color: 'var(--a-amber)' }} />
                  <span style={{ fontSize: 'var(--fs-sm)' }}>
                    {inr(bill.due)} unpaid will be carried to {patient.name.split(' ')[0]}&apos;s account.
                  </span>
                </div>
              )}
              <p className="muted" style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.55, marginBottom: 10 }}>
                Saves today&apos;s charting to the permanent record and frees the chair.
                Nothing is deleted — reopen the visit from the patient file any time.
              </p>
              <button className="btn btn-dark btn-block" disabled={!bill.done.length} onClick={finish}>
                <IconHeart size={13} /> Close visit & next patient <IconArrowRight size={12} />
              </button>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
