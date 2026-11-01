import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { checkoutSelection, stripeCurrency, assertCheckoutPrice, portalConfiguration, planForConfiguredPrice } from "../lib/billing.mjs";
import { localisePrices, priceBook, money } from "../lib/currency.mjs";

const env = {};
for (const suffix of ["", "_USD"]) {
  for (const key of ["HOST_MONTHLY", "HOST_ANNUAL", "AGENCY_MONTHLY", "ASSISTED"]) env[`STRIPE_PRICE_${key}${suffix}`] = `price_${key}${suffix}`;
  for (const key of ["HOST", "AGENCY"]) env[`STRIPE_PORTAL_${key}${suffix}`] = `bpc_${key}${suffix}`;
}
async function load(path, dependencies) {
  const source = (await readFile(new URL(path, import.meta.url), "utf8")).replace(/^import .*;\r?$/gm, "");
  const key = `currency_test_${Math.random().toString(36).slice(2)}`;
  globalThis[key] = dependencies;
  try { return await import(`data:text/javascript;base64,${Buffer.from(`const {${Object.keys(dependencies).join(",")}} = globalThis[${JSON.stringify(key)}];\n${source}`).toString("base64")}`); }
  finally { delete globalThis[key]; }
}
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const request = (body) => new Request("https://preview.example/api/stripe/checkout", { method: "POST", body: JSON.stringify(body) });

test("every GBP and USD offer selects its own price; USD never falls back to GBP", () => {
  for (const currency of ["GBP", "USD"]) for (const [plan, interval, key] of [["host", "month", "HOST_MONTHLY"], ["host", "year", "HOST_ANNUAL"], ["agency", "month", "AGENCY_MONTHLY"], ["assisted", "month", "ASSISTED"]]) {
    const choice = checkoutSelection({ plan, interval, currency }, env);
    assert.equal(choice.price, env[`STRIPE_PRICE_${key}${currency === "USD" ? "_USD" : ""}`]);
    assert.equal(choice.currency, currency);
    assert.equal(choice.quantity, plan === "agency" ? 5 : 1);
  }
  assert.throws(() => checkoutSelection({ plan: "host", currency: "USD" }, { STRIPE_PRICE_HOST_MONTHLY: "price_gbp" }), /configured/);
  for (const currency of ["EUR", "usd", "", null]) if (currency !== null) assert.throws(() => checkoutSelection({ plan: "host", currency }, env), /GBP or USD/);
  assert.equal(checkoutSelection({ plan: "host" }, env).currency, "GBP");
});

test("both currency price IDs map to hosting entitlements and portals fail closed", () => {
  for (const currency of ["GBP", "USD"]) {
    const suffix = currency === "USD" ? "_USD" : "";
    for (const interval of ["MONTHLY", "ANNUAL"]) assert.equal(planForConfiguredPrice(env[`STRIPE_PRICE_HOST_${interval}${suffix}`], env), "host");
    assert.equal(planForConfiguredPrice(env[`STRIPE_PRICE_AGENCY_MONTHLY${suffix}`], env), "agency");
    assert.equal(planForConfiguredPrice(env[`STRIPE_PRICE_ASSISTED${suffix}`], env), null);
    assert.equal(portalConfiguration("agency", currency, env), env[`STRIPE_PORTAL_AGENCY${suffix}`]);
  }
  assert.equal(planForConfiguredPrice(undefined, {}), null);
  assert.equal(planForConfiguredPrice("price_unknown", env), null);
  assert.throws(() => portalConfiguration("host", "USD", { STRIPE_PORTAL_HOST: "bpc_gbp" }), /configured/);
  assert.throws(() => portalConfiguration("host", "eur", env), /not supported/);
});

test("US geo detection, locale fallback and private responses", async () => {
  const route = await load("../app/api/visitor-currency/route.js", { NextResponse: { json: (data, options) => ({ data, ...options }) } });
  assert.equal(route.suggestedCurrency("US", "en-GB"), "USD");
  assert.equal(route.suggestedCurrency("GB", "en-US"), "GBP");
  assert.equal(route.suggestedCurrency(null, "en-US,en;q=0.9"), "USD");
  assert.equal(route.suggestedCurrency(null, "fr-FR,en-US;q=0.5"), "GBP");
  const result = await route.GET(new Request("https://example.test", { headers: { "x-vercel-ip-country": "US" } }));
  assert.equal(result.data.currency, "USD");
  assert.match(result.headers["Cache-Control"], /private, no-store/);
});

test("fixed local price books show accurate annual savings and first-year totals", () => {
  const usd = priceBook("USD");
  assert.equal(usd.hostMonthly * 12 - usd.hostAnnual, usd.annualSaving);
  assert.equal(usd.agencyMonthly * 5, usd.minimumAgency);
  assert.equal(money(usd.assisted + usd.hostAnnual, "USD"), "$179");
  assert.equal(localisePrices("£6 £60 £4 £20 £79 £139 £12", "USD"), "$8 $80 $5 $25 $99 $179 $16");
  assert.equal(localisePrices("£600", "USD"), "£600");
  assert.equal(localisePrices("£6", "GBP"), "£6");
});

test("actual checkout handler charges selected currency and rejects cross-currency accounts", async () => {
  const previous = { ...process.env };
  Object.assign(process.env, env);
  let customerCurrency = null, priceCurrency = "usd", captured;
  const account = { stripeCustomerId: "cus_existing" };
  try {
    const route = await load("../app/api/stripe/checkout/route.js", {
      db: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ data: () => account }) }) }) }),
      handle: fn => fn, ok: v => v, requireUser: async () => ({ uid: "u1" }),
      requireProperty: async () => ({ data: { ownerUid: "u1" } }), HttpError, checkoutSelection, stripeCurrency, assertCheckoutPrice,
      randomBytes: () => Buffer.alloc(8), stripe: () => ({
        customers: { retrieve: async () => ({ currency: customerCurrency }) },
        subscriptions: { retrieve: async () => ({ currency: "gbp" }) },
        prices: { retrieve: async id => ({ active: true, currency: priceCurrency, unit_amount: id.includes("ASSISTED") ? 9900 : id.includes("ANNUAL") ? 8000 : id.includes("AGENCY") ? 500 : 800, recurring: id.includes("ASSISTED") ? null : { interval: id.includes("ANNUAL") ? "year" : "month", interval_count: 1 } }) },
        checkout: { sessions: { create: async params => { captured = params; return { url: "https://checkout.stripe.com/example" }; } } },
      }),
    });
    for (const [plan, interval, quantity] of [["host", "month", 2], ["host", "year", 3], ["agency", "month", 5], ["assisted", "month", 1]]) {
      await route.POST(request({ plan, interval, quantity, currency: "USD", propertyId: "p1" }));
      assert.equal(captured.currency, "usd");
      assert.equal(captured.adaptive_pricing.enabled, false);
      assert.equal(captured.line_items[0].quantity, quantity);
      assert.ok(captured.line_items[0].price.endsWith("_USD"));
      assert.equal(captured.metadata.currency, "USD");
    }
    customerCurrency = "gbp";
    await assert.rejects(route.POST(request({ plan: "host", currency: "USD" })), e => e.status === 409);
    customerCurrency = null; priceCurrency = "gbp";
    await assert.rejects(route.POST(request({ plan: "host", currency: "USD" })), e => e.status === 503);
    account.subscriptionId = "sub_gbp"; account.subscriptionStatus = "active";
    await assert.rejects(route.POST(request({ plan: "assisted", currency: "USD", propertyId: "p1" })), e => e.status === 409);
    await assert.rejects(route.POST(request({ plan: "host", currency: "GBP" })), /already have/);
  } finally { for (const key of Object.keys(env)) previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key]; }
});

test("actual portal uses Stripe subscription currency and plan, ignoring stale account and request", async () => {
  const previous = { ...process.env };
  Object.assign(process.env, env);
  const account = { stripeCustomerId: "cus_existing", subscriptionId: "sub_existing", plan: "host", billingCurrency: "USD" };
  let currency = "gbp", plan = "agency", captured;
  try {
    const route = await load("../app/api/stripe/portal/route.js", {
      db: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ data: () => account }) }) }) }),
      handle: fn => fn, ok: v => v, requireUser: async () => ({ uid: "u1" }), HttpError, portalConfiguration, stripeCurrency,
      planForPrice: () => plan,
      stripe: () => ({ subscriptions: { retrieve: async () => ({ customer: "cus_existing", currency, items: { data: [{ price: { id: "price_real" } }] } }) }, customers: { retrieve: async () => ({ currency: "gbp" }) }, billingPortal: { sessions: { create: async params => { captured = params; return { url: "https://billing.stripe.com/example" }; } } } }),
    });
    await route.POST(request({ currency: "USD" }));
    assert.equal(captured.configuration, "bpc_AGENCY");
    currency = "usd"; plan = "host";
    await route.POST(request({ currency: "GBP" }));
    assert.equal(captured.configuration, "bpc_HOST_USD");
    delete process.env.STRIPE_PORTAL_HOST_USD;
    await assert.rejects(route.POST(request({})), e => e.status === 503);
  } finally { for (const key of Object.keys(env)) previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key]; }
});

test("webhooks retain GBP and USD entitlements through payment failure and cancellation", async () => {
  for (const currency of ["gbp", "usd"]) {
    let account = {}, event;
    const sub = { id: "sub_real", customer: "cus_real", currency, metadata: { uid: "u1" }, status: "active", latest_invoice: { status: "paid" }, items: { data: [{ price: { id: env[`STRIPE_PRICE_HOST_ANNUAL${currency === "usd" ? "_USD" : ""}`], currency, recurring: { interval: "year" } }, quantity: 2, current_period_end: 1800000000 }] } };
    const { subscriptionPeriodEnd, subscriptionWillCancel, invoiceSubscription } = await import("../lib/billing.mjs");
    const route = await load("../app/api/stripe/webhook/route.js", {
      NextResponse: { json: (data, opts = {}) => ({ data, status: opts.status || 200 }) }, FieldValue: { serverTimestamp: () => "now" },
      db: () => ({ collection: name => name === "users" ? { doc: () => ({ get: async () => ({ data: () => account }), set: async patch => { account = { ...account, ...patch }; } }) } : { where: () => ({ where: () => ({ get: async () => ({ size: 0, docs: [] }) }) }) } }),
      stripe: () => ({ webhooks: { constructEvent: () => event }, subscriptions: { retrieve: async () => sub } }),
      planForPrice: id => planForConfiguredPrice(id, env), allowance: a => a.quantity || 0, subscriptionPeriodEnd, subscriptionWillCancel, invoiceSubscription,
    });
    const post = () => route.POST(new Request("https://example.test/webhook", { method: "POST", body: "signed-event-fixture" }));
    event = { type: "customer.subscription.updated", data: { object: sub } };
    assert.equal((await post()).status, 200);
    assert.equal(account.plan, "host"); assert.equal(account.quantity, 2); assert.equal(account.billingCurrency, currency.toUpperCase());
    assert.equal(account.subscriptionPaymentConfirmed, true); assert.equal(account.billingInterval, "year");
    sub.status = "past_due"; sub.latest_invoice.status = "open";
    await post(); assert.equal(account.subscriptionPaymentConfirmed, true); assert.equal(account.subscriptionId, "sub_real");
    sub.status = "canceled"; event.type = "customer.subscription.deleted";
    await post(); assert.equal(account.subscriptionId, null); assert.equal(account.quantity, 0); assert.equal(account.plan, null);
    assert.equal(account.billingCurrency, currency.toUpperCase());
  }
});

test("billing account response resolves legacy and stale currencies from Stripe", async () => {
  let currency = "gbp";
  const account = { email: "host@example.invalid", stripeCustomerId: "cus_real", subscriptionId: "sub_real", billingCurrency: "USD" };
  const { GET } = await load("../app/api/me/route.js", {
    FieldValue: {}, plain: v => v, handle: fn => fn, ok: v => v, requireUser: async () => ({ uid: "u1", email: account.email }),
    db: () => ({ collection: name => name === "users" ? { doc: () => ({ get: async () => ({ exists: true, data: () => account }) }) } : { where: () => ({ where: () => ({ count: () => ({ get: async () => ({ data: () => ({ count: 0 }) }) }) }) }) } }),
    stripe: () => ({ customers: { retrieve: async () => ({ currency: "gbp" }) }, subscriptions: { retrieve: async () => ({ currency }) } }),
    stripeCurrency, allowance: () => 2, planLabel: () => "Host",
  });
  assert.equal((await GET(new Request("https://example.test/api/me?billing=1"))).account.billingCurrency, "GBP");
  currency = "usd";
  assert.equal((await GET(new Request("https://example.test/api/me?billing=1"))).account.billingCurrency, "USD");
});
