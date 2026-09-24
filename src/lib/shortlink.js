/* =========================================================================
   Short bill links.

   Without somewhere to keep the bill, it has to ride inside the link, which
   is why those links are long. Given a Supabase project, the bill is stored
   once and the link becomes a ticket:

       dentivo.app/b/x7k2p9          instead of  /b/v47js9j0#zjYyxCsJAEER…

   Set up (once):
     1. Create a Supabase project.
     2. Run the SQL in docs/shortlink.sql (a table and its policies).
     3. Put the project URL and anon key in .env for local work, and in
        Vercel → Settings → Environment Variables for the live site:
          VITE_SUPABASE_URL=https://xxxx.supabase.co
          VITE_SUPABASE_ANON_KEY=eyJ…
   The anon key is meant to be public; it is the table's policies that decide
   what anyone holding it may do. Never put the service key in this app.

   Until those are set, everything still works — the link is just the long
   one, so the demo never depends on a backend being ready.
   ========================================================================= */

const URL_BASE = import.meta.env?.VITE_SUPABASE_URL || ''
const ANON = import.meta.env?.VITE_SUPABASE_ANON_KEY || ''
const TABLE = 'bills'

export const shortLinksReady = () => !!(URL_BASE && ANON)

/* 8 characters from an alphabet without look-alikes (no O/0, I/l/1) —
   ~2.8 trillion combinations, so a link cannot be guessed. */
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'
const newId = () => {
  const a = new Uint8Array(8)
  crypto.getRandomValues(a)
  return Array.from(a, b => ALPHABET[b % ALPHABET.length]).join('')
}

const headers = () => ({
  'apikey': ANON,
  'Authorization': `Bearer ${ANON}`,
  'Content-Type': 'application/json',
})

/* Store one bill. Returns its id, or null if anything goes wrong — the
   caller then falls back to the long link rather than failing the send. */
export async function storeBill(payload) {
  if (!shortLinksReady()) return null
  try {
    const id = newId()
    const res = await fetch(`${URL_BASE}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify({ id, data: payload }),
    })
    return res.ok ? id : null
  } catch {
    return null
  }
}

/* Read one back on the patient's phone. */
export async function loadBill(id) {
  if (!shortLinksReady() || !id) return null
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&select=data`, { headers: headers() })
    if (!res.ok) return null
    const rows = await res.json()
    return rows?.[0]?.data || null
  } catch {
    return null
  }
}
