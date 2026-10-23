from datetime import datetime, timezone, timedelta
from database import db
from models import new_id, now_iso

DEFAULT_PLANS = [
    {
        "id": "free", "name": "Starter Trial", "price_monthly": 0, "currency": "USD",
        "brief_allowance": 3, "integration_limit": 1, "history_retention_days": 7,
        "advanced_research": False,
        "features": ["3 briefs / month", "Manual notes", "1 integration", "Source citations"],
        "order": 0,
    },
    {
        "id": "entry", "name": "Entry", "price_monthly": 19, "currency": "USD",
        "brief_allowance": 30, "integration_limit": 3, "history_retention_days": 90,
        "advanced_research": False,
        "features": ["30 briefs / month", "3 integrations", "Profession templates",
                     "Commitment detector", "Email notifications", "90-day history"],
        "order": 1,
    },
    {
        "id": "pro", "name": "Professional", "price_monthly": 29, "currency": "USD",
        "brief_allowance": 100, "integration_limit": 10, "history_retention_days": 365,
        "advanced_research": True,
        "features": ["100 briefs / month", "10 integrations", "Client Change Radar",
                     "Advanced research", "Priority generation", "1-year history"],
        "order": 2,
    },
]

INTEGRATION_CATALOG = [
    {"provider": "google_calendar", "name": "Google Calendar", "category": "calendar", "requires_oauth": True},
    {"provider": "outlook_calendar", "name": "Outlook Calendar", "category": "calendar", "requires_oauth": True},
    {"provider": "hubspot", "name": "HubSpot", "category": "crm", "requires_oauth": True},
    {"provider": "salesforce", "name": "Salesforce", "category": "crm", "requires_oauth": True},
    {"provider": "manual_notes", "name": "Manual Notes & Uploads", "category": "notes", "requires_oauth": False},
    {"provider": "gmail", "name": "Gmail", "category": "email", "requires_oauth": True},
]


async def ensure_plans():
    for plan in DEFAULT_PLANS:
        existing = await db.plans.find_one({"id": plan["id"]})
        if not existing:
            await db.plans.insert_one(dict(plan))


async def ensure_user_subscription(user_id: str):
    sub = await db.subscriptions.find_one({"user_id": user_id})
    if not sub:
        now = datetime.now(timezone.utc)
        await db.subscriptions.insert_one({
            "id": new_id(),
            "user_id": user_id,
            "plan_id": "free",
            "status": "active",
            "provider": "none",
            "started_at": now.isoformat(),
            "current_period_end": (now + timedelta(days=30)).isoformat(),
            "razorpay_order_id": None,
            "razorpay_payment_id": None,
        })


async def ensure_integration_rows(user_id: str):
    for item in INTEGRATION_CATALOG:
        existing = await db.integrations.find_one({"user_id": user_id, "provider": item["provider"]})
        if not existing:
            await db.integrations.insert_one({
                "id": new_id(),
                "user_id": user_id,
                "provider": item["provider"],
                "name": item["name"],
                "category": item["category"],
                "requires_oauth": item["requires_oauth"],
                "status": "connected" if item["provider"] == "manual_notes" else "not_connected",
                "connected_at": now_iso() if item["provider"] == "manual_notes" else None,
                "last_sync": None,
                "error": None,
            })


async def ensure_preferences(user_id: str, profession: str = "consultant"):
    pref = await db.preferences.find_one({"user_id": user_id})
    if not pref:
        await db.preferences.insert_one({
            "id": new_id(),
            "user_id": user_id,
            "tone": "professional",
            "detail_level": "balanced",
            "layout": "standard",
            "profession": profession,
            "default_objective": "",
            "methodology": "none",
            "priority_focus": "open_questions",
            "default_template": profession,
            "email_notifications": True,
            "brief_lead_minutes": 30,
            "auto_generate": False,
            "updated_at": now_iso(),
        })


async def seed_demo_data(user_id: str):
    """Clearly-labeled demo data so the app feels live. Marked with is_demo=True."""
    existing = await db.meetings.find_one({"user_id": user_id, "is_demo": True})
    if existing:
        return

    now = datetime.now(timezone.utc)

    companies = [
        {"id": new_id(), "user_id": user_id, "name": "Northwind Retail", "industry": "Retail / E-commerce",
         "domain": "northwind.example", "description": "Mid-market retailer modernizing their omnichannel stack.",
         "is_demo": True, "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "name": "Helios Analytics", "industry": "SaaS / Data",
         "domain": "helios.example", "description": "Series B analytics platform expanding into enterprise.",
         "is_demo": True, "created_at": now_iso()},
    ]
    await db.companies.insert_many([dict(c) for c in companies])

    contacts = [
        {"id": new_id(), "user_id": user_id, "name": "Dana Whitfield", "email": "dana@northwind.example",
         "title": "VP Operations", "company": "Northwind Retail", "company_id": companies[0]["id"],
         "phone": "", "preferences": ["Prefers concise updates", "Data-driven decisions"],
         "notes": "Sponsor for the fulfilment optimisation project.", "is_demo": True, "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "name": "Marcus Lee", "email": "marcus@helios.example",
         "title": "Head of Revenue", "company": "Helios Analytics", "company_id": companies[1]["id"],
         "phone": "", "preferences": ["Likes ROI framing"],
         "notes": "Evaluating our proposal vs two competitors.", "is_demo": True, "created_at": now_iso()},
    ]
    await db.contacts.insert_many([dict(c) for c in contacts])

    notes = [
        {"id": new_id(), "user_id": user_id, "contact_id": contacts[0]["id"], "meeting_id": None,
         "title": "Discovery call - Northwind", "source_type": "manual",
         "content": "Dana flagged that warehouse throughput drops 20% during peak season. We promised a phased rollout plan and a reference customer intro. She asked about integration timelines with their existing ERP.",
         "is_demo": True, "created_at": (now - timedelta(days=12)).isoformat()},
        {"id": new_id(), "user_id": user_id, "contact_id": contacts[1]["id"], "meeting_id": None,
         "title": "Proposal review - Helios", "source_type": "import",
         "content": "Marcus raised concern about implementation cost. He wants a clear 90-day ROI model. We committed to sending a revised pricing sheet by end of last week.",
         "is_demo": True, "created_at": (now - timedelta(days=5)).isoformat()},
    ]
    await db.notes.insert_many([dict(n) for n in notes])

    commitments = [
        {"id": new_id(), "user_id": user_id, "contact_id": contacts[0]["id"], "meeting_id": None,
         "description": "Send phased rollout plan + reference customer intro", "owner": "You",
         "due_date": (now - timedelta(days=2)).isoformat(), "status": "overdue",
         "source_note_id": notes[0]["id"], "source_label": "Discovery call - Northwind",
         "is_demo": True, "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "contact_id": contacts[1]["id"], "meeting_id": None,
         "description": "Deliver revised pricing sheet with 90-day ROI model", "owner": "You",
         "due_date": (now + timedelta(days=1)).isoformat(), "status": "open",
         "source_note_id": notes[1]["id"], "source_label": "Proposal review - Helios",
         "is_demo": True, "created_at": now_iso()},
    ]
    await db.commitments.insert_many([dict(c) for c in commitments])

    meetings = [
        {"id": new_id(), "user_id": user_id, "title": "Northwind - Fulfilment Project Review",
         "meeting_type": "project_review", "start_time": (now + timedelta(hours=3)).isoformat(),
         "end_time": (now + timedelta(hours=4)).isoformat(),
         "objective": "Align on rollout timeline and address ERP integration concerns",
         "attendees": ["Dana Whitfield"], "contact_id": contacts[0]["id"], "company": "Northwind Retail",
         "status": "scheduled", "brief_id": None, "source": "demo", "is_demo": True, "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "title": "Helios - Renewal & Pricing Discussion",
         "meeting_type": "renewal_review", "start_time": (now + timedelta(days=1, hours=2)).isoformat(),
         "end_time": (now + timedelta(days=1, hours=3)).isoformat(),
         "objective": "Present ROI model and move the deal forward",
         "attendees": ["Marcus Lee"], "contact_id": contacts[1]["id"], "company": "Helios Analytics",
         "status": "scheduled", "brief_id": None, "source": "demo", "is_demo": True, "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "title": "New Prospect - Discovery Call",
         "meeting_type": "discovery", "start_time": (now + timedelta(days=2, hours=5)).isoformat(),
         "end_time": (now + timedelta(days=2, hours=6)).isoformat(),
         "objective": "Understand needs and qualify fit",
         "attendees": ["Priya Raman"], "contact_id": None, "company": "Acme Consulting",
         "status": "scheduled", "brief_id": None, "source": "demo", "is_demo": True, "created_at": now_iso()},
    ]
    await db.meetings.insert_many([dict(m) for m in meetings])
