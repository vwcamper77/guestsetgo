"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider,
  signInWithPopup, sendPasswordResetEmail, updateProfile,
} from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";
import { useAuth } from "./AuthProvider";

const MESSAGES = {
  "auth/invalid-credential": "That email and password don't match.",
  "auth/wrong-password": "That email and password don't match.",
  "auth/user-not-found": "There's no account with that email. Create one instead.",
  "auth/email-already-in-use": "There's already an account with that email. Sign in instead.",
  "auth/weak-password": "Use at least 8 characters for your password.",
  "auth/invalid-email": "Check the email address.",
  "auth/popup-closed-by-user": "Google sign-in was closed before it finished.",
  "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow pop-ups for GuestSetGo, or sign in with email.",
  "auth/unauthorized-domain": "Google sign-in isn't enabled for this website address yet. Please use email sign-in while we fix it.",
  "auth/operation-not-allowed": "Google sign-in isn't enabled yet. Please use email sign-in while we fix it.",
  "auth/invalid-api-key": "Sign-in is temporarily unavailable because the website's authentication settings need updating.",
  "auth/network-request-failed": "Couldn't reach the sign-in service. Check your connection and try again.",
  "auth/cancelled-popup-request": "Another sign-in window is already open. Please finish signing in there.",
  "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
};

export default function AuthForm({ mode }) {
  const signup = mode === "signup";
  const router = useRouter();
  const params = useSearchParams();
  const requestedNext = params.get("next") || "/dashboard";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.includes("\\") ? requestedNext : "/dashboard";
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, router, next]);

  const fail = (e) => {
    setError(MESSAGES[e?.code] || `Sign-in couldn't complete${e?.code?.startsWith("auth/") ? ` (${e.code})` : ""}. Please try again.`);
    setBusy(false);
  };

  async function submit(e) {
    e.preventDefault();
    setError(""); setInfo("");
    if (signup && password.length < 8) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    try {
      if (signup) {
        const cred = await createUserWithEmailAndPassword(clientAuth(), email.trim(), password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(clientAuth(), email.trim(), password);
      }
    } catch (err) { fail(err); }
  }

  async function google() {
    setError(""); setInfo(""); setBusy(true);
    try { await signInWithPopup(clientAuth(), new GoogleAuthProvider()); } catch (err) { fail(err); }
  }

  async function reset() {
    setError(""); setInfo("");
    if (!email.trim()) return setError("Enter your email first, then tap reset.");
    try {
      await sendPasswordResetEmail(clientAuth(), email.trim());
      setInfo("Check your inbox for a link to reset your password.");
    } catch (err) { fail(err); }
  }

  return (
    <div className="auth wrap">
      <form className="auth-card" onSubmit={submit} noValidate>
        <Link href="/" className="logo brand-logo auth-brand" aria-label="GuestSetGo home"><img src="/brand/guestsetgo-logo.png" alt="GuestSetGo" width={2172} height={724} /></Link>
        <h1 style={{ fontSize: "1.7rem" }}>{signup ? "Create your host account" : "Sign in"}</h1>
        <p className="muted">{signup ? "Set up your first guidebook in a few minutes." : "Manage your guidebooks, check-outs and billing."}</p>
        <button type="button" className="btn" onClick={google} disabled={busy}>Continue with Google</button>
        <div className="divider">or with email</div>
        {signup && (
          <label className="field" htmlFor="name"><span>Your name</span>
            <input id="name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="field" htmlFor="email"><span>Email</span>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field" htmlFor="password"><span>Password</span>
          <input id="password" type="password" autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        {info && <p className="notice">{info}</p>}
        <button className="btn solid" type="submit" disabled={busy}>{busy ? "Please wait…" : signup ? "Create account" : "Sign in"}</button>
        {signup
          ? <p className="small muted">Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></p>
          : <p className="small muted"><button type="button" className="btn small" onClick={reset}>Reset password</button> &nbsp;New here? <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link></p>}
      </form>
    </div>
  );
}
