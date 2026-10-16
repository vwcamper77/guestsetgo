import { NextResponse } from "next/server";
import { adminAuth, db } from "./firebase-admin";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function isAdminEmail(email) {
  const list = ["gavinferns@hotail.com", ...(process.env.ADMIN_EMAILS || "").split(",")].map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

/** Verifies the Firebase ID token in the Authorization header. */
export async function requireUser(req) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Please sign in.");
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email || "", name: decoded.name || "", isAdmin: isAdminEmail(decoded.email) };
  } catch {
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  }
}

export async function requireAdmin(req) {
  const user = await requireUser(req);
  if (!user.isAdmin) throw new HttpError(403, "Admins only.");
  return user;
}

/** Loads a property and checks the caller owns it (admins can open any). */
export async function requireProperty(user, id) {
  const ref = db().collection("properties").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "Guidebook not found.");
  const data = snap.data();
  if (data.ownerUid !== user.uid && !user.isAdmin) throw new HttpError(404, "Guidebook not found.");
  return { ref, data };
}

/** Wraps a route handler so thrown HttpErrors become JSON responses. */
export function handle(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(err);
      return NextResponse.json({ error: status === 500 ? "Something went wrong. Please try again." : err.message }, { status });
    }
  };
}

export function ok(data, init) {
  return NextResponse.json(data, init);
}
