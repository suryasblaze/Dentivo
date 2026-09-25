/* Autopilot — the promises made about what agents may and may not do. */
import { build } from 'esbuild'
import { mkdirSync, rmSync } from 'fs'
import { join } from 'path'

const TMP = join(process.cwd(), 'node_modules', '.ap-test')
mkdirSync(TMP, { recursive: true })
const posix = (p) => p.split('\\').join('/')
await build({
  entryPoints: [join(process.cwd(), 'src/autopilot/engine.js')], bundle: true, format: 'esm',
  platform: 'node', outfile: join(TMP, 'e.mjs'), logLevel: 'error',
})
const E = await import('file://' + posix(join(TMP, 'e.mjs')))
const { decide, route, handle, resolve, counts, minutesSaved, AGENTS } = E

let pass = 0, fail = 0
const ok = (n, c, got) => { c ? (pass++, console.log('  PASS  ' + n)) : (fail++, console.log('  FAIL  ' + n + (got !== undefined ? '   got: ' + JSON.stringify(got) : ''))) }

const T0 = new Date(2026, 8, 25, 10, 30).getTime()
const base = (over = {}) => ({
  autopilot: true, agentModes: Object.fromEntries(AGENTS.map(a => [a.id, 'auto'])),
  items: [], now: T0, clinic: {}, ...over,
})
const first = (s) => s.items[0]

console.log('\n1. Ordinary work goes out by itself')
let s = handle(base(), { type: 'form', patient: 'Kavya Ramesh', text: 'Sensitivity' })
ok('a new form is handled end to end', first(s).status === 'done' && first(s).agent === 'intake', first(s).status)
ok('the record is created before slots are offered',
  first(s).steps.map(x => x.tool).join(',') === 'find_patient,create_patient,get_slots', first(s).steps.map(x => x.tool))
s = handle(base(), { type: 'question', patient: 'Mohan Das', text: 'How much for a root canal?' })
ok('a price question is answered from the price list', first(s).status === 'done' && first(s).steps.some(x => x.tool === 'price_list'))
ok('the answer quotes a real price, not an invented one', /₹6,500/.test(first(s).action.body), first(s).action.body)
s = handle(base(), { type: 'missed_call', patient: 'Lakshmi Iyer' })
ok('a missed call gets an immediate WhatsApp', first(s).status === 'done' && first(s).action.kind === 'whatsapp')

console.log('\n2. Anything clinical stops, even on full autopilot')
for (const text of ['Severe pain since night', 'My gum is bleeding a lot', 'Face is swollen', 'I have fever after extraction']) {
  const r = handle(base(), { type: 'question', patient: 'Bala V', text })
  ok(`"${text.slice(0, 22)}…" waits for a person`, first(r).status === 'waiting' && first(r).reason === 'urgent', first(r).reason)
  ok('  …and becomes a call task for the dentist', first(r).action.kind === 'callback' && first(r).action.to === 'Dr. Arun')
}
const askHuman = handle(base(), { type: 'question', patient: 'Geetha M', text: 'Can I speak to someone please' })
ok('asking for a person always reaches a person', first(askHuman).status === 'waiting' && first(askHuman).reason === 'asked')

console.log('\n3. Money and complaints wait too')
const bad = handle(base(), { type: 'feedback', patient: 'Suresh B', rating: 2, text: 'Waited 40 minutes' })
ok('an unhappy patient is never answered by an agent alone', first(bad).status === 'waiting' && first(bad).reason === 'complaint')
ok('but the reply is already drafted', first(bad).action.body.includes('apolog'))
ok('and it offers no discount on its own', !/discount|free|refund|₹/i.test(first(bad).action.body), first(bad).action.body)

console.log('\n4. The master switch')
const off = handle(base({ autopilot: false }), { type: 'form', patient: 'Nithya R' })
ok('autopilot off: even routine work waits', first(off).status === 'waiting')
const suggest = handle(base({ agentModes: { ...base().agentModes, intake: 'suggest' } }), { type: 'form', patient: 'Nithya R' })
ok('one agent on suggest: only that one drafts', first(suggest).status === 'waiting')
const agentOff = handle(base({ agentModes: { ...base().agentModes, billing: 'off' } }), { type: 'balance', patient: 'Hari P', amount: 2500 })
ok('an agent switched off does nothing at all', first(agentOff).status === 'off')
ok('routing is a pure decision', route({ agent: 'intake', reason: null }, base()) === 'done' && route({ agent: 'intake', reason: 'money' }, base()) === 'waiting')

console.log('\n5. A person decides, and it is recorded')
let q = handle(base(), { type: 'feedback', patient: 'Suresh B', rating: 2, text: 'Waited 40 minutes' })
q = resolve(q, first(q).id, 'do', T0 + 60000)
ok('approving marks it done and says who did it', first(q).status === 'done' && first(q).byHuman === true)
ok('approved work is not counted as agent work', counts(q).handled === 0 && counts(q).approved === 1, counts(q))
let sk = handle(base(), { type: 'recall', patient: 'Deepa N' })
sk = resolve(sk, first(sk).id, 'skip', T0)
ok('skipping leaves it undone', first(sk).status === 'skipped' && counts(sk).skipped === 1)

console.log('\n6. Counting the work')
let day = base()
for (const ev of [{ type: 'form', patient: 'A' }, { type: 'question', patient: 'B', text: 'braces cost?' }, { type: 'recall', patient: 'C' }, { type: 'question', patient: 'D', text: 'bleeding gums' }]) day = handle(day, ev)
ok('three done, one waiting', counts(day).handled === 3 && counts(day).waiting === 1, counts(day))
ok('time saved counts only agent work', minutesSaved(day) === 6, minutesSaved(day))

rmSync(TMP, { recursive: true, force: true })
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
