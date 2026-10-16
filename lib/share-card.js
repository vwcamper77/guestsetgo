import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

async function asset(file, type) {
  return `data:${type};base64,${(await readFile(path.join(process.cwd(), 'public', file))).toString('base64')}`;
}

export async function shareCard({ title = 'Your holiday home. Explained beautifully.', square = false } = {}) {
  const [logo, room, cottage] = await Promise.all([asset('brand/guestsetgo-logo.png', 'image/png'), asset('home/living-room.jpg', 'image/jpeg'), asset('home/cottage.jpg', 'image/jpeg')]);
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', background: '#f6f1e7', color: '#102b35', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', position: 'absolute', right: 0, top: 0, width: square ? '46%' : '48%', height: '100%' }}><img src={room} width={square ? 497 : 576} height={square ? 1080 : 630} style={{ objectFit: 'cover', opacity: .72 }} /></div>
    <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: square ? 60 : 56, top: square ? 66 : 44, width: square ? 490 : 560 }}>
      <img src={logo} width={square ? 330 : 310} height={square ? 110 : 103} style={{ objectFit: 'contain' }} />
      <div style={{ display: 'flex', marginTop: square ? 92 : 38, fontSize: square ? 21 : 18, letterSpacing: 2, color: '#176a60' }}>THE GUEST GUIDE IN THEIR POCKET</div>
      <div style={{ display: 'flex', marginTop: 20, fontSize: square ? (title.length > 80 ? 48 : 64) : (title.length > 80 ? 36 : title.length > 45 ? 48 : 57), fontWeight: 700, lineHeight: 1.08, letterSpacing: -2 }}>{title}</div>
      <div style={{ display: 'flex', marginTop: 26, fontSize: square ? 27 : 24, lineHeight: 1.4, maxWidth: 455 }}>Arrival, Wi-Fi, photo how-tos and local favourites. One simple link.</div>
    </div>
    <div style={{ display: 'flex', position: 'absolute', left: square ? 60 : 56, bottom: square ? 70 : 40, borderRadius: 40, background: '#efc45b', padding: '17px 26px', fontSize: 23 }}>guestsetgo.com</div>
    <div style={{ display: 'flex', position: 'absolute', right: square ? 44 : 68, top: square ? 210 : 42, width: square ? 382 : 344, height: square ? 760 : 650, padding: 12, borderRadius: 48, background: '#182c2d', transform: 'rotate(5deg)', boxShadow: '0 20px 45px #102b3544' }}>
      <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 36, overflow: 'hidden', width: '100%', height: '100%', position: 'relative' }}>
        <div style={{ display: 'flex', height: 24, justifyContent: 'center' }}><div style={{ display: 'flex', width: 126, height: 20, borderRadius: '0 0 16px 16px', background: '#182c2d' }} /></div>
        <div style={{ display: 'flex', padding: '15px 22px 20px' }}><img src={logo} width={190} height={63} style={{ objectFit: 'contain' }} /></div>
        <img src={cottage} width={square ? 358 : 320} height={165} style={{ objectFit: 'cover' }} />
        <div style={{ display: 'flex', flexDirection: 'column', padding: '24px 23px' }}>
          <div style={{ display: 'flex', color: '#176a60', fontSize: 11, letterSpacing: 2 }}>YOUR STAY, MADE SIMPLE</div>
          <div style={{ display: 'flex', fontSize: 25, fontWeight: 700, marginTop: 10 }}>Rosewood Cottage</div>
          <div style={{ display: 'flex', color: '#65777d', fontSize: 15, marginTop: 7, marginBottom: 14 }}>Your guest guide</div>
          {['Welcome', 'Getting here', 'Wi-Fi', 'Heating & hot water', 'Kitchen appliances', 'Local favourites'].map((label, i) => <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e3e9e6', padding: '17px 0', fontSize: 16 }}><span style={{ display: 'flex' }}>{String(i + 1).padStart(2, '0')}　{label}</span><span>›</span></div>)}
        </div>
      </div>
    </div>
  </div>, { width: square ? 1080 : 1200, height: square ? 1080 : 630 });
}
