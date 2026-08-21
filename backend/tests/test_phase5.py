"""Phase 5 tests: Communities (posts, chat, moderation, experts) + Kudos notifications."""
import os
import time
import pytest
import requests

def _load_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError("REACT_APP_BACKEND_URL not found")

BASE = _load_url().rstrip("/") + "/api"
EROL = "31147503-c442-4338-9815-8248daa91ada"
MERT = "6e5149b3-df66-43f4-a6a8-aaa7986e2720"
ADMIN = "f34c58ff-64d5-4d02-ba67-9bad0597e2d5"


@pytest.fixture(scope="module")
def s():
    ses = requests.Session()
    ses.headers.update({"Content-Type": "application/json"})
    return ses


# --- Communities list/feed ---
def test_communities_list(s):
    r = s.get(f"{BASE}/communities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 2
    for c in data:
        assert "id" in c and "name" in c and "post_count" in c


def test_communities_feed_employee(s):
    r = s.get(f"{BASE}/communities/feed", params={"employee_id": EROL})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 1


def test_communities_feed_bad_employee(s):
    r = s.get(f"{BASE}/communities/feed", params={"employee_id": "does-not-exist"})
    assert r.status_code == 404


# --- CRUD community ---
def test_community_crud(s):
    r = s.post(f"{BASE}/communities", json={
        "name": "TEST_Community", "description": "test",
        "icon": "Users", "color": "sky",
        "audience": {"all": True, "departments": [], "roles": [], "titles": [], "locations": [], "employees": []},
        "status": "active",
    })
    assert r.status_code == 200, r.text
    cid = r.json()["id"]

    g = s.get(f"{BASE}/communities/{cid}")
    assert g.status_code == 200 and g.json()["name"] == "TEST_Community"

    u = s.put(f"{BASE}/communities/{cid}", json={"name": "TEST_Community_2"})
    assert u.status_code == 200 and u.json()["name"] == "TEST_Community_2"

    # expert toggle
    t = s.post(f"{BASE}/communities/{cid}/expert", json={"employee_id": MERT})
    assert t.status_code == 200 and MERT in t.json()["experts"]
    t2 = s.post(f"{BASE}/communities/{cid}/expert", json={"employee_id": MERT})
    assert MERT not in t2.json()["experts"]

    d = s.delete(f"{BASE}/communities/{cid}")
    assert d.status_code == 200
    g2 = s.get(f"{BASE}/communities/{cid}")
    assert g2.status_code == 404


# --- Posts + comments + votes + pin + verify ---
def test_posts_flow(s):
    cid = s.get(f"{BASE}/communities").json()[0]["id"]

    # tartisma post
    p = s.post(f"{BASE}/communities/{cid}/posts", json={
        "author_id": EROL, "type": "tartisma", "title": "TEST_disc", "body": "hi"
    })
    assert p.status_code == 200
    pid = p.json()["id"]

    # comment
    c = s.post(f"{BASE}/posts/{pid}/comment", json={"author_id": MERT, "body": "reply"})
    assert c.status_code == 200
    coid = c.json()["comment"]["id"]

    # verify comment
    v = s.post(f"{BASE}/posts/{pid}/comments/{coid}/verify")
    assert v.status_code == 200

    # verify visible via GET posts
    posts = s.get(f"{BASE}/communities/{cid}/posts").json()
    found = next((x for x in posts if x["id"] == pid), None)
    assert found and any(cm["verified"] for cm in found["comments"])

    # pin
    pin = s.post(f"{BASE}/posts/{pid}/pin")
    assert pin.status_code == 200

    # anket
    a = s.post(f"{BASE}/communities/{cid}/posts", json={
        "author_id": EROL, "type": "anket", "title": "TEST_poll", "options": ["A", "B", "C"]
    })
    assert a.status_code == 200
    aid = a.json()["id"]
    opts = a.json()["options"]

    # anket <2 -> 400
    bad = s.post(f"{BASE}/communities/{cid}/posts", json={
        "author_id": EROL, "type": "anket", "title": "TEST_bad", "options": ["only"]
    })
    assert bad.status_code == 400

    # vote
    vr = s.post(f"{BASE}/posts/{aid}/vote", json={"employee_id": EROL, "option_id": opts[0]["id"]})
    assert vr.status_code == 200
    # switch vote
    s.post(f"{BASE}/posts/{aid}/vote", json={"employee_id": EROL, "option_id": opts[1]["id"]})
    posts = s.get(f"{BASE}/communities/{cid}/posts").json()
    poll = next(x for x in posts if x["id"] == aid)
    total = sum(o["count"] for o in poll["options"])
    assert total == 1  # only one vote counted

    # cleanup
    s.delete(f"{BASE}/posts/{pid}/comments/{coid}")
    s.delete(f"{BASE}/posts/{pid}")
    s.delete(f"{BASE}/posts/{aid}")


# --- Messages ---
def test_messages(s):
    cid = s.get(f"{BASE}/communities").json()[0]["id"]
    r = s.post(f"{BASE}/communities/{cid}/messages", json={"author_id": MERT, "text": "TEST_msg"})
    assert r.status_code == 200
    mid = r.json()["id"]
    assert r.json()["author"]["is_expert"] in (True, False)

    ls = s.get(f"{BASE}/communities/{cid}/messages")
    assert ls.status_code == 200 and any(m["id"] == mid for m in ls.json())

    d = s.delete(f"{BASE}/messages/{mid}")
    assert d.status_code == 200


# --- Kudos notifications ---
def test_kudos_notifications(s):
    # Give a kudos to Mert from Erol to ensure at least one unseen exists
    s.post(f"{BASE}/kudos", json={
        "from_id": EROL, "to_id": MERT, "value": "takim", "message": "TEST_notif",
    })
    time.sleep(0.3)
    r = s.get(f"{BASE}/kudos/notifications", params={"employee_id": MERT})
    assert r.status_code == 200
    data = r.json()
    assert data["count"] >= 1
    assert all(i["to_id"] == MERT for i in data["items"])

    # mark seen
    ms = s.post(f"{BASE}/kudos/notifications/seen", json={"employee_id": MERT})
    assert ms.status_code == 200
    r2 = s.get(f"{BASE}/kudos/notifications", params={"employee_id": MERT})
    assert r2.json()["count"] == 0
