import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Field, Chip, Tabs, Eyebrow, Modal, Tile, Blank, ChipsWithOther } from '../../components/UI'
import { VisitStrip } from '../../components/Layout'
import NoVisit from './NoVisit'
import { useClinic } from '../../store/ClinicStore'
import { PROCEDURES, PROCEDURE_CATEGORIES, DRUGS, RX_TEMPLATES, POSTOP } from '../../data/catalog'
import { inr } from '../../lib/format'
import { IconPlus, IconX, IconCheck, IconRx, IconSearch, IconAlert, IconArrowRight, IconTooth, IconCalendar } from '../../lib/icons'

export default function Treatment() {
  const { visit, patient, dispatch, nextStage, toast } = useClinic()
  const nav = useNavigate()
  const [tab, setTab] = useState('plan')
  const [pick, setPick] = useState(false)
  const [cat, setCat] = useState(PROCEDURE_CATEGORIES[0])
  const [q, setQ] = useState('')
  const [tooth, setTooth] = useState('')
  const [cName, setCName] = useState('')
  const [cPrice, setCPrice] = useState('')
  const [cMins, setCMins] = useState('30')

  if (!visit || !patient) return <NoVisit stage="Treatment" />

  const plan = visit.plan || []
  const done = plan.filter(p => p.status === 'done')
  const planTotal = plan.reduce((s, p) => s + Number(p.price || 0), 0)
  const doneTotal = done.reduce((s, p) => s + Number(p.price || 0), 0)
  const rx = visit.rx || []

  const filtered = PROCEDURES.filter(p =>
    q ? (p.name + p.code).toLowerCase().includes(q.toLowerCase()) : p.cat === cat)

  const add = (proc) => {
    dispatch({
      type: 'PLAN_ADD',
      item: {
        code: proc.code, name: proc.name, cat: proc.cat, price: proc.price,
        gst: proc.gst || 0, mins: proc.mins, lab: !!proc.lab,
        tooth: proc.perTooth ? (tooth || '—') : '—', status: 'planned',
      },
    })
    toast(`${proc.name} added`)
  }

  const clash = (d) => (patient.allergies || []).some(a =>
    (a === 'Penicillin' && /amoxicillin|clavulanate/i.test(d)) ||
    (a === 'Aspirin / NSAIDs' && /ibuprofen|diclofenac|ketorolac/i.test(d)))

  const toggleRx = (name) => {
    const exists = rx.some(r => r.name === name)
    const next = exists ? rx.filter(r => r.name !== name) : [...rx, DRUGS.find(d => d.name === name)]
    dispatch({ type: 'PATCH_VISIT', patch: { rx: next } })
  }

  const go = () => {
    if (!done.length) return toast('Tick what was actually done')
    nextStage(); nav('/billing')
  }

  return (
    <>
      <VisitStrip />

      <div className="page-head">
        <div>
          <Eyebrow>Step 7 · dentist</Eyebrow>
          <h1>Treatment</h1>
          <p>Plan the work, tick what was done today. Only ticked items get billed.</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-primary btn-sm" disabled={!done.length} onClick={go}>
            Billing <IconArrowRight size={12} />
          </button>
        </div>
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'plan', label: 'Plan', count: plan.length || null },
        { key: 'rx', label: 'Prescription', count: rx.length || null },
        { key: 'after', label: 'After care' },
      ]} />

      {tab === 'plan' && (
        <div className="fade-up">
          <Card title="Procedures" sub={plan.length ? `${done.length} of ${plan.length} done · ${inr(doneTotal)} billable` : 'Nothing planned yet'}
            actions={<button className="btn btn-primary btn-sm" onClick={() => setPick(true)}>
              <IconPlus size={12} /> Add procedure
            </button>}>
            {plan.length === 0 ? (
              <Blank icon={<IconTooth size={20} />} title="No procedures yet"
                action={<button className="btn btn-soft btn-sm" onClick={() => setPick(true)}>
                  <IconPlus size={12} /> Add from catalog
                </button>}>
                Pick what you are going to do, then tick it off as it is completed.
              </Blank>
            ) : plan.map((p, i) => (
              <div className="lrow" key={i} style={{
                borderColor: p.status === 'done' ? 'var(--g-400)' : 'var(--line)',
                background: p.status === 'done' ? 'var(--g-50)' : 'var(--surface)',
              }}>
                <button className="role-check" style={{
                  marginLeft: 0,
                  background: p.status === 'done' ? 'var(--g-600)' : 'transparent',
                  borderColor: p.status === 'done' ? 'var(--g-600)' : 'var(--line)',
                }} onClick={() => dispatch({
                  type: 'PLAN_PATCH', index: i,
                  patch: { status: p.status === 'done' ? 'planned' : 'done' },
                })}>
                  {p.status === 'done' && <IconCheck size={10} style={{ color: '#fff' }} />}
                </button>
                <Badge tone="dark">{p.tooth}</Badge>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>{p.name}</div>
                  <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>
                    {p.code} · {p.mins} min{p.lab ? ' · lab work' : ''}{p.gst ? ` · GST ${p.gst}%` : ''}
                  </div>
                </div>
                <span className="cell-strong mono-num">{inr(p.price)}</span>
                <button className="corner-btn" onClick={() => dispatch({ type: 'PLAN_REMOVE', index: i })}>
                  <IconX size={10} />
                </button>
              </div>
            ))}
            {plan.length > 0 && (
              <>
                <div className="divider" />
                <div style={{ maxWidth: 260, marginLeft: 'auto' }}>
                  <div className="rcp-line"><span className="lb">Planned</span><span className="vl">{inr(planTotal)}</span></div>
                  <div className="rcp-line rcp-total"><span className="lb">Done today</span>
                    <span className="vl" style={{ color: 'var(--g-700)' }}>{inr(doneTotal)}</span></div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === 'rx' && (
        <Card className="fade-up" title="Prescription" sub="Start from a template or pick individually">
          <div className="chip-grid" style={{ marginBottom: 12 }}>
            {RX_TEMPLATES.map(t => (
              <button key={t.name} className="chip" onClick={() => {
                dispatch({ type: 'PATCH_VISIT', patch: { rx: t.drugs.map(n => DRUGS.find(d => d.name === n)).filter(Boolean) } })
                toast(`${t.name} loaded`)
              }}><IconRx size={11} />{t.name}</button>
            ))}
            {rx.length > 0 && (
              <button className="chip" onClick={() => dispatch({ type: 'PATCH_VISIT', patch: { rx: [] } })}>
                <IconX size={11} />Clear
              </button>
            )}
          </div>

          {DRUGS.map(d => {
            const on = rx.some(r => r.name === d.name)
            const bad = clash(d.name)
            return (
              <div className="lrow" key={d.name} style={{
                borderColor: bad && on ? 'var(--a-rose)' : on ? 'var(--g-400)' : 'var(--line)',
                background: on ? 'var(--g-50)' : 'var(--surface)',
              }}>
                <button className="role-check" style={{
                  marginLeft: 0, background: on ? 'var(--g-600)' : 'transparent',
                  borderColor: on ? 'var(--g-600)' : 'var(--line)',
                }} onClick={() => toggleRx(d.name)}>
                  {on && <IconCheck size={10} style={{ color: '#fff' }} />}
                </button>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <span className="strong" style={{ fontSize: 'var(--fs-base)' }}>{d.name}</span>
                    {bad && <Badge tone="red"><IconAlert size={8} />Allergy</Badge>}
                  </div>
                  <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{d.form} · {d.dose} · {d.days} days</div>
                </div>
                <Badge>{d.cls}</Badge>
              </div>
            )
          })}
        </Card>
      )}

      {tab === 'after' && (
        <div className="col fade-up" style={{ gap: 10 }}>
          <Card title="Post-op instructions" sub="Goes into the WhatsApp message">
            <div className="chip-grid" style={{ marginBottom: 12 }}>
              {Object.keys(POSTOP).map(k => (
                <button key={k} className={`chip ${visit.postOp === k ? 'on' : ''}`}
                  onClick={() => dispatch({ type: 'PATCH_VISIT', patch: { postOp: k } })}>
                  {k === 'rct' ? 'Root canal' : k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
            {visit.postOp
              ? POSTOP[visit.postOp].map((l, i) => (
                <div className="row" key={i} style={{ alignItems: 'flex-start', padding: '4px 0' }}>
                  <Badge tone="green">{i + 1}</Badge>
                  <span style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.5 }}>{l}</span>
                </div>
              ))
              : <div className="faint" style={{ fontSize: 'var(--fs-sm)' }}>Pick a set above, or write your own below.</div>}

            <div className="divider-x" />
            <Field label="Your own instructions" hint="Added to the WhatsApp message under the set above">
              <textarea className="textarea" style={{ minHeight: 60 }} value={visit.postOpNote || ''}
                placeholder="Anything specific for this patient…"
                onChange={e => dispatch({ type: 'PATCH_VISIT', patch: { postOpNote: e.target.value } })} />
            </Field>
          </Card>

          <Card title="Next visit" sub="Use Other for an exact date or your own wording">
            <ChipsWithOther
              options={['In 3 days', 'In 1 week', 'In 2 weeks', 'In 1 month', 'In 3 months', 'In 6 months']}
              value={visit.nextVisit ? [visit.nextVisit] : []}
              placeholder="e.g. 14 Oct, after the lab work returns"
              onChange={v => dispatch({ type: 'PATCH_VISIT', patch: { nextVisit: v.slice(-1)[0] || '' } })} />
            {visit.nextVisit && (
              <div className="lrow fade-up" style={{ marginTop: 10, borderColor: 'var(--g-200)', background: 'var(--g-50)' }}>
                <Tile tone="green"><IconCalendar size={13} /></Tile>
                <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>Told to come back {visit.nextVisit.toLowerCase()}</div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ---------- Procedure picker ---------- */}
      {pick && (
        <Modal wide title="Add procedure" sub={`${PROCEDURES.length} in catalog`} onClose={() => setPick(false)}
          footer={<button className="btn btn-ghost" onClick={() => setPick(false)}>Done</button>}>
          <div className="row" style={{ gap: 8, marginBottom: 12 }}>
            <div className="search" style={{ maxWidth: '100%', flex: 1 }}>
              <IconSearch size={14} style={{ color: 'var(--faint)' }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search procedure or code…" />
            </div>
            <input className="input" value={tooth} onChange={e => setTooth(e.target.value)}
              placeholder="Tooth no." style={{ width: 92 }} />
          </div>
          {!q && (
            <div className="chip-grid" style={{ marginBottom: 12 }}>
              {PROCEDURE_CATEGORIES.map(c => (
                <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>
          )}
          {/* anything not in the catalog */}
          <div className="card" style={{ background: 'var(--surface-2)', marginBottom: 10 }}>
            <div className="field" style={{ marginBottom: 7 }}><label>Custom procedure</label></div>
            <div className="row wrap" style={{ gap: 6 }}>
              <input className="input" style={{ flex: 2, minWidth: 160 }} value={cName}
                placeholder="What did you do?" onChange={e => setCName(e.target.value)} />
              <input className="input mono-num" style={{ width: 100 }} value={cPrice} type="number"
                placeholder="Price" onChange={e => setCPrice(e.target.value)} />
              <input className="input mono-num" style={{ width: 78 }} value={cMins} type="number"
                placeholder="Mins" onChange={e => setCMins(e.target.value)} />
              <button className="btn btn-primary btn-sm" disabled={!cName.trim() || !cPrice}
                onClick={() => {
                  add({ code: 'CUSTOM', name: cName.trim(), cat: 'Custom',
                        price: Number(cPrice), gst: 0, mins: Number(cMins) || 0, perTooth: true })
                  setCName(''); setCPrice('')
                }}>
                <IconPlus size={11} /> Add
              </button>
            </div>
          </div>

          {filtered.map(p => (
            <div className="lrow" key={p.code}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>{p.name}</div>
                <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>
                  {p.code} · {p.mins} min{p.perTooth ? ' · per tooth' : ''}{p.lab ? ' · lab' : ''}
                </div>
              </div>
              <span className="cell-strong mono-num">{inr(p.price)}</span>
              <button className="btn btn-soft btn-sm" onClick={() => add(p)}><IconPlus size={11} /></button>
            </div>
          ))}
        </Modal>
      )}
    </>
  )
}
