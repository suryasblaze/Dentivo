"""Sign up, sign in, and who am I.

Signing up creates the clinic and its first user in one go — a clinic with
nobody in it, or a user belonging to no clinic, are both useless.
"""
from flask import Blueprint, g, jsonify, request
from sqlalchemy import func, select

from ..auth import hash_password, login_required, make_token, verify_password
from ..db import session
from ..models import Clinic, User
from ..util import bad, clean, clinic_json, mobile10, slugify, user_json

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

MIN_PASSWORD = 8


def _email(raw) -> str:
    e = clean(raw, 160).lower()
    return e if "@" in e and "." in e.split("@")[-1] and " " not in e else ""


def _unique_slug(s, wanted: str) -> str:
    base = wanted or "clinic"
    slug, n = base, 1
    while s.scalar(select(func.count()).select_from(Clinic).where(Clinic.slug == slug)):
        n += 1
        slug = f"{base}-{n}"
    return slug


@bp.post("/signup")
def signup():
    data = request.get_json(silent=True) or {}
    clinic_name = clean(data.get("clinicName"), 160)
    name = clean(data.get("name"), 120)
    email = _email(data.get("email"))
    mobile = mobile10(data.get("mobile"))
    password = str(data.get("password") or "")

    if not clinic_name:
        return bad("Tell us the clinic's name")
    if not name:
        return bad("Tell us your name")
    if not email:
        return bad("That email address does not look right")
    if len(password) < MIN_PASSWORD:
        return bad(f"Use a password of at least {MIN_PASSWORD} characters")

    s = session()
    if s.scalar(select(func.count()).select_from(User).where(func.lower(User.email) == email)):
        return bad("An account already uses that email. Sign in instead.", 409)

    clinic = Clinic(name=clinic_name, slug=_unique_slug(s, slugify(clinic_name)), phone=mobile, email=email)
    s.add(clinic)
    s.flush()

    user = User(
        clinic_id=clinic.id, name=name, email=email, phone=mobile,
        password_hash=hash_password(password), role="owner",
    )
    s.add(user)
    s.commit()

    return jsonify(token=make_token(user), user=user_json(user), clinic=clinic_json(clinic)), 201


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = _email(data.get("email"))
    password = str(data.get("password") or "")

    s = session()
    user = s.scalar(select(User).where(func.lower(User.email) == email)) if email else None
    # the same answer either way, so nobody can fish for which emails exist
    if user is None or not verify_password(password, user.password_hash):
        return bad("That email and password do not match", 401)
    if not user.active:
        return bad("This login has been switched off", 403)

    clinic = s.get(Clinic, user.clinic_id)
    return jsonify(token=make_token(user), user=user_json(user), clinic=clinic_json(clinic))


@bp.get("/me")
@login_required
def me():
    clinic = session().get(Clinic, g.clinic_id)
    return jsonify(user=user_json(g.user), clinic=clinic_json(clinic))


@bp.post("/password")
@login_required
def change_password():
    data = request.get_json(silent=True) or {}
    current = str(data.get("current") or "")
    fresh = str(data.get("new") or "")
    if not verify_password(current, g.user.password_hash):
        return bad("Your current password is wrong", 403)
    if len(fresh) < MIN_PASSWORD:
        return bad(f"Use a password of at least {MIN_PASSWORD} characters")

    s = session()
    g.user.password_hash = hash_password(fresh)
    s.commit()
    return jsonify(ok=True)
