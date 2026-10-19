"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import FolderConversion from "@/components/FolderConversion";

export default function Page({ params }) {
  const { api } = useAuth();
  const [property, setProperty] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    let cancelled = false;
    const load = () => api(`/api/properties/${params.id}`).then((d) => { if (!cancelled) setProperty(d.property); }).catch((e) => { if (!cancelled) setError(e.message); });
    load();
    let timer;
    if (new URLSearchParams(window.location.search).get("checkout") === "success") { let attempts = 0; timer = setInterval(() => { load(); if (++attempts >= 5) clearInterval(timer); }, 2000); }
    return () => { cancelled = true; clearInterval(timer); };
  }, [api, params.id]);
  useEffect(() => { const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  async function save() {
    setBusy(true); setError("");
    try { const d = await api(`/api/properties/${params.id}`, { method: "PUT", body: { ...property, published: false } }); setProperty(d.property); setDirty(false); setMessage("Draft saved. Return to the guidebook editor to check each section and publish when ready."); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <><div className="page-head"><div><Link href={`/dashboard/properties/${params.id}`}>← Back to guidebook editor</Link><h1>Welcome folder conversion</h1><p className="muted">{property?.name} · Separate setup service</p></div></div>
    {error && <p className="error" role="alert">{error}</p>}
    {!property ? <p>Loading…</p> : <div className="panel">
      {property.published && property.assistancePaidAt && <p className="notice warn">This guidebook is live. Take it offline in the editor before applying converted content, so you can review the draft privately.</p>}
      <FolderConversion property={property} onApply={(patch) => { setProperty((p) => ({ ...p, ...patch })); setDirty(true); setMessage(""); }} onDraftReady={() => {}} />
      {dirty && <div className="savebar"><p>Converted content is ready to save as an offline draft.</p><button className="btn solid" type="button" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save guidebook draft"}</button></div>}
      {message && <p className="notice" role="status">{message} <Link href={`/dashboard/properties/${params.id}`}>Open guidebook editor</Link></p>}
    </div>}
  </>;
}
