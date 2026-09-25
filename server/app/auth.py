"""Logins, tokens, and the rule that keeps clinics apart.

A token says who you are and which clinic you belong to. Every query is
filtered by the clinic id out of that token — never by one sent in the
request — so asking for someone else's patient simply finds nothing.
"""
import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from .db import session
from .models import User


def secret() -> str:
    s = os.environ.get("JWT_SECRET", "").strip()
    if not s:
        raise RuntimeError(
            "JWT_SECRET is not set. Generate one with: "
            'python -c "import secrets; print(secrets.token_urlsafe(48))"'
        )
    return s


def hash_password(raw: str) -> str:
    return generate_password_hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    return check_password_hash(hashed, raw)


def make_token(user: User) -> str:
    hours = int(os.environ.get("JWT_HOURS", "720"))
    payload = {
        "sub": user.id,
        "cid": user.clinic_id,
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=hours),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, secret(), algorithm="HS256")


def read_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, secret(), algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        token = header[7:].strip() if header.lower().startswith("bearer ") else ""
        claims = read_token(token) if token else None
        if not claims:
            return jsonify(error="Please sign in again"), 401

        user = session().get(User, claims["sub"])
        if user is None or not user.active:
            return jsonify(error="This login is no longer valid"), 401

        g.user = user
        g.clinic_id = user.clinic_id          # the only clinic id anything may use
        return fn(*args, **kwargs)

    return wrapper


def roles_required(*allowed):
    def decorator(fn):
        @wraps(fn)
        @login_required
        def wrapper(*args, **kwargs):
            if g.user.role not in allowed:
                return jsonify(error="Your role cannot do that"), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
