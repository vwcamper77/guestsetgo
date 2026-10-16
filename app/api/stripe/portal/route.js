import { db } from "@/lib/firebase-admin";
import { handle, ok, requireUser, HttpError } from "@/lib/auth-server";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Opens Stripe's customer portal: change quantity, update card, download invoices, cancel. */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const account = (await db().collection("users").doc(user.uid).get()).data() || {};
  if (!account.stripeCustomerId) throw new HttpError(400, "You haven't paid for a plan yet.");
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const configuration = account.plan === "agency" ? process.env.STRIPE_PORTAL_AGENCY : process.env.STRIPE_PORTAL_HOST;
  const session = await stripe().billingPortal.sessions.create({ customer: account.stripeCustomerId, return_url: `${base}/dashboard/billing`, ...(configuration ? { configuration } : {}) });
  return ok({ url: session.url });
});
