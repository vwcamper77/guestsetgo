import Link from 'next/link';
import { comparisons } from '@/lib/editorial.mjs';
import SocialActions from '@/components/SocialActions';

export function EditorialFooter() {
  return <footer className="editorial-footer wrap">
    <div><Link className="logo" href="/">GuestSetGo</Link><p className="small muted">Thoughtful guides. More confident guests.<br />Folkestone, Kent · <a href="mailto:hello@guestsetgo.com">hello@guestsetgo.com</a></p><SocialActions instagramUrl={process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/myguestsetgo/'} facebookUrl={process.env.NEXT_PUBLIC_FACEBOOK_URL || 'https://www.facebook.com/guestsetgo/'} siteUrl={process.env.NEXT_PUBLIC_SITE_URL} /></div>
    <nav aria-label="Compare guest guide options"><h2>Compare your options</h2><Link href="/vs">All comparisons</Link>{comparisons.map(c => <Link key={c.slug} href={`/vs/${c.slug}`}>{c.name}</Link>)}</nav>
    <nav aria-label="Hosting resources"><h2>For thoughtful hosts</h2><Link href="/blog">Hosting journal</Link><Link href="/blog/diy-holiday-let-welcome-book">Make your own welcome book</Link><Link href="/blog/convert-welcome-folder-to-digital-guide">Convert your welcome folder</Link><Link href="/about">Gavin’s hosting experience</Link><Link href="/#pricing">Pricing</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
  </footer>;
}

export function EditorialShell({ children }) {
  return <><a className="editorial-skip" href="#main-content">Skip to content</a><div className="wrap"><nav className="site-nav" aria-label="Main navigation"><Link className="logo brand-logo" href="/" aria-label="GuestSetGo home"><img src="/brand/guestsetgo-logo.png" alt="GuestSetGo" width="2172" height="724" /></Link><div className="navlinks"><Link href="/vs">Compare</Link><Link href="/blog">Journal</Link><Link className="btn solid small" href="/signup">Start free</Link></div></nav></div><main id="main-content" className="editorial-main" tabIndex={-1}>{children}</main><EditorialFooter /></>;
}

export function Breadcrumbs({ items }) {
  return <nav className="editorial-crumbs" aria-label="Breadcrumb"><ol><li><Link href="/">Home</Link></li>{items.map(([label, href]) => <li key={label}>{href ? <Link href={href}>{label}</Link> : <span aria-current="page">{label}</span>}</li>)}</ol></nav>;
}

export function JsonLd({ value }) { return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />; }

export function GuideCTA() {
  return <aside className="editorial-cta"><span className="eyebrow">See it from your guest’s side</span><h2>A clearer stay starts with one good guide.</h2><p>Build and preview free. Publish your first guide to start a 30-day trial for one property, with no card required.</p><div className="btnrow"><a className="btn sun" href="/demo.html">Explore the sample guide →</a><Link className="btn" href="/signup">Create your guide</Link></div><p className="small">Then £6/property/month or £60/year on Host. Optional folder conversion is £79 separately.</p></aside>;
}

export function Contents({ sections }) {
  return <nav className="editorial-toc" aria-label="On this page"><h2>On this page</h2><ol>{sections.map(([title], i) => <li key={title}><a href={`#section-${i + 1}`}>{title}</a></li>)}</ol></nav>;
}

export function Sections({ sections }) {
  return sections.map(([title, body], i) => <section className="editorial-section" id={`section-${i + 1}`} key={title}><h2>{title}</h2><p>{body}</p></section>);
}
