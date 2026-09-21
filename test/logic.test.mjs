/* =========================================================================
   Store logic — reproduces the bugs found in real use, so they stay fixed.
   ========================================================================= */
import { build } from 'esbuild'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'

const TMP = join(process.cwd(), 'node_modules', '.logic-test')
mkdirSync(TMP, { recursive: true })
const posix = (p) => p.replace(/\\/g, '/')

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }
globalThis.window = { location: { pathname: '/', origin: 'https://x.test' }, addEventListener() {}, removeEventListener() {} }

writeFileSync(join(TMP, 'entry.js'),
  `export { reducer, migrate } from '${posix(join(process.cwd(), 'src/store/ClinicStore.jsx'))}'`)
await build({
  entryPoints: [join(TMP, 'entry.js')], bundle: true, format: 'esm', platform: 'node',
  outfile: join(TMP, 'bundle.mjs'), external: ['react', 'react-dom'], jsx: 'automatic',
  loader: { '.png': 'dataurl', '.css': 'empty' }, logLevel: 'error',
})
const { reducer, migrate } = await import('file://' + posix(join(TMP, 'bundle.mjs')))

let pass = 0, fail = 0
const ok = (name, cond, got) => {
  if (cond) { pass++; console.log('  PASS  ' + name) }
  else { fail++; console.log('  FAIL  ' + name + (got !== undefined ? '   got: ' + JSON.stringify(got) : '')) }
}
const run = (s, ...actions) => actions.reduce(reducer, s)

const TODAY = '2026-09-21'
const base = {
  user: { id: 'u1' }, patients: [{ id: 'p1', name: 'Surya', phone: '9976291294', balance: 0, visits: 0 }],
  appointments: [], visits: [], feedback: [], submissions: [], activeVisitId: null,
  seq: { uhid: 1, token: 0, invoice: 0, receipt: 0 }, toasts: [], clinic: {}, staff: [],
}

console.log('\n1. Booking an appointment keeps its id')
/* this is exactly what the booking form sends: id is present but undefined */
let s = run(base, { type: 'ADD_APPOINTMENT', data: { id: undefined, patientId: 'p1', date: TODAY, time: '09:00', status: 'scheduled' } })
ok('appointment has a real id', typeof s.appointments[0].id === 'string' && s.appointments[0].id.length > 0, s.appointments[0].id)

console.log('\n2. Checking in from the appointment marks it arrived')
const apptId = s.appointments[0].id
s = run(s, { type: 'CHECK_IN', patientId: 'p1', appointmentId: apptId, data: { visitType: 'Scheduled appointment' } })
ok('one visit created', s.visits.length === 1, s.visits.length)
ok('appointment marked arrived', s.appointments[0].status === 'arrived', s.appointments[0].status)

console.log('\n3. Clicking Check in again does NOT create another visit')
s = run(s,
  { type: 'CHECK_IN', patientId: 'p1', appointmentId: apptId, data: {} },
  { type: 'CHECK_IN', patientId: 'p1', appointmentId: apptId, data: {} },
  { type: 'CHECK_IN', patientId: 'p1', data: { visitType: 'Walk-in' } })
ok('still exactly one visit after 3 more clicks', s.visits.length === 1, s.visits.length)
ok('token not burned by the extra clicks', s.seq.token === 1, s.seq.token)

console.log('\n4. The invoice number is issued once')
s = run(s,
  { type: 'PLAN_ADD', item: { name: 'IOPA', price: 300, status: 'done' } },
  { type: 'MAKE_INVOICE', invoice: { total: 300 } },
  { type: 'PATCH_VISIT', patch: { discount: 50 } },
  { type: 'MAKE_INVOICE', invoice: { total: 250 } },
  { type: 'MAKE_INVOICE', invoice: { total: 250 } })
ok('same invoice number after 3 updates', s.visits[0].invoice.no === 'INV-0001', s.visits[0].invoice.no)
ok('amount updated to the latest', s.visits[0].invoice.total === 250, s.visits[0].invoice.total)

console.log('\n5. Finishing a visit carries the balance once')
s = run(s, { type: 'ADD_PAYMENT', payment: { mode: 'UPI', amount: 100 } })
s = run(s, { type: 'FINISH_VISIT' })
const afterFirst = s.patients[0].balance
s = run(s, { type: 'SET_ACTIVE_VISIT', id: s.visits[0].id }, { type: 'FINISH_VISIT' })
ok('balance = 150 due', afterFirst === 150, afterFirst)
ok('second finish is ignored', s.patients[0].balance === 150, s.patients[0].balance)
ok('visit closed with a receipt', s.visits[0].stage === 'done' && !!s.visits[0].receiptNo, s.visits[0].stage)

console.log('\n6. After a visit closes, the patient can be checked in again')
s = run(s, { type: 'CHECK_IN', patientId: 'p1', data: { visitType: 'Walk-in' } })
ok('a new second visit exists', s.visits.length === 2, s.visits.length)

console.log('\n7. Repairing data saved by the buggy version')
const broken = {
  ...base,
  appointments: [{ id: undefined, patientId: 'p1', date: TODAY, time: '09:00', status: 'scheduled' }],
  visits: ['v4', 'v3', 'v2', 'v1'].map((id, i) => ({
    id, patientId: 'p1', date: TODAY, stage: 'checkin', token: 'T-0' + (4 - i),
    visitType: 'Scheduled appointment', plan: [], payments: [], teeth: {}, diagnosis: [], invoice: null,
  })),
  patients: [{ id: 'p1', name: 'Surya', visits: 4, balance: 0 }],
}
const fixed = migrate(broken)
ok('4 empty duplicate visits collapse to 1', fixed.visits.length === 1, fixed.visits.length)
ok('the newest one is kept (T-04)', fixed.visits[0].token === 'T-04', fixed.visits[0].token)
ok('patient visit count recounted to 1', fixed.patients[0].visits === 1, fixed.patients[0].visits)
ok('the id-less appointment got an id', !!fixed.appointments[0].id)
ok('and is now marked arrived', fixed.appointments[0].status === 'arrived', fixed.appointments[0].status)

console.log('\n8. A duplicate that has real work in it is never dropped')
const withWork = migrate({
  ...broken,
  visits: [
    { ...broken.visits[0], plan: [] },
    { ...broken.visits[1], plan: [{ name: 'RCT', price: 7000, status: 'done' }] },
  ],
})
ok('the visit with work survives', withWork.visits.some(v => v.plan.length === 1))

console.log('\n9. Visits parked on retired stages move to checkout')
const old = migrate({ ...base, visits: [
  { id: 'a', patientId: 'p1', stage: 'whatsapp', plan: [{ name: 'x', status: 'done' }] },
] })
ok('whatsapp -> billing', old.visits[0].stage === 'billing', old.visits[0].stage)

console.log('\n10. A patient re-rating replaces the earlier rating')
s = run(base,
  { type: 'ADD_FEEDBACK', prebuilt: { id: 'f1', visitId: 'v1', rating: 2 } },
  { type: 'ADD_FEEDBACK', prebuilt: { id: 'f2', visitId: 'v1', rating: 5 } })
ok('one rating per visit', s.feedback.length === 1 && s.feedback[0].rating === 5, s.feedback)

rmSync(TMP, { recursive: true, force: true })
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
