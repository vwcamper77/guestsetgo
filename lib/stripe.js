import Stripe from "stripe";

let client = null;
export function stripe() {
  if (!client) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set.");
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}

/** Maps a Stripe recurring price id back to our plan id. */
export function planForPrice(priceId) {
  if (priceId && priceId === process.env.STRIPE_PRICE_HOST_MONTHLY) return "host";
  if (priceId && priceId === process.env.STRIPE_PRICE_HOST_ANNUAL) return "host";
  if (priceId && priceId === process.env.STRIPE_PRICE_AGENCY_MONTHLY) return "agency";
  return null;
}
