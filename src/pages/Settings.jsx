import React, { useState } from 'react'
import { Card, Badge, Avatar, Tabs, Field, Chip, Eyebrow, Tile, DataRow, Modal, Blank, Switch } from '../components/UI'
import { useClinic } from '../store/ClinicStore'
import { ROLES, ROLE_COLORS } from '../data/config'
import { clinicBySlug, slugify } from '../data/clinics'
import { shortReviewUrl } from '../lib/links'
import { GROQ_MODELS, DEFAULT_MODEL, testKey } from '../lib/ai'
import { IconCheck, IconPlus, IconX, IconChair, IconUsers, IconAlert, IconQr, IconSparkle, IconShield, IconEye, IconEyeOff, IconStar } from '../lib/icons'

export default function Settings() {
  const { clinic, staff, chairs, dispatch, toast } = useClinic()
  const listed = !!clinicBySlug(clinic.slug)
  const shortLink = shortReviewUrl(clinic, { listed })
  const copyShort = () => {
    navigator.clipboard?.writeText(shortLink).then(() => toast('Short link copied'), () => toast(shortLink))
  }
  const [tab, setTab] = useState('clinic')
  const [c, setC] = useState(clinic)
  const [addStaff, setAddStaff] = useState(false)
  const [addChair, setAddChair] = useState(false)
  const [ns, setNs] = useState({ name: '', role: 'Dentist', email: '', spec: '', reg: '' })
  const [nc, setNc] = useState({ name: '', label: '' })
  const [confirmReset, setConfirmReset] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState('')

  const saveClinic = () => { dispatch({ type: 'SET_CLINIC', patch: c }); toast('Clinic details saved') }

  const createStaff = () => {
    const short = ns.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    dispatch({ type: 'ADD_STAFF', data: { ...ns, short, color: ROLE_COLORS[staff.length % ROLE_COLORS.length] } })
    toast(`${ns.name} added`)
    setAddStaff(false); setNs({ name: '', role: 'Dentist', email: '', spec: '', reg: '' })
  }

  const createChair = () => {
    dispatch({ type: 'ADD_CHAIR', data: nc })
    toast('Chair added')
    setAddChair(false); setNc({ name: '', label: '' })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Eyebrow>System</Eyebrow>
          <h1>Settings</h1>
          <p>Your clinic details, team and chairs. These appear on bills and in dropdowns.</p>
        </div>
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'clinic', label: 'Clinic details' },
        { key: 'staff', label: 'Team', count: staff.length },
        { key: 'chairs', label: 'Chairs', count: chairs.length },
        { key: 'ai', label: 'AI Assistant' },
        { key: 'data', label: 'Data' },
      ]} />

      {tab === 'clinic' && (
        <div className="grid g-main fade-up">
          <Card title="Clinic details" sub="Printed on every invoice">
            <div className="grid g-2">
              <Field label="Clinic name" span={2}>
                <input className="input" value={c.name} onChange={e => setC(s => ({ ...s, name: e.target.value }))} />
              </Field>
              <Field label="Branch / area">
                <input className="input" value={c.branch} placeholder="e.g. Anna Nagar"
                  onChange={e => setC(s => ({ ...s, branch: e.target.value }))} />
              </Field>
              <Field label="Phone">
                <input className="input" value={c.phone} placeholder="+91 …"
                  onChange={e => setC(s => ({ ...s, phone: e.target.value }))} />
              </Field>
              <Field label="Address" span={2}>
                <textarea className="textarea" style={{ minHeight: 54 }} value={c.address}
                  onChange={e => setC(s => ({ ...s, address: e.target.value }))} />
              </Field>
              <Field label="GSTIN (optional)">
                <input className="input mono-num" value={c.gstin}
                  onChange={e => setC(s => ({ ...s, gstin: e.target.value }))} />
              </Field>
              <Field label="Council registration (optional)">
                <input className="input mono-num" value={c.regNo}
                  onChange={e => setC(s => ({ ...s, regNo: e.target.value }))} />
              </Field>
              <Field label="UPI ID" span={2} hint="Shows a payment QR on the Payment page">
                <input className="input mono-num" value={c.upiId} placeholder="name@bank"
                  onChange={e => setC(s => ({ ...s, upiId: e.target.value }))} />
              </Field>
              <Field label="Google review link" span={2} hint="Google Business Profile → Ask for reviews → copy the link (g.page/r/…/review). A Place ID (ChIJ…) also works.">
                <input className="input" value={c.googlePlaceUrl} placeholder="https://g.page/r/…/review"
                  onChange={e => setC(s => ({ ...s, googlePlaceUrl: e.target.value }))} />
              </Field>
              <Field label="Short review link" span={2} hint="Letters and dashes only — this becomes /go/<name>, short enough to print or read out">
                <input className="input mono-num" value={c.slug || ''} placeholder="sree-dental"
                  onChange={e => setC(s => ({ ...s, slug: slugify(e.target.value) }))} />
              </Field>
            </div>
            <div className="divider" />
            <button className="btn btn-primary" onClick={saveClinic}><IconCheck size={13} /> Save</button>
          </Card>

          {clinic.slug && (
            <Card title="Your short review link" sub="No patient data in it, so it stays short">
              <div className="lrow" style={{ marginBottom: 8 }}>
                <IconStar size={14} style={{ color: 'var(--a-amber)' }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="strong mono-num" style={{ fontSize: 'var(--fs-md)', wordBreak: 'break-all' }}>
                    {shortLink.replace(/^https?:\/\//, '').split('?')[0]}
                  </div>
                  <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>
                    {listed
                      ? 'Opens straight to your Google review page.'
                      : 'Until this clinic is added to src/data/clinics.js, the link carries your name and Google link as parameters — longer, but it works.'}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={copyShort}>Copy</button>
              </div>
              <p className="faint" style={{ fontSize: 'var(--fs-micro)', lineHeight: 1.5 }}>
                Use it on a QR at the desk, on a printed card, or on its own in WhatsApp when you
                only want a review and not a bill. Checkout has a <b>Review only</b> option that sends it.
              </p>
              {!listed && (
                <pre className="code-line" style={{ marginTop: 8 }}>{`${clinic.slug}: { name: '${clinic.name}', google: '${clinic.googlePlaceUrl || ''}' },`}</pre>
              )}
            </Card>
          )}

          <Card title="Fill these in first">
            <p className="muted" style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.6, marginBottom: 10 }}>
              The clinic name shows in the sidebar, on the public intake page and on every bill.
              UPI ID and the Google link make the Payment and Review pages work properly.
            </p>
            <div style={{ margin: '0 -9px' }}>
              {[
                ['Clinic name', !!clinic.name && clinic.name !== 'Your Clinic Name'],
                ['Phone', !!clinic.phone],
                ['Address', !!clinic.address],
                ['UPI ID', !!clinic.upiId],
                ['Google review link', !!clinic.googlePlaceUrl],
              ].map(([t, ok]) => (
                <DataRow key={t}
                  lead={<Tile tone={ok ? 'green' : 'slate'}>{ok ? <IconCheck size={12} /> : <IconAlert size={12} />}</Tile>}
                  title={t} sub={ok ? 'Set' : 'Not set yet'} />
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'staff' && (
        <div className="fade-up">
          <Card title="Team" sub={`${staff.length} member${staff.length === 1 ? '' : 's'}`}
            actions={<button className="btn btn-primary btn-sm" onClick={() => setAddStaff(true)}>
              <IconPlus size={12} /> Add person
            </button>}>
            <div style={{ margin: '0 -9px' }}>
              {staff.map(s => (
                <DataRow key={s.id}
                  lead={<Avatar name={s.name} initials={s.short} color={s.color} size={28} />}
                  title={s.name}
                  sub={[s.email, s.spec, s.reg].filter(Boolean).join(' · ') || 'No details added'}
                  trail={
                    <div className="row" style={{ gap: 5 }}>
                      <Badge tone={s.role === 'Owner' ? 'green' : ''}>{s.role}</Badge>
                      {staff.length > 1 && (
                        <button className="corner-btn"
                          onClick={() => { dispatch({ type: 'DELETE_STAFF', id: s.id }); toast('Removed') }}>
                          <IconX size={10} />
                        </button>
                      )}
                    </div>
                  } />
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'chairs' && (
        <div className="fade-up">
          <Card title="Chairs / operatories" sub="Used when assigning a patient at check-in"
            actions={<button className="btn btn-primary btn-sm" onClick={() => setAddChair(true)}>
              <IconPlus size={12} /> Add chair
            </button>}>
            {chairs.length === 0 ? (
              <Blank icon={<IconChair size={20} />} title="No chairs added"
                action={<button className="btn btn-soft btn-sm" onClick={() => setAddChair(true)}>
                  <IconPlus size={12} /> Add your first chair
                </button>} />
            ) : (
              <div style={{ margin: '0 -9px' }}>
                {chairs.map(ch => (
                  <DataRow key={ch.id} lead={<Tile tone="green"><IconChair size={13} /></Tile>}
                    title={ch.name} sub={ch.label || 'No label'}
                    trail={<button className="corner-btn"
                      onClick={() => { dispatch({ type: 'DELETE_CHAIR', id: ch.id }); toast('Removed') }}>
                      <IconX size={10} />
                    </button>} />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'ai' && (
        <div className="grid g-main fade-up">
          <Card title="Connect an AI model" sub="Turns the assistant into real conversation instead of built-in queries">
            <Field label="Provider">
              <div className="chip-grid">
                <Chip on>Groq</Chip>
                <Chip>OpenAI — soon</Chip>
                <Chip>Anthropic — soon</Chip>
              </div>
            </Field>

            <div style={{ height: 14 }} />
            <Field label="API key" hint="From console.groq.com → API Keys">
              <div className="row" style={{ gap: 6 }}>
                <input className="input mono-num" type={showKey ? 'text' : 'password'}
                  value={clinic.aiKey || ''} placeholder="gsk_…"
                  onChange={e => dispatch({ type: 'SET_CLINIC', patch: { aiKey: e.target.value.trim() } })} />
                <button className="icon-btn" onClick={() => setShowKey(v => !v)} style={{ flexShrink: 0 }}>
                  {showKey ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                </button>
              </div>
            </Field>

            <div style={{ height: 14 }} />
            <Field label="Model">
              <select className="select" value={clinic.aiModel || DEFAULT_MODEL}
                onChange={e => dispatch({ type: 'SET_CLINIC', patch: { aiModel: e.target.value } })}>
                {GROQ_MODELS.map(m => <option key={m.id} value={m.id}>{m.label} — {m.note}</option>)}
              </select>
            </Field>

            <div style={{ height: 14 }} />
            <div className="row">
              <Switch on={clinic.aiEnabled !== false}
                onChange={v => dispatch({ type: 'SET_CLINIC', patch: { aiEnabled: v } })} />
              <div>
                <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>Use the AI model</div>
                <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>
                  Switch off to fall back to the built-in offline queries
                </div>
              </div>
            </div>

            <div className="divider" />
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-primary" disabled={!clinic.aiKey || testing === 'busy'}
                onClick={async () => {
                  setTesting('busy')
                  try {
                    await testKey(clinic.aiKey, clinic.aiModel || DEFAULT_MODEL)
                    setTesting('ok'); toast('Connected to Groq')
                  } catch (e) { setTesting('fail:' + e.message) }
                }}>
                <IconSparkle size={13} /> {testing === 'busy' ? 'Testing…' : 'Test connection'}
              </button>
              {testing === 'ok' && <Badge tone="green"><IconCheck size={9} /> Working</Badge>}
              {testing.startsWith('fail') && <Badge tone="red"><IconAlert size={9} /> {testing.slice(5)}</Badge>}
            </div>
          </Card>

          <div className="col" style={{ gap: 10 }}>
            <div className="card" style={{ background: 'var(--a-amber-bg)', borderColor: 'rgba(200,134,13,.3)' }}>
              <div className="row" style={{ alignItems: 'flex-start', marginBottom: 6 }}>
                <IconAlert size={15} style={{ color: 'var(--a-amber)', marginTop: 1 }} />
                <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>Demo setup — not for live clinics</div>
              </div>
              <p style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.6, color: 'var(--ink-2)' }}>
                The key is stored in this browser and sent straight to Groq from the page.
                Anyone who opens the developer tools can read it.
                <br /><br />
                Before real clinics use this, the call must move behind your Flask backend so the
                key never reaches the browser. One endpoint, <code>POST /api/assistant</code>, and
                only the URL in <code>src/lib/ai.js</code> changes.
              </p>
            </div>

            <Card title="What gets sent">
              <p className="muted" style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}>
                To answer a question, a summary of this clinic goes to Groq — patient names,
                mobiles, conditions, visits, money and ratings. Tell your patients this in your
                privacy notice, or run the assistant in offline mode instead.
              </p>
              <div className="divider-x" />
              <div className="row">
                <IconShield size={14} style={{ color: 'var(--g-600)' }} />
                <span style={{ fontSize: 'var(--fs-sm)' }}>
                  Offline mode never sends anything anywhere.
                </span>
              </div>
            </Card>

            <Card title="What you can ask DentiBot once connected">
              {['Summarise how the clinic is doing this month',
                'Which patients should we chase for money?',
                'Which treatments earn the most and which are under-sold?',
                'Are there gaps in tomorrow’s schedule?',
                'Write a WhatsApp message to bring back lapsed patients'].map(x => (
                <div className="row" key={x} style={{ alignItems: 'flex-start', padding: '4px 0' }}>
                  <IconSparkle size={11} style={{ color: 'var(--g-600)', marginTop: 3, flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.5 }}>{x}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {tab === 'data' && (
        <div className="grid g-main fade-up">
          <Card title="Where your data lives">
            <p className="muted" style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.65 }}>
              This is a front-end demo. Everything you type is saved in <b>this browser only</b> —
              nothing is sent anywhere, and it will not appear on another computer or in a private
              window. Clearing site data erases it.
            </p>
            <div className="divider-x" />
            <p className="muted" style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.65 }}>
              When the Flask backend is connected, the same screens read and write to PostgreSQL
              instead, and the data follows the clinic across devices.
            </p>
          </Card>

          <Card title="Start over">
            <p className="muted" style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.6, marginBottom: 10 }}>
              Deletes every patient, submission, appointment and visit you have entered. Clinic
              details, team and chairs are cleared too. This cannot be undone.
            </p>
            <button className="btn btn-danger btn-block" onClick={() => setConfirmReset(true)}>
              Clear all data
            </button>
          </Card>
        </div>
      )}

      {/* ---------- Add staff ---------- */}
      {addStaff && (
        <Modal title="Add a team member" onClose={() => setAddStaff(false)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setAddStaff(false)}>Cancel</button>
            <div className="spacer" />
            <button className="btn btn-primary" disabled={!ns.name.trim()} onClick={createStaff}>
              <IconCheck size={13} /> Add
            </button>
          </>}>
          <div className="grid g-2">
            <Field label="Name" span={2}>
              <input className="input" autoFocus value={ns.name} placeholder="e.g. Dr. Priya Raghavan"
                onChange={e => setNs(s => ({ ...s, name: e.target.value }))} />
            </Field>
            <Field label="Role" span={2}>
              <div className="chip-grid">
                {ROLES.map(r => <Chip key={r} on={ns.role === r} onClick={() => setNs(s => ({ ...s, role: r }))}>{r}</Chip>)}
              </div>
            </Field>
            <Field label="Email (optional)">
              <input className="input" value={ns.email} onChange={e => setNs(s => ({ ...s, email: e.target.value }))} />
            </Field>
            <Field label="Speciality (optional)">
              <input className="input" value={ns.spec} placeholder="e.g. Endodontics"
                onChange={e => setNs(s => ({ ...s, spec: e.target.value }))} />
            </Field>
            <Field label="Registration no. (optional)" span={2}>
              <input className="input mono-num" value={ns.reg}
                onChange={e => setNs(s => ({ ...s, reg: e.target.value }))} />
            </Field>
          </div>
        </Modal>
      )}

      {/* ---------- Add chair ---------- */}
      {addChair && (
        <Modal title="Add a chair" onClose={() => setAddChair(false)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setAddChair(false)}>Cancel</button>
            <div className="spacer" />
            <button className="btn btn-primary" disabled={!nc.name.trim()} onClick={createChair}>
              <IconCheck size={13} /> Add
            </button>
          </>}>
          <div className="col" style={{ gap: 12 }}>
            <Field label="Name">
              <input className="input" autoFocus value={nc.name} placeholder="e.g. Chair 2"
                onChange={e => setNc(s => ({ ...s, name: e.target.value }))} />
            </Field>
            <Field label="Used for (optional)">
              <input className="input" value={nc.label} placeholder="e.g. Surgery & implants"
                onChange={e => setNc(s => ({ ...s, label: e.target.value }))} />
            </Field>
          </div>
        </Modal>
      )}

      {/* ---------- Confirm reset ---------- */}
      {confirmReset && (
        <Modal title="Clear all data?" sub="This cannot be undone" onClose={() => setConfirmReset(false)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
            <div className="spacer" />
            <button className="btn btn-danger"
              onClick={() => { dispatch({ type: 'RESET_ALL' }); setConfirmReset(false); toast('All data cleared') }}>
              Yes, clear everything
            </button>
          </>}>
          <div className="lrow" style={{ background: 'var(--a-rose-bg)', borderColor: 'rgba(201,63,74,.2)', alignItems: 'flex-start' }}>
            <IconAlert size={15} style={{ color: 'var(--a-rose)', marginTop: 1 }} />
            <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.55 }}>
              Every patient record, submission, appointment and visit you have entered will be
              permanently deleted from this browser.
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
