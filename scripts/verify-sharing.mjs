import { writeFileSync } from 'node:fs';
const base = process.env.SHARING_TEST_URL || 'http://localhost:3187';
for (const format of ['instagram', 'facebook']) {
  const response = await fetch(`${base}/api/social-card?format=${format}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok || bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a') throw new Error(`${format} image failed: ${response.status}`);
  writeFileSync(`output/${format}-share.png`, bytes);
  console.log(format, response.status, bytes.readUInt32BE(16), bytes.readUInt32BE(20));
}
for (const route of ['/', '/blog/diy-holiday-let-welcome-book', '/blog/convert-welcome-folder-to-digital-guide']) {
  const response = await fetch(`${base}${route}`);
  const html = await response.text();
  if (!response.ok || !html.includes('property="og:image"') || !html.includes('Get my free checklist')) throw new Error(`${route}: missing metadata or form`);
  console.log(route, 'metadata and checklist present');
}
for (const [label, origin, email, expected] of [['invalid email', base, 'invalid', 400], ['wrong origin', 'https://other.example', 'test@example.com', 403]]) {
  const response = await fetch(`${base}/api/checklist`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify({ email }) });
  if (response.status !== expected) throw new Error(`${label}: ${response.status}`);
  console.log(label, response.status);
}
const admin = await fetch(`${base}/api/admin/checklist`);
if (admin.status !== 401) throw new Error(`Unauthenticated export: ${admin.status}`);
console.log('Unauthenticated export rejected');
