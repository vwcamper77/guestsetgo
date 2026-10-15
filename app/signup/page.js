import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Create an account" };

export default function Page() {
  return <Suspense fallback={<div className="page-loading">Loading…</div>}><AuthForm mode="signup" /></Suspense>;
}
