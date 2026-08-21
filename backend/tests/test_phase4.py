"""Phase 4 backend tests: Kudos, Gamification, Games (Quiz/Tournament)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://plena-connect.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def employees():
    r = requests.get(f"{API}/employees", timeout=15)
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def emp_ids(employees):
    by_name = {e["name"]: e["id"] for e in employees}
    return by_name


# --------- Gamification config ---------
class TestGamiConfig:
    def test_get_config(self):
        r = requests.get(f"{API}/gami/config")
        assert r.status_code == 200
        d = r.json()
        assert "points" in d and "kudos_values" in d
        for k in ("kudos_received", "kudos_given", "game_correct", "game_perfect"):
            assert k in d["points"]

    def test_update_points(self):
        r = requests.put(f"{API}/gami/config", json={"points": {"kudos_received": 10, "kudos_given": 2, "game_correct": 5, "game_perfect": 15}})
        assert r.status_code == 200
        assert r.json()["points"]["kudos_received"] == 10


class TestLeaderboard:
    def test_leaderboard(self):
        r = requests.get(f"{API}/gami/leaderboard")
        assert r.status_code == 200
        lb = r.json()
        assert isinstance(lb, list)
        if lb:
            row = lb[0]
            assert "employee_id" in row and "points" in row and "level" in row and "rank" in row


class TestGamiProfile:
    def test_profile(self, emp_ids):
        eid = emp_ids["Erol Taş"]
        r = requests.get(f"{API}/gami/profile", params={"employee_id": eid})
        assert r.status_code == 200
        p = r.json()
        for k in ("employee", "metrics", "level", "next_level"):
            assert k in p, f"missing {k}"
        m = p["metrics"]
        for k in ("total_points", "kudos_received", "kudos_given", "games_played", "streak"):
            assert k in m, f"missing metrics.{k}"


# --------- Kudos ---------
class TestKudos:
    def test_feed(self):
        r = requests.get(f"{API}/kudos/feed")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_kudos_awards_points(self, emp_ids):
        # ensure moderation off
        requests.put(f"{API}/gami/config", json={"kudos_moderation": False})
        frm = emp_ids["Mert Yılmaz"]
        to = emp_ids["Deniz Kaya"]

        prof_before = requests.get(f"{API}/gami/profile", params={"employee_id": to}).json()
        pts_before = prof_before["metrics"]["total_points"]

        r = requests.post(f"{API}/kudos", json={"from_id": frm, "to_id": to, "value": "takim", "message": "TEST_kudos harika iş!"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "published"

        prof_after = requests.get(f"{API}/gami/profile", params={"employee_id": to}).json()
        assert prof_after["metrics"]["total_points"] >= pts_before + 10

        # appears in feed
        feed = requests.get(f"{API}/kudos/feed").json()
        assert any(k["id"] == d["id"] for k in feed)

    def test_kudos_self_forbidden(self, emp_ids):
        eid = emp_ids["Erol Taş"]
        r = requests.post(f"{API}/kudos", json={"from_id": eid, "to_id": eid, "value": "takim", "message": "self"})
        assert r.status_code == 400

    def test_invalid_value(self, emp_ids):
        r = requests.post(f"{API}/kudos", json={"from_id": emp_ids["Erol Taş"], "to_id": emp_ids["Mert Yılmaz"], "value": "invalid_val_xyz", "message": "x"})
        assert r.status_code == 400

    def test_moderation_flow(self, emp_ids):
        # enable moderation
        r = requests.put(f"{API}/gami/config", json={"kudos_moderation": True})
        assert r.status_code == 200
        frm = emp_ids["Buse Demir"]
        to = emp_ids["Can Öztürk"]
        cr = requests.post(f"{API}/kudos", json={"from_id": frm, "to_id": to, "value": "takim", "message": "TEST_pending"})
        assert cr.status_code == 200
        kid = cr.json()["id"]
        assert cr.json()["status"] == "pending"

        pending = requests.get(f"{API}/kudos/pending").json()
        assert any(k["id"] == kid for k in pending)

        ap = requests.post(f"{API}/kudos/{kid}/approve")
        assert ap.status_code == 200

        # reject flow
        cr2 = requests.post(f"{API}/kudos", json={"from_id": frm, "to_id": to, "value": "takim", "message": "TEST_reject"})
        kid2 = cr2.json()["id"]
        rj = requests.post(f"{API}/kudos/{kid2}/reject")
        assert rj.status_code == 200

        # disable moderation for other tests
        requests.put(f"{API}/gami/config", json={"kudos_moderation": False})

    def test_mine(self, emp_ids):
        r = requests.get(f"{API}/kudos/mine", params={"employee_id": emp_ids["Deniz Kaya"]})
        assert r.status_code == 200
        d = r.json()
        assert "received" in d and "given" in d


# --------- Games ---------
class TestGames:
    def test_list_and_feed(self, emp_ids):
        r = requests.get(f"{API}/games")
        assert r.status_code == 200
        games = r.json()
        assert isinstance(games, list) and len(games) >= 1
        # feed
        rf = requests.get(f"{API}/games/feed", params={"employee_id": emp_ids["Erol Taş"]})
        assert rf.status_code == 200

    def test_create_update_delete_game(self):
        payload = {
            "title": "TEST_Yeni Oyun",
            "description": "test",
            "time_limit": 30,
            "is_tournament": False,
            "questions": [
                {"text": "1+1=?", "options": ["1", "2", "3"], "correct_index": 1},
                {"text": "Gökyüzü rengi?", "options": ["Mavi", "Yeşil"], "correct_index": 0},
            ],
        }
        cr = requests.post(f"{API}/games", json=payload)
        assert cr.status_code == 200, cr.text
        gid = cr.json()["id"]

        up = requests.put(f"{API}/games/{gid}", json={"title": "TEST_Yeni Oyun 2"})
        assert up.status_code == 200
        assert up.json()["title"] == "TEST_Yeni Oyun 2"

        dl = requests.delete(f"{API}/games/{gid}")
        assert dl.status_code == 200

    def test_play_and_leaderboard(self, emp_ids):
        # find seed active game
        games = requests.get(f"{API}/games").json()
        active = [g for g in games if g.get("status") == "active"]
        assert active, "no active game"
        gid = active[0]["id"]
        eid = emp_ids["Esra Bircan"]

        # play data
        pd = requests.get(f"{API}/games/{gid}/play", params={"employee_id": eid})
        assert pd.status_code == 200
        data = pd.json()
        n = len(data["questions"])
        assert n > 0

        # If already played, expect submission to 400. Try submitting all zeros; skip if already played
        if data.get("already_played"):
            pytest.skip("Already played by this employee in previous run")

        sub = requests.post(f"{API}/games/{gid}/play", json={"employee_id": eid, "answers": [0] * n})
        assert sub.status_code == 200
        res = sub.json()
        assert "correct_count" in res and "score" in res and "correct_indexes" in res

        # replay blocked
        again = requests.post(f"{API}/games/{gid}/play", json={"employee_id": eid, "answers": [0] * n})
        assert again.status_code == 400

        # leaderboard
        lb = requests.get(f"{API}/games/{gid}/leaderboard").json()
        assert isinstance(lb, list)
        assert any(row["employee_id"] == eid for row in lb)
