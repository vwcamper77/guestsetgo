"use client";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

const when = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export default function FeedbackTab({ property }) {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api(`/api/properties/${property.id}/feedback`).then(setData).catch((e) => setError(e.message)); }, [api, property.id]);
  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const byPick = {};
  for (const r of data.reviews) {
    const b = (byPick[r.pickId] ||= { count: 0, sum: 0, rec: 0, tips: [] });
    b.count++; b.sum += r.stars || 0; if (r.recommend) b.rec++; if (r.text) b.tips.push(r);
  }
  const rows = (property.picks || []).map((p) => ({ p, s: byPick[p.id] })).filter((r) => r.s).sort((a, b) => b.s.count - a.s.count);

  return (
    <div className="listedit">
      <h3>Check-outs</h3>
      {data.checkouts.length === 0 ? <p className="empty">No check-outs yet. When guests tap "I've checked out", they appear here with anything they flagged.</p> : (
        <div className="tbl"><table>
          <thead><tr><th>When</th><th>Guest</th><th>Tasks</th><th>Notes</th><th>Stay</th></tr></thead>
          <tbody>{data.checkouts.map((c) => (
            <tr key={c.id}>
              <td>{when(c.at)}</td><td>{c.name || "—"}</td>
              <td>{(c.done || []).length}/{(c.done || []).length + (c.notDone || []).length}{c.notDone?.length > 0 && <div className="small muted">Missed: {c.notDone.join("; ")}</div>}</td>
              <td>{c.issues ? <span className="pill warn" style={{ whiteSpace: "normal", textTransform: "none", letterSpacing: 0, fontFamily: "var(--body)" }}>{c.issues}</span> : "—"}</td>
              <td>{c.stars ? `${c.stars}/5` : "—"}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <h3>Guest ratings of your local picks</h3>
      {rows.length === 0 ? <p className="empty">No ratings yet. Guests rate your picks from the guidebook.</p> : (
        <div className="tbl"><table>
          <thead><tr><th>Place</th><th>Ratings</th><th>Average</th><th>Would recommend</th><th>Latest tip</th></tr></thead>
          <tbody>{rows.map(({ p, s }) => (
            <tr key={p.id}><td>{p.name}</td><td>{s.count}</td><td>{(s.sum / s.count).toFixed(1)} ★</td><td>{Math.round((s.rec / s.count) * 100)}%</td><td className="small">{s.tips[0]?.text || "—"}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
