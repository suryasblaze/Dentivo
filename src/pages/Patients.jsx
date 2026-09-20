import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Avatar, Eyebrow, Blank, Modal, Field, Chip, Tile, DataRow, ChipsWithOther } from '../components/UI'
import { useClinic } from '../store/ClinicStore'
import { GENDERS, ISSUES } from '../data/config'
import { MEDICAL_FLAGS, ALLERGY_OPTIONS } from '../data/catalog'
import { inr, prettyDate } from '../lib/format'
import { IconPlus, IconSearch, IconUsers, IconAlert, IconArrowUpRight, IconQueue, IconCheck } from '../lib/icons'

const BLANK = {
  name: '', phone: '', gender: '', age: '', issue: '', email: '', address: '',
  medical: [], allergies: [], medications: '',
}

export default function Patients() {
  const { patients, visits, dispatch, toast } = useClinic()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [add, setAdd] = useState(false)
  const [f, setF] = useState(BLANK)

  const shown = patients.filter(p => !q || (p.name + p.uhid + p.phone).toLowerCase().includes(q.toLowerCase()))
  const valid = f.name.trim().length > 1 && f.phone.replace(/\D/g, '').length >= 10 && f.gender

  const create = () => {
    dispatch({ type: 'ADD_PATIENT', data: { ...f, medical: f.medical.filter(m => m !== 'none') } })
    toast(`${f.name} added`)
    setAdd(false); setF(BLANK)
  }

  const checkIn = (p) => {
    dispatch({ type: 'CHECK_IN', patientId: p.id, data: { visitType: 'Walk-in', reason: p.issue || '' } })
    toast(`${p.name} checked in`)
    nav('/checkin')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Eyebrow>Step 3 · records</Eyebrow>
          <h1>Patient Records</h1>
          <p>{patients.length ? `${patients.length} registered` : 'No patients yet — add one, or convert a submission'}</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setAdd(true)}><IconPlus size={12} /> Add patient</button>
        </div>
      </div>

      {patients.length === 0 ? (
        <Blank icon={<IconUsers size={20} />} title="No patient records yet"
          action={<div className="row" style={{ gap: 7, justifyContent: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setAdd(true)}><IconPlus size={12} /> Add manually</button>
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/submissions')}>From submissions</button>
          </div>}>
          A record is created either from a link submission or by adding one here at the desk.
        </Blank>
      ) : (
        <>
          <Card style={{ marginBottom: 10 }}>
            <div className="search" style={{ maxWidth: 280 }}>
              <IconSearch size={14} style={{ color: 'var(--faint)' }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, ID or mobile…" />
            </div>
          </Card>

          <div className="panel">
            <div className="panel-body" style={{ paddingTop: 12 }}>
              <table className="tbl">
                <thead>
                  <tr><th>Patient</th><th>ID</th><th>Mobile</th><th>Problem</th><th>Alerts</th>
                    <th>Visits</th><th style={{ textAlign: 'right' }}>Balance</th><th /></tr>
                </thead>
                <tbody>
                  {shown.map(p => {
                    const alerts = (p.medical || []).length + (p.allergies || []).length
                    const active = visits.some(v => v.patientId === p.id && v.stage !== 'done')
                    return (
                      <tr key={p.id}>
                        <td onClick={() => nav('/patients/' + p.id)} style={{ cursor: 'pointer' }}>
                          <div className="row">
                            <Avatar name={p.name} color="#197E65" size={26} />
                            <div>
                              <div className="cell-strong">{p.name}</div>
                              <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>
                                {p.age ? `${p.age}y · ` : ''}{p.gender}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="mono-num faint">{p.uhid}</td>
                        <td className="faint">{p.phone}</td>
                        <td>{p.issue ? <Badge tone="blue">{p.issue}</Badge> : <span className="faint">—</span>}</td>
                        <td>{alerts
                          ? <Badge tone="red"><IconAlert size={8} />{alerts}</Badge>
                          : <span className="faint">—</span>}</td>
                        <td className="mono-num">{p.visits || 0}</td>
                        <td className="cell-strong mono-num" style={{ textAlign: 'right', color: p.balance > 0 ? 'var(--a-rose)' : 'var(--muted)' }}>
                          {p.balance > 0 ? inr(p.balance) : '—'}
                        </td>
                        <td>
                          <div className="row" style={{ gap: 4 }}>
                            {!active && (
                              <button className="btn btn-soft btn-sm" onClick={() => checkIn(p)}>
                                <IconQueue size={10} /> Check in
                              </button>
                            )}
                            {active && <Badge tone="green" dot>In clinic</Badge>}
                            <button className="corner-btn" onClick={() => nav('/patients/' + p.id)}>
                              <IconArrowUpRight size={10} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {shown.length === 0 && <div className="empty">Nothing matches that search.</div>}
            </div>
          </div>
        </>
      )}

      {/* ---------- Add patient ---------- */}
      {add && (
        <Modal title="Add patient" sub="For walk-ins who did not use the link" onClose={() => setAdd(false)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setAdd(false)}>Cancel</button>
            <div className="spacer" />
            <button className="btn btn-primary" disabled={!valid} onClick={create}>
              <IconCheck size={13} /> Create record
            </button>
          </>}>
          <div className="grid g-2">
            <Field label="Name" span={2}>
              <input className="input" autoFocus value={f.name} placeholder="Full name"
                onChange={e => setF(s => ({ ...s, name: e.target.value }))} />
            </Field>
            <Field label="Mobile">
              <input className="input" value={f.phone} placeholder="10-digit"
                onChange={e => setF(s => ({ ...s, phone: e.target.value }))} />
            </Field>
            <Field label="Age">
              <input className="input" type="number" value={f.age} placeholder="e.g. 34"
                onChange={e => setF(s => ({ ...s, age: e.target.value }))} />
            </Field>
            <Field label="Gender" span={2}>
              <div className="chip-grid">
                {GENDERS.map(g => <Chip key={g} on={f.gender === g} onClick={() => setF(s => ({ ...s, gender: g }))}>{g}</Chip>)}
              </div>
            </Field>
            <Field label="Problem" span={2}>
              <div className="chip-grid">
                {ISSUES.map(i => <Chip key={i} on={f.issue === i} onClick={() => setF(s => ({ ...s, issue: i }))}>{i}</Chip>)}
              </div>
            </Field>
            <Field label="Email (optional)">
              <input className="input" value={f.email} onChange={e => setF(s => ({ ...s, email: e.target.value }))} />
            </Field>
            <Field label="Address (optional)">
              <input className="input" value={f.address} onChange={e => setF(s => ({ ...s, address: e.target.value }))} />
            </Field>
            <Field label="Medical conditions" span={2} hint="Not listed? Use Other and type it.">
              <ChipsWithOther options={MEDICAL_FLAGS} exclusiveKey="none" value={f.medical}
                placeholder="e.g. Anaemia, recent surgery…"
                onChange={v => setF(s => ({ ...s, medical: v }))} />
            </Field>
            <Field label="Drug allergies" span={2} hint="Not listed? Use Other and type it.">
              <ChipsWithOther options={ALLERGY_OPTIONS} warn value={f.allergies}
                placeholder="e.g. Cephalosporins"
                onChange={v => setF(s => ({ ...s, allergies: v }))} />
            </Field>
          </div>
        </Modal>
      )}
    </>
  )
}
