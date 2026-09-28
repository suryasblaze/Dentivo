import React from 'react'
import { IconToothFilled, IconSparkle } from '../lib/icons'

/* =========================================================================
   SRT ReviewFlow — the mark and the wordmark.

   Drawn rather than loaded as images, so the logo takes the brand colour
   from the stylesheet and stays sharp at any size.
   ========================================================================= */

export function LogoMark({ size = 28 }) {
  return (
    <span
      aria-label="SRT ReviewFlow"
      style={{
        width: size, height: size, borderRadius: size * 0.3, flexShrink: 0,
        background: 'linear-gradient(140deg, var(--g-500), var(--g-700))',
        display: 'grid', placeItems: 'center',
        boxShadow: `0 ${size * 0.12}px ${size * 0.3}px -${size * 0.14}px rgba(14, 124, 138, .55)`,
      }}
    >
      <IconToothFilled size={size * 0.56} color="#fff" />
    </span>
  )
}

/* The name on its own: SRT in brand colour, ReviewFlow in ink. */
export function LogoWordmark({ width = 150 }) {
  const size = Math.max(13, width * 0.13)
  return (
    <span style={{
      fontSize: size, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1,
      whiteSpace: 'nowrap', color: 'var(--ink)',
    }}>
      <span style={{ color: 'var(--g-600)' }}>SRT</span> ReviewFlow
    </span>
  )
}

/* Mark and name together, with the parent brand above it. */
export function LogoFull({ width = 190, stacked = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: width * 0.05 }}>
      <LogoMark size={width * 0.19} />
      <span style={{ lineHeight: 1.15 }}>
        {stacked && (
          <small style={{
            display: 'block', fontSize: width * 0.045, fontWeight: 800,
            letterSpacing: '.16em', color: 'var(--faint)',
          }}>
            SRT DIGITAL SOLUTIONS
          </small>
        )}
        <LogoWordmark width={width * 0.82} />
      </span>
    </div>
  )
}

/* ---------- The assistant's own face ---------- */
export function BotMark({ size = 28 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(140deg, var(--g-400), var(--g-700))',
      display: 'grid', placeItems: 'center',
    }}>
      <IconSparkle size={size * 0.52} color="#fff" />
    </span>
  )
}

export function BotFull({ width = 190 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
      <BotMark size={Math.max(28, width * 0.18)} />
      <span style={{ fontSize: Math.max(16, width * 0.1), fontWeight: 800, letterSpacing: '-.035em', color: 'var(--ink)' }}>
        SRT Assistant
      </span>
    </div>
  )
}
