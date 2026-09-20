import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Field, Tile, Eyebrow, ChipsWithOther } from '../../components/UI'
import { VisitStrip } from '../../components/Layout'
import { QRCode } from '../../components/Visuals'
import NoVisit from './NoVisit'
import { useClinic } from '../../store/ClinicStore'
import { inr } from '../../lib/format'
import { upiLink, openWhatsApp, paymentLinkMessage } from '../../lib/links'
import {
  IconUpi, IconCard, IconCash, IconCheck, IconX, IconClock, IconArrowRight,
  IconWhatsApp, IconAlert, IconSettings,
} from '../../lib/icons'

const METHODS = [
  { key: 'UPI', desc: 'Scan to pay', Icon: IconUpi },
  { key: 'Card', desc: 'POS terminal', Icon: IconCard },
  { key: 'Cash', desc: 'At the desk', Icon: IconCash },
  { key: 'EMI', desc: 'Split monthly', Icon: IconClock },
]

const UPI_APPS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Amazon Pay', 'Bank app']
const CARD_TYPES = ['Debit', 'Credit', 'RuPay', 'Visa', 'Mastercard']

export default function Payment() {
  const { visit, patient, clinic, bill, dispatch, nextStage, toast } = useClinic()
  const nav = useNavigate()
  const [method, setMethod] = useState('UPI')
  const [amount, setAmount] = useState('0')
  const [months, setMonths] = useState(3)

  // per-method detail
  const [upiApp, setUpiApp] = useState([])
  const [upiRef, setUpiRef] = useState('')
  const [cardType, setCardType] = useState([])
  const [cardLast4, setCardLast4] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [tendered, setTendered] = useState('')

  useEffect(() => { setAmount(String(bill.due)); setTendered(String(bill.due)) }, [bill.due])

  if (!visit || !patient) return <NoVisit stage="Payment" />

  const amt = Number(amount) || 0
  const note = `${visit.invoice?.no || 'Visit'} ${patient.name}`.slice(0, 50)
  const upiUri = upiLink({ vpa: clinic.upiId, name: clinic.name, amount: amt, note })
  const change = Math.max(0, (Number(tendered) || 0) - amt)

  const record = (mode, value, ref) => {
    if (!Number(value)) return toast('Enter an amount first')
    dispatch({ type: 'ADD_PAYMENT', payment: { mode, amount: Number(value), ref: ref || mode } })
    toast(`${inr(value)} recorded`)
  }

  const go = () => { dispatch({ type: 'SETTLE' }); nextStage(); nav('/whatsapp') }

  const chaseBalance = () => {
    const ok = openWhatsApp(patient.phone,
      paymentLinkMessage({ clinic, patient, amount: bill.due, upi: clinic.upiId }))
    toast(ok ? 'WhatsApp opened' : 'No mobile number on this patient')
  }

  return (
    <>
      <VisitStrip />

      <div className="page-head">
        <div>
          <Eyebrow>Step 9 · reception</Eyebrow>
          <h1>Payment</h1>
          <p>Full, part, or split across methods</p>
        </div>
        <div className="page-head-actions">
          {bill.due > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={chaseBalance}>
              <IconWhatsApp size={12} color="currentColor" /> Send payment link
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={go}>
            {bill.due > 0 ? 'Continue with balance' : 'WhatsApp bill'} <IconArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* ---------- amount banner ---------- */}
      <div className="card" style={{
        background: bill.due === 0 && bill.paid > 0 ? 'var(--g-600)' : 'var(--dark)',
        borderColor: 'transparent', color: '#fff', marginBottom: 10,
      }}>
        <div className="row">
          <div>
            <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 800, letterSpacing: '.11em', opacity: .65 }}>
              {bill.due === 0 && bill.paid > 0 ? 'FULLY PAID' : 'AMOUNT DUE'}
            </div>
            <div className="mono-num" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.05em', lineHeight: 1.15 }}>
              {inr(bill.due === 0 && bill.paid > 0 ? bill.total : bill.due)}
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', opacity: .6 }}>
              {visit.invoice?.no} · {patient.name}
            </div>
          </div>
          <div className="spacer" />
          {bill.due === 0 && bill.paid > 0 && (
            <div className="success-ring" style={{
              margin: 0, width: 44, height: 44,
              background: 'rgba(255,255,255,.16)', borderColor: 'rgba(255,255,255,.25)',
            }}>
              <IconCheck size={20} style={{ color: '#fff' }} />
            </div>
          )}
        </div>
      </div>

      <div className="grid g-main">
        <Card title="How are they paying?">
          <div className="grid g-4" style={{ gap: 7, marginBottom: 14 }}>
            {METHODS.map(({ key, desc, Icon }) => (
              <button key={key} className={`pay-method ${method === key ? 'on' : ''}`} onClick={() => setMethod(key)}>
                <Icon size={18} style={{ color: method === key ? 'var(--g-700)' : 'var(--muted)' }} />
                <div><div className="pm-nm">{key}</div><div className="pm-ds">{desc}</div></div>
              </button>
            ))}
          </div>

          {method !== 'EMI' && (
            <Field label="Amount to collect now">
              <div className="row" style={{ gap: 6 }}>
                <input className="input mono-num" style={{ fontSize: 15, fontWeight: 700, maxWidth: 170 }}
                  value={amount} onChange={e => setAmount(e.target.value)} />
                {bill.due > 0 && amt !== bill.due && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setAmount(String(bill.due))}>
                    Full {inr(bill.due)}
                  </button>
                )}
              </div>
            </Field>
          )}

          <div style={{ height: 14 }} />

          {/* ---------------- UPI ---------------- */}
          {method === 'UPI' && (
            <div className="fade-up">
              {clinic.upiId ? (
                <>
                  <div className="upi-pay">
                    <div className="upi-qr">
                      <QRCode seed={upiUri} size={148} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="field"><label>Scan with any UPI app</label></div>
                      <div className="strong mono-num" style={{ fontSize: 'var(--fs-md)', marginBottom: 2 }}>
                        {clinic.upiId}
                      </div>
                      <div className="faint" style={{ fontSize: 'var(--fs-micro)', lineHeight: 1.5 }}>
                        Pre-filled for <b>{inr(amt)}</b> to {clinic.name}.
                      </div>
                      <a className="btn btn-ghost btn-sm" href={upiUri} style={{ marginTop: 9 }}>
                        <IconUpi size={12} /> Open UPI app on this device
                      </a>
                      <div className="upi-apps">
                        {UPI_APPS.slice(0, 4).map(a => <span key={a} className="badge">{a}</span>)}
                      </div>
                    </div>
                  </div>

                  <div style={{ height: 12 }} />
                  <Field label="Which app did they use?">
                    <ChipsWithOther options={UPI_APPS} value={upiApp}
                      onChange={v => setUpiApp(v.slice(-1))} placeholder="Other app name" />
                  </Field>
                  <div style={{ height: 10 }} />
                  <Field label="UPI reference / UTR" hint="From their payment confirmation">
                    <input className="input mono-num" value={upiRef} placeholder="e.g. 442912345678"
                      onChange={e => setUpiRef(e.target.value)} />
                  </Field>

                  <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 12 }}
                    onClick={() => record(upiApp[0] ? `UPI · ${upiApp[0]}` : 'UPI', amount, upiRef || 'UPI')}>
                    <IconCheck size={15} /> Confirm {inr(amt)} received
                  </button>
                </>
              ) : (
                <div className="lrow" style={{ alignItems: 'flex-start', background: 'var(--a-amber-bg)', borderColor: 'rgba(200,134,13,.25)' }}>
                  <IconAlert size={15} style={{ color: 'var(--a-amber)', marginTop: 1 }} />
                  <div>
                    <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>No UPI ID saved</div>
                    <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>
                      Add it in Settings and a real scannable QR appears here.
                    </div>
                  </div>
                  <div className="spacer" />
                  <button className="btn btn-ghost btn-sm" onClick={() => nav('/settings')}>
                    <IconSettings size={12} /> Settings
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ---------------- Card ---------------- */}
          {method === 'Card' && (
            <div className="fade-up">
              <Field label="Card type">
                <ChipsWithOther options={CARD_TYPES} value={cardType}
                  onChange={v => setCardType(v.slice(-1))} placeholder="Other network" />
              </Field>
              <div className="grid g-2" style={{ marginTop: 12 }}>
                <Field label="Last 4 digits">
                  <input className="input mono-num" maxLength={4} value={cardLast4} placeholder="1234"
                    onChange={e => setCardLast4(e.target.value.replace(/\D/g, ''))} />
                </Field>
                <Field label="Approval code">
                  <input className="input mono-num" value={authCode} placeholder="From the POS slip"
                    onChange={e => setAuthCode(e.target.value)} />
                </Field>
              </div>
              <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 12 }}
                onClick={() => record(cardType[0] ? `Card · ${cardType[0]}` : 'Card', amount,
                  [cardLast4 && `****${cardLast4}`, authCode].filter(Boolean).join(' · ') || 'Card')}>
                <IconCheck size={15} /> Mark approved — {inr(amt)}
              </button>
            </div>
          )}

          {/* ---------------- Cash ---------------- */}
          {method === 'Cash' && (
            <div className="fade-up">
              <Field label="Cash handed over">
                <input className="input mono-num" style={{ fontSize: 15, fontWeight: 700, maxWidth: 170 }}
                  value={tendered} onChange={e => setTendered(e.target.value)} />
              </Field>
              <div className="chip-grid" style={{ marginTop: 8 }}>
                {[bill.due, 500, 1000, 2000, 5000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map(v => (
                  <button key={v} className="chip" onClick={() => setTendered(String(v))}>{inr(v)}</button>
                ))}
              </div>
              <div className="rcp-line rcp-total" style={{ marginTop: 12 }}>
                <span className="lb">Change to return</span>
                <span className="vl" style={{ color: change > 0 ? 'var(--a-amber)' : 'var(--g-700)' }}>
                  {inr(change)}
                </span>
              </div>
              <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 10 }}
                onClick={() => record('Cash', amount, change > 0 ? `Tendered ${inr(tendered)}` : 'Exact')}>
                <IconCash size={15} /> Confirm {inr(amt)} in cash
              </button>
            </div>
          )}

          {/* ---------------- EMI ---------------- */}
          {method === 'EMI' && (
            <div className="fade-up">
              <Field label="Instalments">
                <div className="chip-grid">
                  {[2, 3, 6, 9, 12].map(m => (
                    <button key={m} className={`chip ${months === m ? 'on' : ''}`} onClick={() => setMonths(m)}>
                      {m} months
                    </button>
                  ))}
                </div>
              </Field>
              <div className="lrow" style={{ marginTop: 10 }}>
                <Tile tone="green"><IconClock size={13} /></Tile>
                <div>
                  <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>
                    {inr(Math.round(bill.total / months))} × {months}
                  </div>
                  <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>First instalment today</div>
                </div>
              </div>
              <button className="btn btn-primary btn-block" style={{ marginTop: 10 }}
                onClick={() => record(`EMI 1/${months}`, Math.round(bill.total / months), 'Instalment plan')}>
                <IconCheck size={13} /> Collect first instalment
              </button>
            </div>
          )}
        </Card>

        {/* ---------------- Ledger ---------------- */}
        <Card title="Received" sub={`${visit.payments.length} payment(s)`}>
          {visit.payments.length === 0 ? (
            <div className="empty">Nothing recorded yet.</div>
          ) : visit.payments.map((p, i) => (
            <div className="lrow" key={i}>
              <Tile tone="green"><IconCheck size={13} /></Tile>
              <div style={{ minWidth: 0 }}>
                <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>{p.mode}</div>
                <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{p.at} · {p.ref}</div>
              </div>
              <div className="spacer" />
              <span className="cell-strong mono-num">{inr(p.amount)}</span>
              <button className="corner-btn" onClick={() => dispatch({ type: 'REMOVE_PAYMENT', index: i })}>
                <IconX size={10} />
              </button>
            </div>
          ))}
          <div className="divider" />
          <div className="rcp-line"><span className="lb">Invoice</span><span className="vl">{inr(bill.total)}</span></div>
          <div className="rcp-line"><span className="lb">Received</span>
            <span className="vl" style={{ color: 'var(--g-700)' }}>{inr(bill.paid)}</span></div>
          <div className="rcp-line rcp-total"><span className="lb">Balance</span>
            <span className="vl" style={{ color: bill.due > 0 ? 'var(--a-rose)' : 'var(--g-700)' }}>{inr(bill.due)}</span></div>

          {bill.due > 0 && (
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={chaseBalance}>
              <IconWhatsApp size={13} color="currentColor" /> WhatsApp the balance
            </button>
          )}
        </Card>
      </div>
    </>
  )
}
