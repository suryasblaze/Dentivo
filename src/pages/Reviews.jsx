import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Stat, Badge, Avatar, Eyebrow, Blank, Seg, Tile, DataRow, Ring } from '../components/UI'
import { useClinic } from '../store/ClinicStore'
import { prettyDate } from '../lib/format'
import { waLink, billLink } from '../lib/links'
import { billOf } from '../lib/bill'
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
  const asked = visits.filter(v => v.reviewRequested || v.rating)
  const rated = asked.filter(v => v.rating > 0)
  const unhappy = rated.filter(v => v.rating <= 3)
  const toGoogle = rated.filter(v => v.reviewRoute === 'google')
  const avg = rated.length ? (rated.reduce((s, v) => s + v.rating, 0) / rated.length) : 0
  const responseRate = asked.length ? Math.round((rated.length / asked.length) * 100) : 0

  const list = asked.filter(v =>
    filter === 'all' ? true
      : filter === 'waiting' ? !v.rating
        : filter === 'happy' ? v.rating >= 4
          : v.rating > 0 && v.rating <= 3)

  const nudge = (v) => {
    const p = pt(v.patientId)
    if (!p?.phone) return toast('No mobile number saved')
    const first = (p.name || '').split(' ')[0]
    const tab = window.open('', '_blank', 'noopener')      // opened inside the click, filled in after
    billLink({ clinic, patient: p, visit: v, bill: billOf(v), askReview: true }).then(link => {
      const url = waLink(p.phone, [
        `Hello ${first}, thank you again for visiting *${clinic.name}*.`,
        'If you have a moment, tell us how we did. It takes 10 seconds:',
        link,
      ].join('\n\n'))
      if (tab) tab.location.href = url
      else window.open(url, '_blank', 'noopener')
    })
    toast('Reminder opened in WhatsApp')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Eyebrow>Step 10 · patients</Eyebrow>
          <h1>Reviews</h1>
          <p>Patients rate the visit from their WhatsApp bill link, and a star tap takes them straight to Google.</p>
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
              Without it, patients can rate you here but cannot be taken to Google.
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
        <Stat label="Opened Google" value={String(toGoogle.length)} bars={[0, 0, 0, 0, 0, 0, toGoogle.length ? 1 : 0]}
          foot={`${rated.filter(v => v.privateFeedback).length} private note(s)`} deltaTone="flat" />
      </div>

      <div className="grid g-main">
        <div>
          {list.length === 0 ? (
            <Blank icon={<IconStar size={20} />}
              title={asked.length ? 'Nothing in this filter' : 'No review links sent yet'}
              action={!asked.length && <button className="btn btn-soft btn-sm" onClick={() => nav('/checkin')}>Go to Check-In</button>}>
              {asked.length
                ? 'Try another filter.'
                : 'When a finished treatment is billed on WhatsApp, the bill link asks for a review. Ratings land here.'}
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
                        {v.reviewRoute === 'google' && <Badge tone="green"><IconGoogleG size={9} /> Opened Google</Badge>}
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

          <Card title="How it works">
            <div style={{ margin: '0 -9px' }}>
              <DataRow lead={<Tile tone="green"><IconWhatsApp size={12} color="currentColor" /></Tile>}
                title="One link with the bill" sub="Bill, PDF and prescription on the patient's phone" />
              <DataRow lead={<Tile tone="amber"><IconStar size={12} /></Tile>}
                title="Only when treatment is finished" sub="Not mid-way through an RCT or braces" />
              <DataRow lead={<Tile tone="blue"><IconGoogleG size={12} /></Tile>}
                title="A star tap opens Google" sub="The patient posts it, signed in as themselves" />
              <DataRow lead={<Tile tone="rose"><IconCheck size={12} /></Tile>}
                title="Private note, if they want" sub="Offered to everyone, alongside Google" />
            </div>
            <div className="divider-x" />
            <p className="faint" style={{ fontSize: 'var(--fs-micro)', lineHeight: 1.55 }}>
              Every patient is offered Google, whatever they rate. Sending only happy patients
              there is review gating, which Google forbids. No app can post a Google review for
              the patient, so Google asks them to tap the stars once more before posting.
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
