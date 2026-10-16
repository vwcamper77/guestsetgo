import { FieldValue } from "firebase-admin/firestore";
import { handle, ok, HttpError } from "@/lib/auth-server";
import { liveProperty, rateLimited } from "@/lib/guest";

export const dynamic = "force-dynamic";
export const POST = handle(async (req, { params }) => {
  if (rateLimited(req, `view:${params.slug}`, 1, 30 * 60 * 1000)) return ok({ counted: false });
  const property = await liveProperty(params.slug);
  if (!property) throw new HttpError(404, "Guidebook not found.");
  await property.ref.set({ viewCount: FieldValue.increment(1), lastViewedAt: FieldValue.serverTimestamp() }, { merge: true });
  return ok({ counted: true });
});
