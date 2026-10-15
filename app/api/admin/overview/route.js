import { db, plain } from "@/lib/firebase-admin";
import { handle, ok, requireAdmin } from "@/lib/auth-server";
import { allowance, planLabel } from "@/lib/plans";

export const dynamic = "force-dynamic";

const MONTHLY_PENCE = { host: 600, agency: 400 };
const ACTIVE = ["active", "trialing", "past_due"];

export const GET = handle(async (req) => {
  await requireAdmin(req);
  const [usersSnap, propsSnap, paySnap, revSnap] = await Promise.all([
    db().collection("users").get(),
    db().collection("properties").get(),
    db().collection("payments").orderBy("at", "desc").limit(200).get(),
    db().collectionGroup("reviews").limit(5000).get(),
  ]);

  const props = propsSnap.docs.map((d) => {
    const p = d.data();
    return plain({ id: d.id, name: p.name, slug: p.slug, ownerUid: p.ownerUid, published: !!p.published, address: p.address, checkoutCount: p.checkoutCount || 0, reviewCount: p.reviewCount || 0, updatedAt: p.updatedAt, createdAt: p.createdAt });
  });

  let mrr = 0;
  const users = usersSnap.docs.map((d) => {
    const u = d.data();
    if (u.plan && ACTIVE.includes(u.subscriptionStatus) && !u.comp) mrr += (MONTHLY_PENCE[u.plan] || 0) * (u.quantity || 1);
    const mine = props.filter((p) => p.ownerUid === d.id);
    return plain({
      uid: d.id, email: u.email, name: u.name, createdAt: u.createdAt, plan: u.plan, quantity: u.quantity || 0,
      subscriptionStatus: u.subscriptionStatus || null, founding: !!u.founding, comp: !!u.comp, note: u.note || "",
      stripeCustomerId: u.stripeCustomerId || null, planLabel: planLabel(u), allowance: allowance(u),
      properties: mine.length, live: mine.filter((p) => p.published).length,
    });
  }).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  const payments = paySnap.docs.map((d) => plain({ id: d.id, ...d.data() }));
  const now = Date.now();
  const last30 = payments.filter((p) => p.status === "paid" && now - new Date(p.at).getTime() < 30 * 864e5).reduce((a, p) => a + (p.amount || 0), 0);
  const allTime = payments.filter((p) => p.status === "paid").reduce((a, p) => a + (p.amount || 0), 0);

  // Every local place guests have rated, grouped across all guidebooks: the list to take to local businesses.
  const places = {};
  for (const d of revSnap.docs) {
    const r = d.data();
    const key = (r.placeDest || r.placeName || "").toLowerCase().trim();
    if (!key) continue;
    const b = (places[key] ||= { name: r.placeName, type: r.placeType, dest: r.placeDest, count: 0, sum: 0, rec: 0, recAnswered: 0, properties: new Set(), latest: null, tips: [] });
    b.count++; b.sum += r.stars || 0;
    if (typeof r.recommend === "boolean") { b.recAnswered++; if (r.recommend) b.rec++; }
    if (r.propertyName) b.properties.add(r.propertyName);
    const at = r.at?.toDate?.();
    if (at && (!b.latest || at > b.latest)) b.latest = at;
    if (r.text && b.tips.length < 3) b.tips.push(r.text);
  }
  const placeList = Object.values(places).map((b) => ({
    name: b.name, type: b.type, dest: b.dest, count: b.count, avg: b.sum / b.count,
    recommendPct: b.recAnswered ? Math.round((b.rec / b.recAnswered) * 100) : null,
    properties: b.properties.size, latest: b.latest ? b.latest.toISOString() : null, tips: b.tips,
  })).sort((a, b) => b.count - a.count);

  return ok({
    stats: {
      accounts: users.length,
      paying: users.filter((u) => (u.plan && ACTIVE.includes(u.subscriptionStatus)) || u.allowance > 0 && !u.comp).length,
      guidebooks: props.length,
      live: props.filter((p) => p.published).length,
      mrr, last30, allTime,
      checkouts: props.reduce((a, p) => a + p.checkoutCount, 0),
      ratings: revSnap.size,
    },
    users, properties: props, payments, places: placeList,
  });
});
