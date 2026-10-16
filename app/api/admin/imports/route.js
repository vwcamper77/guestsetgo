import { FieldValue } from "firebase-admin/firestore";
import { db, plain, privateBucket } from "@/lib/firebase-admin";
import { handle, ok, requireAdmin, requireProperty, HttpError } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export const GET = handle(async (req) => {
  await requireAdmin(req);
  const snap = await db().collectionGroup("imports").limit(100).get();
  const requests = await Promise.all(snap.docs.map(async (doc) => {
    const data = doc.data();
    const photos = await Promise.all((data.paths || []).map(async (path) => {
      const [url] = await privateBucket().file(path).getSignedUrl({ action: "read", expires: Date.now() + 15 * 60 * 1000 });
      return url;
    }));
    return plain({ propertyId: data.propertyId, propertyName: data.propertyName, email: data.email, status: data.status, note: data.note, submittedAt: data.submittedAt, photos });
  }));
  return ok({ requests: requests.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt))) });
});

export const PATCH = handle(async (req) => {
  const user = await requireAdmin(req);
  const { propertyId, status } = await req.json();
  if (typeof propertyId !== "string" || !["in_progress", "completed"].includes(status)) throw new HttpError(400, "Choose a request and status.");
  const { ref, data } = await requireProperty(user, propertyId);
  if (status === "completed" && data.published) throw new HttpError(409, "Save the prepared manual as an offline draft before marking it ready for the host.");
  await ref.collection("imports").doc("assisted").update({ status, ...(status === "completed" ? { completedAt: FieldValue.serverTimestamp() } : {}) });
  return ok({ updated: true });
});
