import os
import shutil
import tempfile
import asyncio
import logging
import secrets as pysecrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel

from database import db
from models import new_id, now_iso
import auth as authmod
import google_service as gs
import video_service as vs
import storage
from notes_pdf import render_notes_pdf

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")
_tasks = set()


def _bg(coro):
    t = asyncio.create_task(coro)
    _tasks.add(t)
    t.add_done_callback(_tasks.discard)


async def _meeting(meeting_id: str, user_id: str) -> dict:
    m = await db.meetings.find_one({"id": meeting_id, "user_id": user_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return m


# ============ GOOGLE ============
@router.post("/integrations/google/start")
async def google_start(user=Depends(authmod.get_current_user)):
    state = pysecrets.token_urlsafe(32)
    await db.oauth_states.insert_one({"state": state, "user_id": user["id"], "used": False,
                                      "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()})
    return {"authorization_url": gs.auth_url(state)}


@router.get("/integrations/google/callback")
async def google_callback(code: str = Query(None), state: str = Query(None), error: str = Query(None)):
    back = f"{os.environ['FRONTEND_URL']}/app/integrations"
    if error or not code or not state:
        return RedirectResponse(f"{back}?google=denied")
    row = await db.oauth_states.find_one_and_update(
        {"state": state, "used": False, "expires_at": {"$gt": now_iso()}}, {"$set": {"used": True}})
    if not row:
        return RedirectResponse(f"{back}?google=expired")
    try:
        tokens = await gs.exchange_code(code)
        await gs.save_connection(row["user_id"], tokens)
    except Exception as e:
        logger.error(f"Google token exchange failed: {e}")
        return RedirectResponse(f"{back}?google=error")
    await db.audit_events.insert_one({"id": new_id(), "user_id": row["user_id"], "action": "google_connected",
                                      "detail": "", "created_at": now_iso()})
    return RedirectResponse(f"{back}?google=connected")


@router.post("/integrations/google/sync")
async def google_sync(user=Depends(authmod.get_current_user)):
    try:
        events = await gs.upcoming_events(user["id"])
    except gs.GoogleNotConnected:
        raise HTTPException(status_code=409, detail="Google Calendar isn't connected. Please connect it first.")
    created = updated = 0
    for e in events:
        start = e.get("start", {}).get("dateTime") or (e.get("start", {}).get("date", "") + "T09:00:00+00:00")
        end = e.get("end", {}).get("dateTime") or (e.get("end", {}).get("date", "") + "T10:00:00+00:00")
        attendees = [a.get("displayName") or a.get("email") for a in e.get("attendees", []) if not a.get("self")]
        fields = {"title": e.get("summary") or "Untitled event", "start_time": start, "end_time": end,
                  "attendees": attendees, "attendee_emails": [a.get("email") for a in e.get("attendees", []) if not a.get("self")],
                  "objective": (e.get("description") or "")[:500], "source": "google_calendar",
                  "external_link": e.get("hangoutLink") or ""}
        existing = await db.meetings.find_one({"user_id": user["id"], "google_event_id": e["id"]})
        if existing:
            await db.meetings.update_one({"id": existing["id"]}, {"$set": fields})
            updated += 1
        else:
            await db.meetings.insert_one({"id": new_id(), "user_id": user["id"], "google_event_id": e["id"],
                                          "meeting_type": "other", "status": "scheduled", "company": "",
                                          "contact_id": None, "created_at": now_iso(), **fields})
            created += 1
    await db.integrations.update_one({"user_id": user["id"], "provider": "google_calendar"},
                                     {"$set": {"last_synced_at": now_iso()}})
    return {"ok": True, "created": created, "updated": updated, "total": len(events)}


# ============ VIDEO ROOM ============
@router.post("/meetings/{meeting_id}/room")
async def join_room(meeting_id: str, user=Depends(authmod.get_current_user)):
    m = await _meeting(meeting_id, user["id"])
    now = int(datetime.now(timezone.utc).timestamp())
    room = m.get("video_room")
    if not room or room.get("exp", 0) < now + 3600:
        exp = now + 7 * 86400
        name = f"bc-{meeting_id[:8]}-{pysecrets.token_hex(3)}"
        try:
            created, can_record = await vs.create_room(name, exp)
        except Exception:
            raise HTTPException(status_code=502, detail="Couldn't create the video room. Please try again.")
        room = {"name": created["name"], "url": created["url"], "exp": exp, "recording": can_record,
                "invite_key": pysecrets.token_urlsafe(16), "created_at": now_iso()}
        await db.meetings.update_one({"id": meeting_id}, {"$set": {"video_room": room}})
    token = await vs.meeting_token(room["name"], user.get("name") or "Host", True, now + 6 * 3600,
                                   record=room.get("recording", False))
    invite = f"{os.environ['FRONTEND_URL']}/join/{meeting_id}?k={room['invite_key']}"
    return {"url": room["url"], "token": token, "invite_url": invite, "recording": room.get("recording", False)}


class GuestJoin(BaseModel):
    k: str
    name: str


@router.post("/public/rooms/{meeting_id}/join")
async def guest_join(meeting_id: str, payload: GuestJoin):
    m = await db.meetings.find_one({"id": meeting_id}, {"_id": 0, "video_room": 1, "title": 1})
    room = (m or {}).get("video_room")
    if not room or not pysecrets.compare_digest(room.get("invite_key", ""), payload.k):
        raise HTTPException(status_code=404, detail="This invite link is invalid or has expired.")
    now = int(datetime.now(timezone.utc).timestamp())
    token = await vs.meeting_token(room["name"], payload.name.strip()[:60] or "Guest", False, now + 4 * 3600)
    return {"url": room["url"], "token": token, "title": m.get("title")}


# ============ MEETING NOTES ============
async def _notes(meeting_id: str, user_id: str) -> dict:
    n = await db.meeting_notes.find_one({"meeting_id": meeting_id, "user_id": user_id}, {"_id": 0})
    return n or {"meeting_id": meeting_id, "user_id": user_id, "status": "none", "ai": None,
                 "manual": "", "transcript": ""}


@router.get("/meetings/{meeting_id}/notes")
async def get_notes(meeting_id: str, user=Depends(authmod.get_current_user)):
    await _meeting(meeting_id, user["id"])
    return await _notes(meeting_id, user["id"])


class ManualNotes(BaseModel):
    manual: str


@router.put("/meetings/{meeting_id}/notes")
async def save_manual_notes(meeting_id: str, payload: ManualNotes, user=Depends(authmod.get_current_user)):
    await _meeting(meeting_id, user["id"])
    await db.meeting_notes.update_one(
        {"meeting_id": meeting_id, "user_id": user["id"]},
        {"$set": {"manual": payload.manual[:50000], "manual_updated_at": now_iso()},
         "$setOnInsert": {"status": "none", "ai": None, "transcript": ""}}, upsert=True)
    return await _notes(meeting_id, user["id"])


async def _set_status(meeting_id, user_id, **fields):
    await db.meeting_notes.update_one({"meeting_id": meeting_id, "user_id": user_id},
                                      {"$set": {**fields, "updated_at": now_iso()},
                                       "$setOnInsert": {"manual": ""}}, upsert=True)


async def _finish(meeting: dict, user_id: str, transcript: str, recording_ids=None):
    mid = meeting["id"]
    if not transcript.strip():
        await _set_status(mid, user_id, status="failed", error="The recording had no speech to transcribe.")
        return
    await _set_status(mid, user_id, status="extracting", transcript=transcript)
    ai = await vs.extract_notes(transcript, meeting)
    await _set_status(mid, user_id, status="ready", ai=ai, error=None, recording_ids=recording_ids or [])
    for a in ai.get("action_items", [])[:20]:
        await db.commitments.insert_one({
            "id": new_id(), "user_id": user_id, "contact_id": meeting.get("contact_id"),
            "description": a.get("task", ""), "owner": a.get("owner", ""), "due_date": None,
            "status": "open", "source": f"Call: {meeting.get('title')}", "meeting_id": mid,
            "created_at": now_iso()})


async def _process(meeting: dict, user_id: str):
    mid = meeting["id"]
    room = meeting["video_room"]["name"]
    try:
        recs = []
        for _ in range(60):
            recs = await vs.finished_recordings(room)
            if recs:
                break
            await asyncio.sleep(15)
        if not recs:
            await _set_status(mid, user_id, status="failed",
                              error="No finished recording was found for this call. Recording starts when the host joins.")
            return
        await _set_status(mid, user_id, status="transcribing")
        recs.sort(key=lambda r: r.get("start_ts", 0))
        parts = [await vs.transcribe_recording(r["id"]) for r in recs]
        await _finish(meeting, user_id, "\n\n".join(p for p in parts if p), [r["id"] for r in recs])
    except Exception as e:
        logger.exception(f"Processing recording failed for {mid}: {e}")
        await _set_status(mid, user_id, status="failed", error="Something went wrong while processing the recording. Please retry.")


async def _process_upload(meeting: dict, user_id: str, storage_path: str):
    tmp = tempfile.mkdtemp()
    try:
        src = os.path.join(tmp, "src")
        await storage.download_to(storage_path, src)
        await _finish(meeting, user_id, await vs.transcribe_file(src))
    except Exception as e:
        logger.exception(f"Processing upload failed for {meeting['id']}: {e}")
        await _set_status(meeting["id"], user_id, status="failed",
                          error="We couldn't read that file. Upload an audio or video recording (mp3, m4a, wav, webm, mp4).")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


MAX_AUDIO = 300 * 1024 * 1024
AUDIO_EXT = {"mp3", "m4a", "wav", "webm", "mp4", "mpeg", "mpga", "ogg", "mov"}


@router.post("/meetings/{meeting_id}/notes/upload")
async def upload_recording(meeting_id: str, file: UploadFile = File(...), user=Depends(authmod.get_current_user)):
    m = await _meeting(meeting_id, user["id"])
    n = await _notes(meeting_id, user["id"])
    if n.get("status") in ("waiting", "transcribing", "extracting"):
        raise HTTPException(status_code=409, detail="This meeting's recording is already being processed.")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in AUDIO_EXT:
        raise HTTPException(status_code=400, detail="Upload an audio or video file (mp3, m4a, wav, webm, mp4).")
    buf = bytearray()
    while chunk := await file.read(1024 * 1024):
        buf += chunk
        if len(buf) > MAX_AUDIO:
            raise HTTPException(status_code=413, detail="That file is too large (max 300 MB).")
    try:
        res = await storage.put_object(f"{storage.APP_NAME}/recordings/{user['id']}/{new_id()}.{ext}",
                                       bytes(buf), file.content_type or "application/octet-stream")
    except Exception as e:
        logger.error(f"Recording upload to storage failed: {e}")
        raise HTTPException(status_code=502, detail="Couldn't store the recording. Please try again.")
    await db.files.insert_one({"id": new_id(), "user_id": user["id"], "meeting_id": meeting_id,
                               "storage_path": res["path"], "original_filename": file.filename,
                               "content_type": file.content_type, "size": len(buf), "kind": "recording",
                               "is_deleted": False, "created_at": now_iso()})
    await _set_status(meeting_id, user["id"], status="transcribing", error=None)
    _bg(_process_upload(m, user["id"], res["path"]))
    return await _notes(meeting_id, user["id"])


@router.post("/meetings/{meeting_id}/notes/process")
async def process_recording(meeting_id: str, user=Depends(authmod.get_current_user)):
    m = await _meeting(meeting_id, user["id"])
    if not m.get("video_room"):
        raise HTTPException(status_code=400, detail="This meeting has no video call yet.")
    if not m["video_room"].get("recording"):
        raise HTTPException(status_code=400, detail="Cloud recording isn't enabled for this call. Upload a recording instead.")
    n = await _notes(meeting_id, user["id"])
    if n.get("status") in ("waiting", "transcribing", "extracting"):
        return n
    await _set_status(meeting_id, user["id"], status="waiting", error=None)
    _bg(_process(m, user["id"]))
    return await _notes(meeting_id, user["id"])


@router.get("/meetings/{meeting_id}/notes/pdf")
async def notes_pdf(meeting_id: str, user=Depends(authmod.get_current_user)):
    m = await _meeting(meeting_id, user["id"])
    pdf = render_notes_pdf(m, await _notes(meeting_id, user["id"]))
    safe = "".join(ch for ch in (m.get("title") or "meeting") if ch.isalnum() or ch in " -_").strip()[:60] or "meeting"
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{safe} - notes.pdf"'})
