import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Avatar, Eyebrow, Blank, Field, Chip, Tile, DataRow, Seg, ChipsWithOther } from '../components/UI'
import { VisitStrip } from '../components/Layout'
import { useClinic } from '../store/ClinicStore'
import { VISIT_TYPES, stagePath } from '../data/config'
import { MEDICAL_FLAGS } from '../data/catalog'
import { prettyDate, localISO, nowHM } from '../lib/format'
import { IconQueue, IconCheck, IconAlert, IconArrowRight, IconCalendar, IconUsers, IconPlus } from '../lib/icons'

export default function CheckIn() {
  const { patients, appointments, visits, staff, chairs, visit, dispatch, toast } = useClinic()
  const nav = useNavigate()
  const todayISO = localISO()
  const [mode, setMode] = useState('scheduled')
  const [pick, setPick] = useState('')
  const [visitType, setVisitType] = useState('Walk-in')
  const [doctorId, setDoctorId] = useState('')
  const [chairId, setChairId] = useState('')
  const [reason, setReason] = useState('')

  const pt = (id) => patients.find(p => p.id === id)
  const doctors = staff.filter(s => ['Owner', 'Dentist'].includes(s.role))
  const dueToday = appointments
    .filter(a => a.date === todayISO && a.status === 'scheduled')
    .sort((a, b) => a.time.localeCompare(b.time))
  const inClinic = visits.filter(v => v.stage !== 'done')
  const openVisitOf = (patientId) => inClinic.find(v => v.patientId === patientId)
  const late = (a) => a.time < nowHM()

  const checkInWalkIn = () => {
    const p = pt(pick)
    if (openVisitOf(pick)) {
      toast(`${p?.name} is already in the clinic`)
      return
    }
    dispatch({
      type: 'CHECK_IN', patientId: pick,
      data: { visitType, doctorId: doctorId || null, chairId: chairId || null, reason: reason || p?.issue || '' },
    })
    toast(`${p?.name} checked in`)
    setPick(''); setReason('')
  }

  const arrive = (a) => {
    const already = openVisitOf(a.patientId)
    dispatch({
      type: 'CHECK_IN', patientId: a.patientId, appointmentId: a.id,
      data: { visitType: 'Scheduled appointment', reason: a.reason, doctorId: a.doctorId, chairId },
    })
    toast(already ? `${pt(a.patientId)?.name} was already in — linked to that visit` : `${pt(a.patientId)?.name} checked in`)
  }

  const noShow = (a) => {
    dispatch({ type: 'UPDATE_APPOINTMENT', id: a.id, patch: { status: 'no-show' } })
    toast(`${pt(a.patientId)?.name} marked as no-show`)
  }

  return (
    <>
      <VisitStrip />

      <div className="page-head">
        <div>
          <Eyebrow>Step 5 · reception</Eyebrow>
          <h1>Check-In</h1>
          <p>Scheduled arrivals and direct walk-ins both start the visit here</p>
        </div>
        <div className="page-head-actions">
          <Seg value={mode} onChange={setMode} options={[
            { value: 'scheduled', label: `Scheduled${dueToday.length ? ` (${dueToday.length})` : ''}` },
            { value: 'walkin', label: 'Walk-in' },
          ]} />
        </div>
      </div>

      {patients.length === 0 ? (
        <Blank icon={<IconUsers size={20} />} title="No patients to check in"
          action={<div className="row" style={{ gap: 7, justifyContent: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={() => nav('/patients')}><IconPlus size={12} /> Add patient</button>
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/submissions')}>From submissions</button>
          </div>}>
          Create a patient record first, then check them in.
        </Blank>
      ) : (
        <div className="grid g-main">
          <div className="col" style={{ gap: 10 }}>
            {/* ---------- Scheduled ---------- */}
            {mode === 'scheduled' && (
              <Card title="Booked for today" sub={`${dueToday.length} waiting to arrive`}>
                {dueToday.length === 0 ? (
                  <Blank icon={<IconCalendar size={20} />} title="Nothing scheduled today"
                    action={<div className="row" style={{ gap: 7, justifyContent: 'center' }}>
                      <button className="btn btn-soft btn-sm" onClick={() => nav('/appointments')}>Book a slot</button>
                      <button className="btn btn-primary btn-sm" onClick={() => setMode('walkin')}>Check in a walk-in</button>
                    </div>}>
                    Patients without an appointment can still be checked in — use the Walk-in tab.
                  </Blank>
                ) : (
                  <div style={{ margin: '0 -9px' }}>
                    {dueToday.map(a => {
                      const p = pt(a.patientId)
                      const alerts = (p?.medical || []).length + (p?.allergies || []).length
                      return (
                        <DataRow key={a.id}
                          lead={<Avatar name={p?.name} color="#197E65" size={28} />}
                          title={
                            <span className="row" style={{ gap: 5 }}>
                              {p?.name}
                              {alerts > 0 && <IconAlert size={10} style={{ color: 'var(--a-rose)' }} />}
                            </span>
                          }
                          sub={`${a.time} · ${a.reason || 'Consultation'}`}
                          trail={
                            <div className="row" style={{ gap: 5 }}>
                              {late(a) && <Badge tone="amber">Late · was {a.time}</Badge>}
                              {late(a) && (
                                <button className="btn btn-ghost btn-sm" onClick={() => noShow(a)}>No-show</button>
                              )}
                              <button className="btn btn-primary btn-sm" onClick={() => arrive(a)}>
                                <IconCheck size={11} /> Check in
                              </button>
                            </div>
                          } />
                      )
                    })}
                  </div>
                )}
              </Card>
            )}

            {/* ---------- Walk-in ---------- */}
            {mode === 'walkin' && (
              <Card title="Direct walk-in" sub="No appointment needed">
                <Field label="Which patient?">
                  <select className="select" value={pick} onChange={e => setPick(e.target.value)}>
                    <option value="">Select a patient…</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id} disabled={!!openVisitOf(p.id)}>
                        {p.name} — {p.phone}{openVisitOf(p.id) ? '  (already in clinic)' : ''}
                      </option>
                    ))}
                  </select>
                </Field>

                {pick && (() => {
                  const p = pt(pick)
                  const alerts = (p.medical || []).filter(m => m !== 'none')
                  return (
                    <div className="fade-up">
                      {(alerts.length > 0 || (p.allergies || []).length > 0) && (
                        <div className="lrow" style={{
                          marginTop: 12, alignItems: 'flex-start',
                          background: 'var(--a-rose-bg)', borderColor: 'rgba(201,63,74,.2)',
                        }}>
                          <IconAlert size={14} style={{ color: 'var(--a-rose)', marginTop: 1 }} />
                          <div>
                            <div className="strong" style={{ fontSize: 'var(--fs-base)', color: 'var(--a-rose)' }}>
                              Read before seating
                            </div>
                            {alerts.map(k => {
                              const m = MEDICAL_FLAGS.find(x => x.key === k)
                              return <div key={k} style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
                                <b>{m?.label || k}</b>{m?.note ? ` — ${m.note}` : ''}
                              </div>
                            })}
                            {(p.allergies || []).map(a => (
                              <div key={a} style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
                                <b>Allergic to {a}</b>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ height: 14 }} />
                      <Field label="Visit type" hint="Use Other for anything not listed">
                        <ChipsWithOther options={VISIT_TYPES} value={visitType ? [visitType] : []}
                          placeholder="e.g. Second opinion, insurance check-up"
                          onChange={v => setVisitType(v.slice(-1)[0] || '')} />
                      </Field>

                      {doctors.length > 0 && (
                        <>
                          <div style={{ height: 14 }} />
                          <Field label="Doctor (optional)">
                            <div className="chip-grid">
                              {doctors.map(d => (
                                <Chip key={d.id} on={doctorId === d.id} onClick={() => setDoctorId(doctorId === d.id ? '' : d.id)}>
                                  {d.name}
                                </Chip>
                              ))}
                            </div>
                          </Field>
                        </>
                      )}

                      {chairs.length > 0 && (
                        <>
                          <div style={{ height: 14 }} />
                          <Field label="Chair (optional)">
                            <div className="chip-grid">
                              {chairs.map(c => (
                                <Chip key={c.id} on={chairId === c.id} onClick={() => setChairId(chairId === c.id ? '' : c.id)}>
                                  {c.name}
                                </Chip>
                              ))}
                            </div>
                          </Field>
                        </>
                      )}

                      <div style={{ height: 14 }} />
                      <Field label="Reason">
                        <input className="input" value={reason} placeholder={p.issue || 'Why are they here today?'}
                          onChange={e => setReason(e.target.value)} />
                      </Field>

                      <div className="divider" />
                      <button className="btn btn-primary btn-lg btn-block" onClick={checkInWalkIn}>
                        <IconCheck size={15} /> Check in & issue token
                      </button>
                    </div>
                  )
                })()}
              </Card>
            )}
          </div>

          {/* ---------- In clinic now ---------- */}
          <Card title="In clinic now" sub={`${inClinic.length} active`}>
            {inClinic.length === 0
              ? <Blank icon={<IconQueue size={18} />} title="Nobody checked in">
                  Once you check someone in they appear here with their token.
                </Blank>
              : <div style={{ margin: '0 -9px' }}>
                {inClinic.map(v => {
                  const p = pt(v.patientId)
                  const isActive = visit?.id === v.id
                  return (
                    <DataRow key={v.id} on={isActive}
                      onClick={() => { dispatch({ type: 'SET_ACTIVE_VISIT', id: v.id }); nav(stagePath(v.stage)) }}
                      lead={<Avatar name={p?.name} color="#197E65" size={26} />}
                      title={p?.name}
                      sub={`${v.token} · arrived ${v.arrivedAt} · ${v.visitType}`}
                      trail={
                        <div className="row" style={{ gap: 5 }}>
                          <Badge tone="green" dot>{v.stage}</Badge>
                          <IconArrowRight size={12} style={{ color: 'var(--faint)' }} />
                        </div>
                      } />
                  )
                })}
              </div>}
          </Card>
        </div>
      )}
    </>
  )
}
