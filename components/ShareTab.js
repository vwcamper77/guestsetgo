"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
const esc = (v) => String(v || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export default function ShareTab({ property: p }) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  const link = `${site}/g/${p.slug}`;
  const [qr, setQr] = useState("");
  const [recipient, setRecipient] = useState("");
  const [welcome, setWelcome] = useState(p.intro || "We're delighted to welcome you. We hope you have a wonderful stay!");
  const [status, setStatus] = useState("");
  useEffect(() => {
    let active = true;
    setQr("");
    QRCode.toDataURL(link, { width: 900, margin: 4, errorCorrectionLevel: "M" }).then(url => { if (active) setQr(url); }).catch(() => { if (active) setStatus("Could not generate QR code. Please reload and try again."); });
    return () => { active = false; };
  }, [link]);
  const subject = `Here is your guide for your stay at ${p.name}`;
  const body = `Welcome to ${p.name}!\n\n${welcome}\n\nYour welcome guide includes arrival information, Wi-Fi, parking, house instructions and local recommendations.${p.checkInTime ? `\nCheck-in: ${p.checkInTime}` : ""}${p.checkOutTime ? `\nCheck-out: ${p.checkOutTime}` : ""}\n\n${p.hostName ? `Your host: ${p.hostName}` : "Your host"}${p.phone ? `\nPhone: ${p.phone}` : ""}${p.whatsapp ? `\nWhatsApp: ${p.whatsapp}` : ""}\n\nWe look forward to welcoming you!${p.hostName ? `\n${p.hostName}` : ""}\n\nGet your welcome guide here:\n${link}`;
  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); setStatus("Copied."); }
    catch { setStatus("Copy is unavailable. Select and copy the preview text or guide link below."); }
  }
  function printSign(size) {
    const win = window.open("", "_blank");
    if (!win) { setStatus("Allow pop-ups to open your printable sign."); return; }
    const accent = /^#[0-9a-f]{6}$/i.test(p.accent || "") ? p.accent : "#10233a";
    win.document.write(`<!doctype html><html><head><title>${esc(p.name)} - ${size} welcome sign</title><style>@page{size:${size} portrait;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#10233a;text-align:center}main{border:2px solid ${accent};border-radius:8mm;padding:8mm;overflow-wrap:anywhere}.brand{font-size:14pt;font-weight:bold;letter-spacing:2px;color:${accent}}h1{font-size:${size === "A4" ? 32 : 23}pt;margin:7mm 0}p{font-size:${size === "A4" ? 13 : 10}pt;line-height:1.5;white-space:pre-wrap}img{display:block;width:${size === "A4" ? 85 : 62}mm;margin:4mm auto}.link{font-size:9pt}.actions{padding:16px}button{padding:12px;cursor:pointer}@media print{.actions{display:none}}</style></head><body><div class="actions"><button onclick="window.print()">Print ${size} / Save as PDF</button><p>Choose ${size}, portrait, 100% scale, and turn off headers and footers.</p></div><main><div class="brand">GuestSetGo</div><h1>Welcome to ${esc(p.name)}</h1><p>${esc(welcome)}</p>${p.hostName ? `<p>Your host: <strong>${esc(p.hostName)}</strong></p>` : ""}<img src="${qr}" alt="Scan for your welcome guide"><h2>Scan for your welcome guide</h2><p>Wi-Fi · Arrival details · House tips · Local favourites</p><p class="link">${esc(link)}</p>${p.phone || p.whatsapp ? `<p>Need a hand? ${esc(p.phone || p.whatsapp)}</p>` : ""}</main></body></html>`);
    win.document.close();
  }
  function downloadEmail() {
    const base64 = text => { let binary = ""; for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte); return btoa(binary); };
    const wrap = text => text.match(/.{1,76}/g)?.join("\r\n") || "";
    const boundary = `guestsetgo_${Date.now()}`;
    const eml = [`To: ${recipient.replace(/[\r\n]/g, "")}`, `Subject: =?UTF-8?B?${base64(subject)}?=`, "MIME-Version: 1.0", "X-Unsent: 1", `Content-Type: multipart/mixed; boundary="${boundary}"`, "", `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", wrap(base64(body)), `--${boundary}`, 'Content-Type: image/png; name="welcome-guide-qr.png"', 'Content-Disposition: attachment; filename="welcome-guide-qr.png"', "Content-Transfer-Encoding: base64", "", wrap(qr.split(",")[1]), `--${boundary}--`, ""].join("\r\n");
    const url = URL.createObjectURL(new Blob([eml], { type: "message/rfc822" }));
    const a = document.createElement("a"); a.href = url; a.download = `${p.slug}-welcome-email.eml`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="listedit">
    {!p.published && <p className="notice warn">This guidebook is a draft. Publish it before sending it to guests.</p>}
    <h2>Send your guest their welcome guide</h2>
    <label className="field"><span>Guest email (optional)</span><input type="email" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="guest@example.com" /></label>
    <label className="field"><span>Welcome message for email and print</span><textarea rows={4} value={welcome} onChange={e => setWelcome(e.target.value)} /><small className="muted">Starts with your guide's welcome message. Changes here apply to this sharing session.</small></label>
    <div className="btnrow">
      <a className="btn solid small" href={`mailto:${encodeURIComponent(recipient)}?${query}`}>Open email app</a>
      <a className="btn small" href={`https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(recipient)}&${query}`} target="_blank" rel="noopener noreferrer">Outlook</a>
      <a className="btn small" href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`} target="_blank" rel="noopener noreferrer">Gmail</a>
      <button type="button" className="btn small" onClick={() => copy(`Subject: ${subject}\n\n${body}`)}>Copy email</button>
      <button type="button" className="btn small" disabled={!qr} onClick={downloadEmail}>Download email with QR attached</button>
    </div>
    <p className="small muted">Review and send in your email app. Email buttons cannot attach images automatically: download the email draft for a compatible app, or attach the QR image below in Outlook or Gmail.</p>
    <details><summary>Preview email</summary><div className="snippet"><b>{subject}</b>{"\n\n"}{body}</div></details>
    <div className="field"><span>Guest guide link</span><div className="btnrow"><code style={{wordBreak:"break-all"}}>{link}</code><button type="button" className="btn small" onClick={() => copy(link)}>Copy link</button></div></div>
    <h2>Print a welcome QR sign</h2>
    <p className="small muted">Your property name, welcome message, host details and guide QR code, with GuestSetGo branding and your chosen colour.</p>
    <div className="btnrow"><button type="button" className="btn solid small" disabled={!qr} onClick={() => printSign("A4")}>Print A4 sign</button><button type="button" className="btn small" disabled={!qr} onClick={() => printSign("A5")}>Print A5 sign</button>{qr && <a className="btn small" href={qr} download={`${p.slug}-qr.png`}>Download QR image</a>}</div>
    <div className="qrsign">{qr && <img src={qr} alt={`QR code for the welcome guide at ${p.name}`} />}<b>Welcome to {p.name}</b><small>Scan for your welcome guide · GuestSetGo</small></div>
    {status && <p role="status" className="small">{status}</p>}
  </div>;
}
