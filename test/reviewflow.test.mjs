/* SRT ReviewFlow automation rules — the promises made to patients. */
import { build } from 'esbuild'
import { mkdirSync, rmSync } from 'fs'
import { join } from 'path'

const TMP = join(process.cwd(), 'node_modules', '.rf-test')
mkdirSync(TMP, { recursive: true })
const posix = (p) => p.split('\\').join('/')
await build({ entryPoints: [join(process.cwd(), 'src/reviewflow/engine.js')], bundle: true, format: 'esm', platform: 'node', outfile: join(TMP, 'e.mjs'), logLevel: 'error' })
const E = await import('file://' + posix(join(TMP, 'e.mjs')))
const { completeVisit, advance, patientAction, sendNow, sendQueue, analyse, insights, DEFAULT_CONFIG, MIN, HOUR, DAY } = E

let pass = 0, fail = 0
const ok = (n, c, got) => { c ? (pass++, console.log('  PASS  ' + n)) : (fail++, console.log('  FAIL  ' + n + (got !== undefined ? '   got: ' + JSON.stringify(got) : ''))) }

const T0 = new Date(2026, 8, 22, 10, 30).getTime()
const fresh = (cfg = {}) => ({ config: { ...DEFAULT_CONFIG, sendMode: 'auto', ...cfg }, visits: [], requests: [], feedback: [], optOuts: [], now: T0 })
const visit = { name: 'Karthik Raman', mobile: '98410 22331', doctor: 'Dr. Arun', visitType: 'Check-up' }
const msgs = (r) => r.events.filter(e => e.type === 'sent' || e.type === 'reminder').length

console.log('\n1. Complete Visit is the only step')
let s = completeVisit(fresh(), visit, T0).state
ok('request scheduled 30 min later', s.requests[0].status === 'scheduled' && s.requests[0].nextAt === T0 + 30 * MIN)
s = advance(s, T0 + 31 * MIN)
ok('sent automatically', s.requests[0].status === 'delivered' && msgs(s.requests[0]) === 1)

console.log('\n2. No action: one reminder, then stop — never more')
let q = advance(s, T0 + 10 * DAY)
ok('exactly 2 messages in total', msgs(q.requests[0]) === 2, msgs(q.requests[0]))
ok('ends as No response', q.requests[0].status === 'no_response')
q = advance(q, T0 + 60 * DAY)
ok('still 2 messages weeks later', msgs(q.requests[0]) === 2)

console.log('\n3. Any patient action stops all reminders')
let g = patientAction(s, s.requests[0].id, 'open', {}, T0 + HOUR)
g = patientAction(g, g.requests[0].id, 'google', {}, T0 + HOUR)
g = advance(g, T0 + 10 * DAY)
ok('Google: completed, no reminder sent', g.requests[0].status === 'completed' && msgs(g.requests[0]) === 1)
let p = patientAction(s, s.requests[0].id, 'private', { rating: 2, improve: ['Waiting time'], comment: 'Waited 40 minutes' }, T0 + HOUR)
p = advance(p, T0 + 10 * DAY)
ok('Private: completed, no reminder sent', p.requests[0].status === 'completed' && msgs(p.requests[0]) === 1)
ok('private feedback saved and flagged', p.feedback.length === 1 && p.feedback[0].priority === 'high' && p.feedback[0].category === 'Waiting time', p.feedback[0])
let o = patientAction(s, s.requests[0].id, 'optout', {}, T0 + HOUR)
ok('opt-out stops everything', advance(o, T0 + 10 * DAY).requests[0].status === 'opted_out')
ok('and the number is never asked again', completeVisit(o, visit, T0 + 200 * DAY).state.requests[0].status === 'skipped')

console.log('\n4. Protecting patients')
const late = new Date(2026, 8, 22, 20, 50).getTime()
const n = completeVisit({ ...fresh(), now: late }, visit, late).state
ok('quiet hours: 8:50 pm visit sends at 9 am next day', new Date(n.requests[0].nextAt).getHours() === 9 && n.requests[0].nextAt > late)
const again = completeVisit(s, visit, T0 + 12 * DAY)
ok('same patient within 60 days is not asked again', again.state.requests[0].status === 'skipped' && /12 days/.test(again.note), again.note)
ok('treatment in progress is not asked', completeVisit(fresh(), { ...visit, noRequest: true }, T0).state.requests[0].status === 'skipped')
ok('paused automation sends nothing', completeVisit(fresh({ enabled: false }), visit, T0).state.requests[0].status === 'skipped')
const none = advance(completeVisit(fresh({ maxReminders: 0 }), visit, T0).state, T0 + 10 * DAY)
ok('reminders off: one message only', msgs(none.requests[0]) === 1 && none.requests[0].status === 'no_response')

console.log('\n5. Manual sending — the automation still decides when')
let m = completeVisit(fresh({ sendMode: 'manual' }), visit, T0).state
m = advance(m, T0 + 31 * MIN)
ok('nothing goes out by itself', m.requests[0].status === 'queued' && msgs(m.requests[0]) === 0, m.requests[0].status)
ok('it waits in the send queue', sendQueue(m).length === 1)
ok('waiting never times out into No response', advance(m, T0 + 30 * DAY).requests[0].status === 'queued')
m = sendNow(m, m.requests[0].id, T0 + 40 * MIN)
ok('tapping Send delivers it', m.requests[0].status === 'delivered' && msgs(m.requests[0]) === 1)
ok('the queue is then empty', sendQueue(m).length === 0)
m = advance(m, T0 + 2 * DAY)
ok('the reminder queues for a tap too', m.requests[0].status === 'queued' && m.requests[0].queued === 'reminder')
m = sendNow(m, m.requests[0].id, T0 + 2 * DAY)
m = advance(m, T0 + 30 * DAY)
ok('still 2 messages in total, then stop', msgs(m.requests[0]) === 2 && m.requests[0].status === 'no_response')
let z = advance(completeVisit(fresh({ sendMode: 'manual' }), visit, T0).state, T0 + 31 * MIN)
z = patientAction(z, z.requests[0].id, 'optout', {}, T0 + HOUR)
ok('an opt-out clears it from the queue', sendQueue(z).length === 0)

console.log('\n6. Insights come only from real feedback')
ok('no feedback, no summary', insights([]).summary === '')
const a = analyse({ rating: 5, liked: ['Doctor communication'], comment: 'Doctor explained everything clearly' })
ok('positive feedback is low priority', a.sentiment === 'positive' && a.priority === 'low', a)
const ins = insights([{ ...a }, { ...analyse({ rating: 2, improve: ['Waiting time'] }) }])
ok('summary names what patients said', /doctor communication/i.test(ins.summary) && /Waiting time/.test(ins.summary), ins.summary)

rmSync(TMP, { recursive: true, force: true })
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
