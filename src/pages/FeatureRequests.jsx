import React, { useState } from 'react'
import {
  Card, Badge, Eyebrow, Tile, DataRow, Modal, Field, Chip, Blank, Seg, SectionHead, ChipsWithOther,
} from '../components/UI'
import { useClinic } from '../store/ClinicStore'
import { REQUEST_TYPES, REQUEST_STAGES, REQUEST_TERMS } from '../data/plans'
import { inr, prettyDate } from '../lib/format'
import {
  IconPlus, IconSparkle, IconCheck, IconX, IconArrowRight, IconAlert, IconShield, IconReceipt,
} from '../lib/icons'

const MODULES = [
  'Patient intake', 'Patient records', 'Appointments', 'Check-in & queue',
  'Dental charting', 'Treatment plans', 'Prescriptions', 'Billing', 'Payments',
  'WhatsApp messaging', 'Reviews', 'Reports', 'Settings',
]

const URGENCY = [
  { key: 'normal', label: 'Normal', note: 'Fits the usual queue' },
  { key: 'soon', label: 'Needed soon', note: 'Within a month' },
  { key: 'urgent', label: 'Urgent', note: '+40% for half the timeline' },
]

const BLANK = { type: 'field', module: '', title: '', detail: '', urgency: 'normal' }

export default function FeatureRequests() {
  const { featureRequests, clinic, dispatch, toast } = useClinic()
  const [filter, setFilter] = useState('open')
  const [add, setAdd] = useState(false)
  const [open, setOpen] = useState(null)
  const [f, setF] = useState(BLANK)

  const list = (featureRequests || []).filter(r =>
    filter === 'all' ? true
      : filter === 'open' ? !['delivered', 'declined'].includes(r.stage)
        : r.stage === 'delivered')

  const type = (k) => REQUEST_TYPES.find(t => t.key === k) || REQUEST_TYPES[0]
  const stage = (k) => REQUEST_STAGES.find(s => s.key === k) || REQUEST_STAGES[0]

  const submit = () => {
    const t = type(f.type)
    dispatch({
      type: 'ADD_REQUEST',
      data: {
        ...f,
        typeLabel: t.label,
        estimateFrom: t.from,
        estimateTo: f.urgency === 'urgent' ? Math.round(t.to * 1.4) : t.to,
        days: t.days,
        clinic: clinic.name,
      },
    })
    toast('Request sent — we reply within 2 working days')
    setAdd(false); setF(BLANK)
  }

  const totalApproved = (featureRequests || [])
    .filter(r => ['approved', 'building', 'delivered'].includes(r.stage))
    .reduce((s, r) => s + Number(r.quote || 0), 0)

  return (
    <>
      <div className="page-head">
        <div>
          <Eyebrow>Support</Eyebrow>
          <h1>Feature Requests</h1>
          <p>Need something the product does not do? Tell us and we will quote it.</p>
        </div>
        <div className="page-head-actions">
          <Seg value={filter} onChange={setFilter} options={[
            { value: 'open', label: 'Open' }, { value: 'delivered', label: 'Delivered' }, { value: 'all', label: 'All' },
          ]} />
          <button className="btn btn-primary btn-sm" onClick={() => setAdd(true)}>
            <IconPlus size={12} /> Raise a request
          </button>
        </div>
      </div>

      {/* ---------- how it works ---------- */}
      <div className="grid g-4" style={{ marginBottom: 12 }}>
        {[
          ['green', '1', 'You describe it', 'Two minutes. Plain words are fine.'],
          ['blue', '2', 'We quote it', 'Fixed price and timeline within 2 working days.'],
          ['violet', '3', 'You approve', '50% on approval. Nothing starts before that.'],
          ['amber', '4', 'We build it', 'Delivered into your account. Balance invoiced.'],
        ].map(([tone, n, t, d]) => (
          <Card key={n} style={{ padding: 12 }}>
            <div className="row" style={{ marginBottom: 6 }}>
              <Tile tone={tone}><span style={{ fontSize: 10, fontWeight: 800 }}>{n}</span></Tile>
              <span className="strong" style={{ fontSize: 'var(--fs-base)' }}>{t}</span>
            </div>
            <div className="faint" style={{ fontSize: 'var(--fs-micro)', lineHeight: 1.45 }}>{d}</div>
          </Card>
        ))}
      </div>

      {/* ---------- the requests ---------- */}
      {list.length === 0 ? (
        <Blank icon={<IconSparkle size={20} />}
          title={filter === 'open' ? 'No open requests' : 'Nothing here yet'}
          action={<button className="btn btn-primary btn-sm" onClick={() => setAdd(true)}>
            <IconPlus size={12} /> Raise your first request
          </button>}>
          Anything missing — a field, a report, a whole module — ask for it. We quote before
          we build, and you only pay if you approve.
        </Blank>
      ) : (
        <div className="grid g-2">
          {list.map(r => {
            const st = stage(r.stage)
            return (
              <Card key={r.id} style={{ cursor: 'pointer' }} onClick={() => setOpen(r)}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <span className="badge dark mono-num">{r.id}</span>
                  <Badge tone={st.tone} dot>{st.label}</Badge>
                  <div className="spacer" />
                  <span className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{prettyDate(r.createdAt)}</span>
                </div>
                <div className="strong" style={{ fontSize: 'var(--fs-md)', marginBottom: 3 }}>{r.title}</div>
                <div className="muted" style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.5, marginBottom: 8 }}>
                  {r.detail?.length > 130 ? r.detail.slice(0, 130) + '…' : r.detail}
                </div>
                <div className="row wrap" style={{ gap: 5 }}>
                  <Badge tone="blue">{r.typeLabel}</Badge>
                  {r.module && <Badge>{r.module}</Badge>}
                  {r.urgency === 'urgent' && <Badge tone="red">Urgent</Badge>}
                  <div className="spacer" />
                  <span className="strong mono-num" style={{ fontSize: 'var(--fs-sm)' }}>
                    {r.quote ? inr(r.quote) : `${inr(r.estimateFrom)}–${inr(r.estimateTo)}`}
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ---------- price guide ---------- */}
      <SectionHead title="What things usually cost" />
      <div className="panel">
        <div className="panel-body" style={{ paddingTop: 12 }}>
          <table className="tbl">
            <thead><tr><th>Type</th><th>Example</th><th>Typical timeline</th>
              <th style={{ textAlign: 'right' }}>Indicative price</th></tr></thead>
            <tbody>
              {REQUEST_TYPES.map(t => (
                <tr key={t.key}>
                  <td>
                    <div className="cell-strong">{t.label}</div>
                    <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{t.band}</div>
                  </td>
                  <td className="faint">{t.eg}</td>
                  <td className="faint">{t.days}</td>
                  <td className="cell-strong mono-num" style={{ textAlign: 'right' }}>
                    {inr(t.from)} – {inr(t.to)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Card style={{ marginTop: 10 }} title="How we charge">
        {REQUEST_TERMS.map(t => (
          <div className="row" key={t} style={{ alignItems: 'flex-start', padding: '5px 0' }}>
            <IconCheck size={12} style={{ color: 'var(--g-600)', marginTop: 3, flexShrink: 0 }} />
            <span style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.55 }}>{t}</span>
          </div>
        ))}
        {totalApproved > 0 && (
          <>
            <div className="divider-x" />
            <div className="rcp-line">
              <span className="lb">Custom work approved to date</span>
              <span className="vl">{inr(totalApproved)}</span>
            </div>
          </>
        )}
      </Card>

      {/* ---------- raise ---------- */}
      {add && (
        <Modal wide title="Raise a feature request" sub="We reply with a fixed quote within 2 working days"
          onClose={() => setAdd(false)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setAdd(false)}>Cancel</button>
            <div className="spacer" />
            <button className="btn btn-primary" disabled={!f.title.trim() || !f.detail.trim()} onClick={submit}>
              <IconArrowRight size={13} /> Send request
            </button>
          </>}>
          <Field label="What kind of change is it?">
            <div className="grid g-3" style={{ gap: 7 }}>
              {REQUEST_TYPES.map(t => (
                <button key={t.key} className={`role-card ${f.type === t.key ? 'on' : ''}`}
                  style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}
                  onClick={() => setF(s => ({ ...s, type: t.key }))}>
                  <div className="rc-nm">{t.label}</div>
                  <div className="rc-ds">{inr(t.from)}–{inr(t.to)} · {t.days}</div>
                </button>
              ))}
            </div>
          </Field>

          <div style={{ height: 14 }} />
          <Field label="Which part of the app?" hint="Use Other if it is somewhere new">
            <ChipsWithOther options={MODULES} value={f.module ? [f.module] : []}
              placeholder="e.g. Lab work tracking"
              onChange={v => setF(s => ({ ...s, module: v.slice(-1)[0] || '' }))} />
          </Field>

          <div style={{ height: 14 }} />
          <Field label="One line summary">
            <input className="input" value={f.title} placeholder="e.g. Add a referring doctor field to the patient form"
              onChange={e => setF(s => ({ ...s, title: e.target.value }))} />
          </Field>

          <div style={{ height: 14 }} />
          <Field label="Describe it properly"
            hint="What should happen, who uses it, and what problem it solves. The more detail, the tighter the quote.">
            <textarea className="textarea" style={{ minHeight: 100 }} value={f.detail}
              placeholder="Right now we write the referring doctor in the notes and cannot report on it. We want a proper field on the patient form, shown on the patient file, and a monthly report of how many patients each referring doctor sent."
              onChange={e => setF(s => ({ ...s, detail: e.target.value }))} />
          </Field>

          <div style={{ height: 14 }} />
          <Field label="How soon do you need it?">
            <div className="chip-grid">
              {URGENCY.map(u => (
                <Chip key={u.key} on={f.urgency === u.key} onClick={() => setF(s => ({ ...s, urgency: u.key }))}>
                  {u.label} — {u.note}
                </Chip>
              ))}
            </div>
          </Field>

          <div className="lrow" style={{ marginTop: 14, alignItems: 'flex-start', background: 'var(--g-50)', borderColor: 'var(--g-200)' }}>
            <IconShield size={14} style={{ color: 'var(--g-600)', marginTop: 1 }} />
            <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.55 }}>
              Sending this costs nothing. You will get a written quote with a fixed price and
              delivery date, and no work begins until you approve it.
              <br />
              <b>Indicative for this type: {inr(type(f.type).from)} – {inr(f.urgency === 'urgent' ? Math.round(type(f.type).to * 1.4) : type(f.type).to)}</b>
            </div>
          </div>
        </Modal>
      )}

      {/* ---------- detail ---------- */}
      {open && (() => {
        const st = stage(open.stage)
        const idx = REQUEST_STAGES.findIndex(s => s.key === open.stage)
        return (
          <Modal title={open.title} sub={`${open.id} · raised ${prettyDate(open.createdAt)}`}
            onClose={() => setOpen(null)}
            footer={<>
              {open.stage === 'quoted' && (
                <button className="btn btn-primary" onClick={() => {
                  dispatch({ type: 'UPDATE_REQUEST', id: open.id, patch: { stage: 'approved' } })
                  toast('Approved — 50% advance invoiced'); setOpen(null)
                }}>
                  <IconCheck size={13} /> Approve {open.quote ? inr(open.quote) : 'the quote'}
                </button>
              )}
              <div className="spacer" />
              {!['delivered', 'declined'].includes(open.stage) && (
                <button className="btn btn-ghost" onClick={() => {
                  dispatch({ type: 'UPDATE_REQUEST', id: open.id, patch: { stage: 'declined' } })
                  toast('Withdrawn'); setOpen(null)
                }}>
                  <IconX size={12} /> Withdraw
                </button>
              )}
            </>}>
            <div className="row" style={{ marginBottom: 12 }}>
              <Badge tone={st.tone} dot>{st.label}</Badge>
              <span className="faint" style={{ fontSize: 'var(--fs-sm)' }}>{st.desc}</span>
            </div>

            {/* progress */}
            <div className="rail" style={{ paddingBottom: 10 }}>
              {REQUEST_STAGES.filter(s => s.key !== 'declined').map((s, i) => (
                <React.Fragment key={s.key}>
                  {i > 0 && <span className={`rail-link ${i <= idx ? 'done' : ''}`} />}
                  <span className={`rail-step ${i < idx ? 'done' : ''} ${i === idx ? 'now' : ''}`}>
                    <span className="rail-dot">{i < idx ? <IconCheck size={9} /> : i + 1}</span>
                    <span className="rl">{s.label}</span>
                  </span>
                </React.Fragment>
              ))}
            </div>

            <div className="divider" />
            <div style={{ margin: '0 -9px' }}>
              <DataRow lead={<Tile tone="blue"><IconSparkle size={12} /></Tile>}
                title={open.typeLabel} sub="Type of change" />
              {open.module && (
                <DataRow lead={<Tile tone="violet"><IconAlert size={12} /></Tile>}
                  title={open.module} sub="Area of the app" />
              )}
              <DataRow lead={<Tile tone="amber"><IconReceipt size={12} /></Tile>}
                title={open.quote ? inr(open.quote) : `${inr(open.estimateFrom)} – ${inr(open.estimateTo)}`}
                sub={open.quote ? 'Quoted price' : 'Indicative range until we quote'} />
              <DataRow lead={<Tile tone="green"><IconCheck size={12} /></Tile>}
                title={open.days} sub="Expected timeline" />
            </div>

            <div className="divider" />
            <div className="field" style={{ marginBottom: 6 }}><label>What you asked for</label></div>
            <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.6, color: 'var(--ink-2)' }}>
              {open.detail}
            </div>
          </Modal>
        )
      })()}
    </>
  )
}
