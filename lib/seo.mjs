import { articles, comparisons } from "./editorial.mjs";
import { priceBook } from "./currency.mjs";
import { publicSiteUrl } from "./site-url.mjs";

export const ROBOTS_DISALLOW = ["/api/", "/admin", "/dashboard", "/g/", "/upload-check", "/login", "/signup"];

const PAGES = {
  "/": {
    title: "GuestSetGo | Guided walkthroughs for holiday homes",
    description: "Give guests a guided walkthrough of your holiday home. Share photo instructions for heating, Wi-Fi, appliances and check-out with one simple QR code or link.",
    openGraphTitle: "Give every guest a guided walkthrough of your holiday home.",
    absoluteTitle: true,
  },
  "/about": {
    title: "About GuestSetGo: Gavin’s holiday rental experience",
    description: "GuestSetGo draws on Gavin’s years of holiday rental experience, including Château Mont Félix and The Art Loft in Folkestone.",
  },
  "/vs": {
    title: "Compare digital guest guidebooks for UK holiday lets",
    description: "Compare GuestSetGo with Touch Stay, Hostfully, Guest Manual, RueBaRue, Breezeway, Duve, Airbnb and DIY welcome folders. Sources and transparent costs.",
    openGraphTitle: "Find the right guest guide for your holiday let",
    openGraphDescription: "A practical, source-linked comparison of digital guidebooks and DIY alternatives.",
  },
  "/blog": {
    title: "Holiday let hosting journal: practical welcome book guides",
    description: "Create a DIY holiday let welcome book or convert your existing paper folder. Practical advice from GuestSetGo, built around real hosting experience.",
  },
  "/sharing": {
    title: "Instagram & Facebook sharing kit",
    description: "Download a card, add the caption below and share the free host checklist with your community.",
  },
  "/sample": {
    title: "Explore a sample guest walkthrough",
    description: "Try GuestSetGo as a guest: explore a fictional holiday home's heating, kitchen, hot tub and check-out instructions. No account needed.",
  },
  "/privacy": {
    title: "Privacy policy",
    description: "How GuestSetGo handles host accounts, guest guidebook submissions, photographs and optional analytics cookies.",
  },
  "/terms": {
    title: "Terms of service",
    description: "Plain-English terms for GuestSetGo digital guest guidebooks, hosting plans and the separate welcome folder conversion service.",
  },
};

export function absolutePublicUrl(path, configured) {
  const base = publicSiteUrl(configured);
  if (!path || path === "/") return base;
  return new URL(path, `${base}/`).href;
}

export function indexablePaths() {
  return ["/", "/about", "/vs", "/blog", "/sharing", "/sample", "/privacy", "/terms", ...comparisons.map((c) => `/vs/${c.slug}`), ...articles.map((a) => `/blog/${a.slug}`)];
}

export function publicDocuments() {
  return [
    ...Object.entries(PAGES).map(([path, page]) => ({ path, ...page })),
    ...comparisons.map((c) => ({
      path: `/vs/${c.slug}`,
      title: `GuestSetGo vs ${c.name}: holiday let guide comparison`,
      description: c.description,
      openGraphTitle: `GuestSetGo vs ${c.name}`,
      type: "article",
      publishedTime: "2026-10-16",
    })),
    ...articles.map((a) => ({
      path: `/blog/${a.slug}`,
      title: a.title,
      description: a.description,
      type: "article",
      publishedTime: "2026-10-16",
    })),
  ];
}

export function documentFor(path) {
  const doc = publicDocuments().find((item) => item.path === path);
  if (!doc) throw new Error(`No public metadata for ${path}`);
  return doc;
}

export function publicPageMetadata(doc) {
  const title = doc.openGraphTitle || doc.title;
  const description = doc.openGraphDescription || doc.description;
  const image = doc.image === false ? null : (doc.image || "/opengraph-image");
  return {
    title: doc.absoluteTitle ? { absolute: doc.title } : doc.title,
    description: doc.description,
    alternates: { canonical: doc.path },
    openGraph: {
      title,
      description,
      url: doc.path,
      type: doc.type || "website",
      siteName: "GuestSetGo",
      locale: "en_GB",
      ...(doc.publishedTime ? { publishedTime: doc.publishedTime } : {}),
      ...(image ? { images: [image] } : {}),
    },
    twitter: { card: "summary_large_image", title, description, ...(image ? { images: [image] } : {}) },
  };
}

export function robotsAllows(path) {
  return !ROBOTS_DISALLOW.some((rule) => path === rule || path.startsWith(rule));
}

function logo() {
  const base = publicSiteUrl();
  return { "@type": "ImageObject", url: `${base}/brand/guestsetgo-logo.png`, width: 2172, height: 724 };
}

export function breadcrumbList(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: absolutePublicUrl(path),
    })),
  };
}

export function homeStructuredData(faqs) {
  const base = publicSiteUrl();
  const prices = priceBook("GBP");
  const offer = (name, price, description) => ({ "@type": "Offer", name, price: String(price), priceCurrency: "GBP", url: `${base}/#pricing`, description });
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "GuestSetGo",
        url: base,
        email: "hello@guestsetgo.com",
        logo: logo(),
        address: { "@type": "PostalAddress", addressLocality: "Folkestone", addressRegion: "Kent", addressCountry: "GB" },
      },
      {
        "@type": "SoftwareApplication",
        name: "GuestSetGo",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: `${base}/#pricing`,
        offers: [
          offer("Host monthly", prices.hostMonthly, `£${prices.hostMonthly} per property per month`),
          offer("Host annual", prices.hostAnnual, `£${prices.hostAnnual} per property per year`),
          offer("Agency", prices.agencyMonthly, `£${prices.agencyMonthly} per property per month for five or more properties. Minimum bill £${prices.minimumAgency} a month.`),
          offer("Welcome folder conversion", prices.assisted, `£${prices.assisted} once per property. Hosting is separate.`),
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
      },
    ],
  };
}

export function hubStructuredData({ type, name, description, path, breadcrumbs }) {
  return { "@context": "https://schema.org", "@graph": [{ "@type": type, name, description, url: absolutePublicUrl(path) }, breadcrumbList(breadcrumbs)] };
}

export function articleStructuredData({ headline, description, path, date = "2026-10-16", wordCount, breadcrumbs, kinds = ["Article"] }) {
  const base = publicSiteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": kinds.length === 1 ? kinds[0] : kinds,
        headline,
        description,
        datePublished: date,
        dateModified: date,
        mainEntityOfPage: absolutePublicUrl(path),
        ...(wordCount ? { wordCount } : {}),
        author: { "@type": "Organization", name: "GuestSetGo", url: absolutePublicUrl("/about") },
        publisher: { "@type": "Organization", name: "GuestSetGo", url: base, logo: logo() },
      },
      breadcrumbList(breadcrumbs),
    ],
  };
}
