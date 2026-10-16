"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

export default function VisitorAnalytics() {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try { setData(await api("/api/admin/visitors")); } catch (e) { setError(e.message); }
  }, [api]);
  useEffect(() => { load(); }, [load]);
  return <>
    <div className="page-head"><div><h2>Visitors</h2><p className="muted">Last 30 days · UTC dates · page views, including repeat visits.</p></div><button className="btn small" onClick={load}>Refresh visitors</button></div>
    <p className="small muted">Tracking starts when this update goes live. No cookies, IP addresses or visitor identities are stored. Sign-in, dashboard and admin pages are excluded. These counts do not measure unique visitors and may include automated traffic.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {!data && !error && <p className="muted">Loading visitor activity…</p>}
    {data && <>
      <div className="grid3"><div className="stat"><span>Page views today</span><b>{data.days[0].views.toLocaleString()}</b></div><div className="stat"><span>Page views · 7 days</span><b>{data.days.slice(0, 7).reduce((n, d) => n + d.views, 0).toLocaleString()}</b></div><div className="stat"><span>Page views · 30 days</span><b>{data.total.toLocaleString()}</b></div></div>
      {data.total === 0 && <p className="empty">No visits recorded yet. Public page visits will appear here.</p>}
      <div className="panel"><h3>Daily activity</h3><div className="tbl"><table><thead><tr><th>Date (UTC)</th><th>Page views</th></tr></thead><tbody>{data.days.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.views.toLocaleString()}</td></tr>)}</tbody></table></div></div>
      {[['Popular pages', data.pages], ['Referral sources', data.sources]].map(([title, rows]) => <div className="panel" key={title}><h3>{title}</h3><div className="tbl"><table><thead><tr><th>{title === 'Popular pages' ? 'Page' : 'Source'}</th><th>Page views</th></tr></thead><tbody>{rows.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.views.toLocaleString()}</td></tr>)}</tbody></table></div></div>)}
    </>}
  </>;
}
