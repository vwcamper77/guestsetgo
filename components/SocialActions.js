"use client";

import { useState } from "react";

export default function SocialActions({ instagramUrl, facebookUrl, siteUrl }) {
  const [message, setMessage] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function share() {
    setMessage("");
    setManualUrl("");
    setBusy(true);
    const url = new URL("/", siteUrl || window.location.origin).href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "GuestSetGo", text: "Digital guest guidebooks for holiday lets", url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setMessage("Website link copied. Ready to share!");
      } else {
        setManualUrl(url);
        setMessage("Copy this link to share GuestSetGo.");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setManualUrl(url);
        setMessage("Copy this link to share GuestSetGo.");
      }
    } finally {
      setBusy(false);
    }
  }

  return <div className="social-actions">
    <p className="small"><strong>Follow and share GuestSetGo</strong></p>
    <div className="btnrow">
      {instagramUrl && <a className="btn small" href={instagramUrl} target="_blank" rel="noopener noreferrer">Follow on Instagram<span className="social-new-tab"> (opens in a new tab)</span></a>}
      {facebookUrl && <a className="btn small" href={facebookUrl} target="_blank" rel="noopener noreferrer">Follow on Facebook<span className="social-new-tab"> (opens in a new tab)</span></a>}
      <button className="btn small" type="button" onClick={share} disabled={busy}>{busy ? "Sharing…" : "Share GuestSetGo"}</button>
      <a className="btn small" href="/sharing">Get Instagram & Facebook cards</a>
    </div>
    <p className="small muted" role="status">{message}</p>
    {manualUrl && <label className="small">Website link<input aria-label="GuestSetGo website link" readOnly value={manualUrl} onFocus={event => event.target.select()} /></label>}
  </div>;
}
