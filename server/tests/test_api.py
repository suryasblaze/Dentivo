"""API tests. They run against SQLite in memory, so no database is needed.

The important ones are in test_isolation: a clinic must never reach another
clinic's patients, however the request is phrased.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("JWT_SECRET", "test-secret-not-used-anywhere-real")
os.environ.setdefault("DATABASE_URL", "sqlite://")

from app import create_app          # noqa: E402
from app import db as dbmod         # noqa: E402


@pytest.fixture()
def client():
    dbmod.reset_for_tests()
    app = create_app("sqlite://")
    dbmod.create_all("sqlite://")
    app.config.update(TESTING=True)
    with app.test_client() as c:
        yield c
    dbmod.reset_for_tests()


def signup(c, clinic="Sree Dental Care", email="arun@sree.in", password="opensesame1"):
    r = c.post("/api/auth/signup", json={
        "clinicName": clinic, "name": "Dr. Arun", "email": email,
        "mobile": "9840012345", "password": password,
    })
    assert r.status_code == 201, r.get_json()
    return r.get_json()


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ------------------------------------------------------------------ signup
def test_signup_creates_clinic_and_owner(client):
    data = signup(client)
    assert data["user"]["role"] == "owner"
    assert data["clinic"]["name"] == "Sree Dental Care"
    assert data["clinic"]["slug"] == "sree-dental-care"
    assert data["token"]


def test_signup_rejects_weak_password_and_bad_email(client):
    r = client.post("/api/auth/signup", json={"clinicName": "X", "name": "Y", "email": "a@b.in", "password": "short"})
    assert r.status_code == 400
    r = client.post("/api/auth/signup", json={"clinicName": "X", "name": "Y", "email": "nope", "password": "longenough1"})
    assert r.status_code == 400


def test_email_is_taken_once(client):
    signup(client)
    r = client.post("/api/auth/signup", json={
        "clinicName": "Other", "name": "Someone", "email": "arun@sree.in", "password": "opensesame1"})
    assert r.status_code == 409


def test_password_is_never_stored_or_returned(client):
    data = signup(client)
    assert "password" not in str(data).lower() or "opensesame1" not in str(data)
    from app.db import session
    from app.models import User
    user = session().get(User, data["user"]["id"])
    assert "opensesame1" not in user.password_hash


def test_login_and_me(client):
    signup(client)
    r = client.post("/api/auth/login", json={"email": "arun@sree.in", "password": "opensesame1"})
    assert r.status_code == 200
    token = r.get_json()["token"]
    me = client.get("/api/auth/me", headers=auth(token))
    assert me.get_json()["user"]["email"] == "arun@sree.in"


def test_wrong_password_says_nothing_useful(client):
    signup(client)
    r = client.post("/api/auth/login", json={"email": "arun@sree.in", "password": "wrongwrong1"})
    assert r.status_code == 401
    unknown = client.post("/api/auth/login", json={"email": "nobody@nowhere.in", "password": "wrongwrong1"})
    assert unknown.get_json()["error"] == r.get_json()["error"]


def test_no_token_no_entry(client):
    assert client.get("/api/patients").status_code == 401
    assert client.get("/api/patients", headers=auth("made.up.token")).status_code == 401


# ---------------------------------------------------------------- patients
def test_patient_round_trip(client):
    t = signup(client)["token"]
    r = client.post("/api/patients", json={"name": "Surya Kumar", "mobile": "+91 99762 91294"}, headers=auth(t))
    assert r.status_code == 201
    p = r.get_json()["patient"]
    assert p["mobile"] == "9976291294"      # stored as ten digits
    assert p["uhid"] == "P-0001"

    again = client.post("/api/patients", json={"name": "Surya K", "mobile": "9976291294"}, headers=auth(t))
    assert again.get_json()["existed"] is True      # same person, not a second record

    found = client.get("/api/patients?q=surya", headers=auth(t)).get_json()["patients"]
    assert len(found) == 1


def test_patient_needs_a_real_mobile(client):
    t = signup(client)["token"]
    assert client.post("/api/patients", json={"name": "A", "mobile": "12345"}, headers=auth(t)).status_code == 400
    assert client.post("/api/patients", json={"name": "", "mobile": "9876543210"}, headers=auth(t)).status_code == 400


# ------------------------------------------------------------------ visits
def start_visit(client, t):
    p = client.post("/api/patients", json={"name": "Surya Kumar", "mobile": "9976291294"}, headers=auth(t)).get_json()["patient"]
    v = client.post("/api/visits", json={"patientId": p["id"], "visitType": "Walk-in"}, headers=auth(t)).get_json()["visit"]
    return p, v


def test_check_in_twice_keeps_one_visit(client):
    t = signup(client)["token"]
    p, v = start_visit(client, t)
    again = client.post("/api/visits", json={"patientId": p["id"]}, headers=auth(t)).get_json()
    assert again["existed"] is True and again["visit"]["id"] == v["id"]
    assert len(client.get("/api/visits", headers=auth(t)).get_json()["visits"]) == 1


def test_totals_are_worked_out_on_the_server(client):
    t = signup(client)["token"]
    _, v = start_visit(client, t)
    plan = [{"name": "RCT", "price": 6500, "status": "done"},
            {"name": "Crown", "price": 5000, "status": "planned"},   # not done: not billed
            {"name": "X-ray", "price": 300, "status": "done", "gst": 18}]
    r = client.patch(f"/api/visits/{v['id']}", json={"plan": plan, "discount": 500}, headers=auth(t)).get_json()["visit"]
    assert r["total"] == 6500 + 300 - 500 + 54
    assert r["due"] == r["total"]


def test_invoice_number_is_issued_once(client):
    t = signup(client)["token"]
    _, v = start_visit(client, t)
    first = client.post(f"/api/visits/{v['id']}/invoice", headers=auth(t)).get_json()["visit"]
    client.patch(f"/api/visits/{v['id']}", json={"discount": 100}, headers=auth(t))
    second = client.post(f"/api/visits/{v['id']}/invoice", headers=auth(t)).get_json()["visit"]
    assert first["invoice"]["no"] == second["invoice"]["no"] == "INV-0001"
    assert first["billToken"] == second["billToken"]
    assert len(first["billToken"]) == 14


def test_cannot_pay_more_than_is_owed(client):
    t = signup(client)["token"]
    _, v = start_visit(client, t)
    client.patch(f"/api/visits/{v['id']}", json={"plan": [{"name": "Filling", "price": 2500, "status": "done"}]}, headers=auth(t))
    over = client.post(f"/api/visits/{v['id']}/payments", json={"amount": 5000, "mode": "UPI"}, headers=auth(t))
    assert over.status_code == 400
    ok = client.post(f"/api/visits/{v['id']}/payments", json={"amount": 1000, "mode": "UPI"}, headers=auth(t))
    assert ok.status_code == 201 and ok.get_json()["visit"]["due"] == 1500


def test_closing_carries_the_balance_once(client):
    t = signup(client)["token"]
    p, v = start_visit(client, t)
    client.patch(f"/api/visits/{v['id']}", json={"plan": [{"name": "Filling", "price": 2500, "status": "done"}]}, headers=auth(t))
    client.post(f"/api/visits/{v['id']}/payments", json={"amount": 1000}, headers=auth(t))
    first = client.post(f"/api/visits/{v['id']}/close", headers=auth(t)).get_json()
    assert first["carried"] == 1500
    again = client.post(f"/api/visits/{v['id']}/close", headers=auth(t)).get_json()
    assert again["alreadyClosed"] is True
    patient = [x for x in client.get("/api/patients", headers=auth(t)).get_json()["patients"] if x["id"] == p["id"]][0]
    assert patient["balance"] == 1500          # carried once, not twice


def test_a_closed_visit_cannot_be_edited(client):
    t = signup(client)["token"]
    _, v = start_visit(client, t)
    client.post(f"/api/visits/{v['id']}/close", headers=auth(t))
    assert client.patch(f"/api/visits/{v['id']}", json={"discount": 100}, headers=auth(t)).status_code == 409


# ------------------------------------------------------------ the patient's phone
def test_intake_reaches_the_clinic(client):
    data = signup(client)
    slug = data["clinic"]["slug"]
    r = client.post(f"/api/public/intake/{slug}", json={"name": "Kavya", "mobile": "98410 55221", "issue": "Sensitivity"})
    assert r.status_code == 201
    again = client.post(f"/api/public/intake/{slug}", json={"name": "Kavya", "mobile": "9841055221"})
    assert again.get_json()["duplicate"] is True        # double tap is not two patients
    subs = client.get("/api/submissions", headers=auth(data["token"])).get_json()["submissions"]
    assert len(subs) == 1 and subs[0]["name"] == "Kavya"


def test_intake_to_an_unknown_clinic_is_refused(client):
    assert client.post("/api/public/intake/nobody", json={"name": "A", "mobile": "9876543210"}).status_code == 404


def test_bill_link_shows_the_bill_and_takes_feedback(client):
    t = signup(client)["token"]
    _, v = start_visit(client, t)
    client.patch(f"/api/visits/{v['id']}", json={"plan": [{"name": "Filling", "price": 2500, "status": "done"}]}, headers=auth(t))
    billed = client.post(f"/api/visits/{v['id']}/invoice", headers=auth(t)).get_json()["visit"]
    client.post(f"/api/visits/{v['id']}/sent", json={"review": True}, headers=auth(t))

    public = client.get(f"/api/public/bill/{billed['billToken']}")      # no login
    body = public.get_json()
    assert body["bill"]["total"] == 2500 and body["patient"]["name"] == "Surya Kumar"
    assert body["askReview"] is True

    client.post(f"/api/public/bill/{billed['billToken']}/feedback", json={"rating": 5, "wentToGoogle": True})
    client.post(f"/api/public/bill/{billed['billToken']}/feedback", json={"rating": 4, "comment": "Changed my mind"})
    got = client.get("/api/feedback", headers=auth(t)).get_json()["feedback"]
    assert len(got) == 1 and got[0]["rating"] == 4      # replaced, not duplicated


def test_a_made_up_bill_token_finds_nothing(client):
    assert client.get("/api/public/bill/zzzzzzzzzzzzzz").status_code == 404


# --------------------------------------------------------------- isolation
def test_one_clinic_cannot_see_another(client):
    a = signup(client, "Clinic A", "a@a.in")
    b = signup(client, "Clinic B", "b@b.in")

    pa = client.post("/api/patients", json={"name": "A Patient", "mobile": "9000000001"}, headers=auth(a["token"])).get_json()["patient"]
    client.post("/api/patients", json={"name": "B Patient", "mobile": "9000000002"}, headers=auth(b["token"]))

    seen = client.get("/api/patients", headers=auth(b["token"])).get_json()["patients"]
    assert [p["name"] for p in seen] == ["B Patient"]

    # B cannot read, change or start a visit on A's patient, even knowing the id
    assert client.patch(f"/api/patients/{pa['id']}", json={"name": "Hacked"}, headers=auth(b["token"])).status_code == 404
    assert client.post("/api/visits", json={"patientId": pa["id"]}, headers=auth(b["token"])).status_code == 404


def test_visits_and_money_stay_inside_the_clinic(client):
    a = signup(client, "Clinic A", "a2@a.in")
    b = signup(client, "Clinic B", "b2@b.in")
    _, va = start_visit(client, a["token"])

    assert client.patch(f"/api/visits/{va['id']}", json={"discount": 9999}, headers=auth(b["token"])).status_code == 404
    assert client.post(f"/api/visits/{va['id']}/payments", json={"amount": 100}, headers=auth(b["token"])).status_code == 404
    assert client.post(f"/api/visits/{va['id']}/close", headers=auth(b["token"])).status_code == 404
    assert client.get("/api/visits", headers=auth(b["token"])).get_json()["visits"] == []


def test_counters_are_per_clinic(client):
    a = signup(client, "Clinic A", "a3@a.in")
    b = signup(client, "Clinic B", "b3@b.in")
    for t in (a["token"], b["token"]):
        first = client.post("/api/patients", json={"name": "First", "mobile": "9111111111"}, headers=auth(t)).get_json()["patient"]
        assert first["uhid"] == "P-0001"       # each clinic starts at one


# -------------------------------------------------------------------- roles
def test_only_the_owner_changes_the_clinic_or_adds_staff(client):
    owner = signup(client, "Sree", "owner@sree.in")
    client.post("/api/staff", json={"name": "Reception", "email": "r@sree.in", "password": "opensesame1", "role": "reception"},
                headers=auth(owner["token"]))
    r = client.post("/api/auth/login", json={"email": "r@sree.in", "password": "opensesame1"}).get_json()

    assert client.patch("/api/clinic", json={"name": "Renamed"}, headers=auth(r["token"])).status_code == 403
    assert client.post("/api/staff", json={"name": "X", "email": "x@sree.in", "password": "opensesame1"},
                       headers=auth(r["token"])).status_code == 403
    # but reception still does its own job
    assert client.post("/api/patients", json={"name": "P", "mobile": "9222222222"}, headers=auth(r["token"])).status_code == 201


def test_owner_cannot_lock_themselves_out(client):
    o = signup(client, "Sree", "owner2@sree.in")
    me = o["user"]["id"]
    assert client.patch(f"/api/staff/{me}", json={"role": "reception"}, headers=auth(o["token"])).status_code == 400
    assert client.patch(f"/api/staff/{me}", json={"active": False}, headers=auth(o["token"])).status_code == 400


def test_slug_is_not_taken_twice(client):
    a = signup(client, "Sree Dental", "s1@x.in")
    b = signup(client, "Other Dental", "s2@x.in")
    assert client.patch("/api/clinic", json={"slug": "sree-dental"}, headers=auth(b["token"])).status_code == 409
    assert a["clinic"]["slug"] == "sree-dental"
