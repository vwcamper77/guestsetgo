// Creates the GuestSetGo Stripe webhook endpoint and prints the signing secret to copy.
// Usage: STRIPE_SECRET_KEY=sk_live_... npm run stripe:webhook
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Set STRIPE_SECRET_KEY first, e.g. STRIPE_SECRET_KEY=sk_live_... npm run stripe:webhook");
  process.exit(1);
}
const stripe = new Stripe(key);

const url = process.env.WEBHOOK_URL || "https://guestsetgo.com/api/stripe/webhook";
const events = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "charge.refunded",
];

const existing = await stripe.webhookEndpoints.list({ limit: 100 });
const already = existing.data.find((e) => e.url === url);
if (already) {
  console.log(`\nA webhook endpoint for ${url} already exists (id: ${already.id}).`);
  console.log("Its signing secret is only shown once, at creation time, so it can't be re-printed here.");
  console.log("Delete it in the Stripe dashboard first if you need a fresh secret, then re-run this script.\n");
  process.exit(0);
}

const endpoint = await stripe.webhookEndpoints.create({
  url,
  enabled_events: events,
  description: "GuestSetGo production webhook",
});

console.log("\nWebhook endpoint created:", endpoint.id);
console.log("\nAdd this to Vercel (and .env.local):\n");
console.log(`STRIPE_WEBHOOK_SECRET=${endpoint.secret}\n`);
