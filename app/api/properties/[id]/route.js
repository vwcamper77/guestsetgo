import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db, plain, privateBucket } from "@/lib/firebase-admin";
import { handle, ok, requireUser, requireProperty, HttpError } from "@/lib/auth-server";
import { sanitise } from "@/lib/property-defaults";
import { allowance } from "@/lib/plans";
import { slugify } from "@/lib/slug";
import { uniqueSlug } from "@/lib/slug-server";
import { arrivalValidation } from "@/lib/arrival.mjs";

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
  const arrivalIssue = arrivalValidation({ ...data, ...update });
  if (arrivalIssue) throw new HttpError(400, arrivalIssue);

  if (typeof body.slug === "string" && slugify(body.slug) !== data.slug) {
    update.slug = await uniqueSlug(body.slug, params.id);
  }

  if (typeof body.published === "boolean" && body.published !== !!data.published) {
    if (body.published) {
      // Check the owner has room on their plan (admins can publish anything).
      await db().runTransaction(async (tx) => {
        const ownerRef = db().collection("users").doc(data.ownerUid);
        const owner = (await tx.get(ownerRef)).data() || {};
        const live = await tx.get(db().collection("properties").where("ownerUid", "==", data.ownerUid).where("published", "==", true));
        let room = allowance(owner);
        if (!room && !owner.trialEndsAt && !owner.starterPaidAt && !owner.subscriptionId && !owner.subscriptionStatus) {
          tx.set(ownerRef, { trialStartedAt: Timestamp.now(), trialEndsAt: Timestamp.fromMillis(Date.now() + 30 * 864e5) }, { merge: true });
          room = 1;
        }
        if (!user.isAdmin && live.size >= room) throw new HttpError(402, "Your plan doesn't cover another live guidebook. Choose or upgrade a plan in Billing.");
        tx.update(ref, { ...update, published: true });
      });
      const fresh = await ref.get();
      return ok({ property: plain({ id: params.id, ...fresh.data() }) });
    }
    update.published = body.published;
  }

  await ref.update(update);
  const fresh = await ref.get();
  return ok({ property: plain({ id: params.id, ...fresh.data() }) });
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requireUser(req);
  const { ref, data } = await requireProperty(user, params.id);
  await db().recursiveDelete(ref);
  // Images are retained while editing so discarding a draft never breaks a live guide.
  // Duplicated guidebooks have independent image copies under their own property ID.
  await Promise.allSettled([
    Promise.resolve().then(() => privateBucket().deleteFiles({ prefix: `uploads/${data.ownerUid}/${params.id}/` })),
    Promise.resolve().then(() => privateBucket().deleteFiles({ prefix: `private-imports/${data.ownerUid}/${params.id}/` })),
  ]);
  return ok({ deleted: true });
});
