"""Backend tests for Günlük Mod (Daily Mood) module."""
import os
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def employees():
    r = requests.get(f"{API}/employees", timeout=15)
    assert r.status_code == 200
    return r.json()


# ---- Config ----
class TestMoodConfig:
    def test_get_config_returns_gunluk_mod(self):
        r = requests.get(f"{API}/mood/config", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["category_type"] == "gunluk_mod"
        for k in ("allow_comment", "reminder_enabled", "reminder_time",
                  "display_name", "icon", "status", "audience"):
            assert k in d, f"missing {k}"

    def test_put_config_persists(self):
        original = requests.get(f"{API}/mood/config", timeout=10).json()
        payload = {
            "display_name": "Günlük Mod",
            "icon": original.get("icon") or "Smile",
            "status": "active",
            "audience": original.get("audience") or {"all": True, "departments": [], "locations": [], "titles": [], "seniorities": []},
            "allow_comment": True,
            "reminder_enabled": True,
            "reminder_time": "17:00",
        }
        r = requests.put(f"{API}/mood/config", json=payload, timeout=10)
        assert r.status_code == 200
        got = r.json()
        assert got["display_name"] == "Günlük Mod"
        assert got["reminder_time"] == "17:00"
        assert got["allow_comment"] is True
        # verify GET returns same
        r2 = requests.get(f"{API}/mood/config", timeout=10).json()
        assert r2["reminder_time"] == "17:00"


# ---- Today / Entry (once-per-day) ----
class TestMoodEntry:
    def test_today_and_once_per_day(self, employees):
        # pick employee that likely has no today entry: idx 0,1,2,3,6,7 (4-5 have today)
        emp = next(e for e in employees if e["name"] == "Buse Demir")
        eid = emp["id"]
        today = requests.get(f"{API}/mood/today", params={"employee_id": eid}, timeout=10)
        assert today.status_code == 200
        data = today.json()
        assert "entry" in data

        if data["entry"] is None:
            # create
            r = requests.post(f"{API}/mood/entry", json={"employee_id": eid, "score": 4, "comment": "TEST_mood"}, timeout=10)
            assert r.status_code == 200
            body = r.json()
            assert body["already"] is False
            assert body["entry"]["score"] == 4

        # calling again same day => already True
        r2 = requests.post(f"{API}/mood/entry", json={"employee_id": eid, "score": 2}, timeout=10)
        assert r2.status_code == 200
        assert r2.json()["already"] is True

        # GET today now returns the entry
        t2 = requests.get(f"{API}/mood/today", params={"employee_id": eid}, timeout=10).json()
        assert t2["entry"] is not None

    def test_my_history_only_own(self, employees):
        emp = employees[3]
        r = requests.get(f"{API}/mood/my-history", params={"employee_id": emp["id"]}, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "trend" in d and "avg7" in d and "count" in d
        for pt in d["trend"]:
            assert set(pt.keys()) <= {"date", "score"}


# ---- Privacy: report only aggregates ----
class TestMoodReportPrivacy:
    FORBIDDEN_KEYS = {"employee_id", "name", "employee", "person", "persons",
                      "employees", "individual", "user_id"}

    def _scan(self, obj, path=""):
        """Recursively assert no forbidden keys/PII appear."""
        if isinstance(obj, dict):
            for k, v in obj.items():
                assert k not in self.FORBIDDEN_KEYS, f"forbidden key '{k}' at {path}"
                self._scan(v, f"{path}.{k}")
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                self._scan(v, f"{path}[{i}]")

    def test_report_no_individual_data(self):
        r = requests.get(f"{API}/mood/report", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("trend", "today_avg", "avg7", "total_entries", "today_count", "departments"):
            assert k in d
        # trend entries only have date/avg/count
        for pt in d["trend"]:
            assert set(pt.keys()) == {"date", "avg", "count"}
        self._scan(d)

    def test_report_department_filter_changes_aggregates(self):
        all_r = requests.get(f"{API}/mood/report", timeout=15).json()
        dept_r = requests.get(f"{API}/mood/report", params={"department": "Mühendislik"}, timeout=15).json()
        # still aggregates only
        self._scan(dept_r)
        # totals should be <= all totals
        assert dept_r["total_entries"] <= all_r["total_entries"]
        # departments list still present
        assert "Mühendislik" in dept_r["departments"]
