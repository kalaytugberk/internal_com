"""Backend tests for Servis Güzergahı (routes) module."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://plena-connect.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def employee_id():
    r = requests.get(f"{API}/employees")
    assert r.status_code == 200
    emps = r.json()
    assert len(emps) > 0
    return emps[0]["id"]


class TestRoutesSeedAndList:
    def test_list_routes_has_seed(self):
        r = requests.get(f"{API}/routes")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        names = [x["name"] for x in data]
        assert any("Kadıköy" in n for n in names), f"Kadıköy seed missing. got={names}"
        assert any("Bağcılar" in n for n in names), f"Bağcılar seed missing. got={names}"
        for r_ in data:
            assert "reg_count" in r_

    def test_route_ordering_not_shadowed(self, employee_id):
        # /routes/feed, /routes/cities, /routes/report must not be caught by /routes/{rid}
        r1 = requests.get(f"{API}/routes/feed", params={"employee_id": employee_id})
        assert r1.status_code == 200
        assert isinstance(r1.json(), list)

        r2 = requests.get(f"{API}/routes/cities")
        assert r2.status_code == 200
        assert isinstance(r2.json(), list)

        r3 = requests.get(f"{API}/routes/report")
        assert r3.status_code == 200
        j = r3.json()
        assert "routes" in j and "total_registrations" in j and "total_employees" in j

    def test_cities_contains_istanbul(self):
        r = requests.get(f"{API}/routes/cities")
        assert r.status_code == 200
        assert any("stanbul" in c for c in r.json())


class TestRoutesCRUD:
    created_id = None

    def test_create_route(self):
        payload = {
            "name": "TEST_Route_Ataşehir",
            "city": "İstanbul",
            "direction": "gidis",
            "vehicle_plate": "34 TEST 01",
            "driver_name": "TEST Sürücü",
            "driver_phone": "+90 555 000 0000",
            "status": "active",
            "stops": [
                {"name": "TEST Durak 1", "time": "07:30"},
                {"name": "TEST Durak 2", "time": "07:45"},
            ],
        }
        r = requests.post(f"{API}/routes", json=payload)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["name"] == payload["name"]
        assert len(doc["stops"]) == 2
        assert all(s.get("id") for s in doc["stops"]), "Stop ids should be generated"
        TestRoutesCRUD.created_id = doc["id"]

    def test_get_route(self):
        rid = TestRoutesCRUD.created_id
        r = requests.get(f"{API}/routes/{rid}")
        assert r.status_code == 200
        assert r.json()["id"] == rid

    def test_update_route(self):
        rid = TestRoutesCRUD.created_id
        r = requests.put(f"{API}/routes/{rid}", json={"vehicle_plate": "34 TEST 99"})
        assert r.status_code == 200
        assert r.json()["vehicle_plate"] == "34 TEST 99"
        # verify persistence
        g = requests.get(f"{API}/routes/{rid}").json()
        assert g["vehicle_plate"] == "34 TEST 99"

    def test_delete_route(self):
        rid = TestRoutesCRUD.created_id
        r = requests.delete(f"{API}/routes/{rid}")
        assert r.status_code == 200
        g = requests.get(f"{API}/routes/{rid}")
        assert g.status_code == 404


class TestRoutesRegister:
    def test_feed_and_register_flow(self, employee_id):
        feed = requests.get(f"{API}/routes/feed", params={"employee_id": employee_id}).json()
        assert len(feed) >= 1
        route = feed[0]
        rid = route["id"]
        stop_id = route["stops"][0]["id"]
        initial_count = route["reg_count"]

        # register
        r = requests.post(f"{API}/routes/{rid}/register",
                          json={"employee_id": employee_id, "stop_id": stop_id})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["my_registration"]["stop_id"] == stop_id
        assert body["my_registration"]["stop_name"]

        # feed should reflect
        feed2 = requests.get(f"{API}/routes/feed", params={"employee_id": employee_id}).json()
        me = next(x for x in feed2 if x["id"] == rid)
        assert me["my_registration"] is not None
        assert me["my_registration"]["stop_id"] == stop_id

        # register again with different stop -> no duplicate
        if len(route["stops"]) > 1:
            stop_id2 = route["stops"][1]["id"]
            r2 = requests.post(f"{API}/routes/{rid}/register",
                               json={"employee_id": employee_id, "stop_id": stop_id2})
            assert r2.status_code == 200
            assert r2.json()["my_registration"]["stop_id"] == stop_id2
            feed3 = requests.get(f"{API}/routes/feed", params={"employee_id": employee_id}).json()
            me3 = next(x for x in feed3 if x["id"] == rid)
            # count should not have gone up beyond +1 vs initial
            assert me3["reg_count"] <= initial_count + 1

        # report reflects
        report = requests.get(f"{API}/routes/report").json()
        rp = next(x for x in report["routes"] if x["id"] == rid)
        assert sum(s["count"] for s in rp["stops"]) >= 1

        # unregister
        r3 = requests.post(f"{API}/routes/{rid}/unregister",
                           json={"employee_id": employee_id, "stop_id": stop_id})
        assert r3.status_code == 200
        assert r3.json()["my_registration"] is None
        feed4 = requests.get(f"{API}/routes/feed", params={"employee_id": employee_id}).json()
        me4 = next(x for x in feed4 if x["id"] == rid)
        assert me4["my_registration"] is None

    def test_city_filter(self, employee_id):
        feed = requests.get(f"{API}/routes/feed",
                            params={"employee_id": employee_id, "city": "İstanbul"}).json()
        for r in feed:
            assert r.get("city") == "İstanbul"
