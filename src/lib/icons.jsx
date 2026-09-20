/* Hand-built icon set. Stroke icons inherit currentColor so they
   flip to white inside the solid-green active nav pill. */
import React from 'react'

const S = ({ size = 18, children, fill = 'none', sw = 1.7, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>{children}</svg>
)

/* ---- Dental-specific ---- */
export const IconTooth = (p) => (
  <S {...p}>
    <path d="M12 5.2c1.6-1.5 4-2 5.5-.8 1.7 1.4 1.7 4.2 1.1 6.6-.5 2-.7 3.4-1 5.3-.3 1.8-.7 3.7-1.9 3.7-1.3 0-1.4-2.3-1.8-4.3-.3-1.5-.6-2.6-1.9-2.6s-1.6 1.1-1.9 2.6c-.4 2-.5 4.3-1.8 4.3-1.2 0-1.6-1.9-1.9-3.7-.3-1.9-.5-3.3-1-5.3-.6-2.4-.6-5.2 1.1-6.6C8 3.2 10.4 3.7 12 5.2Z" />
  </S>
)
export const IconToothFilled = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 5.2c1.6-1.5 4-2 5.5-.8 1.7 1.4 1.7 4.2 1.1 6.6-.5 2-.7 3.4-1 5.3-.3 1.8-.7 3.7-1.9 3.7-1.3 0-1.4-2.3-1.8-4.3-.3-1.5-.6-2.6-1.9-2.6s-1.6 1.1-1.9 2.6c-.4 2-.5 4.3-1.8 4.3-1.2 0-1.6-1.9-1.9-3.7-.3-1.9-.5-3.3-1-5.3-.6-2.4-.6-5.2 1.1-6.6C8 3.2 10.4 3.7 12 5.2Z" />
  </svg>
)
export const IconXray = (p) => (
  <S {...p}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M12 7v10M8.5 9.5v5M15.5 9.5v5" /></S>
)
export const IconRx = (p) => (
  <S {...p}><path d="M7 20V9h3.5a2.75 2.75 0 0 1 0 5.5H7" /><path d="M11 14.5 17 20M17 14.5 11 20" /><path d="M7 9V5h10" /></S>
)
export const IconStethoscope = (p) => (
  <S {...p}><path d="M6 3v5a4 4 0 0 0 8 0V3" /><path d="M4 3h3M13 3h3" /><path d="M10 12v2a5 5 0 0 0 5 5 4 4 0 0 0 4-4v-1" /><circle cx="19" cy="11" r="2" /></S>
)
export const IconChair = (p) => (
  <S {...p}><path d="M4 14V7a2 2 0 0 1 4 0v7" /><path d="M4 14h13a3 3 0 0 1 3 3v1H4z" /><path d="M6 18v3M18 18v3" /></S>
)

/* ---- Navigation ---- */
export const IconGrid = (p) => (
  <S {...p}><rect x="3" y="3" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" /></S>
)
export const IconUsers = (p) => (
  <S {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.2 6-5.2s6 1.9 6 5.2" /><path d="M16 5.3a3.2 3.2 0 0 1 0 5.4M18 19.6c0-2.4-.9-4-2.4-4.9" /></S>
)
export const IconQueue = (p) => (
  <S {...p}><path d="M4 6h16M4 12h11M4 18h7" /><circle cx="19" cy="15" r="3" /></S>
)
export const IconReceipt = (p) => (
  <S {...p}><path d="M5 3h14v18l-2.3-1.6-2.3 1.6-2.4-1.6L9.6 21l-2.3-1.6L5 21z" /><path d="M9 8h6M9 12h6" /></S>
)
export const IconChart = (p) => (
  <S {...p}><path d="M3 21h18" /><rect x="5" y="11" width="3.5" height="7" rx="1.2" /><rect x="10.2" y="6" width="3.5" height="12" rx="1.2" /><rect x="15.5" y="14" width="3.5" height="4" rx="1.2" /></S>
)
export const IconCalendar = (p) => (
  <S {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></S>
)
export const IconSettings = (p) => (
  <S {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1Z" /></S>
)
export const IconHelp = (p) => (
  <S {...p}><circle cx="12" cy="12" r="9" /><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4.9c0 1.9-2.7 2.4-2.7 4" /><path d="M12 17.5h.01" /></S>
)
export const IconLogout = (p) => (
  <S {...p}><path d="M9 21H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h3" /><path d="M16 17l5-5-5-5M21 12H9" /></S>
)

/* ---- Actions / status ---- */
export const IconSearch = (p) => (<S {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></S>)
export const IconBell = (p) => (<S {...p}><path d="M18 8a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 14 18 8Z" /><path d="M13.7 19a2 2 0 0 1-3.4 0" /></S>)
export const IconArrowUpRight = (p) => (<S {...p}><path d="M8 16 16 8M9 8h7v7" /></S>)
export const IconArrowRight = (p) => (<S {...p}><path d="M5 12h14M13 6l6 6-6 6" /></S>)
export const IconArrowLeft = (p) => (<S {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></S>)
export const IconTrendUp = (p) => (<S {...p} sw={2}><path d="M4 16l5-5 3 3 7-7" /><path d="M14 7h5v5" /></S>)
export const IconCheck = (p) => (<S {...p} sw={2.4}><path d="m5 12.5 4.5 4.5L19 7" /></S>)
export const IconPlus = (p) => (<S {...p} sw={2}><path d="M12 5v14M5 12h14" /></S>)
export const IconX = (p) => (<S {...p} sw={2}><path d="M6 6l12 12M18 6 6 18" /></S>)
export const IconClock = (p) => (<S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5.2l3.2 2" /></S>)
export const IconPhone = (p) => (<S {...p}><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M10.5 18.5h3" /></S>)
export const IconQr = (p) => (
  <S {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3h-3zM20 14h1M14 20h3M20 17v4" /></S>
)
export const IconWhatsApp = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2a9.9 9.9 0 0 0-8.5 15L2 22l5.2-1.4A9.9 9.9 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20Zm4.5-5.9c-.2-.1-1.4-.7-1.7-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5 0a6.5 6.5 0 0 1-1.9-1.2 7.3 7.3 0 0 1-1.4-1.7c-.1-.3 0-.4.1-.5l.4-.5.2-.4v-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3A2.9 2.9 0 0 0 7 9.9a5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c.6.3 1.1.4 1.5.5a3.5 3.5 0 0 0 1.6.1 2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z" />
  </svg>
)
export const IconStar = ({ size = 40, filled = false, color = '#E0A11B' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill={filled ? color : 'none'} stroke={filled ? color : '#D6D9DD'} strokeWidth="1.5" strokeLinejoin="round">
    <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z" />
  </svg>
)
export const IconGoogleG = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6Z" />
    <path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9a7 7 0 0 1-10.4-3.7H1.7v3a11.5 11.5 0 0 0 10.3 6.4Z" />
    <path fill="#FBBC05" d="M5.5 14.1a6.9 6.9 0 0 1 0-4.4v-3H1.7a11.5 11.5 0 0 0 0 10.4l3.8-3Z" />
    <path fill="#EA4335" d="M12 5.1a6.2 6.2 0 0 1 4.4 1.7l3.3-3.3A11 11 0 0 0 12 .5 11.5 11.5 0 0 0 1.7 6.9l3.8 3A6.9 6.9 0 0 1 12 5.1Z" />
  </svg>
)
export const IconFile = (p) => (<S {...p}><path d="M14 3v5h5" /><path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7Z" /></S>)
export const IconShield = (p) => (<S {...p}><path d="M12 2.8 4.5 6v6c0 4.5 3.1 8.2 7.5 9.3 4.4-1.1 7.5-4.8 7.5-9.3V6Z" /><path d="m9 12 2 2 4-4" /></S>)
export const IconAlert = (p) => (<S {...p}><path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></S>)
export const IconPrint = (p) => (<S {...p}><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></S>)
export const IconRupee = (p) => (<S {...p}><path d="M7 4h10M7 8.5h10M7 13h4c2.5 0 4.5-1.9 4.5-4.2S13.5 4 11 4" /><path d="M7 13l7 7" /></S>)
export const IconCard = (p) => (<S {...p}><rect x="2.5" y="5" width="19" height="14" rx="3" /><path d="M2.5 10h19M6.5 15h3" /></S>)
export const IconCash = (p) => (<S {...p}><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><circle cx="12" cy="12" r="2.6" /><path d="M6 12h.01M18 12h.01" /></S>)
export const IconUpi = (p) => (<S {...p}><path d="m5 12 5-8 4 8-4 8z" /><path d="m13 12 5-8-5 16" /></S>)
export const IconEdit = (p) => (<S {...p}><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m15 6 3 3" /></S>)
export const IconEye = (p) => (<S {...p}><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.8" /></S>)
export const IconDownload = (p) => (<S {...p}><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5" /><path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" /></S>)
export const IconSparkle = (p) => (<S {...p}><path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9Z" /><path d="M19 4v3M17.5 5.5h3" /></S>)
export const IconHeart = (p) => (<S {...p}><path d="M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5-7.5 9.6-7.5 9.6Z" /></S>)
export const IconBranch = (p) => (<S {...p}><path d="M4 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6M2 21h20" /></S>)
export const IconChevronDown = (p) => (<S {...p} sw={2}><path d="m6 9 6 6 6-6" /></S>)
export const IconChevronRight = (p) => (<S {...p} sw={2}><path d="m9 6 6 6-6 6" /></S>)
export const IconPause = (p) => (<S {...p} sw={2}><path d="M8 5v14M16 5v14" /></S>)
export const IconPlay = ({ size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z" /></svg>)

export const IconMail = (p) => (
  <S {...p}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="m3 7 9 6 9-6" /></S>
)
export const IconEyeOff = (p) => (
  <S {...p}><path d="M2 12s3.6-6.5 10-6.5c1.6 0 3 .4 4.2 1M22 12s-3.6 6.5-10 6.5c-1.7 0-3.2-.5-4.4-1.1" /><path d="M3 3l18 18" /><path d="M9.5 9.7a2.8 2.8 0 0 0 4 3.9" /></S>
)

export const IconLock = (p) => (
  <S {...p}><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></S>
)

export const IconExpand = (p) => (
  <S {...p} sw={2}><path d="M4 9V4h5M20 15v5h-5M15 4h5v5M9 20H4v-5" /></S>
)
export const IconCollapse = (p) => (
  <S {...p} sw={2}><path d="M9 4v5H4M15 20v-5h5M20 9h-5V4M4 15h5v5" /></S>
)
