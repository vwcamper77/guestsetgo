import Link from "next/link";
import QRCode from "qrcode";
import { CurrencySelect } from "@/components/CurrencyProvider";
import { LandingPricing, PricingFaqs } from "@/components/LocalizedPricing";
import { EditorialFooter } from "@/components/Editorial";
import HomePreview from "@/components/HomePreview";
import "./home.css";

const description = "Give guests a guided walkthrough of your holiday home. Share photo instructions for heating, Wi-Fi, appliances and check-out with one simple QR code or link.";
export const metadata = {
  title: { absolute: "GuestSetGo | Guided walkthroughs for holiday homes" },
  description,
  alternates: { canonical: "/" },
  openGraph: { title: "Give every guest a guided walkthrough of your holiday home.", description, url: "/", images: [{ url: "/opengraph-image?v=phone-logo-2", width: 1200, height: 630, alt: "GuestSetGo logo and a phone displaying a holiday cottage guest guide" }] },
  twitter: { card: "summary_large_image", title: "GuestSetGo | Guided walkthroughs for holiday homes", description, images: ["/opengraph-image?v=phone-logo-2"] },
};

const FEATURES = [
  ["Scan or open", "Guests instantly access their guide using a QR code or link.", "scan"],
  ["Follow a walkthrough", "Step-by-step instructions with photographs, so everything makes sense.", "heating"],
  ["Find what they need", "Heating, Wi-Fi, appliances, hot tub and more. All in one place.", "kitchen"],
  ["Check out confidently", "Clear departure instructions for a smoother goodbye.", "leave"],
];
const STEPS = [
  ["Create your property guide", "Add your property details, photos and step-by-step instructions.", "▤"],
  ["Share a QR code or link", "Send it before arrival or leave a printed QR code in your home.", "▦"],
  ["Guide guests through their stay", "Guests follow the walkthroughs on their phones, at their own pace.", "♧"],
];

const FAQS = [
  ["Can you convert my existing welcome folder?", "Yes. Welcome folder conversion is a separate £79 purchase per property. After payment, upload photos of up to eight guidebook pages, brochures or cards. AI conversion and preparation help turn that material into a draft for your approval. Hosting is separate. House-photo uploads and numbered markers are included in the normal editor."],
  ["Can I try it with real guests?", "Yes. Build and preview free, then publish your first guide to start a 30-day trial for one property. No card required and no automatic charge. Afterwards choose Host at £6 per property per month or £60 per year, or Agency at £4 per property per month for five or more properties."],
  ["Can I edit it after it's live?", "Yes, any time, as often as you like. Changes go live the moment you save, no re-printing or re-sending the QR code."],
  ["What happens if I cancel or don't renew?", "Cancel any time from Billing. Your hosting stays active until the end of the monthly or annual period you paid for. When hosting or your trial expires, guests can no longer open the guide. Existing Starter purchases remain valid for their original 12 months."],
  ["Do my guests need an app or account?", "No. They scan the QR code or open the link and the guidebook opens straight in their phone's browser. Nothing to download, nothing to sign in to."],
];

export default async function Home() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://guestsetgo.com";
  const sampleUrl = new URL("/sample", siteUrl).toString();
  const qrDataUrl = await QRCode.toDataURL(sampleUrl, { width: 280, margin: 4, color: { dark: "#10233a", light: "#ffffff" } });
  return (
    <>
      <div className="home-page">
      <a className="home-skip" href="#main-content">Skip to content</a>
      <div className="wrap"><nav className="site-nav home-nav" aria-label="Main navigation">
        <Link className="logo brand-logo" href="/" aria-label="GuestSetGo home"><img src="/brand/guestsetgo-logo.png" alt="GuestSetGo" width={2172} height={724} /></Link>
        <div className="home-nav-sections"><a href="#how-it-works">How it works</a><a href="#example-guide">Example guide</a><a href="#benefits">Benefits</a><a href="#pricing">Pricing</a><a href="#faq">FAQs</a></div>
        <div className="home-nav-actions"><Link className="btn" href="/login">Log in</Link><Link className="btn solid" href="/signup">Create your guide</Link></div>
      </nav></div>
      <main id="main-content">
      <header className="home-hero">
        <div className="wrap home-hero-grid">
          <div className="home-hero-copy">
            <span className="home-kicker">A warm welcome. Without all the questions.</span>
            <h1>Give every guest a guided walkthrough of your holiday home.</h1>
            <p>Show guests how everything works — from the heating and hot tub to the Wi-Fi and check-out — with a simple digital guide they can open on their phone.</p>
            <div className="home-actions"><Link className="btn solid" href="/sample">See a guest walkthrough <span aria-hidden="true">→</span></Link><Link className="btn" href="/signup">Create your property guide</Link></div>
            <ul className="home-benefits"><li><span aria-hidden="true">☏</span>Fewer guest<br />questions</li><li><span aria-hidden="true">☺</span>Happier guests</li><li><span aria-hidden="true">◷</span>Smoother stays</li></ul>
          </div>
          <div className="home-hero-product"><HomePreview /><div className="home-qr-card"><img src={qrDataUrl} alt="Scan to try the fictional sample guest guide" width="100" height="100" /><div><b>Scan. Settle in.</b><span>No app. No guest account.</span></div></div><span className="home-sample-label">Fictional property · real guest experience</span></div>
        </div>
      </header>
      <section className="home-features" id="benefits" aria-labelledby="features-title"><div className="wrap">
        <div className="home-section-heading"><h2 id="features-title">Everything your guests need to know, in one place.</h2><p>A simple, visual guide to your holiday home. More time enjoying their stay.<br className="home-desktop-break" /> Less time asking you how things work.</p></div>
        <div className="home-feature-grid">{FEATURES.map(([title, text, type], i) => <article className="home-feature" key={title}>
          <div className={`home-feature-image home-feature-${type}`}>
            <img src={type === "heating" ? "/home/thermostat.svg" : type === "kitchen" ? "/home/kitchen.jpg" : type === "leave" ? "/home/cottage.jpg" : "/home/living-room.jpg"} alt={type === "heating" ? "A clear thermostat illustration" : type === "kitchen" ? "A holiday-home kitchen" : type === "leave" ? "A welcoming home" : "A comfortable living room"} width="800" height="520" loading="lazy" />
            {type === "scan" && <div className="home-card-qr"><img src={qrDataUrl} alt="" width="95" height="95" /><span>Your stay starts here</span></div>}
          </div>
          <div className="home-feature-text"><span className="home-number">{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div></div>
        </article>)}</div>
      </div></section>
      <section className="home-demo" id="example-guide" aria-labelledby="demo-title"><div className="wrap home-demo-grid">
        <div className="home-demo-product"><HomePreview interactive /><span className="home-demo-note">Try a topic ↑</span></div>
        <div className="home-demo-copy"><span className="home-kicker">See it for yourself</span><h2 id="demo-title">Explore a real guest guide</h2><p>Take a look around our fictional Rosewood Cottage and experience GuestSetGo as a guest. Try the heating, kitchen and hot-tub walkthroughs — the same photo-guide interface your guests will use.</p><Link className="btn solid" href="/sample">View a sample guide <span aria-hidden="true">→</span></Link><span className="home-demo-caption">Opens straight in your browser. No sign-up needed.</span></div>
      </div></section>
      <section className="home-how" id="how-it-works" aria-labelledby="how-title"><div className="wrap"><div className="home-section-heading"><span className="home-kicker">How it works</span><h2 id="how-title">Create. Share. Guide.</h2></div><ol className="home-steps">{STEPS.map(([title, text, icon], i) => <li key={title}><div className="home-step-icon"><span className="home-number">{i + 1}</span><span aria-hidden="true">{icon}</span></div><h3>{title}</h3><p>{text}</p></li>)}</ol></div></section>
      <section className="band sec" id="pricing">
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">Online guide subscriptions</span><h2>Keep your guest guide online.</h2><p>Hosting means your guests can open your guide using its QR code or web link. Build it yourself for free, then try one live guide for 30 days with no card. After the trial, an online guide subscription is required. The trial never charges automatically.</p></div>
          <CurrencySelect />
          <LandingPricing />
          <div className="notice" style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <span><b>Based in Folkestone, built for local hosts.</b> Create your own guide with house photos and local tips, or buy the optional folder-conversion service.</span>
            <Link className="btn solid small" href="/signup">Create my guidebook →</Link>
          </div>
        </div>
      </section>

      <section className="sec" id="faq">
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">Questions</span><h2>Good to know.</h2></div>
          <div style={{ display: "grid", gap: 10, maxWidth: 720 }}>
            <PricingFaqs faqs={FAQS} />
          </div>
        </div>
      </section>

      <section className="home-final"><div className="wrap"><span className="home-kicker">A little guidance. A much smoother stay.</span><h2>Make every guest feel at home from the moment they arrive.</h2><Link className="btn solid" href="/signup">Create your property guide <span aria-hidden="true">→</span></Link><p>Build and preview free. Try your first published guide for 30 days. No card required.</p></div></section>
      </main><EditorialFooter /></div>
    </>
  );
}
