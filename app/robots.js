import { publicSiteUrl } from '@/lib/site-url.mjs';
export default function robots() {
  const base = publicSiteUrl();
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/admin', '/dashboard', '/g/', '/upload-check', '/login', '/signup'] }, sitemap: new URL('/sitemap.xml', base).href };
}
