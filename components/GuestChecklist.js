"use client";
import { useState } from 'react';

export default function GuestChecklist() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/checklist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), tips: data.get('tips') === 'on', website: data.get('website') }) });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'Please try again.'); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'guestsetgo-impress-your-guests.pdf'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setReady(true);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <aside className="editorial-cta checklist-offer" id="guest-checklist">
    <span className="eyebrow">Free host checklist · Printable PDF</span>
    <h2>Impress your guests. Give them a reason to return.</h2>
    <p>A practical checklist for a smoother arrival, thoughtful little touches, an honest review request and a warm invitation to stay again. Small improvements that can support better reviews and repeat bookings.</p>
    <form onSubmit={submit} className="checklist-form">
      <label className="field">Your email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>
      <label className="checklist-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <label className="checklist-consent"><input name="tips" type="checkbox" /> Also send me occasional GuestSetGo hosting tips and product news. I can unsubscribe by emailing hello@guestsetgo.com.</label>
      <p className="small muted">We save your email with your checklist request. Hosting emails are optional. <a href="/privacy">Privacy policy</a>.</p>
      <button className="btn solid" disabled={busy}>{busy ? 'Preparing your checklist…' : ready ? 'Download the checklist again ↓' : 'Get my free checklist ↓'}</button>
      <p role="status" className="small">{error || (ready ? 'Your PDF is ready. Check your downloads.' : '')}</p>
    </form>
  </aside>;
}
