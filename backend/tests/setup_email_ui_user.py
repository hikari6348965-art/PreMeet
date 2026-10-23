# Helper: creates an onboarded UI test user (email notifications on) with one meeting; prints token + meeting id
import os, uuid, requests

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
email = f"test_bemail_ui_{uuid.uuid4().hex[:6]}@example.com"
r = requests.post(f"{BASE}/api/auth/register", json={"email": email, "password": "Test@12345", "name": "TEST UI"})
tok = r.json()["token"]
h = {"Authorization": f"Bearer {tok}"}
requests.post(f"{BASE}/api/onboarding", headers=h, json={"profession": "consultant", "load_demo_data": False})
m = requests.post(f"{BASE}/api/meetings", headers=h, json={
    "title": "TEST UI Email Meeting", "start_time": "2030-01-01T10:00:00+00:00", "objective": "TEST objective"}).json()
print(email, tok, m["id"])
