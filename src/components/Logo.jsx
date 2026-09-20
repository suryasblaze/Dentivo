import React, { useState } from 'react'
import { IconToothFilled } from '../lib/icons'

/* =========================================================================
   Brand marks. Files live in /public — swap them there and every
   placement updates. If a file is missing, a drawn fallback is used so
   the app never shows a broken image.
   ========================================================================= */

/* Icon only — sidebar, tablet screens, small spots */
export function LogoMark({ size = 28 }) {
  const [ok, setOk] = useState(true)
  if (!ok) {
    return (
      <span style={{
        width: size, height: size, borderRadius: size * 0.32, background: 'var(--g-600)',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        <IconToothFilled size={size * 0.58} color="#fff" />
      </span>
    )
  }
  return (
    <img src="/logo-mark.png" alt="Dentivo" width={size} height={size}
      style={{ display: 'block', flexShrink: 0, objectFit: 'contain' }}
      onError={() => setOk(false)} />
  )
}

/* Stacked mark + wordmark + tagline — login and the public patient form */
export function LogoFull({ width = 220 }) {
  const [ok, setOk] = useState(true)
  if (!ok) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <LogoMark size={34} />
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.035em', color: 'var(--ink)' }}>
          Dentivo
        </span>
      </div>
    )
  }
  return (
    <img src="/logo-full.png" alt="Dentivo — smart dental care, simplified"
      style={{ width, height: 'auto', display: 'block' }}
      onError={() => setOk(false)} />
  )
}

/* Horizontal wordmark only, no mark */
export function LogoWordmark({ width = 150 }) {
  const [ok, setOk] = useState(true)
  if (!ok) {
    return (
      <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.035em', color: 'var(--ink)' }}>
        Dentivo
      </span>
    )
  }
  return (
    <img src="/logo-wordmark.png" alt="Dentivo" style={{ width, height: 'auto', display: 'block' }}
      onError={() => setOk(false)} />
  )
}

/* ---------- DentiBot: the assistant's own face ---------- */
export function BotMark({ size = 28 }) {
  const [ok, setOk] = useState(true)
  if (!ok) {
    return (
      <span style={{
        width: size, height: size, borderRadius: size * 0.3, background: 'var(--g-600)',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        <IconToothFilled size={size * 0.56} color="#fff" />
      </span>
    )
  }
  return (
    <img src="/bot-mark.png" alt="DentiBot" width={size} height={size}
      style={{ display: 'block', flexShrink: 0, objectFit: 'contain' }}
      onError={() => setOk(false)} />
  )
}

export function BotFull({ width = 190 }) {
  const [ok, setOk] = useState(true)
  if (!ok) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
        <BotMark size={34} />
        <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.035em', color: 'var(--ink)' }}>
          DentiBot
        </span>
      </div>
    )
  }
  return (
    <img src="/bot-full.png" alt="DentiBot" style={{ width, height: 'auto', display: 'block', margin: '0 auto' }}
      onError={() => setOk(false)} />
  )
}
