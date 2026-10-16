import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { handle, ok, HttpError } from "@/lib/auth-server";
import { trackedPath, referralHost } from "@/lib/analytics.mjs";

export const POST = handle(async (req) => {
  const origin = new URL(req.url).origin;
  if (req.headers.get("origin") !== origin) throw new HttpError(403, "Invalid origin.");
  if (req.headers.get("dnt") === "1" || req.headers.get("sec-gpc") === "1") return ok({ recorded: false });
  const raw = await req.text();
  if (raw.length > 2048) throw new HttpError(413, "Request too large.");
  let body;
  try { body = JSON.parse(raw); } catch { throw new HttpError(400, "Invalid request."); }
  const path = trackedPath(body?.path);
  if (!path) throw new HttpError(400, "Invalid page.");
  const source = referralHost(body.referrer, origin);
  const date = new Date().toISOString().slice(0, 10);
  const id = createHash("sha256").update(JSON.stringify([path, source])).digest("hex");
  await db().collection("visitorDays").doc(date).collection("pages").doc(id).set({
    path, source, views: FieldValue.increment(1),
  }, { merge: true });
  return ok({ recorded: true });
});
