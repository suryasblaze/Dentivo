"""What a patient's phone opens. No login, because a patient has none.

Three things only: send the intake form, read one bill, leave feedback on
that bill. Each is reached by an unguessable token or a clinic's public
slug, and each returns only what that one patient should see.
"""
from flask import Blueprint, jsonify, request
from sqlalchemy import select

from ..db import session
from ..models import Clinic, Feedback, Patient, Payment, Submission, Visit
from ..util import bad, clean, mobile10

bp = Blueprint("public", __name__, url_prefix="/api/public")


def _clinic_by_slug(s, slug):
    return s.scalar(select(Clinic).where(Clinic.slug == clean(slug, 40).lower()))


@bp.get("/clinic/<slug>")
def clinic_card(slug):
    """Just enough for the intake and review pages to show the clinic's name."""
    c = _clinic_by_slug(session(), slug)
    if c is None:
        return bad("That link is not in use", 404)
    return jsonify(clinic={"name": c.name, "slug": c.slug, "phone": c.phone,
                           "address": c.address, "google": c.google_review_url})


@bp.post("/intake/<slug>")
def intake(slug):
    """The QR form. Lands in Submissions on the clinic's dashboard."""
    s = session()
    c = _clinic_by_slug(s, slug)
    if c is None:
        return bad("That link is not in use", 404)

    data = request.get_json(silent=True) or {}
    name = clean(data.get("name"), 120)
    mobile = mobile10(data.get("mobile") or data.get("phone"))
    if not name:
        return bad("Please enter your name")
    if not mobile:
        return bad("Please enter a ten-digit mobile number")

    recent = s.scalar(
        select(Submission).where(Submission.clinic_id == c.id, Submission.mobile == mobile,
                                 Submission.status == "new")
    )
    if recent:                       # a second tap on Send is not a second patient
        return jsonify(ok=True, duplicate=True)

    s.add(Submission(clinic_id=c.id, name=name, mobile=mobile,
                     gender=clean(data.get("gender"), 12), issue=clean(data.get("issue"), 400)))
    s.commit()
    return jsonify(ok=True, duplicate=False), 201


@bp.get("/bill/<bill_token>")
def bill(bill_token):
    """One bill, by the token in the WhatsApp link."""
    s = session()
    v = s.scalar(select(Visit).where(Visit.bill_token == clean(bill_token, 24)))
    if v is None:
        return bad("This bill link is not valid any more", 404)

    c = s.get(Clinic, v.clinic_id)
    p = s.get(Patient, v.patient_id)
    payments = s.scalars(select(Payment).where(Payment.visit_id == v.id)).all()
    done = [i for i in (v.plan or []) if i.get("status") == "done"]

    return jsonify(
        clinic={"name": c.name, "address": c.address, "phone": c.phone, "gstin": c.gstin,
                "upiId": c.upi_id, "google": c.google_review_url},
        patient={"name": p.name if p else "", "uhid": p.uhid if p else ""},
        visit={"date": v.date, "token": v.token, "reason": v.reason,
               "invoice": {"no": v.invoice_no, "date": v.invoice_date},
               "rx": v.rx or [], "nextVisit": v.next_visit,
               "payments": [{"mode": x.mode, "amount": x.amount} for x in payments]},
        bill={"done": [{"name": i.get("name"), "tooth": i.get("tooth"), "price": i.get("price")} for i in done],
              "subtotal": sum(int(i.get("price") or 0) for i in done), "discount": v.discount or 0,
              "gstAmt": max(0, (v.total or 0) - sum(int(i.get("price") or 0) for i in done) + (v.discount or 0)),
              "total": v.total or 0, "paid": v.paid or 0, "due": v.due or 0},
        askReview=bool(v.review_requested),
        rated=bool(s.scalar(select(Feedback).where(Feedback.visit_id == v.id))),
    )


@bp.post("/bill/<bill_token>/feedback")
def leave_feedback(bill_token):
    """The patient's rating, from their own phone. One per visit — sending
    again replaces what they said rather than adding a second opinion."""
    s = session()
    v = s.scalar(select(Visit).where(Visit.bill_token == clean(bill_token, 24)))
    if v is None:
        return bad("This link is not valid any more", 404)

    data = request.get_json(silent=True) or {}
    rating = data.get("rating")
    try:
        rating = max(0, min(5, int(rating or 0)))
    except (TypeError, ValueError):
        rating = 0

    row = s.scalar(select(Feedback).where(Feedback.visit_id == v.id))
    if row is None:
        row = Feedback(clinic_id=v.clinic_id, visit_id=v.id, patient_id=v.patient_id)
        s.add(row)
    row.rating = rating or row.rating
    if data.get("comment"):
        row.comment = clean(data.get("comment"), 2000)
    if data.get("wentToGoogle"):
        row.went_to_google = True
    s.commit()
    return jsonify(ok=True)
