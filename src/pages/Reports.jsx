import React, { useState } from 'react'
import { Card, Stat, Eyebrow, Blank, LineChart, RankList, Donut, Seg, Tile, DataRow, Ring } from '../components/UI'
import { useClinic } from '../store/ClinicStore'
import { inr, inrShort, prettyDate, localISO } from '../lib/format'
import { IconChart, IconUsers, IconStar, IconFile } from '../lib/icons'

const seriesDays = (n) => {
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push({ iso: localISO(d), label: d.toLocaleDateString('en-IN', { day: 'numeric' }) })
  }
  return out
}

export default function Reports() {
  const { visits, patients, submissions } = useClinic()
  const [range, setRange] = useState(14)

  const days = seriesDays(range)
  const revenue = days.map(d => visits.filter(v => v.date === d.iso)
    .reduce((s, v) => s + (v.payments || []).reduce((x, p) => x + Number(p.amount || 0), 0), 0))
  const count = days.map(d => visits.filter(v => v.date === d.iso).length)
  const axis = days.filter((_, i) => i % Math.ceil(range / 7) === 0).map(d => d.label)

  const totalRevenue = revenue.reduce((a, b) => a + b, 0)
  const totalVisits = visits.length
  const collectedAll = visits.reduce((s, v) =>
    s + (v.payments || []).reduce((x, p) => x + Number(p.amount || 0), 0), 0)
  const avgTicket = totalVisits ? Math.round(collectedAll / totalVisits) : 0
  const dues = patients.reduce((s, p) => s + Number(p.balance || 0), 0)

  /* revenue by speciality */
  const mix = {}
  visits.forEach(v => (v.plan || []).filter(p => p.status === 'done')
    .forEach(p => { mix[p.cat || 'Other'] = (mix[p.cat || 'Other'] || 0) + Number(p.price || 0) }))
  const mixTotal = Object.values(mix).reduce((a, b) => a + b, 0)
  const mixRows = Object.entries(mix).sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name, value, display: inr(value),
      color: ['var(--g-600)', 'var(--g-400)', 'var(--g-300)', 'var(--g-200)', 'var(--line)'][i % 5],
    }))

  /* most done procedures */
  const procs = {}
  visits.forEach(v => (v.plan || []).filter(p => p.status === 'done')
    .forEach(p => { procs[p.name] = (procs[p.name] || 0) + 1 }))
  const procRows = Object.entries(procs).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value, display: value + 'x' }))

  /* payment methods */
  const modes = {}
  visits.forEach(v => (v.payments || []).forEach(p => {
    const k = String(p.mode).split(' ')[0]
    modes[k] = (modes[k] || 0) + Number(p.amount || 0)
  }))
  const modeRows = Object.entries(modes).map(([name, value], i) => ({
    name, value, display: inr(value),
    color: ['var(--g-600)', 'var(--a-blue)', 'var(--a-amber)', 'var(--a-violet)'][i % 4],
  }))

  /* feedback */
  const rated = visits.filter(v => v.rating > 0)
  const avgRating = rated.length ? (rated.reduce((s, v) => s + v.rating, 0) / rated.length).toFixed(1) : '0'
  const toGoogle = rated.filter(v => v.reviewRoute === 'google').length
  const privateFb = rated.filter(v => v.reviewRoute === 'private').length
  const closed = visits.filter(v => v.stage === 'done').length

  /* where patients came from */
  const fromLink = submissions.filter(s => s.status === 'converted').length
  const sourceRows = [
    { name: 'Intake link / QR', value: fromLink, display: String(fromLink), color: 'var(--g-600)' },
    { name: 'Added at the desk', value: Math.max(0, patients.length - fromLink), display: String(Math.max(0, patients.length - fromLink)), color: 'var(--g-300)' },
  ].filter(r => r.value > 0)

  if (visits.length === 0) {
    return (
      <>
        <div className="page-head">
          <div>
            <Eyebrow>Analysis</Eyebrow>
            <h1>Reports</h1>
            <p>Everything here is calculated from visits you record</p>
          </div>
        </div>
        <Blank icon={<IconChart size={20} />} title="No data to report yet">
          Complete one visit — check in, treat, bill, take payment — and every chart on this page
          starts working.
        </Blank>
      </>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Eyebrow>Analysis</Eyebrow>
          <h1>Reports</h1>
          <p>Calculated from {totalVisits} recorded visit{totalVisits === 1 ? '' : 's'}</p>
        </div>
        <div className="page-head-actions">
          <Seg value={range} onChange={setRange} options={[
            { value: 7, label: '7 days' }, { value: 14, label: '14 days' }, { value: 30, label: '30 days' },
          ]} />
        </div>
      </div>

      <div className="stat-row">
        <Stat active label="Collected" value={totalRevenue ? inrShort(totalRevenue) : '₹0'}
          bars={revenue.slice(-7)} foot={`Last ${range} days`} />
        <Stat label="Visits" value={String(totalVisits)} bars={count.slice(-7)}
          foot={`${patients.length} patients registered`} />
        <Stat label="Average per visit" value={avgTicket ? inrShort(avgTicket) : '₹0'}
          bars={count.slice(-7)} foot="Collected, not billed" />
        <Stat label="Outstanding" value={dues ? inrShort(dues) : '₹0'} deltaTone="down"
          bars={[0, 0, 0, 0, 0, 0, dues ? 1 : 0]}
          foot={dues ? 'Across patient accounts' : 'Nothing pending'} />
      </div>

      <div className="grid g-2" style={{ marginBottom: 10 }}>
        <Card title="Collections" sub={`Last ${range} days`} corner>
          <LineChart points={revenue} labels={axis} h={170} />
        </Card>
        <Card title="Visits per day" sub={`Last ${range} days`} corner>
          <LineChart points={count} labels={axis} h={170}
            color="var(--a-blue)" fill="rgba(43,99,217,.10)" />
        </Card>
      </div>

      <div className="grid g-3" style={{ marginBottom: 10 }}>
        <Card title="Revenue by speciality" corner>
          {mixRows.length ? (
            <div className="row" style={{ gap: 12 }}>
              <Donut size={92} thickness={11}
                segments={mixRows.map(r => ({ pct: (r.value / mixTotal) * 100, color: r.color }))} />
              <div style={{ flex: 1, minWidth: 0 }}><RankList rows={mixRows} /></div>
            </div>
          ) : <div className="empty">No completed procedures yet</div>}
        </Card>

        <Card title="Most done procedures" corner>
          <RankList rows={procRows} empty="No procedures completed yet" />
        </Card>

        <Card title="Payment methods" corner>
          <RankList rows={modeRows} empty="No payments recorded yet" />
        </Card>
      </div>

      <div className="grid g-3">
        <Card title="Patient feedback" corner>
          {rated.length === 0 ? <div className="empty">No ratings captured yet</div> : (
            <>
              <div className="row" style={{ justifyContent: 'center', padding: '4px 0 10px' }}>
                <Ring value={(Number(avgRating) / 5) * 100} size={72} thickness={7} label={avgRating} caption="of 5" />
              </div>
              <div className="divider-x" />
              <div style={{ margin: '0 -9px' }}>
                <DataRow lead={<Tile tone="green"><IconStar size={12} /></Tile>} title="Sent to Google" value={toGoogle} />
                <DataRow lead={<Tile tone="amber"><IconFile size={12} /></Tile>} title="Private feedback" value={privateFb} />
                <DataRow lead={<Tile tone="slate"><IconUsers size={12} /></Tile>} title="Not rated"
                  value={Math.max(0, closed - rated.length)} />
              </div>
            </>
          )}
        </Card>

        <Card title="How patients arrived" corner>
          <RankList rows={sourceRows} empty="No patients yet" />
        </Card>

        <Card title="Recent visits" corner>
          {visits.slice(0, 7).map(v => {
            const p = patients.find(x => x.id === v.patientId)
            const vp = (v.payments || []).reduce((s, x) => s + Number(x.amount || 0), 0)
            return (
              <div className="rcp-line" key={v.id}>
                <span className="lb" style={{ fontSize: 'var(--fs-sm)' }}>
                  {prettyDate(v.date)} · {p?.name || '—'}
                </span>
                <span className="vl">{inr(vp)}</span>
              </div>
            )
          })}
        </Card>
      </div>
    </>
  )
}
