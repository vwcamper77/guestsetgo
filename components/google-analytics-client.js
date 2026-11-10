"use client";

import { ANALYTICS_CONSENT_KEY, GA_MEASUREMENT_ID, isPublicAnalyticsPath, pageViewParams } from "@/lib/analytics-events.mjs";

const HOSTS = ["guestsetgo.com", "www.guestsetgo.com"];
let previousLocation = "";

export function analyticsConsentGranted() {
  if (typeof window === "undefined") return false;
  if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl) return false;
  if (!HOSTS.includes(location.hostname)) return false;
  try { return localStorage.getItem(ANALYTICS_CONSENT_KEY) === "accepted"; }
  catch { return false; }
}

function ensureGtag() {
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  if (document.getElementById("guestsetgo-ga")) return;
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement("script");
  script.id = "guestsetgo-ga";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

export function sendPublicPageView(pathname) {
  try {
    if (!analyticsConsentGranted() || !isPublicAnalyticsPath(pathname)) return;
    ensureGtag();
    const params = pageViewParams({ origin: location.origin, pathname, title: document.title, referrer: previousLocation || document.referrer });
    if (!params) return;
    window.gtag("event", "page_view", params);
    previousLocation = params.page_location;
  } catch {}
}

export function trackEvent(name, params) {
  try {
    if (!params || !analyticsConsentGranted()) return;
    ensureGtag();
    window.gtag("event", name, params);
  } catch {}
}
