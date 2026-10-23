import os
import base64
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet

from database import db
from models import now_iso

logger = logging.getLogger(__name__)

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
    "openid", "email",
]
GOOGLE_PROVIDERS = ("google_calendar", "gmail")


class GoogleNotConnected(Exception):
    pass


def _fernet() -> Fernet:
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(os.environ["JWT_SECRET"].encode()).digest()))


def redirect_uri() -> str:
    return f"{os.environ['FRONTEND_URL']}/api/integrations/google/callback"


def auth_url(state: str) -> str:
    return AUTH_URL + "?" + urlencode({
        "client_id": os.environ["GOOGLE_CLIENT_ID"], "redirect_uri": redirect_uri(),
        "response_type": "code", "scope": " ".join(SCOPES), "access_type": "offline",
        "include_granted_scopes": "true", "prompt": "consent", "state": state,
    })


async def exchange_code(code: str) -> dict:
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(TOKEN_URL, data={
            "code": code, "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "redirect_uri": redirect_uri(), "grant_type": "authorization_code",
        })
    r.raise_for_status()
    return r.json()


async def save_connection(user_id: str, tokens: dict):
    update = {"user_id": user_id, "scopes": tokens.get("scope", ""), "updated_at": now_iso(), "revoked": False}
    if tokens.get("refresh_token"):
        update["refresh_token"] = _fernet().encrypt(tokens["refresh_token"].encode()).decode()
    async with httpx.AsyncClient(timeout=15) as c:
        info = await c.get("https://openidconnect.googleapis.com/v1/userinfo",
                           headers={"Authorization": f"Bearer {tokens['access_token']}"})
    if info.status_code == 200:
        update["google_email"] = info.json().get("email")
    await db.google_connections.update_one({"user_id": user_id}, {"$set": update}, upsert=True)
    granted = tokens.get("scope", "")
    for provider, scope in (("google_calendar", "calendar.readonly"), ("gmail", "gmail.readonly")):
        status = "connected" if scope in granted else "not_connected"
        await db.integrations.update_one({"user_id": user_id, "provider": provider},
                                         {"$set": {"status": status, "connected_at": now_iso(),
                                                   "account": update.get("google_email"), "error": None}})


async def access_token(user_id: str) -> str:
    conn = await db.google_connections.find_one({"user_id": user_id, "revoked": False})
    if not conn or not conn.get("refresh_token"):
        raise GoogleNotConnected()
    refresh = _fernet().decrypt(conn["refresh_token"].encode()).decode()
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(TOKEN_URL, data={
            "client_id": os.environ["GOOGLE_CLIENT_ID"], "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "refresh_token": refresh, "grant_type": "refresh_token",
        })
    if r.status_code != 200:
        logger.warning(f"Google refresh failed for {user_id}: {r.status_code}")
        await db.google_connections.update_one({"user_id": user_id}, {"$set": {"revoked": True}})
        await db.integrations.update_many({"user_id": user_id, "provider": {"$in": list(GOOGLE_PROVIDERS)}},
                                          {"$set": {"status": "not_connected", "error": "Authorization expired. Please reconnect."}})
        raise GoogleNotConnected()
    return r.json()["access_token"]


async def disconnect(user_id: str):
    conn = await db.google_connections.find_one({"user_id": user_id})
    if conn and conn.get("refresh_token"):
        try:
            token = _fernet().decrypt(conn["refresh_token"].encode()).decode()
            async with httpx.AsyncClient(timeout=10) as c:
                await c.post("https://oauth2.googleapis.com/revoke", data={"token": token})
        except Exception as e:
            logger.warning(f"Google revoke failed: {e}")
    await db.google_connections.delete_one({"user_id": user_id})
    await db.integrations.update_many({"user_id": user_id, "provider": {"$in": list(GOOGLE_PROVIDERS)}},
                                      {"$set": {"status": "not_connected", "connected_at": None, "account": None}})


async def upcoming_events(user_id: str, days: int = 30) -> list[dict]:
    token = await access_token(user_id)
    now = datetime.now(timezone.utc)
    params = {"timeMin": now.isoformat(), "timeMax": (now + timedelta(days=days)).isoformat(),
              "singleEvents": "true", "orderBy": "startTime", "maxResults": 100}
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get("https://www.googleapis.com/calendar/v3/calendars/primary/events",
                        params=params, headers={"Authorization": f"Bearer {token}"})
    r.raise_for_status()
    return [e for e in r.json().get("items", []) if e.get("status") != "cancelled"]


async def gmail_threads(user_id: str, emails: list[str], limit: int = 5) -> list[dict]:
    emails = [e for e in emails if e and "@" in e][:5]
    if not emails:
        return []
    token = await access_token(user_id)
    q = "(" + " OR ".join(f"from:{e} OR to:{e}" for e in emails) + ") newer_than:180d"
    headers = {"Authorization": f"Bearer {token}"}
    base = "https://gmail.googleapis.com/gmail/v1/users/me"
    out = []
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get(f"{base}/threads", params={"q": q, "maxResults": limit}, headers=headers)
        if r.status_code != 200:
            return []
        for t in r.json().get("threads", []):
            tr = await c.get(f"{base}/threads/{t['id']}", headers=headers,
                             params=[("format", "metadata"), ("metadataHeaders", "Subject"),
                                     ("metadataHeaders", "From"), ("metadataHeaders", "Date")])
            if tr.status_code != 200:
                continue
            msgs = tr.json().get("messages", [])
            if not msgs:
                continue
            last = msgs[-1]
            hs = {h["name"].lower(): h["value"] for h in last.get("payload", {}).get("headers", [])}
            out.append({"subject": hs.get("subject", "(no subject)"), "from": hs.get("from", ""),
                        "date": hs.get("date", ""), "snippet": last.get("snippet", ""), "messages": len(msgs)})
    return out
