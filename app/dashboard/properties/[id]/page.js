"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Guidebook from "@/components/Guidebook";
import { Text, StringList, ObjectList } from "@/components/editors";
import PhotoGuidesEditor from "@/components/PhotoGuidesEditor";
import PicksEditor from "@/components/PicksEditor";
import ShareTab from "@/components/ShareTab";
import FeedbackTab from "@/components/FeedbackTab";
import ArrivalEditor from "@/components/ArrivalEditor";
import PropertyPhotoEditor from "@/components/PropertyPhotoEditor";
import { arrivalDestination, arrivalValidation } from "@/lib/arrival.mjs";

const TABS = [
  ["basics", "Basics"], ["arrive", "Arrival and Wi-Fi"], ["howto", "House photos & instructions"], ["parking", "Parking and help"],
  ["local", "Local picks"], ["leave", "Check-out"], ["share", "QR and sharing"], ["feedback", "Check-outs and ratings"],
];

export default function EditProperty({ params }) {
  const { api } = useAuth();
  const router = useRouter();
  const [p, setP] = useState(null);
  const [tab, setTab] = useState("basics");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("tab") === "import") router.replace(`/dashboard/properties/${params.id}/folder-conversion`); }, [router, params.id]);

  useEffect(() => { api(`/api/properties/${params.id}`).then((d) => setP(d.property)).catch((e) => setError(e.message)); }, [api, params.id]);

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = useCallback((patch) => { setP((cur) => ({ ...cur, ...patch })); setDirty(true); setMsg(""); }, []);

  async function save(extra = {}) {
    if (photoUploading) { setError("Wait for the property photo to finish uploading before saving."); return; }
    const arrivalIssue = arrivalValidation(p);
    if (arrivalIssue) { setError(arrivalIssue); setTab("arrive"); return; }
    setSaving(true); setError(""); setMsg("");
    try {
      const d = await api(`/api/properties/${params.id}`, { method: "PUT", body: { ...p, ...extra } });
      setP(d.property); setDirty(false);
      setMsg(extra.published === true ? "Saved and live for guests." : extra.published === false ? "Saved. Guests can no longer open it." : "Saved.");
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  async function remove() {
    try { await api(`/api/properties/${params.id}`, { method: "DELETE" }); router.push("/dashboard"); }
    catch (e) { setError(e.message); }
  }

  if (error && !p) return <p className="error">{error}</p>;
  if (!p) return <p className="muted">Loading guidebook…</p>;

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/dashboard" className="small">← All guidebooks</Link>
          <h1>{p.name || "Untitled"}</h1>
        </div>
        <div className="btnrow">
          <span className={`pill ${p.published ? "" : "off"}`}>{p.published ? "Live" : "Draft"}</span>
          <button type="button" className="btn small" onClick={() => setTab("share")}>Send guide / Print QR</button>
          {p.published && <a className="btn small" href={`/g/${p.slug}`} target="_blank" rel="noopener noreferrer">Open guest page</a>}
        </div>
      </div>

      <div className="notice" style={{ marginBottom: 20 }}><b>Have an existing welcome folder?</b><p className="small">Welcome folder conversion is a separate £79 setup service for folder pages, brochures and cards.</p><Link className="btn small" href={`/dashboard/properties/${p.id}/folder-conversion`}>{p.assistancePaidAt ? "Open paid folder conversion" : "View folder conversion — £79 once"}</Link></div>
      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>)}
      </div>

      <div className="editor-layout">
        <div className="panel">
          {tab === "basics" && <>
            <Text label="Property name" value={p.name} onChange={(v) => set({ name: v })} />
            <PropertyPhotoEditor property={p} onChange={set} onUploadingChange={setPhotoUploading} uploading={photoUploading} />
            <Text label="Address or area shown to guests" value={p.address} onChange={(v) => set({ address: v })} placeholder="e.g. A two-bed flat by the Old High Street, Folkestone" />
            <Text label="Guest link name" value={p.slug} onChange={(v) => set({ slug: v })} hint={`Guests open /g/${p.slug}. Letters, numbers and dashes.`} />
            <div className="grid2">
              <Text label="Your first name" value={p.hostName} onChange={(v) => set({ hostName: v })} />
              <Text label="WhatsApp number" type="tel" value={p.whatsapp} onChange={(v) => set({ whatsapp: v })} placeholder="07700 900123" hint="Guests get a WhatsApp button that messages you." />
            </div>
            <Text label="Welcome message" multiline value={p.intro} onChange={(v) => set({ intro: v })} />
            <Text label="Brand colour (optional)" value={p.accent} onChange={(v) => set({ accent: v })} placeholder="#1d7568" hint="For agencies: a hex colour for the header." />
          </>}

          {tab === "arrive" && <>
            <ArrivalEditor property={p} onChange={set} />
            <div className="grid2">
              <Text label="Check-in from" value={p.checkInTime} onChange={(v) => set({ checkInTime: v })} />
              <Text label="Check-out by" value={p.checkOutTime} onChange={(v) => set({ checkOutTime: v })} />
            </div>
            <StringList label="How to get in, step by step" items={p.arrivalSteps} onChange={(v) => set({ arrivalSteps: v })} addLabel="Add a step" />
            <Text label="Arrival reminder" value={p.arrivalNote} onChange={(v) => set({ arrivalNote: v })} hint="Keep key safe codes out of here; send them in your booking message instead." />
            <div className="grid2">
              <Text label="Wi-Fi network" value={p.wifiName} onChange={(v) => set({ wifiName: v })} />
              <Text label="Wi-Fi password" value={p.wifiPassword} onChange={(v) => set({ wifiPassword: v })} />
            </div>
            <Text label="Wi-Fi tip" value={p.wifiNote} onChange={(v) => set({ wifiNote: v })} placeholder="e.g. The router is in the hallway cupboard" />
          </>}

          {tab === "howto" && <>
            <PhotoGuidesEditor guides={p.photoGuides} propertyId={p.id} onChange={(v) => set({ photoGuides: v })} />
            <ObjectList label="Other house information" items={p.houseInfo} onChange={(v) => set({ houseInfo: v })}
              fields={[{ key: "title", label: "Heading, e.g. Heating" }, { key: "body", label: "Details", multiline: true }]} make={() => ({ title: "", body: "" })} addLabel="Add a section" />
          </>}

          {tab === "parking" && <>
            <ObjectList label="Parking and travel" items={p.parking} onChange={(v) => set({ parking: v })}
              fields={[{ key: "label", label: "Label, e.g. Visitor permit" }, { key: "value", label: "Details, e.g. On the hook by the door" }]} make={() => ({ label: "", value: "" })} addLabel="Add a line" />
            <Text label="Parking note" multiline value={p.parkingNote} onChange={(v) => set({ parkingNote: v })} />
            <Text label="Phone number shown to guests" type="tel" value={p.phone} onChange={(v) => set({ phone: v })} hint="Leave blank to show your WhatsApp number." />
            <ObjectList label="Useful numbers and locations" items={p.emergency} onChange={(v) => set({ emergency: v })}
              fields={[{ key: "label", label: "Label, e.g. Stopcock" }, { key: "value", label: "Details, e.g. Under the sink" }]} make={() => ({ label: "", value: "" })} addLabel="Add a line" />
          </>}

          {tab === "local" && <>
            <Text label="Walking routes start from" value={p.origin} onChange={(v) => set({ origin: v })} placeholder="Street and town, or postcode" hint="Optional: defaults to your entrance location in Arrival and Wi-Fi, then your address in Basics." />
            <PicksEditor picks={p.picks} origin={p.origin?.trim() || arrivalDestination(p)} onChange={(v) => set({ picks: v })} />
          </>}

          {tab === "leave" && <>
            <StringList label="Check-out tasks" items={p.checkoutTasks} onChange={(v) => set({ checkoutTasks: v })} addLabel="Add a task" />
            <Text label="Goodbye note" multiline value={p.checkoutNote} onChange={(v) => set({ checkoutNote: v })} />
          </>}

          {tab === "share" && <ShareTab property={p} />}
          {tab === "feedback" && <FeedbackTab property={p} />}

          <div className="savebar">
            <div className="small">
              {error ? <span className="error">{error}</span> : msg ? <span>{msg}</span> : dirty ? <span className="muted">Unsaved changes</span> : <span className="muted">All changes saved</span>}
              {error.includes("plan") && <> <Link href="/dashboard/billing">Go to Billing</Link></>}
            </div>
            <div className="btnrow">
              {!p.published && <span className="small muted">New accounts get one 30-day guest trial on first publication, no card needed.</span>}
              <button type="button" className="btn small" onClick={() => save()} disabled={saving || photoUploading || !dirty}>{saving ? "Saving…" : photoUploading ? "Uploading photo…" : "Save"}</button>
              {p.published
                ? <button type="button" className="btn small" onClick={() => save({ published: false })} disabled={saving || photoUploading}>Take offline</button>
                : <button type="button" className="btn solid small" onClick={() => save({ published: true })} disabled={saving || photoUploading}>Save and put live</button>}
            </div>
          </div>

          {tab === "basics" && (
            <div className="btnrow" style={{ justifyContent: "flex-end" }}>
              {confirmDelete
                ? <><span className="small">Delete this guidebook, its check-outs and ratings?</span><button type="button" className="btn small danger" onClick={remove}>Yes, delete</button><button type="button" className="btn small" onClick={() => setConfirmDelete(false)}>Cancel</button></>
                : <button type="button" className="btn small danger" onClick={() => setConfirmDelete(true)}>Delete guidebook</button>}
            </div>
          )}
        </div>

        <div className="preview-frame" aria-label="Guest preview"><div className="gb-scroll"><Guidebook property={p} preview /></div></div>
      </div>
    </>
  );
}
