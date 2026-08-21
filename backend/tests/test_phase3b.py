"""Phase 3b backend tests: Awards (Şirketin Enleri), Kutlama templates + feed,
Event capacity + checkin + service report."""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv('/app/frontend/.env')
BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def emps(s):
    r = s.get(f"{API}/employees")
    assert r.status_code == 200
    return r.json()


# ---- Awards ----
class TestAwards:
    def test_award_crud_and_winner(self, s, emps):
        # Create award
        r = s.post(f"{API}/awards", json={"name": "TEST_QA_Award", "method": "manual", "period": "aylik"})
        assert r.status_code == 200, r.text
        award = r.json()
        assert award["name"] == "TEST_QA_Award"
        assert award["method"] == "manual"
        aid = award["id"]

        # List contains it
        rows = s.get(f"{API}/awards").json()
        assert any(a["id"] == aid for a in rows)

        # Set winner
        emp = emps[0]
        r = s.post(f"{API}/awards/{aid}/winner", json={"employee_id": emp["id"], "period_label": "TEST_Ocak 2026"})
        assert r.status_code == 200
        winner = r.json()
        assert winner["employee_id"] == emp["id"]

        # winners list enriched with employee_name + award_name
        wl = s.get(f"{API}/awards/winners").json()
        mine = [w for w in wl if w["award_id"] == aid]
        assert len(mine) == 1
        assert mine[0]["employee_name"] == emp["name"]
        assert mine[0]["award_name"] == "TEST_QA_Award"

        # Cleanup award (also deletes winners+votes)
        r = s.delete(f"{API}/awards/{aid}")
        assert r.status_code == 200
        wl2 = s.get(f"{API}/awards/winners").json()
        assert not any(w["award_id"] == aid for w in wl2)

    def test_award_vote_tally(self, s, emps):
        r = s.post(f"{API}/awards", json={"name": "TEST_QA_VoteAward", "method": "vote", "period": "aylik"})
        assert r.status_code == 200
        aid = r.json()["id"]

        nominee = emps[0]["id"]
        # Two different voters -> nominee gets 2 votes
        s.post(f"{API}/awards/{aid}/vote", json={"voter_id": emps[1]["id"], "nominee_id": nominee})
        s.post(f"{API}/awards/{aid}/vote", json={"voter_id": emps[2]["id"], "nominee_id": nominee})
        # Same voter re-votes for different nominee -> should update, not add
        s.post(f"{API}/awards/{aid}/vote", json={"voter_id": emps[1]["id"], "nominee_id": emps[3]["id"]})

        tally = s.get(f"{API}/awards/{aid}/votes").json()
        assert tally["total"] == 2  # 2 unique voters
        # Nominee should have 1 vote (emp2), emp3 should have 1 vote (emp1 switched)
        by_emp = {t["employee_id"]: t["votes"] for t in tally["tally"]}
        assert by_emp.get(nominee) == 1
        assert by_emp.get(emps[3]["id"]) == 1

        s.delete(f"{API}/awards/{aid}")


# ---- Kutlama ----
class TestKutlama:
    def test_template_crud(self, s):
        img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        r = s.post(f"{API}/celebration-templates", json={"subtype": "dogum_gunu", "image": img})
        assert r.status_code == 200, r.text
        tpl = r.json()
        tid = tpl["id"]
        assert tpl["subtype"] == "dogum_gunu"

        rows = s.get(f"{API}/celebration-templates").json()
        assert any(t["id"] == tid for t in rows)

        r = s.delete(f"{API}/celebration-templates/{tid}")
        assert r.status_code == 200
        rows = s.get(f"{API}/celebration-templates").json()
        assert not any(t["id"] == tid for t in rows)

    def test_celebrations_feed_structure(self, s):
        r = s.get(f"{API}/celebrations/feed")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for c in data:
            assert c["subtype"] in ("dogum_gunu", "kidem", "yeni_baslayan")
            assert "employee_name" in c
            assert "label" in c
            assert "detail" in c

    def test_employees_have_dates_seeded(self, s):
        emps = s.get(f"{API}/employees").json()
        # Phase3b seed migrates birth_date + hire_date
        assert all("birth_date" in e and e["birth_date"] for e in emps)
        assert all("hire_date" in e and e["hire_date"] for e in emps)


# ---- Event capacity + checkin + service report ----
class TestEventCapacityAndCheckin:
    def _find_or_create_event(self, s, capacity=None, service_link=False):
        payload = {
            "title": "TEST_QA_CapEvent",
            "description": "capacity test",
            "location": "Merkez Ofis",
            "event_date": "2030-06-15T18:00:00",
            "audience": {"all": True, "departments": [], "locations": [], "titles": [], "seniorities": []},
            "channels": ["mail"],
            "status": "yayinda",
            "allow_maybe": True,
            "capacity": capacity,
            "service_link": service_link,
        }
        r = s.post(f"{API}/events", json=payload)
        assert r.status_code == 200, r.text
        return r.json()

    def test_capacity_limit_returns_400(self, s, emps):
        ev = self._find_or_create_event(s, capacity=1)
        eid = ev["id"]
        try:
            # First katiliyorum from emp0 -> OK
            r = s.post(f"{API}/events/{eid}/rsvp", json={"employee_id": emps[0]["id"], "response": "katiliyorum"})
            assert r.status_code == 200
            # Second katiliyorum from emp1 -> 400 Kontenjan dolu
            r = s.post(f"{API}/events/{eid}/rsvp", json={"employee_id": emps[1]["id"], "response": "katiliyorum"})
            assert r.status_code == 400
            assert "Kontenjan dolu" in r.text
            # Same emp0 updating own katiliyorum -> allowed (uses $ne self)
            r = s.post(f"{API}/events/{eid}/rsvp", json={"employee_id": emps[0]["id"], "response": "katiliyorum"})
            assert r.status_code == 200
            # emp1 can still say belki / katilmiyorum
            r = s.post(f"{API}/events/{eid}/rsvp", json={"employee_id": emps[1]["id"], "response": "belki"})
            assert r.status_code == 200
        finally:
            s.delete(f"{API}/events/{eid}")

    def test_checkin_and_service_report(self, s, emps):
        ev = self._find_or_create_event(s, capacity=None, service_link=True)
        eid = ev["id"]
        try:
            # emp0 rsvp katiliyorum with service
            s.post(f"{API}/events/{eid}/rsvp", json={"employee_id": emps[0]["id"], "response": "katiliyorum", "use_service": True, "route_id": "some-route"})
            # emp0 checkin
            r = s.post(f"{API}/events/{eid}/checkin", json={"employee_id": emps[0]["id"]})
            assert r.status_code == 200
            assert r.json()["checkin_count"] == 1
            # Idempotent - same user check-in again
            r = s.post(f"{API}/events/{eid}/checkin", json={"employee_id": emps[0]["id"]})
            assert r.status_code == 200
            assert r.json()["checkin_count"] == 1

            # Report contains checkin_count + service_count
            rep = s.get(f"{API}/events/{eid}/report").json()
            assert rep["checkin_count"] == 1
            assert rep["service_count"] == 1
        finally:
            s.delete(f"{API}/events/{eid}")

    def test_checkin_missing_event_404(self, s, emps):
        r = s.post(f"{API}/events/nonexistent/checkin", json={"employee_id": emps[0]["id"]})
        assert r.status_code == 404
