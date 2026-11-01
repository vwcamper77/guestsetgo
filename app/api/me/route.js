import { FieldValue } from "firebase-admin/firestore";
import { db, plain } from "@/lib/firebase-admin";
import { handle, ok, requireUser } from "@/lib/auth-server";
import { stripe } from "@/lib/stripe";
import { stripeCurrency } from "@/lib/billing.mjs";
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
  // Stripe owns the billing currency; legacy GBP accounts need no data migration.
  let billingCurrency = null;
  if (new URL(req.url).searchParams.get("billing") === "1" && account.stripeCustomerId) {
    const customer = await stripe().customers.retrieve(account.stripeCustomerId);
    const subscription = account.subscriptionId ? await stripe().subscriptions.retrieve(account.subscriptionId) : null;
    const actual = subscription?.currency || customer.currency;
    if (actual) billingCurrency = stripeCurrency(actual);
  }
  const published = await db().collection("properties").where("ownerUid", "==", user.uid).where("published", "==", true).count().get();
  return ok({
    uid: user.uid,
    email: user.email,
    isAdmin: user.isAdmin,
    account: { ...account, billingCurrency },
    allowance: allowance(account),
    planLabel: planLabel(account),
    publishedCount: published.data().count,
  });
});
