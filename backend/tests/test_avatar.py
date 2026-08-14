"""Avatar Seçimi module backend tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://plena-connect.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def employees(s):
    r = s.get(f"{API}/employees", timeout=30)
    assert r.status_code == 200
    return r.json()


def find_emp(emps, **kw):
    for e in emps:
        if all(e.get(k) == v for k, v in kw.items()):
            return e
    return None


# ---------- Config & seed ----------
def test_avatar_config(s):
    r = s.get(f"{API}/avatar/config")
    assert r.status_code == 200
    d = r.json()
    assert d.get("category_type") == "avatar"
    assert d.get("display_name") == "Avatar Seçimi"


def test_seeded_concepts(s):
    r = s.get(f"{API}/avatar/concepts")
    assert r.status_code == 200
    concepts = r.json()
    names = {c["name"]: c for c in concepts}
    for expected in ["Hayvanlar", "Robotlar", "Klasik", "Yönetici Özel"]:
        assert expected in names, f"missing seeded concept {expected}"
    for n in ["Hayvanlar", "Robotlar", "Klasik"]:
        assert names[n]["audience"] is None
        assert len(names[n]["avatars"]) == 12
        assert names[n]["avatars"][0].startswith("https://api.dicebear.com/")
    yo = names["Yönetici Özel"]
    assert yo["audience"] and yo["audience"].get("titles") == ["Yönetici", "Direktör"]
    assert len(yo["avatars"]) == 12


# ---------- Feed audience filter ----------
def test_feed_non_manager_excludes_yonetici_ozel(s, employees):
    emp = find_emp(employees, name="Erol Taş") or find_emp(employees, title="Uzman")
    assert emp, "need a non-manager employee"
    r = s.get(f"{API}/avatar/concepts/feed", params={"employee_id": emp["id"]})
    assert r.status_code == 200
    names = [c["name"] for c in r.json()]
    assert "Yönetici Özel" not in names
    for n in ["Hayvanlar", "Robotlar", "Klasik"]:
        assert n in names


def test_feed_manager_includes_yonetici_ozel(s, employees):
    emp = find_emp(employees, name="Selin Tekin") or find_emp(employees, name="Can Öztürk") \
        or find_emp(employees, title="Yönetici") or find_emp(employees, title="Direktör")
    assert emp, "need a Yönetici/Direktör employee"
    r = s.get(f"{API}/avatar/concepts/feed", params={"employee_id": emp["id"]})
    assert r.status_code == 200
    names = [c["name"] for c in r.json()]
    assert "Yönetici Özel" in names


def test_feed_invalid_employee(s):
    r = s.get(f"{API}/avatar/concepts/feed", params={"employee_id": "does-not-exist"})
    assert r.status_code == 404


# ---------- Concept CRUD ----------
def test_concept_crud_and_avatars(s):
    # create
    payload = {"name": "TEST_Concept", "style": "bottts", "count": 5}
    r = s.post(f"{API}/avatar/concepts", json=payload)
    assert r.status_code == 200, r.text
    c = r.json()
    cid = c["id"]
    assert c["name"] == "TEST_Concept"
    assert len(c["avatars"]) == 5
    assert c["audience"] is None
    assert c["status"] == "active"

    # count clamp: request 20 -> max 15
    r2 = s.post(f"{API}/avatar/concepts", json={"name": "TEST_Clamp", "style": "thumbs", "count": 20})
    assert r2.status_code == 200
    c2 = r2.json()
    assert len(c2["avatars"]) == 15

    # add
    r = s.post(f"{API}/avatar/concepts/{cid}/add")
    assert r.status_code == 200
    assert len(r.json()["avatars"]) == 6

    # remove
    to_rm = r.json()["avatars"][0]
    r = s.post(f"{API}/avatar/concepts/{cid}/remove", json={"avatar": to_rm})
    assert r.status_code == 200
    assert to_rm not in r.json()["avatars"]
    assert len(r.json()["avatars"]) == 5

    # update name + audience + status
    upd = {"name": "TEST_Updated", "status": "inactive",
           "audience": {"all": False, "sirketler": [], "birimler": [], "unvanlar": [],
                        "titles": ["Yönetici"], "employee_ids": []}}
    r = s.put(f"{API}/avatar/concepts/{cid}", json=upd)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["name"] == "TEST_Updated"
    assert d["status"] == "inactive"
    assert d["audience"]["titles"] == ["Yönetici"]

    # delete both
    for x in (cid, c2["id"]):
        r = s.delete(f"{API}/avatar/concepts/{x}")
        assert r.status_code == 200
    # verify deletion
    r = s.get(f"{API}/avatar/concepts")
    ids = [x["id"] for x in r.json()]
    assert cid not in ids and c2["id"] not in ids


def test_update_missing_concept(s):
    r = s.put(f"{API}/avatar/concepts/nope", json={"name": "x"})
    assert r.status_code == 404


def test_add_missing_concept(s):
    r = s.post(f"{API}/avatar/concepts/nope/add")
    assert r.status_code == 404


# ---------- Select + report ----------
def test_select_avatar_and_report(s, employees):
    emp = find_emp(employees, name="Erol Taş") or employees[0]
    r = s.get(f"{API}/avatar/concepts")
    concepts = r.json()
    hayvan = next(c for c in concepts if c["name"] == "Hayvanlar")
    robots = next(c for c in concepts if c["name"] == "Robotlar")

    av1 = hayvan["avatars"][0]
    r = s.post(f"{API}/avatar/select", json={"employee_id": emp["id"], "avatar": av1})
    assert r.status_code == 200
    assert r.json()["avatar"] == av1

    # verify persisted on employees list
    r = s.get(f"{API}/employees")
    e = next(x for x in r.json() if x["id"] == emp["id"])
    assert e.get("avatar") == av1

    # change (unlimited)
    av2 = robots["avatars"][0]
    r = s.post(f"{API}/avatar/select", json={"employee_id": emp["id"], "avatar": av2})
    assert r.status_code == 200
    r = s.get(f"{API}/employees")
    e = next(x for x in r.json() if x["id"] == emp["id"])
    assert e.get("avatar") == av2

    # report
    r = s.get(f"{API}/avatar/report")
    assert r.status_code == 200
    rep = r.json()
    assert "concepts" in rep and "total_selected" in rep and "total_employees" in rep
    robot_row = next(x for x in rep["concepts"] if x["name"] == "Robotlar")
    assert robot_row["count"] >= 1


def test_select_invalid_employee(s):
    r = s.post(f"{API}/avatar/select", json={"employee_id": "nope", "avatar": "x"})
    assert r.status_code == 404


# ---------- Smoke: discovery includes avatar category ----------
def test_categories_include_avatar(s):
    r = s.get(f"{API}/categories")
    assert r.status_code == 200
    types = {c["category_type"] for c in r.json()}
    assert "avatar" in types
