import Link from 'next/link';
import { comparisons } from '@/lib/editorial.mjs';
import { EditorialShell, Breadcrumbs, GuideCTA } from '@/components/Editorial';

export const metadata = {
  title: 'Compare digital guest guidebooks for UK holiday lets',
  description: 'Compare GuestSetGo with Touch Stay, Hostfully, Guest Manual, RueBaRue, Breezeway, Duve, Airbnb and DIY welcome folders. Sources and transparent costs.',
  alternates: { canonical: '/vs' },
  openGraph: { title: 'Find the right guest guide for your holiday let', description: 'A practical, source-linked comparison of digital guidebooks and DIY alternatives.', url: '/vs', type: 'website' },
};

export default function CompareHub() {
  return <EditorialShell><div className="wrap"><Breadcrumbs items={[["Compare guest guides"]]} /><header className="editorial-hero"><div><span className="eyebrow">The independent host’s shortlist</span><h1>A better guide starts with <em>an informed choice.</em></h1><p className="lede">Compare digital guest guidebooks, broader guest platforms and the folder you already own. Find the right fit for the way you host.</p><p className="small muted">Reviewed 16 October 2026 · Written by GuestSetGo about its own product</p></div><img src="/editorial/compare-guides.svg" width="800" height="580" alt="Illustration comparing a printed welcome folder with a phone-based property guide" /></header>
  <section className="editorial-note"><h2>Our recommendation: buy for the job you need done.</h2><p>Free tools can be enough. Operations platforms make sense when you need their wider capabilities. GuestSetGo focuses on photo instructions, a shared browser guide and optional help converting your existing welcome folder. These are editorial comparisons, not hands-on benchmarks or an independent rating.</p></section>
  <section aria-labelledby="shortlist"><div className="sec-head"><span className="eyebrow">Eight ways to welcome</span><h2 id="shortlist">Explore the comparisons</h2></div><div className="editorial-grid">{comparisons.map((c, i) => <article className="editorial-card" key={c.slug}><span className="k">0{i + 1} · {c.type}</span><h3><Link href={`/vs/${c.slug}`}>GuestSetGo vs {c.name}</Link></h3><p>{c.summary}</p><p className="small muted">{c.pricing}</p><Link href={`/vs/${c.slug}`} className="editorial-card-link">Read the {c.name} comparison →</Link></article>)}</div></section>
  <section className="editorial-section"><h2>Compare ongoing hosting and setup separately</h2><p>GuestSetGo Host costs £6 per property per month or £60 per year. Agency costs £4 per property per month for five or more properties, with a £20 monthly minimum. Optional welcome folder conversion costs £79 once per property for one batch of up to eight source photos. Conversion plus annual Host hosting is £139 for one property in year one, then £60 per year until cancelled.</p><p>Competitor pricing and packages change. Each comparison links to the provider’s source. Missing quotes are identified; currencies are kept separate. No unsupported savings, ratings or performance results are claimed.</p></section>
  <GuideCTA /><section className="editorial-section"><h2>Prefer to begin with your existing material?</h2><p>Follow our <Link href="/blog/diy-holiday-let-welcome-book">DIY welcome book checklist</Link> or read <Link href="/blog/convert-welcome-folder-to-digital-guide">how to convert a paper welcome folder</Link>. Learn about <Link href="/about">Gavin’s holiday rental experience</Link> and the perspective behind GuestSetGo.</p></section></div></EditorialShell>;
}
