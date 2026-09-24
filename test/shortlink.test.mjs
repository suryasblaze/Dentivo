/* Short bill links, against a stand-in for Supabase's REST API.
   Proves the whole loop before any real project exists: the clinic stores a
   bill, the link is short, and the patient's phone reads it back. */
import { build } from 'esbuild'
import { createServer } from 'http'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'

const TMP = join(process.cwd(), 'node_modules', '.short-test')
mkdirSync(TMP, { recursive: true })
const posix = (p) => p.split('\\').join('/')

/* ---- a fake Supabase: one table, insert and select by id ---- */
const rows = new Map()
const seen = []
const server = createServer((req, res) => {
  seen.push(`${req.method} ${req.url}`)
  const auth = req.headers.apikey === 'test-anon-key'
  if (!auth) { res.writeHead(401).end('{}'); return }
  if (req.method === 'POST') {
    let body = ''
    req.on('data', c => { body += c })
    req.on('end', () => {
      const { id, data } = JSON.parse(body)
      rows.set(id, data)
      res.writeHead(201, { 'content-type': 'application/json' }).end('[]')
    })
    return
  }
  const id = decodeURIComponent(new URL(req.url, 'http://x').searchParams.get('id')?.replace('eq.', '') || '')
  const row = rows.get(id)
  res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(row ? [{ data: row }] : []))
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`

writeFileSync(join(TMP, 'entry.js'),
  `export { billLink, readBillLink } from '${posix(join(process.cwd(), 'src/lib/links.js'))}'
   export { shortLinksReady } from '${posix(join(process.cwd(), 'src/lib/shortlink.js'))}'`)
await build({
  entryPoints: [join(TMP, 'entry.js')], bundle: true, format: 'esm', platform: 'node',
  outfile: join(TMP, 'bundle.mjs'), logLevel: 'error',
  define: { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: base, VITE_SUPABASE_ANON_KEY: 'test-anon-key' }) },
})
globalThis.window = { location: { origin: 'https://dentivo.test' } }
const { billLink, readBillLink, shortLinksReady } = await import('file://' + posix(join(TMP, 'bundle.mjs')))

let pass = 0, fail = 0
const ok = (n, c, got) => { c ? (pass++, console.log('  PASS  ' + n)) : (fail++, console.log('  FAIL  ' + n + (got !== undefined ? '   got: ' + got : ''))) }

const clinic = { name: 'Sree Dental Care', address: 'Anna Nagar, Chennai', phone: '+91 44 4285 7700', upiId: 'sree@okaxis', googlePlaceUrl: 'https://g.page/r/sree/review' }
const patient = { name: 'Surya Kumar', uhid: 'P-0001' }
const visit = { id: 'v47js9j0', date: '2026-09-24', token: 'T-01', invoice: { no: 'INV-0001', date: '2026-09-24' }, payments: [], rx: [{ name: 'Amoxicillin 500mg', dose: '1-0-1', days: 5 }], nextVisit: 'In 1 week' }
const bill = { done: [{ name: 'Consultation & Oral Examination', price: 300 }, { name: 'OPG / Panoramic X-ray', price: 800 }], subtotal: 1100, discount: 0, gstAmt: 0, total: 1100, paid: 0, due: 1100 }

console.log('\n1. With a project configured')
ok('short links are switched on', shortLinksReady())
const link = await billLink({ clinic, patient, visit, bill, askReview: true })
ok('no bill inside the link', !link.includes('#'), link)
ok('short enough to read out', link.length < 45, `${link.length} chars — ${link}`)
ok('the id is unguessable', /\/b\/[a-z2-9]{8}$/.test(link), link)
ok('the bill was stored once', rows.size === 1 && seen.some(s => s.startsWith('POST')))

console.log('\n2. What the patient opens')
const id = link.split('/b/')[1]
const back = await readBillLink('', id)
ok('reads back the same bill', back?.bill.total === 1100 && back.bill.done.length === 2, JSON.stringify(back?.bill?.total))
ok('carries the clinic, patient and invoice', back?.clinic.name === 'Sree Dental Care' && back?.patient.name === 'Surya Kumar' && back?.visit.invoice.no === 'INV-0001')
ok('carries the prescription and review flag', back?.visit.rx[0].name === 'Amoxicillin 500mg' && back?.askReview === true)
ok('an unknown id gives nothing, not a crash', (await readBillLink('', 'zzzzzzzz')) === null)

console.log('\n3. Two bills never collide')
const second = await billLink({ clinic, patient, visit: { ...visit, id: 'v2' }, bill, askReview: false })
ok('a different ticket each time', second !== link && rows.size === 2)
ok('each opens its own bill', (await readBillLink('', second.split('/b/')[1]))?.askReview === false)

server.close()
rmSync(TMP, { recursive: true, force: true })
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
