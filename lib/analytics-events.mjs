import { priceBook } from "./currency.mjs";

export const GA_MEASUREMENT_ID = "G-90N6XYYYF2";
export const ANALYTICS_CONSENT_KEY = "guestsetgo-analytics-consent";

const PRIVATE_PATH = /^\/(admin|dashboard|api|login|signup|g)(\/|$)/;

export function isPublicAnalyticsPath(pathname) {
  return typeof pathname === "string" && pathname.startsWith("/") && !pathname.startsWith("//") && !PRIVATE_PATH.test(pathname);
}

export function pageViewParams({ origin, pathname, title, referrer }) {
  if (!isPublicAnalyticsPath(pathname)) return null;
  const params = { page_location: `${String(origin || "").replace(/\/$/, "")}${pathname}`, page_title: title || "" };
  if (typeof referrer === "string" && referrer) params.page_referrer = referrer;
  return params;
}

export function signUpEvent(method) {
  return method === "email" || method === "google" ? { method } : null;
}

// Listed catalogue prices only. Purchase is intentionally absent: the browser
// cannot confirm what Stripe actually collected.
export function beginCheckoutEvent({ plan, quantity, interval, currency }) {
  const code = typeof currency === "string" ? currency.toUpperCase() : "";
  if (code !== "GBP" && code !== "USD") return null;
  const prices = priceBook(code);
  const listed = {
    assisted: ["Welcome folder conversion", prices.assisted, 1],
    agency: ["Agency hosting", prices.agencyMonthly, quantity],
    host: [interval === "year" ? "Host hosting annual" : "Host hosting monthly", interval === "year" ? prices.hostAnnual : prices.hostMonthly, quantity],
  }[plan];
  if (!listed) return null;
  const [item_name, price, rawQuantity] = listed;
  const itemQuantity = Number(rawQuantity);
  if (!Number.isInteger(itemQuantity) || itemQuantity < 1 || itemQuantity > 500) return null;
  return { currency: code, value: price * itemQuantity, items: [{ item_name, quantity: itemQuantity, price }] };
}
