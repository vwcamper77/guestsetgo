"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function ShareTab({ property }) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const link = `${site}/g/${property.slug}`;
  const [qr, setQr] = useState("");
  const [sign, setSign] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dataUrl = await QRCode.toDataURL(link, { width: 600, margin: 1, color: { dark: "#10233a", light: "#ffffff" } });
      if (cancelled) return;
      setQr(dataUrl);
      // Door sign: QR with a short line underneath, ready to print or attach.
      const img = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = dataUrl; });
      const W = 900, H = 1100, c = document.createElement("canvas"); c.width = W; c.height = H;
      const x = c.getContext("2d");
      x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H);
      x.drawImage(img, 120, 90, 660, 660);
      x.fillStyle = "#10233a"; x.textAlign = "center"; x.font = "700 52px Arial, sans-serif";
      x.fillText("Scan for Wi-Fi, check-in", W / 2, 860); x.fillText("and local tips", W / 2, 925);
      x.font = "400 36px Arial, sans-serif"; x.fillStyle = "#4b5d6e"; x.fillText(property.name, W / 2, 1000);
      if (!cancelled) setSign(c.toDataURL("image/png"));
    })();
    return () => { cancelled = true; };
  }, [link, property.name]);

  const email = `Your guidebook for ${property.name}

Everything for your stay is here: check-in steps, Wi-Fi, parking, how things work, and our favourite local spots with walking routes.

${link}

You'll also find a QR code just inside the front door.${property.whatsapp ? ` Any problems, message ${property.hostName || "us"} on WhatsApp: ${property.whatsapp}.` : ""}`;

  const copy = (t, k) => navigator.clipboard?.writeText(t).then(() => { setCopied(k); setTimeout(() => setCopied(""), 1500); });

  return (
    <div className="listedit">
      {!property.published && <p className="notice warn">This guidebook is a draft. Guests will see "not found" until you put it live.</p>}
      <div className="field"><span>Guest link</span>
        <div className="btnrow"><code style={{ wordBreak: "break-all" }}>{link}</code><button type="button" className="btn small" onClick={() => copy(link, "link")}>{copied === "link" ? "Copied" : "Copy link"}</button></div>
      </div>
      <div className="btnrow" style={{ alignItems: "flex-start", gap: 20 }}>
        <div className="qrsign">{qr ? <img src={qr} alt="QR code for the guidebook" /> : <div style={{ width: 180, height: 180 }} />}<b>Scan for Wi-Fi, check-in and local tips</b><small>{property.name}</small></div>
        <div className="listedit" style={{ flex: "1 1 240px" }}>
          <p className="small muted">Attach the QR code to your booking confirmation email, add it to Airbnb saved messages, and print the door sign for inside the front door.</p>
          {qr && <a className="btn solid small" href={qr} download={`${property.slug}-qr.png`}>Download QR code</a>}
          {sign && <a className="btn small" href={sign} download={`${property.slug}-door-sign.png`}>Download door sign</a>}
        </div>
      </div>
      <div className="field"><span>Text for your booking confirmation email</span>
        <div className="snippet">{email}</div>
        <div><button type="button" className="btn small" onClick={() => copy(email, "email")}>{copied === "email" ? "Copied" : "Copy email text"}</button></div>
      </div>
    </div>
  );
}
