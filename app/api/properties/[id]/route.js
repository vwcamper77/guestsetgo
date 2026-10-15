import { FieldValue } from "firebase-admin/firestore";
import { db, plain } from "@/lib/firebase-admin";
import { handle, ok, requireUser, requireProperty, HttpError } from "@/lib/auth-server";
import { sanitise } from "@/lib/property-defaults";
import { allowance } from "@/lib/plans";
import { slugify } from "@/lib/slug";
import { uniqueSlug } from "@/lib/slug-server";

export const dynamic = "force-dynamic";

export const GET = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const { data } = await requireProperty(user, params.id);
  return ok({ property: plain({ id: params.id, ...data }) });
});

export const PUT = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const { ref, data } = await requireProperty(user, params.id);
  const body = await req.json().catch(() => ({}));
  const update = { ...sanitise(body), updatedAt: FieldValue.serverTimestamp() };

  if (typeof body.slug === "string" && slugify(body.slug) !== data.slug) {
    update.slug = await uniqueSlug(body.slug, params.id);
  }

  if (typeof body.published === "boolean" && body.published !== !!data.published) {
    if (body.published) {
      // Check the owner has room on their plan (admins can publish anything).
      const owner = (await db().collection("users").doc(data.ownerUid).get()).data();
      const live = await db().collection("properties").where("ownerUid", "==", data.ownerUid).where("published", "==", true).count().get();
      if (!user.isAdmin && live.data().count >= allowance(owner)) {
        throw new HttpError(402, "Your plan doesn't cover another live guidebook. Choose or upgrade a plan in Billing.");
      }
    }
    update.published = body.published;
  }

  await ref.update(update);
  const fresh = await ref.get();
  return ok({ property: plain({ id: params.id, ...fresh.data() }) });
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const { ref } = await requireProperty(user, params.id);
  await db().recursiveDelete(ref);
  return ok({ deleted: true });
});
