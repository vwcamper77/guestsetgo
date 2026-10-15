import { notFound } from "next/navigation";
import Guidebook from "@/components/Guidebook";
import { plain } from "@/lib/firebase-admin";
import { liveProperty, ratingsFor } from "@/lib/guest";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const prop = await liveProperty(params.slug).catch(() => null);
  return {
    title: prop ? `${prop.data.name} guidebook` : "Guidebook",
    // Guidebooks hold Wi-Fi passwords and entry steps, so keep them out of search engines.
    robots: { index: false, follow: false },
  };
}

export default async function GuestPage({ params }) {
  const prop = await liveProperty(params.slug);
  if (!prop) notFound();
  const ratings = await ratingsFor(prop.ref);
  const { ownerUid, ...publicData } = prop.data;
  return <Guidebook property={plain({ id: prop.id, ...publicData })} ratings={ratings} />;
}
