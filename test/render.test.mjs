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
localStorage.setItem('smileflow.v1', JSON.stringify({
  rev: 1,
  user: { id: 'u1', name: 'Clinic Admin', role: 'Owner', short: 'CA', color: '#197E65', roleId: 'r_admin' },
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
  '/whatsapp', '/review', '/done', '/reports', '/settings',
  '/roles', '/subscription', '/requests',
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
  external: ['react', 'react-dom', 'react-dom/server', 'react-router-dom'],
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
