"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { PLANS } from "@/lib/plans";

const date = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

function Billing() {
  const { api } = useAuth();
  const params = useSearchParams();
  const highlight = params.get("plan");
  const [me, setMe] = useState(null);
  const [qty, setQty] = useState({ starter: 1, host: 1, agency: 5 });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { api("/api/me").then(setMe).catch((e) => setError(e.message)); }, [api]);

  async function go(plan) {
    setBusy(plan); setError("");
    try { const d = await api("/api/stripe/checkout", { method: "POST", body: { plan, quantity: qty[plan] } }); window.location.href = d.url; }
    catch (e) { setError(e.message); setBusy(""); }
  }
  async function portal() {
    setBusy("portal"); setError("");
    try { const d = await api("/api/stripe/portal", { method: "POST" }); window.location.href = d.url; }
    catch (e) { setError(e.message); setBusy(""); }
  }

  const a = me?.account || {};
  const hasSub = a.subscriptionId && ["active", "trialing", "past_due"].includes(a.subscriptionStatus);

  return (
    <>
      <div className="page-head"><div><span className="k">Billing</span><h1>Your plan</h1></div></div>
      {params.get("checkout") === "cancelled" && <p className="notice">Checkout cancelled. Nothing was charged.</p>}
      {error && <p className="error">{error}</p>}

      <div className="panel">
        <h2>{me ? me.planLabel : "Loading…"}</h2>
        {me && <p className="muted">{me.publishedCount} of {me.allowance} live guidebooks used.</p>}
        {a.subscriptionStatus === "past_due" && <p className="notice warn">Your last payment failed. Update your card in Manage billing to keep your guidebooks live.</p>}
        {a.cancelAtPeriodEnd && <p className="notice warn">Your subscription ends on {date(a.currentPeriodEnd)}. Guidebooks go offline after that.</p>}
        {a.currentPeriodEnd && !a.cancelAtPeriodEnd && hasSub && <p className="small muted">Next payment {date(a.currentPeriodEnd)}.</p>}
        {a.starterPaidAt && <p className="small muted">Starter paid {date(a.starterPaidAt)}, covers {a.starterCredits || 1} guidebook{(a.starterCredits || 1) > 1 ? "s" : ""} for 12 months.</p>}
        {a.founding && <p className="pill">Founding host: no set-up fee</p>}
        {a.stripeCustomerId && <div><button className="btn small" type="button" onClick={portal} disabled={busy === "portal"}>{busy === "portal" ? "Opening…" : "Manage billing, invoices and cards"}</button></div>}
      </div>

      <div className="prices">
        {Object.values(PLANS).map((pl) => {
          const disabled = pl.id !== "starter" && hasSub;
          return (
            <div className={`ticket ${highlight === pl.id ? "feature" : ""}`} key={pl.id}>
              <h3>{pl.name}</h3>
              <div className="amount" style={{ fontSize: "1.25rem" }}>{pl.id === "host" && a.founding ? "£6 a month per property" : pl.price}</div>
              <p className="small muted">{pl.summary}</p>
              <ul>{pl.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <label className="field"><span>Properties</span>
                <input type="number" min={pl.minQuantity || 1} max="500" value={qty[pl.id]} onChange={(e) => setQty({ ...qty, [pl.id]: Math.max(pl.minQuantity || 1, parseInt(e.target.value, 10) || 1) })} />
              </label>
              <button className="btn solid" type="button" disabled={!!busy || disabled} onClick={() => go(pl.id)}>
                {busy === pl.id ? "Opening checkout…" : disabled ? "Change in Manage billing" : `Choose ${pl.name}`}
              </button>
            </div>
          );
        })}
      </div>
      <p className="small muted">Payments are handled by Stripe. Have a founding host code? Enter it on the Stripe checkout page.</p>
    </>
  );
}

export default function Page() {
  return <Suspense fallback={<p className="muted">Loading…</p>}><Billing /></Suspense>;
}
