import { plain } from "@/lib/firebase-admin";
import { handle, ok, requireUser, requireProperty } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/** Check-outs and guest ratings for one guidebook, newest first. */
export const GET = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const { ref, data } = await requireProperty(user, params.id);
  const [co, rv] = await Promise.all([
    ref.collection("checkouts").orderBy("at", "desc").limit(200).get(),
    ref.collection("reviews").orderBy("at", "desc").limit(500).get(),
  ]);
  return ok({
    viewCount: data.viewCount || 0, lastViewedAt: plain(data.lastViewedAt || null),
    checkouts: co.docs.map((d) => plain({ id: d.id, ...d.data() })),
    reviews: rv.docs.map((d) => plain({ id: d.id, ...d.data() })),
  });
});
