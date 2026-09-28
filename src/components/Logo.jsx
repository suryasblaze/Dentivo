import React, { useState } from 'react'
import { IconToothFilled, IconSparkle } from '../lib/icons'

/* =========================================================================
   SRT ReviewFlow — the mark and the wordmark.

   The mark is the artwork in public/logo-mark.png; the name beside it is
   set in type, so it stays sharp at any size and is always spelled right.
   ========================================================================= */

export function LogoMark({ size = 28 }) {
  const [ok, setOk] = useState(true)
  if (!ok) {
    /* if the artwork ever fails to load, the brand still shows up */
    return (
      <span style={{
        width: size, height: size, borderRadius: size * 0.3, flexShrink: 0,
        background: 'linear-gradient(140deg, var(--g-500), var(--g-700))',
        display: 'grid', placeItems: 'center',
      }}>
        <IconToothFilled size={size * 0.56} color="#fff" />
      </span>
    )
  }
  return (
    <img src="/logo-mark.png" alt="SRT ReviewFlow" width={size} height={size}
      style={{ display: 'block', flexShrink: 0, objectFit: 'contain' }}
      onError={() => setOk(false)} />
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
