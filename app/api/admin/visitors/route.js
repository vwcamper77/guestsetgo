import { db } from "@/lib/firebase-admin";
import { handle, ok, requireAdmin } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const GET = handle(async (req) => {
  await requireAdmin(req);
  const dates = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
  const snapshots = await Promise.all(dates.map((date) => db().collection("visitorDays").doc(date).collection("pages").get()));
  const pages = new Map(), sources = new Map();
  const days = snapshots.map((snapshot, i) => {
    let views = 0;
    for (const doc of snapshot.docs) {
      const row = doc.data();
      views += row.views;
      pages.set(row.path, (pages.get(row.path) || 0) + row.views);
      sources.set(row.source, (sources.get(row.source) || 0) + row.views);
    }
    return { date: dates[i], views };
  });
  const ranked = (map) => [...map].map(([name, views]) => ({ name, views })).sort((a, b) => b.views - a.views);
  return ok({ days, pages: ranked(pages), sources: ranked(sources), total: days.reduce((sum, day) => sum + day.views, 0) }, { headers: { "Cache-Control": "no-store" } });
});
