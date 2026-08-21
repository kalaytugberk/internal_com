"""Backend tests for Hedef Kitle (Audiences) — new named/criteria-based endpoints."""
import os
import pytest
import requests

from dotenv import load_dotenv
load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestAudiencesSeed:
    def test_list_returns_at_least_three_seeded(self, client):
        r = client.get(f"{API}/audiences")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        names = {a["name"] for a in data}
        for expected in ["Tüm Mühendislik", "İstanbul Ofisi", "Yöneticiler (Direktör hariç)"]:
            assert expected in names, f"Missing seeded audience: {expected}; got {names}"


class TestAudiencesCRUD:
    created_id = None

    def test_create(self, client):
        payload = {
            "name": "TEST_QA_Audience",
            "description": "created by testing agent",
            "module": "İç İletişim",
            "includes": [{"field": "location", "values": ["İstanbul"]}],
            "excludes": [{"field": "title", "values": ["Direktör"]}],
        }
        r = client.post(f"{API}/audiences", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["includes"][0]["field"] == "location"
        assert "id" in data
        TestAudiencesCRUD.created_id = data["id"]

        # GET verify persistence
        listed = client.get(f"{API}/audiences").json()
        assert any(a["id"] == data["id"] for a in listed)

    def test_preview_semantics_istanbul_minus_direktor(self, client):
        payload = {
            "includes": [{"field": "location", "values": ["İstanbul"]}],
            "excludes": [{"field": "title", "values": ["Direktör"]}],
        }
        r = client.post(f"{API}/audiences/preview", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "count" in data and "total" in data and "employees" in data
        # Per spec example expected 4 of 8
        assert data["count"] == 4, f"expected 4 matches, got {data['count']} of {data['total']}"
        for e in data["employees"]:
            assert e.get("location") == "İstanbul"
            assert e.get("title") != "Direktör"

    def test_update(self, client):
        aid = TestAudiencesCRUD.created_id
        assert aid
        r = client.put(f"{API}/audiences/{aid}", json={"description": "updated"})
        assert r.status_code == 200, r.text
        assert r.json()["description"] == "updated"

    def test_delete(self, client):
        aid = TestAudiencesCRUD.created_id
        assert aid
        r = client.delete(f"{API}/audiences/{aid}")
        assert r.status_code == 200
        listed = client.get(f"{API}/audiences").json()
        assert not any(a["id"] == aid for a in listed)


class TestFeedRegression:
    """employee_matches must handle both new and old shapes; feeds should still return data."""

    def test_announcements_feed(self, client):
        emps = client.get(f"{API}/employees").json()
        assert emps, "no employees seeded"
        eid = emps[0]["id"]
        r = client.get(f"{API}/announcements/feed", params={"employee_id": eid})
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_events_feed(self, client):
        emps = client.get(f"{API}/employees").json()
        eid = emps[0]["id"]
        r = client.get(f"{API}/events/feed", params={"employee_id": eid})
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)
