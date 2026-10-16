import { FieldValue } from "firebase-admin/firestore";
import { db, privateBucket } from "@/lib/firebase-admin";
import { randomUUID } from "node:crypto";
import { handle, ok, requireUser, requireProperty } from "@/lib/auth-server";
import { sanitise, newProperty } from "@/lib/property-defaults";
import { uniqueSlug } from "@/lib/slug-server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const POST = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const { data } = await requireProperty(user, params.id);
  const name = `${data.name || "Guidebook"} (copy)`.slice(0, 120);
  const slug = await uniqueSlug(name);
  const copy = {
    ...newProperty({ name, slug, ownerUid: user.uid, hostName: data.hostName }),
    ...sanitise(data), name, slug, ownerUid: user.uid, published: false,
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  };
  const ref = db().collection("properties").doc();
  const copiedPaths = [];
  try {
    async function copyPhoto(photo) {
      if (!photo.path || !photo.path.startsWith(`uploads/${data.ownerUid}/`)) return { ...photo, path: "" };
      const path = `uploads/${user.uid}/${ref.id}/${randomUUID()}.jpg`;
      const bucket = privateBucket();
      const target = bucket.file(path);
      await bucket.file(photo.path).copy(target);
      copiedPaths.push(path);
      const token = randomUUID();
      await target.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
      return { ...photo, path, img: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}` };
    }
    if (copy.propertyPhoto?.img) copy.propertyPhoto = await copyPhoto(copy.propertyPhoto);
    const guides = [];
    for (const g of copy.photoGuides || []) guides.push(await copyPhoto(g));
    copy.photoGuides = guides;
    await ref.set(copy);
  } catch (e) {
    await Promise.allSettled(copiedPaths.map((path) => privateBucket().file(path).delete()));
    throw e;
  }
  return ok({ id: ref.id });
});
