"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const id = "G-90N6XYYYF2";
const key = "guestsetgo-analytics-consent";

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const [choice, setChoice] = useState("loading");
  const [open, setOpen] = useState(false);
  const publicPage = !/^\/(admin|dashboard|api|login|signup|g)(\/|$)/.test(pathname || "/");
  useEffect(() => {
    if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl) { setChoice("blocked"); return; }
    try { setChoice(localStorage.getItem(key) || "unset"); } catch { setChoice("unset"); }
  }, []);
  useEffect(() => {
    window[`ga-disable-${id}`] = choice !== "accepted" || !publicPage;
    if (choice !== "accepted" || !publicPage || !["guestsetgo.com", "www.guestsetgo.com"].includes(location.hostname)) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    if (!document.getElementById("guestsetgo-ga")) {
      window.gtag("js", new Date());
      const script = document.createElement("script");
      script.id = "guestsetgo-ga";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
      document.head.appendChild(script);
    }
    window.gtag("config", id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: location.origin + pathname, page_referrer: "" });
    window.gtag("event", "page_view", { page_location: location.origin + pathname, page_title: document.title, page_referrer: "" });
  }, [choice, pathname, publicPage]);
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
