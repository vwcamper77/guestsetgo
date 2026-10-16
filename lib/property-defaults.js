// The shape of a guidebook. New properties start from this, pre-filled with sensible prompts.
export const EDITABLE_FIELDS = [
  "name", "address", "intro", "hostName", "whatsapp", "phone",
  "propertyPhoto",
  "checkInTime", "checkOutTime", "arrivalSteps", "arrivalNote",
  "arrivalLocation", "arrivalLandmark", "landmarkSteps", "what3words",
  "wifiName", "wifiPassword", "wifiNote",
  "parking", "parkingNote", "houseInfo", "photoGuides",
  "origin", "picks", "checkoutTasks", "checkoutNote", "emergency", "accent",
];

export function newProperty({ name, ownerUid, slug, hostName }) {
  return {
    name,
    slug,
    ownerUid,
    published: false,
    address: "",
    propertyPhoto: null,
    intro: "Everything for your stay is on this page. Stuck? Message me on WhatsApp any time.",
    hostName: hostName || "",
    whatsapp: "",
    phone: "",
    checkInTime: "4pm",
    checkOutTime: "10am",
    arrivalSteps: ["Where to find the front door", "Where the key safe is and how to open it", "Which door is yours once inside"],
    arrivalNote: "Please spin the key safe dial and close the cover once you have the key.",
    arrivalLocation: "",
    arrivalLandmark: "",
    landmarkSteps: [],
    what3words: "",
    wifiName: "",
    wifiPassword: "",
    wifiNote: "",
    parking: [{ label: "On the street", value: "" }, { label: "Nearest car park", value: "" }],
    parkingNote: "",
    houseInfo: [
      { title: "Heating and hot water", body: "" },
      { title: "Bins and recycling", body: "" },
      { title: "House rules", body: "" },
    ],
    photoGuides: [],
    origin: "",
    picks: [],
    checkoutTasks: [],
    checkoutNote: "Leave the towels and bedding where they are. Safe travels, and thank you for staying.",
    emergency: [{ label: "Emergency", value: "999" }, { label: "Non-urgent medical", value: "111" }],
    accent: "",
  };
}

const str = (v, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");
const arr = (v, max = 50) => (Array.isArray(v) ? v.slice(0, max) : []);
const num = (v) => (Number.isFinite(+v) ? Math.max(0, Math.min(100, +v)) : 0);

/** Keeps only known fields with sane types and sizes before writing to Firestore. */
export function sanitise(input) {
  const out = {};
  for (const k of EDITABLE_FIELDS) {
    if (!(k in input)) continue;
    const v = input[k];
    switch (k) {
      case "propertyPhoto": {
        const img = str(v?.img, 1000);
        out[k] = /^https:\/\/firebasestorage\.googleapis\.com\//.test(img)
          ? { img, path: str(v?.path, 400), alt: str(v?.alt, 200) }
          : null;
        break;
      }
      case "arrivalSteps":
      case "landmarkSteps":
      case "checkoutTasks":
        out[k] = arr(v, 30).map((s) => str(s, 300)).filter(Boolean);
        break;
      case "parking":
      case "emergency":
        out[k] = arr(v, 20).map((r) => ({ label: str(r?.label, 80), value: str(r?.value, 200) }));
        break;
      case "houseInfo":
        out[k] = arr(v, 30).map((r) => ({ title: str(r?.title, 120), body: str(r?.body, 2000) }));
        break;
      case "photoGuides":
        out[k] = arr(v, 30).map((g) => ({
          id: str(g?.id, 40) || Math.random().toString(36).slice(2, 10),
          title: str(g?.title, 120),
          area: str(g?.area, 160),
          img: str(g?.img, 1000),
          path: str(g?.path, 400),
          pins: arr(g?.pins, 12).map((p) => ({ x: num(p?.x), y: num(p?.y), label: str(p?.label, 200) })),
          steps: arr(g?.steps, 12).map((s) => str(s, 300)).filter(Boolean),
        }));
        break;
      case "picks":
        out[k] = arr(v, 30).map((p) => ({
          id: str(p?.id, 40) || Math.random().toString(36).slice(2, 10),
          name: str(p?.name, 120),
          type: str(p?.type, 60),
          desc: str(p?.desc, 600),
          dest: str(p?.dest, 200),
          mins: Math.max(0, Math.min(240, parseInt(p?.mins, 10) || 0)),
          steps: arr(p?.steps, 12).map((s) => str(s, 300)).filter(Boolean),
        }));
        break;
      case "accent":
        out[k] = /^#[0-9a-fA-F]{6}$/.test(v || "") ? v : "";
        break;
      default:
        out[k] = str(v, k === "intro" ? 1000 : 300);
    }
  }
  return out;
}
