"use client";
import { StringList, uid } from "./editors";

const mapsLink = (origin, dest) =>
  `https://www.google.com/maps/dir/?api=1${origin?.trim() ? `&origin=${encodeURIComponent(origin.trim())}` : ""}&destination=${encodeURIComponent(dest.trim())}&travelmode=walking`;

export default function PicksEditor({ picks = [], origin, onChange }) {
  const set = (i, patch) => onChange(picks.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <div className="listedit">
      <p className="notice">{origin?.trim() ? `Starting point (A): ${origin.trim()}. Add a destination (B) to each pick below. Guests see a Google Maps directions button directly on the place's card.` : "Add your property address in Basics, or a starting point above, so Google Maps can route guests from your holiday home to each local pick."}</p>
      {picks.map((p, i) => (
        <div className="panel" style={{ background: "var(--bg)" }} key={p.id}>
          <div className="grid2">
            <label className="field"><span>Name</span><input type="text" value={p.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="e.g. The Ship Inn" /></label>
            <label className="field"><span>Type</span><input type="text" value={p.type} onChange={(e) => set(i, { type: e.target.value })} placeholder="Pub, Fish and chips, Beach…" /></label>
          </div>
          <label className="field"><span>Why you'd send a friend there</span><textarea value={p.desc} onChange={(e) => set(i, { desc: e.target.value })} /></label>
          <div className="grid2">
            <label className="field"><span>Destination (B) — Google Maps</span><input type="text" value={p.dest} onChange={(e) => set(i, { dest: e.target.value })} placeholder="Business name and town, or full address" />
              <small>{p.dest?.trim() ? "Use a precise place name and address, then check the route below." : "Add a destination to show guests the Google Maps directions button."}</small></label>
            <label className="field"><span>Minutes on foot</span><input type="number" min="0" max="240" value={p.mins || ""} onChange={(e) => set(i, { mins: e.target.value })} /></label>
          </div>
          <StringList label="Walking directions in your words" items={p.steps || []} onChange={(steps) => set(i, { steps })} addLabel="Add a direction" placeholder="e.g. Turn left at the bottom of the hill" />
          <div className="btnrow">
            {p.dest?.trim() && <a className="btn solid" href={mapsLink(origin, p.dest)} target="_blank" rel="noopener noreferrer">Check A → B in Google Maps ↗</a>}
            <button type="button" className="btn small" disabled={i === 0} onClick={() => { const c = picks.slice(); [c[i - 1], c[i]] = [c[i], c[i - 1]]; onChange(c); }}>Move up</button>
            <button type="button" className="btn small danger" onClick={() => onChange(picks.filter((_, j) => j !== i))}>Remove</button>
          </div>
        </div>
      ))}
      <div><button type="button" className="btn solid small" onClick={() => onChange([...picks, { id: uid(), name: "", type: "", desc: "", dest: "", mins: 0, steps: [] }])}>+ Add a local pick</button></div>
    </div>
  );
}
