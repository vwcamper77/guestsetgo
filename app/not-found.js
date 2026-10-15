import Link from "next/link";

export default function NotFound() {
  return (
    <div className="auth wrap">
      <div className="auth-card">
        <Link href="/" className="logo"><span className="tagdot" aria-hidden="true" />GuestSetGo</Link>
        <h1 style={{ fontSize: "1.6rem" }}>This page isn't available</h1>
        <p className="muted">If you're a guest, check the link in your booking message or ask your host to send it again.</p>
        <Link className="btn" href="/">Go to the home page</Link>
      </div>
    </div>
  );
}
