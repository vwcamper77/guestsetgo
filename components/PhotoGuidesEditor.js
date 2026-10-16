"use client";
import { useState } from "react";
import { ref as sref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { clientAuth, clientStorage } from "@/lib/firebase-client";
import { useAuth } from "@/components/AuthProvider";
import { StringList, uid } from "./editors";
import PhotoDropzone from "./PhotoDropzone";

const IDEAS = ["Watch Netflix on the TV", "If the power goes off", "Dishwasher and tablets", "Bins out night", "Heating and hot water", "Washing machine"];

async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const max = 1600, sc = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((r) => c.toBlob(r, "image/jpeg", 0.82));
  } finally { URL.revokeObjectURL(url); }
}

export async function uploadHousePhoto(file, propertyId) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error("Choose JPG, PNG or WebP photos under 20 MB each.");
  const user = clientAuth().currentUser;
  if (!user) throw new Error("Please sign in before uploading photos.");
  const blob = await shrink(file);
  const path = `uploads/${user.uid}/${propertyId}/${uid()}.jpg`;
  const r = sref(clientStorage(), path);
  await uploadBytes(r, blob, { contentType: "image/jpeg" });
  try { return { img: await getDownloadURL(r), path }; }
  catch (e) { await deleteObject(r).catch(() => {}); throw e; }
}

function GuideEditor({ g, propertyId, onChange, onRemove }) {
  const { api } = useAuth();
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (patch) => onChange({ ...g, ...patch });

  async function suggest() {
    setAiBusy(true); setAiStatus("");
    try {
      const d = await api(`/api/properties/${propertyId}/ai-photo-guide`, { method: "POST", body: { imageUrl: g.img, note } });
      set({ title: d.title || g.title, area: d.area || g.area, steps: d.steps?.length ? d.steps : g.steps });
      setAiStatus("Drafted from the photo — check it over and edit anything that's not quite right.");
    } catch (e) {
      setAiStatus(e.message);
    }
    setAiBusy(false);
  }

  async function upload(file) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 20 * 1024 * 1024) return setStatus("Choose a JPG, PNG or WebP photo under 20 MB.");
    setUploading(true);
    setStatus("Uploading photo…");
    try {
      const { img, path } = await uploadHousePhoto(file, propertyId);
      // Keep the previous image until the property is deleted: an unsaved edit
      // must not break the image still used by the live guidebook.
      set({ img, path, pins: [] });
      setStatus("Photo added. Tap it to drop numbered dots.");
    } catch (e) {
      setStatus("That photo couldn't be uploaded. Try a JPG or PNG, and check your connection.");
    }
    setUploading(false);
  }

  function addPin(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = +(((e.clientX - r.left) / r.width) * 100).toFixed(1);
    const y = +(((e.clientY - r.top) / r.height) * 100).toFixed(1);
    if ((g.pins || []).length >= 12) return setStatus("Up to 12 dots per photo.");
    set({ pins: [...(g.pins || []), { x, y, label: "" }] });
  }

  return (
    <div className="panel" style={{ background: "var(--bg)" }}>
      <div className="grid2">
        <label className="field"><span>Title</span><input type="text" value={g.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Watch Netflix on the TV" /></label>
        <label className="field"><span>Where it is</span><input type="text" value={g.area} onChange={(e) => set({ area: e.target.value })} placeholder="e.g. Living room, black remote" /></label>
      </div>
      <PhotoDropzone label="House photo to mark up" hint="Choose a close-up of the remote, appliance or place you want to explain. Then click or tap the photo to add numbered markers." disabled={uploading} onFiles={(files) => { if (files.length > 1) setStatus("Choose one photo for this instruction card."); else upload(files[0]); }} />
      {g.img ? (
        <div className="photo editing" onClick={addPin} role="button" tabIndex={0} aria-label="Tap to add a numbered dot">
          <img src={g.img} alt={g.title} />
          {(g.pins || []).map((p, i) => <span key={i} className="pin" style={{ left: `${p.x}%`, top: `${p.y}%` }}>{i + 1}</span>)}
        </div>
      ) : <div className="photo placeholder">No photo yet</div>}
      {status && <p className="small muted" role="status">{status}</p>}
      {g.img && (
        <div className="field" style={{ background: "var(--bg)", padding: 10, borderRadius: 10 }}>
          <span>AI assist (optional)</span>
          <div className="btnrow" style={{ flexWrap: "nowrap" }}>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="One-line note, e.g. black remote, press the red NETFLIX button" style={{ flex: 1, minWidth: 0 }} />
            <button type="button" className="btn small" onClick={suggest} disabled={aiBusy}>{aiBusy ? "Thinking…" : "✨ Draft title & steps"}</button>
          </div>
          {aiStatus && <small className="muted">{aiStatus}</small>}
        </div>
      )}
      {(g.pins || []).length > 0 && (
        <div className="field"><span>Dots</span>
          <div className="listedit">
            {g.pins.map((p, i) => (
              <div className="btnrow" key={i} style={{ flexWrap: "nowrap" }}>
                <span className="pin inline">{i + 1}</span>
                <input type="text" aria-label={`Dot ${i + 1}`} value={p.label} placeholder="What this shows, e.g. Press the red NETFLIX button" onChange={(e) => set({ pins: g.pins.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} style={{ flex: 1, minWidth: 0 }} />
                <button type="button" className="btn small danger" aria-label={`Remove dot ${i + 1}`} onClick={() => set({ pins: g.pins.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <StringList label="Extra steps" items={g.steps || []} onChange={(steps) => set({ steps })} addLabel="Add a step" placeholder="e.g. Use the black remote, not the silver one" />
      <div><button type="button" className="btn small danger" onClick={onRemove}>Remove this photo guide</button></div>
    </div>
  );
}

export default function PhotoGuidesEditor({ guides = [], propertyId, onChange }) {
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  async function addPhotos(files) {
    if (!files.length || bulkUploading) return;
    if (files.length + guides.length > 30) return setBulkStatus("A guidebook can have up to 30 photo guides. Choose fewer photos.");
    if (files.some((f) => !["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 20 * 1024 * 1024)) return setBulkStatus("Choose JPG, PNG or WebP photos under 20 MB each.");
    setBulkUploading(true); setBulkStatus("Uploading house photos…");
    const added = [];
    try {
      for (const file of files) {
        const photo = await uploadHousePhoto(file, propertyId);
        added.push({ id: uid(), title: "", area: "", ...photo, pins: [], steps: [] });
      }
      onChange([...guides, ...added]); setBulkStatus(`${added.length} house photo${added.length === 1 ? "" : "s"} added. Add titles, then click each photo to mark it up.`);
    } catch (e) {
      await Promise.allSettled(added.map((g) => deleteObject(sref(clientStorage(), g.path))));
      setBulkStatus(e.message || "Photos couldn't be uploaded. Please try again.");
    } finally { setBulkUploading(false); }
  }
  const add = (title = "") => onChange([...guides, { id: uid(), title, area: "", img: "", path: "", pins: [], steps: [] }]);
  return (
    <div className="listedit">
      <h2>House photos & instructions</h2><p className="muted small">Add a photo guide below, then drag in a photo from your laptop or choose one from your phone. Click or tap the photo to mark exactly what to press or where to look.</p>
      <PhotoDropzone label="Add house photos" hint="Drop several photos to create separate instruction cards, ready for titles and numbered markers." multiple disabled={bulkUploading} onFiles={addPhotos} />
      {bulkStatus && <p className="small muted" role="status">{bulkStatus}</p>}
      <fieldset disabled={bulkUploading} className="photo-guide-fields">
      {guides.map((g, i) => (
        <GuideEditor key={g.id} g={g} propertyId={propertyId}
          onChange={(ng) => onChange(guides.map((x, j) => (j === i ? ng : x)))}
          onRemove={() => onChange(guides.filter((_, j) => j !== i))} />
      ))}
      <div className="btnrow">
        <button type="button" className="btn solid small" onClick={() => add()}>+ Add a photo guide</button>
        {IDEAS.filter((t) => !guides.some((g) => g.title === t)).slice(0, 4).map((t) => (
          <button key={t} type="button" className="btn small" onClick={() => add(t)}>+ {t}</button>
        ))}
      </div>
      </fieldset>
    </div>
  );
}
