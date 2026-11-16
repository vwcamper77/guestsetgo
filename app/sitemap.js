import { absolutePublicUrl, indexablePaths, sitemapLastModified } from '@/lib/seo.mjs';

export default function sitemap() {
  return indexablePaths().map((path) => {
    const lastModified = sitemapLastModified(path);
    return { url: absolutePublicUrl(path), ...(lastModified ? { lastModified } : {}) };
  });
}
