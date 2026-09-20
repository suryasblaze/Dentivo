import React, { useState } from 'react'
import { ADULT_ARCH, PRIMARY_ARCH, TOOTH_CONDITIONS, condColor, condLabel, toothName, TOOTH_SURFACES } from '../data/catalog'
import { IconToothFilled } from '../lib/icons'
import { Seg } from './UI'

/* A single tooth cell. Colour = condition. Selected gets a green ring. */
function Tooth({ n, cond, selected, onClick }) {
  const c = cond && cond !== 'healthy' ? condColor(cond) : null
  return (
    <div className={`tooth ${selected ? 'sel' : ''}`}>
      <button className="tooth-svg" onClick={() => onClick(n)} title={`${n} — ${toothName(n)}${cond ? ' · ' + condLabel(cond) : ''}`}>
        <IconToothFilled size={22} color={c || '#DDE1E5'} />
        {cond === 'missing' && (
          <svg width="30" height="38" style={{ position: 'absolute', inset: 0 }}>
            <path d="M7 9 L23 29 M23 9 L7 29" stroke="var(--t-missing)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
        {cond === 'implant' && <span className="tooth-badge" style={{ background: 'var(--t-implant)' }} />}
        {cond === 'planned' && (
          <span className="tooth-badge" style={{ background: 'var(--surface)', border: '2px solid var(--t-planned)' }} />
        )}
      </button>
      <span className="tooth-no mono-num">{n}</span>
    </div>
  )
}

/* ---------------------------------------------------------------
   Odontogram — FDI two-digit notation, adult + primary dentition.
   Click a tooth to select, then pick a condition from the palette.
   --------------------------------------------------------------- */
export default function Odontogram({ marks = {}, onMark, readOnly, compact, onSelect }) {
  const [dentition, setDentition] = useState('adult')
  const [sel, setSel] = useState(null)
  const [brush, setBrush] = useState('caries')
  const [surfaces, setSurfaces] = useState([])

  const arch = dentition === 'adult' ? ADULT_ARCH : PRIMARY_ARCH

  const click = (n) => {
    if (readOnly) { setSel(n); onSelect?.(n); return }
    setSel(n)
    onSelect?.(n)
    onMark?.(n, brush)
  }

  const Row = ({ quads }) => (
    <div className="odo-row">
      <div className="odo-quad">
        {quads[0].map(n => <Tooth key={n} n={n} cond={marks[n]} selected={sel === n} onClick={click} />)}
      </div>
      <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
      <div className="odo-quad">
        {quads[1].map(n => <Tooth key={n} n={n} cond={marks[n]} selected={sel === n} onClick={click} />)}
      </div>
    </div>
  )

  return (
    <div className="odo">
      <div className="card-head" style={{ marginBottom: 14 }}>
        <div>
          <h3>Dental Chart</h3>
          <div className="sub">FDI two-digit notation · {Object.keys(marks).length} teeth charted</div>
        </div>
        <div className="card-head-actions">
          <Seg value={dentition} onChange={setDentition}
            options={[{ value: 'adult', label: 'Adult (32)' }, { value: 'primary', label: 'Primary (20)' }]} />
        </div>
      </div>

      {!readOnly && (
        <div style={{ marginBottom: 16 }}>
          <div className="hint" style={{ marginBottom: 7, fontSize: 11.5, fontWeight: 700, color: 'var(--ink)' }}>
            Select a marker, then click teeth to chart
          </div>
          <div className="chip-grid">
            {TOOTH_CONDITIONS.map(c => (
              <button key={c.key} className="chip" onClick={() => setBrush(c.key)}
                style={brush === c.key
                  ? { background: c.color === 'var(--t-healthy)' ? 'var(--ink)' : c.color, borderColor: 'transparent', color: '#fff' }
                  : undefined}>
                <span className="swatch" style={{ background: c.color }} />{c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="odo-arch">
        <Row quads={arch.upper} />
        <div className="odo-mid">
          <span className="ln" /><span className="lb">RIGHT</span><span className="ln" />
          <span className="lb" style={{ color: 'var(--g-700)' }}>MIDLINE</span>
          <span className="ln" /><span className="lb">LEFT</span><span className="ln" />
        </div>
        <Row quads={arch.lower} />
      </div>

      {sel && (
        <div className="card" style={{ marginTop: 18, background: 'var(--canvas)', borderColor: 'var(--line)' }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <span className="swatch" style={{ width: 16, height: 16, background: marks[sel] ? condColor(marks[sel]) : 'var(--t-healthy)' }} />
            <div>
              <div className="strong" style={{ fontSize: 14 }}>Tooth {sel} — {toothName(sel)}</div>
              <div className="faint" style={{ fontSize: 12 }}>{marks[sel] ? condLabel(marks[sel]) : 'No finding recorded'}</div>
            </div>
            <div className="spacer" />
            {!readOnly && (
              <button className="btn btn-ghost btn-sm" onClick={() => { onMark?.(sel, 'healthy'); setSurfaces([]) }}>
                Clear tooth
              </button>
            )}
          </div>
          {!readOnly && (
            <>
              <div className="hint" style={{ marginBottom: 7, fontWeight: 700, color: 'var(--ink)', fontSize: 11.5 }}>Surfaces involved</div>
              <div className="chip-grid">
                {TOOTH_SURFACES.map(s => (
                  <button key={s} className={`chip ${surfaces.includes(s) ? 'on' : ''}`}
                    onClick={() => setSurfaces(v => v.includes(s) ? v.filter(x => x !== s) : [...v, s])}>{s}</button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="divider" />
      <div className="tooth-legend">
        {TOOTH_CONDITIONS.map(c => (
          <span key={c.key}><i className="swatch" style={{ background: c.color }} />{c.label}</span>
        ))}
      </div>
    </div>
  )
}

/* Small read-only chart used on patient cards and the 360 profile */
export function MiniChart({ marks = {} }) {
  const all = [...ADULT_ARCH.upper.flat(), ...ADULT_ARCH.lower.flat()]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: 2 }}>
      {all.map(n => (
        <div key={n} title={`${n} — ${marks[n] ? condLabel(marks[n]) : 'Healthy'}`}
          style={{
            height: 16, borderRadius: 3,
            background: marks[n] ? condColor(marks[n]) : 'var(--line-2)',
            border: '1px solid var(--line)',
          }} />
      ))}
    </div>
  )
}
