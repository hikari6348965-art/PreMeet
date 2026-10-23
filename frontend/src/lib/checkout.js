import { api } from "./api";

function loadScript() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// Resolves with {status: "paid"|"free"|"test_mode"|"dismissed"}; rejects on failure.
export async function startCheckout(planId) {
  const { data } = await api.post("/billing/subscribe", { plan_id: planId });
  if (data.mode !== "razorpay") return { status: data.mode };
  if (!(await loadScript())) throw new Error("Couldn't load the payment window. Check your connection.");
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: data.key_id,
      amount: data.amount,
      currency: "INR",
      order_id: data.order.id,
      name: "PreMeet",
      description: `${planId} plan — 30 days`,
      prefill: { name: data.user_name, email: data.user_email },
      theme: { color: "#0284c7" },
      handler: async (res) => {
        try {
          await api.post("/billing/verify", { plan_id: planId, ...res });
          resolve({ status: "paid" });
        } catch { reject(new Error("We couldn't verify your payment. If you were charged, contact support.")); }
      },
      modal: { ondismiss: () => resolve({ status: "dismissed" }) },
    });
    rzp.on("payment.failed", (r) => reject(new Error(r.error?.description || "Payment failed.")));
    rzp.open();
  });
}
