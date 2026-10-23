import uuid
from datetime import datetime, timezone
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, EmailStr


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- Auth ----------
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    token: str
    password: str = Field(min_length=6)


# ---------- Onboarding / Preferences ----------
class OnboardingInput(BaseModel):
    profession: str
    default_objective: Optional[str] = ""
    tone: str = "professional"
    detail_level: str = "balanced"
    load_demo_data: bool = False


class PreferencesInput(BaseModel):
    tone: Optional[str] = None
    detail_level: Optional[str] = None
    layout: Optional[str] = None
    profession: Optional[str] = None
    default_objective: Optional[str] = None
    methodology: Optional[str] = None
    priority_focus: Optional[str] = None
    default_template: Optional[str] = None
    email_notifications: Optional[bool] = None
    brief_lead_minutes: Optional[int] = None
    auto_generate: Optional[bool] = None


# ---------- Contacts / Companies ----------
class ContactInput(BaseModel):
    name: str
    email: Optional[str] = ""
    title: Optional[str] = ""
    company: Optional[str] = ""
    phone: Optional[str] = ""
    preferences: Optional[List[str]] = []
    notes: Optional[str] = ""


class CompanyInput(BaseModel):
    name: str
    domain: Optional[str] = ""
    industry: Optional[str] = ""
    description: Optional[str] = ""


# ---------- Meetings ----------
class MeetingInput(BaseModel):
    title: str
    meeting_type: str = "follow_up"
    start_time: str
    end_time: Optional[str] = None
    objective: Optional[str] = ""
    attendees: Optional[List[str]] = []
    contact_id: Optional[str] = None
    company: Optional[str] = ""


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    meeting_type: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    objective: Optional[str] = None
    attendees: Optional[List[str]] = None
    contact_id: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None


# ---------- Notes ----------
class NoteInput(BaseModel):
    title: str
    content: str
    contact_id: Optional[str] = None
    meeting_id: Optional[str] = None
    source_type: str = "manual"


# ---------- Commitments ----------
class CommitmentInput(BaseModel):
    description: str
    owner: Optional[str] = ""
    due_date: Optional[str] = None
    status: str = "open"
    contact_id: Optional[str] = None
    meeting_id: Optional[str] = None
    source_label: Optional[str] = "Manual entry"


class CommitmentUpdate(BaseModel):
    description: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None


# ---------- Briefs ----------
class GenerateBriefInput(BaseModel):
    meeting_id: str
    template: Optional[str] = None


class BriefEditInput(BaseModel):
    content: Dict[str, Any]


class RegenerateSectionInput(BaseModel):
    section: str


class FeedbackInput(BaseModel):
    brief_id: str
    type: str
    section: Optional[str] = None


# ---------- Integrations ----------
class IntegrationConnectInput(BaseModel):
    provider: str


# ---------- Billing ----------
class SubscribeInput(BaseModel):
    plan_id: str


class VerifyPaymentInput(BaseModel):
    plan_id: Optional[str] = None
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


# ---------- Admin ----------
class PlanUpdateInput(BaseModel):
    name: Optional[str] = None
    price_monthly: Optional[float] = Field(default=None, ge=0)
    brief_allowance: Optional[int] = Field(default=None, ge=0)
    integration_limit: Optional[int] = None
    history_retention_days: Optional[int] = None
    advanced_research: Optional[bool] = None
    features: Optional[List[str]] = None
