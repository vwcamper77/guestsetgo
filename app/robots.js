import { ROBOTS_DISALLOW } from '@/lib/seo.mjs';
import { publicSiteUrl } from '@/lib/site-url.mjs';

export default function robots() {
  const base = publicSiteUrl();
  return { rules: { userAgent: '*', allow: '/', disallow: ROBOTS_DISALLOW }, sitemap: new URL('/sitemap.xml', base).href };
}
