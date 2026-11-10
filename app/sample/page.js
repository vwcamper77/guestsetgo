import Link from "next/link";
import Guidebook from "@/components/Guidebook";
import { documentFor, publicPageMetadata } from "@/lib/seo.mjs";
import { sampleProperty } from "@/lib/sample-guide";

export const metadata = publicPageMetadata(documentFor("/sample"));

export default function SampleGuide() {
  return <><aside className="sample-banner" style={{ padding: "12px 20px", textAlign: "center", background: "#e1f0ec", color: "#10233a" }}>Fictional sample · read-only · no messages are sent. <Link href="/">Back to GuestSetGo</Link> · <Link href="/blog">Hosting journal</Link> · <Link href="/vs">Compare guides</Link></aside><Guidebook property={sampleProperty} preview /></>;
}
