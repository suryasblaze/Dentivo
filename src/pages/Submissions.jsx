import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Tile, DataRow, Eyebrow, Blank, Modal, Field, Chip, Seg, Avatar, ChipsWithOther } from '../components/UI'
import { useClinic } from '../store/ClinicStore'
import { GENDERS } from '../data/config'
import { MEDICAL_FLAGS, ALLERGY_OPTIONS } from '../data/catalog'
import { prettyDate } from '../lib/format'
import { IconFile, IconCheck, IconX, IconQr, IconArrowRight, IconAlert, IconPhone } from '../lib/icons'

export default function Submissions() {
  const { submissions, dispatch, toast } = useClinic()
  const nav = useNavigate()
  const [filter, setFilter] = useState('new')
  const [convert, setConvert] = useState(null)
  const [extra, setExtra] = useState({ age: '', medical: [], allergies: [], address: '', email: '' })

  const shown = submissions.filter(s => filter === 'all' || s.status === filter)
  const counts = {
    new: submissions.filter(s => s.status === 'new').length,
    converted: submissions.filter(s => s.status === 'converted').length,
  }

  const open = (s) => {
    setConvert(s)
    setExtra({ age: '', medical: [], allergies: [], address: '', email: '' })
  }

  const create = () => {
    dispatch({
      type: 'ADD_PATIENT',
      fromSubmission: convert.id,
      data: {
        name: convert.name, phone: convert.phone, gender: convert.gender,
        issue: convert.issue, note: convert.note,
        age: extra.age, medical: extra.medical.filter(m => m !== 'none'),
        allergies: extra.allergies, address: extra.address, email: extra.email,
      },
    })
    toast(`${convert.name} added to patient records`)
    setConvert(null)
    nav('/patients')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Eyebrow>Step 2 · from the intake link</Eyebrow>
          <h1>Submissions</h1>
          <p>What patients typed on their own phone. Turn each one into a patient record.</p>
        </div>
        <div className="page-head-actions">
          <Seg value={filter} onChange={setFilter} options={[
            { value: 'new', label: `New${counts.new ? ` (${counts.new})` : ''}` },
            { value: 'converted', label: 'Converted' },
            { value: 'all', label: 'All' },
          ]} />
          <button className="btn btn-ghost btn-sm" onClick={() => nav('/link')}><IconQr size={12} /> Show QR</button>
        </div>
      </div>

      {shown.length === 0 ? (
        <Blank icon={<IconFile size={20} />}
          title={filter === 'new' ? 'No new submissions' : 'Nothing here'}
          action={<button className="btn btn-primary btn-sm" onClick={() => nav('/link')}>
            <IconQr size={12} /> Open the QR page
          </button>}>
          Share the intake link with a patient. Whatever they submit appears here within seconds.
        </Blank>
      ) : (
        <div className="grid g-3">
          {shown.map(s => (
            <Card key={s.id}>
              <div className="row" style={{ marginBottom: 10 }}>
                <Avatar name={s.name} color={s.status === 'converted' ? '#4E5765' : '#197E65'} size={32} />
                <div style={{ minWidth: 0 }}>
                  <div className="strong" style={{ fontSize: 'var(--fs-md)' }}>{s.name}</div>
                  <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>
                    {prettyDate(s.date)} at {s.time}
                  </div>
                </div>
                <div className="spacer" />
                {s.status === 'new' && <Badge tone="green" dot>New</Badge>}
                {s.status === 'converted' && <Badge><IconCheck size={8} />Converted</Badge>}
                {s.status === 'dismissed' && <Badge tone="red">Dismissed</Badge>}
              </div>

              <div style={{ margin: '0 -9px' }}>
                <DataRow lead={<Tile tone="blue" size="sm"><IconPhone size={11} /></Tile>}
                  title={s.phone} sub="Mobile" />
                <DataRow lead={<Tile tone="violet" size="sm">{s.gender?.[0]}</Tile>}
                  title={s.gender} sub="Gender" />
                <DataRow lead={<Tile tone="amber" size="sm"><IconAlert size={11} /></Tile>}
                  title={s.issue} sub="Problem" />
              </div>

              {s.note && (
                <div style={{
                  marginTop: 8, padding: 8, background: 'var(--surface-2)', borderRadius: 'var(--r-sm)',
                  fontSize: 'var(--fs-sm)', lineHeight: 1.5, color: 'var(--ink-2)',
                }}>{s.note}</div>
              )}

              {s.status === 'new' && (
                <div className="row" style={{ gap: 6, marginTop: 10 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => open(s)}>
                    Create record <IconArrowRight size={11} />
                  </button>
                  <button className="btn btn-ghost btn-sm"
                    onClick={() => { dispatch({ type: 'DISMISS_SUBMISSION', id: s.id }); toast('Dismissed') }}>
                    <IconX size={11} />
                  </button>
                </div>
              )}
              {s.status === 'converted' && (
                <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 10 }}
                  onClick={() => nav('/patients/' + s.patientId)}>
                  Open patient file
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ---------- Convert to a patient record ---------- */}
      {convert && (
        <Modal title="Create patient record" sub={`From ${convert.name}'s submission`}
          onClose={() => setConvert(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setConvert(null)}>Cancel</button>
            <div className="spacer" />
            <button className="btn btn-primary" onClick={create}>
              <IconCheck size={13} /> Create record
            </button>
          </>}>
          <Card style={{ background: 'var(--surface-2)', marginBottom: 14 }}>
            <div className="field" style={{ marginBottom: 6 }}><label>From the patient</label></div>
            <div className="grid g-2" style={{ gap: 0 }}>
              {[['Name', convert.name], ['Mobile', convert.phone],
                ['Gender', convert.gender], ['Problem', convert.issue]].map(([k, v]) => (
                <div className="rcp-line" key={k} style={{ paddingRight: 10 }}>
                  <span className="lb" style={{ fontSize: 'var(--fs-sm)' }}>{k}</span>
                  <span className="vl" style={{ fontSize: 'var(--fs-sm)' }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="field" style={{ marginBottom: 10 }}><label>Add at the desk</label></div>
          <div className="grid g-2" style={{ marginBottom: 14 }}>
            <Field label="Age">
              <input className="input" type="number" value={extra.age} placeholder="e.g. 34"
                onChange={e => setExtra(s => ({ ...s, age: e.target.value }))} />
            </Field>
            <Field label="Email (optional)">
              <input className="input" value={extra.email} placeholder="name@email.com"
                onChange={e => setExtra(s => ({ ...s, email: e.target.value }))} />
            </Field>
            <Field label="Address (optional)" span={2}>
              <input className="input" value={extra.address} placeholder="Area, city"
                onChange={e => setExtra(s => ({ ...s, address: e.target.value }))} />
            </Field>
          </div>

          <Field label="Medical conditions" hint="Not listed? Use Other and type it.">
            <ChipsWithOther options={MEDICAL_FLAGS} exclusiveKey="none"
              value={extra.medical} placeholder="e.g. Anaemia, recent surgery…"
              onChange={v => setExtra(s => ({ ...s, medical: v }))} />
          </Field>

          <div style={{ height: 12 }} />
          <Field label="Drug allergies" hint="Not listed? Use Other and type it.">
            <ChipsWithOther options={ALLERGY_OPTIONS} warn
              value={extra.allergies} placeholder="e.g. Cephalosporins"
              onChange={v => setExtra(s => ({ ...s, allergies: v }))} />
          </Field>
        </Modal>
      )}
    </>
  )
}
