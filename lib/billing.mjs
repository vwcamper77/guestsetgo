import { priceBook } from "./currency.mjs";

export function checkoutSelection(body, env) {
  const currency = body.currency ?? "GBP";
  if (!["GBP", "USD"].includes(currency)) throw new Error("Choose GBP or USD.");
  const suffix = currency === "USD" ? "_USD" : "";
  const plan = body.plan;
  if (!["host", "agency", "assisted"].includes(plan)) throw new Error("Choose Host, Agency or assisted setup.");
  const quantity = plan === "assisted" ? 1 : Number(body.quantity ?? (plan === "agency" ? 5 : 1));
  if (!Number.isInteger(quantity) || quantity < (plan === "agency" ? 5 : 1) || quantity > 500) throw new Error("Choose a valid number of properties (Agency starts at five).");
  const interval = body.interval ?? "month";
  if (!["month", "year"].includes(interval) || (plan === "agency" && interval !== "month")) throw new Error("Choose an available billing interval.");
  const key = plan === "assisted" ? "STRIPE_PRICE_ASSISTED" : plan === "agency" ? "STRIPE_PRICE_AGENCY_MONTHLY" : interval === "year" ? "STRIPE_PRICE_HOST_ANNUAL" : "STRIPE_PRICE_HOST_MONTHLY";
  const price = env[key + suffix];
  if (!price || !price.startsWith("price_")) throw new Error("This price is not configured yet. Please contact us.");
  return { plan, quantity, interval, price, currency, mode: plan === "assisted" ? "payment" : "subscription" };
}

export function subscriptionPeriodEnd(sub) {
  const end = sub.current_period_end || sub.items?.data?.[0]?.current_period_end || null;
  return sub.cancel_at ? (end ? Math.min(end, sub.cancel_at) : sub.cancel_at) : end;
}

export function subscriptionWillCancel(sub) {
  return !!(sub.cancel_at_period_end || sub.cancel_at);
}

export function invoiceSubscription(inv) {
  return inv.subscription || inv.parent?.subscription_details?.subscription || null;
}

// Unknown Stripe currencies must fail closed instead of selecting a GBP portal.
export function stripeCurrency(value) {
  const currency = typeof value === "string" ? value.toUpperCase() : "";
  if (!["GBP", "USD"].includes(currency)) throw new Error("This billing currency is not supported. Please contact us.");
  return currency;
}

export function portalConfiguration(plan, currency, env) {
  const code = stripeCurrency(currency);
  const key = `STRIPE_PORTAL_${plan === "agency" ? "AGENCY" : "HOST"}${code === "USD" ? "_USD" : ""}`;
  if (!env[key]?.startsWith("bpc_")) throw new Error("Billing management is not configured for this currency. Please contact us.");
  return env[key];
}

export function planForConfiguredPrice(priceId, env) {
  if (!priceId) return null;
  for (const suffix of ["", "_USD"]) {
    if ([env[`STRIPE_PRICE_HOST_MONTHLY${suffix}`], env[`STRIPE_PRICE_HOST_ANNUAL${suffix}`]].includes(priceId)) return "host";
    if (priceId === env[`STRIPE_PRICE_AGENCY_MONTHLY${suffix}`]) return "agency";
  }
  return null;
}

export function assertCheckoutPrice(choice, price) {
  const prices = priceBook(choice.currency);
  const amount = choice.plan === "assisted" ? prices.assisted : choice.plan === "agency" ? prices.agencyMonthly : choice.interval === "year" ? prices.hostAnnual : prices.hostMonthly;
  if (!price.active || price.currency !== choice.currency.toLowerCase() || price.unit_amount !== amount * 100 || (price.recurring?.interval || null) !== (choice.mode === "subscription" ? choice.interval : null) || (price.recurring && price.recurring.interval_count !== 1)) {
    throw new Error("The selected price is not configured correctly. Please contact us.");
  }
}
