"use client";
// Small form building blocks for the guidebook editor.

export function Text({ label, value, onChange, hint, multiline, type = "text", placeholder, id }) {
  const fid = id || `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <label className="field" htmlFor={fid}>
      <span>{label}</span>
      {multiline
        ? <textarea id={fid} value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        : <input id={fid} type={type} value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
      {hint && <small>{hint}</small>}
    </label>
  );
}

const move = (arr, i, d) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const c = arr.slice(); [c[i], c[j]] = [c[j], c[i]]; return c;
};

function RowButtons({ list, i, onChange }) {
  return (
    <div className="btnrow" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <button type="button" className="btn small" aria-label="Move up" onClick={() => onChange(move(list, i, -1))} disabled={i === 0}>↑</button>
      <button type="button" className="btn small" aria-label="Move down" onClick={() => onChange(move(list, i, 1))} disabled={i === list.length - 1}>↓</button>
      <button type="button" className="btn small danger" aria-label="Remove" onClick={() => onChange(list.filter((_, x) => x !== i))}>✕</button>
    </div>
  );
}

/** A list of short strings (steps, tasks). */
export function StringList({ label, items = [], onChange, addLabel = "Add a line", placeholder }) {
  return (
    <div className="field"><span>{label}</span>
      <div className="listedit">
        {items.map((s, i) => (
          <div className="listrow" key={i}>
            <div className="stack"><input type="text" aria-label={`${label} ${i + 1}`} value={s} placeholder={placeholder} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} /></div>
            <RowButtons list={items} i={i} onChange={onChange} />
          </div>
        ))}
        <div><button type="button" className="btn small" onClick={() => onChange([...items, ""])}>+ {addLabel}</button></div>
      </div>
    </div>
  );
}

/** A list of objects edited with a set of fields each. */
export function ObjectList({ label, items = [], onChange, fields, make, addLabel = "Add" }) {
  const set = (i, k, v) => onChange(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <div className="field"><span>{label}</span>
      <div className="listedit">
        {items.map((it, i) => (
          <div className="listrow" key={it.id || i}>
            <div className="stack">
              {fields.map((f) => f.multiline
                ? <textarea key={f.key} aria-label={f.label} placeholder={f.label} value={it[f.key] || ""} onChange={(e) => set(i, f.key, e.target.value)} />
                : <input key={f.key} type="text" aria-label={f.label} placeholder={f.label} value={it[f.key] || ""} onChange={(e) => set(i, f.key, e.target.value)} />)}
            </div>
            <RowButtons list={items} i={i} onChange={onChange} />
          </div>
        ))}
        <div><button type="button" className="btn small" onClick={() => onChange([...items, make()])}>+ {addLabel}</button></div>
      </div>
    </div>
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10);
