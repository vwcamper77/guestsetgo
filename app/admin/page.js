"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

const gbp = (pence) => `£${((pence || 0) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) : "—");
const TABS = [["overview", "Overview"], ["accounts", "Accounts"], ["guidebooks", "Guidebooks"], ["payments", "Payments"], ["places", "Local places"]];

function csv(rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

export default function Admin() {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(() => api("/api/admin/overview").then(setData).catch((e) => setError(e.message)), [api]);
  useEffect(() => { load(); }, [load]);

  async function patchUser(uid, body) {
    setBusy(uid);
    try { await api(`/api/admin/users/${uid}`, { method: "PATCH", body }); await load(); } catch (e) { setError(e.message); }
    setBusy("");
  }
  async function setLive(id, published) {
    setBusy(id);
    try { await api(`/api/properties/${id}`, { method: "PUT", body: { published } }); await load(); } catch (e) { setError(e.message); }
    setBusy("");
  }

  const owners = useMemo(() => Object.fromEntries((data?.users || []).map((u) => [u.uid, u])), [data]);
  const match = (s) => !q || String(s || "").toLowerCase().includes(q.toLowerCase());

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading admin…</p>;
  const s = data.stats;

  const placesCsv = () => {
    const rows = [["Place", "Type", "Location", "Ratings", "Average", "Would recommend %", "Guidebooks", "Latest", "Tips"],
      ...data.places.map((p) => [p.name, p.type, p.dest, p.count, p.avg.toFixed(2), p.recommendPct ?? "", p.properties, day(p.latest), p.tips.join(" | ")])];
    const url = URL.createObjectURL(new Blob([csv(rows)], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "guestsetgo-local-places.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="page-head">
        <div><span className="k">Admin</span><h1>GuestSetGo admin</h1></div>
        <div className="btnrow">
          <input type="text" aria-label="Search" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 240 }} />
          <button type="button" className="btn small" onClick={load}>Refresh</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="tabs">{TABS.map(([id, l]) => <button key={id} type="button" className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{l}</button>)}</div>

      {tab === "overview" && <>
        <div className="grid3">
          <div className="stat"><span>Monthly recurring revenue</span><b>{gbp(s.mrr)}</b></div>
          <div className="stat"><span>Paid in the last 30 days</span><b>{gbp(s.last30)}</b></div>
          <div className="stat"><span>Paid all time</span><b>{gbp(s.allTime)}</b></div>
          <div className="stat"><span>Accounts · paying</span><b>{s.accounts} · {s.paying}</b></div>
          <div className="stat"><span>Guidebooks · live</span><b>{s.guidebooks} · {s.live}</b></div>
          <div className="stat"><span>Guest check-outs · ratings</span><b>{s.checkouts} · {s.ratings}</b></div>
        </div>
        <div className="panel">
          <h2>Newest accounts</h2>
          {data.users.length === 0 ? <p className="empty">No accounts yet.</p> : (
            <div className="tbl"><table><thead><tr><th>Joined</th><th>Email</th><th>Plan</th><th>Guidebooks</th></tr></thead>
              <tbody>{data.users.slice(0, 8).map((u) => <tr key={u.uid}><td>{day(u.createdAt)}</td><td>{u.email}</td><td>{u.planLabel}</td><td>{u.live}/{u.properties} live</td></tr>)}</tbody></table></div>
          )}
        </div>
      </>}

      {tab === "accounts" && (
        <div className="tbl"><table>
          <thead><tr><th>Account</th><th>Plan</th><th>Guidebooks</th><th>Founding</th><th>Free</th><th>Note</th><th>Stripe</th></tr></thead>
          <tbody>{data.users.filter((u) => match(u.email) || match(u.name)).map((u) => (
            <tr key={u.uid}>
              <td><b>{u.name || "—"}</b><div className="small muted">{u.email}</div><div className="small muted">Joined {day(u.createdAt)}</div></td>
              <td>{u.planLabel}{u.subscriptionStatus === "past_due" && <div><span className="pill warn">Payment failed</span></div>}</td>
              <td>{u.live}/{u.properties} live<div className="small muted">Allowance {u.allowance >= 999 ? "∞" : u.allowance}</div></td>
              <td><input type="checkbox" aria-label="Founding host" checked={u.founding} disabled={busy === u.uid} onChange={(e) => patchUser(u.uid, { founding: e.target.checked })} /></td>
              <td><input type="checkbox" aria-label="Complimentary account" checked={u.comp} disabled={busy === u.uid} onChange={(e) => patchUser(u.uid, { comp: e.target.checked })} /></td>
              <td><input type="text" aria-label="Note" defaultValue={u.note} onBlur={(e) => e.target.value !== u.note && patchUser(u.uid, { note: e.target.value })} style={{ minWidth: 140 }} /></td>
              <td>{u.stripeCustomerId ? <a href={`https://dashboard.stripe.com/customers/${u.stripeCustomerId}`} target="_blank" rel="noopener noreferrer">Open</a> : "—"}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}

      {tab === "guidebooks" && (
        <div className="tbl"><table>
          <thead><tr><th>Guidebook</th><th>Owner</th><th>Status</th><th>Activity</th><th></th></tr></thead>
          <tbody>{data.properties.filter((p) => match(p.name) || match(owners[p.ownerUid]?.email)).map((p) => (
            <tr key={p.id}>
              <td><b>{p.name}</b><div className="small muted">/g/{p.slug}</div></td>
              <td className="small">{owners[p.ownerUid]?.email || "—"}</td>
              <td><span className={`pill ${p.published ? "" : "off"}`}>{p.published ? "Live" : "Draft"}</span></td>
              <td className="small">{p.checkoutCount} check-outs · {p.reviewCount} ratings<div className="muted">Updated {day(p.updatedAt)}</div></td>
              <td><div className="btnrow">
                <Link className="btn small" href={`/dashboard/properties/${p.id}`}>Edit</Link>
                {p.published && <a className="btn small" href={`/g/${p.slug}`} target="_blank" rel="noopener noreferrer">View</a>}
                <button type="button" className="btn small" disabled={busy === p.id} onClick={() => setLive(p.id, !p.published)}>{p.published ? "Take offline" : "Put live"}</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}

      {tab === "payments" && (data.payments.length === 0 ? <p className="empty">No payments yet. They appear here as Stripe confirms them.</p> : (
        <div className="tbl"><table>
          <thead><tr><th>Date</th><th>Account</th><th>What</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>{data.payments.filter((p) => match(owners[p.uid]?.email) || match(p.description)).map((p) => (
            <tr key={p.id}>
              <td>{day(p.at)}</td><td className="small">{owners[p.uid]?.email || p.customer}</td><td className="small">{p.description}</td>
              <td>{gbp(p.amount)}</td>
              <td><span className={`pill ${p.status === "paid" ? "" : "warn"}`}>{p.status}</span></td>
            </tr>
          ))}</tbody>
        </table></div>
      ))}

      {tab === "places" && <>
        <div className="btnrow" style={{ justifyContent: "space-between" }}>
          <p className="muted small">Every local place guests have rated, across all guidebooks. Use it to approach businesses about featured spots and guest offers.</p>
          <button type="button" className="btn small" onClick={placesCsv} disabled={!data.places.length}>Download CSV</button>
        </div>
        {data.places.length === 0 ? <p className="empty">No ratings yet. They build up as guests rate the local picks in each guidebook.</p> : (
          <div className="tbl"><table>
            <thead><tr><th>Place</th><th>Ratings</th><th>Average</th><th>Recommend</th><th>Guidebooks</th><th>Guest tips</th></tr></thead>
            <tbody>{data.places.filter((p) => match(p.name) || match(p.dest)).map((p) => (
              <tr key={p.dest + p.name}>
                <td><b>{p.name}</b><div className="small muted">{p.type}{p.dest ? ` · ${p.dest}` : ""}</div></td>
                <td>{p.count}</td><td>{p.avg.toFixed(1)} ★</td><td>{p.recommendPct === null ? "—" : `${p.recommendPct}%`}</td><td>{p.properties}</td>
                <td className="small">{p.tips.join(" · ") || "—"}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </>}
    </>
  );
}
