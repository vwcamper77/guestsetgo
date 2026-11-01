import { db } from "@/lib/firebase-admin";
import { handle, ok, requireUser, HttpError } from "@/lib/auth-server";
import { portalConfiguration, stripeCurrency } from "@/lib/billing.mjs";
import { stripe, planForPrice } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Opens Stripe's customer portal: change quantity, update card, download invoices, cancel. */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const account = (await db().collection("users").doc(user.uid).get()).data() || {};
  if (!account.stripeCustomerId) throw new HttpError(400, "You haven't paid for a plan yet.");
  const base = process.env.VERCEL_ENV === "preview" ? new URL(req.url).origin : process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  // Read Stripe's subscription, never a browser preference or stale account plan.
  const subscription = account.subscriptionId ? await stripe().subscriptions.retrieve(account.subscriptionId) : null;
  if (subscription && subscription.customer !== account.stripeCustomerId) throw new HttpError(409, "Billing account mismatch. Please contact us.");
  const customer = await stripe().customers.retrieve(account.stripeCustomerId);
  if (customer.deleted) throw new HttpError(409, "Your billing account needs attention. Please contact us.");
  const currency = stripeCurrency(subscription?.currency || customer.currency || "gbp");
  const plan = subscription ? planForPrice(subscription.items.data[0]?.price?.id) : account.plan;
  let configuration;
  try { configuration = portalConfiguration(plan, currency, process.env); }
  catch (e) { throw new HttpError(503, e.message); }
  const session = await stripe().billingPortal.sessions.create({ customer: account.stripeCustomerId, return_url: `${base}/dashboard/billing`, configuration });
  return ok({ url: session.url });
});
