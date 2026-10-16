import { readFileSync, writeFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import Stripe from "stripe";
import assert from "node:assert/strict";
const fixture = JSON.parse(readFileSync("output/host-qa/run.json", "utf8"));
if (!fixture.email.startsWith("guestsetgo-qa-") || !process.env.STRIPE_SECRET_KEY.includes("_test_")) throw new Error("Dedicated test-mode QA account required.");
const app = initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,"\n") }) });
const db = getFirestore(app);
const userRef = db.collection("users").doc(fixture.uid);
let account = (await userRef.get()).data();
assert.equal(account.email, fixture.email);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const action = process.argv[2] || "inspect";
if (action === "cancel") {
  const sub = await stripe.subscriptions.retrieve(account.subscriptionId);
  assert.equal(sub.metadata.uid, fixture.uid);
  assert.equal(sub.livemode, false);
  await stripe.subscriptions.cancel(sub.id);
  for (let i=0;i<30;i++) { account=(await userRef.get()).data(); if(!account.subscriptionId) break; await new Promise(r=>setTimeout(r,1000)); }
  assert.equal(account.subscriptionId, null);
} else if (action === "touch") {
  const sub = await stripe.subscriptions.retrieve(account.subscriptionId);
  assert.equal(sub.metadata.uid, fixture.uid);
  await stripe.subscriptions.update(sub.id, { metadata: { qa_sync: String(Date.now()) } });
  for (let i=0;i<30;i++) { account=(await userRef.get()).data(); if(account.cancelAtPeriodEnd) break; await new Promise(r=>setTimeout(r,1000)); }
  assert.equal(account.cancelAtPeriodEnd, true);
} else if (action === "expire-trial") {
  await userRef.update({ trialEndsAt: Timestamp.fromMillis(Date.now()-864e5) });
  account = (await userRef.get()).data();
} else if (action !== "inspect") throw new Error("Unknown QA action.");
const result = { action, plan:account.plan, subscriptionStatus:account.subscriptionStatus, paymentConfirmed:account.subscriptionPaymentConfirmed, quantity:account.quantity, interval:account.billingInterval, cancelAtPeriodEnd:account.cancelAtPeriodEnd };
if (action === "inspect" && account.subscriptionId) {
  const sub = await stripe.subscriptions.retrieve(account.subscriptionId);
  assert.equal(sub.metadata.uid, fixture.uid);
  result.stripeCancellation = { status: sub.status, atPeriodEnd: sub.cancel_at_period_end, cancelAt: sub.cancel_at, itemPeriodEnd: sub.items.data[0]?.current_period_end };
}
fixture.results[`subscription-${action}-${Date.now()}`]=result;
writeFileSync("output/host-qa/run.json", JSON.stringify(fixture));
console.log(JSON.stringify(result));
