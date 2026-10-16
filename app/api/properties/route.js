import { FieldValue } from "firebase-admin/firestore";
import { db, plain } from "@/lib/firebase-admin";
import { handle, ok, requireUser, HttpError } from "@/lib/auth-server";
import { newProperty } from "@/lib/property-defaults";
import { uniqueSlug } from "@/lib/slug-server";

export const dynamic = "force-dynamic";

export const GET = handle(async (req) => {
  const user = await requireUser(req);
  const snap = await db().collection("properties").where("ownerUid", "==", user.uid).get();
  const items = snap.docs
    .map((d) => {
      const p = d.data();
      return plain({ id: d.id, name: p.name, slug: p.slug, address: p.address, published: !!p.published, updatedAt: p.updatedAt, viewCount: p.viewCount || 0, checkoutCount: p.checkoutCount || 0, reviewCount: p.reviewCount || 0 });
    })
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  return ok({ items });
});

export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim().slice(0, 120);
  if (!name) throw new HttpError(400, "Give the property a name.");
  const slug = await uniqueSlug(name);
  const data = {
    ...newProperty({ name, ownerUid: user.uid, slug, hostName: user.name?.split(" ")[0] || "" }),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const ref = await db().collection("properties").add(data);
  return ok({ id: ref.id, slug });
});
