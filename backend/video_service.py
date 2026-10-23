import os
import json
import logging
import tempfile
import subprocess
import glob
from datetime import datetime, timezone

import httpx
import imageio_ffmpeg
from emergentintegrations.llm.openai import OpenAISpeechToText
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

DAILY_API = "https://api.daily.co/v1"
MAX_UPLOAD = 24 * 1024 * 1024


def _h():
    return {"Authorization": f"Bearer {os.environ['DAILY_API_KEY']}", "Content-Type": "application/json"}


async def daily(method: str, path: str, **kw) -> dict:
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.request(method, DAILY_API + path, headers=_h(), **kw)
    if r.status_code >= 400:
        logger.error(f"Daily {method} {path} failed: {r.status_code} {r.text[:300]}")
        r.raise_for_status()
    return r.json()


_can_record = None


async def create_room(name: str, exp: int) -> tuple[dict, bool]:
    global _can_record
    props = {"exp": exp, "enable_prejoin_ui": True, "enable_chat": True, "enable_screenshare": True}
    if _can_record is not False:
        try:
            room = await daily("POST", "/rooms", json={"name": name, "privacy": "private",
                                                       "properties": {**props, "enable_recording": "cloud-audio-only"}})
            _can_record = True
            return room, True
        except httpx.HTTPStatusError as e:
            if "current plan" not in e.response.text:
                raise
            _can_record = False
    return await daily("POST", "/rooms", json={"name": name, "privacy": "private", "properties": props}), False


async def meeting_token(room: str, user_name: str, owner: bool, exp: int, record: bool = False) -> str:
    props = {"room_name": room, "user_name": user_name, "exp": exp, "is_owner": owner}
    if owner and record:
        props.update({"enable_recording": "cloud-audio-only", "start_cloud_recording": True})
    return (await daily("POST", "/meeting-tokens", json={"properties": props}))["token"]


def transcode_and_split(src: str, tmp: str) -> list[str]:
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    # Mono 32kbps mp3 in 20-minute segments keeps each chunk well under the 25 MB limit
    subprocess.run([ff, "-y", "-loglevel", "error", "-i", src, "-vn", "-ac", "1", "-ar", "16000",
                    "-b:a", "32k", "-f", "segment", "-segment_time", "1200",
                    os.path.join(tmp, "part%03d.mp3")], check=True, timeout=900)
    return [p for p in sorted(glob.glob(os.path.join(tmp, "part*.mp3"))) if 1024 < os.path.getsize(p) <= MAX_UPLOAD]


async def transcribe_file(src: str) -> str:
    stt = OpenAISpeechToText(api_key=os.environ["EMERGENT_LLM_KEY"])
    texts = []
    with tempfile.TemporaryDirectory() as tmp:
        for part in transcode_and_split(src, tmp):
            with open(part, "rb") as f:
                resp = await stt.transcribe(file=f, model="whisper-1", response_format="json")
            texts.append(resp.text)
    return "\n".join(t.strip() for t in texts if t and t.strip())


async def finished_recordings(room: str) -> list[dict]:
    data = await daily("GET", "/recordings", params={"room_name": room, "limit": 20})
    return [r for r in data.get("data", []) if r.get("status") == "finished"]


async def transcribe_recording(recording_id: str) -> str:
    link = await daily("GET", f"/recordings/{recording_id}/access-link", params={"valid_for_secs": 3600})
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "src")
        async with httpx.AsyncClient(timeout=600, follow_redirects=True) as c:
            async with c.stream("GET", link["download_link"]) as r:
                r.raise_for_status()
                with open(src, "wb") as f:
                    async for chunk in r.aiter_bytes():
                        f.write(chunk)
        return await transcribe_file(src)


EXTRACT_PROMPT = """You extract the important details from a business meeting transcript for "BriefCraft AI".
Return ONLY valid JSON with this shape:
{"summary": "3-5 sentence summary",
 "decisions": ["decision made"],
 "action_items": [{"task": "what", "owner": "who or empty", "due": "when or empty"}],
 "key_details": ["numbers, dates, names, requirements, concerns worth remembering"],
 "open_questions": ["unresolved questions"],
 "follow_up": "one-line recommended follow-up"}
Use only what is in the transcript. Never invent owners, dates or numbers. Empty lists are fine."""


async def extract_notes(transcript: str, meeting: dict) -> dict:
    chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"],
                   session_id=f"notes-{datetime.now(timezone.utc).timestamp()}",
                   system_message=EXTRACT_PROMPT).with_model("anthropic", "claude-sonnet-5-5")
    msg = (f"Meeting: {meeting.get('title')}\nObjective: {meeting.get('objective') or 'n/a'}\n"
           f"Attendees: {', '.join(meeting.get('attendees') or [])}\n\nTranscript:\n{transcript[:120000]}")
    raw = str(await chat.send_message(UserMessage(text=msg))).strip()
    start, end = raw.find("{"), raw.rfind("}")
    data = json.loads(raw[start:end + 1])
    for k, d in (("summary", ""), ("decisions", []), ("action_items", []), ("key_details", []),
                 ("open_questions", []), ("follow_up", "")):
        data.setdefault(k, d)
    return data
