import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Field, Chip, Eyebrow } from '../../components/UI'
import { VisitStrip } from '../../components/Layout'
import NoVisit from './NoVisit'
import { useClinic } from '../../store/ClinicStore'
import { inr, prettyDate } from '../../lib/format'
import { openWhatsApp, billMessage } from '../../lib/links'
import { IconReceipt, IconPrint, IconArrowRight, IconAlert, IconWhatsApp } from '../../lib/icons'

const DISCOUNTS = [
  { label: 'None', pct: 0 },
  { label: 'Senior 10%', pct: 10 },
  { label: 'Staff / family 20%', pct: 20 },
  { label: 'Camp 15%', pct: 15 },
]

export default function Billing() {
  const { visit, patient, clinic, bill, dispatch, nextStage, toast } = useClinic()
  const nav = useNavigate()

  useEffect(() => {
    if (!visit) return
    dispatch({
      type: 'MAKE_INVOICE',
      invoice: {
        subtotal: bill.subtotal, discount: bill.discount,
        gst: bill.gstAmt, total: bill.total,
      },
    })
  }, [visit?.id, bill.subtotal, bill.discount])

  if (!visit || !patient) return <NoVisit stage="Billing" />

  const pctOf = (p) => Math.round(bill.subtotal * (p / 100))

  const sendBill = () => {
    const ok = openWhatsApp(patient.phone, billMessage({ clinic, patient, visit, bill }))
    toast(ok ? 'WhatsApp opened with the bill' : 'No mobile number saved for this patient')
  }

  return (
    <>
      <VisitStrip />

      <div className="page-head">
        <div>
          <Eyebrow>Step 8 · reception</Eyebrow>
          <h1>Billing</h1>
          <p>Built automatically from what was ticked as done</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
            <IconPrint size={12} /> Print
          </button>
          <button className="btn btn-ghost btn-sm" disabled={!bill.done.length} onClick={sendBill}>
            <IconWhatsApp size={12} color="currentColor" /> Send on WhatsApp
          </button>
          <button className="btn btn-primary btn-sm" disabled={!bill.done.length}
            onClick={() => { nextStage(); nav('/payment') }}>
            Payment <IconArrowRight size={12} />
          </button>
        </div>
      </div>

      <div className="grid g-main">
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
              <div style={{ maxWidth: 260, marginLeft: 'auto' }}>
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
              </div>
            </div>
          )}
        </div>

        <Card title="Adjustments">
          <Field label="Discount">
            <div className="chip-grid">
              {DISCOUNTS.map(d => (
                <Chip key={d.label} on={bill.discount === pctOf(d.pct) && d.pct > 0 || (d.pct === 0 && !bill.discount)}
                  onClick={() => dispatch({ type: 'PATCH_VISIT', patch: { discount: pctOf(d.pct) } })}>
                  {d.label}
                </Chip>
              ))}
            </div>
          </Field>
          <div style={{ height: 12 }} />
          <Field label="Exact discount amount">
            <input className="input mono-num" type="number" value={visit.discount || 0}
              onChange={e => dispatch({ type: 'PATCH_VISIT', patch: { discount: Number(e.target.value) || 0 } })}
              style={{ maxWidth: 150 }} />
          </Field>
          {patient.balance > 0 && (
            <>
              <div className="divider-x" />
              <div className="rcp-line">
                <span className="lb">Previous balance</span>
                <span className="vl" style={{ color: 'var(--a-rose)' }}>{inr(patient.balance)}</span>
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  )
}
