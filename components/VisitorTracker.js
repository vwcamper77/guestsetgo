"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackedPath } from "@/lib/analytics.mjs";

export default function VisitorTracker() {
  const pathname = usePathname();
  const lastPath = useRef(null);
  useEffect(() => {
    const path = trackedPath(pathname);
    if (!path || lastPath.current === pathname || navigator.doNotTrack === "1" || navigator.globalPrivacyControl) return;
    lastPath.current = pathname;
    fetch("/api/analytics", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, referrer: document.referrer }), keepalive: true,
    }).catch(() => {});
  }, [pathname]);
  return null;
}
