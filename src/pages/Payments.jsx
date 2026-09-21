import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Stat, Badge, Avatar, Eyebrow, Blank, Seg, Tabs, RankList } from '../components/UI'
import { useClinic } from '../store/ClinicStore'
import { stagePath } from '../data/config'
import { inr, inrShort, prettyDate, localISO } from '../lib/format'
import { openWhatsApp, paymentLinkMessage } from '../lib/links'
import { IconRupee, IconCheck, IconAlert, IconWhatsApp, IconSearch, IconArrowUpRight } from '../lib/icons'

/* Every payment ever recorded, and every bill still owed. Payments are taken
   at checkout; this page is where you look them up. */
export default function Payments() {
  const { visits, patients, clinic, dispatch, toast } = useClinic()
  const nav = useNavigate()
  const [tab, setTab] = useState('received')
  const [range, setRange] = useState('all')
  const [q, setQ] = useState('')

  const today = localISO()
  const monthStart = today.slice(0, 7)
  const pt = (id) => patients.find(p => p.id === id)
  const paidOf = (v) => (v.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0)

  /* ---------- flatten every payment into one row ---------- */
  const rows = visits.flatMap(v => (v.payments || []).map((p, i) => ({
    key: v.id + ':' + i, visit: v, patient: pt(v.patientId),
    date: v.date, time: p.at, mode: p.mode, ref: p.ref, amount: Number(p.amount || 0),
    status: p.status || 'success',
  }))).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')))

  const inRange = (d) => range === 'all' || (range === 'today' ? d === today : d.startsWith(monthStart))
  const matches = (p) => !q || ((p?.name || '') + (p?.phone || '') + (p?.uhid || '')).toLowerCase().includes(q.toLowerCase())

  const received = rows.filter(r => inRange(r.date) && matches(r.patient))

  /* ---------- bills with money still owed ---------- */
  const owed = visits
    .filter(v => v.invoice?.total && paidOf(v) < v.invoice.total)
    .map(v => ({ visit: v, patient: pt(v.patientId), due: v.invoice.total - paidOf(v), paid: paidOf(v) }))
    .filter(r => inRange(r.visit.date) && matches(r.patient))
    .sort((a, b) => b.due - a.due)

  /* ---------- totals ---------- */
  const sum = (list) => list.reduce((s, r) => s + r.amount, 0)
  const todayTotal = sum(rows.filter(r => r.date === today))
  const monthTotal = sum(rows.filter(r => r.date.startsWith(monthStart)))
  const outstanding = patients.reduce((s, p) => s + Number(p.balance || 0), 0) +
    visits.filter(v => v.stage !== 'done' && v.invoice?.total).reduce((s, v) => s + Math.max(0, v.invoice.total - paidOf(v)), 0)

  const modes = {}
  rows.forEach(r => { const k = String(r.mode).split(' ')[0]; modes[k] = (modes[k] || 0) + r.amount })
  const modeRows = Object.entries(modes).sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({
    name, value, display: inr(value),
    color: ['var(--g-600)', 'var(--a-blue)', 'var(--a-amber)', 'var(--a-violet)'][i % 4],
  }))

  const remind = (patient, amount) => {
    const ok = openWhatsApp(patient?.phone, paymentLinkMessage({ clinic, patient, amount, upi: clinic.upiId }))
    toast(ok ? 'Reminder opened in WhatsApp' : 'No mobile number saved for this patient')
  }
  const open = (v) => { dispatch({ type: 'SET_ACTIVE_VISIT', id: v.id }); nav(stagePath(v.stage)) }

  return (
    <>
      <div className="page-head">
        <div>
          <Eyebrow>Step 9 · money</Eyebrow>
          <h1>Payments</h1>
          <p>Everything collected, and everything still owed. Payments are taken at checkout.</p>
        </div>
        <div className="page-head-actions">
          <Seg value={range} onChange={setRange} options={[
            { value: 'today', label: 'Today' }, { value: 'month', label: 'This month' }, { value: 'all', label: 'All' },
          ]} />
        </div>
      </div>

      <div className="stat-row">
        <Stat active label="Collected today" value={todayTotal ? inrShort(todayTotal) : '₹0'}
          bars={[0, 0, 0, 0, 0, 0, todayTotal ? 1 : 0]} foot={`${rows.filter(r => r.date === today).length} payment(s)`} />
        <Stat label="This month" value={monthTotal ? inrShort(monthTotal) : '₹0'}
          bars={[0, 0, 0, 0, 0, 0, monthTotal ? 1 : 0]} foot={`${rows.filter(r => r.date.startsWith(monthStart)).length} payment(s)`} />
        <Stat label="Outstanding" value={outstanding ? inrShort(outstanding) : '₹0'} deltaTone="down"
          bars={[0, 0, 0, 0, 0, 0, outstanding ? 1 : 0]} foot={outstanding ? 'Owed across bills and accounts' : 'Nothing owed'} />
        <Stat label="Payments recorded" value={String(rows.length)}
          bars={[0, 0, 0, 0, 0, 0, rows.length ? 1 : 0]} foot="All time" />
      </div>

      <div className="grid g-main">
        <div>
          <Tabs value={tab} onChange={setTab} tabs={[
            { key: 'received', label: 'Received', count: received.length || null },
            { key: 'owed', label: 'Still owed', count: owed.length || null },
          ]} />

          <div className="search" style={{ maxWidth: 280, marginBottom: 10 }}>
            <IconSearch size={14} style={{ color: 'var(--faint)' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patient or mobile…" />
          </div>

          {tab === 'received' && (received.length === 0 ? (
            <Blank icon={<IconRupee size={20} />} title="No payments here"
              action={<button className="btn btn-soft btn-sm" onClick={() => nav('/checkin')}>Go to Check-In</button>}>
              Payments recorded at checkout appear here.
            </Blank>
          ) : (
            <div className="panel">
              <div className="panel-body" style={{ paddingTop: 12 }}>
                <table className="tbl">
                  <thead><tr><th>When</th><th>Patient</th><th>Invoice</th><th>Method</th>
                    <th style={{ textAlign: 'right' }}>Amount</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {received.map(r => (
                      <tr key={r.key}>
                        <td>
                          <div className="cell-strong">{prettyDate(r.date)}</div>
                          <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{r.time}</div>
                        </td>
                        <td>
                          <div className="row">
                            <Avatar name={r.patient?.name} color="#197E65" size={22} />
                            <div>
                              <div className="cell-strong">{r.patient?.name || 'Unknown'}</div>
                              <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{r.patient?.uhid}</div>
                            </div>
                          </div>
                        </td>
                        <td className="mono-num faint">{r.visit.invoice?.no || '—'}</td>
                        <td>
                          <div>{r.mode}</div>
                          {r.ref && r.ref !== r.mode && <div className="faint mono-num" style={{ fontSize: 'var(--fs-micro)' }}>{r.ref}</div>}
                        </td>
                        <td className="cell-strong mono-num" style={{ textAlign: 'right' }}>{inr(r.amount)}</td>
                        <td><Badge tone="green"><IconCheck size={8} />Success</Badge></td>
                        <td><button className="corner-btn" title="Open bill" onClick={() => open(r.visit)}><IconArrowUpRight size={10} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="rcp-line rcp-total" style={{ maxWidth: 260, marginLeft: 'auto' }}>
                  <span className="lb">Total shown</span><span className="vl">{inr(sum(received))}</span>
                </div>
              </div>
            </div>
          ))}

          {tab === 'owed' && (owed.length === 0 ? (
            <Blank icon={<IconCheck size={20} />} title="Nothing owed">
              Every bill in this range has been paid in full.
            </Blank>
          ) : (
            <div className="panel">
              <div className="panel-body" style={{ paddingTop: 12 }}>
                <table className="tbl">
                  <thead><tr><th>Date</th><th>Patient</th><th>Invoice</th>
                    <th style={{ textAlign: 'right' }}>Billed</th><th style={{ textAlign: 'right' }}>Paid</th>
                    <th style={{ textAlign: 'right' }}>Due</th><th /></tr></thead>
                  <tbody>
                    {owed.map(r => (
                      <tr key={r.visit.id}>
                        <td className="cell-strong">{prettyDate(r.visit.date)}</td>
                        <td>
                          <div className="cell-strong">{r.patient?.name || 'Unknown'}</div>
                          <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{r.patient?.phone}</div>
                        </td>
                        <td className="mono-num faint">{r.visit.invoice?.no}</td>
                        <td className="mono-num" style={{ textAlign: 'right' }}>{inr(r.visit.invoice.total)}</td>
                        <td className="mono-num" style={{ textAlign: 'right', color: 'var(--g-700)' }}>{inr(r.paid)}</td>
                        <td className="cell-strong mono-num" style={{ textAlign: 'right', color: 'var(--a-rose)' }}>{inr(r.due)}</td>
                        <td>
                          <div className="row" style={{ gap: 4 }}>
                            <button className="corner-btn" title="WhatsApp reminder" onClick={() => remind(r.patient, r.due)}>
                              <IconWhatsApp size={10} color="currentColor" />
                            </button>
                            <button className="corner-btn" title="Open bill" onClick={() => open(r.visit)}><IconArrowUpRight size={10} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div className="col" style={{ gap: 10 }}>
          <Card title="By payment method" sub="All time">
            <RankList rows={modeRows} empty="No payments recorded yet" />
          </Card>
          <Card title="Accounts carrying a balance">
            {patients.filter(p => p.balance > 0).length === 0
              ? <div className="empty">No patient owes anything from past visits.</div>
              : patients.filter(p => p.balance > 0).map(p => (
                <div className="lrow" key={p.id} style={{ padding: '7px 9px' }}>
                  <Avatar name={p.name} color="#197E65" size={24} />
                  <div style={{ minWidth: 0 }}>
                    <div className="strong" style={{ fontSize: 'var(--fs-sm)' }}>{p.name}</div>
                    <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{p.phone}</div>
                  </div>
                  <div className="spacer" />
                  <span className="cell-strong mono-num" style={{ color: 'var(--a-rose)', fontSize: 'var(--fs-sm)' }}>{inr(p.balance)}</span>
                  <button className="corner-btn" onClick={() => remind(p, p.balance)}><IconWhatsApp size={10} color="currentColor" /></button>
                </div>
              ))}
          </Card>
        </div>
      </div>
    </>
  )
}
