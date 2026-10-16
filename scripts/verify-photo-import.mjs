// Optional live-provider smoke check with a synthetic photo, no production database writes.
// node --env-file=.env.local scripts/verify-photo-import.mjs
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { validateImages, importableFields, IMPORT_PROMPT } from "../lib/manual-import.mjs";

const propertySource = await readFile("lib/property-defaults.js", "utf8");
const { sanitise } = await import(`data:text/javascript;base64,${Buffer.from(propertySource).toString("base64")}`);
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
globalThis.__importSmoke = {
  FieldValue: {}, handle: (fn) => fn, ok: (data) => data, HttpError, sanitise, validateImages, importableFields, IMPORT_PROMPT,
  requireUser: async () => ({ uid: "synthetic-smoke" }), requireProperty: async () => ({ ref: {}, data: { assistancePaidAt: "synthetic-paid-fixture" } }), plain: (v) => v,
  privateBucket: () => { throw new Error("Unexpected Storage write"); },
  db: () => ({ collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({}) }) }) }), runTransaction: async (fn) => fn({ get: async () => ({ data: () => ({ count: 0 }) }), set: () => {} }) }),
};
const source = (await readFile("app/api/properties/[id]/import/route.js", "utf8")).replace(/^import .*;\r?$/gm, "");
const { POST } = await import(`data:text/javascript;base64,${Buffer.from(`const {${Object.keys(globalThis.__importSmoke).join(",")}} = globalThis.__importSmoke;\n${source}`).toString("base64")}`);
const image = await readFile("output/import-verification/sample-manual.jpg");
const result = await POST(new Request("http://localhost/import", { method: "POST", body: JSON.stringify({ action: "draft", images: [`data:image/jpeg;base64,${image.toString("base64")}`] }) }), { params: { id: "synthetic" } });
assert.equal(result.draft.wifiName, "HarbourGuest");
assert.equal(result.draft.wifiPassword, "sample-only-123");
assert.ok(result.draft.picks?.some((p) => p.name.includes("Museum")));
assert.ok(result.warnings.length > 0, "Old brochure details should be flagged");
console.log(JSON.stringify({ verified: true, extractedSections: Object.keys(result.draft), warnings: result.warnings.length, productionDataWritten: false }));
