import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { handle, ok, requireAdmin, HttpError } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/** Admin-only account changes: founding (no set-up fee), comp (free unlimited), internal note. */
export const PATCH = handle(async (req, { params }) => {
  await requireAdmin(req);
  const body = await req.json().catch(() => ({}));
  const ref = db().collection("users").doc(params.uid);
  if (!(await ref.get()).exists) throw new HttpError(404, "Account not found.");
  const update = {};
  if (typeof body.founding === "boolean") update.founding = body.founding;
  if (typeof body.comp === "boolean") update.comp = body.comp;
  if (typeof body.note === "string") update.note = body.note.slice(0, 500);
  if (!Object.keys(update).length) throw new HttpError(400, "Nothing to change.");
  update.updatedAt = FieldValue.serverTimestamp();
  await ref.update(update);
  return ok({ ok: true });
});
