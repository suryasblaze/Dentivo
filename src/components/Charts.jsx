import React, { useEffect, useId, useRef, useState } from 'react'

/* =========================================================================
   Charts. Drawn in real pixels (measured, never stretched), so dots stay
   round and text stays crisp at any card width. Each chart animates in on
   first paint and when its data changes, and shows a tooltip on hover/tap.
   ========================================================================= */

const useWidth = () => {
  const ref = useRef(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setW(Math.round(el.getBoundingClientRect().width))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

const useMounted = () => {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return on
}

const useSafeId = () => useId().replace(/[^a-zA-Z0-9]/g, '')

/* 0 → a round top value, split into 4 even steps (whole numbers for counts) */
const scale = (max, whole) => {
  if (max <= 0) return { top: whole ? 4 : 100, ticks: whole ? [0, 1, 2, 3, 4] : [0, 25, 50, 75, 100] }
  const raw = max / 4
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  let step = [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw)
  if (whole) step = Math.max(1, Math.ceil(step))
  return { top: step * 4, ticks: [0, 1, 2, 3, 4].map(i => +(step * i).toFixed(6)) }
}

const short = (n) => {
  if (n >= 100000) return (n / 100000).toFixed(1).replace('.0', '') + 'L'
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k'
  return String(n)
}
const rupees = (n) => '₹' + Math.round(n).toLocaleString('en-IN')

/* monotone cubic — smooth, but never dips below zero between two zeros */
const smoothPath = (pts) => {
  const n = pts.length
  if (n < 2) return ''
  const dx = [], m = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0]
    m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]
  }
  const t = [m[0]]
  for (let i = 1; i < n - 1; i++) {
    t[i] = m[i - 1] * m[i] <= 0 ? 0
      : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i])
  }
  t[n - 1] = m[n - 2]
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]
    d += ` C${x0 + dx[i] / 3},${y0 + (t[i] * dx[i]) / 3} ${x1 - dx[i] / 3},${y1 - (t[i + 1] * dx[i]) / 3} ${x1},${y1}`
  }
  return d
}

/* which x-labels to print so they never collide */
const labelEvery = (n, width) => Math.max(1, Math.ceil(n / Math.max(2, Math.floor(width / 44))))

function Tip({ x, y, width, title, value }) {
  const side = x < 70 ? 'left' : x > width - 70 ? 'right' : 'mid'
  return (
    <div className={`ch-tip ${side}`} style={{ left: x, top: y }}>
      <small>{title}</small>
      <b>{value}</b>
    </div>
  )
}

/* ---------------------------------------------------------------- area */
export function LineChart({
  points = [], labels = [], tips, h = 160, color = 'var(--g-600)', money = false, unit = '',
}) {
  const [ref, W] = useWidth()
  const gid = useSafeId()
  const [hi, setHi] = useState(null)
  const fmt = (v) => (money ? rupees(v) : `${v}${unit}${unit && v !== 1 ? "s" : ""}`)

  const padL = money ? 38 : 26, padR = 12, padT = 12, padB = 24
  const { top, ticks } = scale(Math.max(0, ...points), !money)
  const iw = Math.max(0, W - padL - padR), ih = h - padT - padB
  const n = points.length
  const x = (i) => padL + (n > 1 ? (i / (n - 1)) * iw : iw / 2)
  const y = (v) => padT + ih - (v / top) * ih
  const pts = points.map((v, i) => [+x(i).toFixed(1), +y(v).toFixed(1)])
  const line = smoothPath(pts)
  const area = line && `${line} L${pts[n - 1][0]},${padT + ih} L${pts[0][0]},${padT + ih} Z`
  const every = labelEvery(n, iw)
  const dataKey = points.join(',')

  const pick = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - r.left - padL) / (iw || 1)) * (n - 1))
    setHi(Math.min(n - 1, Math.max(0, i)))
  }

  return (
    <div className="chart" ref={ref} style={{ height: h }}>
      {W > 0 && (
        <svg width={W} height={h} onPointerMove={pick} onPointerLeave={() => setHi(null)}>
          <defs>
            <linearGradient id={`a${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity=".28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map(t => (
            <g key={t}>
              <line className={t === 0 ? 'ch-base' : 'ch-grid'} x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} />
              <text className="ch-y" x={padL - 7} y={y(t) + 3} textAnchor="end">{money ? short(t) : t}</text>
            </g>
          ))}

          <g key={dataKey}>
            {area && <path className="ch-area" d={area} fill={`url(#a${gid})`} />}
            {line && <path className="ch-line" d={line} pathLength="1" fill="none" stroke={color}
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
            {n > 0 && hi === null && (
              <g className="ch-last" style={{ color }}>
                <circle className="ch-pulse" cx={pts[n - 1][0]} cy={pts[n - 1][1]} r="9" fill="currentColor" />
                <circle cx={pts[n - 1][0]} cy={pts[n - 1][1]} r="4" fill="var(--surface)" stroke="currentColor" strokeWidth="2.4" />
              </g>
            )}
          </g>

          {hi !== null && (
            <g style={{ color }} pointerEvents="none">
              <line className="ch-cross" x1={pts[hi][0]} x2={pts[hi][0]} y1={padT} y2={padT + ih} />
              <circle cx={pts[hi][0]} cy={pts[hi][1]} r="8" fill="currentColor" opacity=".16" />
              <circle cx={pts[hi][0]} cy={pts[hi][1]} r="4" fill="var(--surface)" stroke="currentColor" strokeWidth="2.4" />
            </g>
          )}

          {labels.map((l, i) => (i % every === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= every / 2 || every === 1) && (
            <text key={i} className={`ch-x ${hi === i ? 'on' : ''}`} x={x(i)} y={h - 6} textAnchor="middle">{l}</text>
          ))}
        </svg>
      )}
      {hi !== null && W > 0 && (
        <Tip x={pts[hi][0]} y={pts[hi][1]} width={W} title={(tips || labels)[hi]} value={fmt(points[hi])} />
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- bars */
export function BarChart({
  points = [], labels = [], tips, h = 150, money = false, unit = '', highlightLast = true,
}) {
  const [ref, W] = useWidth()
  const gid = useSafeId()
  const [hi, setHi] = useState(null)
  const fmt = (v) => (money ? rupees(v) : `${v}${unit}${unit && v !== 1 ? "s" : ""}`)

  const padL = money ? 38 : 24, padR = 6, padT = 12, padB = 24
  const { top, ticks } = scale(Math.max(0, ...points), !money)
  const iw = Math.max(0, W - padL - padR), ih = h - padT - padB
  const n = points.length
  const slot = n ? iw / n : 0
  const bw = Math.max(4, Math.min(34, slot * 0.58))
  const y = (v) => padT + ih - (v / top) * ih
  const cx = (i) => padL + slot * i + slot / 2
  const every = labelEvery(n, iw)
  const dataKey = points.join(',')

  const bar = (i, v) => {
    const hgt = Math.max(3, (v / top) * ih)
    const r = Math.min(6, bw / 2, hgt)
    const x0 = cx(i) - bw / 2, y0 = padT + ih - hgt, x1 = x0 + bw, yb = padT + ih
    return `M${x0},${yb} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x1 - r} Q${x1},${y0} ${x1},${y0 + r} V${yb} Z`
  }

  return (
    <div className="chart" ref={ref} style={{ height: h }}>
      {W > 0 && (
        <svg width={W} height={h} onPointerLeave={() => setHi(null)}>
          <defs>
            <linearGradient id={`b${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--g-500)" />
              <stop offset="100%" stopColor="var(--g-700)" />
            </linearGradient>
          </defs>

          {ticks.map(t => (
            <g key={t}>
              <line className={t === 0 ? 'ch-base' : 'ch-grid'} x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} />
              <text className="ch-y" x={padL - 7} y={y(t) + 3} textAnchor="end">{money ? short(t) : t}</text>
            </g>
          ))}

          <g key={dataKey}>
            {points.map((v, i) => {
              const accent = hi === i || (hi === null && highlightLast && i === n - 1)
              return (
                <path key={i} d={bar(i, v)}
                  className={`ch-bar ${v === 0 ? 'zero' : ''}`}
                  style={{ animationDelay: `${Math.min(i, 30) * 35}ms` }}
                  fill={v === 0 ? 'var(--line)' : accent ? `url(#b${gid})` : 'var(--g-200)'} />
              )
            })}
          </g>

          {/* full-height hit areas, so thin or empty bars are still easy to hover */}
          {points.map((_, i) => (
            <rect key={i} x={padL + slot * i} y={padT} width={slot} height={ih} fill="transparent"
              onPointerEnter={() => setHi(i)} />
          ))}

          {labels.map((l, i) => (i % every === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= every / 2 || every === 1) && (
            <text key={i} className={`ch-x ${hi === i ? 'on' : ''}`} x={cx(i)} y={h - 6} textAnchor="middle">{l}</text>
          ))}
        </svg>
      )}
      {hi !== null && W > 0 && (
        <Tip x={cx(hi)} y={y(points[hi])} width={W} title={(tips || labels)[hi]} value={fmt(points[hi])} />
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- donut */
export function Donut({ segments = [], size = 122, thickness = 14, center }) {
  const on = useMounted()
  const [hi, setHi] = useState(null)
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const gap = segments.filter(s => s.pct > 0).length > 1 ? 3 : 0
  let acc = 0
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} opacity=".5" />
        {segments.map((s, i) => {
          const len = (s.pct / 100) * circ
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
              strokeWidth={hi === i ? thickness + 3 : thickness}
              strokeDasharray={`${on ? Math.max(0, len - gap) : 0} ${circ}`}
              strokeDashoffset={-acc}
              style={{ transition: `stroke-dasharray .9s cubic-bezier(.2,.7,.2,1) ${i * 120}ms, stroke-width .15s` }}
              onPointerEnter={() => setHi(i)} onPointerLeave={() => setHi(null)}>
              {s.label && <title>{`${s.label} · ${Math.round(s.pct)}%`}</title>}
            </circle>
          )
          acc += len
          return el
        })}
      </svg>
      {center && <div className="donut-mid">{center}</div>}
    </div>
  )
}

/* ---------------------------------------------------------------- ring */
export function Ring({ value, size = 54, thickness = 5, label, caption, color = 'var(--g-600)' }) {
  const on = useMounted()
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thickness}
          strokeLinecap="round" strokeDasharray={`${on ? (value / 100) * circ : 0} ${circ}`}
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(.2,.7,.2,1)' }} />
      </svg>
      <div className="ring-mid">
        <b>{label ?? `${value}%`}</b>
        {caption && <small>{caption}</small>}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- ranked bars */
export function RankList({ rows = [], empty = 'No data yet' }) {
  const on = useMounted()
  if (!rows.length) return <div className="empty">{empty}</div>
  const max = Math.max(...rows.map(r => r.value)) || 1
  const total = rows.reduce((s, r) => s + r.value, 0) || 1
  return (
    <div>
      {rows.map((r, i) => (
        <div key={r.name} className="mbar">
          <div className="mbar-top">
            <i className="mbar-dot" style={{ background: r.color || 'var(--g-600)' }} />
            <span className="nm">{r.name}</span>
            <span className="pc">{Math.round((r.value / total) * 100)}%</span>
            <span className="vl">{r.display ?? r.value}</span>
          </div>
          <div className="mbar-track">
            <div className="mbar-fill" style={{
              width: on ? `${(r.value / max) * 100}%` : 0,
              background: r.color || 'var(--g-600)',
              transitionDelay: `${i * 80}ms`,
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}
