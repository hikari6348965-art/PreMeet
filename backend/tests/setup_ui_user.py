# Helper: creates a UI test user with exhausted free quota and one meeting; prints token
import os, uuid, requests
from datetime import datetime, timezone, timedelta
from dotenv import dotenv_values
from pymongo import MongoClient

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ENV = dotenv_values("/app/backend/.env")
db = MongoClient(ENV["MONGO_URL"])[ENV["DB_NAME"]]
email = f"test_ui_{uuid.uuid4().hex[:6]}@example.com"
r = requests.post(f"{BASE}/api/auth/register", json={"email": email, "password": "Test@12345", "name": "TEST UI"})
tok = r.json()["token"]
h = {"Authorization": f"Bearer {tok}"}
uid = requests.get(f"{BASE}/api/auth/me", headers=h).json()["id"]
requests.get(f"{BASE}/api/usage", headers=h)
db.usage_records.update_many({"user_id": uid}, {"$set": {"briefs_generated": 3}})
m = requests.post(f"{BASE}/api/meetings", headers=h, json={
    "title": "TEST quota meeting", "start_time": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()})
print(email, tok, m.status_code, m.json().get("id"))
