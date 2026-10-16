import { articles, comparisons } from '@/lib/editorial.mjs';
import { publicSiteUrl } from '@/lib/site-url.mjs';
export default function sitemap() {
  const base = publicSiteUrl();
  const paths = ['', '/about', '/vs', '/blog', '/sharing', '/privacy', '/terms', ...comparisons.map(c => `/vs/${c.slug}`), ...articles.map(a => `/blog/${a.slug}`)];
  return paths.map(path => ({ url: new URL(path || '/', base).href, ...(path.startsWith('/vs') || path.startsWith('/blog') || path === '/about' ? { lastModified: '2026-10-16' } : {}) }));
}
