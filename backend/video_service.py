
import os
import json
import logging
import tempfile
import subprocess
import glob
from datetime import datetime, timezone

import httpx
import imageio_ffmpeg
from groq import AsyncGroq
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

DAILY_API = "https://api.daily.co/v1"
MAX_UPLOAD = 24 * 1024 * 1024


def _h():
    return {
        "Authorization": f"Bearer {os.environ['DAILY_API_KEY']}",
        "Content-Type": "application/json",
    }


async def daily(method: str, path: str, **kw) -> dict:
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.request(
            method, DAILY_API + path, headers=_h(), **kw
        )

    if r.status_code >= 400:
        logger.error(
            "Daily %s %s failed: %s %s",
            method, path, r.status_code, r.text[:300],
        )
        r.raise_for_status()

    return r.json()


_can_record = None


async def create_room(name: str, exp: int) -> tuple[dict, bool]:
    global _can_record

    props = {
        "exp": exp,
        "enable_prejoin_ui": True,
        "enable_chat": True,
        "enable_screenshare": True,
    }

    if _can_record is not False:
        try:
            room = await daily(
                "POST",
                "/rooms",
                json={
                    "name": name,
                    "privacy": "private",
                    "properties": {
                        **props,
                        "enable_recording": "cloud-audio-only",
                    },
                },
            )
            _can_record = True
            return room, True

        except httpx.HTTPStatusError as e:
            if "current plan" not in e.response.text:
                raise
            _can_record = False

    room = await daily(
        "POST",
        "/rooms",
        json={
            "name": name,
            "privacy": "private",
            "properties": props,
        },
    )
    return room, False


async def meeting_token(
    room: str,
    user_name: str,
    owner: bool,
    exp: int,
    record: bool = False,
) -> str:
    props = {
        "room_name": room,
        "user_name": user_name,
        "exp": exp,
        "is_owner": owner,
    }

    if owner and record:
        props.update({
            "enable_recording": "cloud-audio-only",
            "start_cloud_recording": True,
        })

    result = await daily(
        "POST", "/meeting-tokens", json={"properties": props}
    )
    return result["token"]


def transcode_and_split(src: str, tmp: str) -> list[str]:
    ff = imageio_ffmpeg.get_ffmpeg_exe()

    subprocess.run(
        [
            ff, "-y", "-loglevel", "error",
            "-i", src,
            "-vn", "-ac", "1", "-ar", "16000",
            "-b:a", "32k",
            "-f", "segment",
            "-segment_time", "1200",
            os.path.join(tmp, "part%03d.mp3"),
        ],
        check=True,
        timeout=900,
    )

    return [
        p for p in sorted(glob.glob(os.path.join(tmp, "part*.mp3")))
        if 1024 < os.path.getsize(p) <= MAX_UPLOAD
    ]


async def transcribe_file(src: str) -> str:
    client = AsyncOpenAI(
        api_key=os.environ["OPENAI_API_KEY"]
    )

    texts = []

    try:
        with tempfile.TemporaryDirectory() as tmp:
            for part in transcode_and_split(src, tmp):
                with open(part, "rb") as f:
                    resp = await client.audio.transcriptions.create(
                        file=f,
                        model="whisper-1",
                        response_format="json",
                    )
                texts.append(resp.text)
    finally:
        await client.close()

    return "\n".join(
        t.strip() for t in texts if t and t.strip()
    )


async def finished_recordings(room: str) -> list[dict]:
    data = await daily(
        "GET",
        "/recordings",
        params={"room_name": room, "limit": 20},
    )

    return [
        r for r in data.get("data", [])
        if r.get("status") == "finished"
    ]


async def transcribe_recording(recording_id: str) -> str:
    link = await daily(
        "GET",
        f"/recordings/{recording_id}/access-link",
        params={"valid_for_secs": 3600},
    )

    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "src")

        async with httpx.AsyncClient(
            timeout=600, follow_redirects=True
        ) as c:
            async with c.stream(
                "GET", link["download_link"]
            ) as r:
                r.raise_for_status()

                with open(src, "wb") as f:
                    async for chunk in r.aiter_bytes():
                        f.write(chunk)

        return await transcribe_file(src)


EXTRACT_PROMPT = """You extract the important details from a business meeting transcript for "PreMeet".
Return ONLY valid JSON with this shape:
{"summary": "3-5 sentence summary",
 "decisions": ["decision made"],
 "action_items": [{"task": "what", "owner": "who or empty", "due": "when or empty"}],
 "key_details": ["numbers, dates, names, requirements, concerns worth remembering"],
 "open_questions": ["unresolved questions"],
 "follow_up": "one-line recommended follow-up"}
Use only what is in the transcript. Never invent owners, dates or numbers. Empty lists are fine."""


async def extract_notes(transcript: str, meeting: dict) -> dict:
    api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY environment variable is missing"
        )

    client = AsyncGroq(api_key=api_key)

    msg = (
        f"Meeting: {meeting.get('title')}\n"
        f"Objective: {meeting.get('objective') or 'n/a'}\n"
        f"Attendees: {', '.join(meeting.get('attendees') or [])}"
        f"\n\nTranscript:\n{transcript[:120000]}"
    )

    try:
        response = await client.chat.completions.create(
            model=os.environ.get(
                "GROQ_MODEL",
                "llama-3.3-70b-versatile",
            ),
            messages=[
                {
                    "role": "system",
                    "content": EXTRACT_PROMPT,
                },
                {
                    "role": "user",
                    "content": msg,
                },
            ],
            temperature=0.2,
            max_tokens=4096,
            response_format={"type": "json_object"},
        )
    except Exception:
        logger.exception("Groq meeting note extraction failed")
        raise
    finally:
        await client.close()

    raw = (
        response.choices[0].message.content or ""
    ).strip()

    start, end = raw.find("{"), raw.rfind("}")

    if start == -1 or end == -1 or end < start:
        raise ValueError(
            "Groq returned no valid JSON object"
        )

    try:
        data = json.loads(raw[start:end + 1])
    except json.JSONDecodeError as e:
        logger.error(
            "Meeting note JSON parse failed: %s; raw: %s",
            e, raw[:500],
        )
        raise ValueError(
            "AI returned invalid meeting notes JSON"
        ) from e

    if not isinstance(data, dict):
        raise ValueError("Meeting notes must be a JSON object")

    for key, default in (
        ("summary", ""),
        ("decisions", []),
        ("action_items", []),
        ("key_details", []),
        ("open_questions", []),
        ("follow_up", ""),
    ):
        if key not in data or data[key] is None:
            data[key] = default

    return data
