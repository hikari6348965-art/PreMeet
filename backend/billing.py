import os
import logging
import razorpay
from models import new_id, now_iso

logger = logging.getLogger(__name__)


def get_client():
    key_id = os.environ.get("RAZORPAY_KEY_ID")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    if not key_id or not key_secret:
        return None
    try:
        return razorpay.Client(auth=(key_id, key_secret))
    except Exception as e:
        logger.error(f"Razorpay client init failed: {e}")
        return None


def is_configured() -> bool:
    return get_client() is not None


def create_order(amount_inr: float, receipt: str) -> dict:
    client = get_client()
    amount_paise = int(round(amount_inr * 100))
    order = client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt[:40],
        "payment_capture": 1,
    })
    return order


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    client = get_client()
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        })
        return True
    except Exception as e:
        logger.error(f"Signature verification failed: {e}")
        return False


def verify_webhook(body: str, signature: str) -> bool:
    client = get_client()
    secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET")
    if not secret:
        return False
    try:
        client.utility.verify_webhook_signature(body, signature, secret)
        return True
    except Exception as e:
        logger.error(f"Webhook verification failed: {e}")
        return False
