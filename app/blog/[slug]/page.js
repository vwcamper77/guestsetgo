import Link from 'next/link';
import GuestChecklist from '@/components/GuestChecklist';
import { notFound } from 'next/navigation';
import { articles, wordCount } from '@/lib/editorial.mjs';
import { EditorialShell, Breadcrumbs, Contents, Sections, GuideCTA, JsonLd } from '@/components/Editorial';

export const dynamicParams = false;
export function generateStaticParams() { return articles.map(a => ({ slug: a.slug })); }
export function generateMetadata({ params }) {
  const a = articles.find(a => a.slug === params.slug);
  if (!a) return {};
  return { title: a.title, description: a.description, alternates: { canonical: `/blog/${a.slug}` }, openGraph: { title: a.title, description: a.description, url: `/blog/${a.slug}`, type: 'article', publishedTime: '2026-10-16', authors: ['GuestSetGo team'] } };
}
export default function Article({ params }) {
  const a = articles.find(a => a.slug === params.slug);
  if (!a) notFound();
  const other = articles.find(x => x.slug !== a.slug);
  return <EditorialShell><div className="wrap"><Breadcrumbs items={[["Journal", "/blog"], [a.title]]} /><header className="editorial-hero"><div><span className="eyebrow">{a.kicker}</span><h1>{a.title}</h1><p className="lede">{a.description}</p><p className="small muted">GuestSetGo team · 16 October 2026 · {Math.ceil(wordCount(a.sections) / 200)} minute read</p></div><img src={`/editorial/${a.image}`} width="800" height="580" alt={a.slug.startsWith('diy') ? 'Illustration of a host’s checklist beside a phone with numbered property instructions' : 'Illustration of printed welcome pages becoming a structured digital property guide'} /></header><div className="editorial-reading"><Contents sections={a.sections} /><article className="editorial-prose"><Sections sections={a.sections} /><aside className="editorial-author"><span className="eyebrow">Rooted in hosting</span><h2>Years of welcoming guests</h2><p>Gavin’s experience includes <a href="https://chateaumontfelix.com">Château Mont Félix</a> and The Art Loft in Folkestone. <Link href="/about">Meet the experience behind GuestSetGo →</Link></p></aside></article></div><GuestChecklist /><GuideCTA /><section className="editorial-section"><h2>Keep reading</h2><div className="editorial-related"><Link href={`/blog/${other.slug}`}>{other.title} →</Link><Link href="/vs/paper-welcome-folder">Digital guide vs paper folder →</Link><Link href="/vs">Compare guidebook providers →</Link></div></section></div><JsonLd value={{ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: a.title, description: a.description, datePublished: '2026-10-16', dateModified: '2026-10-16', author: { '@type': 'Organization', name: 'GuestSetGo team', url: 'https://www.guestsetgo.com/about' }, publisher: { '@type': 'Organization', name: 'GuestSetGo' }, mainEntityOfPage: `https://www.guestsetgo.com/blog/${a.slug}`, wordCount: wordCount(a.sections) }} /></EditorialShell>;
}
