"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ANALYTICS_CONSENT_KEY, GA_MEASUREMENT_ID, isPublicAnalyticsPath } from "@/lib/analytics-events.mjs";
import { sendPublicPageView } from "@/components/google-analytics-client";

const id = GA_MEASUREMENT_ID;
const key = ANALYTICS_CONSENT_KEY;

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const [choice, setChoice] = useState("loading");
  const [open, setOpen] = useState(false);
  const publicPage = isPublicAnalyticsPath(pathname || "/");
  useEffect(() => {
    if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl) { setChoice("blocked"); return; }
    try { setChoice(localStorage.getItem(key) || "unset"); } catch { setChoice("unset"); }
  }, []);
  useEffect(() => {
    window[`ga-disable-${id}`] = choice !== "accepted";
    if (choice !== "accepted") return;
    const frame = requestAnimationFrame(() => sendPublicPageView(pathname));
    return () => cancelAnimationFrame(frame);
  }, [choice, pathname]);
  function choose(value) {
    window[`ga-disable-${id}`] = value !== "accepted";
    try { localStorage.setItem(key, value); } catch {}
    setChoice(value);
    setOpen(false);
    if (value === "declined") {
      for (const cookie of document.cookie.split(";")) {
        const name = cookie.split("=")[0].trim();
        if (!/^_ga(?:_|$)/.test(name)) continue;
        for (const domain of ["", "; domain=guestsetgo.com", "; domain=.guestsetgo.com"]) document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
      }
    }
  }
  if (!publicPage || ["loading", "blocked"].includes(choice)) return null;
  return <aside aria-label="Analytics preferences" style={{ position: "fixed", bottom: 12, left: 12, zIndex: 1000, maxWidth: "min(420px, calc(100vw - 24px))", background: "#fff", color: "#16352d", padding: 16, border: "1px solid #ccc", borderRadius: 12, boxShadow: "0 2px 12px #0002" }}>
    {choice === "unset" || open ? <><p>Allow Google Analytics cookies to help us understand visits to our public website? Your choice is optional. <a href="/privacy">Privacy policy</a></p><button type="button" onClick={() => choose("accepted")}>Accept analytics</button>{" "}<button type="button" onClick={() => choose("declined")}>Reject analytics</button></> : <button type="button" onClick={() => setOpen(true)}>Cookie preferences</button>}
  </aside>;
}
