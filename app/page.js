import Link from "next/link";
import QRCode from "qrcode";
import { PLANS } from "@/lib/plans";

export const metadata = { title: "GuestSetGo — digital guest guidebooks for holiday lets" };

const INSIDE = [
  ["Arrive", "Check-in steps", "Times, key safe location and entry steps, written for your door."],
  ["Show me", "Photo how-tos", "Snap the TV remote, fuse box or bin spot on your phone and tap to mark exactly which button or where."],
  ["Connect", "Wi-Fi and WhatsApp", "Wi-Fi in one tap, and a button that opens WhatsApp to you with the property already named."],
  ["Explore", "Walking routes", "Your favourite pub, chippy and beach, each with directions from the door and the exact route in Google Maps."],
  ["Rate", "Guest ratings", "Guests rate the places you recommend, so the next ones know where to go and you know who to partner with."],
  ["Leave", "Check-out form", "Guests tick off the tasks, flag anything broken or used up, and send it to you."],
];

const STEPS = [
  ["Create your account", "Sign up and add your property. We start you off with the usual sections."],
  ["Fill it in from your phone", "Add Wi-Fi, check-in steps, photos of the tricky bits and your local picks."],
  ["Send the QR code", "Attach it to your booking confirmation email and print the door sign."],
  ["Change it any time", "New code, new bin day, new favourite pub? Edit it and it's live straight away."],
];

export default async function Home() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://guestsetgo.com";
  const sampleUrl = new URL("/demo.html", siteUrl).toString();
  const qrDataUrl = await QRCode.toDataURL(sampleUrl, { width: 280, margin: 4, color: { dark: "#10233a", light: "#ffffff" } });
  return (
    <>
      <div className="wrap">
        <nav className="site-nav">
          <Link className="logo brand-logo" href="/" aria-label="GuestSetGo home"><img src="/brand/guestsetgo-logo.png" alt="GuestSetGo" width={2172} height={724} /></Link>
          <div className="navlinks">
            <a className="hide-sm" href="/demo.html">See a sample</a>
            <a className="hide-sm" href="#pricing">Pricing</a>
            <Link href="/login">Sign in</Link>
            <Link className="btn solid small" href="/signup">Get started</Link>
          </div>
        </nav>

        <header className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Digital guest guidebooks for holiday lets</span>
            <h1>Answer every guest question <em>before they ask.</em></h1>
            <p className="lede">One QR code by the door. Wi-Fi, check-in, parking, bins, house rules and your local tips on your guest's phone. No app, no login, and you can change it any time.</p>
            <div className="btnrow">
              <Link className="btn solid" href="/signup">Create your guidebook</Link>
              <a className="btn" href="/demo.html">See a sample →</a>
            </div>
            <p className="small muted">Based in Folkestone. Built for hosts along the Kent coast, from Whitstable to Rye.</p>
          </div>
          <div className="stage">
            <div className="phone" aria-hidden="true"><div className="screen">
              <div className="scr-head"><small>Welcome to</small><b>The Signal Loft</b></div>
              <div className="scr-body">
                <div className="row"><span>Check-in</span><b>from 4pm</b></div>
                <div className="row"><span>Wi-Fi</span><code>SignalLoft_Guest</code></div>
                <div className="row"><span>Password</span><code>seaview2026</code></div>
                <div className="row"><span>Bins out</span><b>Tuesday night</b></div>
                <div className="row"><span>Check-out</span><b>by 10am</b></div>
              </div>
            </div></div>
            <a className="doorsign" href="/demo.html" aria-label="Open the sample guest guidebook, or scan its QR code">
              <span className="doorsign-hole" aria-hidden="true" />
              <img src={qrDataUrl} alt="Scan to open the sample guest guidebook" width={140} height={140} />
              <b>Scan for your stay</b>
            </a>
          </div>
        </header>
      </div>

      <section className="band sec">
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">What's inside</span><h2>Everything a guest needs, on one page.</h2></div>
          <div className="contents">
            {INSIDE.map(([k, h, t]) => <div className="item" key={k}><span className="k">{k}</span><h3>{h}</h3><p>{t}</p></div>)}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">How it works</span><h2>Live in an evening.</h2></div>
          <ol className="steps4">{STEPS.map(([h, t]) => <li key={h}><h3>{h}</h3><p>{t}</p></li>)}</ol>
        </div>
      </section>

      <section className="band sec" id="pricing">
        <div className="wrap">
          <div className="sec-head"><span className="eyebrow">Pricing</span><h2>Simple, per property.</h2><p>Build and preview for free. Pay when you put a guidebook live.</p></div>
          <div className="prices">
            {Object.values(PLANS).map((pl) => (
              <div className={`ticket ${pl.id === "host" ? "feature" : ""}`} key={pl.id}>
                {pl.id === "host" && <span className="flag">Most hosts</span>}
                <h3>{pl.name}</h3>
                <div className="amount">{pl.price}</div>
                <ul>{pl.features.map((f) => <li key={f}>{f}</li>)}</ul>
                <Link className={`btn ${pl.id === "host" ? "solid" : ""}`} href={`/signup?next=${encodeURIComponent(`/dashboard/billing?plan=${pl.id}`)}`}>Choose {pl.name}</Link>
              </div>
            ))}
          </div>
          <p className="notice" style={{ marginTop: 24 }}><b>Founding hosts offer:</b> the first 10 Kent properties get set-up free. Email hello@guestsetgo.com before you sign up.</p>
        </div>
      </section>

      <div className="wrap"><footer className="site-foot"><span>© {new Date().getFullYear()} GuestSetGo · Folkestone, Kent · hello@guestsetgo.com</span><Link href="/login">Host sign in</Link></footer></div>
    </>
  );
}
