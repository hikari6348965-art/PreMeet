"""PreMeet: Google (Emergent-managed) auth + rename checks."""
import os
import sys
import uuid
import subprocess
import pytest
import requests
from pymongo import MongoClient
from dotenv import dotenv_values

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/") #type: ignore
API = f"{BASE_URL}/api"
ENV = dotenv_values("/app/backend/.env")


def mint(uid, email):
    code = ("import sys;sys.path.insert(0,'/app/backend');from dotenv import load_dotenv;"
            "load_dotenv('/app/backend/.env');import auth;"
            f"print(auth.create_access_token('{uid}','{email}'))")
    return subprocess.check_output([sys.executable, "-c", code], text=True).strip()


@pytest.fixture(scope="module")
def google_user():
    db = MongoClient(ENV["MONGO_URL"])[ENV["DB_NAME"]] #type: ignore
    email = f"test_google_{uuid.uuid4().hex[:8]}@example.com"
    uid = str(db.users.insert_one({"email": email, "name": "TEST Google", "role": "user",
                                    "onboarded": True, "google_linked": True,
                                    "created_at": "2026-01-01T00:00:00+00:00"}).inserted_id)
    yield {"id": uid, "email": email, "token": mint(uid, email)}
    db.users.delete_one({"email": email})


# Google session exchange
def test_google_session_bogus_returns_401():
    r = requests.post(f"{API}/auth/google-session", json={"session_id": "bogus"})
    assert r.status_code == 401, r.text
    assert r.json()["detail"] == "Google sign-in failed. Please try again."


def test_google_session_missing_field_422():
    r = requests.post(f"{API}/auth/google-session", json={})
    assert r.status_code == 422


# Google-only user (no password_hash)
def test_google_user_me(google_user):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {google_user['token']}"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["email"] == google_user["email"]
    assert "password_hash" not in d and "_id" not in d


def test_google_user_can_use_app(google_user):
    h = {"Authorization": f"Bearer {google_user['token']}"}
    for path in ["/meetings", "/preferences", "/usage", "/integrations", "/billing/subscription"]:
        r = requests.get(f"{API}{path}", headers=h)
        assert r.status_code in (200, 404), f"{path} {r.status_code} {r.text[:200]}"
        assert r.status_code != 500


def test_password_login_for_google_only_user_401(google_user):
    r = requests.post(f"{API}/auth/login", json={"email": google_user["email"], "password": "whatever123"})
    assert r.status_code == 401, r.text


def test_forgot_password_for_google_user_ok(google_user):
    r = requests.post(f"{API}/auth/forgot-password", json={"email": google_user["email"]})
    assert r.status_code == 200