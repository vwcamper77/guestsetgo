"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { IMPORT_FIELDS, mergeImport } from "@/lib/manual-import.mjs";
import PhotoDropzone from "./PhotoDropzone";

async function readPhoto(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Please use JPG, PNG or WebP photos. Convert HEIC photos to JPG first.");
  if (file.size > 20 * 1024 * 1024) throw new Error("Please use photos smaller than 20 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("That photo couldn't be opened.")); image.src = url; });
    const canvas = document.createElement("canvas");
    const ratio = Math.min(1, 1800 / Math.max(img.width, img.height));
    canvas.width = Math.round(img.width * ratio); canvas.height = Math.round(img.height * ratio);
    const context = canvas.getContext("2d");
    context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(img, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL("image/jpeg", 0.8);
    if (data.length > 360000) data = canvas.toDataURL("image/jpeg", 0.55);
    if (data.length > 360000) throw new Error("That photo has too much detail. Crop it to one page and try again.");
    return { name: file.name, data };
  } finally { URL.revokeObjectURL(url); }
}

export default function FolderConversion({ property, onApply, onDraftReady }) {
  const { api } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [note, setNote] = useState("");
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState({});
  const [reviewed, setReviewed] = useState(false);
  const [request, setRequest] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { api("/api/me").then((d) => setIsAdmin(d.isAdmin)).catch(() => {}); }, [api]);
  useEffect(() => { if (property.assistancePaidAt) api(`/api/properties/${property.id}/import`).then((d) => setRequest(d.request)).catch((e) => setError(e.message)); }, [api, property.id, property.assistancePaidAt]);
  async function choose(files) {
    setBusy("photos"); setError(""); setMessage(""); setResult(null);
    try {
      if (photos.length + files.length > 8) throw new Error("Choose up to eight photos per batch. Import additional pages in another batch.");
      const added = [];
      for (const file of files) added.push(await readPhoto(file));
      setPhotos((current) => [...current, ...added]);
    } catch (e) { setError(e.message); }
    finally { setBusy(""); }
  }
  async function convert(action) {
    setBusy(action); setError(""); setMessage("");
    try {
      const data = await api(`/api/properties/${property.id}/import`, { method: "POST", body: { action, images: photos.map((p) => p.data), note } });
      if (action === "assisted") { setRequest({ status: "submitted" }); setMessage("Photos submitted. Our team will prepare your manual and contact you by email. You approve it before it goes live."); setPhotos([]); }
      else { setResult(data); setSelected({}); setReviewed(false); }
    } catch (e) { setError(e.message); }
    finally { setBusy(""); }
  }
  function apply() {
    if (property.published) return setError("Take this guidebook offline before applying an import, so you can review the changes privately.");
    let patch;
    try { patch = mergeImport(property, result.draft, selected); } catch (e) { return setError(e.message); }
    onApply(patch); onDraftReady(); setResult(null);
    setMessage("Selected content added to your editor. Review it in the other tabs, then Save. Nothing has been published by this import.");
  }
  if (!property.assistancePaidAt) return <div className="notice"><h2>Welcome folder conversion</h2><p>£79 once per property. Convert the pages in your existing welcome folder, brochures and business cards into a guidebook draft. Uploads and AI conversion unlock after payment.</p><Link className="btn solid" href={`/dashboard/billing?plan=assisted&property=${encodeURIComponent(property.id)}`}>Unlock folder conversion — £79 once</Link></div>;
  return <div className="listedit">
    <div><span className="k">Paid setup service · unlocked</span><h2>Convert your welcome folder</h2>
      <p>Your welcome folder, handwritten notes, brochures and business cards are a useful starting point. Take clear photos, one page or card per photo, including both sides if needed.</p></div>
    <PhotoDropzone label="Welcome folder pages, brochures & cards" hint="Up to eight photos per batch. One page or card per photo, JPG, PNG or WebP." multiple disabled={!!busy} onFiles={choose} />
    <p className="small muted">Leave guest personal details and door codes out of photos. Photos used for AI drafts are sent to our AI provider; originals are saved privately only when you submit an assisted request.</p>
    {photos.length > 0 && <div className="import-photos">{photos.map((photo, index) => <div key={`${photo.name}-${index}`}><img src={photo.data} alt={`Photo ${index + 1}: ${photo.name}`} /><button className="btn small" disabled={!!busy} type="button" onClick={() => { setPhotos((p) => p.filter((_, i) => i !== index)); setResult(null); }}>Remove photo {index + 1}</button></div>)}</div>}
    <label className="field"><span>Anything we should know?</span><textarea maxLength={2000} value={note} disabled={!!busy} onChange={(e) => { setNote(e.target.value); setResult(null); }} placeholder="e.g. The restaurant on card 2 has moved. The handwritten page replaces the printed checkout instructions." /></label>
    <div className="notice"><b>Your £79 folder-conversion purchase includes AI draft conversion and preparation help.</b> You choose what to add and check the result. Brochure prices, opening hours and instructions can be out of date.</div>
    <div className="btnrow"><button className="btn solid" disabled={!!busy || !photos.length} type="button" onClick={() => convert("draft")}>{busy === "draft" ? "Reading your photos…" : "Create a draft from photos"}</button></div>
    {result && <section className="import-review" aria-label="Review imported draft">
      <h3>Choose what to add</h3><p className="small">Lists are appended to your existing content. Selected text fields replace their current value. Existing rules and lists remain until you edit them.</p>
      {result.warnings?.length > 0 && <div className="notice warn"><b>Check these details</b><ul>{result.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></div>}
      {Object.entries(result.draft).map(([key, value]) => <div className="import-section" key={key}><label><input type="checkbox" checked={!!selected[key]} onChange={(e) => setSelected((s) => ({ ...s, [key]: e.target.checked }))} /> {IMPORT_FIELDS[key]}</label>{typeof value === "string" && property[key] && <p className="small muted">Current value: {property[key]}</p>}{typeof value === "string" ? <p>{value}</p> : <ul>{value.map((item, i) => <li key={i}>{typeof item === "string" ? item : <><b>{item.title || item.name || item.label}</b>{(item.body || item.desc || item.value) && <p>{item.body || item.desc || item.value}</p>}{item.dest && <p className="small muted">{item.dest}</p>}</>}</li>)}</ul>}</div>)}
      {!Object.keys(result.draft).length && <p>No readable guidebook information found. Try a closer, brighter photo.</p>}
      <label className="import-confirm"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /> I've checked the selected details and will remove any outdated or conflicting instructions.</label>
      <button className="btn solid" type="button" disabled={!reviewed || !Object.values(selected).some(Boolean)} onClick={apply}>Add selected content to editor</button>
    </section>}
    <section className="notice"><h3>Ask us to prepare your folder draft</h3><p>Preparation help is included in your paid conversion service. Send your folder pages and we'll prepare the manual for you to review. Hosting is separate.</p>
      {request ? <><p role="status">Assisted setup: <b>{request.status}</b>. {request.status === "completed" ? "Your draft is ready in the editor. Review it before publishing." : "Our team will contact you by email."}</p>{isAdmin && <button type="button" className="btn" disabled={!!busy} onClick={() => convert("draft_assisted")}>{busy === "draft_assisted" ? "Reading submitted photos…" : "Prepare AI draft from submitted photos"}</button>}</>
        : property.assistancePaidAt ? <button type="button" className="btn" disabled={!!busy || !photos.length} onClick={() => convert("assisted")}>{busy === "assisted" ? "Submitting photos…" : "Send photos for assisted setup (already paid)"}</button>
          : <Link className="btn" href={`/dashboard/billing?plan=assisted&property=${encodeURIComponent(property.id)}`}>Choose assisted setup — £79 once</Link>}
    </section>
    {busy === "photos" && <p role="status">Preparing your photos…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {message && <p className="notice" role="status">{message}</p>}
  </div>;
}
