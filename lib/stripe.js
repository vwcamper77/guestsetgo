import Stripe from "stripe";
import { planForConfiguredPrice } from "./billing.mjs";

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
  return planForConfiguredPrice(priceId, process.env);
}
