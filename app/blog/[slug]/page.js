import Link from 'next/link';
import GuestChecklist from '@/components/GuestChecklist';
import { notFound } from 'next/navigation';
import { articlePublished, articleWordCount, articles, publishedLabel } from '@/lib/editorial.mjs';
import { Blocks, Breadcrumbs, Contents, EditorialShell, GuideCTA, JsonLd, Sections } from '@/components/Editorial';
import { articleStructuredData, documentFor, publicPageMetadata } from '@/lib/seo.mjs';

export const dynamicParams = false;
export function generateStaticParams() { return articles.map(a => ({ slug: a.slug })); }
export function generateMetadata({ params }) {
  const a = articles.find(a => a.slug === params.slug);
  if (!a) return {};
  return publicPageMetadata(documentFor(`/blog/${a.slug}`));
}

function heroAlt(article) {
  if (article.imageAlt) return article.imageAlt;
  return article.slug.startsWith('diy')
    ? 'Illustration of a host’s checklist beside a phone with numbered property instructions'
    : 'Illustration of printed welcome pages becoming a structured digital property guide';
}

export default function Article({ params }) {
  const a = articles.find(a => a.slug === params.slug);
  if (!a) notFound();
  const doc = documentFor(`/blog/${a.slug}`);
  const others = articles.filter(item => item.slug !== a.slug);
  return <EditorialShell><div className="wrap"><Breadcrumbs items={[["Journal", "/blog"], [a.title]]} /><header className="editorial-hero"><div><span className="eyebrow">{a.kicker}</span><h1>{a.title}</h1><p className="lede">{a.description}</p><p className="small muted">GuestSetGo team · {publishedLabel(articlePublished(a))} · {Math.ceil(articleWordCount(a) / 200)} minute read</p></div><img src={`/editorial/${a.image}`} width={a.imageWidth || 800} height={a.imageHeight || 580} alt={heroAlt(a)} /></header><div className="editorial-reading"><Contents sections={a.sections} /><article className="editorial-prose">{a.intro ? <div className="editorial-section"><Blocks blocks={a.intro} /></div> : null}<Sections sections={a.sections} />{a.disclaimer ? <p className="editorial-disclaimer">{a.disclaimer}</p> : null}<aside className="editorial-author"><span className="eyebrow">Rooted in hosting</span><h2>Years of welcoming guests</h2><p>Gavin’s experience includes <a href="https://chateaumontfelix.com">Château Mont Félix</a> and The Art Loft in Folkestone. <Link href="/about">Meet the experience behind GuestSetGo →</Link></p></aside></article></div><GuestChecklist /><GuideCTA /><section className="editorial-section"><h2>Keep reading</h2><div className="editorial-related">{others.map(item => <Link key={item.slug} href={`/blog/${item.slug}`}>{item.title} →</Link>)}<Link href="/vs/paper-welcome-folder">Digital guide vs paper folder →</Link><Link href="/vs">Compare guidebook providers →</Link></div></section></div><JsonLd value={articleStructuredData({ headline: a.title, description: a.description, path: `/blog/${a.slug}`, date: doc.publishedTime, wordCount: articleWordCount(a), image: doc.image || undefined, faqs: a.faqs, kinds: ['Article', 'BlogPosting'], breadcrumbs: [['Home', '/'], ['Journal', '/blog'], [a.title, `/blog/${a.slug}`]] })} /></EditorialShell>;
}
