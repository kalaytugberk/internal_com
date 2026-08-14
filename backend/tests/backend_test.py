"""Backend tests for Plena İç İletişim module."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://plena-connect.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ---- Basic seed & static endpoints ----
class TestSeed:
    def test_root(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200

    def test_employees(self, s):
        r = s.get(f"{API}/employees")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) == 8
        emp = data[0]
        for k in ("id", "name", "department", "location", "title", "seniority", "role"):
            assert k in emp

    def test_segment_options(self, s):
        r = s.get(f"{API}/segments/options")
        assert r.status_code == 200
        d = r.json()
        for k in ("departments", "locations", "titles", "seniorities"):
            assert k in d and len(d[k]) > 0

    def test_category_types(self, s):
        r = s.get(f"{API}/category-types")
        assert r.status_code == 200
        data = r.json()
        duyuru = next(x for x in data if x["key"] == "duyuru")
        assert duyuru["active"] is True
        others = [x for x in data if x["key"] != "duyuru"]
        assert all(o["active"] is False for o in others)


# ---- Categories CRUD ----
class TestCategories:
    def test_list_seeded(self, s):
        r = s.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json()
        assert any(c["display_name"] == "Duyurular" for c in cats)

    def test_crud_and_reorder(self, s):
        # create
        payload = {"category_type": "etkinlik", "display_name": "TEST_Cat", "icon": "Calendar",
                   "status": "passive", "content_type": "eylem", "pinnable": False}
        r = s.post(f"{API}/categories", json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        cid = created["id"]
        assert created["display_name"] == "TEST_Cat"

        # update
        r = s.put(f"{API}/categories/{cid}", json={"display_name": "TEST_Cat2"})
        assert r.status_code == 200
        assert r.json()["display_name"] == "TEST_Cat2"

        # reorder: put this cat first
        cats = s.get(f"{API}/categories").json()
        ordered = [cid] + [c["id"] for c in cats if c["id"] != cid]
        r = s.post(f"{API}/categories/reorder", json={"ordered_ids": ordered})
        assert r.status_code == 200
        assert r.json()[0]["id"] == cid

        # delete
        r = s.delete(f"{API}/categories/{cid}")
        assert r.status_code == 200
        cats = s.get(f"{API}/categories").json()
        assert not any(c["id"] == cid for c in cats)


# ---- Subcategories ----
class TestSubcategories:
    def test_list_seeded(self, s):
        cats = s.get(f"{API}/categories").json()
        duyuru = next(c for c in cats if c["display_name"] == "Duyurular")
        r = s.get(f"{API}/subcategories", params={"category_id": duyuru["id"]})
        assert r.status_code == 200
        names = [x["name"] for x in r.json()]
        for expected in ("Şirket Haberleri", "Doğum Haberleri", "İK Duyuruları"):
            assert expected in names

    def test_crud_inherit(self, s):
        cats = s.get(f"{API}/categories").json()
        duyuru = next(c for c in cats if c["display_name"] == "Duyurular")
        r = s.post(f"{API}/subcategories", json={"category_id": duyuru["id"], "name": "TEST_Sub", "icon": "File"})
        assert r.status_code == 200
        sub = r.json()
        assert sub["audience"] is None  # inherit
        sid = sub["id"]

        r = s.put(f"{API}/subcategories/{sid}", json={"name": "TEST_Sub2"})
        assert r.status_code == 200 and r.json()["name"] == "TEST_Sub2"

        r = s.delete(f"{API}/subcategories/{sid}")
        assert r.status_code == 200


# ---- Announcements + audience/feed ----
class TestAnnouncements:
    def test_list_seeded(self, s):
        r = s.get(f"{API}/announcements")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 4
        # filter
        r = s.get(f"{API}/announcements", params={"status": "onay_bekliyor"})
        assert r.status_code == 200
        assert all(a["status"] == "onay_bekliyor" for a in r.json())

    def test_full_lifecycle_and_feed_audience(self, s):
        cats = s.get(f"{API}/categories").json()
        duyuru = next(c for c in cats if c["display_name"] == "Duyurular")
        subs = s.get(f"{API}/subcategories", params={"category_id": duyuru["id"]}).json()
        sub_id = subs[0]["id"]

        # Create targeted to Mühendislik
        payload = {
            "title": "TEST_Muh_Only", "body": "engineering only",
            "subcategory_id": sub_id,
            "audience": {"all": False, "departments": ["Mühendislik"], "locations": [], "titles": [], "seniorities": []},
            "channels": ["mail"], "status": "onay_bekliyor",
        }
        r = s.post(f"{API}/announcements", json=payload)
        assert r.status_code == 200
        ann = r.json()
        aid = ann["id"]
        assert ann["status"] == "onay_bekliyor"

        # Update
        r = s.put(f"{API}/announcements/{aid}", json={"body": "updated"})
        assert r.status_code == 200 and r.json()["body"] == "updated"

        # Approve -> yayinda
        r = s.post(f"{API}/announcements/{aid}/approve")
        assert r.status_code == 200 and r.json()["status"] == "yayinda"

        # Pin toggle
        r = s.post(f"{API}/announcements/{aid}/pin")
        assert r.status_code == 200 and r.json()["pinned"] is True
        r = s.post(f"{API}/announcements/{aid}/pin")
        assert r.status_code == 200 and r.json()["pinned"] is False

        # Feed audience: Mühendislik employee sees it, Satış does not
        employees = s.get(f"{API}/employees").json()
        muh = next(e for e in employees if e["department"] == "Mühendislik")
        sat = next(e for e in employees if e["department"] == "Satış")

        muh_feed = s.get(f"{API}/announcements/feed", params={"employee_id": muh["id"]}).json()
        sat_feed = s.get(f"{API}/announcements/feed", params={"employee_id": sat["id"]}).json()
        muh_titles = [a["title"] for a in muh_feed]
        sat_titles = [a["title"] for a in sat_feed]
        assert "TEST_Muh_Only" in muh_titles
        assert "TEST_Muh_Only" not in sat_titles

        # Reject
        r = s.post(f"{API}/announcements/{aid}/reject")
        assert r.status_code == 200 and r.json()["status"] == "pasif"

        # Delete
        r = s.delete(f"{API}/announcements/{aid}")
        assert r.status_code == 200
        r = s.get(f"{API}/announcements/{aid}")
        assert r.status_code == 404

    def test_feed_invalid_employee(self, s):
        r = s.get(f"{API}/announcements/feed", params={"employee_id": "nonexistent"})
        assert r.status_code == 404
