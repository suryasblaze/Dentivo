import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Blank, Card, Avatar, DataRow, Badge } from '../../components/UI'
import { useClinic } from '../../store/ClinicStore'
import { IconQueue, IconArrowRight } from '../../lib/icons'

/* Shown on any stage page when no visit is active.
   Offers the open visits so the user can pick one instead of hitting a dead end. */
export default function NoVisit({ stage }) {
  const { visits, patients, dispatch } = useClinic()
  const nav = useNavigate()
  const open = visits.filter(v => v.stage !== 'done')
  const past = visits.filter(v => v.stage === 'done').slice(0, 6)

  return (
    <>
      <Blank icon={<IconQueue size={20} />} title="No patient in the chair"
        action={<button className="btn btn-primary btn-sm" onClick={() => nav('/checkin')}>
          Go to Check-In
        </button>}>
        {stage} works on the patient currently being seen. Check someone in, or pick an open
        visit below.
      </Blank>

      {open.length > 0 && (
        <Card title="Open visits" style={{ marginTop: 10 }}>
          <div style={{ margin: '0 -9px' }}>
            {open.map(v => {
              const p = patients.find(x => x.id === v.patientId)
              return (
                <DataRow key={v.id}
                  onClick={() => { dispatch({ type: 'SET_ACTIVE_VISIT', id: v.id }); nav('/' + v.stage) }}
                  lead={<Avatar name={p?.name} color="#197E65" size={26} />}
                  title={p?.name} sub={`${v.token} · arrived ${v.arrivedAt}`}
                  trail={<><Badge tone="green" dot>{v.stage}</Badge>
                    <IconArrowRight size={12} style={{ color: 'var(--faint)' }} /></>} />
              )
            })}
          </div>
        </Card>
      )}

      {past.length > 0 && (
        <Card title="Finished visits" sub="Nothing is deleted — reopen one to review it"
          style={{ marginTop: 10 }}>
          <div style={{ margin: '0 -9px' }}>
            {past.map(v => {
              const p = patients.find(x => x.id === v.patientId)
              return (
                <DataRow key={v.id}
                  onClick={() => { dispatch({ type: 'SET_ACTIVE_VISIT', id: v.id }); nav('/done') }}
                  lead={<Avatar name={p?.name} color="#197E65" size={26} />}
                  title={p?.name} sub={`${v.date} · ${v.token}`}
                  trail={<><Badge>{v.rating ? `${v.rating}★` : 'closed'}</Badge>
                    <IconArrowRight size={12} style={{ color: 'var(--faint)' }} /></>} />
              )
            })}
          </div>
        </Card>
      )}
    </>
  )
}
