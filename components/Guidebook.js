"use client";
import { useEffect, useMemo, useState } from "react";
import { waNumber } from "@/lib/slug";
import ArrivalDirections from "./ArrivalDirections";
import { arrivalDestination } from "@/lib/arrival.mjs";

const mapsLink = (origin, dest) =>
  `https://www.google.com/maps/dir/?api=1${origin?.trim() ? `&origin=${encodeURIComponent(origin.trim())}` : ""}&destination=${encodeURIComponent(dest.trim())}&travelmode=walking`;

function Stars({ value }) {
  const r = Math.round(value);
  return <span className="stars" aria-label={`${value.toFixed(1)} out of 5`}>{"★".repeat(r)}<span className="off">{"★".repeat(5 - r)}</span></span>;
}

function CopyButton({ text }) {
  const [label, setLabel] = useState("Copy");
  return (
    <button type="button" className="btn solid small" onClick={() => {
      navigator.clipboard?.writeText(text).then(() => { setLabel("Copied"); setTimeout(() => setLabel("Copy"), 1500); }, () => setLabel("Press and hold to copy"));
    }}>{label}</button>
  );
}

export function PhotoGuide({ g, children }) {
  return (
    <article className="guide" id={`g-${g.id}`}>
      <div className="guide-head"><h3>{g.title || "Untitled"}</h3>{g.area && <p className="small muted">{g.area}</p>}</div>
      {children || (
        g.img
          ? <div className="photo"><img src={g.img} alt={g.title} loading="lazy" />{(g.pins || []).map((p, i) => <span key={i} className="pin" style={{ left: `${p.x}%`, top: `${p.y}%` }}>{i + 1}</span>)}</div>
          : <div className="photo placeholder">Photo coming soon</div>
      )}
      <div className="guide-body">
        {!!g.pins?.length && <ol className="pinlist">{g.pins.map((p, i) => <li key={i}><span className="n">{i + 1}</span><span>{p.label}</span></li>)}</ol>}
        {!!g.steps?.length && <ul className="small muted" style={{ margin: 0, paddingLeft: "1.1em", display: "grid", gap: 4 }}>{g.steps.map((s, i) => <li key={i}>{s}</li>)}</ul>}
      </div>
    </article>
  );
}

function ReviewForm({ slug, pick, preview, onDone }) {
  const [stars, setStars] = useState(0);
  const [recommend, setRecommend] = useState(null);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (!stars) return setMsg("Tap a star rating first.");
    if (preview) return setMsg("Ratings are switched off in the preview.");
    setBusy(true); setMsg("");
    try {
      const res = await fetch(`/api/public/${slug}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pickId: pick.id, stars, recommend, text, name, website: "" }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't post that.");
      onDone({ stars, recommend, text, name, at: new Date().toISOString() });
    } catch (err) { setMsg(err.message); setBusy(false); }
  }
  return (
    <form className="revform" onSubmit={submit} noValidate>
      <div className="field"><span>Your rating</span>
        <div className="starpick">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={n <= stars ? "on" : ""} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setStars(n)}>★</button>)}</div>
      </div>
      <div className="field"><span>Would you recommend it to the next guests?</span>
        <div className="seg"><button type="button" className={recommend === true ? "on" : ""} onClick={() => setRecommend(true)}>Yes</button><button type="button" className={recommend === false ? "on" : ""} onClick={() => setRecommend(false)}>Not really</button></div>
      </div>
      <label className="field"><span>Tip for the next guests (optional)</span><input type="text" maxLength={200} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Get there before 7, order the crab" /></label>
      <label className="field"><span>First name (optional)</span><input type="text" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <div className="btnrow"><button className="btn solid small" type="submit" disabled={busy}>{busy ? "Posting…" : "Post rating"}</button></div>
      {msg && <p className="error">{msg}</p>}
    </form>
  );
}

function Pick({ p, origin, slug, stats, preview }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState([]);
  const all = [...local, ...(stats?.recent || [])];
  const count = (stats?.count || 0) + local.length;
  const avg = count ? ((stats?.avg || 0) * (stats?.count || 0) + local.reduce((a, r) => a + r.stars, 0)) / count : 0;
  return (
    <article className="pick">
      <div className="meta"><span>{p.type}</span>{p.mins > 0 && <span>{p.mins} min walk</span>}</div>
      <h3>{p.name}</h3>
      {p.desc && <p className="muted small">{p.desc}</p>}
      {p.dest?.trim() && <div className="route">
        <a className="btn solid" href={mapsLink(origin, p.dest)} target="_blank" rel="noopener noreferrer" aria-label={`Walking directions to ${p.name} in Google Maps`}>Walking directions in Google Maps ↗</a>
        <p className="small muted">{origin?.trim() ? "From your holiday home to this local pick." : "Choose your starting point in Google Maps."}</p>
      </div>}
      {p.steps?.length > 0 && (
        <details className="acc"><summary>Step-by-step walking directions</summary>
          <div className="route">
            {p.steps?.length > 0 && <ol>{p.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
          </div>
        </details>
      )}
      <div className="rating">
        {count ? <><Stars value={avg} /><span>{avg.toFixed(1)} from {count} guest{count > 1 ? "s" : ""}</span></> : <span className="muted">No guest ratings yet</span>}
        <button className="btn small" type="button" onClick={() => setOpen(!open)}>{open ? "Close" : "Been here? Rate it"}</button>
      </div>
      {all.slice(0, 2).filter((r) => r.text).map((r, i) => <div className="rev" key={i}>“{r.text}”<div className="who">{r.name || "A guest"} · {"★".repeat(r.stars)}</div></div>)}
      {open && <ReviewForm slug={slug} pick={p} preview={preview} onDone={(r) => { setLocal([r, ...local]); setOpen(false); }} />}
    </article>
  );
}

function Checkout({ property, preview }) {
  const tasks = property.checkoutTasks || [];
  const key = `gsg-co-${property.slug}`;
  const [done, setDone] = useState([]);
  const [issues, setIssues] = useState("");
  const [name, setName] = useState("");
  const [stars, setStars] = useState(0);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { try { setDone(JSON.parse(localStorage.getItem(key) || "[]")); } catch {} }, [key]);
  const toggle = (i) => {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    setDone(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  };
  const summary = useMemo(() => {
    const notDone = tasks.filter((_, i) => !done.includes(i));
    let t = `Check-out: ${property.name}\n${name ? `From: ${name}\n` : ""}Done ${tasks.length - notDone.length}/${tasks.length}`;
    if (notDone.length) t += `\nNot done: ${notDone.join("; ")}`;
    if (issues.trim()) t += `\nNotes: ${issues.trim()}`;
    if (stars) t += `\nStay rating: ${stars}/5`;
    return t;
  }, [tasks, done, name, issues, stars, property.name]);
  const wa = waNumber(property.whatsapp);

  async function submit(e) {
    e.preventDefault();
    if (preview) return setStatus("Check-outs are switched off in the preview.");
    setBusy(true); setStatus("");
    try {
      const res = await fetch(`/api/public/${property.slug}/checkout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, issues, stars, done: tasks.filter((_, i) => done.includes(i)), notDone: tasks.filter((_, i) => !done.includes(i)), website: "" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't send that.");
      setStatus(`Thanks${name ? `, ${name}` : ""}. ${property.hostName || "Your host"} has your check-out. Safe travels.`);
    } catch (err) {
      setStatus(`${err.message} Use the WhatsApp button so your host still gets it.`);
    } finally { setBusy(false); }
  }

  return (
    <form className="check" onSubmit={submit} noValidate>
      <p className="small muted" style={{ fontFamily: "var(--mono)" }}>{done.length} of {tasks.length} done</p>
      {tasks.map((t, i) => (
        <label key={i}><input type="checkbox" checked={done.includes(i)} onChange={() => toggle(i)} /><span>{t}</span></label>
      ))}
      <label className="field"><span>Anything broken, used up or worth knowing?</span><textarea value={issues} maxLength={1000} onChange={(e) => setIssues(e.target.value)} placeholder="e.g. Ran out of washing-up liquid" /></label>
      <div className="field"><span>How was your stay?</span>
        <div className="starpick">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={n <= stars ? "on" : ""} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setStars(n)}>★</button>)}</div>
      </div>
      <label className="field"><span>Your name</span><input type="text" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
      <div className="btnrow">
        <button className="btn solid" type="submit" disabled={busy}>{busy ? "Sending…" : "I've checked out"}</button>
        {wa && <a className="btn wa" href={`https://wa.me/${wa}?text=${encodeURIComponent(summary)}`} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a>}
      </div>
      {status && <p className="gnote">{status}</p>}
    </form>
  );
}

export default function Guidebook({ property: p, ratings = {}, preview = false }) {
  useEffect(() => {
    if (preview || !p.slug) return;
    fetch(`/api/public/${encodeURIComponent(p.slug)}/view`, { method: "POST" }).catch(() => {});
  }, [p.slug, preview]);
  const wa = waNumber(p.whatsapp);
  const style = p.accent ? { "--gb-accent": p.accent } : undefined;
  const has = {
    find: !!(arrivalDestination(p) || p.arrivalLandmark || p.landmarkSteps?.length || p.what3words),
    wifi: !!(p.wifiName || p.wifiPassword),
    howto: !!(p.photoGuides?.length || p.houseInfo?.some((h) => h.title && h.body)),
    parking: !!(p.parking?.some((r) => r.value) || p.parkingNote),
    local: !!p.picks?.length,
    leave: !!p.checkoutTasks?.length,
  };
  const tabs = [has.find && ["find", "Find us"], ["arrive", "Arrive"], has.wifi && ["wifi", "Wi-Fi"], has.howto && ["howto", "How-to"], has.parking && ["parking", "Parking"], has.local && ["local", "Local picks"], has.leave && ["leave", "Check-out"], ["help", "Help"]].filter(Boolean);

  return (
    <div className="gb" style={style}>
      <header className={`gb-hero${p.propertyPhoto?.img ? " gb-hero-with-photo" : ""}`}>
        <div className="gwrap">
          <div className="gb-welcome-copy">
          <small>Welcome to</small>
          <h1>{p.name}</h1>
          {p.address && <p className="addr">{p.address}</p>}
          </div>
          {p.propertyPhoto?.img && <figure className="gb-property-photo"><a href={p.propertyPhoto.img} target="_blank" rel="noopener noreferrer" aria-label={`View a larger photo of ${p.name || "the property"}`}><img src={p.propertyPhoto.img} alt={p.propertyPhoto.alt || `Front of ${p.name || "the property"}`} width="640" height="480" fetchpriority="high" decoding="async" /></a><figcaption>Front of the property</figcaption></figure>}
          {p.intro && <p className="gb-welcome-note">{p.hostName && <><b>{p.hostName}, your host:</b>{" "}</>}{p.intro}</p>}
        </div>
      </header>

      <nav className="gb-tabs" aria-label="Guidebook sections"><div className="gwrap">{tabs.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</div></nav>

      <main className="gwrap gb-main">
        {has.find && <section className="gcard" id="find"><span className="k">Find us</span><h2>Find your way here</h2><ArrivalDirections property={p} /></section>}
        <section className="gcard" id="arrive">
          <span className="k">Arrive</span><h2>Getting in</h2>
          <div className="facts">
            {p.checkInTime && <div className="fact"><span>Check-in</span><b>from {p.checkInTime}</b></div>}
            {p.checkOutTime && <div className="fact"><span>Check-out</span><b>by {p.checkOutTime}</b></div>}
          </div>
          {p.arrivalSteps?.length > 0 && <ol className="gsteps">{p.arrivalSteps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
          {p.arrivalNote && <p className="gnote warn">{p.arrivalNote}</p>}
        </section>

        {has.wifi && (
          <section className="gcard" id="wifi">
            <span className="k">Connect</span><h2>Wi-Fi</h2>
            {p.wifiName && <div className="cred"><div><small>Network</small><code>{p.wifiName}</code></div><CopyButton text={p.wifiName} /></div>}
            {p.wifiPassword && <div className="cred"><div><small>Password</small><code>{p.wifiPassword}</code></div><CopyButton text={p.wifiPassword} /></div>}
            {p.wifiNote && <p className="gnote">{p.wifiNote}</p>}
          </section>
        )}

        {has.howto && (
          <section className="gcard" id="howto">
            <span className="k">How-to</span><h2>Show me where</h2>
            {p.photoGuides?.map((g) => <PhotoGuide key={g.id} g={g} />)}
            {p.houseInfo?.filter((h) => h.title && h.body).map((h, i) => (
              <details className="acc" key={i}><summary>{h.title}</summary><div className="acc-body">{h.body}</div></details>
            ))}
          </section>
        )}

        {has.parking && (
          <section className="gcard" id="parking">
            <span className="k">Park and travel</span><h2>Parking and getting around</h2>
            <div className="facts">{p.parking.filter((r) => r.value).map((r, i) => <div className="fact" key={i}><span>{r.label}</span><b>{r.value}</b></div>)}</div>
            {p.parkingNote && <p className="gnote">{p.parkingNote}</p>}
          </section>
        )}

        {has.local && (
          <section className="gcard" id="local">
            <span className="k">Explore</span><h2>{p.hostName ? `${p.hostName}'s local picks` : "Local picks"}</h2>
            <p className="muted small">Look for the Google Maps button on each place to open walking directions. Been somewhere? Leave a quick rating for the next guests.</p>
            {p.picks.map((pk) => <Pick key={pk.id} p={pk} origin={p.origin?.trim() || arrivalDestination(p)} slug={p.slug} stats={ratings[pk.id]} preview={preview} />)}
          </section>
        )}

        {has.leave && (
          <section className="gcard" id="leave">
            <span className="k">Leave</span><h2>Check-out{p.checkOutTime ? ` by ${p.checkOutTime}` : ""}</h2>
            <Checkout property={p} preview={preview} />
            {p.checkoutNote && <p className="gnote">{p.checkoutNote}</p>}
          </section>
        )}

        <section className="gcard" id="help">
          <span className="k">Help</span><h2>If something goes wrong</h2>
          {wa && <div className="btnrow"><a className="btn wa" href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi ${p.hostName || ""}, I'm staying at ${p.name} and need a hand with something.`)}`} target="_blank" rel="noopener noreferrer">WhatsApp {p.hostName || "your host"}</a></div>}
          <div className="sos">
            {(p.phone || p.whatsapp) && <div><small>{p.hostName || "Host"}</small><b>{p.phone || p.whatsapp}</b></div>}
            {p.emergency?.filter((r) => r.value).map((r, i) => <div key={i}><small>{r.label}</small><b>{r.value}</b></div>)}
          </div>
        </section>
      </main>
      <footer className="gb-foot"><span>Guidebook by</span><a href="/" className="logo brand-logo guest-brand" aria-label="GuestSetGo home"><img src="/brand/guestsetgo-logo.png" alt="GuestSetGo" width={2172} height={724} /></a></footer>
    </div>
  );
}
