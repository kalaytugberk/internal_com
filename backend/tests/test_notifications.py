"""Backend tests for Bildirim Motoru (Anlık Bildirim + İSG Acil)."""
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
def employees(s):
    r = s.get(f"{API}/employees")
    assert r.status_code == 200
    return r.json()


# Ensures seeded categories anlik_bildirim + isg_acil exist
class TestSeededCategories:
    def test_categories_present(self, s):
        cats = s.get(f"{API}/categories").json()
        keys = {c["category_type"] for c in cats}
        assert "anlik_bildirim" in keys
        assert "isg_acil" in keys


# Full lifecycle for Anlık Bildirim
class TestAnlikBildirimLifecycle:
    created_id = None

    def test_create_requires_exactly_two_options(self, s):
        payload = {
            "kind": "anlik_bildirim", "message": "TEST_bad", "options": [{"key": "a", "label": "A"}],
            "audience": {"all": True}, "channels": ["push"],
        }
        r = s.post(f"{API}/notifications", json=payload)
        assert r.status_code == 400

        payload["options"] = [{"key": "a", "label": "A"}, {"key": "b", "label": "B"}, {"key": "c", "label": "C"}]
        r = s.post(f"{API}/notifications", json=payload)
        assert r.status_code == 400

    def test_create_and_list(self, s):
        payload = {
            "kind": "anlik_bildirim", "title": "TEST_Anlik", "message": "Test soru?",
            "channels": ["push", "sms"], "audience": {"all": True},
            "options": [{"key": "yes", "label": "Katılıyorum"}, {"key": "no", "label": "Katılmıyorum"}],
        }
        r = s.post(f"{API}/notifications", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["kind"] == "anlik_bildirim"
        assert len(d["options"]) == 2
        assert d["message"] == "Test soru?"
        TestAnlikBildirimLifecycle.created_id = d["id"]

        r = s.get(f"{API}/notifications", params={"kind": "anlik_bildirim"})
        assert r.status_code == 200
        lst = r.json()
        row = next(n for n in lst if n["id"] == d["id"])
        assert row["responded"] == 0
        assert row["counts"] == {"yes": 0, "no": 0}

    def test_feed_and_respond(self, s, employees):
        nid = TestAnlikBildirimLifecycle.created_id
        emp = employees[0]
        feed = s.get(f"{API}/notifications/feed", params={"employee_id": emp["id"]}).json()
        row = next(n for n in feed if n["id"] == nid)
        assert row["my_response"] is None

        # Invalid option
        r = s.post(f"{API}/notifications/{nid}/respond", json={"employee_id": emp["id"], "option_key": "xx"})
        assert r.status_code == 400

        # Valid
        r = s.post(f"{API}/notifications/{nid}/respond", json={"employee_id": emp["id"], "option_key": "yes"})
        assert r.status_code == 200
        assert r.json()["my_response"] == "yes"

        # Duplicate
        r = s.post(f"{API}/notifications/{nid}/respond", json={"employee_id": emp["id"], "option_key": "no"})
        assert r.status_code == 400
        assert "Zaten" in r.json().get("detail", "")

        # Feed shows my_response
        feed = s.get(f"{API}/notifications/feed", params={"employee_id": emp["id"]}).json()
        row = next(n for n in feed if n["id"] == nid)
        assert row["my_response"] == "yes"

    def test_report(self, s, employees):
        nid = TestAnlikBildirimLifecycle.created_id
        r = s.get(f"{API}/notifications/{nid}/report")
        assert r.status_code == 200
        rep = r.json()
        assert rep["target_count"] == len(employees)
        assert rep["responded_count"] == 1
        assert rep["counts"]["yes"] == 1
        assert rep["counts"]["no"] == 0
        assert rep["response_rate"] == round(100 * 1 / len(employees))
        assert len(rep["responded"]) == 1
        assert len(rep["not_responded"]) == len(employees) - 1

    def test_delete(self, s):
        nid = TestAnlikBildirimLifecycle.created_id
        r = s.delete(f"{API}/notifications/{nid}")
        assert r.status_code == 200
        # Report should now 404
        r = s.get(f"{API}/notifications/{nid}/report")
        assert r.status_code == 404


# İSG audience-filtered lifecycle
class TestIsgAudience:
    def test_isg_audience_filter(self, s, employees):
        # Choose one employee's location, use it as targeted audience
        target_emp = employees[0]
        loc = target_emp["location"]
        payload = {
            "kind": "isg_acil", "title": "TEST_ISG", "message": "Deprem tatbikatı",
            "channels": ["push"],
            "audience": {"all": False, "locations": [loc], "departments": [], "titles": [], "seniorities": []},
            "options": [{"key": "safe", "label": "Güvendeyim"}, {"key": "help", "label": "Yardım"}],
            "reminder_enabled": True, "reminder_minutes": 10,
        }
        r = s.post(f"{API}/notifications", json=payload)
        assert r.status_code == 200
        nid = r.json()["id"]
        assert r.json()["reminder_enabled"] is True

        target_ids = {e["id"] for e in employees if e["location"] == loc}
        outsider = next((e for e in employees if e["location"] != loc), None)

        # Feed for a target employee -> sees it
        feed = s.get(f"{API}/notifications/feed", params={"employee_id": target_emp["id"]}).json()
        assert any(n["id"] == nid for n in feed)

        # Feed for outsider -> filtered out
        if outsider:
            of = s.get(f"{API}/notifications/feed", params={"employee_id": outsider["id"]}).json()
            assert not any(n["id"] == nid for n in of)

        # Report target_count matches location match count
        rep = s.get(f"{API}/notifications/{nid}/report").json()
        assert rep["target_count"] == len(target_ids)
        assert rep["responded_count"] == 0
        assert rep["response_rate"] == 0

        # Cleanup
        r = s.delete(f"{API}/notifications/{nid}")
        assert r.status_code == 200
