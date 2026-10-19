// Generates the QR codes for the closing slides from speaker/info.txt and the public site URL.
import QRCode from 'qrcode';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

export const SITE_URL = 'https://nasiriubat.github.io/agent-presentation/';

const info = readFileSync('speaker/info.txt', 'utf8');
const find = (re) => {
  const m = info.match(re);
  if (!m) throw new Error(`speaker/info.txt: no match for ${re}`);
  return m[1].trim();
};

const codes = {
  'nasir-linkedin': find(/Nasir[^\n]*Linkedin:\s*(\S+)/i),
  'nasir-portfolio': find(/Nasir portfolio:\s*(\S+)/i),
  'aidul-linkedin': find(/Aidul[^\n]*linkedin:\s*(\S+)/i),
  'aidul-portfolio': find(/Aidul portfolio:\s*(\S+)/i),
  site: SITE_URL,
};

mkdirSync('public/qr', { recursive: true });
for (const [name, url] of Object.entries(codes)) {
  const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#0b1020', light: '#ffffff' } });
  writeFileSync(`public/qr/${name}.svg`, svg);
  console.log(`${name}.svg → ${url}`);
}
