/* mock localStorage exactly as a browser behaves */
class LS {
  constructor(){ this.m = new Map() }
  getItem(k){ return this.m.has(k) ? this.m.get(k) : null }
  setItem(k,v){ this.m.set(k, String(v)) }
  removeItem(k){ this.m.delete(k) }
  clear(){ this.m.clear() }
}
globalThis.localStorage = new LS()

const P = await import('../src/store/persist.js')
const EMPTY = { patients: [], submissions: [], visits: [], clinic: { name: 'Your Clinic Name' }, toasts: [] }

let pass = 0, fail = 0
const ok = (name, cond, extra='') => {
  if (cond) { pass++; console.log('  PASS  ' + name) }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')) }
}

console.log('\n1. A fresh browser starts empty')
ok('nothing stored yet', P.readRaw() === null)
let state = P.load(EMPTY)
ok('load returns the empty shape', state.patients.length === 0)

console.log('\n2. Typing details saves them')
state = { ...state,
  clinic: { name: 'Sree Dental Care', phone: '+91 44 4285 7700', upiId: 'sree@okicici' },
  patients: [{ id:'p1', uhid:'P-0001', name:'Ramesh Kumar', phone:'9840011223', balance:3500 }],
}
ok('save reported success', P.save(state) === true)
ok('it is really in storage', P.readRaw().patients[0].name === 'Ramesh Kumar')

console.log('\n3. Refreshing the page (new module instance, same storage)')
const fresh = P.load(EMPTY)
ok('patient survived the refresh', fresh.patients[0].name === 'Ramesh Kumar')
ok('clinic details survived', fresh.clinic.name === 'Sree Dental Care')
ok('UPI id survived', fresh.clinic.upiId === 'sree@okicici')
ok('balance survived as a number', fresh.patients[0].balance === 3500)

console.log('\n4. Toasts are deliberately NOT persisted')
P.save({ ...fresh, toasts: [{ id: 1, text: 'hello' }] })
ok('toasts stripped before writing', (P.readRaw().toasts ?? undefined) === undefined)

console.log('\n5. Adding more does not lose what was there')
let s2 = P.load(EMPTY)
s2 = { ...s2, patients: [...s2.patients, { id:'p2', name:'Lakshmi Devi' }] }
P.save(s2)
ok('both patients present', P.load(EMPTY).patients.length === 2)

console.log('\n6. The public intake page can only append')
const before = P.load(EMPTY)
P.appendSubmission({ id:'s1', name:'Divya M', phone:'9876500000', issue:'Braces', status:'new' })
const after = P.load(EMPTY)
ok('submission was added', after.submissions.length === 1)
ok('existing patients untouched', after.patients.length === before.patients.length)
ok('clinic details untouched', after.clinic.name === before.clinic.name)

console.log('\n7. A stale tab cannot wipe newer work')
const staleRev = P.getRev()                   // this tab is up to date
P.appendSubmission({ id:'s2', name:'Other tab wrote this', status:'new' })
P.setRev(staleRev)                            // pretend we never saw that write
const blocked = P.save({ ...before, patients: [] })
ok('the stale write was refused', blocked === false)
ok('data still intact', P.load(EMPTY).patients.length === 2, 'patients=' + P.load(EMPTY).patients.length)
ok('the newer submission survived', P.load(EMPTY).submissions.length === 2)

console.log('\n8. After syncing, the tab can save again (the bug that was fixed)')
P.setRev(P.readRaw().rev)                     // what the storage listener now does
const afterSync = P.save({ ...P.load(EMPTY), clinic: { name: 'Renamed After Sync' } })
ok('save works again after a sync', afterSync === true)
ok('the new name stuck', P.load(EMPTY).clinic.name === 'Renamed After Sync')

console.log('\n9. Clearing site data is the only thing that erases it')
P.clearAll()
ok('storage emptied', P.readRaw() === null)
ok('app falls back to empty', P.load(EMPTY).patients.length === 0)

console.log('\n10. Blocked storage (private mode) must not crash')
const real = globalThis.localStorage
globalThis.localStorage = { getItem(){ throw new Error('blocked') }, setItem(){ throw new Error('blocked') }, removeItem(){ throw new Error('blocked') } }
let crashed = false
try { P.load(EMPTY); P.save({ patients: [] }); P.appendSubmission({ id:'x' }) } catch { crashed = true }
ok('no crash when storage is blocked', crashed === false)
globalThis.localStorage = real

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
