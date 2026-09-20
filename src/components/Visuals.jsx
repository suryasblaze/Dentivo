import React from 'react'

/* Deterministic pseudo-QR — visually convincing without a QR library.
   Same seed always renders the same pattern. */
export function QRCode({ seed = 'smileflow', size = 190, fg = '#14181F' }) {
  const N = 25
  const cell = size / N
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const rand = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296 }

  const isFinder = (x, y) =>
    (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7)

  const cells = []
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (isFinder(x, y)) continue
      if (rand() > 0.55) cells.push(<rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell * 0.92} height={cell * 0.92} rx={cell * 0.28} fill={fg} />)
    }
  }
  const Finder = ({ x, y }) => (
    <g transform={`translate(${x * cell},${y * cell})`}>
      <rect width={cell * 7} height={cell * 7} rx={cell * 1.8} fill="none" stroke={fg} strokeWidth={cell * 1.05} />
      <rect x={cell * 2} y={cell * 2} width={cell * 3} height={cell * 3} rx={cell * 0.9} fill={fg} />
    </g>
  )
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {cells}
      <Finder x={0} y={0} /><Finder x={N - 7} y={0} /><Finder x={0} y={N - 7} />
    </svg>
  )
}

/* Stylised radiograph placeholder — looks like a real IOPA/OPG thumbnail
   without shipping any image assets. */
export function XrayImage({ type = 'IOPA', h = 130, seed = 1 }) {
  const rand = (i) => ((Math.sin(seed * 999 + i * 37) + 1) / 2)
  const teeth = type === 'OPG' ? 14 : 3
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${teeth * 26} 100`} preserveAspectRatio="none"
      style={{ display: 'block', background: '#0C0F12' }}>
      <defs>
        <linearGradient id={`xg${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5B6570" /><stop offset="55%" stopColor="#3A424B" /><stop offset="100%" stopColor="#1A1F24" />
        </linearGradient>
        <filter id={`bl${seed}`}><feGaussianBlur stdDeviation="0.6" /></filter>
      </defs>
      <rect width="100%" height="100" fill="#0C0F12" />
      {/* bone / alveolar band */}
      <rect y="52" width="100%" height="48" fill="#232A31" opacity=".9" />
      <g filter={`url(#bl${seed})`}>
        {Array.from({ length: teeth }).map((_, i) => {
          const x = i * 26 + 3
          const crownH = 26 + rand(i) * 8
          const rootH = 30 + rand(i + 9) * 12
          return (
            <g key={i}>
              <path d={`M${x} 50 v-${crownH} q0-8 10-8 q10 0 10 8 v${crownH} z`} fill={`url(#xg${seed})`} />
              <path d={`M${x + 3} 50 l3 ${rootH} q4 5 8 0 l3 -${rootH} z`} fill="#4A535D" opacity=".85" />
              {rand(i + 3) > 0.68 && <ellipse cx={x + 10} cy={38} rx="5" ry="4" fill="#0E1114" opacity=".8" />}
              {rand(i + 6) > 0.8 && <circle cx={x + 10} cy={50 + rootH} r="4.5" fill="#0A0D10" opacity=".75" />}
            </g>
          )
        })}
      </g>
      <rect width="100%" height="100" fill="url(#vig)" />
    </svg>
  )
}

/* Phone frame used for the WhatsApp bill preview */
export function PhoneFrame({ children }) {
  return (
    <div className="phone">
      <div className="phone-screen">{children}</div>
    </div>
  )
}

/* Animated "sending" dots */
export function Dots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%', background: 'currentColor',
          animation: `fadeUp .6s ${i * 0.15}s infinite alternate`,
        }} />
      ))}
    </span>
  )
}
