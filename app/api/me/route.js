import { FieldValue } from "firebase-admin/firestore";
import { db, plain } from "@/lib/firebase-admin";
import { handle, ok, requireUser } from "@/lib/auth-server";
import { allowance, planLabel } from "@/lib/plans";

export const dynamic = "force-dynamic";

/** Returns the caller's account, creating it on first sign-in. */
export const GET = handle(async (req) => {
  const user = await requireUser(req);
  const ref = db().collection("users").doc(user.uid);
  let snap = await ref.get();
  if (!snap.exists) {
    await ref.set({ email: user.email, name: user.name, createdAt: FieldValue.serverTimestamp(), plan: null, quantity: 0 });
    snap = await ref.get();
  } else if (snap.data().email !== user.email) {
    await ref.update({ email: user.email });
  }
  const account = plain(snap.data());
  const published = await db().collection("properties").where("ownerUid", "==", user.uid).where("published", "==", true).count().get();
  return ok({
    uid: user.uid,
    email: user.email,
    isAdmin: user.isAdmin,
    account,
    allowance: allowance(account),
    planLabel: planLabel(account),
    publishedCount: published.data().count,
  });
});
