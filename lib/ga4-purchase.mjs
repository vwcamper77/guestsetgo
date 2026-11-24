import { randomUUID } from "node:crypto";

export function checkoutClientId(cookieHeader = "") {
  const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith("_ga="));
  try {
    const match = decodeURIComponent(cookie?.slice(4) || "").match(/^GA\d+\.\d+\.(\d+\.\d+)$/);
    if (match) return match[1];
  } catch { /* Malformed cookies must not prevent checkout. */ }
  return randomUUID();
}

export function purchaseDetails(event) {
  const object = event.data.object;
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    if (object.payment_status !== "paid") return null;
    return { id: object.id, amount: object.amount_total, currency: object.currency, clientId: object.metadata?.ga_client_id };
  }
  // The first invoice is already represented by the Checkout session purchase.
  if (event.type === "invoice.paid" && object.billing_reason === "subscription_cycle") {
    return {
      id: object.id, amount: object.amount_paid, currency: object.currency,
      clientId: object.parent?.subscription_details?.metadata?.ga_client_id || object.subscription_details?.metadata?.ga_client_id,
    };
  }
  return null;
}

export function purchasePayload({ id, amount, currency, clientId }) {
  if (!id || !Number.isSafeInteger(amount) || amount <= 0 || !/^[a-z]{3}$/i.test(currency || "")) return null;
  return {
    client_id: clientId || randomUUID(),
    events: [{ name: "purchase", params: { transaction_id: id, value: amount / 100, currency: currency.toUpperCase() } }],
  };
}

export async function sendStripePurchase(event, { env = process.env, fetchImpl = fetch, getFallbackClientId = async () => randomUUID(), logger = console } = {}) {
  if (!env.GA4_MEASUREMENT_ID || !env.GA4_API_SECRET) return;
  const details = purchaseDetails(event);
  if (!details || !purchasePayload({ ...details, clientId: "validation" })) return;
  try {
    // Persist legacy fallback IDs so retries use the same client/transaction pair.
    const clientId = details.clientId || await getFallbackClientId(details.id);
    const url = new URL("https://www.google-analytics.com/mp/collect");
    url.searchParams.set("measurement_id", env.GA4_MEASUREMENT_ID);
    url.searchParams.set("api_secret", env.GA4_API_SECRET);
    const response = await fetchImpl(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(purchasePayload({ ...details, clientId })), signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) logger.warn("GA4 purchase delivery failed", details.id, response.status);
  } catch {
    // Never log fetch errors: they can include the URL containing the API secret.
    logger.warn("GA4 purchase delivery failed", details.id);
  }
}
