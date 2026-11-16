import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { articles } from '@/lib/editorial.mjs';
import { shareCard } from '@/lib/share-card';
export const alt = 'Practical hosting advice from GuestSetGo';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default async function Image({ params }) {
  const article = articles.find(a => a.slug === params.slug);
  if (!article?.image || !/\.jpe?g$/i.test(article.image)) return shareCard({ title: article?.title });
  const bytes = await readFile(path.join(process.cwd(), 'public', 'editorial', article.image));
  const src = `data:image/jpeg;base64,${bytes.toString('base64')}`;
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f1e7' }}><img src={src} width={630} height={630} /></div>, { width: 1200, height: 630 });
}
