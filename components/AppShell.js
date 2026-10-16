"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import RequireAuth from "./RequireAuth";
import ReleaseNotice from "./ReleaseNotice";

function Nav() {
  const { user, api, logout } = useAuth();
  const path = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    api("/api/me").then((d) => setIsAdmin(!!d.isAdmin)).catch(() => {});
  }, [api]);
  const link = (href, label) => (
    <Link href={href} className={path === href || (href !== "/dashboard" && path.startsWith(href)) ? "on" : ""}>{label}</Link>
  );
  return (
    <header className="appbar">
      <div className="wrap appbar-in">
        <Link href="/" className="logo brand-logo app-brand" aria-label="GuestSetGo home"><img src="/brand/guestsetgo-logo.png" alt="GuestSetGo" width={2172} height={724} /></Link>
        <nav className="applinks">
          {link("/dashboard", "Guidebooks")}
          {link("/dashboard/billing", "Billing")}
          {isAdmin && link("/admin", "Admin")}
        </nav>
        <div className="appuser">
          <span className="muted small">{user?.email}</span>
          <button className="btn small" type="button" onClick={logout}>Sign out</button>
        </div>
      </div>
    </header>
  );
}

export default function AppShell({ children }) {
  return (
    <RequireAuth>
      <Nav />
      <ReleaseNotice />
      <main className="wrap app-main">{children}</main>
    </RequireAuth>
  );
}
