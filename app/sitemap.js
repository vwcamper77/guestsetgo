import { absolutePublicUrl, indexablePaths } from '@/lib/seo.mjs';

export default function sitemap() {
  return indexablePaths().map((path) => ({
    url: absolutePublicUrl(path),
    ...(path.startsWith('/vs') || path.startsWith('/blog') || path === '/about' ? { lastModified: '2026-10-16' } : {}),
  }));
}
