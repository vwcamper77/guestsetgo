import { FieldValue } from "firebase-admin/firestore";
import { handle, ok, HttpError } from "@/lib/auth-server";
import { liveProperty, rateLimited } from "@/lib/guest";

export const dynamic = "force-dynamic";

const s = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");

/** A guest rates one of the host's local picks. Stored per property; the admin area aggregates across all. */
export const POST = handle(async (req, { params }) => {
  if (rateLimited(req, "review", 15)) throw new HttpError(429, "Too many ratings from this connection. Try again later.");
  const body = await req.json().catch(() => ({}));
  if (body.website) return ok({ ok: true });
  const stars = Math.round(Number(body.stars));
  if (!(stars >= 1 && stars <= 5)) throw new HttpError(400, "Choose a rating from 1 to 5 stars.");
  const prop = await liveProperty(params.slug);
  if (!prop) throw new HttpError(404, "This guidebook isn't available.");
  const pick = (prop.data.picks || []).find((p) => p.id === body.pickId);
  if (!pick) throw new HttpError(400, "That place isn't in this guidebook any more.");
  await prop.ref.collection("reviews").add({
    pickId: pick.id,
    placeName: pick.name,
    placeType: pick.type || "",
    placeDest: pick.dest || "",
    propertyName: prop.data.name,
    stars,
    recommend: typeof body.recommend === "boolean" ? body.recommend : null,
    text: s(body.text, 200),
    name: s(body.name, 40),
    at: FieldValue.serverTimestamp(),
  });
  await prop.ref.update({ reviewCount: FieldValue.increment(1) });
  return ok({ ok: true });
});
