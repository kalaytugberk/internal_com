"""Backend tests for Phase 3a: İSG-Ramak Kala, Toplantı Odası, Hap react, Discount image."""
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


# --- İSG Ramak Kala ---
class TestIsgRamak:
    def test_get_config_defaults(self, s):
        r = s.get(f"{API}/isg-ramak/config")
        assert r.status_code == 200
        d = r.json()
        assert d["anonymity_mode"] in ("user_choice", "always_anon", "always_open")
        assert isinstance(d.get("tags"), list)
        assert isinstance(d.get("status_flow_enabled"), bool)

    def test_put_config_updates(self, s):
        r = s.put(f"{API}/isg-ramak/config", json={
            "anonymity_mode": "user_choice",
            "status_flow_enabled": True,
            "tags": ["Kayma-Düşme", "Ekipman", "Yangın Riski", "TEST_QA_Tag"],
        })
        assert r.status_code == 200
        d = r.json()
        assert d["anonymity_mode"] == "user_choice"
        assert "TEST_QA_Tag" in d["tags"]

        # cleanup: remove TEST tag
        d["tags"] = [t for t in d["tags"] if t != "TEST_QA_Tag"]
        r = s.put(f"{API}/isg-ramak/config", json={"tags": d["tags"]})
        assert r.status_code == 200
        assert "TEST_QA_Tag" not in r.json()["tags"]

    def test_report_anonymous_hides_reporter(self, s, employees):
        emp = employees[0]
        payload = {"reporter_id": emp["id"], "anonymous": True,
                   "tag": "Ekipman", "text": "TEST_QA_Anon_Report"}
        r = s.post(f"{API}/isg-ramak/reports", json=payload)
        assert r.status_code == 200
        rid = r.json()["id"]

        r = s.get(f"{API}/isg-ramak/reports")
        assert r.status_code == 200
        row = next(x for x in r.json() if x["id"] == rid)
        assert row["reporter_name"] is None
        assert row["department"] is None
        assert row["location"] is None
        assert row["status"] == "yeni"
        return rid

    def test_report_named_shows_reporter_and_status_flow(self, s, employees):
        emp = employees[0]
        payload = {"reporter_id": emp["id"], "anonymous": False,
                   "tag": "Ekipman", "text": "TEST_QA_Named_Report"}
        r = s.post(f"{API}/isg-ramak/reports", json=payload)
        assert r.status_code == 200
        rid = r.json()["id"]

        r = s.get(f"{API}/isg-ramak/reports")
        row = next(x for x in r.json() if x["id"] == rid)
        assert row["reporter_name"] == emp["name"]
        assert row["department"] == emp["department"]

        # status update
        r = s.put(f"{API}/isg-ramak/reports/{rid}/status", json={"status": "inceleniyor"})
        assert r.status_code == 200
        assert r.json()["status"] == "inceleniyor"

        r = s.put(f"{API}/isg-ramak/reports/{rid}/status", json={"status": "kapatildi"})
        assert r.status_code == 200
        assert r.json()["status"] == "kapatildi"

        # my
        r = s.get(f"{API}/isg-ramak/my", params={"employee_id": emp["id"]})
        assert r.status_code == 200
        titles = [x["text"] for x in r.json()]
        assert "TEST_QA_Named_Report" in titles

    def test_status_update_404(self, s):
        r = s.put(f"{API}/isg-ramak/reports/does-not-exist/status", json={"status": "yeni"})
        assert r.status_code == 404


# --- Rooms ---
class TestRooms:
    def test_room_crud_and_reservation_flow(self, s, employees):
        emp = employees[0]

        # create auto room
        r = s.post(f"{API}/rooms", json={"name": "TEST_QA_Room", "location": "Kat 5",
                                          "capacity": 8, "equipment": "Projeksiyon",
                                          "approve_mode": "auto", "audience": {"all": True}})
        assert r.status_code == 200
        room = r.json()
        rid = room["id"]

        # update
        r = s.put(f"{API}/rooms/{rid}", json={"capacity": 10})
        assert r.status_code == 200
        assert r.json()["capacity"] == 10

        # feed shows room for employee (audience=all)
        r = s.get(f"{API}/rooms/feed", params={"employee_id": emp["id"]})
        assert r.status_code == 200
        assert any(x["id"] == rid for x in r.json())

        # first reservation auto -> confirmed
        r1 = s.post(f"{API}/reservations", json={
            "room_id": rid, "employee_id": emp["id"],
            "date": "2030-01-05", "start": "10:00", "end": "11:00", "title": "TEST_QA_Res1"
        })
        assert r1.status_code == 200, r1.text
        res1 = r1.json()
        assert res1["status"] == "confirmed"

        # overlap -> 400
        r2 = s.post(f"{API}/reservations", json={
            "room_id": rid, "employee_id": emp["id"],
            "date": "2030-01-05", "start": "10:30", "end": "11:30", "title": "TEST_QA_Overlap"
        })
        assert r2.status_code == 400

        # adjacent (end==start) -> 200
        r3 = s.post(f"{API}/reservations", json={
            "room_id": rid, "employee_id": emp["id"],
            "date": "2030-01-05", "start": "11:00", "end": "12:00", "title": "TEST_QA_Adjacent"
        })
        assert r3.status_code == 200

        # list mine
        r = s.get(f"{API}/reservations", params={"employee_id": emp["id"]})
        assert r.status_code == 200
        my_ids = [x["id"] for x in r.json()]
        assert res1["id"] in my_ids
        # employee_name / room_name populated
        row = next(x for x in r.json() if x["id"] == res1["id"])
        assert row["employee_name"] == emp["name"]
        assert row["room_name"] == "TEST_QA_Room"

        # cancel
        r = s.post(f"{API}/reservations/{res1['id']}/cancel")
        assert r.status_code == 200

        # after cancel, overlapping slot should be free again
        r4 = s.post(f"{API}/reservations", json={
            "room_id": rid, "employee_id": emp["id"],
            "date": "2030-01-05", "start": "10:15", "end": "10:45", "title": "TEST_QA_AfterCancel"
        })
        assert r4.status_code == 200

        # approval room -> pending
        r = s.post(f"{API}/rooms", json={"name": "TEST_QA_RoomApp", "approve_mode": "approval"})
        assert r.status_code == 200
        rid2 = r.json()["id"]
        r = s.post(f"{API}/reservations", json={
            "room_id": rid2, "employee_id": emp["id"],
            "date": "2030-01-06", "start": "09:00", "end": "10:00"
        })
        assert r.status_code == 200
        assert r.json()["status"] == "pending"

        # cleanup
        s.delete(f"{API}/rooms/{rid}")
        s.delete(f"{API}/rooms/{rid2}")

    def test_reservation_missing_room_404(self, s, employees):
        r = s.post(f"{API}/reservations", json={
            "room_id": "does-not-exist", "employee_id": employees[0]["id"],
            "date": "2030-02-01", "start": "09:00", "end": "10:00"
        })
        assert r.status_code == 404

    def test_rooms_feed_audience_filter(self, s, employees):
        # find two departments
        depts = {e["department"] for e in employees}
        assert len(depts) >= 2
        d1 = list(depts)[0]
        d2 = list(depts)[1]

        r = s.post(f"{API}/rooms", json={
            "name": "TEST_QA_DeptRoom",
            "audience": {"all": False, "departments": [d1], "locations": [], "titles": [], "seniorities": []}
        })
        rid = r.json()["id"]

        e1 = next(e for e in employees if e["department"] == d1)
        e2 = next(e for e in employees if e["department"] == d2)

        f1 = s.get(f"{API}/rooms/feed", params={"employee_id": e1["id"]}).json()
        f2 = s.get(f"{API}/rooms/feed", params={"employee_id": e2["id"]}).json()
        assert any(x["id"] == rid for x in f1)
        assert not any(x["id"] == rid for x in f2)

        s.delete(f"{API}/rooms/{rid}")


# --- Hap Reactions ---
class TestHapReactions:
    def test_multi_emoji_toggle(self, s, employees):
        # create topic + post
        t = s.post(f"{API}/hapbilgi/topics", json={"name": "TEST_QA_ReactTopic"}).json()
        p = s.post(f"{API}/hapbilgi/posts", json={
            "topic_id": t["id"], "title": "TEST_QA_ReactPost", "body": "x"
        }).json()
        pid = p["id"]
        emp = employees[0]["id"]

        # add 👍
        r = s.post(f"{API}/hapbilgi/posts/{pid}/react", json={"employee_id": emp, "emoji": "👍"})
        assert r.status_code == 200
        d = r.json()
        assert d["reactions_count"].get("👍") == 1
        assert "👍" in d["my_reactions"]

        # add ❤️
        r = s.post(f"{API}/hapbilgi/posts/{pid}/react", json={"employee_id": emp, "emoji": "❤️"})
        d = r.json()
        assert d["reactions_count"].get("❤️") == 1
        assert set(d["my_reactions"]) == {"👍", "❤️"}

        # toggle off 👍
        r = s.post(f"{API}/hapbilgi/posts/{pid}/react", json={"employee_id": emp, "emoji": "👍"})
        d = r.json()
        assert d["reactions_count"].get("👍") == 0
        assert d["my_reactions"] == ["❤️"]

        # feed returns aggregates
        feed = s.get(f"{API}/hapbilgi/feed", params={"employee_id": emp}).json()
        row = next(x for x in feed if x["id"] == pid)
        assert row["reactions_count"].get("❤️") == 1
        assert row["reaction_total"] == 1
        assert "❤️" in row["my_reactions"]

        # cleanup
        s.delete(f"{API}/hapbilgi/posts/{pid}")
        s.delete(f"{API}/hapbilgi/topics/{t['id']}")

    def test_react_404(self, s, employees):
        r = s.post(f"{API}/hapbilgi/posts/nope/react", json={"employee_id": employees[0]["id"], "emoji": "👍"})
        assert r.status_code == 404


# --- Discount image ---
class TestDiscountImage:
    def test_create_with_image(self, s):
        img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII="
        r = s.post(f"{API}/discounts", json={
            "brand": "TEST_QA_ImgBrand", "rate": "%20", "image": img, "audience": {"all": True}
        })
        assert r.status_code == 200
        d = r.json()
        assert d["image"] == img
        did = d["id"]

        # feed returns image
        r = s.get(f"{API}/discounts")
        row = next(x for x in r.json() if x["id"] == did)
        assert row["image"] == img

        s.delete(f"{API}/discounts/{did}")
