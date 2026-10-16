import { db, plain } from '@/lib/firebase-admin';
import { handle, ok, requireAdmin } from '@/lib/auth-server';
export const dynamic = 'force-dynamic';
export const GET = handle(async request => {
  await requireAdmin(request);
  const snapshot = await db().collection('checklistRequests').orderBy('requestedAt', 'desc').limit(10000).get();
  return ok({ requests: snapshot.docs.map(doc => plain(doc.data())) });
});
