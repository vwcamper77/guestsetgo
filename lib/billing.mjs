export function checkoutSelection(body, env) {
  const plan = body.plan;
  if (!["host", "agency", "assisted"].includes(plan)) throw new Error("Choose Host, Agency or assisted setup.");
  const quantity = plan === "assisted" ? 1 : Number(body.quantity ?? (plan === "agency" ? 5 : 1));
  if (!Number.isInteger(quantity) || quantity < (plan === "agency" ? 5 : 1) || quantity > 500) throw new Error("Choose a valid number of properties (Agency starts at five).");
  const interval = body.interval ?? "month";
  if (!["month", "year"].includes(interval) || (plan === "agency" && interval !== "month")) throw new Error("Choose an available billing interval.");
  const price = plan === "assisted" ? env.STRIPE_PRICE_ASSISTED : plan === "agency" ? env.STRIPE_PRICE_AGENCY_MONTHLY : interval === "year" ? env.STRIPE_PRICE_HOST_ANNUAL : env.STRIPE_PRICE_HOST_MONTHLY;
  if (!price || !price.startsWith("price_")) throw new Error("This price is not configured yet. Please contact us.");
  return { plan, quantity, interval, price, mode: plan === "assisted" ? "payment" : "subscription" };
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
