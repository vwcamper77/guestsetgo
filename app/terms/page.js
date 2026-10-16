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
      <p>GuestSetGo is a self-service tool for building digital guest guidebooks for holiday lets. You build and edit your own guidebook; we provide the software, hosting and QR code.</p>

      <h2>Your account</h2>
      <p>You're responsible for the accuracy of what you put in your guidebook (Wi-Fi details, check-in steps, local recommendations) and for keeping your login secure. You must be the host or authorised to manage the property you add.</p>

      <h2>Plans and billing</h2>
      <p>Starter is a one-off payment covering one property for 12 months. Host and Agency are subscriptions billed monthly per property, which you can cancel at any time from Billing. Prices shown on the pricing page are for display; the amount actually charged is set up in Stripe and may change with notice.</p>

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
