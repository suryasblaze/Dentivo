import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Field, Tile, ChipsWithOther } from './UI'
import { QRCode } from './Visuals'
import { useClinic } from '../store/ClinicStore'
import { inr } from '../lib/format'
import { upiLink } from '../lib/links'
import { IconUpi, IconCard, IconCash, IconCheck, IconX, IconClock, IconAlert, IconSettings } from '../lib/icons'

const METHODS = [
  { key: 'UPI', Icon: IconUpi },
  { key: 'Card', Icon: IconCard },
  { key: 'Cash', Icon: IconCash },
  { key: 'EMI', Icon: IconClock },
]
const UPI_APPS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Bank app']
const CARD_TYPES = ['Debit', 'Credit', 'RuPay', 'Visa', 'Mastercard']

/* Payment capture for the visit in the chair. Lives inside checkout. */
export default function CollectPayment({ locked }) {
  const { visit, patient, clinic, bill, dispatch, toast } = useClinic()
  const nav = useNavigate()
  const [method, setMethod] = useState('UPI')
  const [amount, setAmount] = useState(String(bill.due))
  const [upiApp, setUpiApp] = useState([])
  const [ref, setRef] = useState('')
  const [cardType, setCardType] = useState([])
  const [last4, setLast4] = useState('')
  const [tendered, setTendered] = useState(String(bill.due))
  const [months, setMonths] = useState(3)

  useEffect(() => { setAmount(String(bill.due)); setTendered(String(bill.due)) }, [bill.due])

  const amt = Number(amount) || 0
  const upiUri = upiLink({
    vpa: clinic.upiId, name: clinic.name, amount: amt,
    note: `${visit?.invoice?.no || 'Visit'} ${patient?.name || ''}`.slice(0, 50),
  })
  const change = Math.max(0, (Number(tendered) || 0) - amt)

  const record = (mode, value, reference) => {
    if (!Number(value)) return toast('Enter an amount first')
    if (Number(value) > bill.due && bill.due > 0) return toast(`That is more than the ${inr(bill.due)} due`)
    dispatch({ type: 'ADD_PAYMENT', payment: { mode, amount: Number(value), ref: reference || mode, status: 'success' } })
    setRef(''); setLast4('')
    toast(`${inr(value)} recorded`)
  }

  const fullyPaid = bill.total > 0 && bill.due === 0

  return (
    <Card title="Collect payment"
      sub={fullyPaid ? 'Fully paid' : bill.total ? `${inr(bill.due)} still due` : 'Nothing billed yet'}>

      {/* ---------- received so far ---------- */}
      {visit.payments.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {visit.payments.map((p, i) => (
            <div className="lrow" key={i} style={{ padding: '7px 9px' }}>
              <Tile tone="green" size="sm"><IconCheck size={11} /></Tile>
              <div style={{ minWidth: 0 }}>
                <div className="strong" style={{ fontSize: 'var(--fs-sm)' }}>{p.mode}</div>
                <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{p.at}{p.ref && p.ref !== p.mode ? ` · ${p.ref}` : ''}</div>
              </div>
              <div className="spacer" />
              <span className="cell-strong mono-num" style={{ fontSize: 'var(--fs-sm)' }}>{inr(p.amount)}</span>
              {!locked && (
                <button className="corner-btn" title="Remove"
                  onClick={() => dispatch({ type: 'REMOVE_PAYMENT', index: i })}><IconX size={10} /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {fullyPaid ? (
        <div className="lrow" style={{ background: 'var(--g-50)', borderColor: 'var(--g-200)' }}>
          <IconCheck size={15} style={{ color: 'var(--g-600)' }} />
          <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>{inr(bill.total)} received in full</div>
        </div>
      ) : locked || !bill.total ? null : (
        <>
          <div className="grid g-4" style={{ gap: 5, marginBottom: 10 }}>
            {METHODS.map(({ key, Icon }) => (
              <button key={key} className={`pay-method ${method === key ? 'on' : ''}`}
                style={{ padding: 7 }} onClick={() => setMethod(key)}>
                <Icon size={15} style={{ color: method === key ? 'var(--g-700)' : 'var(--muted)' }} />
                <div className="pm-nm" style={{ fontSize: 'var(--fs-sm)' }}>{key}</div>
              </button>
            ))}
          </div>

          {method !== 'EMI' && (
            <Field label="Amount">
              <input className="input mono-num" style={{ fontSize: 14, fontWeight: 700 }}
                value={amount} onChange={e => setAmount(e.target.value)} />
            </Field>
          )}

          {method === 'UPI' && (clinic.upiId ? (
            <div style={{ marginTop: 10 }}>
              <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <div style={{ padding: 6, border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', flexShrink: 0 }}>
                  <QRCode seed={upiUri} size={96} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>Scan with any UPI app</div>
                  <div className="strong mono-num" style={{ fontSize: 'var(--fs-sm)' }}>{clinic.upiId}</div>
                  <div className="faint" style={{ fontSize: 'var(--fs-micro)', marginTop: 2 }}>Pre-filled for {inr(amt)}</div>
                </div>
              </div>
              <div style={{ height: 8 }} />
              <ChipsWithOther options={UPI_APPS} value={upiApp} onChange={v => setUpiApp(v.slice(-1))} placeholder="Other app" />
              <input className="input mono-num" style={{ marginTop: 7 }} value={ref}
                placeholder="UPI reference / UTR (optional)" onChange={e => setRef(e.target.value)} />
              <button className="btn btn-primary btn-block" style={{ marginTop: 9 }}
                onClick={() => record(upiApp[0] ? `UPI · ${upiApp[0]}` : 'UPI', amount, ref)}>
                <IconCheck size={13} /> Confirm {inr(amt)} received
              </button>
            </div>
          ) : (
            <div className="lrow" style={{ marginTop: 10, background: 'var(--a-amber-bg)', borderColor: 'rgba(200,134,13,.25)' }}>
              <IconAlert size={13} style={{ color: 'var(--a-amber)' }} />
              <span style={{ fontSize: 'var(--fs-sm)' }}>Add your UPI ID to show a QR</span>
              <div className="spacer" />
              <button className="btn btn-ghost btn-sm" onClick={() => nav('/settings')}><IconSettings size={11} /></button>
            </div>
          ))}

          {method === 'Card' && (
            <div style={{ marginTop: 10 }}>
              <ChipsWithOther options={CARD_TYPES} value={cardType} onChange={v => setCardType(v.slice(-1))} placeholder="Other network" />
              <div className="row" style={{ gap: 6, marginTop: 7 }}>
                <input className="input mono-num" maxLength={4} value={last4} placeholder="Last 4"
                  onChange={e => setLast4(e.target.value.replace(/\D/g, ''))} />
                <input className="input mono-num" value={ref} placeholder="Approval code"
                  onChange={e => setRef(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-block" style={{ marginTop: 9 }}
                onClick={() => record(cardType[0] ? `Card · ${cardType[0]}` : 'Card', amount,
                  [last4 && `****${last4}`, ref].filter(Boolean).join(' · '))}>
                <IconCheck size={13} /> Mark approved
              </button>
            </div>
          )}

          {method === 'Cash' && (
            <div style={{ marginTop: 10 }}>
              <Field label="Cash handed over">
                <input className="input mono-num" value={tendered} onChange={e => setTendered(e.target.value)} />
              </Field>
              <div className="rcp-line"><span className="lb">Change to return</span>
                <span className="vl" style={{ color: change ? 'var(--a-amber)' : 'var(--g-700)' }}>{inr(change)}</span></div>
              <button className="btn btn-primary btn-block" style={{ marginTop: 6 }}
                onClick={() => record('Cash', amount, change ? `Tendered ${inr(tendered)}` : '')}>
                <IconCash size={13} /> Confirm cash
              </button>
            </div>
          )}

          {method === 'EMI' && (
            <div style={{ marginTop: 4 }}>
              <div className="chip-grid">
                {[2, 3, 6, 9, 12].map(m => (
                  <button key={m} className={`chip ${months === m ? 'on' : ''}`} onClick={() => setMonths(m)}>{m} mo</button>
                ))}
              </div>
              <div className="rcp-line" style={{ marginTop: 6 }}>
                <span className="lb">{months} instalments of</span>
                <span className="vl">{inr(Math.round(bill.total / months))}</span>
              </div>
              <button className="btn btn-primary btn-block" style={{ marginTop: 6 }}
                onClick={() => record(`EMI 1/${months}`, Math.min(bill.due, Math.round(bill.total / months)), 'Instalment plan')}>
                <IconCheck size={13} /> Collect first instalment
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
