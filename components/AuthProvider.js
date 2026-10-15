"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking

  useEffect(() => {
    try {
      return onAuthStateChanged(clientAuth(), (u) => setUser(u || null));
    } catch (err) {
      console.error("Firebase isn't configured: check the NEXT_PUBLIC_FIREBASE_* variables.", err);
      setUser(null);
    }
  }, []);

  /** fetch() to our API with the signed-in user's token attached. */
  const api = useCallback(async (path, { method = "GET", body } = {}) => {
    const u = clientAuth().currentUser;
    const headers = { "Content-Type": "application/json" };
    if (u) headers.Authorization = `Bearer ${await u.getIdToken()}`;
    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }, []);

  const logout = useCallback(() => signOut(clientAuth()), []);

  return <Ctx.Provider value={{ user, api, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
