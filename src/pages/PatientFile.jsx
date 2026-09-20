import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Badge, Avatar, Tabs, Eyebrow, Tile, DataRow, Blank, Field, Chip, ChipsWithOther } from '../components/UI'
import Odontogram from '../components/Odontogram'
import { useClinic } from '../store/ClinicStore'
import { MEDICAL_FLAGS, ALLERGY_OPTIONS, condLabel, toothName } from '../data/catalog'
import { GENDERS, ISSUES } from '../data/config'
import { inr, prettyDate } from '../lib/format'
import {
  IconArrowLeft, IconAlert, IconPhone, IconQueue, IconCheck, IconEdit,
  IconTooth, IconReceipt, IconUsers,
} from '../lib/icons'

export default function PatientFile() {
  const { id } = useParams()
  const nav = useNavigate()
  const { patients, visits, dispatch, toast } = useClinic()
  const [tab, setTab] = useState('overview')
  const [edit, setEdit] = useState(false)
  const p = patients.find(x => x.id === id)
  const [f, setF] = useState(p || {})

  if (!p) {
    return <Blank icon={<IconUsers size={20} />} title="Patient not found"
      action={<button className="btn btn-primary btn-sm" onClick={() => nav('/patients')}>All patients</button>} />
  }

  const hist = visits.filter(v => v.patientId === p.id)
  const alerts = (p.medical || []).filter(m => m !== 'none')
  const billed = hist.reduce((s, v) => s + (v.invoice?.total || 0), 0)
  const paid = hist.reduce((s, v) => s + (v.payments || []).reduce((x, y) => x + Number(y.amount || 0), 0), 0)
  const active = hist.find(v => v.stage !== 'done')

  const save = () => {
    dispatch({ type: 'UPDATE_PATIENT', id: p.id, patch: f })
    setEdit(false); toast('Saved')
  }

  const checkIn = () => {
    dispatch({ type: 'CHECK_IN', patientId: p.id, data: { visitType: 'Walk-in', reason: p.issue || '' } })
    toast('Checked in'); nav('/checkin')
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 10 }} onClick={() => nav('/patients')}>
        <IconArrowLeft size={12} /> Patient Records
      </button>

      <Card style={{ marginBottom: 10 }}>
        <div className="row wrap" style={{ alignItems: 'flex-start' }}>
          <Avatar name={p.name} color="#197E65" size={42} />
          <div style={{ minWidth: 0 }}>
            <Eyebrow>Patient file</Eyebrow>
            <h1 style={{ fontSize: 19 }}>{p.name}</h1>
            <div className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
              {p.uhid}{p.age ? ` · ${p.age} yrs` : ''}{p.gender ? ` · ${p.gender}` : ''} · {p.phone}
            </div>
            <div className="chip-grid" style={{ marginTop: 6 }}>
              {alerts.map(k => {
                const m = MEDICAL_FLAGS.find(x => x.key === k)
                return <Badge key={k} tone="red"><IconAlert size={8} />{m?.label || k}</Badge>
              })}
              {(p.allergies || []).map(a => <Badge key={a} tone="red">No {a}</Badge>)}
              {p.issue && <Badge tone="blue">{p.issue}</Badge>}
            </div>
          </div>
          <div className="spacer" />
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEdit(!edit)}>
              <IconEdit size={12} /> {edit ? 'Cancel' : 'Edit'}
            </button>
            {active
              ? <Badge tone="green" dot>In clinic</Badge>
              : <button className="btn btn-primary btn-sm" onClick={checkIn}><IconQueue size={12} /> Check in</button>}
          </div>
        </div>
      </Card>

      <div className="stat-row">
        {[
          ['Visits', String(hist.length), `Since ${prettyDate(p.createdAt)}`],
          ['Total billed', billed ? inr(billed) : '₹0', `${inr(paid)} received`],
          ['Balance', p.balance > 0 ? inr(p.balance) : '₹0', p.balance > 0 ? 'Outstanding' : 'Settled'],
          ['Teeth charted', String(Object.keys(p.teeth || {}).length), 'On the permanent chart'],
        ].map(([label, value, foot], i) => (
          <div className={`stat ${i === 0 ? 'is-active' : ''}`} key={label}>
            <div className="stat-top"><span className="stat-label">{label}</span></div>
            <div className="stat-value">{value}</div>
            <div className="stat-foot">{foot}</div>
          </div>
        ))}
      </div>

      {edit && (
        <Card className="fade-up" title="Edit details" style={{ marginBottom: 10 }}>
          <div className="grid g-2">
            <Field label="Name"><input className="input" value={f.name || ''} onChange={e => setF(s => ({ ...s, name: e.target.value }))} /></Field>
            <Field label="Mobile"><input className="input" value={f.phone || ''} onChange={e => setF(s => ({ ...s, phone: e.target.value }))} /></Field>
            <Field label="Age"><input className="input" type="number" value={f.age || ''} onChange={e => setF(s => ({ ...s, age: e.target.value }))} /></Field>
            <Field label="Gender">
              <div className="chip-grid">
                {GENDERS.map(g => <Chip key={g} on={f.gender === g} onClick={() => setF(s => ({ ...s, gender: g }))}>{g}</Chip>)}
              </div>
            </Field>
            <Field label="Address" span={2}><input className="input" value={f.address || ''} onChange={e => setF(s => ({ ...s, address: e.target.value }))} /></Field>
            <Field label="Medical conditions" span={2} hint="Not listed? Use Other and type it.">
              <ChipsWithOther options={MEDICAL_FLAGS} exclusiveKey="none" value={f.medical || []}
                placeholder="e.g. Anaemia, recent surgery…"
                onChange={v => setF(s => ({ ...s, medical: v }))} />
            </Field>
            <Field label="Allergies" span={2} hint="Not listed? Use Other and type it.">
              <ChipsWithOther options={ALLERGY_OPTIONS} warn value={f.allergies || []}
                placeholder="e.g. Cephalosporins"
                onChange={v => setF(s => ({ ...s, allergies: v }))} />
            </Field>
          </div>
          <div className="divider" />
          <button className="btn btn-primary" onClick={save}><IconCheck size={13} /> Save changes</button>
        </Card>
      )}

      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'overview', label: 'Overview' },
        { key: 'chart', label: 'Dental chart' },
        { key: 'visits', label: 'Visit history', count: hist.length || null },
      ]} />

      {tab === 'overview' && (
        <div className="grid g-main fade-up">
          <Card title="Details">
            <div className="grid g-2" style={{ gap: 0 }}>
              {[
                ['Patient ID', p.uhid], ['Mobile', p.phone || '—'], ['Email', p.email || '—'],
                ['Gender', p.gender || '—'], ['Age', p.age || '—'], ['Address', p.address || '—'],
                ['Registered', prettyDate(p.createdAt)], ['Reported problem', p.issue || '—'],
              ].map(([k, v]) => (
                <div className="rcp-line" key={k} style={{ paddingRight: 12 }}>
                  <span className="lb" style={{ fontSize: 'var(--fs-sm)' }}>{k}</span>
                  <span className="vl" style={{ fontSize: 'var(--fs-sm)', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
            {p.note && (
              <>
                <div className="divider-x" />
                <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.55, color: 'var(--ink-2)' }}>{p.note}</div>
              </>
            )}
          </Card>

          <Card title="Medical alerts">
            {alerts.length === 0 && (p.allergies || []).length === 0
              ? <Badge tone="green"><IconCheck size={9} /> None recorded</Badge>
              : <>
                {alerts.map(k => {
                  const m = MEDICAL_FLAGS.find(x => x.key === k)
                  return (
                    <div className="row" key={k} style={{ alignItems: 'flex-start', padding: '4px 0' }}>
                      <IconAlert size={12} style={{ color: 'var(--a-rose)', marginTop: 2 }} />
                      <span style={{ fontSize: 'var(--fs-sm)' }}>
                        <b>{m?.label || k}</b>{m?.note ? ` — ${m.note}` : ''}
                      </span>
                    </div>
                  )
                })}
                {(p.allergies || []).map(a => (
                  <div className="row" key={a} style={{ alignItems: 'flex-start', padding: '4px 0' }}>
                    <IconAlert size={12} style={{ color: 'var(--a-rose)', marginTop: 2 }} />
                    <span style={{ fontSize: 'var(--fs-sm)' }}><b>Allergic to {a}</b></span>
                  </div>
                ))}
              </>}
          </Card>
        </div>
      )}

      {tab === 'chart' && (
        <div className="grid g-main fade-up">
          <Odontogram marks={p.teeth || {}} readOnly />
          <Card title="Findings on record">
            {Object.keys(p.teeth || {}).length === 0
              ? <Blank icon={<IconTooth size={18} />} title="Nothing charted yet">
                  Charting done during a consultation is saved here when the visit closes.
                </Blank>
              : <div style={{ margin: '0 -9px' }}>
                {Object.entries(p.teeth).map(([t, c]) => (
                  <DataRow key={t} lead={<Badge tone="dark">{t}</Badge>}
                    title={condLabel(c)} sub={toothName(Number(t))} />
                ))}
              </div>}
          </Card>
        </div>
      )}

      {tab === 'visits' && (
        <div className="fade-up">
          {hist.length === 0
            ? <Blank icon={<IconReceipt size={20} />} title="No visits yet"
                action={<button className="btn btn-primary btn-sm" onClick={checkIn}>Check in now</button>}>
                Once you check this patient in, every visit is listed here.
              </Blank>
            : <div className="panel">
              <div className="panel-body" style={{ paddingTop: 12 }}>
                <table className="tbl">
                  <thead><tr><th>Date</th><th>Reason</th><th>Procedures</th><th>Invoice</th>
                    <th style={{ textAlign: 'right' }}>Billed</th><th style={{ textAlign: 'right' }}>Paid</th><th>Stage</th></tr></thead>
                  <tbody>
                    {hist.map(v => {
                      const vPaid = (v.payments || []).reduce((s, x) => s + Number(x.amount || 0), 0)
                      return (
                        <tr key={v.id} style={{ cursor: 'pointer' }}
                          onClick={() => { dispatch({ type: 'SET_ACTIVE_VISIT', id: v.id }); nav('/' + v.stage) }}>
                          <td className="cell-strong">{prettyDate(v.date)}</td>
                          <td>{v.reason || v.visitType}</td>
                          <td className="mono-num">{(v.plan || []).filter(x => x.status === 'done').length}</td>
                          <td className="mono-num faint">{v.invoice?.no || '—'}</td>
                          <td className="mono-num" style={{ textAlign: 'right' }}>{inr(v.invoice?.total || 0)}</td>
                          <td className="cell-strong mono-num" style={{ textAlign: 'right' }}>{inr(vPaid)}</td>
                          <td><Badge tone={v.stage === 'done' ? '' : 'green'} dot={v.stage !== 'done'}>{v.stage}</Badge></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>}
        </div>
      )}
    </>
  )
}
