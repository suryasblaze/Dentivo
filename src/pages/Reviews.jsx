import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Stat, Badge, Avatar, Eyebrow, Blank, Seg, Tile, DataRow, Ring } from '../components/UI'
import { useClinic } from '../store/ClinicStore'
import { prettyDate } from '../lib/format'
import { openWhatsApp, reviewUrl } from '../lib/links'
import { IconStar, IconWhatsApp, IconAlert, IconCheck, IconSettings, IconGoogleG, IconClock } from '../lib/icons'

const Stars = ({ n, size = 11 }) => (
  <span className="row" style={{ gap: 1 }}>
    {[1, 2, 3, 4, 5].map(i => <IconStar key={i} size={size} filled={i <= n} />)}
  </span>
)

/* =========================================================================
   Reviews come from patients, on their own phone, from the link in the
   WhatsApp bill. This page only reports what came back.
   ========================================================================= */
export default function Reviews() {
  const { visits, patients, clinic, toast } = useClinic()
  const nav = useNavigate()
  const [filter, setFilter] = useState('all')

  const pt = (id) => patients.find(p => p.id === id)
  const asked = visits.filter(v => v.reviewRequested || v.whatsappSent || v.rating)
  const rated = asked.filter(v => v.rating > 0)
  const happy = rated.filter(v => v.rating >= 4)
  const unhappy = rated.filter(v => v.rating <= 3)
  const avg = rated.length ? (rated.reduce((s, v) => s + v.rating, 0) / rated.length) : 0
  const responseRate = asked.length ? Math.round((rated.length / asked.length) * 100) : 0

  const list = asked.filter(v =>
    filter === 'all' ? true
      : filter === 'waiting' ? !v.rating
        : filter === 'happy' ? v.rating >= 4
          : v.rating > 0 && v.rating <= 3)

  const nudge = (v) => {
    const p = pt(v.patientId)
    const first = (p?.name || '').split(' ')[0]
    const link = reviewUrl({ visit: v, patient: p, clinic })
    const ok = openWhatsApp(p?.phone,
      `Hello ${first}, thank you again for visiting *${clinic.name}*. If you have a moment, how did we do?\n\n${link}`)
    toast(ok ? 'Reminder opened in WhatsApp' : 'No mobile number saved')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Eyebrow>Step 10 · patients</Eyebrow>
          <h1>Reviews</h1>
          <p>Patients rate the visit from the link in their WhatsApp bill. Here is what came back.</p>
        </div>
        <div className="page-head-actions">
          <Seg value={filter} onChange={setFilter} options={[
            { value: 'all', label: 'All' },
            { value: 'waiting', label: `Waiting${asked.length - rated.length ? ` (${asked.length - rated.length})` : ''}` },
            { value: 'happy', label: '4–5★' },
            { value: 'unhappy', label: `1–3★${unhappy.length ? ` (${unhappy.length})` : ''}` },
          ]} />
        </div>
      </div>

      {!clinic.googlePlaceUrl && (
        <div className="lrow" style={{ marginBottom: 10, background: 'var(--a-amber-bg)', borderColor: 'rgba(200,134,13,.25)' }}>
          <IconAlert size={14} style={{ color: 'var(--a-amber)' }} />
          <div style={{ minWidth: 0 }}>
            <div className="strong" style={{ fontSize: 'var(--fs-base)' }}>Add your Google review link</div>
            <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>
              Without it, happy patients can rate you here but cannot be sent on to Google.
            </div>
          </div>
          <div className="spacer" />
          <button className="btn btn-ghost btn-sm" onClick={() => nav('/settings')}><IconSettings size={12} /> Settings</button>
        </div>
      )}

      <div className="stat-row">
        <Stat active label="Average rating" value={rated.length ? avg.toFixed(1) : '—'} unit={rated.length ? '/5' : ''}
          bars={rated.slice(-7).map(v => v.rating).concat(rated.length ? [] : [0])} foot={`${rated.length} rating(s) received`} />
        <Stat label="Links sent" value={String(asked.length)} bars={[0, 0, 0, 0, 0, 0, asked.length ? 1 : 0]}
          foot="With the WhatsApp bill" />
        <Stat label="Response rate" value={String(responseRate)} unit="%"
          bars={[0, 0, 0, 0, 0, 0, responseRate]} foot={`${asked.length - rated.length} still waiting`} />
        <Stat label="Sent on to Google" value={String(happy.length)} bars={[0, 0, 0, 0, 0, 0, happy.length ? 1 : 0]}
          foot={`${unhappy.length} came to you privately`} deltaTone="flat" />
      </div>

      <div className="grid g-main">
        <div>
          {list.length === 0 ? (
            <Blank icon={<IconStar size={20} />}
              title={asked.length ? 'Nothing in this filter' : 'No review links sent yet'}
              action={!asked.length && <button className="btn btn-soft btn-sm" onClick={() => nav('/checkin')}>Go to Check-In</button>}>
              {asked.length
                ? 'Try another filter.'
                : 'Every bill you send on WhatsApp from checkout carries a review link. Ratings land here.'}
            </Blank>
          ) : (
            <div className="col" style={{ gap: 8 }}>
              {list.map(v => {
                const p = pt(v.patientId)
                const sad = v.rating > 0 && v.rating <= 3
                return (
                  <Card key={v.id} style={{
                    padding: 12,
                    borderColor: sad ? 'rgba(201,63,74,.25)' : undefined,
                    background: sad ? 'var(--a-rose-bg)' : undefined,
                  }}>
                    <div className="row" style={{ alignItems: 'flex-start' }}>
                      <Avatar name={p?.name} color="#197E65" size={30} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="row" style={{ gap: 7 }}>
                          <span className="strong" style={{ fontSize: 'var(--fs-md)' }}>{p?.name || 'Unknown'}</span>
                          {v.rating ? <Stars n={v.rating} /> : <Badge><IconClock size={8} />Waiting</Badge>}
                        </div>
                        <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>
                          Visit {prettyDate(v.date)} · {v.invoice?.no || '—'}
                          {v.sentAt ? ` · link sent ${v.sentAt}` : ''}
                          {v.ratedAt ? ` · rated ${prettyDate(v.ratedAt)}` : ''}
                        </div>
                        {v.privateFeedback && (
                          <div style={{ marginTop: 7, fontSize: 'var(--fs-sm)', lineHeight: 1.55, color: 'var(--ink-2)' }}>
                            &ldquo;{v.privateFeedback}&rdquo;
                          </div>
                        )}
                      </div>
                      <div className="col" style={{ gap: 5, alignItems: 'flex-end', flexShrink: 0 }}>
                        {v.rating >= 4 && <Badge tone="green"><IconGoogleG size={9} /> Sent to Google</Badge>}
                        {sad && <Badge tone="red"><IconAlert size={8} /> Needs a call</Badge>}
                        {!v.rating && (
                          <button className="btn btn-ghost btn-sm" onClick={() => nudge(v)}>
                            <IconWhatsApp size={11} color="currentColor" /> Nudge
                          </button>
                        )}
                        {sad && p?.phone && (
                          <a className="btn btn-ghost btn-sm" href={`tel:${p.phone}`}>Call {p.phone}</a>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <div className="col" style={{ gap: 10 }}>
          <Card title="Rating split">
            {rated.length === 0 ? <div className="empty">No ratings yet</div> : (
              <>
                <div className="row" style={{ justifyContent: 'center', padding: '2px 0 10px' }}>
                  <Ring value={(avg / 5) * 100} size={70} thickness={7} label={avg.toFixed(1)} caption="of 5" />
                </div>
                {[5, 4, 3, 2, 1].map(n => {
                  const c = rated.filter(v => v.rating === n).length
                  return (
                    <div className="row" key={n} style={{ gap: 7, padding: '3px 0' }}>
                      <span className="faint mono-num" style={{ fontSize: 'var(--fs-micro)', width: 8 }}>{n}</span>
                      <IconStar size={10} filled />
                      <div className="mbar-track" style={{ flex: 1 }}>
                        <div className="mbar-fill" style={{ width: `${(c / rated.length) * 100}%` }} />
                      </div>
                      <span className="faint mono-num" style={{ fontSize: 'var(--fs-micro)', width: 18, textAlign: 'right' }}>{c}</span>
                    </div>
                  )
                })}
              </>
            )}
          </Card>

          <Card title="How the link works">
            <div style={{ margin: '0 -9px' }}>
              <DataRow lead={<Tile tone="green"><IconWhatsApp size={12} color="currentColor" /></Tile>}
                title="Sent with the bill" sub="From checkout, alongside the PDF" />
              <DataRow lead={<Tile tone="amber"><IconStar size={12} /></Tile>}
                title="Patient taps a rating" sub="On their own phone, ten seconds" />
              <DataRow lead={<Tile tone="blue"><IconGoogleG size={12} /></Tile>}
                title="4–5★ go on to Google" sub="One tap to post publicly" />
              <DataRow lead={<Tile tone="rose"><IconCheck size={12} /></Tile>}
                title="1–3★ reach you first" sub="So you can call and put it right" />
            </div>
            <div className="divider-x" />
            <p className="faint" style={{ fontSize: 'var(--fs-micro)', lineHeight: 1.55 }}>
              Every patient also sees a Google link whatever they rate. Hiding it from unhappy
              patients is review gating, which Google forbids.
            </p>
          </Card>

          <div className="lrow" style={{ alignItems: 'flex-start' }}>
            <IconAlert size={13} style={{ color: 'var(--muted)', marginTop: 2 }} />
            <span className="faint" style={{ fontSize: 'var(--fs-micro)', lineHeight: 1.5 }}>
              Demo limit: a rating only reaches this page when the link is opened in this same
              browser. Real delivery from the patient&apos;s phone needs the backend.
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
