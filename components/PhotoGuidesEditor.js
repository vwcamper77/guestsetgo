"use client";
import { useState } from "react";
import { ref as sref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { clientAuth, clientStorage } from "@/lib/firebase-client";
import { StringList, uid } from "./editors";

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

function GuideEditor({ g, propertyId, onChange, onRemove }) {
  const [status, setStatus] = useState("");
  const set = (patch) => onChange({ ...g, ...patch });

  async function upload(file) {
    if (!file) return;
    setStatus("Uploading photo…");
    try {
      const blob = await shrink(file);
      const user = clientAuth().currentUser;
      const path = `uploads/${user.uid}/${propertyId}/${uid()}.jpg`;
      const r = sref(clientStorage(), path);
      await uploadBytes(r, blob, { contentType: "image/jpeg" });
      const url = await getDownloadURL(r);
      if (g.path) deleteObject(sref(clientStorage(), g.path)).catch(() => {});
      set({ img: url, path, pins: [] });
      setStatus("Photo added. Tap it to drop numbered dots.");
    } catch (e) {
      setStatus("That photo couldn't be uploaded. Try a JPG or PNG, and check your connection.");
    }
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
      <label className="field"><span>Photo</span>
        <input type="file" accept="image/*" capture="environment" onChange={(e) => upload(e.target.files?.[0])} />
        <small>On your phone this opens the camera. Take the photo close up, then tap it to mark what to press.</small>
      </label>
      {g.img ? (
        <div className="photo editing" onClick={addPin} role="button" tabIndex={0} aria-label="Tap to add a numbered dot">
          <img src={g.img} alt={g.title} />
          {(g.pins || []).map((p, i) => <span key={i} className="pin" style={{ left: `${p.x}%`, top: `${p.y}%` }}>{i + 1}</span>)}
        </div>
      ) : <div className="photo placeholder">No photo yet</div>}
      {status && <p className="small muted">{status}</p>}
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
      <div><button type="button" className="btn small danger" onClick={() => { if (g.path) deleteObject(sref(clientStorage(), g.path)).catch(() => {}); onRemove(); }}>Remove this photo guide</button></div>
    </div>
  );
}

export default function PhotoGuidesEditor({ guides = [], propertyId, onChange }) {
  const add = (title = "") => onChange([...guides, { id: uid(), title, area: "", img: "", path: "", pins: [], steps: [] }]);
  return (
    <div className="listedit">
      <p className="muted small">Take a photo of the things guests always ask about, then tap the photo to drop numbered dots on exactly what to press or where to look.</p>
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
    </div>
  );
}
