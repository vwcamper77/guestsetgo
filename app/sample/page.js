import Link from "next/link";
import Guidebook from "@/components/Guidebook";
import { sampleProperty } from "@/lib/sample-guide";

export const metadata = {
  title: "Explore a sample guest walkthrough",
  description: "Try GuestSetGo as a guest: explore a fictional holiday home's heating, kitchen, hot tub and check-out instructions. No account needed.",
  robots: { index: false, follow: true },
};

export default function SampleGuide() {
  return <><aside className="sample-banner" style={{ padding: "12px 20px", textAlign: "center", background: "#e1f0ec", color: "#10233a" }}>Fictional sample · read-only · no messages are sent. <Link href="/">Back to GuestSetGo</Link></aside><Guidebook property={sampleProperty} preview /></>;
}
