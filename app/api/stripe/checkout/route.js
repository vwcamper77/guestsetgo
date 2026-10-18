import { db } from "@/lib/firebase-admin";
import { handle, ok, requireUser, requireProperty, HttpError } from "@/lib/auth-server";
import { stripe } from "@/lib/stripe";
import { checkoutSelection, stripeCurrency, assertCheckoutPrice } from "@/lib/billing.mjs";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const body = await req.json().catch(() => ({}));
  let choice;
  try { choice = checkoutSelection(body, process.env); }
  catch (e) { throw new HttpError(400, e.message); }
  const { plan, quantity, interval, price, mode, currency } = choice;
  const ref = db().collection("users").doc(user.uid);
  const account = (await ref.get()).data() || {};
  let propertyId = "";
  if (plan === "assisted") {
    if (typeof body.propertyId !== "string" || !body.propertyId) throw new HttpError(400, "Choose the property for assisted setup.");
    const { data } = await requireProperty(user, body.propertyId);
    if (data.ownerUid !== user.uid) throw new HttpError(403, "Buy assisted setup from the owner's account.");
    if (data.assistancePaidAt) throw new HttpError(409, "Welcome folder conversion is already paid for this property. Open its folder-conversion service.");
    propertyId = body.propertyId;
  } else if (account.subscriptionId && ["active", "trialing", "past_due", "incomplete", "unpaid", "paused"].includes(account.subscriptionStatus)) {
    throw new HttpError(409, "You already have a subscription. Use Manage billing to change it.");
  }
  let customer = account.stripeCustomerId;
  if (!customer) {
    const c = await stripe().customers.create({ email: user.email, name: user.name || undefined, metadata: { uid: user.uid } }, { idempotencyKey: `customer-${user.uid}` });
    customer = c.id;
    await ref.set({ stripeCustomerId: customer }, { merge: true });
  }
  const customerData = await stripe().customers.retrieve(customer);
  if (customerData.deleted) throw new HttpError(409, "Your billing account needs attention. Please contact us.");
  const subscription = account.subscriptionId ? await stripe().subscriptions.retrieve(account.subscriptionId) : null;
  const fixedCurrency = subscription?.currency || customerData.currency;
  if (fixedCurrency && stripeCurrency(fixedCurrency) !== currency) throw new HttpError(409, `Your billing account uses ${stripeCurrency(fixedCurrency)}. Choose that currency to continue.`);
  const configuredPrice = await stripe().prices.retrieve(price);
  try { assertCheckoutPrice(choice, configuredPrice); }
  catch (e) { throw new HttpError(503, e.message); }
  const base = process.env.VERCEL_ENV === "preview" ? new URL(req.url).origin : process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const metadata = { uid: user.uid, plan, quantity: String(quantity), interval, propertyId, currency };
  const destination = propertyId ? `/dashboard/properties/${encodeURIComponent(propertyId)}/folder-conversion?checkout=success` : "/dashboard/billing?checkout=success";
  const session = await stripe().checkout.sessions.create({
    integration_identifier: `guestsetgo-${plan}-${Array.from(randomBytes(8), (n) => String.fromCharCode(97 + n % 26)).join("")}`,
    customer, client_reference_id: user.uid, metadata,
    success_url: `${base}${destination}`,
    cancel_url: `${base}/dashboard/billing?checkout=cancelled`,
    mode, currency: currency.toLowerCase(), adaptive_pricing: { enabled: false }, line_items: [{ price, quantity }],
    // Legacy £79 promotion codes must not discount the hosting subscription.
    ...(mode === "subscription" ? { subscription_data: { metadata } } : { payment_intent_data: { metadata }, invoice_creation: { enabled: true } }),
  });
  return ok({ url: session.url });
});
