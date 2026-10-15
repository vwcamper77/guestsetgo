import { db } from "./firebase-admin";
import { slugify } from "./slug";

/** A slug no other guidebook is using. */
export async function uniqueSlug(base, ignoreId) {
  const slug = slugify(base);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const hit = await db().collection("properties").where("slug", "==", candidate).limit(1).get();
    if (hit.empty || hit.docs[0].id === ignoreId) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
}
