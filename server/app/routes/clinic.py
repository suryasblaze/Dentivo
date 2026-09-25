"""The clinic's own record and its staff list."""
from flask import Blueprint, g, jsonify, request
from sqlalchemy import func, select

from ..auth import hash_password, login_required, roles_required
from ..db import session
from ..models import Clinic, User
from ..util import bad, clean, clinic_json, mobile10, slugify, user_json

bp = Blueprint("clinic", __name__, url_prefix="/api")


@bp.get("/clinic")
@login_required
def get_clinic():
    c = session().get(Clinic, g.clinic_id)
    return jsonify(clinic=clinic_json(c))


@bp.patch("/clinic")
@roles_required("owner")
def update_clinic():
    s = session()
    c = s.get(Clinic, g.clinic_id)
    data = request.get_json(silent=True) or {}

    if "name" in data:
        c.name = clean(data["name"], 160) or c.name
    for field, column, limit in (
        ("phone", "phone", 32), ("email", "email", 160), ("address", "address", 400),
        ("gstin", "gstin", 20), ("upiId", "upi_id", 120), ("googlePlaceUrl", "google_review_url", 400),
    ):
        if field in data:
            setattr(c, column, clean(data[field], limit))
    if "settings" in data and isinstance(data["settings"], dict):
        c.settings = {**(c.settings or {}), **data["settings"]}

    if "slug" in data:
        wanted = slugify(data["slug"])
        if wanted and wanted != c.slug:
            taken = s.scalar(select(func.count()).select_from(Clinic).where(Clinic.slug == wanted))
            if taken:
                return bad("Another clinic already uses that short link", 409)
            c.slug = wanted

    s.commit()
    return jsonify(clinic=clinic_json(c))


@bp.get("/staff")
@login_required
def list_staff():
    rows = session().scalars(
        select(User).where(User.clinic_id == g.clinic_id).order_by(User.created_at)
    ).all()
    return jsonify(staff=[user_json(u) for u in rows])


@bp.post("/staff")
@roles_required("owner")
def add_staff():
    data = request.get_json(silent=True) or {}
    name = clean(data.get("name"), 120)
    email = clean(data.get("email"), 160).lower()
    password = str(data.get("password") or "")
    role = clean(data.get("role"), 20) or "reception"

    if not name:
        return bad("Give the person a name")
    if "@" not in email:
        return bad("That email address does not look right")
    if len(password) < 8:
        return bad("Use a password of at least 8 characters")
    if role not in {"owner", "dentist", "reception", "assistant"}:
        return bad("Pick a role: owner, dentist, reception or assistant")

    s = session()
    if s.scalar(select(func.count()).select_from(User).where(func.lower(User.email) == email)):
        return bad("Someone already uses that email", 409)

    u = User(clinic_id=g.clinic_id, name=name, email=email, phone=mobile10(data.get("mobile")),
             password_hash=hash_password(password), role=role)
    s.add(u)
    s.commit()
    return jsonify(user=user_json(u)), 201


@bp.patch("/staff/<uid>")
@roles_required("owner")
def update_staff(uid):
    s = session()
    u = s.get(User, uid)
    if u is None or u.clinic_id != g.clinic_id:
        return bad("No such person", 404)

    data = request.get_json(silent=True) or {}
    if "name" in data:
        u.name = clean(data["name"], 120) or u.name
    if "role" in data and data["role"] in {"owner", "dentist", "reception", "assistant"}:
        if u.id == g.user.id and data["role"] != "owner":
            return bad("You cannot take away your own owner role")
        u.role = data["role"]
    if "active" in data:
        if u.id == g.user.id and not data["active"]:
            return bad("You cannot switch off your own login")
        u.active = bool(data["active"])
    s.commit()
    return jsonify(user=user_json(u))
