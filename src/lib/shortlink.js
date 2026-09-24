/* =========================================================================
   Short bill links.

   Without somewhere to keep the bill, it has to ride inside the link, which
   is why those links are long. Given a Supabase project, the bill is stored
   once and the link becomes a ticket:

       dentivo.app/b/x7k2p9mn3qr4       instead of  /b/v47js9j0#zjYyxCsJAEER…

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

/* The id is the only thing protecting a bill, so it has to be far beyond
   guessing: 14 characters of 32 possibilities is about 70 bits. Someone
   trying a million ids a second would still be at it long after the rows
   have expired.

   The alphabet is exactly 32 characters — a power of two — so masking with
   & 31 maps each random byte evenly. Using % here would make the first few
   characters slightly likelier than the rest. Look-alikes (i, l, o) are left
   out so a link can be read over the phone. */
const ALPHABET = '023456789abcdefghjkmnpqrstuvwxyz'
const ID_LEN = 14
const newId = () => {
  const buf = new Uint8Array(ID_LEN)
  crypto.getRandomValues(buf)
  return Array.from(buf, b => ALPHABET[b & 31]).join('')
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
