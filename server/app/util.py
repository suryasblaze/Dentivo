"""Small shared pieces: input checking, counters, and JSON shapes."""
import re
import secrets
from datetime import date

from flask import jsonify

from .db import session
from .models import Counter

# 32 characters without look-alikes, so a link can be read over the phone
_ALPHABET = "023456789abcdefghjkmnpqrstuvwxyz"


def token(n: int = 14) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(n))


def mobile10(raw) -> str:
    """Indian mobiles, stored as the ten digits people actually quote."""
    digits = re.sub(r"\D", "", str(raw or ""))
    return digits[-10:] if len(digits) >= 10 else ""


def slugify(raw, limit: int = 24) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", str(raw or "").lower().strip()).strip("-")
    return s[:limit]


def clean(raw, limit: int = 240) -> str:
    return str(raw or "").strip()[:limit]


def money(raw) -> int:
    try:
        return max(0, int(round(float(raw or 0))))
    except (TypeError, ValueError):
        return 0


def bad(message: str, code: int = 400):
    return jsonify(error=message), code


def next_number(clinic_id: str, name: str) -> int:
    """Hand out the next UHID / token / invoice / receipt for one clinic.

    Locked while it is read so two receptionists cannot be given the same
    invoice number at the same moment.
    """
    s = session()
    row = s.get(Counter, (clinic_id, name), with_for_update=True)
    if row is None:
        row = Counter(clinic_id=clinic_id, name=name, value=0)
        s.add(row)
        s.flush()
    row.value += 1
    return row.value


def today_iso() -> str:
    return date.today().isoformat()


# ----------------------------------------------------------------- shapes
def clinic_json(c):
    return {
        "id": c.id, "name": c.name, "slug": c.slug, "phone": c.phone, "email": c.email,
        "address": c.address, "gstin": c.gstin, "upiId": c.upi_id,
        "googlePlaceUrl": c.google_review_url, "plan": c.plan,
        "trialStarted": c.trial_started.isoformat() if c.trial_started else None,
        "settings": c.settings or {},
    }


def user_json(u):
    return {"id": u.id, "name": u.name, "email": u.email, "phone": u.phone, "role": u.role, "clinicId": u.clinic_id}


def patient_json(p):
    return {
        "id": p.id, "uhid": p.uhid, "name": p.name, "mobile": p.mobile, "phone": p.mobile,
        "gender": p.gender, "age": p.age, "notes": p.notes, "balance": p.balance,
        "createdAt": p.created_at.isoformat() if p.created_at else None,
    }


def submission_json(s_):
    return {
        "id": s_.id, "name": s_.name, "mobile": s_.mobile, "gender": s_.gender, "issue": s_.issue,
        "status": s_.status, "patientId": s_.patient_id,
        "at": s_.created_at.isoformat() if s_.created_at else None,
    }


def appointment_json(a):
    return {
        "id": a.id, "patientId": a.patient_id, "date": a.date, "time": a.time, "doctor": a.doctor,
        "chair": a.chair, "reason": a.reason, "status": a.status, "visitId": a.visit_id,
    }


def visit_json(v, payments=None):
    return {
        "id": v.id, "patientId": v.patient_id, "date": v.date, "token": v.token, "stage": v.stage,
        "visitType": v.visit_type, "doctor": v.doctor, "chair": v.chair, "reason": v.reason,
        "chart": v.chart or {}, "plan": v.plan or [], "rx": v.rx or [], "nextVisit": v.next_visit,
        "discount": v.discount or 0,
        "invoice": ({"no": v.invoice_no, "date": v.invoice_date} if v.invoice_no else None),
        "total": v.total or 0, "paid": v.paid or 0, "due": v.due or 0,
        "billToken": v.bill_token,
        "whatsappSent": bool(v.whatsapp_sent_at),
        "reviewRequested": bool(v.review_requested),
        "closedAt": v.closed_at.isoformat() if v.closed_at else None,
        "payments": [payment_json(p) for p in (payments or [])],
    }


def payment_json(p):
    return {"id": p.id, "amount": p.amount, "mode": p.mode, "ref": p.reference, "date": p.date}


def feedback_json(f):
    return {
        "id": f.id, "visitId": f.visit_id, "patientId": f.patient_id, "rating": f.rating,
        "comment": f.comment, "wentToGoogle": bool(f.went_to_google),
        "at": f.created_at.isoformat() if f.created_at else None,
    }
