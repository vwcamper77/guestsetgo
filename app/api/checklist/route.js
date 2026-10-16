import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { handle, HttpError } from '@/lib/auth-server';

export const runtime = 'nodejs';
export const POST = handle(async request => {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new HttpError(403, 'Invalid origin.');
  const raw = await request.text();
  if (raw.length > 2048) throw new HttpError(413, 'Request too large.');
  let body;
  try { body = JSON.parse(raw); } catch { throw new HttpError(400, 'Invalid request.'); }
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.website) throw new HttpError(400, 'Please enter a valid email address.');
  const pdf = await readFile(path.join(process.cwd(), 'assets', 'guestsetgo-impress-your-guests.pdf'));
  const id = createHash('sha256').update(email).digest('hex');
  await db().collection('checklistRequests').doc(id).set({ email, requestedAt: FieldValue.serverTimestamp(), source: 'impress-your-guests', ...(body.tips === true ? { marketingConsent: true, consentAt: FieldValue.serverTimestamp(), consentText: 'Occasional GuestSetGo hosting tips and product news. Unsubscribe by emailing hello@guestsetgo.com.' } : {}) }, { merge: true });
  return new Response(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="guestsetgo-impress-your-guests.pdf"', 'Cache-Control': 'no-store' } });
});
