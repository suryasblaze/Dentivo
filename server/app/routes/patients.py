"""Patients, submissions and appointments — the front-desk records.

Every query starts from g.clinic_id, which comes from the login token.
"""
from flask import Blueprint, g, jsonify, request
from sqlalchemy import or_, select

from ..auth import login_required
from ..db import session
from ..models import Appointment, Patient, Submission
from ..util import (
    appointment_json, bad, clean, mobile10, next_number, patient_json, submission_json,
)

bp = Blueprint("patients", __name__, url_prefix="/api")


# --------------------------------------------------------------- patients
@bp.get("/patients")
@login_required
def list_patients():
    s = session()
    q = select(Patient).where(Patient.clinic_id == g.clinic_id)
    search = clean(request.args.get("q"), 60)
    if search:
        like = f"%{search}%"
        q = q.where(or_(Patient.name.ilike(like), Patient.mobile.like(like), Patient.uhid.ilike(like)))
    rows = s.scalars(q.order_by(Patient.created_at.desc()).limit(500)).all()
    return jsonify(patients=[patient_json(p) for p in rows])


@bp.post("/patients")
@login_required
def create_patient():
    data = request.get_json(silent=True) or {}
    name = clean(data.get("name"), 120)
    mobile = mobile10(data.get("mobile") or data.get("phone"))
    if not name:
        return bad("A patient needs a name")
    if not mobile:
        return bad("A ten-digit mobile number is needed")

    s = session()
    existing = s.scalar(select(Patient).where(Patient.clinic_id == g.clinic_id, Patient.mobile == mobile))
    if existing:
        # not an error: reception is usually looking at the same person
        return jsonify(patient=patient_json(existing), existed=True), 200

    p = Patient(
        clinic_id=g.clinic_id, name=name, mobile=mobile,
        gender=clean(data.get("gender"), 12), age=data.get("age"),
        notes=clean(data.get("notes"), 2000),
        uhid=f"P-{next_number(g.clinic_id, 'uhid'):04d}",
    )
    s.add(p)
    s.commit()

    sub_id = clean(data.get("submissionId"), 32)
    if sub_id:
        sub = s.get(Submission, sub_id)
        if sub and sub.clinic_id == g.clinic_id:
            sub.status, sub.patient_id = "added", p.id
            s.commit()

    return jsonify(patient=patient_json(p), existed=False), 201


@bp.patch("/patients/<pid>")
@login_required
def update_patient(pid):
    s = session()
    p = s.get(Patient, pid)
    if p is None or p.clinic_id != g.clinic_id:
        return bad("No such patient", 404)

    data = request.get_json(silent=True) or {}
    if "name" in data:
        p.name = clean(data["name"], 120) or p.name
    if "gender" in data:
        p.gender = clean(data["gender"], 12)
    if "age" in data:
        p.age = data["age"]
    if "notes" in data:
        p.notes = clean(data["notes"], 2000)
    s.commit()
    return jsonify(patient=patient_json(p))


# ------------------------------------------------------------ submissions
@bp.get("/submissions")
@login_required
def list_submissions():
    rows = session().scalars(
        select(Submission).where(Submission.clinic_id == g.clinic_id)
        .order_by(Submission.created_at.desc()).limit(200)
    ).all()
    return jsonify(submissions=[submission_json(x) for x in rows])


@bp.patch("/submissions/<sid>")
@login_required
def update_submission(sid):
    s = session()
    sub = s.get(Submission, sid)
    if sub is None or sub.clinic_id != g.clinic_id:
        return bad("No such submission", 404)
    status = clean((request.get_json(silent=True) or {}).get("status"), 20)
    if status in {"new", "added", "ignored"}:
        sub.status = status
        s.commit()
    return jsonify(submission=submission_json(sub))


# ----------------------------------------------------------- appointments
@bp.get("/appointments")
@login_required
def list_appointments():
    s = session()
    q = select(Appointment).where(Appointment.clinic_id == g.clinic_id)
    if request.args.get("from"):
        q = q.where(Appointment.date >= clean(request.args["from"], 10))
    if request.args.get("to"):
        q = q.where(Appointment.date <= clean(request.args["to"], 10))
    rows = s.scalars(q.order_by(Appointment.date, Appointment.time).limit(1000)).all()
    return jsonify(appointments=[appointment_json(a) for a in rows])


@bp.post("/appointments")
@login_required
def create_appointment():
    data = request.get_json(silent=True) or {}
    patient_id = clean(data.get("patientId"), 32)
    date_ = clean(data.get("date"), 10)
    time_ = clean(data.get("time"), 5)
    if not (patient_id and date_ and time_):
        return bad("A booking needs a patient, a date and a time")

    s = session()
    patient = s.get(Patient, patient_id)
    if patient is None or patient.clinic_id != g.clinic_id:
        return bad("No such patient", 404)

    chair = clean(data.get("chair"), 40)
    if chair:
        taken = s.scalar(select(Appointment).where(
            Appointment.clinic_id == g.clinic_id, Appointment.date == date_,
            Appointment.time == time_, Appointment.chair == chair,
            Appointment.status.in_(("scheduled", "arrived")),
        ))
        if taken:
            return bad("That chair is already booked at that time", 409)

    a = Appointment(
        clinic_id=g.clinic_id, patient_id=patient_id, date=date_, time=time_,
        doctor=clean(data.get("doctor"), 120), chair=chair, reason=clean(data.get("reason"), 240),
    )
    s.add(a)
    s.commit()
    return jsonify(appointment=appointment_json(a)), 201


@bp.patch("/appointments/<aid>")
@login_required
def update_appointment(aid):
    s = session()
    a = s.get(Appointment, aid)
    if a is None or a.clinic_id != g.clinic_id:
        return bad("No such appointment", 404)

    data = request.get_json(silent=True) or {}
    for field, limit in (("date", 10), ("time", 5), ("doctor", 120), ("chair", 40), ("reason", 240)):
        if field in data:
            setattr(a, field, clean(data[field], limit))
    status = clean(data.get("status"), 20)
    if status in {"scheduled", "arrived", "done", "no_show", "cancelled"}:
        a.status = status
    s.commit()
    return jsonify(appointment=appointment_json(a))
