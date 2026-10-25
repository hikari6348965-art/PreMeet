"""Video rooms (Daily), guest join, meeting notes (manual/upload/AI extraction/PDF), Google OAuth integration."""
import os
import time
import uuid
from urllib.parse import urlparse, parse_qs

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ENV = dotenv_values("/app/backend/.env")
db = MongoClient(ENV["MONGO_URL"])[ENV["DB_NAME"]]
AUDIO = "/tmp/test_meeting.mp3"


def register(name):
    email = f"test_vnotes_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"name": name, "email": email, "password": "Passw0rd!"})
    assert r.status_code == 200, r.text
    d = r.json()
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {d['token']}"})
    return {"email": email, "id": d["id"], "s": s, "token": d["token"]}


@pytest.fixture(scope="module")
def users():
    a, b = register("TEST VN A"), register("TEST VN B")
    yield a, b
    for u in (a, b):
        for c in ("meetings", "briefs", "meeting_notes", "commitments", "files", "integrations", "oauth_states",
                  "audit_events", "usage_records", "google_connections"):
            db[c].delete_many({"user_id": u["id"]})
        db.users.delete_one({"email": u["email"]})


@pytest.fixture(scope="module")
def meeting(users):
    a, _ = users
    r = a["s"].post(f"{API}/meetings", json={"title": "TEST_Renewal call", "start_time": "2030-01-01T10:00:00+00:00",
                                             "objective": "TEST_close renewal", "attendees": ["Priya", "Marcus"]})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def meeting2(users):
    a, _ = users
    r = a["s"].post(f"{API}/meetings", json={"title": "TEST_Upload call", "start_time": "2030-01-02T10:00:00+00:00",
                                             "objective": "TEST_upload", "attendees": ["Priya"]})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def room(users, meeting):
    a, _ = users
    r = a["s"].post(f"{API}/meetings/{meeting['id']}/room", timeout=60)
    assert r.status_code == 200, r.text
    return r.json()


# --- Video room ---
def test_room_create(room):
    assert room["url"].startswith("https://premeet.daily.co/")
    assert isinstance(room["token"], str) and len(room["token"]) > 20
    assert "/join/" in room["invite_url"] and "?k=" in room["invite_url"]
    assert room["recording"] is False


def test_room_reused(users, meeting, room):
    a, _ = users
    r = a["s"].post(f"{API}/meetings/{meeting['id']}/room", timeout=60)
    assert r.status_code == 200
    assert r.json()["url"] == room["url"]
    assert r.json()["invite_url"] == room["invite_url"]


def test_room_other_user_404(users, meeting):
    _, b = users
    assert b["s"].post(f"{API}/meetings/{meeting['id']}/room").status_code == 404


def test_guest_join_ok_and_bad_key(meeting, room):
    k = parse_qs(urlparse(room["invite_url"]).query)["k"][0]
    r = requests.post(f"{API}/public/rooms/{meeting['id']}/join", json={"k": k, "name": "Guest Tester"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["url"] == room["url"] and len(d["token"]) > 20 and d["title"] == "TEST_Renewal call"
    r2 = requests.post(f"{API}/public/rooms/{meeting['id']}/join", json={"k": "wrong", "name": "X"})
    assert r2.status_code == 404


def test_process_without_recording_400(users, meeting, room, meeting2):
    a, _ = users
    r = a["s"].post(f"{API}/meetings/{meeting['id']}/notes/process")
    assert r.status_code == 400
    # meeting with no room at all
    r = a["s"].post(f"{API}/meetings/{meeting2['id']}/notes/process")
    assert r.status_code == 400


# --- Manual notes ---
def test_manual_notes_persist(users, meeting):
    a, b = users
    g = a["s"].get(f"{API}/meetings/{meeting['id']}/notes")
    assert g.status_code == 200 and g.json()["status"] == "none"
    r = a["s"].put(f"{API}/meetings/{meeting['id']}/notes", json={"manual": "TEST_manual note: budget approved"})
    assert r.status_code == 200 and r.json()["manual"] == "TEST_manual note: budget approved"
    g = a["s"].get(f"{API}/meetings/{meeting['id']}/notes")
    assert g.json()["manual"] == "TEST_manual note: budget approved"
    assert "_id" not in g.json()
    assert b["s"].get(f"{API}/meetings/{meeting['id']}/notes").status_code == 404
    assert b["s"].put(f"{API}/meetings/{meeting['id']}/notes", json={"manual": "x"}).status_code == 404


def test_notes_pdf(users, meeting):
    a, b = users
    r = a["s"].get(f"{API}/meetings/{meeting['id']}/notes/pdf")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/pdf")
    assert r.content[:4] == b"%PDF"
    assert "attachment" in r.headers.get("content-disposition", "")
    assert b["s"].get(f"{API}/meetings/{meeting['id']}/notes/pdf").status_code == 404


# --- Upload recording -> whisper -> Groq ---
def test_upload_bad_ext_400(users, meeting2):
    a, _ = users
    r = a["s"].post(f"{API}/meetings/{meeting2['id']}/notes/upload",
                    files={"file": ("notes.txt", b"hello", "text/plain")})
    assert r.status_code == 400


def test_upload_audio_pipeline(users, meeting2):
    a, b = users
    assert os.path.exists(AUDIO), "run tests/make_test_audio.py first"
    assert b["s"].post(f"{API}/meetings/{meeting2['id']}/notes/upload",
                       files={"file": ("m.mp3", open(AUDIO, "rb"), "audio/mpeg")}).status_code == 404
    r = a["s"].post(f"{API}/meetings/{meeting2['id']}/notes/upload",
                    files={"file": ("meeting.mp3", open(AUDIO, "rb"), "audio/mpeg")}, timeout=120)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "transcribing"
    # second upload while processing -> 409
    r2 = a["s"].post(f"{API}/meetings/{meeting2['id']}/notes/upload",
                     files={"file": ("meeting.mp3", open(AUDIO, "rb"), "audio/mpeg")}, timeout=120)
    assert r2.status_code == 409, r2.text
    seen, d = set(), {}
    for _ in range(60):
        d = a["s"].get(f"{API}/meetings/{meeting2['id']}/notes").json()
        seen.add(d["status"])
        if d["status"] in ("ready", "failed"):
            break
        time.sleep(3)
    print("statuses seen:", seen, "error:", d.get("error"))
    assert d["status"] == "ready", d
    ai = d["ai"]
    assert ai["summary"]
    assert len(ai["decisions"]) >= 1
    assert len(ai["action_items"]) >= 1
    assert d["transcript"] and "contract" in d["transcript"].lower()
    print("AI:", ai)
    cs = a["s"].get(f"{API}/commitments").json()
    cs = cs if isinstance(cs, list) else cs.get("items", cs)
    mine = [c for c in cs if c.get("meeting_id") == meeting2["id"]]
    assert len(mine) >= 1 and all(c["status"] == "open" for c in mine)
    pdf = a["s"].get(f"{API}/meetings/{meeting2['id']}/notes/pdf")
    assert pdf.status_code == 200 and len(pdf.content) > 1500


# --- Google ---
def test_google_connect_redirect(users):
    a, _ = users
    for prov in ("google_calendar", "gmail"):
        r = a["s"].post(f"{API}/integrations/{prov}/connect")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "redirect"
        u = urlparse(d["authorization_url"])
        assert u.netloc == "accounts.google.com"
        q = parse_qs(u.query)
        assert q["redirect_uri"][0] == f"{BASE_URL}/api/integrations/google/callback"
        assert "calendar.readonly" in q["scope"][0] and "gmail.readonly" in q["scope"][0]
        assert q["state"][0]


def test_google_callback_bad_state():
    r = requests.get(f"{API}/integrations/google/callback", params={"code": "x", "state": "bogus"},
                     allow_redirects=False)
    assert r.status_code in (302, 307)
    assert r.headers["location"].endswith("/app/integrations?google=expired")
    r = requests.get(f"{API}/integrations/google/callback", params={"error": "access_denied"}, allow_redirects=False)
    assert r.headers["location"].endswith("?google=denied")


def test_google_sync_not_connected_409(users):
    a, _ = users
    assert a["s"].post(f"{API}/integrations/google/sync").status_code == 409


def test_unavailable_integrations_removed(users):
    # Outlook/HubSpot/Salesforce were removed from the catalog
    a, _ = users
    provs = {r["provider"] for r in a["s"].get(f"{API}/integrations").json()}
    assert provs == {"google_calendar", "gmail", "manual_notes"}, provs
