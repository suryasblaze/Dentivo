/* The WhatsApp bill must be a real PDF with the right numbers in it. */
import { build } from 'esbuild'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { inflateSync } from 'zlib'

const TMP = join(process.cwd(), 'node_modules', '.pdf-test')
mkdirSync(TMP, { recursive: true })
const posix = (p) => p.replace(/\\/g, '/')

writeFileSync(join(TMP, 'entry.js'),
  `export { billPdf } from '${posix(join(process.cwd(), 'src/lib/pdf.js'))}'
   export { billMessage, reviewUrl } from '${posix(join(process.cwd(), 'src/lib/links.js'))}'`)
await build({
  entryPoints: [join(TMP, 'entry.js')], bundle: true, format: 'esm', platform: 'node',
  outfile: join(TMP, 'bundle.mjs'), external: ['jspdf'], logLevel: 'error',
})
globalThis.window = { location: { origin: 'https://dentivo.test' } }
const { billPdf, billMessage, reviewUrl } = await import('file://' + posix(join(TMP, 'bundle.mjs')))

let pass = 0, fail = 0
const ok = (n, c, got) => { c ? (pass++, console.log('  PASS  ' + n)) : (fail++, console.log('  FAIL  ' + n + (got !== undefined ? '   got: ' + got : ''))) }

const clinic = { name: 'Sree Dental Care', phone: '+91 44 4285 7700', address: 'Anna Nagar, Chennai', googlePlaceUrl: 'https://g.page/sree/review' }
const patient = { name: 'Surya Kumar', uhid: 'P-0001', phone: '9976291294' }
const visit = {
  id: 'v1', date: '2026-09-21', token: 'T-04', reason: 'Swelling',
  invoice: { no: 'INV-0001', date: '2026-09-21', total: 300 },
  payments: [{ mode: 'UPI · Google Pay', amount: 100, ref: 'UTR442912' }],
  rx: [{ name: 'Amoxicillin 500mg', dose: '1-1-1', days: 5 }],
  nextVisit: 'In 1 week',
}
const bill = { done: [{ name: 'IOPA X-ray (single)', tooth: '36', price: 300 }], subtotal: 300, discount: 0, gstAmt: 0, total: 300, paid: 100, due: 200 }

console.log('\n1. Review link')
const link = reviewUrl({ visit, patient, clinic })
ok('points at /r/<visit id>', link.startsWith('https://dentivo.test/r/v1?'), link)
ok('carries clinic, first name and Google link', /c=Sree/.test(link) && /n=Surya/.test(link) && /g=https/.test(link), link)

console.log('\n2. The PDF')
const { blob, file } = billPdf({ clinic, patient, visit, bill, reviewUrl: link })
const bytes = Buffer.from(await blob.arrayBuffer())
ok('is a PDF file', bytes.subarray(0, 5).toString() === '%PDF-', bytes.subarray(0, 8).toString())
ok('has a sensible size', bytes.length > 2000 && bytes.length < 200000, bytes.length + ' bytes')
ok('file name uses invoice and patient', file === 'INV-0001-Surya-Kumar.pdf', file)

/* pull the text out of the (possibly compressed) content streams */
const raw = bytes.toString('latin1')
let text = raw
for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
  try { text += inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1') } catch { /* not compressed */ }
}
for (const needle of ['Sree Dental Care', 'INV-0001', 'Surya Kumar', 'IOPA X-ray', 'Rs. 300', 'Rs. 100', 'Rs. 200', 'Amoxicillin', 'In 1 week']) {
  ok(`contains "${needle}"`, text.includes(needle))
}
ok('review link is a clickable annotation', /\/URI\s*\(https:\/\/dentivo\.test\/r\/v1/.test(raw))

console.log('\n3. The WhatsApp caption')
const msg = billMessage({ clinic, patient, visit, bill, review: link })
ok('greets by first name', msg.startsWith('Hello Surya,'))
ok('mentions the attached bill', msg.includes('INV-0001') && /attached/.test(msg))
ok('shows the balance', msg.includes('Balance'))
ok('ends with the review link', msg.includes(link))

rmSync(TMP, { recursive: true, force: true })
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
