/* The bill link, the PDF and the WhatsApp message must carry the right numbers. */
import { build } from 'esbuild'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { inflateSync } from 'zlib'

const TMP = join(process.cwd(), 'node_modules', '.pdf-test')
mkdirSync(TMP, { recursive: true })
const posix = (p) => p.replace(/\\/g, '/')

writeFileSync(join(TMP, 'entry.js'),
  `export { billPdf } from '${posix(join(process.cwd(), 'src/lib/pdf.js'))}'
   export { billMessage, billLink, billLinkSync, readBillLink, googleReviewUrl, isLocalLink, shortReviewUrl, reviewOnlyMessage } from '${posix(join(process.cwd(), 'src/lib/links.js'))}'`)
await build({
  entryPoints: [join(TMP, 'entry.js')], bundle: true, format: 'esm', platform: 'node',
  outfile: join(TMP, 'bundle.mjs'), external: ['jspdf'], logLevel: 'error',
})
globalThis.window = { location: { origin: 'https://dentivo.test' } }
const { billPdf, billMessage, billLink, billLinkSync, readBillLink, googleReviewUrl, isLocalLink, shortReviewUrl, reviewOnlyMessage } = await import('file://' + posix(join(TMP, 'bundle.mjs')))

let pass = 0, fail = 0
const ok = (n, c, got) => { c ? (pass++, console.log('  PASS  ' + n)) : (fail++, console.log('  FAIL  ' + n + (got !== undefined ? '   got: ' + got : ''))) }

const GOOGLE = 'https://g.page/r/sree/review'
const clinic = { name: 'Sree Dental Care', phone: '+91 44 4285 7700', address: 'Anna Nagar, Chennai', upiId: 'sree@okaxis', googlePlaceUrl: GOOGLE }
const patient = { name: 'Surya Kumar', uhid: 'P-0001', phone: '9976291294' }
const visit = {
  id: 'v1', date: '2026-09-21', token: 'T-04', reason: 'Swelling',
  invoice: { no: 'INV-0001', date: '2026-09-21', total: 300 },
  payments: [{ mode: 'UPI · Google Pay', amount: 100, ref: 'UTR442912' }],
  rx: [{ name: 'Amoxicillin 500mg', dose: '1-1-1', days: 5 }],
  nextVisit: 'In 1 week',
}
const bill = { done: [{ name: 'IOPA X-ray (single)', tooth: '36', price: 300 }], subtotal: 300, discount: 0, gstAmt: 0, total: 300, paid: 100, due: 200 }
const hashOf = (url) => url.slice(url.indexOf('#'))

console.log('\n1. The bill link')
const link = await billLink({ clinic, patient, visit, bill, askReview: true })
ok('points at /b/<visit id>#…', link.startsWith('https://dentivo.test/b/v1#'), link.slice(0, 40))
const plain = billLinkSync({ clinic, patient, visit, bill, askReview: true })
ok('compressed link is much shorter than the raw one', link.length < plain.length * 0.75, `${link.length} vs ${plain.length} chars`)
ok('fits comfortably in a WhatsApp message', link.length < 1200, link.length + ' chars')
const back = await readBillLink(hashOf(link))
ok('decodes back to the same bill',
  back && back.bill.total === 300 && back.bill.due === 200 && back.bill.done[0].name === 'IOPA X-ray (single)',
  JSON.stringify(back?.bill))
ok('carries the prescription and next visit', back?.visit.rx[0].name === 'Amoxicillin 500mg' && back?.visit.nextVisit === 'In 1 week')
ok('carries the UPI ID and Google link', back?.clinic.upiId === 'sree@okaxis' && back?.clinic.google === GOOGLE)
ok('review flag survives both ways',
  back?.askReview === true && (await readBillLink(hashOf(await billLink({ clinic, patient, visit, bill, askReview: false })))).askReview === false)
ok('an uncompressed link still opens', (await readBillLink(hashOf(plain)))?.bill.total === 300)
const tamil = await readBillLink(hashOf(await billLink({ clinic: { ...clinic, name: 'ஸ்ரீ பல் மருத்துவமனை' }, patient, visit, bill })))
ok('Tamil text survives the round trip', tamil?.clinic.name === 'ஸ்ரீ பல் மருத்துவமனை', tamil?.clinic.name)
ok('a cut-off link returns null, not a crash', (await readBillLink('#jeyJ2IjoxLCJj')) === null && (await readBillLink('#zBROKEN')) === null)
ok('a localhost link is spotted', isLocalLink('http://localhost:5199/b/v1#x') && !isLocalLink('https://dentivo.vercel.app/b/v1#x'))
ok('a bare Place ID becomes a write-review link',
  googleReviewUrl({ googlePlaceUrl: 'ChIJN1t_tDeuEmsRUsoyG83frY4' }) ===
  'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4')

console.log('\n1b. The short review link')
const listed = shortReviewUrl({ ...clinic, slug: 'sree' }, { listed: true })
ok('is short and readable', listed === 'https://dentivo.test/go/sree', listed)
ok('is far shorter than the bill link', listed.length < link.length / 5, `${listed.length} vs ${link.length} chars`)
const unlisted = shortReviewUrl({ ...clinic, slug: 'sree' })
ok('an unlisted clinic still works', unlisted.includes('c=Sree') && unlisted.includes('g=https'), unlisted)
ok('no slug, no short link', shortReviewUrl(clinic) === '')
const only = reviewOnlyMessage({ clinic, patient, link: listed })
ok('review-only message carries just the short link',
  only.includes(listed) && !only.includes('INV-0001') && (only.match(/https?:\/\//g) || []).length === 1)

console.log('\n2. The PDF')
const { blob, file } = billPdf({ clinic, patient, visit, bill, reviewUrl: GOOGLE })
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
ok('Google review link is clickable', raw.includes('/URI (' + GOOGLE))

console.log('\n3. The WhatsApp message')
const msg = billMessage({ clinic, patient, visit, bill, link, askReview: true })
ok('greets by first name', msg.startsWith('Hello Surya,'))
ok('shows invoice, total and balance', msg.includes('INV-0001') && msg.includes('₹300') && msg.includes('Balance'))
ok('contains exactly one link', (msg.match(/https?:\/\//g) || []).length === 1)
ok('asks how we did only when asked to',
  msg.includes('how we did') && !billMessage({ clinic, patient, visit, bill, link, askReview: false }).includes('how we did'))

rmSync(TMP, { recursive: true, force: true })
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
