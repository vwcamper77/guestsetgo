"use client";
import { useState } from "react";
import PhotoDropzone from "./PhotoDropzone";
import { uploadHousePhoto } from "./PhotoGuidesEditor";
import { Text } from "./editors";

export default function PropertyPhotoEditor({ property, onChange, onUploadingChange, uploading = false }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const photo = property.propertyPhoto;
  async function upload(files) {
    if (busy || uploading) return;
    if (files.length !== 1) { if (files.length) setStatus("Choose one photo of the front of your property."); return; }
    setBusy(true); onUploadingChange(true); setStatus("Uploading property photo…");
    try {
      const uploaded = await uploadHousePhoto(files[0], property.id);
      onChange({ propertyPhoto: { ...uploaded, alt: photo?.alt || "" } });
      setStatus("Photo added. Save your guide to show it to guests.");
    } catch (error) { setStatus(error.message || "The photo could not be uploaded. Please try again."); }
    finally { setBusy(false); onUploadingChange(false); }
  }
  return <section className="property-photo-editor">
    <h2>Front of the property</h2><p className="small muted">Help arriving guests recognise the building. This photo appears at the top of the guest guide, beside your welcome text.</p>
    <PhotoDropzone label={photo?.img ? "Replace the property photo" : "Add a front-of-property photo"} hint="Choose a clear square or landscape photo showing the front, entrance and anything guests can recognise from the road. JPG, PNG or WebP, up to 20 MB." disabled={busy || uploading} onFiles={upload} />
    {photo?.img && <><img className="property-photo-preview" src={photo.img} alt={photo.alt || `Front of ${property.name || "the property"}`} width="640" height="480" /><Text label="Describe the property photo" value={photo.alt} onChange={alt => onChange({ propertyPhoto: { ...photo, alt } })} placeholder="e.g. White cottage with a green front door beside the stone wall" hint="Describe the building and entrance for guests who use a screen reader." /><div><button className="btn small" type="button" disabled={busy} onClick={() => { onChange({ propertyPhoto: null }); setStatus("Photo removed from the draft. Save to update the guest guide."); }}>Remove property photo</button></div></>}
    {status && <p className="small" role="status">{status}</p>}
  </section>;
}
