// Creates the GuestSetGo Stripe webhook endpoint and prints the signing secret to copy.
// Usage: STRIPE_SECRET_KEY=sk_live_... npm run stripe:webhook
import Stripe from "stripe";
import { readFileSync, writeFileSync } from "node:fs";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Set STRIPE_SECRET_KEY first, e.g. STRIPE_SECRET_KEY=sk_live_... npm run stripe:webhook");
  process.exit(1);
}
const stripe = new Stripe(key);

const url = process.env.WEBHOOK_URL || "https://www.guestsetgo.com/api/stripe/webhook";
const events = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "charge.refunded",
];

const existing = await stripe.webhookEndpoints.list({ limit: 100 });
// Reuse the original endpoint when moving to the canonical domain, retaining its
// signing secret so production does not lose payment notifications during repair.
const already = existing.data.find((e) => e.url === url) ||
  (url === "https://www.guestsetgo.com/api/stripe/webhook" && existing.data.find((e) => e.url === "https://guestsetgo.com/api/stripe/webhook"));
if (already) {
  await stripe.webhookEndpoints.update(already.id, { url, enabled_events: already.enabled_events.includes("*") ? ["*"] : [...new Set([...already.enabled_events, ...events])] });
  console.log("Updated existing webhook URL and events; signing secret retained.");
  process.exit(0);
}

const endpoint = await stripe.webhookEndpoints.create({
  url,
  enabled_events: events,
  description: "GuestSetGo production webhook",
});

console.log("\nWebhook endpoint created:", endpoint.id);
console.log("\nAdd this to Vercel (and .env.local):\n");
if (process.argv.includes("--write-env")) {
  let env = readFileSync(".env.local", "utf8");
  env = /^STRIPE_WEBHOOK_SECRET=.*$/m.test(env) ? env.replace(/^STRIPE_WEBHOOK_SECRET=.*$/m, `STRIPE_WEBHOOK_SECRET=${endpoint.secret}`) : `${env.trimEnd()}\nSTRIPE_WEBHOOK_SECRET=${endpoint.secret}\n`;
  writeFileSync(".env.local", env);
  console.log("Signing secret saved to .env.local (not printed).");
} else console.log(`STRIPE_WEBHOOK_SECRET=${endpoint.secret}\n`);
