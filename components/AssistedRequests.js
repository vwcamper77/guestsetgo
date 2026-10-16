"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function AssistedRequests() {
  const { api } = useAuth();
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(() => api("/api/admin/imports").then((d) => setRequests(d.requests)).catch((e) => setError(e.message)), [api]);
  useEffect(() => { load(); }, [load]);
  async function update(propertyId, status) {
    setBusy(propertyId); setError("");
    try { await api("/api/admin/imports", { method: "PATCH", body: { propertyId, status } }); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(""); }
  }
  return <div className="listedit"><div className="btnrow"><h2>Assisted photo conversions</h2><button type="button" className="btn small" onClick={load}>Refresh requests and photo links</button></div>
    <p>Open the photos, prepare the manual in the property editor and save it offline. Mark it ready, then email the host to review and publish. Photo links expire after 15 minutes.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {!requests ? <p>Loading requests…</p> : !requests.length ? <p>No assisted requests yet.</p> : requests.map((request) => <article className="panel" key={request.propertyId}>
      <h3>{request.propertyName}</h3><p><b>{request.status}</b> · {request.email}</p><p>{request.note}</p>
      <div className="btnrow">{request.photos.map((url, i) => <a key={i} className="btn small" href={url} target="_blank" rel="noopener noreferrer">Photo {i + 1}</a>)}</div>
      <div className="btnrow"><Link className="btn" href={`/dashboard/properties/${request.propertyId}/folder-conversion`}>Prepare folder draft</Link>
        <button type="button" className="btn small" disabled={!!busy} onClick={() => update(request.propertyId, "in_progress")}>Mark in progress</button>
        <button type="button" className="btn small" disabled={!!busy} onClick={() => update(request.propertyId, "completed")}>Mark ready for host review</button>
      </div>
    </article>)}
  </div>;
}
