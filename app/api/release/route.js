import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({ release: process.env.NEXT_PUBLIC_RELEASE_ID || "local" }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
