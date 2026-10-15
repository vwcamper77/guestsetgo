import { db, plain } from "./firebase-admin";
import { allowance } from "./plans";

/** Loads a live guidebook by slug, or null if it doesn't exist, is a draft, or the host's plan has lapsed. */
export async function liveProperty(slug) {
  const snap = await db().collection("properties").where("slug", "==", String(slug).slice(0, 80)).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const p = doc.data();
  if (!p.published) return null;
  const owner = (await db().collection("users").doc(p.ownerUid).get()).data();
  if (allowance(owner) <= 0) return null;
  return { id: doc.id, ref: doc.ref, data: p };
}

/** Average, count and the latest tips per local pick. */
export async function ratingsFor(ref) {
  const snap = await ref.collection("reviews").orderBy("at", "desc").limit(500).get();
  const out = {};
  for (const d of snap.docs) {
    const r = d.data();
    const b = (out[r.pickId] ||= { count: 0, sum: 0, recent: [] });
    b.count++; b.sum += r.stars || 0;
    if (r.text && b.recent.length < 2) b.recent.push(plain({ stars: r.stars, text: r.text, name: r.name, at: r.at }));
  }
  for (const k of Object.keys(out)) { out[k].avg = out[k].sum / out[k].count; delete out[k].sum; }
  return out;
}

// Best-effort per-instance rate limit for guest posts. Enough to stop casual spam.
const hits = new Map();
export function rateLimited(req, key, max = 10, windowMs = 10 * 60 * 1000) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const k = `${key}:${ip}`;
  const now = Date.now();
  const list = (hits.get(k) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(k, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}
