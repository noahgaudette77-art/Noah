// Draws the session summary as a 1080x1350 PNG (portrait, fits a phone share sheet).
export interface CardData {
  title: string;
  date: string;
  dayLine: string;
  stats: { label: string; value: string; unit?: string }[];
  prs: string[];
  streak: number;
}

const DISPLAY = '"Big Shoulders Display Variable", "Arial Narrow", Impact, sans-serif';
const SANS = '"Instrument Sans Variable", system-ui, sans-serif';

export async function drawSummaryCard(d: CardData): Promise<Blob> {
  await Promise.all([document.fonts.load(`800 120px ${DISPLAY}`), document.fonts.load(`600 32px ${SANS}`)]).catch(() => undefined);
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  // background: carbon with a warm key light and a cool rim
  g.fillStyle = '#070708'; g.fillRect(0, 0, W, H);
  const key = g.createRadialGradient(180, 120, 0, 180, 120, 900);
  key.addColorStop(0, 'rgba(255,110,50,0.34)'); key.addColorStop(1, 'rgba(255,110,50,0)');
  g.fillStyle = key; g.fillRect(0, 0, W, H);
  const rim = g.createRadialGradient(W, H, 0, W, H, 900);
  rim.addColorStop(0, 'rgba(110,160,255,0.22)'); rim.addColorStop(1, 'rgba(110,160,255,0)');
  g.fillStyle = rim; g.fillRect(0, 0, W, H);
  // film grain
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 14; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  g.putImageData(img, 0, 0);

  const pad = 84;
  // mark + wordmark
  const mark = g.createLinearGradient(pad, pad, pad, pad + 56);
  mark.addColorStop(0, '#FF7A3A'); mark.addColorStop(1, '#E8480F');
  g.fillStyle = mark; roundRect(g, pad, pad, 56, 56, 16); g.fill();
  g.fillStyle = '#170700';
  roundRect(g, pad + 12, pad + 14, 32, 7, 3.5); g.fill();
  roundRect(g, pad + 24.5, pad + 24.5, 7, 20, 3.5); g.fill();
  g.fillStyle = '#F3EFE8'; g.font = `800 52px ${DISPLAY}`; g.textBaseline = 'middle';
  g.fillText('TEMPO', pad + 76, pad + 30);
  g.fillStyle = '#B8B3AA'; g.font = `600 26px ${SANS}`; g.textAlign = 'right';
  g.fillText(d.date.toUpperCase(), W - pad, pad + 30);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';

  g.fillStyle = '#8C877F'; g.font = `600 28px ${SANS}`;
  g.fillText(d.dayLine.toUpperCase(), pad, 330);
  g.fillStyle = '#F3EFE8'; g.font = `850 230px ${DISPLAY}`;
  g.fillText(d.title.toUpperCase(), pad - 6, 540, W - pad * 2);
  g.fillStyle = '#FF5B1F'; g.fillRect(pad, 580, 120, 8);

  // stats grid
  const colW = (W - pad * 2) / 2;
  d.stats.slice(0, 4).forEach((s, i) => {
    const x = pad + (i % 2) * colW, y = 700 + Math.floor(i / 2) * 210;
    g.fillStyle = '#8C877F'; g.font = `600 26px ${SANS}`;
    g.fillText(s.label.toUpperCase(), x, y);
    g.fillStyle = '#F3EFE8'; g.font = `800 140px ${DISPLAY}`;
    g.fillText(s.value, x - 2, y + 130);
    if (s.unit) {
      const w = g.measureText(s.value).width;
      g.fillStyle = '#B8B3AA'; g.font = `600 34px ${SANS}`;
      g.fillText(s.unit, x + w + 12, y + 128);
    }
  });
  // PRs + streak
  let y = 1150;
  g.font = `600 32px ${SANS}`;
  for (const p of d.prs.slice(0, 2)) {
    g.fillStyle = '#FF5B1F'; g.beginPath(); g.arc(pad + 10, y - 11, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#F3EFE8'; g.fillText(p, pad + 34, y);
    y += 52;
  }
  g.fillStyle = '#B8B3AA'; g.font = `600 28px ${SANS}`;
  g.fillText(d.streak > 0 ? `${d.streak}-day streak` : '12-month program', pad, H - pad + 10);
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** Share via the system sheet when files can be shared, otherwise download. */
export async function shareOrDownload(blob: Blob, name: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], name, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try { await nav.share({ files: [file], title: 'Tempo session' }); return 'shared'; } catch { /* cancelled: fall through to download */ }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  return 'downloaded';
}
