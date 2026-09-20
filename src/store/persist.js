/* =========================================================================
   Browser persistence.

   Everything a clinic types is written to localStorage under one key.
   That means:
     · it survives a page refresh, a browser restart and a machine reboot
     · it is per browser, per origin — localhost and your live URL are separate
     · it is erased only by "clear site data" / clearing cookies for the site,
       a private window, or the Clear-all-data button in Settings

   A `rev` counter guards against two tabs overwriting each other: a tab
   refuses to write if storage already holds a revision it has not seen.
   ========================================================================= */

export const KEY = 'smileflow.v1'

/* the highest revision THIS tab knows about */
let rev = 0
export const getRev = () => rev
export const setRev = (n) => { rev = Number(n) || 0 }

const store = () => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch { return null }        // blocked in some privacy modes
}

export function readRaw() {
  const ls = store()
  if (!ls) return null
  try {
    const raw = ls.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function load(empty) {
  const saved = readRaw()
  if (!saved) return empty
  setRev(saved.rev)
  return { ...empty, ...saved, toasts: [] }
}

/* Returns true when the write happened, false when it was skipped. */
export function save(state) {
  const ls = store()
  if (!ls) return false
  try {
    const stored = readRaw()
    /* Another tab wrote something newer than anything we have seen.
       Refuse — the storage listener will bring this tab up to date. */
    if (stored && Number(stored.rev || 0) > rev) return false
    rev = Number(stored?.rev || 0) + 1
    const { toasts, ...rest } = state
    ls.setItem(KEY, JSON.stringify({ ...rest, rev }))
    return true
  } catch { return false }       // quota exceeded, or storage blocked
}

/* Append-only write for the public intake page. Re-reads first, so a tab
   left open for hours cannot wipe work done elsewhere. */
export function appendSubmission(sub) {
  const ls = store()
  if (!ls) return false
  try {
    const cur = readRaw() || {}
    const next = {
      ...cur,
      submissions: [sub, ...(cur.submissions || [])],
      rev: Number(cur.rev || 0) + 1,
    }
    rev = next.rev
    ls.setItem(KEY, JSON.stringify(next))
    return true
  } catch { return false }
}

export function clearAll() {
  const ls = store()
  if (!ls) return false
  try { ls.removeItem(KEY); rev = 0; return true } catch { return false }
}
