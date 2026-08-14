"""Tests for Phase 3: Events/RSVP category and Pulse Compare endpoint."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def employees(session):
    r = session.get(f"{API}/employees")
    assert r.status_code == 200
    return r.json()


# ---------------- Category types & Categories ----------------

class TestCategories:
    def test_category_types_include_etkinlik_active(self, session):
        r = session.get(f"{API}/category-types")
        assert r.status_code == 200
        data = r.json()
        etk = next((c for c in data if c["key"] == "etkinlik"), None)
        assert etk is not None
        assert etk["active"] is True

    def test_categories_have_three_active(self, session):
        r = session.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json()
        active_types = sorted([c["category_type"] for c in cats if c.get("status") == "active"])
        # expect duyuru, pulse, etkinlik among active
        for t in ["duyuru", "pulse", "etkinlik"]:
            assert t in active_types, f"missing {t} in {active_types}"


# ---------------- Events ----------------

class TestEvents:
    def test_list_events_seeded(self, session):
        r = session.get(f"{API}/events")
        assert r.status_code == 200
        evs = r.json()
        assert len(evs) >= 2
        for e in evs:
            assert "rsvp_counts" in e
            assert set(["katiliyorum", "katilmiyorum", "belki"]).issubset(e["rsvp_counts"].keys())

    def test_events_feed_includes_my_rsvp(self, session, employees):
        emp = employees[0]
        r = session.get(f"{API}/events/feed", params={"employee_id": emp["id"]})
        assert r.status_code == 200
        feed = r.json()
        assert len(feed) >= 2
        assert "my_rsvp" in feed[0]
        assert "rsvp_counts" in feed[0]

    def test_get_event_with_employee(self, session, employees):
        events = session.get(f"{API}/events").json()
        eid = events[0]["id"]
        r = session.get(f"{API}/events/{eid}", params={"employee_id": employees[0]["id"]})
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == eid
        assert "rsvp_counts" in data
        assert "my_rsvp" in data

    def test_create_update_delete_event(self, session):
        payload = {
            "title": "TEST_Event_E2E",
            "description": "Backend test event",
            "location": "İstanbul",
            "event_date": "2026-10-01T10:00:00",
            "audience": {"all": True, "departments": [], "locations": [], "titles": [], "seniorities": []},
            "status": "yayinda",
            "allow_maybe": True,
        }
        cr = session.post(f"{API}/events", json=payload)
        assert cr.status_code == 200, cr.text
        eid = cr.json()["id"]

        ur = session.put(f"{API}/events/{eid}", json={"title": "TEST_Event_Updated"})
        assert ur.status_code == 200
        assert ur.json()["title"] == "TEST_Event_Updated"

        gr = session.get(f"{API}/events/{eid}")
        assert gr.status_code == 200
        assert gr.json()["title"] == "TEST_Event_Updated"

        dr = session.delete(f"{API}/events/{eid}")
        assert dr.status_code == 200
        assert session.get(f"{API}/events/{eid}").status_code == 404


class TestRSVP:
    def test_rsvp_upsert_no_double_count(self, session, employees):
        events = session.get(f"{API}/events").json()
        # create isolated event
        payload = {"title": "TEST_RSVP_Event", "status": "yayinda", "allow_maybe": True,
                   "audience": {"all": True, "departments": [], "locations": [], "titles": [], "seniorities": []}}
        eid = session.post(f"{API}/events", json=payload).json()["id"]
        emp_id = employees[2]["id"]

        r1 = session.post(f"{API}/events/{eid}/rsvp", json={"employee_id": emp_id, "response": "katiliyorum"})
        assert r1.status_code == 200
        c1 = r1.json()["rsvp_counts"]
        assert c1["katiliyorum"] == 1 and c1["belki"] == 0

        # change response to belki -> should update, not add
        r2 = session.post(f"{API}/events/{eid}/rsvp", json={"employee_id": emp_id, "response": "belki"})
        c2 = r2.json()["rsvp_counts"]
        assert c2["belki"] == 1
        assert c2["katiliyorum"] == 0, f"double count! {c2}"
        assert r2.json()["my_rsvp"] == "belki"

        # cleanup
        session.delete(f"{API}/events/{eid}")

    def test_event_audience_filters_feed(self, session, employees):
        muh = next(e for e in employees if e["department"] == "Mühendislik")
        sat = next(e for e in employees if e["department"] == "Satış")

        payload = {
            "title": "TEST_MuhOnly",
            "status": "yayinda",
            "audience": {"all": False, "departments": ["Mühendislik"], "locations": [], "titles": [], "seniorities": []},
            "allow_maybe": True,
        }
        eid = session.post(f"{API}/events", json=payload).json()["id"]

        muh_feed = session.get(f"{API}/events/feed", params={"employee_id": muh["id"]}).json()
        sat_feed = session.get(f"{API}/events/feed", params={"employee_id": sat["id"]}).json()

        muh_ids = [e["id"] for e in muh_feed]
        sat_ids = [e["id"] for e in sat_feed]
        assert eid in muh_ids
        assert eid not in sat_ids

        session.delete(f"{API}/events/{eid}")


# ---------------- Pulse Compare ----------------

class TestPulseCompare:
    def test_compare_ranges(self, session):
        pulses = session.get(f"{API}/pulses").json()
        assert len(pulses) >= 1
        pid = pulses[0]["id"]
        # seeded dates are 2026-07-28 and 2026-08-04
        r = session.get(f"{API}/pulses/{pid}/compare",
                        params={"a_start": "2026-07-01", "a_end": "2026-07-31",
                                "b_start": "2026-08-01", "b_end": "2026-08-31"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "a" in data and "b" in data and "diff" in data and "trend" in data
        assert data["a"]["count"] > 0
        assert data["b"]["count"] > 0
        assert data["diff"] == round(data["b"]["avg"] - data["a"]["avg"], 2)

    def test_compare_empty_range(self, session):
        pulses = session.get(f"{API}/pulses").json()
        pid = pulses[0]["id"]
        r = session.get(f"{API}/pulses/{pid}/compare",
                        params={"a_start": "2020-01-01", "a_end": "2020-01-31",
                                "b_start": "2020-02-01", "b_end": "2020-02-28"})
        assert r.status_code == 200
        data = r.json()
        assert data["a"]["count"] == 0
        assert data["b"]["count"] == 0
        assert data["diff"] == 0
