"""Phase 2: Hap Bilgi / İndirim / Yemekhane backend tests."""
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


# ---------------- Hap Bilgi ----------------
class TestHapBilgi:
    def test_topics_crud_and_posts_feed_like(self, s, employees):
        # create topic
        r = s.post(f"{API}/hapbilgi/topics", json={"name": "TEST_HapTopic"})
        assert r.status_code == 200, r.text
        topic = r.json()
        tid = topic["id"]
        assert topic["name"] == "TEST_HapTopic"

        # list topics
        r = s.get(f"{API}/hapbilgi/topics")
        assert r.status_code == 200
        assert any(t["id"] == tid for t in r.json())

        # create post
        r = s.post(f"{API}/hapbilgi/posts", json={
            "title": "TEST_HapPost", "body": "hello", "topic_id": tid
        })
        assert r.status_code == 200, r.text
        post = r.json()
        pid = post["id"]

        # posts list
        r = s.get(f"{API}/hapbilgi/posts")
        assert r.status_code == 200
        got = next(p for p in r.json() if p["id"] == pid)
        assert got["like_count"] == 0
        assert got["topic_name"] == "TEST_HapTopic"

        # feed
        emp_id = employees[0]["id"]
        r = s.get(f"{API}/hapbilgi/feed", params={"employee_id": emp_id})
        assert r.status_code == 200
        feed = r.json()
        target = next(p for p in feed if p["id"] == pid)
        assert target["liked"] is False
        assert target["like_count"] == 0
        assert target["topic_name"] == "TEST_HapTopic"

        # feed filter by topic
        r = s.get(f"{API}/hapbilgi/feed", params={"employee_id": emp_id, "topic_id": tid})
        assert r.status_code == 200
        filtered = r.json()
        assert all(p["topic_id"] == tid for p in filtered)
        assert any(p["id"] == pid for p in filtered)

        # like toggle on
        r = s.post(f"{API}/hapbilgi/posts/{pid}/like", json={"employee_id": emp_id})
        assert r.status_code == 200
        d = r.json()
        assert d["liked"] is True and d["like_count"] == 1

        # feed reflects liked
        r = s.get(f"{API}/hapbilgi/feed", params={"employee_id": emp_id})
        target = next(p for p in r.json() if p["id"] == pid)
        assert target["liked"] is True
        assert target["like_count"] == 1

        # like toggle off
        r = s.post(f"{API}/hapbilgi/posts/{pid}/like", json={"employee_id": emp_id})
        assert r.status_code == 200
        d = r.json()
        assert d["liked"] is False and d["like_count"] == 0

        # cleanup
        assert s.delete(f"{API}/hapbilgi/posts/{pid}").status_code == 200
        assert s.delete(f"{API}/hapbilgi/topics/{tid}").status_code == 200


# ---------------- İndirim ----------------
class TestDiscounts:
    def test_categories_crud_and_feed_hides_required_points(self, s, employees):
        # category
        r = s.post(f"{API}/discounts/categories", json={"name": "TEST_DiscCat"})
        assert r.status_code == 200
        cat = r.json()
        cid = cat["id"]

        r = s.get(f"{API}/discounts/categories")
        assert any(c["id"] == cid for c in r.json())

        # discount visible (no required_points, audience all)
        r = s.post(f"{API}/discounts", json={
            "brand": "TEST_BrandOpen", "description": "d", "rate": "%10",
            "contact": "info", "category_id": cid,
            "audience": {"all": True}
        })
        assert r.status_code == 200
        open_id = r.json()["id"]

        # discount hidden by required_points>0
        r = s.post(f"{API}/discounts", json={
            "brand": "TEST_BrandLocked", "description": "d", "rate": "%50",
            "contact": "info", "category_id": cid,
            "required_points": 100,
            "audience": {"all": True}
        })
        assert r.status_code == 200
        locked_id = r.json()["id"]

        # discount hidden by audience mismatch (specific department)
        muh_dept = next(e["department"] for e in employees if e["department"] == "Mühendislik")
        sat_emp = next(e for e in employees if e["department"] == "Satış")
        r = s.post(f"{API}/discounts", json={
            "brand": "TEST_BrandMuh", "description": "d", "rate": "%20",
            "contact": "info", "category_id": cid,
            "audience": {"all": False, "departments": [muh_dept], "locations": [], "titles": [], "seniorities": []}
        })
        assert r.status_code == 200
        muh_only_id = r.json()["id"]

        # list all
        r = s.get(f"{API}/discounts")
        assert r.status_code == 200
        ids = {d["id"] for d in r.json()}
        assert {open_id, locked_id, muh_only_id}.issubset(ids)

        # feed for Satış employee: open yes, locked no, muh_only no
        r = s.get(f"{API}/discounts/feed", params={"employee_id": sat_emp["id"]})
        assert r.status_code == 200
        feed_ids = {d["id"] for d in r.json()}
        assert open_id in feed_ids
        assert locked_id not in feed_ids, "required_points>0 must be hidden"
        assert muh_only_id not in feed_ids

        # cleanup
        for did in (open_id, locked_id, muh_only_id):
            assert s.delete(f"{API}/discounts/{did}").status_code == 200
        assert s.delete(f"{API}/discounts/categories/{cid}").status_code == 200


# ---------------- Yemekhane ----------------
class TestCanteens:
    def test_canteen_crud_days_meals_and_audience_feed(self, s, employees):
        muh_dept = "Mühendislik"
        muh_emp = next(e for e in employees if e["department"] == muh_dept)
        sat_emp = next(e for e in employees if e["department"] == "Satış")

        payload = {
            "name": "TEST_Canteen_Muh",
            "audience": {"all": False, "departments": [muh_dept], "locations": [], "titles": [], "seniorities": []},
            "days": [
                {"label": "Pazartesi", "meals": [
                    {"name": "Çorba", "calorie": "150"},
                    {"name": "Pilav", "calorie": "300"},
                ]},
                {"label": "Salı", "meals": [{"name": "Makarna"}]},
            ]
        }
        r = s.post(f"{API}/canteens", json=payload)
        assert r.status_code == 200, r.text
        c = r.json()
        cid = c["id"]
        # day ids generated
        assert len(c["days"]) == 2
        assert all(d.get("id") for d in c["days"])
        assert c["days"][0]["meals"][0]["name"] == "Çorba"
        assert c["days"][0]["meals"][0]["calorie"] == "150"

        # update name and days (add third day)
        new_days = c["days"] + [{"label": "Çarşamba", "meals": [{"name": "Köfte", "calorie": "500"}]}]
        r = s.put(f"{API}/canteens/{cid}", json={"name": "TEST_Canteen_Muh2", "days": new_days})
        assert r.status_code == 200, r.text
        upd = r.json()
        assert upd["name"] == "TEST_Canteen_Muh2"
        assert len(upd["days"]) == 3
        assert all(d.get("id") for d in upd["days"])

        # list
        r = s.get(f"{API}/canteens")
        assert any(x["id"] == cid for x in r.json())

        # feed: muh sees, satış does not
        r = s.get(f"{API}/canteens/feed", params={"employee_id": muh_emp["id"]})
        assert r.status_code == 200
        assert any(x["id"] == cid for x in r.json())

        r = s.get(f"{API}/canteens/feed", params={"employee_id": sat_emp["id"]})
        assert r.status_code == 200
        assert not any(x["id"] == cid for x in r.json())

        # cleanup
        assert s.delete(f"{API}/canteens/{cid}").status_code == 200

    def test_canteen_update_404(self, s):
        r = s.put(f"{API}/canteens/nonexistent", json={"name": "x"})
        assert r.status_code == 404

    def test_canteen_feed_invalid_employee(self, s):
        r = s.get(f"{API}/canteens/feed", params={"employee_id": "nonexistent"})
        assert r.status_code == 404
