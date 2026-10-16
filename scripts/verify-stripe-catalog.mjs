// Verify configured live/test prices and exercise unpaid Checkout sessions, then expire them.
// No customers, subscriptions or charges are created.
import Stripe from "stripe";
import assert from "node:assert/strict";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const entries = [
  ["STRIPE_PRICE_HOST_MONTHLY", 600, "month", 1],
  ["STRIPE_PRICE_HOST_ANNUAL", 6000, "year", 1],
  ["STRIPE_PRICE_AGENCY_MONTHLY", 400, "month", 5],
  ["STRIPE_PRICE_ASSISTED", 7900, null, 1],
];
for (const [name, amount, interval, quantity] of process.argv.includes("--portals-only") ? [] : entries) {
  const price = await stripe.prices.retrieve(process.env[name]);
  assert.equal(price.unit_amount, amount); assert.equal(price.currency, "gbp"); assert.equal(price.recurring?.interval || null, interval);
  assert.equal(price.active, true);
  const session = await stripe.checkout.sessions.create({ mode: interval ? "subscription" : "payment", line_items: [{ price: price.id, quantity }], success_url: "https://guestsetgo.com/dashboard/billing", cancel_url: "https://guestsetgo.com/dashboard/billing", integration_identifier: "guestsetgo-verification-abcdefgh" });
  try { assert.equal(session.amount_total, amount * quantity); assert.equal(session.payment_status, "unpaid"); }
  finally { await stripe.checkout.sessions.expire(session.id); }
  console.log(`${name}: amount, interval and unpaid Checkout verified; session expired.`);
}
for (const [key, minimum] of [["STRIPE_PORTAL_HOST", 1], ["STRIPE_PORTAL_AGENCY", 5]]) {
  const config = await stripe.billingPortal.configurations.retrieve(process.env[key], { expand: ["features.subscription_update.products"] });
  assert.equal(config.features.subscription_update.products[0].adjustable_quantity.minimum, minimum);
  assert.equal(config.features.subscription_update.products.length, 2, "Both Host and Agency must be available for plan changes");
  assert.equal(config.features.subscription_cancel.enabled, true);
  console.log(`${key}: minimum ${minimum} and cancellation verified.`);
}
