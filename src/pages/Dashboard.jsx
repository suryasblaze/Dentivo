import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Stat, Badge, Avatar, Tile, DataRow, Eyebrow, SectionHead,
  LineChart, RankList, Donut, Ring, Blank, MetricBar,
} from '../components/UI'
import { useClinic } from '../store/ClinicStore'
import { inr, inrShort, greeting, todayLong, prettyDate } from '../lib/format'
import {
  IconQr, IconFile, IconUsers, IconCalendar, IconQueue, IconRupee, IconStar,
  IconArrowRight, IconPlus, IconCheck, IconTooth, IconReceipt, IconAlert,
} from '../lib/icons'

const last7 = () => {
  const out = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push({ iso: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2) })
  }
  return out
}

export default function Dashboard() {
  const { user, clinic, patients, submissions, appointments, visits, dispatch, toast } = useClinic()
  const nav = useNavigate()
  const today = new Date().toISOString().slice(0, 10)

  /* ---------- everything below is computed from real entered data ---------- */
  const days = last7()
  const revenueByDay = days.map(d =>
    visits.filter(v => v.date === d.iso)
      .reduce((s, v) => s + (v.payments || []).reduce((x, p) => x + Number(p.amount || 0), 0), 0))
  const patientsByDay = days.map(d => visits.filter(v => v.date === d.iso).length)

  const todayVisits = visits.filter(v => v.date === today)
  const collectedToday = todayVisits.reduce((s, v) =>
    s + (v.payments || []).reduce((x, p) => x + Number(p.amount || 0), 0), 0)
  const billedToday = todayVisits.reduce((s, v) => s + (v.invoice?.total || 0), 0)
  const inClinic = visits.filter(v => v.stage !== 'done')
  const newSubs = submissions.filter(s => s.status === 'new')
  const scheduled = appointments.filter(a => a.status === 'scheduled' && a.date === today)
  const totalDues = patients.reduce((s, p) => s + Number(p.balance || 0), 0)

  /* treatment mix from completed procedures */
  const mix = {}
  visits.forEach(v => (v.plan || []).filter(p => p.status === 'done').forEach(p => {
    mix[p.cat || 'Other'] = (mix[p.cat || 'Other'] || 0) + Number(p.price || 0)
  }))
  const mixRows = Object.entries(mix).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, value], i) => ({
      name, value, display: inr(value),
      color: ['var(--g-600)', 'var(--g-400)', 'var(--g-300)', 'var(--g-200)', 'var(--line)'][i],
    }))

  /* top procedures by count */
  const procCount = {}
  visits.forEach(v => (v.plan || []).filter(p => p.status === 'done').forEach(p => {
    procCount[p.name] = (procCount[p.name] || 0) + 1
  }))
  const topProcs = Object.entries(procCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, value]) => ({ name, value, display: `${value}×` }))

  /* ratings */
  const rated = visits.filter(v => v.rating > 0)
  const avgRating = rated.length ? (rated.reduce((s, v) => s + v.rating, 0) / rated.length).toFixed(1) : '—'
  const toGoogle = rated.filter(v => v.reviewRoute === 'google').length

  const hasData = visits.length > 0 || patients.length > 0

  return (
    <>
      <div className="page-head">
        <div>
          <Eyebrow>{todayLong()}</Eyebrow>
          <h1>{greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p>{clinic.name}{clinic.branch ? ` · ${clinic.branch}` : ''}</p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => nav('/link')}><IconQr size={12} /> Intake QR</button>
          <button className="btn btn-primary btn-sm" onClick={() => nav('/patients')}><IconPlus size={12} /> New patient</button>
        </div>
      </div>

      {/* ---------- First-run guidance ---------- */}
      {!hasData && (
        <Card style={{ marginBottom: 12 }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <Tile tone="solid" size="lg"><IconArrowRight size={16} /></Tile>
            <div>
              <div className="strong" style={{ fontSize: 'var(--fs-lg)' }}>Nothing here yet — start with one patient</div>
              <div className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
                Every number and graph on this page fills in from what you enter.
              </div>
            </div>
          </div>
          <div className="grid g-4" style={{ gap: 8 }}>
            {[
              ['green', IconQr, '1 · Share the link', 'Open the QR page and let a patient fill their details', '/link'],
              ['blue', IconFile, '2 · Check submissions', 'Turn a submission into a patient record', '/submissions'],
              ['violet', IconQueue, '3 · Check them in', 'Scheduled or straight walk-in', '/checkin'],
              ['amber', IconReceipt, '4 · Treat and bill', 'Consultation → treatment → billing → payment', '/consultation'],
            ].map(([tone, Icon, t, d, to]) => (
              <button key={t} className="card" style={{ textAlign: 'left', padding: 12 }} onClick={() => nav(to)}>
                <Tile tone={tone}><Icon size={13} /></Tile>
                <div className="strong" style={{ fontSize: 'var(--fs-base)', margin: '7px 0 2px' }}>{t}</div>
                <div className="faint" style={{ fontSize: 'var(--fs-micro)', lineHeight: 1.45 }}>{d}</div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* ---------- KPIs ---------- */}
      <div className="stat-row">
        <Stat active label="Patients today" value={String(todayVisits.length)}
          bars={patientsByDay.length ? patientsByDay : [0, 0, 0, 0, 0, 0, 0]}
          foot={`${patients.length} registered in total`} />
        <Stat label="Collected today" value={collectedToday ? inrShort(collectedToday) : '₹0'}
          bars={revenueByDay} foot={billedToday ? `${inr(billedToday - collectedToday)} uncollected` : 'No bills raised yet'} />
        <Stat label="In clinic now" value={String(inClinic.length)}
          bars={[0, 0, 0, 0, 0, 0, inClinic.length]} foot={`${newSubs.length} new submissions waiting`} />
        <Stat label="Average rating" value={avgRating} unit={avgRating === '—' ? '' : '/5'}
          bars={rated.length ? rated.slice(-7).map(v => v.rating) : [0, 0, 0, 0, 0, 0, 0]}
          foot={rated.length ? `${toGoogle} sent to Google` : 'No ratings captured yet'} />
      </div>

      {/* ---------- Charts ---------- */}
      <div className="grid g-main" style={{ marginBottom: 10 }}>
        <Card title="Collections — last 7 days" sub="From payments actually recorded" corner>
          {revenueByDay.some(v => v > 0) ? (
            <>
              <LineChart points={revenueByDay} labels={days.map(d => d.label)} h={160} />
              <div className="divider-x" />
              <div className="grid g-4" style={{ gap: 0 }}>
                {[
                  ['7-day total', inr(revenueByDay.reduce((a, b) => a + b, 0))],
                  ['Best day', inr(Math.max(...revenueByDay))],
                  ['Daily average', inr(Math.round(revenueByDay.reduce((a, b) => a + b, 0) / 7))],
                  ['Outstanding', inr(totalDues)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="faint" style={{ fontSize: 'var(--fs-micro)', fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>{k}</div>
                    <div className="strong mono-num" style={{ fontSize: 'var(--fs-md)' }}>{v}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Blank icon={<IconRupee size={20} />} title="No collections yet"
              action={<button className="btn btn-soft btn-sm" onClick={() => nav('/checkin')}>Start a visit</button>}>
              Once you record a payment, this chart shows the last seven days.
            </Blank>
          )}
        </Card>

        <Card title="Today at a glance" corner>
          <div style={{ margin: '0 -9px' }}>
            {[
              ['green', IconFile, 'New submissions', newSubs.length, '/submissions'],
              ['blue', IconCalendar, 'Scheduled today', scheduled.length, '/appointments'],
              ['violet', IconQueue, 'In clinic', inClinic.length, '/checkin'],
              ['amber', IconUsers, 'Total patients', patients.length, '/patients'],
              ['rose', IconAlert, 'Outstanding dues', totalDues ? inr(totalDues) : '₹0', '/billing'],
            ].map(([tone, Icon, t, v, to]) => (
              <DataRow key={t} onClick={() => nav(to)} lead={<Tile tone={tone}><Icon size={13} /></Tile>}
                title={t} value={v}
                trail={<IconArrowRight size={12} style={{ color: 'var(--faint)' }} />} />
            ))}
          </div>
        </Card>
      </div>

      {/* ---------- Analysis row ---------- */}
      <SectionHead title="Analysis" />
      <div className="grid g-3" style={{ marginBottom: 10 }}>
        <Card title="Visits per day" sub="Last 7 days" corner>
          {patientsByDay.some(v => v > 0)
            ? <LineChart points={patientsByDay} labels={days.map(d => d.label)} h={130}
                color="var(--a-blue)" fill="rgba(43,99,217,.10)" />
            : <Blank icon={<IconUsers size={18} />} title="No visits yet">Check a patient in to start the chart.</Blank>}
        </Card>

        <Card title="Revenue by speciality" sub="Completed procedures" corner>
          {mixRows.length ? (
            <div className="row" style={{ gap: 12 }}>
              <Donut size={96} thickness={12}
                segments={mixRows.map(r => ({
                  pct: (r.value / mixRows.reduce((s, x) => s + x.value, 0)) * 100, color: r.color,
                }))}
                center={<div>
                  <div className="strong mono-num" style={{ fontSize: 'var(--fs-md)' }}>
                    {inrShort(mixRows.reduce((s, x) => s + x.value, 0))}
                  </div>
                  <div className="faint" style={{ fontSize: 'var(--fs-micro)' }}>total</div>
                </div>} />
              <div style={{ flex: 1, minWidth: 0 }}><RankList rows={mixRows} /></div>
            </div>
          ) : <Blank icon={<IconTooth size={18} />} title="No treatments yet">Complete a procedure to see the mix.</Blank>}
        </Card>

        <Card title="Top procedures" sub="By how often they are done" corner>
          <RankList rows={topProcs} empty="No procedures completed yet" />
        </Card>
      </div>

      {/* ---------- Live lists ---------- */}
      <div className="grid g-2">
        <Card title="In clinic now" sub={`${inClinic.length} active`}
          actions={<button className="btn btn-soft btn-sm" onClick={() => nav('/checkin')}>Check-in <IconArrowRight size={11} /></button>}>
          {inClinic.length === 0
            ? <Blank icon={<IconQueue size={18} />} title="Nobody in the clinic"
                action={<button className="btn btn-soft btn-sm" onClick={() => nav('/checkin')}>Check someone in</button>}>
                Patients appear here from the moment they are checked in.
              </Blank>
            : <div style={{ margin: '0 -9px' }}>
              {inClinic.map(v => {
                const p = patients.find(x => x.id === v.patientId)
                return (
                  <DataRow key={v.id} onClick={() => { dispatch({ type: 'SET_ACTIVE_VISIT', id: v.id }); nav('/' + v.stage) }}
                    lead={<Avatar name={p?.name} color="#197E65" size={24} />}
                    title={p?.name} sub={`${v.token} · ${v.reason || v.visitType}`}
                    trail={<Badge tone="green" dot>{v.stage}</Badge>} />
                )
              })}
            </div>}
        </Card>

        <Card title="New submissions" sub="From the intake link"
          actions={<button className="btn btn-soft btn-sm" onClick={() => nav('/submissions')}>Open <IconArrowRight size={11} /></button>}>
          {newSubs.length === 0
            ? <Blank icon={<IconQr size={18} />} title="No submissions"
                action={<button className="btn btn-soft btn-sm" onClick={() => nav('/link')}>Show the QR</button>}>
                Share the intake link — what patients type lands here.
              </Blank>
            : <div style={{ margin: '0 -9px' }}>
              {newSubs.slice(0, 6).map(s => (
                <DataRow key={s.id} onClick={() => nav('/submissions')}
                  lead={<Tile tone="green"><IconFile size={13} /></Tile>}
                  title={s.name} sub={`${s.phone} · ${s.issue}`}
                  trail={<span className="faint" style={{ fontSize: 'var(--fs-micro)' }}>{s.time}</span>} />
              ))}
            </div>}
        </Card>
      </div>
    </>
  )
}
