import { articles } from '@/lib/editorial.mjs';
import { shareCard } from '@/lib/share-card';
export const alt = 'Practical hosting advice from GuestSetGo';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image({ params }) {
  return shareCard({ title: articles.find(a => a.slug === params.slug)?.title });
}
