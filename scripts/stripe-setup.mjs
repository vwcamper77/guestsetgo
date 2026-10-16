// Additive, rerunnable catalog setup. Existing subscriptions and prices are retained.
// node --env-file=.env.local scripts/stripe-setup.mjs --live --write-env
import Stripe from "stripe";
import { readFileSync, writeFileSync } from "node:fs";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("Configure STRIPE_SECRET_KEY first.");
if (key.includes("_live_") && !process.argv.includes("--live")) throw new Error("Live catalog changes require the --live flag.");
const stripe = new Stripe(key);
async function product(tag, name, description) {
  const found = await stripe.products.search({ query: `metadata['gsg']:'${tag}'` });
  return found.data[0] || stripe.products.create({ name, description, metadata: { gsg: tag } }, { idempotencyKey: `gsg-product-${tag}` });
}
async function price(lookup, params) {
  const existing = (await stripe.prices.list({ lookup_keys: [lookup], limit: 1 })).data[0];
  if (existing) {
    if (!existing.active || existing.unit_amount !== params.unit_amount || existing.currency !== "gbp" || (existing.recurring?.interval || null) !== (params.recurring?.interval || null)) throw new Error(`Existing price ${lookup} does not match the expected offer.`);
    return existing;
  }
  return stripe.prices.create({ ...params, lookup_key: lookup }, { idempotencyKey: `gsg-price-${lookup}` });
}
const hostProduct = await product("host", "GuestSetGo Host", "Guest guide hosting per property; house photos, numbered instructions and self-service updates. Welcome folder conversion is sold separately.");
const agencyProduct = await product("agency", "GuestSetGo Agency", "Guest guide hosting for portfolios of five or more properties");
const assistedProduct = await product("assisted_v2", "GuestSetGo welcome folder conversion", "Separate £79-per-property setup service. Folder-page, brochure and card uploads, AI conversion and preparation help unlock after payment. Hosting is purchased separately.");
const hostMonthly = await price("gsg_host_6_monthly", { product: hostProduct.id, currency: "gbp", unit_amount: 600, recurring: { interval: "month" } });
const hostAnnual = await price("gsg_host_60_annual", { product: hostProduct.id, currency: "gbp", unit_amount: 6000, recurring: { interval: "year" } });
const agency = await price("gsg_agency_4_monthly", { product: agencyProduct.id, currency: "gbp", unit_amount: 400, recurring: { interval: "month" } });
const assisted = await price("gsg_assisted_79_v2", { product: assistedProduct.id, currency: "gbp", unit_amount: 7900 });

// Separate portals enforce the Agency minimum without restricting one-property hosts.
async function portal(tag, productId, prices, minimum) {
  const existing = await stripe.billingPortal.configurations.list({ limit: 100 });
  const found = existing.data.find((c) => c.metadata?.gsg === tag);
  const params = { metadata: { gsg: tag }, business_profile: { headline: "Manage your GuestSetGo hosting" }, features: {
    customer_update: { enabled: true, allowed_updates: ["email", "address", "name"] },
    invoice_history: { enabled: true }, payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: "at_period_end" },
    subscription_update: { enabled: true, default_allowed_updates: ["price", "quantity"], proration_behavior: "create_prorations", products: [
      { product: productId, prices, adjustable_quantity: { enabled: true, minimum, maximum: 500 } },
      ...(minimum === 1 ? [{ product: agencyProduct.id, prices: [agency.id], adjustable_quantity: { enabled: true, minimum: 5, maximum: 500 } }] : [{ product: hostProduct.id, prices: [hostMonthly.id, hostAnnual.id], adjustable_quantity: { enabled: true, minimum: 1, maximum: 500 } }]),
    ] },
  } };
  return found ? stripe.billingPortal.configurations.update(found.id, params) : stripe.billingPortal.configurations.create(params, { idempotencyKey: `gsg-portal-${tag}` });
}
const hostPortal = await portal("host_v2", hostProduct.id, [hostMonthly.id, hostAnnual.id], 1);
const agencyPortal = await portal("agency_v2", agencyProduct.id, [agency.id], 5);
const values = {
  STRIPE_PRICE_HOST_MONTHLY: hostMonthly.id, STRIPE_PRICE_HOST_ANNUAL: hostAnnual.id,
  STRIPE_PRICE_AGENCY_MONTHLY: agency.id, STRIPE_PRICE_ASSISTED: assisted.id,
  STRIPE_PORTAL_HOST: hostPortal.id, STRIPE_PORTAL_AGENCY: agencyPortal.id,
};
if (process.argv.includes("--write-env")) {
  let env = readFileSync(".env.local", "utf8");
  for (const [name, value] of Object.entries(values)) {
    const pattern = new RegExp(`^${name}=.*$`, "m");
    env = pattern.test(env) ? env.replace(pattern, `${name}=${value}`) : `${env.trimEnd()}\n${name}=${value}\n`;
  }
  writeFileSync(".env.local", env);
  console.log("Updated catalog and .env.local (no secrets printed).");
} else {
  for (const [name, value] of Object.entries(values)) console.log(`${name}=${value}`);
}
console.log("Host £6/month or £60/year; Agency £4/property/month (minimum five); assisted setup £79 once. Existing subscriptions untouched.");
