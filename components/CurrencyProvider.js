"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { normaliseCurrency } from "@/lib/currency.mjs";

const CurrencyContext = createContext({ currency: "GBP", setCurrency: () => {}, ready: false });
const STORAGE_KEY = "guestsetgo-preferred-currency";

export function CurrencyProvider({ children }) {
  const [currency, updateCurrency] = useState("GBP");
  const [ready, setReady] = useState(false);
  const manuallyChosen = useRef(false);
  useEffect(() => {
    let active = true;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "GBP" || saved === "USD") {
        updateCurrency(saved);
        setReady(true);
        return () => { active = false; };
      }
    } catch (_) { /* Private browsing can disable storage. */ }

    fetch("/api/visitor-currency", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (active && !manuallyChosen.current && result?.currency) updateCurrency(normaliseCurrency(result.currency));
      })
      .catch(() => {})
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  function setCurrency(next) {
    manuallyChosen.current = true;
    setReady(true);
    const chosen = normaliseCurrency(next);
    updateCurrency(chosen);
    try { window.localStorage.setItem(STORAGE_KEY, chosen); } catch (_) {}
  }
  return <CurrencyContext.Provider value={{ currency, setCurrency, ready }}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

export function CurrencySelect({ className = "" }) {
  const { currency, setCurrency } = useCurrency();
  return <label className={`currency-choice ${className}`}>
    <span className="visually-hidden">Display and checkout currency</span>
    <select aria-label="Currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
      <option value="GBP">GBP £</option>
      <option value="USD">USD $</option>
    </select>
  </label>;
}
