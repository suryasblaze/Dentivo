# Dentivo API

Flask + SQLAlchemy over Supabase Postgres. The React app talks to it; the
patient's phone talks to the handful of endpoints under `/api/public`.

## Run it locally

```bash
cd server
python -m venv venv
source venv/Scripts/activate        # Windows: venv\Scripts\activate
pip install -r requirements-dev.txt

cp ../.env.example ../.env          # then fill in DATABASE_URL and JWT_SECRET
python run.py --init-db             # creates the tables
python run.py                       # http://localhost:5001
```

Point the frontend at it with `VITE_API_URL=http://localhost:5001` in `.env`.

## The two settings that matter

| Name | Where it comes from |
|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → URI. Use the **pooled** one (port 6543) — serverless functions open and close connections constantly. |
| `JWT_SECRET` | `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Changing it signs everyone out. |

Never commit either. `.env` is git-ignored; on Vercel they go in
Settings → Environment Variables.

## Tests

```bash
python -m pytest tests -q
```

They run on SQLite in memory, so no database is needed. The ones worth
reading first are in `test_isolation`: a clinic must not reach another
clinic's patients, visits or money, even when it knows the ids.

## How it is put together

```
server/app/
  models.py          tables — every row carries clinic_id
  db.py              one engine, one session per request
  auth.py            passwords, tokens, and the clinic-id rule
  util.py            input cleaning, counters, JSON shapes
  routes/
    auth.py          signup · login · me · change password
    clinic.py        the clinic record and its staff
    patients.py      patients · submissions · appointments
    visits.py        check-in · chart · invoice · payments · close
    public.py        what a patient's phone opens — no login
```

**Two rules hold the thing together.**

1. **The clinic id comes from the login token, never from the request.**
   Every query filters on it, so asking for another clinic's patient simply
   finds nothing — it does not even return "forbidden", which would confirm
   the record exists.

2. **Money is worked out on the server.** Totals come from the treatment
   plan and the clinic's own prices; a payment larger than the balance is
   refused; closing a visit carries the balance exactly once. A price sent
   from a browser is a suggestion, not a fact.

## Endpoints

| | |
|---|---|
| `POST /api/auth/signup` | creates the clinic and its owner together |
| `POST /api/auth/login` · `GET /api/auth/me` | |
| `GET PATCH /api/clinic` · `GET POST PATCH /api/staff` | owner only for changes |
| `GET POST /api/patients` · `PATCH /api/patients/<id>` | |
| `GET /api/submissions` · `PATCH /api/submissions/<id>` | what the QR form sent |
| `GET POST /api/appointments` · `PATCH /api/appointments/<id>` | |
| `GET POST /api/visits` · `PATCH /api/visits/<id>` | |
| `POST /api/visits/<id>/invoice` · `/payments` · `/close` · `/sent` | |
| `GET /api/feedback` | ratings patients left |
| `GET /api/public/clinic/<slug>` | name for the intake and review pages |
| `POST /api/public/intake/<slug>` | the QR form |
| `GET /api/public/bill/<token>` | one bill, by the token in the WhatsApp link |
| `POST /api/public/bill/<token>/feedback` | the patient's rating |

## Hosting

**On Vercel, with the frontend.** `api/index.py` is picked up as a Python
serverless function, so one deploy serves both. Free, but functions are
short-lived: no background jobs.

**When WhatsApp automation needs a scheduler**, move the same app to Render
or Railway (about $7/month) with `gunicorn "run:app"`, and keep Vercel for
the frontend. Nothing in the code changes.
