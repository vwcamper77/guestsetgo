// Creates the GuestSetGo products and prices in your Stripe account and prints the env lines to copy.
// Usage: STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Set STRIPE_SECRET_KEY first, e.g. STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup");
  process.exit(1);
}
const stripe = new Stripe(key);

async function findOrCreateProduct(lookup, name, description) {
  const found = await stripe.products.search({ query: `metadata['gsg']:'${lookup}'` }).catch(() => ({ data: [] }));
  if (found.data[0]) return found.data[0];
  return stripe.products.create({ name, description, metadata: { gsg: lookup } });
}

async function findOrCreatePrice(lookup, params) {
  const found = await stripe.prices.list({ lookup_keys: [lookup], limit: 1 });
  if (found.data[0]) return found.data[0];
  return stripe.prices.create({ ...params, lookup_key: lookup });
}

const setupProduct = await findOrCreateProduct("setup", "Guidebook set-up", "One guidebook written and set up, hosted for 12 months");
const hostProduct = await findOrCreateProduct("host", "Host plan", "Live guidebook per property, unlimited updates");
const agencyProduct = await findOrCreateProduct("agency", "Agency plan", "Branded guidebooks per property for letting agents");

const setup = await findOrCreatePrice("gsg_setup_79", { product: setupProduct.id, currency: "gbp", unit_amount: 7900 });
const host = await findOrCreatePrice("gsg_host_6_monthly", { product: hostProduct.id, currency: "gbp", unit_amount: 600, recurring: { interval: "month" } });
const agency = await findOrCreatePrice("gsg_agency_4_monthly", { product: agencyProduct.id, currency: "gbp", unit_amount: 400, recurring: { interval: "month" } });

const coupon = await stripe.coupons.retrieve("FOUNDING").catch(() => null)
  || await stripe.coupons.create({ id: "FOUNDING", name: "Founding host", amount_off: 7900, currency: "gbp", duration: "once", max_redemptions: 10 });
const promo = (await stripe.promotionCodes.list({ code: "FOUNDING10", limit: 1 })).data[0]
  || await stripe.promotionCodes.create({ coupon: coupon.id, code: "FOUNDING10" });

console.log("\nAdd these to Vercel (and .env.local):\n");
console.log(`STRIPE_PRICE_SETUP=${setup.id}`);
console.log(`STRIPE_PRICE_HOST_MONTHLY=${host.id}`);
console.log(`STRIPE_PRICE_AGENCY_MONTHLY=${agency.id}`);
console.log(`\nPromotion code for founding hosts: ${promo.code} (takes £79 off the first payment, 10 uses)\n`);
