"""Brief Ready Emails: auto-send on generate, opt-out via preferences, manual resend (auth/ownership/rate-limit), HTML render."""
import os
import sys
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
PREFIX = "test_bemail_"


def bearer(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


def register(name):
    email = f"{PREFIX}{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"name": name, "email": email, "password": "Passw0rd!"})
    assert r.status_code == 200, r.text
    d = r.json()
    return {"email": email, "token": d["token"], "id": d["id"], "s": bearer(d["token"])}


def make_meeting(s, title):
    r = s.post(f"{API}/meetings", json={"title": title, "start_time": "2030-01-01T10:00:00+00:00",
                                        "objective": "TEST_close the renewal", "attendees": ["Jane Doe"]})
    assert r.status_code == 200, r.text
    return r.json()


def poll_status(s, mid, want="sent", secs=25):
    st = None
    for _ in range(secs):
        st = (s.get(f"{API}/meetings/{mid}").json().get("brief") or {}).get("email_status")
        if st == want or st == "failed":
            return st
        time.sleep(1)
    return st


@pytest.fixture(scope="module")
def user_a():
    return register("TEST Email A")


@pytest.fixture(scope="module")
def user_b():
    return register("TEST Email B")


@pytest.fixture(scope="module")
def brief_a(user_a):
    s = user_a["s"]
    m = make_meeting(s, "TEST_Email Meeting A")
    r = s.post(f"{API}/briefs/generate", json={"meeting_id": m["id"]}, timeout=180)
    assert r.status_code == 200, r.text
    return {"meeting": m, "brief": r.json()}


# --- render unit test ---
def test_render_brief_ready_html():
    sys.path.insert(0, "/app/backend")
    from dotenv import load_dotenv
    load_dotenv("/app/backend/.env")
    import email_service
    meeting = {"id": "m123", "title": "Acme <Renewal>", "start_time": "2030-01-01T10:00:00+00:00", "attendees": ["Jane"]}
    content = {"objective": "Close renewal", "talking_points": [{"point": f"P{i}"} for i in range(5)]}
    link = f"{os.environ['FRONTEND_URL']}/app/meetings/m123"
    subject, html = email_service.render_brief_ready("Bob", meeting, content, link)
    assert "Acme" in subject
    assert "Acme &lt;Renewal&gt;" in html
    assert "Close renewal" in html
    assert "P0" in html and "P2" in html and "P3" not in html
    assert link.startswith("https://") and link in html
    assert os.environ["EMAIL_FROM_NAME"] == "BriefCraft AI"
    email_service._assert_safe_email(subject, html)


# --- auto-send on generate ---
def test_generate_sets_sending_then_sent(user_a, brief_a):
    assert brief_a["brief"].get("email_status") == "sending"
    st = poll_status(user_a["s"], brief_a["meeting"]["id"])
    assert st == "sent", f"email_status={st}"


def test_manual_email_rate_limited_right_after_auto(user_a, brief_a):
    r = user_a["s"].post(f"{API}/briefs/{brief_a['brief']['id']}/email")
    assert r.status_code == 429, r.text


def test_manual_email_other_user_404(user_b, brief_a):
    r = user_b["s"].post(f"{API}/briefs/{brief_a['brief']['id']}/email")
    assert r.status_code == 404


def test_manual_email_unauth(brief_a):
    r = requests.post(f"{API}/briefs/{brief_a['brief']['id']}/email")
    assert r.status_code in (401, 403)


def test_manual_email_send_then_429(user_a, brief_a):
    time.sleep(62)
    s = user_a["s"]
    r = s.post(f"{API}/briefs/{brief_a['brief']['id']}/email", timeout=60)
    assert r.status_code == 200, r.text
    assert r.json() == {"ok": True, "email_status": "sent"}
    r2 = s.post(f"{API}/briefs/{brief_a['brief']['id']}/email")
    assert r2.status_code == 429


# --- opt-out ---
def test_opt_out_no_email(user_b):
    s = user_b["s"]
    p = s.put(f"{API}/preferences", json={"email_notifications": False})
    assert p.status_code == 200 and p.json()["email_notifications"] is False
    m = make_meeting(s, "TEST_Email Meeting B")
    r = s.post(f"{API}/briefs/generate", json={"meeting_id": m["id"]}, timeout=180)
    assert r.status_code == 200, r.text
    assert "email_status" not in r.json()
    time.sleep(6)
    b = s.get(f"{API}/meetings/{m['id']}").json()["brief"]
    assert "email_status" not in b
