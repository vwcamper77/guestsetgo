import { FieldValue } from "firebase-admin/firestore";
import { handle, ok, HttpError } from "@/lib/auth-server";
import { liveProperty, rateLimited } from "@/lib/guest";

export const dynamic = "force-dynamic";

const s = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const list = (v) => (Array.isArray(v) ? v.slice(0, 30).map((x) => s(x, 300)).filter(Boolean) : []);

/** A guest submits the check-out form. No sign-in needed. */
export const POST = handle(async (req, { params }) => {
  if (rateLimited(req, "checkout", 6)) throw new HttpError(429, "Too many check-outs from this connection. Try again later.");
  const body = await req.json().catch(() => ({}));
  if (body.website) return ok({ ok: true }); // honeypot field bots fill in
  const prop = await liveProperty(params.slug);
  if (!prop) throw new HttpError(404, "This guidebook isn't available.");
  const stars = Math.round(Number(body.stars) || 0);
  await prop.ref.collection("checkouts").add({
    name: s(body.name, 60),
    issues: s(body.issues, 1000),
    stars: stars >= 1 && stars <= 5 ? stars : null,
    done: list(body.done),
    notDone: list(body.notDone),
    at: FieldValue.serverTimestamp(),
  });
  await prop.ref.update({ checkoutCount: FieldValue.increment(1), lastCheckoutAt: FieldValue.serverTimestamp() });
  return ok({ ok: true });
});
