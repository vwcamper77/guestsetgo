import { db } from "@/lib/firebase-admin";
import { handle, ok, requireUser, HttpError } from "@/lib/auth-server";
import { stripe } from "@/lib/stripe";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

const site = (req) => process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

async function customerFor(user, account, ref) {
  if (account?.stripeCustomerId) return account.stripeCustomerId;
  const c = await stripe().customers.create({ email: user.email, name: user.name || undefined, metadata: { uid: user.uid } });
  await ref.set({ stripeCustomerId: c.id }, { merge: true });
  return c.id;
}

/** Starts a Stripe Checkout for a plan. Body: { plan: "starter"|"host"|"agency", quantity } */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const body = await req.json().catch(() => ({}));
  const plan = PLANS[body.plan];
  if (!plan) throw new HttpError(400, "Choose a plan.");
  let quantity = Math.max(1, Math.min(500, parseInt(body.quantity, 10) || 1));
  if (plan.minQuantity && quantity < plan.minQuantity) quantity = plan.minQuantity;

  const ref = db().collection("users").doc(user.uid);
  const account = (await ref.get()).data() || {};
  const customer = await customerFor(user, account, ref);
  const base = site(req);
  const common = {
    customer,
    client_reference_id: user.uid,
    success_url: `${base}/dashboard?checkout=success`,
    cancel_url: `${base}/dashboard/billing?checkout=cancelled`,
    allow_promotion_codes: true,
    metadata: { uid: user.uid, plan: plan.id, quantity: String(quantity) },
  };

  let session;
  if (plan.id === "starter") {
    session = await stripe().checkout.sessions.create({
      ...common,
      mode: "payment",
      line_items: [{ price: process.env.STRIPE_PRICE_SETUP, quantity }],
      payment_intent_data: { metadata: common.metadata },
      invoice_creation: { enabled: true },
    });
  } else {
    if (account.subscriptionId && ["active", "trialing", "past_due"].includes(account.subscriptionStatus)) {
      throw new HttpError(409, "You already have a subscription. Use Manage billing to change it.");
    }
    const recurring = plan.id === "host" ? process.env.STRIPE_PRICE_HOST_MONTHLY : process.env.STRIPE_PRICE_AGENCY_MONTHLY;
    const line_items = [{ price: recurring, quantity }];
    // Host plan includes a one-off set-up fee per property, unless the account is a founding host.
    if (plan.id === "host" && !account.founding) line_items.push({ price: process.env.STRIPE_PRICE_SETUP, quantity });
    session = await stripe().checkout.sessions.create({
      ...common,
      mode: "subscription",
      line_items,
      subscription_data: { metadata: common.metadata },
    });
  }
  return ok({ url: session.url });
});
