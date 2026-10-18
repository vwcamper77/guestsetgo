import { NextResponse } from "next/server";

// Vercel provides the visitor's country without requesting browser location permissions.
// A saved manual currency preference on the client always takes precedence.
export const dynamic = "force-dynamic";

export function suggestedCurrency(country, acceptLanguage = "") {
  if (country === "US") return "USD";
  if (country) return "GBP";
  const preferredLocale = acceptLanguage.split(",")[0]?.split(";")[0]?.trim().toLowerCase();
  return preferredLocale === "en-us" ? "USD" : "GBP";
}

export async function GET(request) {
  const country = request.headers.get("x-vercel-ip-country");
  const currency = suggestedCurrency(country, request.headers.get("accept-language") || "");
  return NextResponse.json({ currency }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
