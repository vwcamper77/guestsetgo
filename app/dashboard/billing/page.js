"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { PLANS, ASSISTED } from "@/lib/plans";

const date = (iso) => iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
function Billing() {
  const { api } = useAuth();
  const params = useSearchParams();
  const [me, setMe] = useState(null);
  const [items, setItems] = useState([]);
  const [qty, setQty] = useState({ host: 1, agency: 5 });
  const [interval, setInterval] = useState("month");
  const [propertyId, setPropertyId] = useState(params.get("property") || "");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { const [account, properties] = await Promise.all([api("/api/me"), api("/api/properties")]); setMe(account); setItems(properties.items); }
    catch (e) { setError(e.message); }
  }, [api]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (params.get("checkout") !== "success") return;
    let count = 0;
    const timer = window.setInterval(() => { load(); if (++count >= 5) window.clearInterval(timer); }, 2000);
    return () => window.clearInterval(timer);
  }, [params, load]);
  async function go(plan) {
    setBusy(plan); setError("");
    try { const d = await api("/api/stripe/checkout", { method: "POST", body: { plan, quantity: qty[plan] || 1, interval: plan === "host" ? interval : "month", propertyId } }); window.location.href = d.url; }
    catch (e) { setError(e.message); setBusy(""); }
  }
  async function portal() {
    setBusy("portal"); setError("");
    try { const d = await api("/api/stripe/portal", { method: "POST" }); window.location.href = d.url; }
    catch (e) { setError(e.message); setBusy(""); }
  }
  const a = me?.account || {};
  const hasSub = !!a.subscriptionId && !["canceled", "incomplete_expired"].includes(a.subscriptionStatus);
  return <>
    <div className="page-head"><div><span className="k">Billing</span><h1>Your online guide subscription</h1></div></div>
    {params.get("checkout") === "cancelled" && <p className="notice">Checkout cancelled. No purchase was completed.</p>}
    {params.get("checkout") === "success" && <p className="notice" role="status">Checkout completed. Your account updates after Stripe confirms payment; this page checks for updates automatically.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="panel"><h2>{me ? me.planLabel : "Loading…"}</h2>
      {me && <p>{me.publishedCount} of {me.allowance} live guidebooks used.</p>}
      {a.trialEndsAt && !hasSub && <p className="small">Your guest trial ends {date(a.trialEndsAt)}. It does not renew or charge automatically.</p>}
      {a.subscriptionStatus === "past_due" && <p className="notice warn">Your last payment failed. Update your card in Manage billing.</p>}
      {a.subscriptionStatus === "active" && a.subscriptionPaymentConfirmed === false && <p className="notice">Your hosting payment is still awaiting confirmation from Stripe. Paid hosting becomes available when it clears.</p>}
      {a.cancelAtPeriodEnd && <p className="notice warn">Your subscription ends on {date(a.currentPeriodEnd)}.</p>}
      {a.currentPeriodEnd && !a.cancelAtPeriodEnd && hasSub && <p className="small">Next renewal {date(a.currentPeriodEnd)}.</p>}
      {a.starterPaidAt && <p className="small">Existing Starter purchase: {a.starterCredits || 1} guidebook(s), 12 months from {date(a.starterPaidAt)}. Your purchase is still honoured.</p>}
      {a.stripeCustomerId && <button className="btn small" type="button" onClick={portal} disabled={!!busy}>Manage billing, invoices and cards</button>}
    </div>
    <p>Hosting keeps your guest guide accessible through its QR code and web link. Build and preview free, then try one live guide for 30 days with no card. After the trial, choose £6/month or £60/year per property, or Agency for five or more properties. Without an active plan, guests cannot open the guide after the trial.</p>
    <div className="grid2">{Object.values(PLANS).map((plan) => <div className={`ticket ${params.get("plan") === plan.id ? "feature" : ""}`} key={plan.id}>
      <h2>{plan.name}</h2><div className="amount" style={{ fontSize: "1.4rem" }}>{plan.id === "host" && interval === "year" ? "£60 per property / year" : plan.price}</div><p>{plan.summary}</p>
      <ul>{plan.features.map((f) => <li key={f}>{f}</li>)}</ul>
      {plan.id === "host" && <label className="field"><span>Billing frequency</span><select value={interval} onChange={(e) => setInterval(e.target.value)}><option value="month">Monthly — £6/property</option><option value="year">Yearly — £60/property (save £12)</option></select></label>}
      <label className="field"><span>Properties</span><input type="number" min={plan.minQuantity || 1} max={500} value={qty[plan.id]} onChange={(e) => setQty((q) => ({ ...q, [plan.id]: e.target.value }))} /></label>
      {Number(qty[plan.id]) >= (plan.minQuantity || 1) && <p><b>Total: £{(Number(qty[plan.id]) * (plan.id === "agency" ? 4 : interval === "year" ? 60 : 6)).toLocaleString("en-GB")}{plan.id === "host" && interval === "year" ? " paid upfront each year" : " each month"}</b>. Renews until cancelled.</p>}
      <button className="btn solid" type="button" disabled={!!busy || hasSub || !me} onClick={() => go(plan.id)}>{busy === plan.id ? "Opening checkout…" : hasSub ? "Change in Manage billing" : `Choose ${plan.name}`}</button>
    </div>)}</div>
    <div className="conversion-offer" id="assisted"><span className="k">Optional one-time service · not a hosting plan</span><h2>Welcome folder conversion</h2><div className="amount">{ASSISTED.price}</div><p>{ASSISTED.description}</p><p><b>Example for one property:</b> £79 conversion + £60 annual hosting = <b>£139 in the first year</b>, then £60/year hosting until cancelled. Alternatively pay £6/month for hosting.</p><p>After payment, your property's separate Welcome folder conversion page unlocks. Drag in photos of your existing guidebook pages, brochures and cards. Includes conversion of one batch of up to eight photos, AI draft conversion and preparation help.</p>
      {items.length ? <><label className="field"><span>Property to prepare</span><select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}><option value="">Choose a property</option>{items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <button className="btn solid" type="button" disabled={!!busy || !propertyId || !me} onClick={() => go("assisted")}>{busy === "assisted" ? "Opening checkout…" : "Buy folder conversion — £79 once"}</button></> : <Link className="btn" href="/dashboard">Add a property first</Link>}
      <p className="small muted">House photos and numbered markers are included with hosting. Welcome folder conversion, its document uploads and AI conversion require this separate £79 purchase. Portfolio migration beyond this scope is quoted separately.</p>
    </div>
    <p className="small muted">Stripe handles payments. Hosting renews at the selected interval until cancelled. Assisted setup is a separate one-time purchase and does not add hosting capacity.</p>
  </>;
}
export default function Page() { return <Suspense fallback={<p>Loading billing…</p>}><Billing /></Suspense>; }
