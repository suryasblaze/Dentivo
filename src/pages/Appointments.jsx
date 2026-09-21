import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Badge, Avatar, Eyebrow, Blank, Modal, Field, Chip, Tile, DataRow, Seg, ChipsWithOther,
} from '../components/UI'
import { useClinic } from '../store/ClinicStore'
import { ISSUES } from '../data/config'
import { prettyDate, localISO, nowHM } from '../lib/format'

/* A slot is in the past if its day has gone, or it is today and the time has gone. */
const isPast = (date, time) => {
  const today = localISO()
  if (date < today) return true
  return date === today && !!time && time <= nowHM()
}
import { openWhatsApp, apptMessage } from '../lib/links'
import {
  IconPlus, IconCalendar, IconCheck, IconX, IconQueue, IconUsers, IconWhatsApp,
  IconChevronRight, IconArrowLeft, IconClock, IconChair, IconSettings, IconAlert,
} from '../lib/icons'

const iso = (d) => {
  const t = new Date(d)
  t.setMinutes(t.getMinutes() - t.getTimezoneOffset())
  return t.toISOString().slice(0, 10)
}
const addDays = (d, n) => { const t = new Date(d); t.setDate(t.getDate() + n); return t }
const startOfWeek = (d) => { const t = new Date(d); t.setDate(t.getDate() - t.getDay()); return t }
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS = {
  scheduled: { label: 'Scheduled', tone: 'blue' },
  arrived: { label: 'Arrived', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' },
  'no-show': { label: 'No show', tone: 'amber' },
}

/* builds the time column from the clinic's own working hours */
const buildSlots = (startH, endH, mins) => {
  const out = []
  for (let m = startH * 60; m < endH * 60; m += mins) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return out
}

export default function Appointments() {
  const { patients, appointments, staff, chairs, clinic, dispatch, toast } = useClinic()
  const nav = useNavigate()
  const today = iso(new Date())

  const [view, setView] = useState('day')
  const [cursor, setCursor] = useState(new Date())
  const [book, setBook] = useState(null)      // prefilled {date,time,chairId} or {}
  const [openAppt, setOpenAppt] = useState(null)
  const [cfg, setCfg] = useState(false)

  const startH = Number(clinic.dayStart ?? 9)
  const endH = Number(clinic.dayEnd ?? 20)
  const slotMins = Number(clinic.slotMins ?? 30)
  const slots = useMemo(() => buildSlots(startH, endH, slotMins), [startH, endH, slotMins])

  const pt = (id) => patients.find(p => p.id === id)
  const doctors = staff.filter(s => ['Owner', 'Dentist'].includes(s.role))
  const seats = chairs.length ? chairs : [{ id: 'c1', name: 'Chair 1', label: '' }]
  const on = (d) => appointments.filter(a => a.date === d)

  /* ---------- actions ---------- */
  const save = (f) => {
    if (f.id) dispatch({ type: 'UPDATE_APPOINTMENT', id: f.id, patch: f })
    else dispatch({ type: 'ADD_APPOINTMENT', data: f })
    toast(f.id ? 'Appointment updated' : 'Appointment booked')
    setBook(null)
  }

  const arrive = (a) => {
    dispatch({
      type: 'CHECK_IN', patientId: a.patientId, appointmentId: a.id,
      data: { visitType: 'Scheduled appointment', reason: a.reason, doctorId: a.doctorId, chairId: a.chairId },
    })
    toast(`${pt(a.patientId)?.name} checked in`)
    setOpenAppt(null)
    nav('/checkin')
  }

  const wa = (kind, a) => {
    const p = pt(a.patientId)
    const doc = staff.find(s => s.id === a.doctorId)?.name
    const ok = openWhatsApp(p?.phone, apptMessage(kind, { clinic, patient: p, appt: a, doctor: doc }))
    toast(ok ? 'WhatsApp opened' : 'No mobile number saved for this patient')
  }

  const setStatus = (a, status) => {
    dispatch({ type: 'UPDATE_APPOINTMENT', id: a.id, patch: { status } })
    toast(STATUS[status]?.label || status)
    setOpenAppt(null)
  }

  /* ---------- header label ---------- */
  const title = view === 'month'
    ? cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : view === 'week'
      ? `${prettyDate(iso(startOfWeek(cursor)))} – ${prettyDate(iso(addDays(startOfWeek(cursor), 6)))}`
      : prettyDate(iso(cursor))

  const step = (n) => setCursor(c => addDays(c, view === 'month' ? 0 : view === 'week' ? 7 * n : n)
    || c)
  const shift = (n) => {
    if (view === 'month') {
      const t = new Date(cursor); t.setMonth(t.getMonth() + n); setCursor(t)
    } else setCursor(addDays(cursor, view === 'week' ? 7 * n : n))
  }

  if (!patients.length) {
    return (
      <>
        <div className="page-head">
          <div>
            <Eyebrow>Step 4 · schedule</Eyebrow>
            <h1>Appointments</h1>
            <p>Month, week and day views. Walk-ins do not need a booking.</p>
          </div>
        </div>
        <Blank icon={<IconUsers size={20} />} title="Add a patient first"
          action={<button className="btn btn-primary btn-sm" onClick={() => nav('/patients')}>Patient records</button>}>
          Appointments are booked against a patient record, so create one before scheduling.
        </Blank>
      </>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Eyebrow>Step 4 · schedule</Eyebrow>
          <h1>Appointments</h1>
          <p>Walk-ins do not need a booking — send them straight to Check-In.</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setCfg(true)}>
            <IconSettings size={12} /> Hours
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setBook({ date: iso(cursor), time: slots[0] })}>
            <IconPlus size={12} /> Book
          </button>
        </div>
      </div>

      {/* ---------- toolbar ---------- */}
      <div className="cal-toolbar">
        <div className="cal-nav">
          <button onClick={() => shift(-1)}><IconArrowLeft size={13} /></button>
          <button onClick={() => shift(1)}><IconChevronRight size={13} /></button>
        </div>
        <span className="cal-title">{title}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date())}>Today</button>
        <div className="spacer" />
        <Seg value={view} onChange={setView} options={[
          { value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }, { value: 'day', label: 'Day' },
        ]} />
      </div>

      {/* ================= MONTH ================= */}
      {view === 'month' && (() => {
        const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
        const gridStart = startOfWeek(first)
        const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
        return (
          <Card className="card-pad0" style={{ padding: 12 }}>
            <div className="cal-dow">{DOW.map(d => <span key={d}>{d}</span>)}</div>
            <div className="cal-grid">
              {cells.map((d, i) => {
                const key = iso(d)
                const list = on(key)
                const dim = d.getMonth() !== cursor.getMonth()
                return (
                  <button key={i} className={`cal-cell ${dim ? 'dim' : ''} ${key === today ? 'today' : ''}`}
                    onClick={() => { setCursor(d); setView('day') }}>
                    <span className="cal-daynum">{d.getDate()}</span>
                    {list.slice(0, 3).map(a => (
                      <span key={a.id} className={`cal-ev ${a.status}`}>
                        {a.time} {pt(a.patientId)?.name?.split(' ')[0] || ''}
                      </span>
                    ))}
                    {list.length > 3 && <span className="cal-more">+{list.length - 3} more</span>}
                  </button>
                )
              })}
            </div>
          </Card>
        )
      })()}

      {/* ================= WEEK ================= */}
      {view === 'week' && (() => {
        const ws = startOfWeek(cursor)
        const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i))
        return (
          <Card style={{ padding: 12, overflowX: 'auto' }}>
            <div className="cal-week" style={{ minWidth: 640 }}>
              <div />
              {days.map(d => (
                <div key={iso(d)} className={`cal-week-head ${iso(d) === today ? 'today' : ''}`}>
                  {DOW[d.getDay()]} {d.getDate()}
                </div>
              ))}
              {slots.map(t => (
                <React.Fragment key={t}>
                  <div className="cal-time">{t}</div>
                  {days.map(d => {
                    const key = iso(d)
                    const list = on(key).filter(a => a.time === t)
                    return (
                      <button key={key + t}
                        className={`cal-slot ${list.length ? 'has' : ''} ${!list.length && isPast(key, t) ? 'past' : ''}`}
                        disabled={!list.length && isPast(key, t)}
                        onClick={() => list.length
                          ? setOpenAppt(list[0])
                          : setBook({ date: key, time: t })}>
                        {list.map(a => (
                          <span key={a.id} className={`cal-ev ${a.status}`} style={{ display: 'block' }}>
                            {pt(a.patientId)?.name?.split(' ')[0]}
                          </span>
                        ))}
                      </button>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </Card>
        )
      })()}

      {/* ================= DAY — chairs as seats ================= */}
      {view === 'day' && (
        <Card style={{ padding: 12, overflowX: 'auto' }}>
          <div className="day-grid"
            style={{ gridTemplateColumns: `54px repeat(${seats.length}, minmax(130px, 1fr))`, minWidth: 130 * seats.length + 60 }}>
            <div />
            {seats.map(c => (
              <div key={c.id} className="day-chair-head">
                {c.name}{c.label && <small>{c.label}</small>}
              </div>
            ))}

            {slots.map(t => (
              <React.Fragment key={t}>
                <div className="cal-time" style={{ paddingTop: 12 }}>{t}</div>
                {seats.map(c => {
                  const a = on(iso(cursor)).find(x => x.time === t && (x.chairId || seats[0].id) === c.id)
                  if (!a) {
                    return (
                      isPast(iso(cursor), t)
                        ? <div key={c.id + t} className="seat past" title="This time has passed" />
                        : <button key={c.id + t} className="seat free"
                            onClick={() => setBook({ date: iso(cursor), time: t, chairId: c.id })} />
                    )
                  }
                  const p = pt(a.patientId)
                  const doc = staff.find(s => s.id === a.doctorId)
                  const alerts = (p?.medical || []).length + (p?.allergies || []).length
                  return (
                    <button key={c.id + t} className={`seat taken ${a.status}`} onClick={() => setOpenAppt(a)}>
                      <span className="seat-nm">
                        {p?.name || 'Unknown'}
                        {alerts > 0 && <IconAlert size={9} style={{ color: 'var(--a-rose)', marginLeft: 4 }} />}
                      </span>
                      <span className="seat-sub">
                        {a.mins} min · {a.reason || 'Consultation'}{doc ? ` · ${doc.short}` : ''}
                      </span>
                    </button>
                  )
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="cal-legend">
            <span><i className="swatch" style={{ background: 'var(--g-600)' }} />Scheduled</span>
            <span><i className="swatch" style={{ background: 'var(--a-blue)' }} />Arrived</span>
            <span><i className="swatch" style={{ background: 'var(--faint)' }} />Cancelled</span>
            <span><IconChair size={11} /> {seats.length} chair{seats.length > 1 ? 's' : ''} · {slotMins} min slots · {startH}:00–{endH}:00</span>
          </div>
        </Card>
      )}

      {/* ---------- day summary under the calendar ---------- */}
      {view !== 'month' && (
        <div className="grid g-4" style={{ marginTop: 10 }}>
          {[
            ['blue', IconCalendar, 'Scheduled', on(iso(cursor)).filter(a => a.status === 'scheduled').length],
            ['green', IconCheck, 'Arrived', on(iso(cursor)).filter(a => a.status === 'arrived').length],
            ['amber', IconClock, 'No show', on(iso(cursor)).filter(a => a.status === 'no-show').length],
            ['rose', IconX, 'Cancelled', on(iso(cursor)).filter(a => a.status === 'cancelled').length],
          ].map(([tone, Icon, t, v]) => (
            <Card key={t} style={{ padding: 10 }}>
              <div className="row">
                <Tile tone={tone}><Icon size={12} /></Tile>
                <div>
                  <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>{v}</div>
                  <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{t}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ================= Book / edit ================= */}
      {book && (
        <BookModal init={book} patients={patients} doctors={doctors} seats={seats} slots={slots}
          appointments={appointments} onClose={() => setBook(null)} onSave={save} />
      )}

      {/* ================= Appointment detail ================= */}
      {openAppt && (() => {
        const a = openAppt
        const p = pt(a.patientId)
        const doc = staff.find(s => s.id === a.doctorId)
        const st = STATUS[a.status] || STATUS.scheduled
        return (
          <Modal title={p?.name || 'Appointment'} sub={`${prettyDate(a.date)} at ${a.time}`}
            onClose={() => setOpenAppt(null)}
            footer={<>
              <button className="btn btn-ghost" onClick={() => { setBook(a); setOpenAppt(null) }}>Edit</button>
              <div className="spacer" />
              {a.status === 'scheduled' && (
                <button className="btn btn-primary" onClick={() => arrive(a)}>
                  <IconQueue size={13} /> Patient arrived
                </button>
              )}
            </>}>
            <div style={{ margin: '0 -9px 12px' }}>
              <DataRow lead={<Avatar name={p?.name} color="#197E65" size={28} />}
                title={p?.name} sub={p?.phone || 'No number'} trail={<Badge tone={st.tone} dot>{st.label}</Badge>} />
              <DataRow lead={<Tile tone="blue"><IconClock size={12} /></Tile>}
                title={`${a.time} · ${a.mins} min`} sub={prettyDate(a.date)} />
              <DataRow lead={<Tile tone="violet"><IconChair size={12} /></Tile>}
                title={seats.find(c => c.id === a.chairId)?.name || 'No chair set'}
                sub={doc ? doc.name : 'No doctor set'} />
              <DataRow lead={<Tile tone="amber"><IconCalendar size={12} /></Tile>}
                title={a.reason || 'Consultation'} sub="Reason" />
            </div>

            <div className="field" style={{ marginBottom: 7 }}><label>Send on WhatsApp</label></div>
            <div className="chip-grid">
              {[['confirm', 'Confirmation'], ['remind', 'Reminder'],
                ['reschedule', 'Ask to reschedule'], ['cancel', 'Cancellation']].map(([k, l]) => (
                <button key={k} className="chip" onClick={() => wa(k, a)}>
                  <IconWhatsApp size={11} color="currentColor" />{l}
                </button>
              ))}
            </div>

            <div className="divider" />
            <div className="field" style={{ marginBottom: 7 }}><label>Mark as</label></div>
            <div className="chip-grid">
              {Object.entries(STATUS).map(([k, v]) => (
                <Chip key={k} on={a.status === k} onClick={() => setStatus(a, k)}>{v.label}</Chip>
              ))}
              <button className="chip" style={{ color: 'var(--a-rose)' }}
                onClick={() => { dispatch({ type: 'DELETE_APPOINTMENT', id: a.id }); setOpenAppt(null); toast('Deleted') }}>
                <IconX size={11} /> Delete
              </button>
            </div>
          </Modal>
        )
      })()}

      {/* ================= Working hours ================= */}
      {cfg && (
        <Modal title="Working hours & slots" sub="Shapes the week and day grids"
          onClose={() => setCfg(false)}
          footer={<button className="btn btn-primary" onClick={() => { setCfg(false); toast('Saved') }}>Done</button>}>
          <div className="grid g-3">
            <Field label="Day starts">
              <select className="select" value={startH}
                onChange={e => dispatch({ type: 'SET_CLINIC', patch: { dayStart: Number(e.target.value) } })}>
                {Array.from({ length: 13 }, (_, i) => i + 6).map(h => <option key={h} value={h}>{h}:00</option>)}
              </select>
            </Field>
            <Field label="Day ends">
              <select className="select" value={endH}
                onChange={e => dispatch({ type: 'SET_CLINIC', patch: { dayEnd: Number(e.target.value) } })}>
                {Array.from({ length: 13 }, (_, i) => i + 12).map(h => <option key={h} value={h}>{h}:00</option>)}
              </select>
            </Field>
            <Field label="Slot length">
              <select className="select" value={slotMins}
                onChange={e => dispatch({ type: 'SET_CLINIC', patch: { slotMins: Number(e.target.value) } })}>
                {[10, 15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
            </Field>
          </div>
          <div className="divider" />
          <div className="row">
            <IconChair size={14} style={{ color: 'var(--muted)' }} />
            <span style={{ fontSize: 'var(--fs-sm)' }}>
              {seats.length} chair{seats.length > 1 ? 's' : ''} shown as columns in the day view.
            </span>
            <div className="spacer" />
            <button className="btn btn-ghost btn-sm" onClick={() => { setCfg(false); nav('/settings') }}>
              Manage chairs
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

/* ========================================================================= */
function BookModal({ init, patients, doctors, seats, slots, appointments, onClose, onSave }) {
  const today = localISO()
  const firstFree = (date) => slots.find(t => !isPast(date, t)) || slots[slots.length - 1]

  /* never open the form on a time that has already gone */
  const startDate = init.date < today ? today : init.date
  const startTime = init.time && !isPast(startDate, init.time) ? init.time : firstFree(startDate)

  const [f, setF] = useState({
    id: init.id, patientId: init.patientId || '', date: startDate, time: startTime,
    mins: init.mins || 30, doctorId: init.doctorId || '', chairId: init.chairId || seats[0]?.id || '',
    reason: init.reason || '', status: init.status || 'scheduled',
  })
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))
  const taken = (t) => appointments.some(a =>
    a.id !== f.id && a.date === f.date && a.time === t && a.chairId === f.chairId && a.status === 'scheduled')
  const blocked = (t) => taken(t) || isPast(f.date, t)

  const changeDate = (d) => {
    const date = d < today ? today : d
    setF(s => ({ ...s, date, time: isPast(date, s.time) ? firstFree(date) : s.time }))
  }
  const valid = f.patientId && !blocked(f.time)

  return (
    <Modal title={f.id ? 'Edit appointment' : 'Book an appointment'} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <div className="spacer" />
        <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(f)}>
          <IconCheck size={13} /> {f.id ? 'Save' : 'Book'}
        </button>
      </>}>
      <div className="grid g-2">
        <Field label="Patient" span={2}>
          <select className="select" value={f.patientId} onChange={e => set('patientId', e.target.value)}>
            <option value="">Select a patient…</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name} — {p.phone}</option>)}
          </select>
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={f.date} min={today} onChange={e => changeDate(e.target.value)} />
        </Field>
        <Field label="Duration">
          <select className="select" value={f.mins} onChange={e => set('mins', Number(e.target.value))}>
            {[10, 15, 20, 30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </Field>

        {seats.length > 1 && (
          <Field label="Chair" span={2}>
            <div className="chip-grid">
              {seats.map(c => <Chip key={c.id} on={f.chairId === c.id} onClick={() => set('chairId', c.id)}>{c.name}</Chip>)}
            </div>
          </Field>
        )}

        <Field label="Time" span={2}
          hint={f.date === today ? 'Times already gone today, and slots taken on this chair, are greyed out' : 'Greyed slots are already taken on this chair'}>
          <div className="chip-grid">
            {slots.map(t => (
              <button key={t} className={`chip ${f.time === t ? 'on' : ''}`} disabled={blocked(t)}
                title={isPast(f.date, t) ? 'This time has passed' : taken(t) ? 'Already booked' : ''}
                style={blocked(t) ? { opacity: .3, cursor: 'not-allowed', textDecoration: isPast(f.date, t) ? 'line-through' : 'none' } : undefined}
                onClick={() => !blocked(t) && set('time', t)}>{t}</button>
            ))}
          </div>
          {slots.every(t => blocked(t)) && (
            <div className="badge amber" style={{ marginTop: 6 }}>No free slots left on this day — pick another date</div>
          )}
        </Field>

        {doctors.length > 0 && (
          <Field label="Doctor" span={2}>
            <div className="chip-grid">
              {doctors.map(d => (
                <Chip key={d.id} on={f.doctorId === d.id}
                  onClick={() => set('doctorId', f.doctorId === d.id ? '' : d.id)}>{d.name}</Chip>
              ))}
            </div>
          </Field>
        )}

        <Field label="Reason" span={2} hint="Use Other for anything not listed">
          <ChipsWithOther options={ISSUES} value={f.reason ? [f.reason] : []}
            placeholder="e.g. Crown trial, suture removal"
            onChange={v => set('reason', v.slice(-1)[0] || '')} />
        </Field>
      </div>
    </Modal>
  )
}
