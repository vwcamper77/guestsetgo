import test from "node:test";
import assert from "node:assert/strict";
import { checkoutClientId, purchaseDetails, purchasePayload, sendStripePurchase } from "../lib/ga4-purchase.mjs";

const session = { id: "cs_test", payment_status: "paid", amount_total: 3950, currency: "gbp", metadata: { ga_client_id: "123.456" } };
const checkout = (object = session) => ({ type: "checkout.session.completed", data: { object } });
const invoice = (overrides = {}) => ({ type: "invoice.paid", data: { object: { id: "in_test", billing_reason: "subscription_cycle", amount_paid: 450, amount_due: 600, currency: "usd", parent: { subscription_details: { metadata: { ga_client_id: "123.456" } } }, ...overrides } } });
const env = { GA4_MEASUREMENT_ID: "G-TEST", GA4_API_SECRET: "test-secret" };

test("Checkout purchase payload uses paid total, session ID and cookie client ID", () => {
  assert.deepEqual(purchasePayload(purchaseDetails(checkout())), {
    client_id: "123.456", events: [{ name: "purchase", params: { transaction_id: "cs_test", value: 39.5, currency: "GBP" } }],
  });
});

test("renewal payload uses amount actually paid and invoice ID in both Stripe metadata formats", () => {
  const expected = { client_id: "123.456", events: [{ name: "purchase", params: { transaction_id: "in_test", value: 4.5, currency: "USD" } }] };
  assert.deepEqual(purchasePayload(purchaseDetails(invoice())), expected);
  assert.deepEqual(purchasePayload(purchaseDetails(invoice({ parent: null, subscription_details: { metadata: { ga_client_id: "123.456" } } }))), expected);
});

test("cookie parsing matches only _ga and falls back to random IDs for missing or malformed cookies", () => {
  assert.equal(checkoutClientId("other=value; _ga=GA1.2.123.456; _ga_STREAM=ignored"), "123.456");
  assert.equal(checkoutClientId("_ga=GA1.1.123%2E456"), "123.456");
  const ids = ["", "_ga_STREAM=GA1.1.123.456", "_ga=%broken", "_ga=invalid"].map(checkoutClientId);
  for (const id of ids) assert.match(id, /^[0-9a-f-]{36}$/);
  assert.equal(new Set(ids).size, ids.length);
});

test("zero payments, unpaid sessions, initial invoices, one-off invoices and failed invoices never send", async () => {
  const skipped = [checkout({ ...session, amount_total: 0 }), checkout({ ...session, payment_status: "unpaid" }), invoice({ amount_paid: 0 }), invoice({ billing_reason: "subscription_create" }), invoice({ billing_reason: "manual" }), { ...invoice(), type: "invoice.payment_failed" }];
  for (const event of skipped) await sendStripePurchase(event, { env, fetchImpl: () => assert.fail("unexpected GA request"), getFallbackClientId: () => assert.fail("unexpected fallback") });
  for (const amount of [null, undefined, -1, NaN, 1.5]) assert.equal(purchasePayload({ id: "cs", amount, currency: "gbp" }), null);
});

test("Measurement Protocol request uses server environment and repeat deliveries have identical payloads", async () => {
  const calls = [];
  const options = { env, fetchImpl: async (url, init) => { calls.push({ url, init }); return { ok: true }; } };
  await sendStripePurchase(checkout(), options);
  await sendStripePurchase({ ...checkout(), type: "checkout.session.async_payment_succeeded" }, options);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.origin + calls[0].url.pathname, "https://www.google-analytics.com/mp/collect");
  assert.equal(calls[0].url.searchParams.get("measurement_id"), env.GA4_MEASUREMENT_ID);
  assert.equal(calls[0].url.searchParams.get("api_secret"), env.GA4_API_SECRET);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.body, calls[1].init.body);
  assert.ok(calls[0].init.signal instanceof AbortSignal);
});

test("legacy purchases reuse persisted fallback client IDs on retry", async () => {
  const ids = new Map(), payloads = [];
  const options = { env, getFallbackClientId: async (id) => {
    if (!ids.has(id)) ids.set(id, checkoutClientId());
    return ids.get(id);
  }, fetchImpl: async (_, init) => { payloads.push(JSON.parse(init.body)); return { ok: true }; } };
  const event = checkout({ ...session, metadata: {} });
  await sendStripePurchase(event, options);
  await sendStripePurchase(event, options);
  assert.match(payloads[0].client_id, /^[0-9a-f-]{36}$/);
  assert.deepEqual(payloads[0], payloads[1]);
});

test("missing environment disables sends and GA errors do not escape or expose secrets", async () => {
  for (const missing of [{}, { GA4_MEASUREMENT_ID: "G-TEST" }, { GA4_API_SECRET: "secret" }]) {
    await sendStripePurchase(checkout(), { env: missing, fetchImpl: () => assert.fail("unexpected GA request") });
  }
  const logs = [], logger = { warn: (...args) => logs.push(args) };
  await sendStripePurchase(checkout(), { env, logger, fetchImpl: async () => { throw new Error(env.GA4_API_SECRET); } });
  await sendStripePurchase(checkout(), { env, logger, fetchImpl: async () => ({ ok: false, status: 503 }) });
  assert.equal(logs.length, 2);
  assert.ok(!JSON.stringify(logs).includes(env.GA4_API_SECRET));
});

test("signed webhook awaits analytics and persists the random legacy fallback across deliveries", async () => {
  const { readFile } = await import("node:fs/promises");
  const { randomUUID } = await import("node:crypto");
  const records = new Map(), payloads = [];
  let validSignature = true;
  const dependencies = {
    NextResponse: { json: (data, options = {}) => ({ data, status: options.status || 200 }) }, randomUUID,
    stripe: () => ({ webhooks: { constructEvent: () => {
      if (!validSignature) throw new Error("invalid signature");
      return checkout({ ...session, metadata: {} });
    } } }),
    db: () => ({ collection: (name) => ({ doc: (id) => `${name}/${id}` }), runTransaction: async (fn) => fn({
      get: async (ref) => ({ data: () => records.get(ref) }), set: (ref, data) => records.set(ref, data),
    }) }),
    sendStripePurchase: (event, options) => sendStripePurchase(event, { ...options, env, fetchImpl: async (_, init) => {
      payloads.push(JSON.parse(init.body)); return { ok: true };
    } }),
  };
  const key = `ga4_route_${randomUUID().replaceAll("-", "")}`;
  globalThis[key] = dependencies;
  try {
    const source = (await readFile(new URL("../app/api/stripe/webhook/route.js", import.meta.url), "utf8")).replace(/^import .*;\r?$/gm, "");
    const { POST } = await import(`data:text/javascript;base64,${Buffer.from(`const {${Object.keys(dependencies).join(",")}} = globalThis[${JSON.stringify(key)}];\n${source}`).toString("base64")}`);
    const req = () => new Request("https://example.invalid/webhook", { method: "POST", body: "signed" });
    assert.equal((await POST(req())).status, 200);
    assert.equal((await POST(req())).status, 200);
    assert.equal(records.size, 1);
    assert.deepEqual(payloads[0], payloads[1]);
    assert.equal(payloads[0].client_id, records.get("analyticsPurchases/cs_test").clientId);
    validSignature = false;
    assert.equal((await POST(req())).status, 400);
    assert.equal(payloads.length, 2);
  } finally { delete globalThis[key]; }
});
