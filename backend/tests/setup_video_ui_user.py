# Helper: creates a UI test user with a meeting whose uploaded recording is processed to AI notes; prints email token meeting_id
import os, uuid, time, requests
from datetime import datetime, timezone, timedelta

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
email = f"test_vnui_{uuid.uuid4().hex[:6]}@example.com"
r = requests.post(f"{BASE}/api/auth/register", json={"email": email, "password": "Test@12345", "name": "TEST VN UI"})
tok = r.json()["token"]
h = {"Authorization": f"Bearer {tok}"}
m = requests.post(f"{BASE}/api/meetings", headers=h, json={
    "title": "TEST Renewal sync", "attendees": ["Priya", "Marcus"], "objective": "Close renewal",
    "start_time": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()}).json()
mid = m["id"]
up = requests.post(f"{BASE}/api/meetings/{mid}/notes/upload", headers=h,
                   files={"file": ("meeting.mp3", open("/tmp/test_meeting.mp3", "rb"), "audio/mpeg")}, timeout=120)
print("upload", up.status_code)
for _ in range(40):
    st = requests.get(f"{BASE}/api/meetings/{mid}/notes", headers=h).json()["status"]
    if st in ("ready", "failed"):
        break
    time.sleep(3)
print("status", st)
print(email, tok, mid)
