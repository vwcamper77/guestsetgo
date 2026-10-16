"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

function Dashboard() {
  const { api } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [me, setMe] = useState(null);
  const [items, setItems] = useState(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/me").then(setMe).catch((e) => setError(e.message));
    api("/api/properties").then((d) => setItems(d.items)).catch((e) => setError(e.message));
  }, [api]);

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return setError("Give the property a name, like \"The Signal Loft\".");
    setBusy(true); setError("");
    try {
      const d = await api("/api/properties", { method: "POST", body: { name } });
      router.push(`/dashboard/properties/${d.id}`);
    } catch (err) { setError(err.message); setBusy(false); }
  }
  async function duplicate(id) {
    setBusy(true); setError("");
    try { const d = await api(`/api/properties/${id}/duplicate`, { method: "POST" }); router.push(`/dashboard/properties/${d.id}`); }
    catch (e) { setError(e.message); setBusy(false); }
  }

  const live = items?.filter((i) => i.published).length || 0;

  return (
    <>
      <div className="page-head">
        <div><span className="k">Your guidebooks</span><h1>Guidebooks</h1></div>
        {me && <p className="small muted">{me.planLabel} · {live} of {me.allowance} live</p>}
      </div>

      {params.get("checkout") === "success" && <p className="notice">Checkout completed. Your account updates after Stripe confirms payment.</p>}
      {me?.account?.trialEndsAt && !me.account.subscriptionId && <p className="notice">Your free guest trial ends {new Date(me.account.trialEndsAt).toLocaleDateString("en-GB")}. To keep your QR-linked guide online afterwards, choose £6/month or £60/year per property. No automatic charge. <Link href="/dashboard/billing">View online guide plans</Link></p>}
      {me && me.allowance === 0 && (
        <p className="notice">Build free: add a property, fill in your details and add house photos with numbered markers. Converting an existing welcome folder is a separate £79 service. {me.account?.trialEndsAt || me.account?.starterPaidAt || me.account?.subscriptionStatus ? <Link href="/dashboard/billing">Choose hosting to keep your guides live.</Link> : "Publishing your first guide starts a 30-day guest trial. No card required."}</p>
      )}

      <form className="panel" onSubmit={create} noValidate>
        <h2>Add a property</h2>
        <div className="btnrow" style={{ alignItems: "stretch" }}>
          <input type="text" aria-label="Property name" placeholder="Property name, e.g. The Signal Loft" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: "1 1 260px" }} />
          <button className="btn solid" type="submit" disabled={busy}>{busy ? "Creating…" : "Create guidebook"}</button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>

      {items === null ? <p className="muted">Loading guidebooks…</p> : items.length === 0 ? (
        <p className="empty">No guidebooks yet. Add your first property above and we'll start you off with the usual sections.</p>
      ) : (
        <div className="pcards">
          {items.map((p) => (
            <article className="pcard" key={p.id}>
              <div className="btnrow" style={{ justifyContent: "space-between" }}>
                <span className={`pill ${p.published ? "" : "off"}`}>{p.published ? "Live" : "Draft"}</span>
                <span className="small muted">/g/{p.slug}</span>
              </div>
              <h3>{p.name}</h3>
              {p.address && <p className="small muted">{p.address}</p>}
              <p className="small muted">{p.viewCount || 0} guide opens · {p.checkoutCount} check-outs · {p.reviewCount} ratings</p>
              <div className="btnrow">
                <Link className="btn solid small" href={`/dashboard/properties/${p.id}`}>Edit</Link>
                <button className="btn small" type="button" disabled={busy} onClick={() => duplicate(p.id)}>Duplicate as draft</button>
                {p.published && <a className="btn small" href={`/g/${p.slug}`} target="_blank" rel="noopener noreferrer">Open guest page</a>}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export default function Page() {
  return <Suspense fallback={<p className="muted">Loading…</p>}><Dashboard /></Suspense>;
}
