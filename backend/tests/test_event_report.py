"""Backend tests for event report + rsvp regression (Phase 5)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend .env manually
    from pathlib import Path
    for line in (Path("/app/frontend/.env").read_text().splitlines()):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
            break


@pytest.fixture(scope="module")
def seeded_event():
    r = requests.get(f"{BASE_URL}/api/events")
    assert r.status_code == 200
    events = r.json()
    ev = next((e for e in events if "Longoz" in e["title"]), None)
    assert ev is not None, "Seed event not found"
    return ev


@pytest.fixture(scope="module")
def employees():
    r = requests.get(f"{BASE_URL}/api/employees")
    assert r.status_code == 200
    return r.json()


def test_event_report_structure(seeded_event):
    r = requests.get(f"{BASE_URL}/api/events/{seeded_event['id']}/report")
    assert r.status_code == 200
    data = r.json()
    for key in ("counts", "total_responded", "target_count", "response_rate", "departments"):
        assert key in data
    for k in ("katiliyorum", "belki", "katilmiyorum"):
        assert k in data["counts"]
    # departments sum must equal total_responded
    dept_sum = sum(d["total"] for d in data["departments"])
    assert dept_sum == data["total_responded"]
    # and per-dept sub-sums match
    for d in data["departments"]:
        assert d["katiliyorum"] + d["belki"] + d["katilmiyorum"] == d["total"]
    # counts sum
    total_counts = sum(data["counts"].values())
    assert total_counts == data["total_responded"]
    assert data["total_responded"] >= 3


def test_event_report_departments_match_responders(seeded_event, employees):
    r = requests.get(f"{BASE_URL}/api/events/{seeded_event['id']}/report")
    data = r.json()
    # every department in report should be a real employee department
    emp_depts = {e["department"] for e in employees}
    for d in data["departments"]:
        assert d["department"] in emp_depts


def test_event_report_404():
    r = requests.get(f"{BASE_URL}/api/events/does-not-exist/report")
    assert r.status_code == 404


def test_rsvp_upsert_no_regression(seeded_event, employees):
    eid = seeded_event["id"]
    emp = employees[0]  # admin employee (Selin)
    # first response
    r1 = requests.post(f"{BASE_URL}/api/events/{eid}/rsvp",
                       json={"employee_id": emp["id"], "response": "katiliyorum"})
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["ok"] is True
    assert d1["my_rsvp"] == "katiliyorum"
    c1 = d1["rsvp_counts"]["katiliyorum"]

    # update same employee -> should upsert not duplicate
    r2 = requests.post(f"{BASE_URL}/api/events/{eid}/rsvp",
                       json={"employee_id": emp["id"], "response": "belki"})
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["my_rsvp"] == "belki"
    # katiliyorum count should decrease by 1 (moved to belki)
    assert d2["rsvp_counts"]["katiliyorum"] == c1 - 1

    # verify persistence via report
    rep = requests.get(f"{BASE_URL}/api/events/{eid}/report").json()
    assert rep["counts"]["belki"] == d2["rsvp_counts"]["belki"]


def test_calendar_events_have_dates():
    r = requests.get(f"{BASE_URL}/api/events")
    assert r.status_code == 200
    evs = r.json()
    aug = [e for e in evs if e.get("event_date", "").startswith("2026-08-26")]
    sep = [e for e in evs if e.get("event_date", "").startswith("2026-09-05")]
    assert len(aug) >= 1
    assert len(sep) >= 1


def test_admin_smoke_endpoints():
    for path in ("/api/categories", "/api/pulses", "/api/announcements", "/api/employees"):
        r = requests.get(f"{BASE_URL}{path}")
        assert r.status_code == 200
