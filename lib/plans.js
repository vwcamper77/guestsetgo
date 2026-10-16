// Shared between server and browser. Prices here are for display; Stripe holds the real ones.
export const PLANS = {
  host: {
    id: "host",
    name: "Host",
    price: "£6 per property / month",
    summary: "Keep each guest guide live at its QR code and web link. £6 monthly, or £60 paid upfront for a year.",
    features: ["Or £60 per property / year", "No mandatory setup fee", "House-photo uploads and numbered markers", "Photo instructions, local picks and check-outs", "QR sign, shareable link and unlimited edits"],
  },
  agency: {
    id: "agency",
    name: "Agency",
    price: "£4 per property a month (5+ properties)",
    summary: "Keep five or more guest guides online. £4 per property monthly; minimum bill £20/month.",
    features: ["Minimum £20 a month", "Your brand colour on every guidebook", "House-photo uploads and numbered markers", "Self-service updates", "Welcome folder conversion purchased separately"],
    minQuantity: 5,
  },
};

export const ASSISTED = { price: "£79 once per property", description: "A one-time service to turn your existing folder pages, brochures and cards into a draft guide. It does not include keeping the guide online: after your trial, choose Host (£6/month or £60/year) or Agency (5+ properties)." };

const millis = (v) => v?.toMillis?.() ?? new Date(v || 0).getTime();
export function trialActive(account, now = Date.now()) {
  return !!account?.trialEndsAt && millis(account.trialEndsAt) > now;
}

const ACTIVE_SUB = ["active", "trialing", "past_due"];
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** How many published guidebooks an account may have right now. */
export function allowance(account) {
  if (!account) return 0;
  if (account.comp) return 999;
  let n = 0;
  if (account.plan && account.plan !== "starter" && ACTIVE_SUB.includes(account.subscriptionStatus) && account.subscriptionPaymentConfirmed !== false) {
    n += Number(account.quantity || 1);
  }
  if (account.starterPaidAt && Date.now() - millis(account.starterPaidAt) < YEAR_MS) {
    n += Number(account.starterCredits || 1);
  }
  if (!n && trialActive(account)) n = 1;
  return n;
}

export function planLabel(account) {
  if (!account) return "No plan";
  if (account.comp) return "Complimentary";
  const parts = [];
  if (account.plan && account.plan !== "starter" && account.subscriptionStatus) {
    parts.push(`${PLANS[account.plan]?.name || account.plan} × ${account.quantity || 1} (${account.billingInterval === "year" ? "annual, " : ""}${account.subscriptionStatus})`);
  }
  if (account.starterPaidAt) parts.push("Starter");
  if (!parts.length && trialActive(account)) parts.push("30-day guest trial");
  return parts.join(" + ") || "No plan";
}
