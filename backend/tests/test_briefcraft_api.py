"""PreMeet backend regression tests: auth, onboarding, prefs, meetings, briefs (LLM), integrations, usage, admin."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@briefcraft.ai"
ADMIN_PASSWORD = "Admin@12345"


def bearer(token):
    # Fresh session per call to avoid cookie bleed between users
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture(scope="module")
def user_ctx():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"name": "TEST User", "email": email, "password": "Passw0rd!"})
    assert r.status_code == 200, r.text
    d = r.json()
    return {"email": email, "token": d["token"], "id": d["id"]}


# ---- Health / Auth ----
def test_health():
    r = requests.get(f"{API}/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_register_response_and_cookies():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"name": "TEST R", "email": email, "password": "Passw0rd!"})
    assert r.status_code == 200
    d = r.json()
    assert d["email"] == email and d["role"] == "user" and d["onboarded"] is False
    assert isinstance(d["token"], str) and len(d["token"]) > 20
    sc = r.headers.get("set-cookie", "")
    assert "access_token" in sc and "HttpOnly" in sc
    # duplicate
    r2 = requests.post(f"{API}/auth/register", json={"name": "TEST R", "email": email, "password": "Passw0rd!"})
    assert r2.status_code == 400


def test_admin_login_and_me(admin_token):
    r = bearer(admin_token).get(f"{API}/auth/me")
    assert r.status_code == 200
    d = r.json()
    assert d["email"] == ADMIN_EMAIL and d["role"] == "admin"
    assert "password_hash" not in d and "_id" not in d


def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong-pass"})
    assert r.status_code == 401
    # ensure not locked: correct login clears attempts
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200


def test_brute_force_lockout():
    email = f"test_bf_{uuid.uuid4().hex[:6]}@example.com"
    requests.post(f"{API}/auth/register", json={"name": "TEST BF", "email": email, "password": "Passw0rd!"})
    codes = [requests.post(f"{API}/auth/login", json={"email": email, "password": "bad"}).status_code for _ in range(6)]
    assert codes[:5] == [401] * 5
    assert codes[5] == 429


def test_me_unauthenticated():
    assert requests.get(f"{API}/auth/me").status_code == 401


# ---- Onboarding / Dashboard ----
def test_onboarding_with_demo_and_dashboard(user_ctx):
    s = bearer(user_ctx["token"])
    r = s.post(f"{API}/onboarding", json={"profession": "consultant", "default_objective": "TEST obj",
                                           "tone": "professional", "detail_level": "balanced", "load_demo_data": True})
    assert r.status_code == 200 and r.json()["ok"] is True
    me = s.get(f"{API}/auth/me").json()
    assert me["onboarded"] is True and me["profession"] == "consultant"
    d = s.get(f"{API}/dashboard")
    assert d.status_code == 200
    dd = d.json()
    for k in ["upcoming_meetings", "recent_briefs", "commitments", "integrations", "usage", "plan", "stats"]:
        assert k in dd
    assert len(s.get(f"{API}/meetings").json()) > 0
    assert len(s.get(f"{API}/contacts").json()) > 0


# ---- Preferences ----
def test_preferences_update_persist(user_ctx):
    s = bearer(user_ctx["token"])
    r = s.put(f"{API}/preferences", json={"tone": "warm", "detail_level": "detailed", "brief_lead_minutes": 45,
                                         "default_objective": "TEST_objective", "email_notifications": True,
                                         "auto_generate": False})
    assert r.status_code == 200
    g = s.get(f"{API}/preferences").json()
    assert g["tone"] == "warm" and g["detail_level"] == "detailed" and g["brief_lead_minutes"] == 45
    assert g["default_objective"] == "TEST_objective" and g["email_notifications"] is True and g["auto_generate"] is False
    assert "_id" not in g


# ---- Meetings / Contacts / Notes / Commitments CRUD ----
def test_meeting_crud(user_ctx):
    s = bearer(user_ctx["token"])
    r = s.post(f"{API}/meetings", json={"title": "TEST_Meeting", "start_time": "2030-01-01T10:00:00+00:00",
                                       "objective": "x", "attendees": ["a@b.com"]})
    assert r.status_code == 200
    m = r.json()
    assert m["title"] == "TEST_Meeting" and m["status"] == "scheduled" and "_id" not in m
    g = s.get(f"{API}/meetings/{m['id']}")
    assert g.status_code == 200 and g.json()["meeting"]["title"] == "TEST_Meeting"
    p = s.patch(f"{API}/meetings/{m['id']}", json={"title": "TEST_Meeting2"})
    assert p.status_code == 200 and p.json()["title"] == "TEST_Meeting2"
    assert s.delete(f"{API}/meetings/{m['id']}").status_code == 200
    assert s.get(f"{API}/meetings/{m['id']}").status_code == 404


def test_meeting_isolation(user_ctx, admin_token):
    s = bearer(user_ctx["token"])
    m = s.post(f"{API}/meetings", json={"title": "TEST_Private", "start_time": "2030-01-01T10:00:00+00:00"}).json()
    assert bearer(admin_token).get(f"{API}/meetings/{m['id']}").status_code == 404
    s.delete(f"{API}/meetings/{m['id']}")


def test_contact_note_commitment(user_ctx):
    s = bearer(user_ctx["token"])
    c = s.post(f"{API}/contacts", json={"name": "TEST_Contact", "company": "Acme"}).json()
    assert s.get(f"{API}/contacts/{c['id']}").json()["contact"]["name"] == "TEST_Contact"
    n = s.post(f"{API}/notes", json={"title": "TEST_note", "content": "hello", "contact_id": c["id"]})
    assert n.status_code == 200
    cm = s.post(f"{API}/commitments", json={"description": "TEST_commit", "contact_id": c["id"]}).json()
    u = s.patch(f"{API}/commitments/{cm['id']}", json={"status": "done"})
    assert u.status_code == 200 and u.json()["status"] == "done"
    assert s.get(f"{API}/companies").status_code == 200
    up = s.post(f"{API}/notes/upload", files={"file": ("t.txt", b"note body", "text/plain")},
                headers={"Authorization": f"Bearer {user_ctx['token']}", "Content-Type": None})
    assert up.status_code == 200, up.text
    bad = requests.post(f"{API}/notes/upload", files={"file": ("t.pdf", b"x", "application/pdf")},
                        headers={"Authorization": f"Bearer {user_ctx['token']}"})
    assert bad.status_code == 400
    s.delete(f"{API}/notes/{n.json()['id']}")
    s.delete(f"{API}/contacts/{c['id']}")


# ---- Integrations ----
def test_integrations(user_ctx):
    s = bearer(user_ctx["token"])
    rows = s.get(f"{API}/integrations").json()
    assert len(rows) > 0
    # Google providers now use a real OAuth redirect (covered in test_video_notes_google.py)
    oauth = [r for r in rows if r.get("requires_oauth") and r["provider"] not in ("google_calendar", "gmail")]
    manual = [r for r in rows if not r.get("requires_oauth")]
    assert oauth and manual
    r = s.post(f"{API}/integrations/{oauth[0]['provider']}/connect").json()
    assert r["ok"] is False and r["status"] == "setup_required"
    r = s.post(f"{API}/integrations/{manual[0]['provider']}/connect").json()
    assert r["status"] == "connected"
    s.post(f"{API}/integrations/{manual[0]['provider']}/disconnect")
    rows = s.get(f"{API}/integrations").json()
    assert [x for x in rows if x["provider"] == manual[0]["provider"]][0]["status"] == "not_connected"
    assert s.post(f"{API}/integrations/nonexistent/connect").status_code == 404


# ---- Briefs (real LLM) ----
def test_generate_brief_and_usage(user_ctx):
    s = bearer(user_ctx["token"])
    before = s.get(f"{API}/usage").json()["usage"]["briefs_generated"]
    meetings = s.get(f"{API}/meetings").json()
    target = next((m for m in meetings if m.get("contact_id")), meetings[0])
    r = s.post(f"{API}/briefs/generate", json={"meeting_id": target["id"]}, timeout=180)
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["status"] == "ready" and isinstance(b["content"], dict)
    assert "talking_points" in b["content"] and "sources" in b["content"]
    after = s.get(f"{API}/usage").json()["usage"]["briefs_generated"]
    assert after == before + 1
    g = s.get(f"{API}/meetings/{target['id']}").json()
    assert g["meeting"]["status"] == "ready" and g["brief"]["id"] == b["id"]
    assert s.get(f"{API}/briefs/{b['id']}").status_code == 200
    fb = s.post(f"{API}/briefs/feedback", json={"brief_id": b["id"], "type": "helpful"})
    assert fb.status_code == 200
    e = s.patch(f"{API}/briefs/{b['id']}", json={"content": {**b["content"], "objective": "TEST_edit"}})
    assert e.status_code == 200 and e.json()["edited"] is True
    assert s.get(f"{API}/briefs/{b['id']}").json()["content"]["objective"] == "TEST_edit"


def test_generate_brief_404(user_ctx):
    assert bearer(user_ctx["token"]).post(f"{API}/briefs/generate", json={"meeting_id": "nope"}).status_code == 404


# ---- Plans / subscription ----
def test_plans_and_subscription(user_ctx):
    plans = requests.get(f"{API}/plans").json()
    assert len(plans) >= 2 and all("_id" not in p for p in plans)
    sub = bearer(user_ctx["token"]).get(f"{API}/subscription")
    assert sub.status_code == 200 and "razorpay_configured" in sub.json()


# ---- Admin ----
def test_admin_forbidden_for_user(user_ctx):
    s = bearer(user_ctx["token"])
    for path in ["stats", "users", "plans", "failed-jobs", "audit"]:
        assert s.get(f"{API}/admin/{path}").status_code == 403, path
    assert s.put(f"{API}/admin/plans/free", json={"price_monthly": 1}).status_code == 403


def test_admin_endpoints(admin_token):
    s = bearer(admin_token)
    st = s.get(f"{API}/admin/stats").json()
    for k in ["total_users", "total_briefs", "active_subscriptions", "failed_generations"]:
        assert isinstance(st[k], int)
    users = s.get(f"{API}/admin/users").json()
    assert any(u["email"] == ADMIN_EMAIL for u in users) and all("password_hash" not in u for u in users)
    assert isinstance(s.get(f"{API}/admin/failed-jobs").json(), list)
    assert isinstance(s.get(f"{API}/admin/audit").json(), list)


def test_admin_plan_update_and_restore(admin_token):
    s = bearer(admin_token)
    plans = s.get(f"{API}/admin/plans").json()
    p = [x for x in plans if x["price_monthly"] > 0][0]
    orig_price, orig_allow = p["price_monthly"], p["brief_allowance"]
    try:
        r = s.put(f"{API}/admin/plans/{p['id']}", json={"price_monthly": orig_price + 1, "brief_allowance": orig_allow + 1})
        assert r.status_code == 200 and r.json()["price_monthly"] == orig_price + 1
        g = [x for x in s.get(f"{API}/plans").json() if x["id"] == p["id"]][0]
        assert g["brief_allowance"] == orig_allow + 1
    finally:
        s.put(f"{API}/admin/plans/{p['id']}", json={"price_monthly": orig_price, "brief_allowance": orig_allow})
    assert s.put(f"{API}/admin/plans/nope", json={"price_monthly": 1}).status_code == 404
