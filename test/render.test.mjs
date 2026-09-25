/* =========================================================================
   Renders the real app in Node and walks every route.

   A passing build only proves the files parse. This proves they RUN — it is
   exactly what would have caught "EMPTY is not defined" before deploying.
   ========================================================================= */
import { build } from 'esbuild'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'

const TMP = join(process.cwd(), 'node_modules', '.render-test')
mkdirSync(TMP, { recursive: true })
const posix = (p) => p.replace(/\\/g, '/')

/* ---------- browser globals the app touches while rendering ---------- */
class LS {
  constructor() { this.m = new Map() }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null }
  setItem(k, v) { this.m.set(k, String(v)) }
  removeItem(k) { this.m.delete(k) }
}
globalThis.localStorage = new LS()

/* seed a signed-in session so protected routes render their real page
   instead of bouncing to the login screen */
/* and a patient mid-visit, so checkout, payments and reviews render with data */
const TODAY = new Date().toISOString().slice(0, 10)
localStorage.setItem('smileflow.v1', JSON.stringify({
  rev: 1,
  user: { id: 'u1', name: 'Clinic Admin', role: 'Owner', short: 'CA', color: '#197E65', roleId: 'r_admin' },
  clinic: { name: 'Test Dental', upiId: 'test@upi', googlePlaceUrl: 'https://g.page/test/review' },
  patients: [{ id: 'p1', uhid: 'P-0001', name: 'Surya Kumar', phone: '9976291294', balance: 0, visits: 1 }],
  visits: [{
    id: 'v1', patientId: 'p1', date: TODAY, stage: 'billing', token: 'T-01', arrivedAt: '10:00 am',
    visitType: 'Walk-in', teeth: { 36: 'caries' }, diagnosis: ['Dental caries'], findings: [],
    plan: [{ code: 'D0220', name: 'IOPA X-ray', price: 300, gst: 0, tooth: '36', status: 'done' }],
    rx: [], payments: [{ mode: 'UPI', amount: 100, at: '10:30 am', ref: 'UTR1' }],
    invoice: { no: 'INV-0001', date: TODAY, total: 300 }, discount: 0, whatsappSent: true, reviewRequested: true,
  }],
  feedback: [{ id: 'f1', visitId: 'v1', rating: 2, text: 'Waited too long', date: TODAY }],
  appointments: [{ id: 'a1', patientId: 'p1', date: TODAY, time: '09:00', mins: 30, status: 'scheduled' }],
  activeVisitId: 'v1',
}))

globalThis.window = {
  location: { pathname: '/', origin: 'https://example.test', href: 'https://example.test/' },
  addEventListener() {}, removeEventListener() {}, open() {}, print() {},
  matchMedia: () => ({ matches: false, addListener() {}, removeListener() {} }),
}
globalThis.document = { addEventListener() {}, removeEventListener() {}, getElementById: () => null }
/* Node 22 defines navigator as a getter-only global */
Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: { writeText: async () => {} } },
  configurable: true, writable: true,
})

const ROUTES = [
  '/intake', '/dashboard', '/link', '/submissions', '/patients', '/appointments',
  '/checkin', '/consultation', '/treatment', '/billing', '/payment',
  '/review', '/reports', '/settings', '/roles', '/subscription', '/requests',
  '/r/v1?c=Test%20Dental&n=Surya&g=https%3A%2F%2Fg.page%2Ftest%2Freview',
  '/b/v1#' + Buffer.from(JSON.stringify({
    v: 1, c: { n: 'Test Dental', a: 'Chennai', p: '044 1234', u: 'test@upi', r: 'https://g.page/r/test/review' },
    p: { n: 'Surya Kumar', id: 'P-0001' }, i: { no: 'INV-0001', d: '2026-09-21', t: 'T-01' },
    l: [['IOPA X-ray', '36', 300]], m: [300, 0, 0, 300, 100, 200], pay: [['UPI', 100]],
    rx: [['Amoxicillin 500mg', '1-1-1', 5]], nx: 'In 1 week', ask: 1,
  })).toString('base64url'),
  '/b/v1#cut-short',
  '/go/demo', '/go/other?c=Sree%20Dental&g=https%3A%2F%2Fg.page%2Fr%2Fx%2Freview',
  '/reviewflow', '/reviewflow/scan',
  '/autopilot',
]

const entry = join(TMP, 'entry.jsx')
writeFileSync(entry, `
import React from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import App from '${posix(join(process.cwd(), 'src/App.jsx'))}'

export function renderRoute(path) {
  return renderToString(
    React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App))
  )
}
`)

await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: join(TMP, 'bundle.mjs'),
  loader: { '.png': 'dataurl', '.css': 'empty' },
  external: ['react', 'react-dom', 'react-dom/server', 'react-router-dom', 'jspdf', 'qrcode-generator'],
  jsx: 'automatic',
  logLevel: 'error',
})

const mod = await import('file://' + posix(join(TMP, 'bundle.mjs')))

let pass = 0, fail = 0
const caught = []
const realErr = console.error
console.error = (...a) => { caught.push(a.map(String).join(' ')) }   // React reports here

for (const route of ROUTES) {
  globalThis.window.location.pathname = route
  caught.length = 0
  try {
    const html = mod.renderRoute(route)
    /* noise that does not indicate a broken page */
    const real = caught.filter(e =>
      !/useLayoutEffect|not wrapped in act|validateDOMNesting|unique "key"|defaultProps/i.test(e))
    if (real.length) { fail++; realErr(`  FAIL  ${route.padEnd(15)} ${real[0].slice(0, 130)}`) }
    else if (!html || html.length < 40) { fail++; realErr(`  FAIL  ${route.padEnd(15)} rendered empty`) }
    else { pass++; realErr(`  PASS  ${route.padEnd(15)} ${html.length} chars`) }
  } catch (e) {
    fail++; realErr(`  FAIL  ${route.padEnd(15)} ${e.message}`)
  }
}

console.error = realErr
rmSync(TMP, { recursive: true, force: true })
console.log(`\n${pass} routes rendered, ${fail} failed`)
process.exit(fail ? 1 : 0)
