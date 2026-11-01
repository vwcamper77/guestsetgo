import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { checkoutSelection, stripeCurrency, assertCheckoutPrice, subscriptionPeriodEnd, subscriptionWillCancel, invoiceSubscription } from "../lib/billing.mjs";
import { validateImages, importableFields, mergeImport, IMPORT_PROMPT } from "../lib/manual-import.mjs";
import { arrivalValidation } from "../lib/arrival.mjs";

const env = { STRIPE_PRICE_HOST_MONTHLY: "price_host", STRIPE_PRICE_HOST_ANNUAL: "price_annual", STRIPE_PRICE_AGENCY_MONTHLY: "price_agency", STRIPE_PRICE_ASSISTED: "price_assisted" };
async function moduleFromFile(path, dependencies = {}) {
  dependencies = { arrivalValidation, ...dependencies };
  const key = `test_${Math.random().toString(36).slice(2)}`;
  globalThis[key] = dependencies;
  const source = (await readFile(new URL(path, import.meta.url), "utf8")).replace(/^import .*;\r?$/gm, "");
  return import(`data:text/javascript;base64,${Buffer.from(`const {${Object.keys(dependencies).join(",")}} = globalThis[${JSON.stringify(key)}];\n${source}`).toString("base64")}`);
}
const plans = await moduleFromFile("../lib/plans.js");
const { sanitise } = await moduleFromFile("../lib/property-defaults.js");
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lL8AAAAASUVORK5CYII=";

test("monthly/annual checkout has only the selected recurring price; assisted is one-time", () => {
  assert.deepEqual(checkoutSelection({ plan: "host", quantity: 2, interval: "year" }, env), { plan: "host", quantity: 2, interval: "year", price: "price_annual", currency: "GBP", mode: "subscription" });
  assert.equal(checkoutSelection({ plan: "host" }, env).price, "price_host");
  assert.equal(checkoutSelection({ plan: "assisted", quantity: 99 }, env).quantity, 1);
  assert.equal(checkoutSelection({ plan: "assisted" }, env).mode, "payment");
});
test("checkout rejects legacy plans, fractional/invalid quantities and missing prices", () => {
  for (const body of [{plan:"starter"}, {plan:"__proto__"}, {plan:"agency",quantity:4}, {plan:"agency",interval:"year"}, {plan:"host",quantity:1.5}, {plan:"host",quantity:501}, {plan:"host",interval:"weekly"}]) assert.throws(() => checkoutSelection(body, env));
  assert.throws(() => checkoutSelection({ plan: "host", interval: "year" }, {}), /configured/);
});
test("trial expires, cannot stack with paid hosting, and legacy Starter remains valid", () => {
  assert.equal(plans.allowance({ trialEndsAt: new Date(Date.now() + 864e5) }), 1);
  assert.equal(plans.allowance({ trialEndsAt: { toMillis: () => Date.now() + 864e5 } }), 1);
  assert.equal(plans.allowance({ trialEndsAt: new Date(Date.now() - 1) }), 0);
  assert.equal(plans.allowance({ plan: "host", subscriptionStatus: "active", quantity: 2, trialEndsAt: new Date(Date.now() + 864e5) }), 2);
  assert.equal(plans.allowance({ plan: "host", subscriptionStatus: "active", quantity: 2, subscriptionPaymentConfirmed: false }), 0);
  assert.equal(plans.allowance({ starterPaidAt: new Date(), starterCredits: 1 }), 1);
  assert.equal(plans.allowance({ starterPaidAt: new Date(Date.now() - 366 * 864e5) }), 0);
});
test("old and current Stripe invoice/period formats are supported", () => {
  assert.equal(invoiceSubscription({ subscription: "sub_old" }), "sub_old");
  assert.equal(invoiceSubscription({ parent: { subscription_details: { subscription: "sub_new" } } }), "sub_new");
  assert.equal(subscriptionPeriodEnd({ items: { data: [{ current_period_end: 123 }] } }), 123);
  assert.equal(subscriptionWillCancel({ cancel_at_period_end: false, cancel_at: 123 }), true);
  assert.equal(subscriptionPeriodEnd({ cancel_at: 100, items: { data: [{ current_period_end: 123 }] } }), 100);
  assert.equal(subscriptionWillCancel({ cancel_at_period_end: false, cancel_at: null }), false);
});
test("imports validate image bytes, batch limits and reject remote URLs", () => {
  assert.equal(validateImages([png])[0].mime, "image/png");
  for (const images of [[], Array(9).fill(png), ["https://example.com/photo.jpg"], ["data:image/png;base64," + Buffer.from("not really a png file at all").toString("base64")]]) assert.throws(() => validateImages(images));
});
test("AI result cannot import publishing, payment or unexpected account fields", () => {
  const draft = sanitise(importableFields({ published: true, ownerUid: "attacker", assistancePaidAt: "today", wifiName: "Guest", picks: [{ name: "Museum", dest: "Town" }] }));
  assert.deepEqual(Object.keys(draft).sort(), ["picks", "wifiName"]);
  assert.equal(draft.picks[0].mins, 0);
  assert.match(IMPORT_PROMPT, /never invent/);
});

test("applying an import preserves unselected content and appends without silently truncating", () => {
  const property = { wifiName: "Existing", houseInfo: [{ title: "Bins", body: "Monday" }] };
  const draft = { wifiName: "New", houseInfo: [{ title: "Heating", body: "Read panel" }], published: true };
  const patch = mergeImport(property, draft, { houseInfo: true, published: true });
  assert.equal(patch.wifiName, undefined);
  assert.equal(patch.published, undefined);
  assert.equal(patch.houseInfo.length, 2);
  assert.equal(property.houseInfo.length, 1);
  assert.throws(() => mergeImport({ houseInfo: Array(30).fill({}) }, draft, { houseInfo: true }), /exceed/);
});

test("actual checkout handler does not attach a setup fee or accept legacy coupon codes", async () => {
  const previous = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
  Object.assign(process.env, env);
  try {
    let captured;
    const account = { stripeCustomerId: "cus_test" };
    const route = await moduleFromFile("../app/api/stripe/checkout/route.js", {
      db: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ data: () => account }) }) }) }),
      handle: (fn) => fn, ok: (data) => data, requireUser: async () => ({ uid: "host1", email: "host@example.invalid" }),
      requireProperty: async () => ({ data: { ownerUid: "host1" } }), HttpError, checkoutSelection, stripeCurrency, assertCheckoutPrice,
      randomBytes: () => Buffer.alloc(8), stripe: () => ({ customers: { retrieve: async () => ({ currency: "gbp" }) }, prices: { retrieve: async (id) => ({ active: true, currency: "gbp", unit_amount: id === "price_assisted" ? 7900 : id === "price_annual" ? 6000 : 600, recurring: id === "price_assisted" ? null : { interval: id === "price_annual" ? "year" : "month", interval_count: 1 } }) }, checkout: { sessions: { create: async (params) => { captured = params; return { url: "https://checkout.stripe.com/test" }; } } } }),
    });
    const request = (body) => new Request("http://localhost/api/stripe/checkout", { method: "POST", body: JSON.stringify(body) });
    await route.POST(request({ plan: "host", interval: "year", quantity: 2 }));
    assert.deepEqual(captured.line_items, [{ price: "price_annual", quantity: 2 }]);
    assert.equal(captured.allow_promotion_codes, undefined);
    assert.equal(captured.subscription_data.metadata.interval, "year");
    await route.POST(request({ plan: "assisted", propertyId: "property1" }));
    assert.equal(captured.mode, "payment");
    assert.equal(captured.metadata.propertyId, "property1");
    assert.equal(captured.subscription_data, undefined);
    account.subscriptionId = "sub_existing"; account.subscriptionStatus = "active";
    await assert.rejects(route.POST(request({ plan: "host" })), /already have/);
  } finally { for (const [k, v] of Object.entries(previous)) v === undefined ? delete process.env[k] : process.env[k] = v; }
});

test("actual import handler sanitises AI results without writing or publishing the property", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only-not-a-real-key";
  let providerCalls = 0;
  let count = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { providerCalls++; return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ draft: { wifiName: "Guest Wi-Fi", published: true, ownerUid: "other", picks: [{ name: "Harbour Cafe", dest: "Folkestone" }] }, warnings: ["Photo 2: check opening hours"] }) } }] }) }; };
  try {
    const route = await moduleFromFile("../app/api/properties/[id]/import/route.js", {
      FieldValue: { serverTimestamp: () => "now" },
      db: () => ({ collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({}) }) }) }), runTransaction: async (fn) => fn({ get: async () => ({ data: () => ({ count }) }), set: (_, data) => { count = data.count; } }) }),
      handle: (fn) => fn, ok: (data) => data, requireUser: async () => ({ uid: "host1" }),
      requireProperty: async () => ({ ref: {}, data: { ownerUid: "host1", assistancePaidAt: "paid" } }), HttpError,
      plain: (data) => data, privateBucket: () => { throw new Error("Self-service originals must not be stored"); }, sanitise, validateImages, importableFields, IMPORT_PROMPT,
    });
    const req = (body) => new Request("http://localhost/import", { method: "POST", body: JSON.stringify(body) });
    const result = await route.POST(req({ action: "draft", images: [png] }), { params: { id: "property1" } });
    assert.equal(result.draft.wifiName, "Guest Wi-Fi");
    assert.equal(result.draft.published, undefined);
    assert.equal(result.draft.ownerUid, undefined);
    assert.equal(result.warnings.length, 1);
    assert.equal(providerCalls, 1);
    await assert.rejects(route.POST(req({ action: "draft_assisted" }), { params: { id: "property1" } }), /Admins only/);
    count = 10;
    await assert.rejects(route.POST(req({ action: "draft", images: [png] }), { params: { id: "property1" } }), /ten photo/);
    assert.equal(providerCalls, 1);
  } finally { globalThis.fetch = realFetch; previousKey === undefined ? delete process.env.OPENAI_API_KEY : process.env.OPENAI_API_KEY = previousKey; }
});

test("unpaid folder conversion rejects every API action before processing photos or contacting AI", async () => {
  const route = await moduleFromFile("../app/api/properties/[id]/import/route.js", {
    FieldValue: {}, db: () => { throw new Error("Unpaid requests must not use the database"); },
    handle: (fn) => fn, ok: (v) => v, requireUser: async () => ({ uid: "host1", isAdmin: true }),
    requireProperty: async () => ({ ref: {}, data: { ownerUid: "host1" } }), HttpError,
    plain: (v) => v, privateBucket: () => { throw new Error("Unpaid requests must not use storage"); }, sanitise, validateImages, importableFields, IMPORT_PROMPT,
  });
  for (const action of ["draft", "assisted", "draft_assisted"]) {
    await assert.rejects(route.POST(new Request("http://localhost/import", { method: "POST", body: JSON.stringify({ action, images: [png] }) }), { params: { id: "property1" } }), (e) => e.status === 402);
  }
  await assert.rejects(route.GET(new Request("http://localhost/import"), { params: { id: "property1" } }), (e) => e.status === 402);
});

test("assisted webhook grants no hosting and retries do not duplicate payment records", async () => {
  const documents = new Map([["properties/property1", { ownerUid: "host1" }]]);
  const db = () => ({ collection: (name) => ({ doc: (id) => {
    const key = `${name}/${id}`;
    return { get: async () => ({ exists: documents.has(key), data: () => documents.get(key) }), set: async (value) => documents.set(key, { ...documents.get(key), ...value }) };
  } }) });
  let event;
  const route = await moduleFromFile("../app/api/stripe/webhook/route.js", {
    NextResponse: { json: (data, options = {}) => ({ data, status: options.status || 200 }) },
    FieldValue: { serverTimestamp: () => "now" }, db,
    stripe: () => ({ webhooks: { constructEvent: () => event } }), planForPrice: () => null,
    allowance: plans.allowance, subscriptionPeriodEnd, invoiceSubscription,
  });
  const session = { id: "cs_assisted", mode: "payment", customer: "cus_test", client_reference_id: "host1", payment_status: "unpaid", payment_intent: "pi_assisted", created: 1700000000, amount_total: 7900, currency: "gbp", metadata: { plan: "assisted", propertyId: "property1" } };
  const req = () => new Request("http://localhost/webhook", { method: "POST", body: "signed" });
  event = { type: "checkout.session.completed", data: { object: session } };
  await route.POST(req());
  assert.equal(documents.get("properties/property1").assistancePaidAt, undefined);
  session.payment_status = "paid";
  event.type = "checkout.session.async_payment_succeeded";
  await route.POST(req()); await route.POST(req());
  assert.equal(documents.get("properties/property1").assistancePaymentId, "pi_assisted");
  assert.equal(plans.allowance(documents.get("users/host1")), 0);
  assert.equal([...documents.keys()].filter((k) => k.startsWith("payments/")).length, 1);
});

test("publishing starts the trial once and does not restart an expired trial", async () => {
  let account = {};
  let property = { ownerUid: "host1", published: false, slug: "cottage" };
  const ownerRef = { kind: "owner" };
  const propertyRef = { kind: "property", get: async () => ({ data: () => property }), update: async (patch) => { property = { ...property, ...patch }; } };
  const query = { kind: "query" };
  query.where = () => query;
  const route = await moduleFromFile("../app/api/properties/[id]/route.js", {
    FieldValue: { serverTimestamp: () => "now" }, Timestamp: { now: () => new Date(), fromMillis: (v) => new Date(v) },
    db: () => ({ collection: (name) => name === "users" ? { doc: () => ownerRef } : query,
      runTransaction: async (fn) => fn({ get: async (ref) => ref === ownerRef ? { data: () => account } : { size: 0 }, set: (_, patch) => { account = { ...account, ...patch }; }, update: (_, patch) => { property = { ...property, ...patch }; } }),
    }),
    plain: (v) => v, handle: (fn) => fn, ok: (v) => v, requireUser: async () => ({ uid: "host1" }), requireProperty: async () => ({ ref: propertyRef, data: property }),
    HttpError, sanitise, allowance: plans.allowance, slugify: (v) => v, uniqueSlug: async (v) => v,
  });
  const publish = () => route.PUT(new Request("http://localhost/property", { method: "PUT", body: JSON.stringify({ published: true }) }), { params: { id: "property1" } });
  await publish();
  assert.equal(property.published, true);
  assert.ok(new Date(account.trialEndsAt).getTime() > Date.now() + 29 * 864e5);
  property.published = false;
  account.trialEndsAt = new Date(Date.now() - 1000);
  await assert.rejects(publish(), /Choose or upgrade/);
  assert.equal(property.published, false);
});

test("duplication creates an offline guide without copying payment, trial or usage entitlements", async () => {
  let saved;
  const { newProperty } = await moduleFromFile("../lib/property-defaults.js");
  const source = { name: "Original", ownerUid: "host1", published: true, wifiName: "Guest", assistancePaidAt: "paid", assistancePaymentId: "pi_original", viewCount: 99, photoGuides: [] };
  const route = await moduleFromFile("../app/api/properties/[id]/duplicate/route.js", {
    FieldValue: { serverTimestamp: () => "now" }, db: () => ({ collection: () => ({ doc: () => ({ id: "copy1", set: async (data) => { saved = data; } }) }) }),
    privateBucket: () => { throw new Error("No photos to copy"); }, randomUUID: () => "fixture",
    handle: (fn) => fn, ok: (v) => v, requireUser: async () => ({ uid: "host1" }), requireProperty: async () => ({ data: source }),
    sanitise, newProperty, uniqueSlug: async () => "original-copy",
  });
  await route.POST(new Request("http://localhost/duplicate", { method: "POST" }), { params: { id: "original" } });
  assert.equal(saved.published, false); assert.equal(saved.wifiName, "Guest");
  assert.equal(saved.assistancePaymentId, undefined); assert.equal(saved.assistancePaidAt, undefined); assert.equal(saved.viewCount, undefined);
});

test("arrival settings round-trip through the property API and invalid locations cannot overwrite them", async () => {
  let saved = { ownerUid: "host1", name: "Cottage", slug: "cottage", published: false };
  let writes = 0;
  const ref = { update: async (patch) => { saved = { ...saved, ...patch }; writes++; }, get: async () => ({ data: () => saved }) };
  const route = await moduleFromFile("../app/api/properties/[id]/route.js", {
    FieldValue: { serverTimestamp: () => "now" }, sanitise, arrivalValidation, HttpError,
    plain: v => v, handle: fn => fn, ok: v => v, requireUser: async () => ({ uid: "host1" }), requireProperty: async () => ({ ref, data: saved }),
  });
  const put = body => route.PUT(new Request("http://localhost/property", { method: "PUT", body: JSON.stringify(body) }), { params: { id: "property1" } });
  const arrival = { arrivalLocation: "51.5,-0.12", arrivalLandmark: "Sample Hotel, Sample Road", landmarkSteps: ["Turn right.", "Follow the road around the corner."], what3words: "///filled.count.soap" };
  const result = await put(arrival);
  for (const [key, value] of Object.entries(arrival)) assert.deepEqual(result.property[key], value);
  assert.equal(writes, 1);
  await assert.rejects(put({ arrivalLocation: "91,0" }), /valid coordinates/);
  await assert.rejects(put({ what3words: "https://evil.example/one.two.three" }), /three words/);
  assert.equal(writes, 1);
  assert.equal(saved.arrivalLocation, arrival.arrivalLocation);
  assert.deepEqual(sanitise({ landmarkSteps: ["a".repeat(500), null], ownerUid: "attacker" }), { landmarkSteps: ["a".repeat(300)] });
});

test("property photo accepts the existing upload format, bounds text and supports removal", () => {
  const img = "https://firebasestorage.googleapis.com/v0/b/example/o/front.jpg?alt=media";
  assert.deepEqual(sanitise({ propertyPhoto: { img, path: "uploads/host1/property1/front.jpg", alt: "Front entrance", ownerUid: "unexpected" } }), { propertyPhoto: { img, path: "uploads/host1/property1/front.jpg", alt: "Front entrance" } });
  assert.equal(sanitise({ propertyPhoto: { img, alt: "a".repeat(500) } }).propertyPhoto.alt.length, 200);
  for (const propertyPhoto of [null, {}, { img: "javascript:alert(1)" }, { img: "https://evil.example/photo.jpg" }]) assert.deepEqual(sanitise({ propertyPhoto }), { propertyPhoto: null });
});

test("duplicated guides receive their own front photo and clean it up if the new guide cannot be saved", async () => {
  const { newProperty } = await moduleFromFile("../lib/property-defaults.js");
  const img = "https://firebasestorage.googleapis.com/v0/b/example/o/front.jpg?alt=media";
  const source = { ownerUid: "host1", name: "Original", photoGuides: [], propertyPhoto: { img, path: "uploads/host1/original/front.jpg", alt: "Green door" } };
  let saved, failSave = false;
  const copies = [], deleted = [];
  const bucket = { name: "example", file: path => ({ copy: async target => copies.push([path, target.path]), path, setMetadata: async () => {}, delete: async () => deleted.push(path) }) };
  const route = await moduleFromFile("../app/api/properties/[id]/duplicate/route.js", {
    FieldValue: { serverTimestamp: () => "now" }, sanitise, newProperty, uniqueSlug: async () => "original-copy", randomUUID: () => "copy-photo",
    db: () => ({ collection: () => ({ doc: () => ({ id: "copy1", set: async data => { if (failSave) throw new Error("Save failed"); saved = data; } }) }) }),
    privateBucket: () => bucket, handle: fn => fn, ok: v => v, requireUser: async () => ({ uid: "host1" }), requireProperty: async () => ({ data: source }),
  });
  const duplicate = () => route.POST(new Request("http://localhost/duplicate", { method: "POST" }), { params: { id: "original" } });
  await duplicate();
  assert.deepEqual(copies[0], [source.propertyPhoto.path, "uploads/host1/copy1/copy-photo.jpg"]);
  assert.equal(saved.propertyPhoto.path, "uploads/host1/copy1/copy-photo.jpg");
  assert.notEqual(saved.propertyPhoto.img, source.propertyPhoto.img);
  assert.equal(saved.propertyPhoto.alt, "Green door");
  failSave = true;
  await assert.rejects(duplicate(), /Save failed/);
  assert.deepEqual(deleted, ["uploads/host1/copy1/copy-photo.jpg"]);
});
