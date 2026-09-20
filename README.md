# Dentivo

**Smart dental care, simplified.** Practice-management software for dental clinics, built as a
subscription product for the Indian market.

Front-end demo — no backend yet. Everything you type is saved in your browser.

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # persistence tests
npm run build   # static bundle in dist/
```

Pick any role on the login screen and press Enter. There is no password.

---

## What it does

The side navigation *is* the patient workflow, in order:

| # | Stage | What happens |
|---|---|---|
| 1 | Patient Link / QR | A public page the patient opens on their own phone |
| 2 | Submissions | What they typed arrives at the front desk |
| 3 | Patient Records | Turn a submission into a permanent record |
| 4 | Appointments | Month / week / day calendar, chairs as seats |
| 5 | Check-In | Scheduled arrivals and walk-ins both start a visit |
| 6 | Consultation | FDI odontogram, findings, diagnosis |
| 7 | Treatment | Plan, tick what was done, prescribe, after-care |
| 8 | Billing | Invoice built from completed work |
| 9 | Payment | Real UPI intent QR, card, cash, EMI |
| 10 | WhatsApp Bill | Bill, medicines and care notes in one message |
| 11 | Review & Google | 4★+ to Google, 3★ or less privately to the owner |
| 12 | Thank You / Reset | Chart merged into the record, desk resets |

Plus **Dashboard**, **Reports**, **Roles & Access**, **Feature Requests**, **Subscription**
and **Settings**.

---

## DentiBot

The in-app assistant. Two modes:

- **Offline** (default) — a local rule engine that reads your saved data and answers ~25 kinds
  of question. Nothing leaves the browser.
- **Live** — add a Groq API key in *Settings → AI Assistant* and it becomes real conversation:
  streaming replies, multi-turn memory, full analysis of your own numbers.

> **Before going live:** the key is kept in the browser and sent straight to api.groq.com.
> Anyone opening DevTools can read it. Move the call behind Flask (`POST /api/assistant`) and
> change `ENDPOINT` in `src/lib/ai.js`. Nothing else needs touching.

---

## Subscription

30-day free trial, no card. Then:

| Plan | Monthly | Yearly | For |
|---|---|---|---|
| Starter | ₹1,499 | ₹14,990 | Solo, 1 chair, 500 patients |
| **Professional** | **₹2,999** | **₹29,990** | 2–4 chairs, WhatsApp, reviews, DentiBot |
| Multi-Clinic | ₹6,999 | ₹69,990 | Up to 5 branches |
| Enterprise | custom | — | 6+ branches, SLA |

Yearly is ten months for twelve. All exclude 18% GST.

**Roles & Access** — an admin creates any role, toggles 26 individual permissions, and chooses
which side-menu pages that role can even open.

**Feature Requests** — clients ask for what is missing; each is quoted at a fixed price
(₹4,999 for a field up to ₹1,49,999 for a module) before any work starts.

---

## Data

Saved to `localStorage` under one key, per browser and per origin. It survives refreshes,
restarts and reboots. It is erased only by clearing site data, using a private window, or the
*Settings → Data → Clear all data* button. `npm test` proves this — 21 assertions covering the
save/load round trip, cross-tab safety and blocked-storage fallback.

Two limits while there is no backend: data does not follow you between devices or browsers, and
a patient scanning the QR on their own phone writes to *their* storage, not your dashboard.

---

## Stack

React 18 · Vite · React Router. Three dependencies, no UI kit, no chart library — the charts,
icons and components are all hand-built. Re-skin the whole app from `src/styles/tokens.css`.

```
src/
  data/       config · catalog · plans · nav
  store/      ClinicStore.jsx · persist.js
  lib/        ai.js (Groq) · assistant.js (offline engine) · links.js (UPI + WhatsApp) · icons · format
  components/ Layout · UI · Logo · Assistant · Odontogram · Visuals
  pages/      Login · PublicIntake · Dashboard · … · stages/
```

## Deploy

Configured for Vercel (`vercel.json`) and Netlify (`netlify.toml`). Both rewrite every path to
`index.html`, which client-side routing needs — without it, refreshing `/intake` 404s.

```bash
npm run build
npx vercel --prod
```
