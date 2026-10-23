# Billing / Razorpay tests: plans INR pricing, subscribe, verify, payments, webhook, expiry
import os
import hmac
import json
import hashlib
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ENV = dotenv_values("/app/backend/.env")
KEY_SECRET = ENV["RAZORPAY_KEY_SECRET"]
WEBHOOK_SECRET = ENV["RAZORPAY_WEBHOOK_SECRET"]
db = MongoClient(ENV["MONGO_URL"])[ENV["DB_NAME"]]


def sig(order_id, payment_id):
    return hmac.new(KEY_SECRET.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()


def register():
    email = f"test_bill_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{BASE_URL}/api/auth/register",
                      json={"email": email, "password": "Test@12345", "name": "TEST Bill"})
    assert r.status_code in (200, 201), r.text
    tok = r.json()["token"]
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {tok}"})
    uid = s.get(f"{BASE_URL}/api/auth/me").json()["id"]
    return s, uid, email


@pytest.fixture(scope="module")
def users():
    a = register()
    b = register()
    yield a, b
    for _, uid, email in (a, b):
        for c in ("subscriptions", "payment_orders", "usage_records", "audit_logs", "meetings", "briefs"):
            db[c].delete_many({"user_id": uid})
        db.users.delete_one({"email": email})


# Plans
def test_plans_price_inr():
    r = requests.get(f"{BASE_URL}/api/plans")
    assert r.status_code == 200
    m = {p["id"]: p for p in r.json()}
    assert m["free"]["price_inr"] == 0
    assert m["entry"]["price_inr"] == 1672
    assert m["pro"]["price_inr"] == 2552


# Subscribe -> razorpay order
def test_subscribe_creates_order(users):
    (s, uid, _), _ = users
    r = s.post(f"{BASE_URL}/api/billing/subscribe", json={"plan_id": "entry"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["mode"] == "razorpay"
    assert d["key_id"].startswith("rzp_test")
    assert d["order"]["id"].startswith("order_")
    assert d["amount"] == 167200
    rec = db.payment_orders.find_one({"order_id": d["order"]["id"]})
    assert rec and rec["status"] == "created" and rec["user_id"] == uid and rec["plan_id"] == "entry"


def test_subscribe_unknown_plan(users):
    (s, _, _), _ = users
    assert s.post(f"{BASE_URL}/api/billing/subscribe", json={"plan_id": "nope"}).status_code == 404


# Verify
def test_verify_valid_uses_stored_plan_and_idempotent(users):
    (s, uid, _), _ = users
    oid = s.post(f"{BASE_URL}/api/billing/subscribe", json={"plan_id": "pro"}).json()["order"]["id"]
    pid = f"pay_TEST{uuid.uuid4().hex[:10]}"
    # client lies about plan_id -> should still activate stored 'pro'
    r = s.post(f"{BASE_URL}/api/billing/verify", json={"plan_id": "entry", "razorpay_order_id": oid,
                                                      "razorpay_payment_id": pid, "razorpay_signature": sig(oid, pid)})
    assert r.status_code == 200, r.text
    assert r.json()["plan_id"] == "pro"
    sub = s.get(f"{BASE_URL}/api/subscription").json()
    assert sub["plan"]["id"] == "pro"
    assert sub["subscription"]["provider"] == "razorpay"
    end1 = sub["subscription"]["current_period_end"]
    assert db.payment_orders.find_one({"order_id": oid})["status"] == "paid"
    # replay
    r2 = s.post(f"{BASE_URL}/api/billing/verify", json={"razorpay_order_id": oid,
                                                       "razorpay_payment_id": pid, "razorpay_signature": sig(oid, pid)})
    assert r2.status_code == 200
    assert s.get(f"{BASE_URL}/api/subscription").json()["subscription"]["current_period_end"] == end1


def test_verify_invalid_signature(users):
    (s, _, _), _ = users
    oid = s.post(f"{BASE_URL}/api/billing/subscribe", json={"plan_id": "entry"}).json()["order"]["id"]
    r = s.post(f"{BASE_URL}/api/billing/verify", json={"razorpay_order_id": oid,
                                                      "razorpay_payment_id": "pay_x", "razorpay_signature": "bad"})
    assert r.status_code == 400
    assert db.payment_orders.find_one({"order_id": oid})["status"] == "failed"


def test_invalid_sig_on_paid_order_does_not_downgrade_status(users):
    """Paid order should not flip to failed, and a valid replay after that should not extend the period."""
    (s, _, _), _ = users
    paid = db.payment_orders.find_one({"user_id": users[0][1], "status": "paid"})
    oid, pid = paid["order_id"], paid["payment_id"]
    end1 = s.get(f"{BASE_URL}/api/subscription").json()["subscription"]["current_period_end"]
    s.post(f"{BASE_URL}/api/billing/verify", json={"razorpay_order_id": oid,
                                                  "razorpay_payment_id": pid, "razorpay_signature": "bad"})
    status_after = db.payment_orders.find_one({"order_id": oid})["status"]
    s.post(f"{BASE_URL}/api/billing/verify", json={"razorpay_order_id": oid,
                                                  "razorpay_payment_id": pid, "razorpay_signature": sig(oid, pid)})
    end2 = s.get(f"{BASE_URL}/api/subscription").json()["subscription"]["current_period_end"]
    # restore for next tests
    db.payment_orders.update_one({"order_id": oid}, {"$set": {"status": "paid"}})
    assert status_after == "paid", "invalid signature overwrote a paid order to 'failed'"
    assert end1 == end2, "valid replay after invalid attempt re-activated / extended the plan"


def test_verify_other_users_order_404(users):
    (sa, _, _), (sb, _, _) = users
    oid = sa.post(f"{BASE_URL}/api/billing/subscribe", json={"plan_id": "entry"}).json()["order"]["id"]
    pid = "pay_TESTother"
    r = sb.post(f"{BASE_URL}/api/billing/verify", json={"razorpay_order_id": oid,
                                                       "razorpay_payment_id": pid, "razorpay_signature": sig(oid, pid)})
    assert r.status_code == 404


# Payments list
def test_payments_list_scoped(users):
    (sa, uida, _), (sb, _, _) = users
    rows = sa.get(f"{BASE_URL}/api/billing/payments").json()
    assert len(rows) >= 2
    assert all(r["user_id"] == uida and r["status"] in ("paid", "failed") for r in rows)
    assert all("_id" not in r for r in rows)
    assert sb.get(f"{BASE_URL}/api/billing/payments").json() == []


# Webhook
def test_webhook_valid_and_invalid(users):
    _, (sb, uidb, _) = users
    oid = sb.post(f"{BASE_URL}/api/billing/subscribe", json={"plan_id": "entry"}).json()["order"]["id"]
    body = json.dumps({"event": "payment.captured", "payload": {"payment": {"entity": {
        "id": "pay_TESTwh1", "order_id": oid, "amount": 167200}}}})
    bad = requests.post(f"{BASE_URL}/api/billing/webhook", data=body,
                        headers={"Content-Type": "application/json", "X-Razorpay-Signature": "bad"})
    assert bad.status_code == 400
    s_ = hmac.new(WEBHOOK_SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()
    ok = requests.post(f"{BASE_URL}/api/billing/webhook", data=body,
                       headers={"Content-Type": "application/json", "X-Razorpay-Signature": s_})
    assert ok.status_code == 200, ok.text
    assert db.payment_orders.find_one({"order_id": oid})["status"] == "paid"
    assert sb.get(f"{BASE_URL}/api/subscription").json()["plan"]["id"] == "entry"


# Free plan + expiry
def test_subscribe_free_and_expiry(users):
    _, (sb, uidb, _) = users
    r = sb.post(f"{BASE_URL}/api/billing/subscribe", json={"plan_id": "free"})
    assert r.status_code == 200 and r.json()["mode"] == "free"
    assert sb.get(f"{BASE_URL}/api/subscription").json()["plan"]["id"] == "free"
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    db.subscriptions.update_one({"user_id": uidb}, {"$set": {"plan_id": "pro", "current_period_end": past}})
    sub = sb.get(f"{BASE_URL}/api/subscription").json()
    assert sub["plan"]["id"] == "free"
    assert sub["subscription"]["status"] == "expired"
