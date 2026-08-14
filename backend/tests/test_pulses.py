"""Backend tests for Pulse Anketi feature."""
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
    return s.get(f"{API}/employees").json()


class TestPulseSeedAndCategoryType:
    def test_category_types_includes_pulse_active(self, s):
        r = s.get(f"{API}/category-types")
        assert r.status_code == 200
        types = r.json()
        pulse = next((x for x in types if x["key"] == "pulse"), None)
        assert pulse is not None
        assert pulse["active"] is True

    def test_categories_has_pulse_seed(self, s):
        cats = s.get(f"{API}/categories").json()
        pcat = next((c for c in cats if c.get("category_type") == "pulse"), None)
        assert pcat is not None
        assert pcat["display_name"] == "Pulse Anketi"
        assert pcat["status"] == "active"

    def test_pulses_list_seeded(self, s):
        pulses = s.get(f"{API}/pulses").json()
        assert isinstance(pulses, list)
        seed = next((p for p in pulses if p["title"] == "Haftalık Nabız Anketi"), None)
        assert seed is not None
        # fields
        for k in ("response_rate", "response_count", "target_count", "questions"):
            assert k in seed
        assert len(seed["questions"]) == 3
        types_ = [q["type"] for q in seed["questions"]]
        assert types_.count("skor") == 2
        assert types_.count("tek_secim") == 1
        assert seed["response_count"] >= 1
        assert seed["response_rate"] >= 1


class TestPulseCrudValidation:
    created_ids = []

    def _valid_payload(self, extra=None):
        p = {
            "title": "TEST_Pulse_A",
            "audience": {"all": True, "departments": [], "locations": [], "titles": [], "seniorities": []},
            "questions": [
                {"text": "Skor?", "type": "skor", "options": [], "allow_comment": True},
            ],
            "mandatory": False, "anonymous": False, "frequency": "haftalik", "start_date": "2026-01-15",
        }
        if extra:
            p.update(extra)
        return p

    def test_reject_zero_questions(self, s):
        r = s.post(f"{API}/pulses", json=self._valid_payload({"questions": []}))
        assert r.status_code == 400

    def test_reject_six_questions(self, s):
        qs = [{"text": f"Q{i}", "type": "skor", "options": [], "allow_comment": False} for i in range(6)]
        r = s.post(f"{API}/pulses", json=self._valid_payload({"questions": qs}))
        assert r.status_code == 400

    def test_create_valid(self, s):
        r = s.post(f"{API}/pulses", json=self._valid_payload())
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == "TEST_Pulse_A"
        assert len(d["questions"]) == 1
        TestPulseCrudValidation.created_ids.append(d["id"])

    def test_update_and_validation(self, s):
        pid = TestPulseCrudValidation.created_ids[0]
        # good update
        r = s.put(f"{API}/pulses/{pid}", json={"title": "TEST_Pulse_A2"})
        assert r.status_code == 200 and r.json()["title"] == "TEST_Pulse_A2"
        # bad update: too many questions
        qs = [{"id": "q"+str(i), "text": f"Q{i}", "type": "skor", "options": [], "allow_comment": False} for i in range(6)]
        r = s.put(f"{API}/pulses/{pid}", json={"questions": qs})
        assert r.status_code == 400

    def test_delete(self, s):
        pid = TestPulseCrudValidation.created_ids[0]
        r = s.delete(f"{API}/pulses/{pid}")
        assert r.status_code == 200
        r = s.get(f"{API}/pulses/{pid}")
        assert r.status_code == 404


class TestPulseFeedAudienceAndRespond:
    def test_audience_filter_and_respond(self, s, employees):
        muh = next(e for e in employees if e["department"] == "Mühendislik")
        sat = next(e for e in employees if e["department"] == "Satış")

        payload = {
            "title": "TEST_Pulse_Muh",
            "audience": {"all": False, "departments": ["Mühendislik"], "locations": [], "titles": [], "seniorities": []},
            "questions": [{"text": "Skor?", "type": "skor", "options": [], "allow_comment": False}],
            "mandatory": False, "anonymous": False, "frequency": "haftalik",
        }
        r = s.post(f"{API}/pulses", json=payload)
        assert r.status_code == 200
        pid = r.json()["id"]

        muh_feed = s.get(f"{API}/pulses/feed", params={"employee_id": muh["id"]}).json()
        sat_feed = s.get(f"{API}/pulses/feed", params={"employee_id": sat["id"]}).json()
        muh_titles = [p["title"] for p in muh_feed]
        sat_titles = [p["title"] for p in sat_feed]
        assert "TEST_Pulse_Muh" in muh_titles
        assert "TEST_Pulse_Muh" not in sat_titles
        # filled false initially
        p = next(x for x in muh_feed if x["title"] == "TEST_Pulse_Muh")
        assert p["filled"] is False

        # respond
        qid = p["questions"][0]["id"]
        r = s.post(f"{API}/pulses/{pid}/respond", json={
            "employee_id": muh["id"],
            "answers": [{"question_id": qid, "score": 4, "choice": None, "comment": None}],
        })
        assert r.status_code == 200

        muh_feed2 = s.get(f"{API}/pulses/feed", params={"employee_id": muh["id"]}).json()
        p2 = next(x for x in muh_feed2 if x["title"] == "TEST_Pulse_Muh")
        assert p2["filled"] is True

        # response_count reflected in list
        plist = s.get(f"{API}/pulses").json()
        pl = next(x for x in plist if x["id"] == pid)
        assert pl["response_count"] == 1
        assert pl["response_rate"] > 0

        # cleanup
        s.delete(f"{API}/pulses/{pid}")


class TestPulseReportAndHistory:
    def test_seeded_report_non_anonymous(self, s):
        pulses = s.get(f"{API}/pulses").json()
        seed = next(p for p in pulses if p["title"] == "Haftalık Nabız Anketi")
        r = s.get(f"{API}/pulses/{seed['id']}/report")
        assert r.status_code == 200
        rep = r.json()
        assert rep["anonymous"] is False
        assert "company" in rep and "trend" in rep["company"]
        assert len(rep["company"]["trend"]) >= 1
        assert isinstance(rep["org_units"], list) and len(rep["org_units"]) >= 1
        assert isinstance(rep["persons"], list) and len(rep["persons"]) >= 1
        # persons have names
        assert all("name" in p for p in rep["persons"])
        # skor question has trend + overall_avg; tek_secim has distribution
        skor_qs = [q for q in rep["questions"] if q["type"] == "skor"]
        tek_qs = [q for q in rep["questions"] if q["type"] == "tek_secim"]
        assert len(skor_qs) == 2
        assert all("trend" in q and "overall_avg" in q for q in skor_qs)
        assert len(tek_qs) == 1
        assert all("distribution" in q for q in tek_qs)
        # comment names: at least one skor question has comment with a real name (not Anonim)
        comment_names = []
        for q in skor_qs:
            comment_names.extend([c["name"] for c in q.get("comments", [])])
        assert any(n != "Anonim" for n in comment_names)

    def test_anonymous_pulse_hides_persons_and_anonymizes_comments(self, s, employees):
        emp = employees[4]
        payload = {
            "title": "TEST_Pulse_Anon",
            "audience": {"all": True, "departments": [], "locations": [], "titles": [], "seniorities": []},
            "questions": [{"text": "Skor?", "type": "skor", "options": [], "allow_comment": True}],
            "mandatory": False, "anonymous": True, "frequency": "haftalik",
        }
        r = s.post(f"{API}/pulses", json=payload)
        pid = r.json()["id"]
        qid = r.json()["questions"][0]["id"]
        s.post(f"{API}/pulses/{pid}/respond", json={
            "employee_id": emp["id"],
            "answers": [{"question_id": qid, "score": 5, "choice": None, "comment": "harika"}],
        })
        rep = s.get(f"{API}/pulses/{pid}/report").json()
        assert rep["anonymous"] is True
        assert rep["persons"] == []
        skor_q = next(q for q in rep["questions"] if q["type"] == "skor")
        assert len(skor_q["comments"]) == 1
        assert skor_q["comments"][0]["name"] == "Anonim"
        s.delete(f"{API}/pulses/{pid}")

    def test_my_history_returns_only_own(self, s, employees):
        pulses = s.get(f"{API}/pulses").json()
        seed = next(p for p in pulses if p["title"] == "Haftalık Nabız Anketi")
        emp = employees[4]  # one of seeded responders (index 3..7)
        r = s.get(f"{API}/pulses/{seed['id']}/my-history", params={"employee_id": emp["id"]})
        assert r.status_code == 200
        d = r.json()
        assert d["pulse_title"] == "Haftalık Nabız Anketi"
        assert isinstance(d["history"], list)
        # employees[0] didn't respond in seed
        emp0 = employees[0]
        d0 = s.get(f"{API}/pulses/{seed['id']}/my-history", params={"employee_id": emp0["id"]}).json()
        assert d0["history"] == []
