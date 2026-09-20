import React from 'react'
import { IconArrowUpRight, IconTrendUp, IconCheck, IconPlus, IconX } from '../lib/icons'

/* ============================================================
   Avatar + stack
   ============================================================ */
export const Avatar = ({ name = '', initials, color = '#197E65', size = 28 }) => (
  <div className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.37 }} title={name}>
    {initials || name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('')}
  </div>
)

export const AvatarStack = ({ people = [], max = 4, size = 24 }) => (
  <div className="astack">
    {people.slice(0, max).map((p, i) => (
      <Avatar key={i} name={p.name} initials={p.short || p.initials} color={p.color || p.avatarColor} size={size} />
    ))}
    {people.length > max && <span className="more">+{people.length - max}</span>}
  </div>
)

/* ============================================================
   Eyebrow label + section header (custom typographic treatment)
   ============================================================ */
export const Eyebrow = ({ children }) => <div className="eyebrow">{children}</div>

export const SectionHead = ({ title, children }) => (
  <div className="sect-head">
    <h2>{title}</h2>
    <span className="rule" />
    {children}
  </div>
)

/* ============================================================
   Card + Panel
   ============================================================ */
export const Card = ({ title, sub, actions, corner, children, className = '', ...p }) => (
  <div className={`card ${className}`} {...p}>
    {(title || actions || corner) && (
      <div className="card-head">
        <div style={{ minWidth: 0 }}>
          {title && <h3>{title}</h3>}
          {sub && <div className="sub">{sub}</div>}
        </div>
        <div className="card-head-actions">
          {actions}
          {corner && <button className="corner-btn"><IconArrowUpRight size={11} /></button>}
        </div>
      </div>
    )}
    {children}
  </div>
)

export const Panel = ({ title, sub, actions, children, className = '', bodyPad = true, ...p }) => (
  <div className={`panel ${className}`} {...p}>
    {(title || actions) && (
      <div className="panel-head">
        <div style={{ minWidth: 0 }}>
          {title && <h3>{title}</h3>}
          {sub && <div className="sub">{sub}</div>}
        </div>
        <div className="spacer" />
        {actions}
      </div>
    )}
    <div className={bodyPad ? 'panel-body' : ''}>{children}</div>
  </div>
)

/* ============================================================
   Icon tile — tinted rounded square, per-category colour
   ============================================================ */
export const Tile = ({ tone = '', size = '', children }) => (
  <span className={`tile ${tone} ${size}`}>{children}</span>
)

/* ============================================================
   STAT TILE — the signature component.
   Number + delta pill + inline sparkbar strip.
   ============================================================ */
export const Stat = ({
  label, value, unit, foot, delta, deltaTone = 'up', bars, active, onClick, tone,
}) => {
  const series = bars || [38, 52, 44, 66, 58, 79, 71]
  const max = Math.max(...series)
  const dTone = deltaTone || (tone === 'down' ? 'down' : 'up')
  return (
    <div className={`stat ${active ? 'is-active' : ''}`} onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <div className="spacer" />
        {delta && (
          <span className={`delta ${dTone}`}>
            <IconTrendUp size={9} style={{ transform: dTone === 'down' ? 'scaleY(-1)' : 'none' }} />
            {delta}
          </span>
        )}
        <button className="corner-btn"><IconArrowUpRight size={11} /></button>
      </div>

      <div className="stat-value">
        {value}{unit && <span className="unit">{unit}</span>}
      </div>

      <div className="sparkbars">
        {series.map((v, i) => (
          <i key={i} className={i === series.length - 1 ? 'now' : v > max * 0.7 ? 'hi' : ''}
            style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />
        ))}
      </div>

      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  )
}

/* ============================================================
   Data row — dense list item with left accent on hover
   ============================================================ */
export const DataRow = ({ lead, title, sub, value, trail, on, onClick, ...p }) => {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`drow ${on ? 'on' : ''}`} onClick={onClick} {...p}>
      {lead}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="drow-t">{title}</div>
        {sub && <div className="drow-s">{sub}</div>}
      </div>
      {value != null && <span className="drow-v">{value}</span>}
      {trail}
    </Tag>
  )
}

/* ============================================================
   Metric bar
   ============================================================ */
export const MetricBar = ({ name, value, pct, color = 'var(--g-600)' }) => (
  <div className="mbar">
    <div className="mbar-top">
      <span className="nm">{name}</span>
      <span className="vl">{value}</span>
    </div>
    <div className="mbar-track">
      <div className="mbar-fill" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  </div>
)

/* ============================================================
   Ring stat — small circular progress
   ============================================================ */
export const Ring = ({ value, size = 54, thickness = 5, label, caption, color = 'var(--g-600)' }) => {
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thickness}
          strokeLinecap="round" strokeDasharray={`${(value / 100) * circ} ${circ}`}
          style={{ transition: 'stroke-dasharray .7s cubic-bezier(.2,.7,.3,1)' }} />
      </svg>
      <div className="ring-mid">
        <b>{label ?? `${value}%`}</b>
        {caption && <small>{caption}</small>}
      </div>
    </div>
  )
}

/* ============================================================
   Switch
   ============================================================ */
export const Switch = ({ on, onChange }) => (
  <button className={`switch ${on ? 'on' : ''}`} onClick={() => onChange?.(!on)}><i /></button>
)

/* ============================================================
   Badge / Field / Chip / Seg / Tabs / Modal
   ============================================================ */
export const Badge = ({ tone = '', dot, children, ...p }) => (
  <span className={`badge ${tone}`} {...p}>{dot && <i className="badge-dot" />}{children}</span>
)

export const Field = ({ label, hint, children, span }) => (
  <div className="field" style={span ? { gridColumn: `span ${span}` } : undefined}>
    {label && <label>{label}</label>}
    {children}
    {hint && <div className="hint">{hint}</div>}
  </div>
)

export const Chip = ({ on, warn, onClick, children }) => (
  <button type="button" className={`chip ${on ? 'on' : ''} ${warn ? 'warn' : ''}`} onClick={onClick}>
    {on && <IconCheck size={10} />}{children}
  </button>
)

export const Seg = ({ options, value, onChange }) => (
  <div className="seg">
    {options.map(o => (
      <button key={o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
    ))}
  </div>
)

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="tabs">
    {tabs.map(t => (
      <button key={t.key} className={`tab ${value === t.key ? 'on' : ''}`} onClick={() => onChange(t.key)}>
        {t.label}
        {t.count != null && <span className="nav-count">{t.count}</span>}
      </button>
    ))}
  </div>
)

export const Modal = ({ title, sub, onClose, footer, wide, children }) => (
  <div className="modal-bg" onClick={onClose}>
    <div className="modal" style={wide ? { maxWidth: 760 } : undefined} onClick={e => e.stopPropagation()}>
      <div className="modal-head">
        <div>
          <h3 style={{ fontSize: 'var(--fs-lg)' }}>{title}</h3>
          {sub && <div className="muted" style={{ fontSize: 'var(--fs-xs)' }}>{sub}</div>}
        </div>
        <div className="spacer" />
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-foot">{footer}</div>}
    </div>
  </div>
)

export const Empty = ({ icon, children }) => (
  <div className="empty">{icon && <div style={{ marginBottom: 6 }}>{icon}</div>}{children}</div>
)

/* ============================================================
   Charts — hand-built SVG, no library
   ============================================================ */
export const BarChart = ({ data, highlight }) => {
  const max = Math.max(...data.map(d => d.treat + d.consult))
  return (
    <div className="bar-chart">
      {data.map(d => {
        const on = d.d === highlight
        return (
          <div key={d.d} className={`bar-col ${on ? 'on' : ''}`} title={`${d.d}: ${d.treat + d.consult}`}>
            <div className="bar-stack">
              <div className="bar-seg" style={{ height: `${(d.consult / max) * 100}%`, background: on ? 'var(--g-300)' : 'var(--g-100)' }} />
              <div className="bar-seg" style={{ height: `${(d.treat / max) * 100}%`, background: on ? 'var(--g-600)' : 'var(--line)' }} />
            </div>
            <span className="bar-lbl">{d.d}</span>
          </div>
        )
      })}
    </div>
  )
}

export const Gauge = ({ value, label, caption, size = 136 }) => {
  const r = size / 2 - 11
  const circ = Math.PI * r
  return (
    <div className="gauge-wrap">
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        <path d={`M11 ${size / 2} A ${r} ${r} 0 0 1 ${size - 11} ${size / 2}`}
          fill="none" stroke="var(--line)" strokeWidth="11" strokeLinecap="round" />
        <path d={`M11 ${size / 2} A ${r} ${r} 0 0 1 ${size - 11} ${size / 2}`}
          fill="none" stroke="var(--g-600)" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${(value / 100) * circ} ${circ}`}
          style={{ transition: 'stroke-dasharray .8s cubic-bezier(.2,.7,.3,1)' }} />
      </svg>
      <div className="gauge-center" style={{ marginTop: -36 }}>
        <b>{value}%</b><small>{label}</small>
      </div>
      {caption && <div className="tooth-legend" style={{ justifyContent: 'center' }}>{caption}</div>}
    </div>
  )
}

export const Donut = ({ segments, size = 122, thickness = 14, center }) => {
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  let acc = 0
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {segments.map((s, i) => {
          const len = (s.pct / 100) * circ
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
              strokeWidth={thickness} strokeDasharray={`${Math.max(0, len - 2)} ${circ - len + 2}`}
              strokeDashoffset={-acc} strokeLinecap="round" />
          )
          acc += len
          return el
        })}
      </svg>
      {center && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{center}</div>}
    </div>
  )
}

export const Spark = ({ points, w = 62, h = 20, color = 'var(--g-600)' }) => {
  const max = Math.max(...points), min = Math.min(...points)
  const rng = max - min || 1
  const d = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / rng) * (h - 3) - 1.5}`).join(' ')
  return (
    <svg width={w} height={h}>
      <polyline points={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={h - ((points[points.length - 1] - min) / rng) * (h - 3) - 1.5} r="2" fill={color} />
    </svg>
  )
}

/* ============================================================
   Empty state — shown everywhere until real data exists
   ============================================================ */
export const Blank = ({ icon, title, children, action }) => (
  <div className="blank">
    {icon && <div className="blank-ico">{icon}</div>}
    <h4>{title}</h4>
    {children && <p>{children}</p>}
    {action}
  </div>
)

/* ============================================================
   Line / area chart for the dashboard analytics
   ============================================================ */
export const LineChart = ({
  points = [], labels = [], h = 150, color = 'var(--g-600)', fill = 'rgba(24,120,74,.10)', money,
}) => {
  const w = 480
  const pad = 22
  const max = Math.max(1, ...points)
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0
  const y = (v) => h - pad - (v / max) * (h - pad * 2)
  const coords = points.map((v, i) => [pad + i * step, y(v)])
  const line = coords.map(([x, yy], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${yy.toFixed(1)}`).join(' ')
  const area = `${line} L${(pad + (points.length - 1) * step).toFixed(1)},${h - pad} L${pad},${h - pad} Z`

  return (
    <div className="lchart">
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} className="grid-line" x1={pad} x2={w - pad}
            y1={pad + t * (h - pad * 2)} y2={pad + t * (h - pad * 2)} />
        ))}
        {points.length > 1 && <path d={area} fill={fill} />}
        {points.length > 1 && <path d={line} fill="none" stroke={color} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />}
        {coords.map(([x, yy], i) => (
          <circle key={i} cx={x} cy={yy} r={i === coords.length - 1 ? 3.5 : 2.5}
            fill={i === coords.length - 1 ? color : 'var(--surface)'} stroke={color} strokeWidth="1.6" />
        ))}
      </svg>
      <div className="row" style={{ justifyContent: 'space-between', padding: '0 18px', marginTop: -4 }}>
        {labels.map(l => (
          <span key={l} className="faint" style={{ fontSize: 'var(--fs-micro)', fontWeight: 700 }}>{l}</span>
        ))}
      </div>
    </div>
  )
}

/* Horizontal ranked bar list — used for "top procedures", "sources" */
export const RankList = ({ rows = [], empty = 'No data yet' }) => {
  if (!rows.length) return <div className="empty">{empty}</div>
  const max = Math.max(...rows.map(r => r.value))
  return (
    <div>
      {rows.map(r => (
        <div key={r.name} className="mbar">
          <div className="mbar-top">
            <span className="nm">{r.name}</span>
            <span className="vl">{r.display ?? r.value}</span>
          </div>
          <div className="mbar-track">
            <div className="mbar-fill" style={{ width: `${(r.value / max) * 100}%`, background: r.color || 'var(--g-600)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ============================================================
   Chip group with a free-text "Other" escape hatch.
   Options may be strings or {key,label,critical}. Anything the
   user types is stored in the same array as a plain string, so
   nothing downstream needs to change.
   ============================================================ */
export function ChipsWithOther({
  options = [], value = [], onChange, warn, exclusiveKey,
  placeholder = 'Type it and press Enter',
}) {
  const norm = options.map(o => (typeof o === 'string' ? { key: o, label: o } : o))
  const known = new Set(norm.map(o => o.key))
  const custom = (value || []).filter(v => !known.has(v))
  const [showOther, setShowOther] = React.useState(custom.length > 0)
  const [draft, setDraft] = React.useState('')

  const toggle = (k) => {
    if (exclusiveKey && k === exclusiveKey) return onChange([k])
    const base = exclusiveKey ? (value || []).filter(v => v !== exclusiveKey) : (value || [])
    onChange(base.includes(k) ? base.filter(v => v !== k) : [...base, k])
  }

  const addCustom = () => {
    const t = draft.trim()
    if (!t) return
    if (!(value || []).includes(t)) {
      const base = exclusiveKey ? (value || []).filter(v => v !== exclusiveKey) : (value || [])
      onChange([...base, t])
    }
    setDraft('')
  }

  return (
    <>
      <div className="chip-grid">
        {norm.map(o => (
          <Chip key={o.key} warn={warn || o.critical} on={(value || []).includes(o.key)}
            onClick={() => toggle(o.key)}>{o.label}</Chip>
        ))}

        {custom.map(c => (
          <button key={c} type="button" className={`chip on ${warn ? 'warn' : ''}`}
            onClick={() => onChange((value || []).filter(v => v !== c))}
            title="Remove">
            {c} <IconX size={10} />
          </button>
        ))}

        <button type="button" className={`chip ${showOther ? 'on' : ''}`}
          onClick={() => setShowOther(v => !v)}>
          <IconPlus size={10} /> Other
        </button>
      </div>

      {showOther && (
        <div className="row fade-up" style={{ gap: 6, marginTop: 7 }}>
          <input className="input" value={draft} placeholder={placeholder} autoFocus
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
            onBlur={addCustom} />
          <button type="button" className="btn btn-soft btn-sm" disabled={!draft.trim()}
            onClick={addCustom} style={{ flexShrink: 0 }}>Add</button>
        </div>
      )}
    </>
  )
}
