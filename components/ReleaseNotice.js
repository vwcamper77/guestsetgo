"use client";
import { useEffect, useState } from "react";

export default function ReleaseNotice() {
  const [updated, setUpdated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/release", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data.release && data.release !== process.env.NEXT_PUBLIC_RELEASE_ID) setUpdated(true);
      } catch { /* An offline session can continue editing. */ }
    };
    check();
    const timer = setInterval(check, 60000);
    window.addEventListener("focus", check);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener("focus", check); };
  }, []);
  return updated ? <div className="wrap"><div className="notice" role="status">An updated editor is available. Save your changes, then <button className="btn small" type="button" onClick={() => window.location.reload()}>Reload the updated editor</button></div></div> : null;
}
