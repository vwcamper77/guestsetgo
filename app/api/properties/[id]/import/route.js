import { FieldValue } from "firebase-admin/firestore";
import { handle, ok, requireUser, requireProperty, HttpError } from "@/lib/auth-server";
import { db, plain, privateBucket } from "@/lib/firebase-admin";
import { sanitise } from "@/lib/property-defaults";
import { validateImages, importableFields, IMPORT_PROMPT } from "@/lib/manual-import.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export const GET = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const { ref, data: property } = await requireProperty(user, params.id);
  if (!property.assistancePaidAt) throw new HttpError(402, "Purchase welcome folder conversion (£79 once) for this property first.");
  const request = await ref.collection("imports").doc("assisted").get();
  if (!request.exists) return ok({ request: null });
  const data = request.data();
  return ok({ request: plain({ status: data.status, note: data.note, submittedAt: data.submittedAt, completedAt: data.completedAt }) });
});

export const POST = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const { ref, data: property } = await requireProperty(user, params.id);
  if (!property.assistancePaidAt) throw new HttpError(402, "Purchase welcome folder conversion (£79 once) for this property first.");
  if (Number(req.headers.get("content-length")) > 3200000) throw new HttpError(413, "Import fewer photos at a time.");
  const raw = await req.text();
  if (raw.length > 3200000) throw new HttpError(413, "Import fewer photos at a time.");
  let body;
  try { body = JSON.parse(raw); } catch { throw new HttpError(400, "Invalid upload."); }
  const assisted = body.action === "assisted";
  const savedDraft = body.action === "draft_assisted";
  if (savedDraft && !user.isAdmin) throw new HttpError(403, "Admins only.");
  if (!assisted && !savedDraft && body.action !== "draft") throw new HttpError(400, "Choose draft conversion or assisted setup.");
  if (!assisted && !process.env.OPENAI_API_KEY) throw new HttpError(503, "Photo conversion is not available yet. You can still fill in your guide manually.");
  let images;
  let note = typeof body.note === "string" ? body.note.slice(0, 2000) : "";
  if (savedDraft) {
    const saved = (await ref.collection("imports").doc("assisted").get()).data();
    if (!saved?.paths?.length) throw new HttpError(404, "No submitted photos found.");
    note = saved.note || "";
    const urls = await Promise.all(saved.paths.map(async (path) => {
      if (!path.startsWith(`private-imports/${property.ownerUid}/${params.id}/`)) throw new HttpError(400, "Invalid saved photo.");
      const file = privateBucket().file(path);
      const [[bytes], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
      return `data:${metadata.contentType};base64,${bytes.toString("base64")}`;
    }));
    try { images = validateImages(urls); } catch (e) { throw new HttpError(400, e.message); }
  } else {
    try { images = validateImages(body.images); } catch (e) { throw new HttpError(400, e.message); }
  }
  // Durable per-account quota, including failed requests, limits billed AI use.
  if (!assisted) {
    const usage = db().collection("users").doc(user.uid).collection("usage").doc(`import-${new Date().toISOString().slice(0, 10)}`);
    await db().runTransaction(async (tx) => {
      const count = (await tx.get(usage)).data()?.count || 0;
      if (count >= 10) throw new HttpError(429, "You've reached today's ten photo conversions. Try again tomorrow.");
      tx.set(usage, { count: count + 1 });
    });
  }
  if (assisted) {
    const request = ref.collection("imports").doc("assisted");
    await db().runTransaction(async (tx) => {
      if ((await tx.get(request)).exists) throw new HttpError(409, "Your photos have already been submitted. Contact us if you need to add more.");
      tx.create(request, { status: "uploading", ownerUid: property.ownerUid, propertyId: params.id, propertyName: property.name, email: user.email, note, submittedAt: FieldValue.serverTimestamp() });
    });
    const paths = [];
    try {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const path = `private-imports/${property.ownerUid}/${params.id}/${i}.${image.mime.split("/")[1]}`;
        await privateBucket().file(path).save(image.bytes, { resumable: false, metadata: { contentType: image.mime, cacheControl: "private, no-store" } });
        paths.push(path);
      }
      await request.update({ status: "submitted", paths });
    } catch (e) {
      await Promise.allSettled(paths.map((path) => privateBucket().file(path).delete()));
      await request.delete();
      throw e;
    }
    return ok({ submitted: true });
  }
  let response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", signal: AbortSignal.timeout(100000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_IMPORT_MODEL || "gpt-4o-mini", store: false, response_format: { type: "json_object" }, max_tokens: 5000,
        messages: [{ role: "system", content: IMPORT_PROMPT }, { role: "user", content: [{ type: "text", text: `Host notes (source material): ${note || "None"}` }, ...images.flatMap((image, i) => [{ type: "text", text: `Photo ${i + 1}` }, { type: "image_url", image_url: { url: image.dataUrl, detail: "high" } }])] }] }),
    });
  } catch { throw new HttpError(502, "Photo conversion timed out. Try fewer photos or clearer close-ups."); }
  if (!response.ok) throw new HttpError(502, "Photo conversion couldn't complete. Please try again later.");
  const result = await response.json();
  let parsed;
  try { parsed = JSON.parse(result.choices?.[0]?.message?.content || ""); } catch { throw new HttpError(502, "The draft couldn't be read. Please try again."); }
  const draft = Object.fromEntries(Object.entries(sanitise(importableFields(parsed.draft))).filter(([, value]) => Array.isArray(value) ? value.length : typeof value === "string" && value.trim()));
  const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.filter((w) => typeof w === "string").slice(0, 30).map((w) => w.slice(0, 500)) : [];
  return ok({ draft, warnings });
});
