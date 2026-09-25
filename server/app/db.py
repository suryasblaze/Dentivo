"""One engine, one session per request.

Serverless functions come and go, so the engine holds no pool of its own —
Supabase's pooler (port 6543) does the pooling instead.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.pool import NullPool

from .models import Base

_engine = None
_Session = None


def database_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Copy .env.example to .env and paste the "
            "Supabase connection string into it."
        )
    # SQLAlchemy wants postgresql://, Supabase sometimes hands out postgres://
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url


def init(url: str | None = None):
    """Build the engine once and hand back the session factory."""
    global _engine, _Session
    if _Session is not None:
        return _Session
    url = url or database_url()
    kwargs = {"future": True, "pool_pre_ping": True}
    if url.startswith("postgresql"):
        kwargs["poolclass"] = NullPool          # the pooler already does this
        kwargs["connect_args"] = {"sslmode": "require"}
    _engine = create_engine(url, **kwargs)
    _Session = scoped_session(sessionmaker(bind=_engine, expire_on_commit=False, future=True))
    return _Session


def session():
    if _Session is None:
        init()
    return _Session()


def create_all(url: str | None = None):
    """Used by the tests and by `flask --app run init-db`."""
    init(url)
    Base.metadata.create_all(_engine)


def reset_for_tests():
    global _engine, _Session
    if _Session is not None:
        _Session.remove()
    _engine, _Session = None, None
