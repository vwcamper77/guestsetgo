import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { stripe, planForPrice } from "@/lib/stripe";
import { allowance } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function uidForCustomer(customerId, fallback) {
  if (fallback) return fallback;
  const snap = await db().collection("users").where("stripeCustomerId", "==", customerId).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

async function syncSubscription(sub) {
  const uid = await uidForCustomer(sub.customer, sub.metadata?.uid);
  if (!uid) return;
  const item = sub.items.data.find((i) => planForPrice(i.price.id)) || sub.items.data[0];
  const plan = planForPrice(item?.price?.id) || sub.metadata?.plan || null;
  const ended = ["canceled", "incomplete_expired"].includes(sub.status);
  await db().collection("users").doc(uid).set({
    stripeCustomerId: sub.customer,
    subscriptionId: ended ? null : sub.id,
    subscriptionStatus: sub.status,
    plan: ended ? null : plan,
    quantity: ended ? 0 : item?.quantity || 1,
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  // If the plan shrank or ended, take the newest guidebooks offline so live count fits the plan.
  const userDoc = (await db().collection("users").doc(uid).get()).data();
  const room = allowance(userDoc);
  const live = await db().collection("properties").where("ownerUid", "==", uid).where("published", "==", true).get();
  if (live.size > room) {
    const sorted = live.docs.sort((a, b) => (a.data().createdAt?.toMillis?.() || 0) - (b.data().createdAt?.toMillis?.() || 0));
    await Promise.all(sorted.slice(room).map((d) => d.ref.update({ published: false, offlineReason: "plan" })));
  }
}

async function logPayment({ id, uid, customer, amount, currency, description, status, type, created }) {
  await db().collection("payments").doc(id).set({
    uid: uid || null, customer, amount, currency, description, status, type,
    at: new Date((created || Date.now() / 1000) * 1000),
  }, { merge: true });
}

export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature check failed: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        const uid = s.client_reference_id || s.metadata?.uid;
        if (!uid) break;
        const ref = db().collection("users").doc(uid);
        await ref.set({ stripeCustomerId: s.customer }, { merge: true });
        if (s.mode === "payment" && s.metadata?.plan === "starter" && s.payment_status === "paid") {
          await ref.set({ starterPaidAt: new Date(), starterCredits: parseInt(s.metadata.quantity, 10) || 1 }, { merge: true });
          await logPayment({ id: s.payment_intent || s.id, uid, customer: s.customer, amount: s.amount_total, currency: s.currency, description: "Starter set-up", status: "paid", type: "one-off", created: event.created });
        }
        if (s.mode === "subscription" && s.subscription) {
          await syncSubscription(await stripe().subscriptions.retrieve(s.subscription));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;
      case "invoice.paid":
      case "invoice.payment_failed": {
        const inv = event.data.object;
        if (!inv.subscription) break; // one-off payments are logged at checkout
        const uid = await uidForCustomer(inv.customer, inv.subscription_details?.metadata?.uid);
        await logPayment({
          id: inv.id, uid, customer: inv.customer, amount: inv.amount_paid || inv.amount_due, currency: inv.currency,
          description: inv.lines?.data?.map((l) => l.description).filter(Boolean).join(", ") || "Subscription",
          status: event.type === "invoice.paid" ? "paid" : "failed", type: "subscription", created: inv.created,
        });
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object;
        if (ch.payment_intent) await db().collection("payments").doc(ch.payment_intent).set({ status: "refunded" }, { merge: true });
        if (ch.invoice) await db().collection("payments").doc(ch.invoice).set({ status: "refunded" }, { merge: true });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handling failed", event.type, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
