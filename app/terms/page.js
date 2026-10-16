import Link from "next/link";

export const metadata = { title: "Terms of service" };

export default function Terms() {
  const updated = "16 October 2026";
  return (
    <div className="wrap narrow sec">
      <Link href="/" className="logo"><span className="tagdot" aria-hidden="true" />GuestSetGo</Link>
      <h1>Terms of service</h1>
      <p className="muted small">Last updated {updated}. This is a plain-English summary, not reviewed by a lawyer — if you need a compliance-checked terms page, have this read over before relying on it.</p>

      <h2>What GuestSetGo is</h2>
      <p>GuestSetGo helps hosts build digital guest guidebooks for holiday lets. House-photo uploads and numbered instructions are part of the editor. Welcome folder conversion is a separate £79 purchase per property; document uploads, AI conversion and preparation help unlock after payment. You review converted information before publishing.</p>

      <h2>Your account</h2>
      <p>You're responsible for the accuracy of what you put in your guidebook (Wi-Fi details, check-in steps, local recommendations) and for keeping your login secure. You must be the host or authorised to manage the property you add.</p>

      <h2>Plans and billing</h2>
      <p>Host costs £6 per property per month or £60 per property per year. Agency costs £4 per property per month with a minimum of five properties (£20 per month). There is no mandatory setup fee. Subscriptions renew at the chosen interval until cancelled. Existing Starter purchases retain their original 12-month term.</p>
      <p>Your first guidebook publication starts a 30-day trial for one property. No payment card is required and the trial does not automatically charge or renew. Hosting is needed after it ends.</p>
      <h2>Photo conversion and assisted setup</h2>
      <p>AI photo conversion produces drafts and can misread text or omit details. You must check accuracy, conflicting instructions, brochure opening hours and prices before publishing. Only upload material you are authorised to use, without guest personal data or access codes.</p>
      <p>Assisted setup costs £79 once per property and covers conversion of one batch of up to eight supplied photos into a draft manual for your approval. Hosting is separate. Larger portfolio migrations are quoted separately. Contact hello@guestsetgo.com about changes, delivery timing, cancellation or refunds for assisted work; your applicable statutory rights remain unaffected.</p>

      <h2>Cancelling</h2>
      <p>Cancel a subscription any time; it stays active until the end of the period you've already paid for, then stops renewing. A Starter guidebook stays live for the 12 months you paid for and isn't auto-renewed.</p>

      <h2>Guest access</h2>
      <p>Guests open a guidebook via a link or QR code without creating an account. We're not responsible for guests sharing that link beyond the stay it was intended for — hosts control what information goes into a guidebook, including keeping sensitive details (like key safe codes) out of it.</p>

      <h2>Acceptable use</h2>
      <p>Don't use GuestSetGo for properties you're not authorised to manage, or to publish anything illegal, abusive, or misleading to guests.</p>

      <h2>Liability</h2>
      <p>We aim to keep the service available and your data safe, but we can't guarantee uninterrupted uptime. We're not liable for losses arising from guidebook content you've written yourself, or from guests misusing information you've chosen to include.</p>

      <h2>Changes</h2>
      <p>We may update these terms as the product changes. We'll post the new version here with an updated date.</p>

      <h2>Contact</h2>
      <p>Questions about these terms: hello@guestsetgo.com.</p>
    </div>
  );
}
