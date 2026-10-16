import { readFileSync, writeFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getStorage, ref, uploadBytes } from "firebase/storage";
const fixture = JSON.parse(readFileSync("output/host-qa/run.json", "utf8"));
if (!fixture.email.startsWith("guestsetgo-qa-")) throw new Error("Only a disposable QA account is allowed.");
const app = initializeApp({ apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID });
const auth = getAuth(app);
const { user } = await signInWithEmailAndPassword(auth, fixture.email, fixture.password);
fixture.uid = user.uid;
writeFileSync("output/host-qa/run.json", JSON.stringify(fixture));
const storage = getStorage(app);
const results = [];
for (const path of [`uploads/qa-not-the-owner/${fixture.propertyId}/denied.jpg`, `private-imports/${user.uid}/${fixture.propertyId}/denied.jpg`]) {
  let denied = false;
  try { await uploadBytes(ref(storage, path), readFileSync("output/host-qa/remote.jpg"), { contentType: "image/jpeg" }); }
  catch (e) { denied = e.code === "storage/unauthorized"; }
  if (!denied) throw new Error("An unauthorised Storage write was not rejected.");
  results.push(path.startsWith("uploads/") ? "cross-account write denied" : "direct private-folder write denied");
}
await signOut(auth);
console.log(JSON.stringify({ storageRulesVerified: results }));
