from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem, HRFlowable

INK = colors.HexColor("#0F172A")
MUTED = colors.HexColor("#475569")
ACCENT = colors.HexColor("#4F46E5")


def _styles():
    s = getSampleStyleSheet()
    return {
        "eyebrow": ParagraphStyle("eyebrow", parent=s["Normal"], fontName="Helvetica-Bold", fontSize=8,
                                  textColor=ACCENT, spaceAfter=4),
        "title": ParagraphStyle("title", parent=s["Title"], fontName="Helvetica-Bold", fontSize=20,
                                textColor=INK, alignment=0, spaceAfter=4, leading=24),
        "meta": ParagraphStyle("meta", parent=s["Normal"], fontSize=9, textColor=MUTED, spaceAfter=10),
        "h2": ParagraphStyle("h2", parent=s["Heading2"], fontName="Helvetica-Bold", fontSize=12,
                             textColor=INK, spaceBefore=12, spaceAfter=6),
        "body": ParagraphStyle("body", parent=s["Normal"], fontSize=10, textColor=INK, leading=14),
    }


def _bullets(items, st):
    return ListFlowable([ListItem(Paragraph(escape(str(i)), st["body"]), leftIndent=10) for i in items],
                        bulletType="bullet", start="•", leftIndent=12)


def render_notes_pdf(meeting: dict, notes: dict) -> bytes:
    st = _styles()
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm,
                            topMargin=18 * mm, bottomMargin=18 * mm, title=f"Notes - {meeting.get('title')}")
    ai = notes.get("ai") or {}
    flow = [Paragraph("BRIEFCRAFT AI · MEETING NOTES", st["eyebrow"]),
            Paragraph(escape(meeting.get("title") or "Meeting"), st["title"]),
            Paragraph(escape(" · ".join(x for x in [(meeting.get("start_time") or "")[:16].replace("T", " "),
                                                   ", ".join(meeting.get("attendees") or [])] if x)), st["meta"]),
            HRFlowable(width="100%", color=colors.HexColor("#E2E8F0"), spaceAfter=6)]
    if ai.get("summary"):
        flow += [Paragraph("Summary", st["h2"]), Paragraph(escape(ai["summary"]), st["body"])]
    if ai.get("decisions"):
        flow += [Paragraph("Decisions", st["h2"]), _bullets(ai["decisions"], st)]
    if ai.get("action_items"):
        rows = []
        for a in ai["action_items"]:
            extra = " — ".join(x for x in [a.get("owner"), a.get("due")] if x)
            rows.append(f"{a.get('task', '')}" + (f" ({extra})" if extra else ""))
        flow += [Paragraph("Action items", st["h2"]), _bullets(rows, st)]
    if ai.get("key_details"):
        flow += [Paragraph("Key details", st["h2"]), _bullets(ai["key_details"], st)]
    if ai.get("open_questions"):
        flow += [Paragraph("Open questions", st["h2"]), _bullets(ai["open_questions"], st)]
    if ai.get("follow_up"):
        flow += [Paragraph("Recommended follow-up", st["h2"]), Paragraph(escape(ai["follow_up"]), st["body"])]
    if notes.get("manual"):
        flow += [Paragraph("My notes", st["h2"])]
        flow += [Paragraph(escape(line) or "&nbsp;", st["body"]) for line in notes["manual"].split("\n")]
    if len(flow) == 4:
        flow.append(Paragraph("No notes recorded for this meeting yet.", st["body"]))
    doc.build(flow)
    return buf.getvalue()
