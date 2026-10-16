import Link from "next/link";

export const metadata = { title: "Privacy policy" };

export default function Privacy() {
  const updated = "16 October 2026";
  return (
    <div className="wrap narrow sec">
      <Link href="/" className="logo"><span className="tagdot" aria-hidden="true" />GuestSetGo</Link>
      <h1>Privacy policy</h1>
      <p className="muted small">Last updated {updated}. This is a plain-English summary, not reviewed by a lawyer — if you need a compliance-checked policy, have this read over before relying on it.</p>

      <h2>Who this covers</h2>
      <p>GuestSetGo ("we") provides digital guest guidebooks to holiday-let hosts ("hosts"). This policy covers both hosts, who create an account, and guests, who open a host's guidebook link without creating one.</p>

      <h2>What we collect</h2>
      <p><b>From hosts:</b> your name, email, WhatsApp/phone number, property details and content you add to your guidebooks (Wi-Fi details, house photos, local recommendations), and billing information handled by Stripe (we don't store card numbers ourselves).</p>
      <p><b>From guests:</b> nothing is required to open a guidebook. If a guest submits a check-out form or rates a local recommendation, we store what they type and the time it was submitted. We don't ask guests to sign in or create an account.</p>

      <h2>How we use it</h2>
      <p>To run the guidebook you've built, send you check-out reports and ratings, process payment and billing, and respond if you contact us for support. We don't sell host or guest data, and we don't use it for advertising.</p>

      <h2>Where it's stored</h2>
      <p>Account and guidebook data is stored with Firebase (Google Cloud). Payments are processed by Stripe. Both are reputable providers with their own security and privacy practices.</p>

      <h2>How long we keep it</h2>
      <p>We keep host accounts and guidebooks for as long as the account is active, and for a reasonable period after cancellation in case you want to reactivate. Guest check-out submissions are kept so hosts can refer back to past stays. You can ask us to delete your host account and its data at any time.</p>

      <h2>Your rights</h2>
      <p>If you're in the UK or EU, you can ask us to access, correct, or delete the personal data we hold about you. Email hello@guestsetgo.com and we'll action it.</p>

      <h2>Contact</h2>
      <p>Questions about this policy: hello@guestsetgo.com.</p>
    </div>
  );
}
