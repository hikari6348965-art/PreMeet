import os
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from bson import ObjectId
import secrets as pysecrets

from database import db, client
from models import (
    new_id, now_iso, RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput,
    OnboardingInput, PreferencesInput, ContactInput, CompanyInput, MeetingInput, MeetingUpdate,
    NoteInput, CommitmentInput, CommitmentUpdate, GenerateBriefInput, BriefEditInput,
    RegenerateSectionInput, FeedbackInput, IntegrationConnectInput, SubscribeInput,
    VerifyPaymentInput, PlanUpdateInput,
)
import auth as authmod
import brief_service
import billing
import seed
import email_service
import asyncio

_bg_tasks = set()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="BriefCraft AI")
api = APIRouter(prefix="/api")


def current_period() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


async def audit(user_id: str, action: str, detail: str = ""):
    await db.audit_events.insert_one({
        "id": new_id(), "user_id": user_id, "action": action,
        "detail": detail, "created_at": now_iso(),
    })


async def get_usage(user_id: str) -> dict:
    period = current_period()
    rec = await db.usage_records.find_one({"user_id": user_id, "period": period})
    if not rec:
        rec = {"id": new_id(), "user_id": user_id, "period": period,
               "briefs_generated": 0, "failed_generations": 0, "updated_at": now_iso()}
        await db.usage_records.insert_one(dict(rec))
    rec.pop("_id", None)
    return rec


async def get_plan_for_user(user_id: str) -> dict:
    sub = await db.subscriptions.find_one({"user_id": user_id})
    if not sub:
        await seed.ensure_user_subscription(user_id)
        sub = await db.subscriptions.find_one({"user_id": user_id})
    if sub["plan_id"] != "free" and sub.get("current_period_end") and sub["current_period_end"] < now_iso():
        await db.subscriptions.update_one({"user_id": user_id}, {"$set": {"plan_id": "free", "status": "expired"}})
        sub = await db.subscriptions.find_one({"user_id": user_id})
    plan = await db.plans.find_one({"id": sub["plan_id"]}, {"_id": 0})
    sub.pop("_id", None)
    return {"plan": plan, "subscription": sub}


def clean(doc: dict) -> dict:
    if doc:
        doc.pop("_id", None)
    return doc


# ============ AUTH ============
@api.post("/auth/register")
async def register(payload: RegisterInput, request: Request, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user_doc = {
        "email": email,
        "password_hash": authmod.hash_password(payload.password),
        "name": payload.name,
        "role": "user",
        "profession": None,
        "onboarded": False,
        "created_at": now_iso(),
    }
    result = await db.users.insert_one(user_doc)
    uid = str(result.inserted_id)
    await seed.ensure_user_subscription(uid)
    await seed.ensure_integration_rows(uid)
    await seed.ensure_preferences(uid)
    access = authmod.create_access_token(uid, email)
    refresh = authmod.create_refresh_token(uid)
    authmod.set_auth_cookies(response, access, refresh)
    await audit(uid, "register", email)
    return {"id": uid, "email": email, "name": payload.name, "role": "user",
            "onboarded": False, "token": access}


@api.post("/auth/login")
async def login(payload: LoginInput, request: Request, response: Response):
    email = payload.email.lower()
    fwd = request.headers.get("x-forwarded-for", "")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown")
    await authmod.check_brute_force(ip, email)
    user = await db.users.find_one({"email": email})
    if not user or not authmod.verify_password(payload.password, user["password_hash"]):
        await authmod.record_failed_attempt(ip, email)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await authmod.clear_attempts(ip, email)
    uid = str(user["_id"])
    access = authmod.create_access_token(uid, email)
    refresh = authmod.create_refresh_token(uid)
    authmod.set_auth_cookies(response, access, refresh)
    await audit(uid, "login", email)
    return {"id": uid, "email": email, "name": user.get("name"), "role": user.get("role", "user"),
            "onboarded": user.get("onboarded", False), "profession": user.get("profession"),
            "token": access}


@api.post("/auth/logout")
async def logout(response: Response, user=Depends(authmod.get_current_user)):
    authmod.clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(authmod.get_current_user)):
    return user


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    import jwt
    try:
        payload = jwt.decode(token, authmod.get_jwt_secret(), algorithms=[authmod.JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = authmod.create_access_token(str(user["_id"]), user["email"])
        response.set_cookie("access_token", access, httponly=True, secure=True,
                            samesite="none", max_age=604800, path="/")
        return {"token": access}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordInput):
    user = await db.users.find_one({"email": payload.email.lower()})
    if user:
        token = pysecrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": str(user["_id"]),
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "used": False,
        })
        logger.info(f"Password reset link: {os.environ.get('FRONTEND_URL')}/reset-password?token={token}")
    return {"ok": True, "message": "If the email exists, a reset link has been sent."}


@api.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordInput):
    rec = await db.password_reset_tokens.find_one({"token": payload.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or used reset token")
    expires = rec["expires_at"]
    if isinstance(expires, str):
        expires = datetime.fromisoformat(expires)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token expired")
    await db.users.update_one({"_id": ObjectId(rec["user_id"])},
                              {"$set": {"password_hash": authmod.hash_password(payload.password)}})
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True}


# ============ ONBOARDING ============
@api.post("/onboarding")
async def complete_onboarding(payload: OnboardingInput, user=Depends(authmod.get_current_user)):
    uid = user["id"]
    await db.users.update_one({"_id": ObjectId(uid)},
                              {"$set": {"onboarded": True, "profession": payload.profession}})
    await db.preferences.update_one(
        {"user_id": uid},
        {"$set": {"profession": payload.profession, "default_template": payload.profession,
                  "tone": payload.tone, "detail_level": payload.detail_level,
                  "default_objective": payload.default_objective, "updated_at": now_iso()}},
        upsert=True,
    )
    if payload.load_demo_data:
        await seed.seed_demo_data(uid)
    await audit(uid, "onboarding_complete", payload.profession)
    return {"ok": True}


# ============ PREFERENCES ============
@api.get("/preferences")
async def get_preferences(user=Depends(authmod.get_current_user)):
    pref = await db.preferences.find_one({"user_id": user["id"]}, {"_id": 0})
    if not pref:
        await seed.ensure_preferences(user["id"])
        pref = await db.preferences.find_one({"user_id": user["id"]}, {"_id": 0})
    return pref


@api.put("/preferences")
async def update_preferences(payload: PreferencesInput, user=Depends(authmod.get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()
    await db.preferences.update_one({"user_id": user["id"]}, {"$set": updates}, upsert=True)
    pref = await db.preferences.find_one({"user_id": user["id"]}, {"_id": 0})
    return pref


# ============ DASHBOARD ============
@api.get("/dashboard")
async def dashboard(user=Depends(authmod.get_current_user)):
    uid = user["id"]
    now = datetime.now(timezone.utc).isoformat()
    meetings = await db.meetings.find({"user_id": uid}).sort("start_time", 1).to_list(200)
    upcoming = [clean(m) for m in meetings if m.get("start_time", "") >= now][:10]
    recent_briefs = await db.briefs.find({"user_id": uid}).sort("generated_at", -1).limit(5).to_list(5)
    commitments = await db.commitments.find({"user_id": uid, "status": {"$in": ["open", "overdue"]}}).to_list(50)
    integrations = await db.integrations.find({"user_id": uid}).to_list(50)
    usage = await get_usage(uid)
    plan_info = await get_plan_for_user(uid)
    return {
        "upcoming_meetings": upcoming,
        "recent_briefs": [clean(b) for b in recent_briefs],
        "commitments": [clean(c) for c in commitments],
        "integrations": [clean(i) for i in integrations],
        "usage": usage,
        "plan": plan_info["plan"],
        "subscription": plan_info["subscription"],
        "stats": {
            "upcoming_count": len(upcoming),
            "briefs_ready": len([m for m in meetings if m.get("status") == "ready"]),
            "open_commitments": len(commitments),
        },
    }


# ============ MEETINGS ============
@api.get("/meetings")
async def list_meetings(user=Depends(authmod.get_current_user)):
    meetings = await db.meetings.find({"user_id": user["id"]}).sort("start_time", 1).to_list(500)
    return [clean(m) for m in meetings]


@api.post("/meetings")
async def create_meeting(payload: MeetingInput, user=Depends(authmod.get_current_user)):
    doc = payload.model_dump()
    doc.update({"id": new_id(), "user_id": user["id"], "status": "scheduled",
                "brief_id": None, "source": "manual", "is_demo": False, "created_at": now_iso()})
    await db.meetings.insert_one(dict(doc))
    return clean(doc)


@api.get("/meetings/{meeting_id}")
async def get_meeting(meeting_id: str, user=Depends(authmod.get_current_user)):
    m = await db.meetings.find_one({"id": meeting_id, "user_id": user["id"]})
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    m = clean(m)
    contact = None
    if m.get("contact_id"):
        contact = clean(await db.contacts.find_one({"id": m["contact_id"], "user_id": user["id"]}) or {})
    notes = await db.notes.find({"user_id": user["id"], "contact_id": m.get("contact_id")}).to_list(50) if m.get("contact_id") else []
    commitments = await db.commitments.find({"user_id": user["id"], "contact_id": m.get("contact_id")}).to_list(50) if m.get("contact_id") else []
    brief = None
    if m.get("brief_id"):
        brief = clean(await db.briefs.find_one({"id": m["brief_id"]}) or {})
    return {"meeting": m, "contact": contact, "notes": [clean(n) for n in notes],
            "commitments": [clean(c) for c in commitments], "brief": brief}


@api.patch("/meetings/{meeting_id}")
async def update_meeting(meeting_id: str, payload: MeetingUpdate, user=Depends(authmod.get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    res = await db.meetings.update_one({"id": meeting_id, "user_id": user["id"]}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return clean(await db.meetings.find_one({"id": meeting_id}))


@api.delete("/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str, user=Depends(authmod.get_current_user)):
    await db.meetings.delete_one({"id": meeting_id, "user_id": user["id"]})
    return {"ok": True}


# ============ CONTACTS / COMPANIES ============
@api.get("/contacts")
async def list_contacts(user=Depends(authmod.get_current_user)):
    contacts = await db.contacts.find({"user_id": user["id"]}).sort("name", 1).to_list(500)
    return [clean(c) for c in contacts]


@api.post("/contacts")
async def create_contact(payload: ContactInput, user=Depends(authmod.get_current_user)):
    doc = payload.model_dump()
    doc.update({"id": new_id(), "user_id": user["id"], "company_id": None,
                "is_demo": False, "created_at": now_iso()})
    await db.contacts.insert_one(dict(doc))
    return clean(doc)


@api.get("/contacts/{contact_id}")
async def get_contact(contact_id: str, user=Depends(authmod.get_current_user)):
    c = await db.contacts.find_one({"id": contact_id, "user_id": user["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    notes = await db.notes.find({"user_id": user["id"], "contact_id": contact_id}).sort("created_at", -1).to_list(100)
    commitments = await db.commitments.find({"user_id": user["id"], "contact_id": contact_id}).to_list(100)
    meetings = await db.meetings.find({"user_id": user["id"], "contact_id": contact_id}).sort("start_time", -1).to_list(100)
    return {"contact": clean(c), "notes": [clean(n) for n in notes],
            "commitments": [clean(x) for x in commitments], "meetings": [clean(m) for m in meetings]}


@api.patch("/contacts/{contact_id}")
async def update_contact(contact_id: str, payload: ContactInput, user=Depends(authmod.get_current_user)):
    updates = payload.model_dump()
    res = await db.contacts.update_one({"id": contact_id, "user_id": user["id"]}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return clean(await db.contacts.find_one({"id": contact_id, "user_id": user["id"]}))


@api.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, user=Depends(authmod.get_current_user)):
    await db.contacts.delete_one({"id": contact_id, "user_id": user["id"]})
    return {"ok": True}


@api.get("/companies")
async def list_companies(user=Depends(authmod.get_current_user)):
    companies = await db.companies.find({"user_id": user["id"]}).sort("name", 1).to_list(500)
    return [clean(c) for c in companies]


# ============ NOTES ============
@api.get("/notes")
async def list_notes(user=Depends(authmod.get_current_user)):
    notes = await db.notes.find({"user_id": user["id"]}).sort("created_at", -1).to_list(500)
    return [clean(n) for n in notes]


@api.post("/notes")
async def create_note(payload: NoteInput, user=Depends(authmod.get_current_user)):
    doc = payload.model_dump()
    doc.update({"id": new_id(), "user_id": user["id"], "is_demo": False, "created_at": now_iso()})
    await db.notes.insert_one(dict(doc))
    return clean(doc)


@api.post("/notes/upload")
async def upload_note(file: UploadFile = File(...), contact_id: str = None,
                      user=Depends(authmod.get_current_user)):
    allowed = (".txt", ".md", ".csv")
    if not file.filename.lower().endswith(allowed):
        raise HTTPException(status_code=400, detail="Only .txt, .md, .csv files are supported")
    content = (await file.read())[:200000].decode("utf-8", errors="ignore")
    doc = {"id": new_id(), "user_id": user["id"], "title": file.filename,
           "content": content, "contact_id": contact_id, "meeting_id": None,
           "source_type": "upload", "is_demo": False, "created_at": now_iso()}
    await db.notes.insert_one(dict(doc))
    return clean(doc)


@api.delete("/notes/{note_id}")
async def delete_note(note_id: str, user=Depends(authmod.get_current_user)):
    await db.notes.delete_one({"id": note_id, "user_id": user["id"]})
    return {"ok": True}


# ============ COMMITMENTS ============
@api.get("/commitments")
async def list_commitments(user=Depends(authmod.get_current_user)):
    commitments = await db.commitments.find({"user_id": user["id"]}).to_list(500)
    return [clean(c) for c in commitments]


@api.post("/commitments")
async def create_commitment(payload: CommitmentInput, user=Depends(authmod.get_current_user)):
    doc = payload.model_dump()
    doc.update({"id": new_id(), "user_id": user["id"], "source_note_id": None,
                "is_demo": False, "created_at": now_iso()})
    await db.commitments.insert_one(dict(doc))
    return clean(doc)


@api.patch("/commitments/{commitment_id}")
async def update_commitment(commitment_id: str, payload: CommitmentUpdate, user=Depends(authmod.get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    res = await db.commitments.update_one({"id": commitment_id, "user_id": user["id"]}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Commitment not found")
    return clean(await db.commitments.find_one({"id": commitment_id}))


# ============ BRIEFS ============
@api.post("/briefs/generate")
async def generate_brief_endpoint(payload: GenerateBriefInput, user=Depends(authmod.get_current_user)):
    uid = user["id"]
    meeting = await db.meetings.find_one({"id": payload.meeting_id, "user_id": uid})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Server-side usage enforcement
    usage = await get_usage(uid)
    plan_info = await get_plan_for_user(uid)
    allowance = plan_info["plan"]["brief_allowance"]
    if usage["briefs_generated"] >= allowance:
        raise HTTPException(status_code=402, detail={
            "error": "quota_exceeded",
            "message": f"You've used all {allowance} briefs on your {plan_info['plan']['name']} plan. Upgrade to generate more.",
        })

    await db.meetings.update_one({"id": payload.meeting_id}, {"$set": {"status": "preparing"}})

    contact = await db.contacts.find_one({"id": meeting.get("contact_id"), "user_id": uid}) if meeting.get("contact_id") else None
    company = None
    if contact and contact.get("company_id"):
        company = await db.companies.find_one({"id": contact["company_id"], "user_id": uid})
    notes = await db.notes.find({"user_id": uid, "contact_id": meeting.get("contact_id")}).to_list(50) if meeting.get("contact_id") else []
    commitments = await db.commitments.find({"user_id": uid, "contact_id": meeting.get("contact_id")}).to_list(50) if meeting.get("contact_id") else []

    pref = await db.preferences.find_one({"user_id": uid}) or {}
    template = payload.template or pref.get("default_template", "consultant")
    context = brief_service.build_context(clean(meeting), clean(contact) if contact else None,
                                          clean(company) if company else None,
                                          [clean(n) for n in notes], [clean(c) for c in commitments])
    try:
        content = await brief_service.generate_brief(
            context, pref.get("tone", "professional"),
            pref.get("detail_level", "balanced"), template)
    except Exception as e:
        logger.error(f"Brief generation failed: {e}")
        await db.meetings.update_one({"id": payload.meeting_id}, {"$set": {"status": "failed"}})
        await db.usage_records.update_one({"user_id": uid, "period": current_period()},
                                          {"$inc": {"failed_generations": 1}, "$set": {"updated_at": now_iso()}})
        raise HTTPException(status_code=500, detail="Brief generation failed. Please retry.")

    brief_doc = {
        "id": new_id(), "user_id": uid, "meeting_id": payload.meeting_id,
        "meeting_title": meeting.get("title"), "template": template,
        "content": content, "status": "ready", "edited": False,
        "feedback": [], "generated_at": now_iso(),
    }
    await db.briefs.insert_one(dict(brief_doc))
    await db.meetings.update_one({"id": payload.meeting_id},
                                 {"$set": {"status": "ready", "brief_id": brief_doc["id"]}})
    # Count usage only on success
    await db.usage_records.update_one({"user_id": uid, "period": current_period()},
                                      {"$inc": {"briefs_generated": 1}, "$set": {"updated_at": now_iso()}})
    await audit(uid, "brief_generated", meeting.get("title"))
    if pref.get("email_notifications", True):
        brief_doc["email_status"] = "sending"
        await db.briefs.update_one({"id": brief_doc["id"]}, {"$set": {"email_status": "sending"}})
        task = asyncio.create_task(email_service.send_brief_ready(user, clean(meeting), dict(brief_doc)))
        _bg_tasks.add(task)
        task.add_done_callback(_bg_tasks.discard)
    return clean(brief_doc)


@api.post("/briefs/{brief_id}/email")
async def email_brief(brief_id: str, user=Depends(authmod.get_current_user)):
    b = await db.briefs.find_one({"id": brief_id, "user_id": user["id"]}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Brief not found")
    if b.get("emailed_at") and b["emailed_at"] > (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat():
        raise HTTPException(status_code=429, detail="Please wait a minute before sending again.")
    meeting = await db.meetings.find_one({"id": b["meeting_id"], "user_id": user["id"]}, {"_id": 0})
    await email_service.send_brief_ready(user, meeting, b)
    status = (await db.briefs.find_one({"id": brief_id}, {"email_status": 1}))["email_status"]
    if status != "sent":
        raise HTTPException(status_code=503, detail="Email is temporarily unavailable. Please try again later.")
    return {"ok": True, "email_status": status}


@api.get("/briefs")
async def list_briefs(user=Depends(authmod.get_current_user)):
    briefs = await db.briefs.find({"user_id": user["id"]}).sort("generated_at", -1).to_list(500)
    return [clean(b) for b in briefs]


@api.get("/briefs/{brief_id}")
async def get_brief(brief_id: str, user=Depends(authmod.get_current_user)):
    b = await db.briefs.find_one({"id": brief_id, "user_id": user["id"]})
    if not b:
        raise HTTPException(status_code=404, detail="Brief not found")
    return clean(b)


@api.patch("/briefs/{brief_id}")
async def edit_brief(brief_id: str, payload: BriefEditInput, user=Depends(authmod.get_current_user)):
    res = await db.briefs.update_one({"id": brief_id, "user_id": user["id"]},
                                     {"$set": {"content": payload.content, "edited": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Brief not found")
    return clean(await db.briefs.find_one({"id": brief_id}))


@api.post("/briefs/{brief_id}/regenerate-section")
async def regenerate_section(brief_id: str, payload: RegenerateSectionInput, user=Depends(authmod.get_current_user)):
    b = await db.briefs.find_one({"id": brief_id, "user_id": user["id"]})
    if not b:
        raise HTTPException(status_code=404, detail="Brief not found")
    meeting = await db.meetings.find_one({"id": b["meeting_id"], "user_id": user["id"]})
    contact = await db.contacts.find_one({"id": meeting.get("contact_id"), "user_id": user["id"]}) if meeting and meeting.get("contact_id") else None
    notes = await db.notes.find({"user_id": user["id"], "contact_id": meeting.get("contact_id")}).to_list(50) if meeting and meeting.get("contact_id") else []
    commitments = await db.commitments.find({"user_id": user["id"], "contact_id": meeting.get("contact_id")}).to_list(50) if meeting and meeting.get("contact_id") else []
    pref = await db.preferences.find_one({"user_id": user["id"]}) or {}
    context = brief_service.build_context(clean(meeting), clean(contact) if contact else None, None,
                                          [clean(n) for n in notes], [clean(c) for c in commitments])
    try:
        fresh = await brief_service.generate_brief(context, pref.get("tone", "professional"),
                                                   pref.get("detail_level", "balanced"),
                                                   b.get("template", "consultant"))
    except Exception:
        raise HTTPException(status_code=500, detail="Regeneration failed. Please retry.")
    section = payload.section
    content = b["content"]
    if section in fresh:
        content[section] = fresh[section]
    await db.briefs.update_one({"id": brief_id}, {"$set": {"content": content, "edited": True}})
    return clean(await db.briefs.find_one({"id": brief_id}))


@api.post("/briefs/feedback")
async def brief_feedback(payload: FeedbackInput, user=Depends(authmod.get_current_user)):
    fb = {"type": payload.type, "section": payload.section, "created_at": now_iso()}
    await db.briefs.update_one({"id": payload.brief_id, "user_id": user["id"]},
                               {"$push": {"feedback": fb}})
    await db.feedback.insert_one({"id": new_id(), "user_id": user["id"],
                                  "brief_id": payload.brief_id, **fb})
    return {"ok": True}


@api.delete("/briefs/{brief_id}")
async def delete_brief(brief_id: str, user=Depends(authmod.get_current_user)):
    b = await db.briefs.find_one({"id": brief_id, "user_id": user["id"]})
    if b:
        await db.meetings.update_one({"id": b["meeting_id"]},
                                     {"$set": {"status": "scheduled", "brief_id": None}})
    await db.briefs.delete_one({"id": brief_id, "user_id": user["id"]})
    return {"ok": True}


# ============ INTEGRATIONS ============
@api.get("/integrations")
async def list_integrations(user=Depends(authmod.get_current_user)):
    await seed.ensure_integration_rows(user["id"])
    rows = await db.integrations.find({"user_id": user["id"]}).to_list(50)
    return [clean(r) for r in rows]


@api.post("/integrations/{provider}/connect")
async def connect_integration(provider: str, user=Depends(authmod.get_current_user)):
    row = await db.integrations.find_one({"user_id": user["id"], "provider": provider})
    if not row:
        raise HTTPException(status_code=404, detail="Unknown integration")
    # Honest status: OAuth-based providers are NOT configured yet in this MVP.
    if row.get("requires_oauth"):
        return {"ok": False, "status": "setup_required", "provider": provider,
                "message": f"{row['name']} uses the official OAuth flow. Connect this integration once OAuth credentials are configured. No fabricated data is shown until a real connection is established."}
    await db.integrations.update_one(
        {"user_id": user["id"], "provider": provider},
        {"$set": {"status": "connected", "connected_at": now_iso()}})
    return {"ok": True, "status": "connected", "provider": provider}


@api.post("/integrations/{provider}/disconnect")
async def disconnect_integration(provider: str, user=Depends(authmod.get_current_user)):
    await db.integrations.update_one(
        {"user_id": user["id"], "provider": provider},
        {"$set": {"status": "not_connected", "connected_at": None, "error": None}})
    return {"ok": True}


# ============ USAGE ============
@api.get("/usage")
async def usage_endpoint(user=Depends(authmod.get_current_user)):
    uid = user["id"]
    usage = await get_usage(uid)
    plan_info = await get_plan_for_user(uid)
    history = await db.briefs.find({"user_id": uid}).sort("generated_at", -1).limit(50).to_list(50)
    return {"usage": usage, "plan": plan_info["plan"], "subscription": plan_info["subscription"],
            "history": [clean(b) for b in history]}


# ============ PLANS & BILLING ============
@api.get("/plans")
async def get_plans():
    plans = await db.plans.find({}, {"_id": 0}).sort("order", 1).to_list(20)
    for p in plans:
        p["price_inr"] = billing.usd_to_inr(p["price_monthly"])
    return plans


@api.get("/subscription")
async def get_subscription(user=Depends(authmod.get_current_user)):
    info = await get_plan_for_user(user["id"])
    return {**info, "razorpay_configured": billing.is_configured()}


@api.post("/billing/subscribe")
async def subscribe(payload: SubscribeInput, user=Depends(authmod.get_current_user)):
    plan = await db.plans.find_one({"id": payload.plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if plan["price_monthly"] == 0:
        await _activate_plan(user["id"], payload.plan_id, provider="none")
        return {"ok": True, "mode": "free", "plan_id": payload.plan_id}

    if not billing.is_configured():
        # Clearly-labeled TEST MODE: no real charge. Activates plan for demonstration.
        await _activate_plan(user["id"], payload.plan_id, provider="test_mode")
        return {"ok": True, "mode": "test_mode",
                "message": "Payments are not configured yet. Plan activated in TEST MODE (no real charge).",
                "plan_id": payload.plan_id}

    amount_inr = billing.usd_to_inr(plan["price_monthly"])
    try:
        order = billing.create_order(amount_inr, f"sub_{user['id'][:8]}_{payload.plan_id}")
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=502, detail="Couldn't start the payment. Please try again.")
    await db.payment_orders.insert_one({
        "id": new_id(), "order_id": order["id"], "user_id": user["id"], "plan_id": payload.plan_id,
        "plan_name": plan["name"], "amount_inr": amount_inr, "price_usd": plan["price_monthly"],
        "status": "created", "created_at": now_iso(),
    })
    return {"ok": True, "mode": "razorpay", "order": order,
            "key_id": os.environ.get("RAZORPAY_KEY_ID"), "amount": order["amount"],
            "plan_id": payload.plan_id, "user_name": user.get("name"), "user_email": user.get("email")}


@api.post("/billing/verify")
async def verify_payment(payload: VerifyPaymentInput, user=Depends(authmod.get_current_user)):
    order = await db.payment_orders.find_one({"order_id": payload.razorpay_order_id, "user_id": user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not billing.verify_payment_signature(payload.razorpay_order_id,
                                            payload.razorpay_payment_id, payload.razorpay_signature):
        await db.payment_orders.update_one({"order_id": payload.razorpay_order_id, "status": "created"},
                                           {"$set": {"status": "failed"}})
        raise HTTPException(status_code=400, detail="Payment verification failed")
    await _mark_order_paid(order, payload.razorpay_payment_id)
    return {"ok": True, "plan_id": order["plan_id"]}


async def _mark_order_paid(order: dict, payment_id: str):
    res = await db.payment_orders.update_one(
        {"order_id": order["order_id"], "status": {"$ne": "paid"}},
        {"$set": {"status": "paid", "payment_id": payment_id, "paid_at": now_iso()}})
    if res.modified_count:
        await _activate_plan(order["user_id"], order["plan_id"], provider="razorpay",
                             order_id=order["order_id"], payment_id=payment_id)


@api.get("/billing/payments")
async def list_payments(user=Depends(authmod.get_current_user)):
    rows = await db.payment_orders.find({"user_id": user["id"], "status": {"$in": ["paid", "failed"]}},
                                        {"_id": 0}).sort("created_at", -1).to_list(50)
    return rows


@api.post("/billing/cancel")
async def cancel_subscription(user=Depends(authmod.get_current_user)):
    await db.subscriptions.update_one({"user_id": user["id"]},
                                      {"$set": {"status": "cancelled"}})
    await audit(user["id"], "subscription_cancelled", "")
    return {"ok": True}


async def _activate_plan(user_id: str, plan_id: str, provider: str,
                         order_id: str = None, payment_id: str = None):
    now = datetime.now(timezone.utc)
    await db.subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {"plan_id": plan_id, "status": "active", "provider": provider,
                  "started_at": now.isoformat(),
                  "current_period_end": (now + timedelta(days=30)).isoformat(),
                  "razorpay_order_id": order_id, "razorpay_payment_id": payment_id}},
        upsert=True,
    )
    await audit(user_id, "plan_activated", f"{plan_id} via {provider}")


@app.post("/api/billing/webhook")
async def razorpay_webhook(request: Request):
    body = (await request.body()).decode()
    signature = request.headers.get("X-Razorpay-Signature", "")
    if not billing.verify_webhook(body, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    import json
    event = json.loads(body)
    logger.info(f"Razorpay webhook: {event.get('event')}")
    if event.get("event") in ("payment.captured", "order.paid"):
        pay = event.get("payload", {}).get("payment", {}).get("entity", {})
        order = await db.payment_orders.find_one({"order_id": pay.get("order_id")})
        if order and pay.get("amount") == int(round(order["amount_inr"] * 100)):
            await _mark_order_paid(order, pay.get("id"))
    return {"status": "processed"}


# ============ ADMIN ============
@api.get("/admin/stats")
async def admin_stats(user=Depends(authmod.get_current_admin)):
    total_users = await db.users.count_documents({})
    total_briefs = await db.briefs.count_documents({})
    active_subs = await db.subscriptions.count_documents({"status": "active"})
    failed = await db.usage_records.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$failed_generations"}}}
    ]).to_list(1)
    return {
        "total_users": total_users,
        "total_briefs": total_briefs,
        "active_subscriptions": active_subs,
        "failed_generations": failed[0]["total"] if failed else 0,
        "razorpay_configured": billing.is_configured(),
    }


@api.get("/admin/users")
async def admin_users(user=Depends(authmod.get_current_admin)):
    users = await db.users.find({}, {"password_hash": 0}).to_list(500)
    result = []
    for u in users:
        uid = str(u["_id"])
        sub = await db.subscriptions.find_one({"user_id": uid}, {"_id": 0})
        usage = await db.usage_records.find_one({"user_id": uid, "period": current_period()}, {"_id": 0})
        result.append({"id": uid, "email": u["email"], "name": u.get("name"),
                       "role": u.get("role"), "profession": u.get("profession"),
                       "onboarded": u.get("onboarded"), "created_at": u.get("created_at"),
                       "plan_id": sub.get("plan_id") if sub else None,
                       "briefs_this_month": usage.get("briefs_generated", 0) if usage else 0})
    return result


@api.get("/admin/plans")
async def admin_plans(user=Depends(authmod.get_current_admin)):
    return await db.plans.find({}, {"_id": 0}).sort("order", 1).to_list(20)


@api.put("/admin/plans/{plan_id}")
async def admin_update_plan(plan_id: str, payload: PlanUpdateInput, user=Depends(authmod.get_current_admin)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    res = await db.plans.update_one({"id": plan_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    await audit(user["id"], "plan_updated", plan_id)
    return await db.plans.find_one({"id": plan_id}, {"_id": 0})


@api.get("/admin/failed-jobs")
async def admin_failed_jobs(user=Depends(authmod.get_current_admin)):
    failed_meetings = await db.meetings.find({"status": "failed"}).to_list(100)
    return [clean(m) for m in failed_meetings]


@api.get("/admin/audit")
async def admin_audit(user=Depends(authmod.get_current_admin)):
    events = await db.audit_events.find({}).sort("created_at", -1).limit(100).to_list(100)
    return [clean(e) for e in events]


@api.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000"), "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.meetings.create_index([("user_id", 1), ("start_time", 1)])
    await db.briefs.create_index([("user_id", 1), ("generated_at", -1)])
    await db.usage_records.create_index([("user_id", 1), ("period", 1)], unique=True)
    await seed.ensure_plans()
    # Seed admin
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        res = await db.users.insert_one({
            "email": admin_email, "password_hash": authmod.hash_password(admin_password),
            "name": "Admin", "role": "admin", "profession": "consultant",
            "onboarded": True, "created_at": now_iso(),
        })
        uid = str(res.inserted_id)
        await seed.ensure_user_subscription(uid)
        await seed.ensure_integration_rows(uid)
        await seed.ensure_preferences(uid)
    elif not authmod.verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": authmod.hash_password(admin_password)}})
    logger.info("BriefCraft AI backend started.")


@app.on_event("shutdown")
async def shutdown():
    client.close()
