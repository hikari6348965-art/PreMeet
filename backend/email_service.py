import os
import re
import ipaddress
import logging
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx

from database import db
from models import now_iso

logger = logging.getLogger(__name__)

EMAIL_BASE_URL = "https://integrations.emergentagent.com"

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


class EmailUnavailable(Exception):
    pass


async def send_email(*, to: str, subject: str, html: str) -> str | None:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": os.environ["EMAIL_FROM_NAME"]}
    reply_to = os.environ.get("EMAIL_REPLY_TO")
    if reply_to:
        payload["contact_email"] = reply_to
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                                 headers={"X-Email-Key": os.environ["EMERGENT_EMAIL_KEY"]}, json=payload)
    if resp.status_code >= 400:
        try:
            body = resp.json()
        except ValueError:
            body = {}
        if body.get("code") in ("insufficient_credits", "integration_disabled", "daily_limit_reached"):
            logger.warning(f"Email paused: {body.get('code')}: {body.get('message', '')}")
            raise EmailUnavailable(body.get("code"))
        logger.error(f"Email send failed: {resp.status_code} {resp.text}")
        raise EmailUnavailable(f"http_{resp.status_code}")
    return resp.json().get("id")


def _li(items):
    return "".join(f'<li style="margin:0 0 8px">{escape(str(i))}</li>' for i in items)


def render_brief_ready(user_name: str, meeting: dict, content: dict, link: str) -> tuple[str, str]:
    brand = os.environ["EMAIL_FROM_NAME"]
    title = meeting.get("title") or "your meeting"
    subject = f"Your brief for \"{title}\" is ready"
    points = [t.get("point", "") for t in (content.get("talking_points") or [])[:3] if isinstance(t, dict)]
    when = meeting.get("start_time", "")[:16].replace("T", " ")
    who = ", ".join(meeting.get("attendees") or [])
    meta = " · ".join(x for x in [escape(when) + " UTC" if when else "", escape(who)] if x)
    points_html = (f'<p style="margin:20px 0 8px;font-weight:bold;color:#0f172a">Top talking points</p>'
                   f'<ol style="margin:0;padding-left:20px;color:#334155">{_li(points)}</ol>') if points else ""
    html = (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc">'
        '<tr><td align="center" style="padding:32px 16px">'
        '<table role="presentation" width="560" cellpadding="0" cellspacing="0" '
        'style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px">'
        '<tr><td style="padding:28px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#334155">'
        f'<p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#0284c7">{escape(brand)}</p>'
        f'<h1 style="margin:0 0 6px;font-size:22px;color:#0f172a">{escape(title)}</h1>'
        f'<p style="margin:0 0 18px;color:#64748b;font-size:13px">{meta}</p>'
        f'<p style="margin:0">Hi {escape(user_name or "there")}, your meeting brief is ready.</p>'
        f'<p style="margin:16px 0 0"><strong style="color:#0f172a">Objective:</strong> {escape(content.get("objective") or meeting.get("objective") or "Not set")}</p>'
        f'{points_html}'
        f'<p style="margin:28px 0 0"><a href="{escape(link)}" style="display:inline-block;background:#0284c7;color:#ffffff;'
        'text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">Open the full brief</a></p>'
        f'<p style="margin:28px 0 0;font-size:12px;color:#94a3b8">Sent by {escape(brand)} because brief emails are on in your settings. '
        'We never ask for your password or payment details by email.</p>'
        '</td></tr></table></td></tr></table>'
    )
    return subject, html


async def send_brief_ready(user: dict, meeting: dict, brief: dict) -> None:
    link = f"{os.environ['FRONTEND_URL']}/app/meetings/{meeting['id']}"
    status = "sent"
    try:
        subject, html = render_brief_ready(user.get("name"), meeting, brief.get("content") or {}, link)
        await send_email(to=user["email"], subject=subject, html=html)
    except Exception as e:
        logger.error(f"Brief-ready email failed for brief {brief['id']}: {e}")
        status = "failed"
    await db.briefs.update_one({"id": brief["id"]}, {"$set": {"email_status": status, "emailed_at": now_iso()}})
