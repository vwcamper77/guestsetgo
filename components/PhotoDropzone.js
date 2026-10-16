"use client";
import { useState } from "react";

export default function PhotoDropzone({ label, hint, multiple = false, disabled = false, onFiles }) {
  const [over, setOver] = useState(false);
  return <div className={`photo-dropzone ${over ? "drag-over" : ""}`} role="group" aria-label={label}
    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) { e.dataTransfer.dropEffect = "copy"; setOver(true); } }}
    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false); }}
    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setOver(false); if (!disabled) onFiles(Array.from(e.dataTransfer.files || [])); }}>
    <b>{label}</b><p className="small muted">Drag and drop {multiple ? "photos" : "a photo"} here from your laptop, or choose {multiple ? "files" : "a file"} below.</p>
    <label className="field"><span className="small">Choose {multiple ? "photos" : "a photo"}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple} disabled={disabled} onChange={(e) => { onFiles(Array.from(e.target.files || [])); e.target.value = ""; }} /></label>
    {hint && <p className="small muted">{hint}</p>}
  </div>;
}
