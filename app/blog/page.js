import Link from 'next/link';
import { articles } from '@/lib/editorial.mjs';
import { EditorialShell, Breadcrumbs, GuideCTA, JsonLd } from '@/components/Editorial';
import { documentFor, hubStructuredData, publicPageMetadata } from '@/lib/seo.mjs';

const doc = documentFor('/blog');
export const metadata = publicPageMetadata(doc);

export default function Journal() {
  return <EditorialShell><JsonLd value={hubStructuredData({ type: 'Blog', name: doc.title, description: doc.description, path: '/blog', breadcrumbs: [['Home', '/'], ['Hosting journal', '/blog']] })} /><div className="wrap"><Breadcrumbs items={[["Hosting journal"]]} /><header className="editorial-intro"><span className="eyebrow">The hosting journal</span><h1>A warmer welcome.<br /><em>A clearer answer.</em></h1><p className="lede">Practical guides for independent holiday let owners, from the first draft to the QR sign by the door.</p></header><div className="editorial-grid">{articles.map(a => <article className="editorial-card" key={a.slug}><Link href={`/blog/${a.slug}`} tabIndex={-1} aria-hidden="true"><img src={`/editorial/${a.image}`} width="800" height="580" alt="" /></Link><span className="k">{a.kicker}</span><h2><Link href={`/blog/${a.slug}`}>{a.title}</Link></h2><p>{a.description}</p><Link href={`/blog/${a.slug}`}>Read the guide →</Link></article>)}</div><GuideCTA /></div></EditorialShell>;
}
