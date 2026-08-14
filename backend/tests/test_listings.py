"""Backend tests for İlanlar (Listings) module — Phase 7."""
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


# ---- Config ----
class TestListingsConfig:
    def test_get_config(self, s):
        r = s.get(f"{API}/listings/config")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["display_name"] == "İlanlar"
        assert d["category_type"] == "ilan"
        assert isinstance(d.get("notification_channels"), list)
        assert d.get("default_duration_days") == 30

    def test_put_config(self, s):
        r = s.put(f"{API}/listings/config", json={
            "notification_channels": ["mail", "push", "sms"],
            "default_duration_days": 45,
        })
        assert r.status_code == 200
        d = r.json()
        assert d["notification_channels"] == ["mail", "push", "sms"]
        assert d["default_duration_days"] == 45
        # revert
        r = s.put(f"{API}/listings/config", json={
            "notification_channels": ["mail", "push"],
            "default_duration_days": 30,
        })
        assert r.status_code == 200


# ---- Employee backfill ----
class TestBackfill:
    def test_employees_have_email_phone(self, employees):
        for e in employees:
            assert e.get("email"), f"missing email on {e['name']}"
            assert e.get("phone"), f"missing phone on {e['name']}"


# ---- List / seed ----
class TestListingsList:
    def test_seeded_listings(self, s):
        r = s.get(f"{API}/listings")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 3
        # each has owner_name
        for l in data:
            assert "owner_name" in l and l["owner_name"] != "—"
        titles = [x["title"] for x in data]
        assert any("Otomobil" in t for t in titles)
        assert any("Kiralık" in t for t in titles)

    def test_filters(self, s):
        r = s.get(f"{API}/listings", params={"status": "onay_bekliyor"})
        assert r.status_code == 200
        assert all(x["status"] == "onay_bekliyor" for x in r.json())

        r = s.get(f"{API}/listings", params={"type": "satilik"})
        assert r.status_code == 200
        assert all(x["type"] == "satilik" for x in r.json())

        r = s.get(f"{API}/listings", params={"q": "otomobil"})
        assert r.status_code == 200
        assert all("otomobil" in x["title"].lower() for x in r.json())


# ---- Create / lifecycle ----
class TestListingLifecycle:
    def test_create_invalid_type(self, s, employees):
        r = s.post(f"{API}/listings", json={
            "employee_id": employees[0]["id"], "type": "hediye",
            "title": "TEST_bad", "description": "x", "images": [], "contact": "x",
        })
        assert r.status_code == 400

    def test_create_too_many_images(self, s, employees):
        r = s.post(f"{API}/listings", json={
            "employee_id": employees[0]["id"], "type": "satilik",
            "title": "TEST_imgs", "description": "x",
            "images": ["a", "b", "c", "d", "e", "f"], "contact": "x",
        })
        assert r.status_code == 400

    def test_full_lifecycle(self, s, employees):
        emp = employees[0]
        # Create
        payload = {
            "employee_id": emp["id"], "type": "satilik",
            "title": "TEST_Listing_Satilik", "description": "sale item",
            "images": [], "contact": "test@x.com",
        }
        r = s.post(f"{API}/listings", json=payload)
        assert r.status_code == 200, r.text
        l = r.json()
        lid = l["id"]
        assert l["status"] == "onay_bekliyor"
        assert l["expires_at"] is None

        # Mine should include it
        r = s.get(f"{API}/listings/mine", params={"employee_id": emp["id"]})
        assert r.status_code == 200
        assert any(x["id"] == lid for x in r.json())

        # Feed should NOT include unapproved
        r = s.get(f"{API}/listings/feed", params={"employee_id": emp["id"]})
        assert r.status_code == 200
        assert not any(x["id"] == lid for x in r.json())

        # Approve
        r = s.post(f"{API}/listings/{lid}/approve")
        assert r.status_code == 200
        approved = r.json()
        assert approved["status"] == "yayinda"
        assert approved["expires_at"] is not None
        assert approved["published_at"] is not None

        # Feed shows it now
        r = s.get(f"{API}/listings/feed", params={"employee_id": emp["id"]})
        assert r.status_code == 200
        feed = r.json()
        assert any(x["id"] == lid for x in feed)

        # Feed type filter
        r = s.get(f"{API}/listings/feed", params={"employee_id": emp["id"], "type": "kiralik"})
        assert r.status_code == 200
        assert not any(x["id"] == lid for x in r.json())

        # Detail
        r = s.get(f"{API}/listings/{lid}")
        assert r.status_code == 200
        assert r.json()["owner_name"] == emp["name"]

        # Close
        r = s.post(f"{API}/listings/{lid}/close")
        assert r.status_code == 200 and r.json()["status"] == "kapali"

        # Delete
        r = s.delete(f"{API}/listings/{lid}")
        assert r.status_code == 200

        # Not found now
        r = s.get(f"{API}/listings/{lid}")
        assert r.status_code == 404

    def test_reject(self, s, employees):
        emp = employees[1]
        r = s.post(f"{API}/listings", json={
            "employee_id": emp["id"], "type": "kiralik",
            "title": "TEST_Reject_Me", "description": "x", "images": [], "contact": "x",
        })
        lid = r.json()["id"]
        r = s.post(f"{API}/listings/{lid}/reject")
        assert r.status_code == 200 and r.json()["status"] == "reddedildi"
        s.delete(f"{API}/listings/{lid}")


# ---- Feed audience & expiry ----
class TestFeedAndExpiry:
    def test_feed_invalid_employee(self, s):
        r = s.get(f"{API}/listings/feed", params={"employee_id": "nonexistent"})
        assert r.status_code == 404

    def test_seeded_published_have_positive_remaining(self, s):
        r = s.get(f"{API}/listings", params={"status": "yayinda"})
        assert r.status_code == 200
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        for l in r.json():
            exp = datetime.fromisoformat(l["expires_at"])
            assert exp > now, f"seeded listing already expired: {l['title']}"

    def test_seeded_contact_has_email_and_phone(self, s):
        r = s.get(f"{API}/listings", params={"status": "yayinda"})
        assert r.status_code == 200
        for l in r.json():
            assert "@" in l["contact"]
            assert "·" in l["contact"] or "+" in l["contact"]
