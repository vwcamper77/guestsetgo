// Shared between server and browser. Prices here are for display; Stripe holds the real ones.
export const PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    price: "£79 one-off",
    summary: "One property, set up for you, hosted for 12 months.",
    features: ["Guidebook written and set up", "QR sign and shareable link", "Hosting for 12 months", "Two rounds of changes"],
  },
  host: {
    id: "host",
    name: "Host",
    price: "£79 set-up + £6 a month per property",
    summary: "For hosts with one to four properties.",
    features: ["Everything in Starter", "Unlimited updates", "Check-outs and guest ratings sent to you", "Seasonal local picks refreshed"],
  },
  agency: {
    id: "agency",
    name: "Agency",
    price: "£4 per property a month (5+ properties)",
    summary: "For letting agents and managers.",
    features: ["Your branding on every guidebook", "Bulk set-up included", "One contact for all changes"],
    minQuantity: 5,
  },
};

const ACTIVE_SUB = ["active", "trialing", "past_due"];
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** How many published guidebooks an account may have right now. */
export function allowance(account) {
  if (!account) return 0;
  if (account.comp) return 999;
  let n = 0;
  if (account.plan && account.plan !== "starter" && ACTIVE_SUB.includes(account.subscriptionStatus)) {
    n += Number(account.quantity || 1);
  }
  if (account.starterPaidAt && Date.now() - new Date(account.starterPaidAt).getTime() < YEAR_MS) {
    n += Number(account.starterCredits || 1);
  }
  return n;
}

export function planLabel(account) {
  if (!account) return "No plan";
  if (account.comp) return "Complimentary";
  const parts = [];
  if (account.plan && account.plan !== "starter" && account.subscriptionStatus) {
    parts.push(`${PLANS[account.plan]?.name || account.plan} × ${account.quantity || 1} (${account.subscriptionStatus})`);
  }
  if (account.starterPaidAt) parts.push("Starter");
  return parts.join(" + ") || "No plan";
}
