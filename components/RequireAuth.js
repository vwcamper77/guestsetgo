"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function RequireAuth({ children }) {
  const { user } = useAuth();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (user === null) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [user, router, path]);
  if (!user) return <div className="page-loading">Loading…</div>;
  return children;
}
