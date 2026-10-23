import os
import json
import logging
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

BRIEF_SECTIONS = [
    "objective", "background", "previous_interaction", "open_commitments",
    "recent_developments", "talking_points", "suggested_questions",
    "risks_and_opportunities", "recommended_next_actions", "missing_information",
]

SYSTEM_PROMPT = """You are an expert meeting-preparation analyst for "BriefCraft AI".
You produce concise, trustworthy, source-grounded one-page meeting briefs for consultants, account executives, freelancers and recruiters.

CRITICAL RULES:
- Use ONLY the context provided (meeting details, contact, company, notes, commitments). NEVER invent past conversations, client preferences, company news, commitments, or CRM records.
- Every factual claim in `background`, `previous_interaction`, `open_commitments` and `recent_developments` MUST include a `source` string that references a provided note title, commitment, or meeting detail. If no source exists, do NOT state it as fact.
- `talking_points`, `suggested_questions`, `risks_and_opportunities` and `recommended_next_actions` are AI recommendations grounded in the context; mark them as recommendations (no fabricated facts).
- If information is unavailable, list it in `missing_information` instead of making it up.
- Keep the brief scannable: ~3 background points, exactly 3 talking points, exactly 3 suggested questions.

Return ONLY valid JSON (no markdown fences) with EXACTLY this schema:
{
  "objective": "string - the meeting objective",
  "who_you_are_meeting": "string - 1-2 sentences about the attendee/org from context",
  "background": [{"text": "string", "source": "string", "type": "fact|inference"}],
  "previous_interaction": {"summary": "string", "source": "string"},
  "open_commitments": [{"description": "string", "owner": "string", "due_date": "string|null", "status": "open|overdue|done", "source": "string"}],
  "recent_developments": [{"text": "string", "source": "string", "date": "string|null"}],
  "talking_points": [{"point": "string", "priority": 1, "rationale": "string"}],
  "suggested_questions": ["string", "string", "string"],
  "risks_and_opportunities": [{"text": "string", "kind": "risk|opportunity"}],
  "recommended_next_actions": ["string"],
  "missing_information": ["string"],
  "sources": [{"label": "string", "type": "note|calendar|crm|commitment", "timestamp": "string|null"}]
}
If a section has no grounded content, return an empty array/null and add a note to missing_information."""


def build_context(meeting: dict, contact: dict | None, company: dict | None,
                  notes: list[dict], commitments: list[dict]) -> str:
    lines = ["=== UPCOMING MEETING ==="]
    lines.append(f"Title: {meeting.get('title')}")
    lines.append(f"Type: {meeting.get('meeting_type')}")
    lines.append(f"Start: {meeting.get('start_time')}")
    lines.append(f"Objective (user-stated): {meeting.get('objective') or 'not provided'}")
    lines.append(f"Attendees: {', '.join(meeting.get('attendees') or []) or 'not provided'}")

    lines.append("\n=== CONTACT ===")
    if contact:
        lines.append(f"Name: {contact.get('name')}")
        lines.append(f"Title: {contact.get('title') or 'unknown'}")
        lines.append(f"Company: {contact.get('company') or 'unknown'}")
        lines.append(f"Email: {contact.get('email') or 'unknown'}")
        if contact.get("preferences"):
            lines.append(f"Recorded preferences: {'; '.join(contact['preferences'])}")
        if contact.get("notes"):
            lines.append(f"Contact notes: {contact['notes']}")
    else:
        lines.append("No matching contact record found.")

    lines.append("\n=== COMPANY ===")
    if company:
        lines.append(f"Name: {company.get('name')}")
        lines.append(f"Industry: {company.get('industry') or 'unknown'}")
        lines.append(f"Description: {company.get('description') or 'unknown'}")
    else:
        lines.append("No company record found.")

    lines.append("\n=== PREVIOUS NOTES ===")
    if notes:
        for n in notes:
            lines.append(f"- [{n.get('source_type','manual')}] '{n.get('title')}' ({n.get('created_at','')[:10]}): {n.get('content')}")
    else:
        lines.append("No notes available.")

    lines.append("\n=== KNOWN COMMITMENTS / TASKS ===")
    if commitments:
        for c in commitments:
            lines.append(f"- {c.get('description')} | owner: {c.get('owner') or 'unknown'} | due: {c.get('due_date') or 'none'} | status: {c.get('status')} | source: {c.get('source_label')}")
    else:
        lines.append("No recorded commitments.")
    return "\n".join(lines)


def _strip_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1] if "```" in text else text
        if text.startswith("json"):
            text = text[4:]
        text = text.strip("`").strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    return text


async def generate_brief(context: str, tone: str, detail_level: str, template: str) -> dict:
    api_key = os.environ["EMERGENT_LLM_KEY"]
    system = SYSTEM_PROMPT + f"\n\nWriting tone: {tone}. Detail level: {detail_level}. Brief template: {template}."
    chat = LlmChat(
        api_key=api_key,
        session_id=f"brief-{datetime.now(timezone.utc).timestamp()}",
        system_message=system,
    ).with_model("anthropic", "claude-sonnet-5-5")

    user_msg = UserMessage(text=f"Generate the meeting brief JSON from this context:\n\n{context}")
    response = await chat.send_message(user_msg)
    raw = response if isinstance(response, str) else str(response)
    cleaned = _strip_json(raw)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"Brief JSON parse failed: {e}\nRaw: {raw[:500]}")
        raise ValueError("AI returned invalid JSON")

    # Deterministic validation / defaults
    for key, default in [
        ("objective", ""), ("who_you_are_meeting", ""), ("background", []),
        ("previous_interaction", None), ("open_commitments", []),
        ("recent_developments", []), ("talking_points", []),
        ("suggested_questions", []), ("risks_and_opportunities", []),
        ("recommended_next_actions", []), ("missing_information", []), ("sources", []),
    ]:
        if key not in data or data[key] is None:
            data[key] = default
    data["generated_at"] = datetime.now(timezone.utc).isoformat()
    return data
