import { shareCard } from '@/lib/share-card';
export async function GET(request) {
  const query = new URL(request.url).searchParams;
  const response = await shareCard({ square: query.get('format') === 'instagram', title: 'Impress your guests. Make the next stay an easy yes.' });
  response.headers.set('Content-Disposition', `attachment; filename="guestsetgo-${query.get('format') === 'instagram' ? 'instagram' : 'facebook'}.png"`);
  return response;
}
