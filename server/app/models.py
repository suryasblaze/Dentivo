"""Database tables.

Every table except `clinics` carries `clinic_id`. Nothing is ever fetched
without it: the id comes from the caller's login token, never from the
request, which is what keeps one clinic's patients away from another's.

Column types stay to the portable ones (String, JSON) so the same models
run on Postgres in production and on SQLite in the tests.
"""
from datetime import datetime, timezone
import uuid

from sqlalchemy import (
    JSON, Boolean, Column, Date, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship


def uid() -> str:
    return uuid.uuid4().hex


def now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Clinic(Base):
    __tablename__ = "clinics"

    id = Column(String(32), primary_key=True, default=uid)
    name = Column(String(160), nullable=False)
    slug = Column(String(40), unique=True)           # /go/<slug> and the intake link
    phone = Column(String(32))
    email = Column(String(160))
    address = Column(Text)
    gstin = Column(String(20))
    upi_id = Column(String(120))
    google_review_url = Column(Text)
    settings = Column(JSON, default=dict)            # everything not worth a column yet
    plan = Column(String(20), default="trial")
    trial_started = Column(Date, default=lambda: now().date())
    created_at = Column(DateTime, default=now)

    users = relationship("User", back_populates="clinic", cascade="all, delete-orphan")


class User(Base):
    """Staff. A patient never gets a login."""

    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)

    id = Column(String(32), primary_key=True, default=uid)
    clinic_id = Column(String(32), ForeignKey("clinics.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(120), nullable=False)
    email = Column(String(160), nullable=False)
    phone = Column(String(32))
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), default="owner")       # owner · dentist · reception · assistant
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now)

    clinic = relationship("Clinic", back_populates="users")


class Patient(Base):
    __tablename__ = "patients"
    __table_args__ = (
        UniqueConstraint("clinic_id", "mobile", name="uq_patient_mobile_per_clinic"),
        Index("ix_patients_clinic", "clinic_id"),
    )

    id = Column(String(32), primary_key=True, default=uid)
    clinic_id = Column(String(32), ForeignKey("clinics.id", ondelete="CASCADE"), nullable=False)
    uhid = Column(String(20))
    name = Column(String(120), nullable=False)
    mobile = Column(String(15), nullable=False)      # ten digits, the way patients are found
    gender = Column(String(12))
    age = Column(Integer)
    notes = Column(Text)
    balance = Column(Integer, default=0)             # rupees, never fractions
    created_at = Column(DateTime, default=now)


class Submission(Base):
    """What the QR form sends. Unclaimed until reception turns it into a patient."""

    __tablename__ = "submissions"
    __table_args__ = (Index("ix_submissions_clinic", "clinic_id", "status"),)

    id = Column(String(32), primary_key=True, default=uid)
    clinic_id = Column(String(32), ForeignKey("clinics.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(120), nullable=False)
    mobile = Column(String(15), nullable=False)
    gender = Column(String(12))
    issue = Column(Text)
    status = Column(String(20), default="new")       # new · added · ignored
    patient_id = Column(String(32), ForeignKey("patients.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=now)


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (Index("ix_appts_clinic_date", "clinic_id", "date"),)

    id = Column(String(32), primary_key=True, default=uid)
    clinic_id = Column(String(32), ForeignKey("clinics.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(String(32), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    date = Column(String(10), nullable=False)        # local YYYY-MM-DD, never UTC
    time = Column(String(5), nullable=False)         # HH:MM
    doctor = Column(String(120))
    chair = Column(String(40))
    reason = Column(Text)
    status = Column(String(20), default="scheduled")  # scheduled · arrived · done · no_show · cancelled
    visit_id = Column(String(32))
    created_at = Column(DateTime, default=now)


class Visit(Base):
    """One sitting. The clinical detail stays as JSON so the chart can change
    shape without a migration; money is kept in columns so it can be summed."""

    __tablename__ = "visits"
    __table_args__ = (Index("ix_visits_clinic_date", "clinic_id", "date"),)

    id = Column(String(32), primary_key=True, default=uid)
    clinic_id = Column(String(32), ForeignKey("clinics.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(String(32), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    date = Column(String(10), nullable=False)
    token = Column(String(10))
    stage = Column(String(20), default="checkin")    # checkin · consultation · treatment · billing · done
    visit_type = Column(String(40))
    doctor = Column(String(120))
    chair = Column(String(40))
    reason = Column(Text)
    chart = Column(JSON, default=dict)               # teeth, diagnosis, notes
    plan = Column(JSON, default=list)                # treatment items with prices
    rx = Column(JSON, default=list)                  # prescription
    next_visit = Column(String(80))
    discount = Column(Integer, default=0)
    invoice_no = Column(String(20))
    invoice_date = Column(String(10))
    total = Column(Integer, default=0)
    paid = Column(Integer, default=0)
    due = Column(Integer, default=0)
    bill_token = Column(String(24), index=True)      # what /b/<token> opens
    whatsapp_sent_at = Column(DateTime)
    review_requested = Column(Boolean, default=False)
    closed_at = Column(DateTime)
    created_at = Column(DateTime, default=now)


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (Index("ix_payments_clinic", "clinic_id", "date"),)

    id = Column(String(32), primary_key=True, default=uid)
    clinic_id = Column(String(32), ForeignKey("clinics.id", ondelete="CASCADE"), nullable=False)
    visit_id = Column(String(32), ForeignKey("visits.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(String(32), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Integer, nullable=False)
    mode = Column(String(40))                        # UPI · Card · Cash · EMI
    reference = Column(String(80))
    date = Column(String(10))
    created_at = Column(DateTime, default=now)


class Feedback(Base):
    """Written by the patient on their own phone, so it arrives without a login."""

    __tablename__ = "feedback"
    __table_args__ = (
        UniqueConstraint("visit_id", name="uq_feedback_per_visit"),
        Index("ix_feedback_clinic", "clinic_id"),
    )

    id = Column(String(32), primary_key=True, default=uid)
    clinic_id = Column(String(32), ForeignKey("clinics.id", ondelete="CASCADE"), nullable=False)
    visit_id = Column(String(32), ForeignKey("visits.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(String(32), ForeignKey("patients.id", ondelete="SET NULL"))
    rating = Column(Integer)
    comment = Column(Text)
    went_to_google = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now)


class Counter(Base):
    """Per-clinic running numbers: UHID, token, invoice, receipt. Kept in a row
    so two receptionists cannot be handed the same invoice number."""

    __tablename__ = "counters"

    clinic_id = Column(String(32), ForeignKey("clinics.id", ondelete="CASCADE"), primary_key=True)
    name = Column(String(20), primary_key=True)
    value = Column(Integer, default=0, nullable=False)
