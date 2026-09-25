"""Visits: check in, chart, bill, take payment, close.

The money is worked out here, never trusted from the browser — a price sent
from a phone is a suggestion, not a fact.
"""
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request
from sqlalchemy import select

from ..auth import login_required
from ..db import session
from ..models import Appointment, Feedback, Patient, Payment, Visit
from ..util import (
    bad, clean, feedback_json, money, next_number, payment_json, today_iso, token, visit_json,
)

bp = Blueprint("visits", __name__, url_prefix="/api")

OPEN_STAGES = ("checkin", "consultation", "treatment", "billing")


def _payments(s, visit_id):
    return s.scalars(select(Payment).where(Payment.visit_id == visit_id).order_by(Payment.created_at)).all()


def _totals(s, v: Visit):
    """Sum what was actually done, apply the discount, count what was paid."""
    done = [i for i in (v.plan or []) if i.get("status") == "done"]
    subtotal = sum(money(i.get("price")) for i in done)
    gst = sum(money(i.get("price")) * money(i.get("gst")) // 100 for i in done)
    total = max(0, subtotal - money(v.discount) + gst)
    paid = sum(p.amount for p in _payments(s, v.id))
    v.total, v.paid, v.due = total, paid, max(0, total - paid)
    return v


@bp.get("/visits")
@login_required
def list_visits():
    s = session()
    q = select(Visit).where(Visit.clinic_id == g.clinic_id)
    if request.args.get("open") == "1":
        q = q.where(Visit.stage.in_(OPEN_STAGES))
    if request.args.get("date"):
        q = q.where(Visit.date == clean(request.args["date"], 10))
    rows = s.scalars(q.order_by(Visit.created_at.desc()).limit(500)).all()
    return jsonify(visits=[visit_json(v, _payments(s, v.id)) for v in rows])


@bp.post("/visits")
@login_required
def check_in():
    """Start a visit. A patient already in the chair is never started twice."""
    data = request.get_json(silent=True) or {}
    patient_id = clean(data.get("patientId"), 32)
    s = session()
    patient = s.get(Patient, patient_id)
    if patient is None or patient.clinic_id != g.clinic_id:
        return bad("No such patient", 404)

    open_visit = s.scalar(select(Visit).where(
        Visit.clinic_id == g.clinic_id, Visit.patient_id == patient_id, Visit.stage.in_(OPEN_STAGES),
    ))
    if open_visit:
        return jsonify(visit=visit_json(open_visit, _payments(s, open_visit.id)), existed=True), 200

    v = Visit(
        clinic_id=g.clinic_id, patient_id=patient_id, date=today_iso(),
        token=f"T-{next_number(g.clinic_id, 'token'):02d}",
        visit_type=clean(data.get("visitType"), 40) or "Walk-in",
        doctor=clean(data.get("doctor"), 120), chair=clean(data.get("chair"), 40),
        reason=clean(data.get("reason"), 240), chart={}, plan=[], rx=[],
    )
    s.add(v)
    s.flush()

    appt_id = clean(data.get("appointmentId"), 32)
    if appt_id:
        a = s.get(Appointment, appt_id)
        if a and a.clinic_id == g.clinic_id:
            a.status, a.visit_id = "arrived", v.id
    s.commit()
    return jsonify(visit=visit_json(v, []), existed=False), 201


@bp.patch("/visits/<vid>")
@login_required
def update_visit(vid):
    s = session()
    v = s.get(Visit, vid)
    if v is None or v.clinic_id != g.clinic_id:
        return bad("No such visit", 404)
    if v.stage == "done":
        return bad("That visit is closed", 409)

    data = request.get_json(silent=True) or {}
    for field in ("chart", "plan", "rx"):
        if field in data:
            setattr(v, field, data[field])
    if "discount" in data:
        v.discount = money(data["discount"])
    for field, limit in (("nextVisit", 80), ("doctor", 120), ("chair", 40), ("reason", 240)):
        if field in data:
            setattr(v, {"nextVisit": "next_visit"}.get(field, field), clean(data[field], limit))
    stage = clean(data.get("stage"), 20)
    if stage in OPEN_STAGES:
        v.stage = stage

    _totals(s, v)
    s.commit()
    return jsonify(visit=visit_json(v, _payments(s, v.id)))


@bp.post("/visits/<vid>/invoice")
@login_required
def make_invoice(vid):
    """Issue the invoice number once; the amounts may keep changing after."""
    s = session()
    v = s.get(Visit, vid)
    if v is None or v.clinic_id != g.clinic_id:
        return bad("No such visit", 404)

    if not v.invoice_no:
        v.invoice_no = f"INV-{next_number(g.clinic_id, 'invoice'):04d}"
        v.invoice_date = today_iso()
    if not v.bill_token:
        v.bill_token = token(14)
    _totals(s, v)
    s.commit()
    return jsonify(visit=visit_json(v, _payments(s, v.id)))


@bp.post("/visits/<vid>/payments")
@login_required
def add_payment(vid):
    s = session()
    v = s.get(Visit, vid)
    if v is None or v.clinic_id != g.clinic_id:
        return bad("No such visit", 404)

    data = request.get_json(silent=True) or {}
    amount = money(data.get("amount"))
    if amount <= 0:
        return bad("Enter how much was paid")

    _totals(s, v)
    if amount > v.due:
        return bad(f"That is more than the ₹{v.due} outstanding")

    p = Payment(
        clinic_id=g.clinic_id, visit_id=v.id, patient_id=v.patient_id, amount=amount,
        mode=clean(data.get("mode"), 40) or "Cash", reference=clean(data.get("ref"), 80), date=today_iso(),
    )
    s.add(p)
    s.flush()
    _totals(s, v)
    s.commit()
    return jsonify(payment=payment_json(p), visit=visit_json(v, _payments(s, v.id))), 201


@bp.post("/visits/<vid>/close")
@login_required
def close_visit(vid):
    """Close once. Anything unpaid moves to the patient's account."""
    s = session()
    v = s.get(Visit, vid)
    if v is None or v.clinic_id != g.clinic_id:
        return bad("No such visit", 404)
    if v.stage == "done":
        return jsonify(visit=visit_json(v, _payments(s, v.id)), alreadyClosed=True)

    _totals(s, v)
    patient = s.get(Patient, v.patient_id)
    if v.due > 0 and patient:
        patient.balance = (patient.balance or 0) + v.due
    v.stage = "done"
    v.closed_at = datetime.now(timezone.utc)
    s.commit()
    return jsonify(visit=visit_json(v, _payments(s, v.id)), carried=v.due)


@bp.post("/visits/<vid>/sent")
@login_required
def mark_sent(vid):
    """Reception sent the bill on WhatsApp."""
    s = session()
    v = s.get(Visit, vid)
    if v is None or v.clinic_id != g.clinic_id:
        return bad("No such visit", 404)
    v.whatsapp_sent_at = datetime.now(timezone.utc)
    if (request.get_json(silent=True) or {}).get("review") is not False:
        v.review_requested = True
    s.commit()
    return jsonify(visit=visit_json(v, _payments(s, v.id)))


@bp.get("/feedback")
@login_required
def list_feedback():
    rows = session().scalars(
        select(Feedback).where(Feedback.clinic_id == g.clinic_id).order_by(Feedback.created_at.desc()).limit(500)
    ).all()
    return jsonify(feedback=[feedback_json(f) for f in rows])
