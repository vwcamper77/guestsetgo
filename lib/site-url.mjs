// Public search metadata must never point at a developer's localhost preview.
export function publicSiteUrl(configured = process.env.NEXT_PUBLIC_SITE_URL) {
  try {
    const url = new URL(configured);
    if (url.hostname === 'guestsetgo.com') return 'https://www.guestsetgo.com';
    if (url.protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return url.origin;
  } catch {}
  return 'https://www.guestsetgo.com';
}
