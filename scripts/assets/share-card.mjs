#!/usr/bin/env node
// Renders public/share/title-card.png (1200x630): the Open Graph / Twitter card for the paper version.
// Scene: the closed bottle-green logbook on the desk, lit from the upper left, foil name on the cover,
// a gridded paper label with the one-line summary, a pencil and a coffee ring for company.
// Colours come from src/styles/tokens.css. IBM Plex Sans is read from node_modules/@fontsource/ibm-plex-sans
// and embedded as data URIs, so the page needs no file:// access.
//
// Usage:  node scripts/assets/share-card.mjs            -> public/share/title-card.png
//         node scripts/assets/share-card.mjs --html out.html   also writes the page for inspection
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = resolve(ROOT, 'public', 'share');
const OUT_PNG = resolve(OUT_DIR, 'title-card.png');
const FONT_DIR = resolve(ROOT, 'node_modules', '@fontsource', 'ibm-plex-sans', 'files');
const WIDTH = 1200;
const HEIGHT = 630;

const NAME = 'Zain Ali';
const LINE_1 = 'Software, AI and markets';
const LINE_2_HIGHLIGHT = '1st of 56 teams';
const LINE_2_REST = ', AR26 HackXelerator';

const T = {
  desk: '#1B1A18',
  deskText: '#ECEAE4',
  deskTextQuiet: '#A3A79F',
  cover: '#23402F',
  foil: '#C9B26A',
  paper: '#E6ECDF',
  grid: '#BFCDB8',
  ink: '#1E2633',
  inkQuiet: '#4E5A57',
  highlighter: '#F3E25A',
};

const fontFace = (weight) => {
  const file = resolve(FONT_DIR, `ibm-plex-sans-latin-${weight}-normal.woff2`);
  const b64 = readFileSync(file).toString('base64');
  return `@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:${weight};` +
    `src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
};

// Fine monochrome noise, used at low opacity for leather grain on the cover.
const NOISE_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>` +
  `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>` +
  `<feColorMatrix type='saturate' values='0'/></filter>` +
  `<rect width='240' height='240' filter='url(#n)'/></svg>`,
);

const css = `
${[400, 500, 600, 700].map(fontFace).join('\n')}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: ${T.desk};
  font-family: 'IBM Plex Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }

/* Desk: dark oak, a warm lamp from the upper left, faint grain, vignette. */
.desk { position: absolute; inset: 0; background:
  radial-gradient(760px 520px at 14% 6%, rgba(255, 214, 150, 0.20), rgba(255, 214, 150, 0) 62%),
  linear-gradient(118deg, rgba(255, 236, 200, 0.05) 0%, rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0.22) 100%),
  ${T.desk}; }
.grain { position: absolute; inset: 0; opacity: 0.55; background:
  repeating-linear-gradient(177deg, rgba(255, 255, 255, 0.022) 0 2px, rgba(0, 0, 0, 0.03) 2px 9px,
    rgba(255, 255, 255, 0.012) 9px 16px, rgba(0, 0, 0, 0.02) 16px 23px); }
.vignette { position: absolute; inset: 0; background:
  radial-gradient(1100px 640px at 48% 50%, rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0.5) 100%); }

/* The closed logbook. */
.book { position: absolute; left: 262px; top: 42px; width: 430px; height: 546px;
  transform: rotate(-3.2deg); transform-origin: 50% 50%; }
.pages { position: absolute; left: 12px; top: 8px; width: 430px; height: 546px; border-radius: 2px 7px 7px 2px;
  background: repeating-linear-gradient(90deg, #E9EDE3 0 2px, #C7CEC0 2px 3px);
  box-shadow: 0 26px 48px rgba(0, 0, 0, 0.62), 0 6px 14px rgba(0, 0, 0, 0.45); }
.pages::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 9px; border-radius: 0 0 7px 2px;
  background: repeating-linear-gradient(0deg, #C7CEC0 0 1px, #E9EDE3 1px 3px); }
.cover { position: absolute; inset: 0; border-radius: 3px 10px 10px 3px; overflow: hidden;
  background:
    linear-gradient(104deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0.02) 34%, rgba(0, 0, 0, 0) 55%, rgba(0, 0, 0, 0.16) 100%),
    ${T.cover};
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.10), inset 0 -1px 0 rgba(0, 0, 0, 0.35); }
.cover::after { content: ''; position: absolute; inset: 0; opacity: 0.16; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,${NOISE_SVG}"); }
.spine { position: absolute; left: 0; top: 0; bottom: 0; width: 36px; border-radius: 3px 0 0 3px;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.42) 0%, rgba(0, 0, 0, 0.12) 55%, rgba(255, 255, 255, 0.07) 86%, rgba(0, 0, 0, 0.30) 100%); }
.hinge { position: absolute; left: 36px; top: 0; bottom: 0; width: 2px;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.45), rgba(255, 255, 255, 0.08)); }
/* Blind-embossed foil frame. */
.frame { position: absolute; left: 60px; top: 26px; right: 24px; bottom: 26px; border-radius: 4px;
  border: 1.5px solid rgba(201, 178, 106, 0.62);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.18); }
.frame::after { content: ''; position: absolute; inset: 5px; border-radius: 2px; border: 1px solid rgba(201, 178, 106, 0.28); }

.kicker { position: absolute; left: 60px; right: 24px; top: 82px; text-align: center;
  font-size: 12px; font-weight: 500; letter-spacing: 0.36em; text-indent: 0.36em; color: ${T.foil}; opacity: 0.85; }
.name { position: absolute; left: 60px; right: 24px; top: 104px; text-align: center;
  font-size: 50px; line-height: 60px; font-weight: 600; letter-spacing: 0.02em;
  background: linear-gradient(170deg, #EBDDAA 0%, ${T.foil} 38%, #A88F45 62%, #E2D29A 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.45)); }
.rule { position: absolute; left: calc(50% + 18px); top: 180px; width: 54px; height: 2px; transform: translateX(-50%);
  background: linear-gradient(90deg, rgba(201, 178, 106, 0.2), ${T.foil} 30% 70%, rgba(201, 178, 106, 0.2)); }
.volume { position: absolute; right: 76px; bottom: 44px; font-size: 11px; font-weight: 500; letter-spacing: 0.28em;
  color: ${T.foil}; opacity: 0.75; }

/* Paper label, glued on a little crooked, with the paper grid. */
.label { position: absolute; left: 74px; top: 300px; width: 292px; height: 132px; padding: 24px 24px 0;
  transform: rotate(1.4deg); transform-origin: 50% 50%;
  background:
    linear-gradient(rgba(191, 205, 184, 0.55) 1px, transparent 1px) 0 0 / 100% 12px,
    linear-gradient(90deg, rgba(191, 205, 184, 0.55) 1px, transparent 1px) 0 0 / 12px 100%,
    ${T.paper};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25), 0 4px 10px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(30, 38, 51, 0.06); }
.label .l1 { font-size: 19px; line-height: 24px; font-weight: 600; color: ${T.ink}; letter-spacing: -0.005em; }
.label .l2 { margin-top: 10px; font-size: 14px; line-height: 20px; font-weight: 400; color: ${T.inkQuiet}; }
.label .hl { position: relative; color: ${T.ink}; font-weight: 500; }
.label .hl::before { content: ''; position: absolute; left: -3px; right: -2px; top: 2px; bottom: 1px; z-index: -1;
  background: ${T.highlighter}; opacity: 0.85; transform: skewX(-6deg) rotate(-0.6deg); border-radius: 2px; }
.label .hl { z-index: 0; }
.tape { position: absolute; width: 74px; height: 22px; left: -16px; top: -10px; transform: rotate(-9deg);
  background: rgba(255, 255, 255, 0.30); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.10); }
.tape::after { content: ''; position: absolute; inset: 0; opacity: 0.35;
  background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.4) 0 3px, transparent 3px 7px); }

/* Elastic band around the fore-edge. */
.band { position: absolute; right: 44px; top: -6px; bottom: -4px; width: 13px; border-radius: 2px;
  background: linear-gradient(90deg, #0F1A14 0%, #1C2E24 40%, #26392E 55%, #0E1812 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 0, 0, 0.25); }

/* A pencil, lying across the desk. */
.pencil { position: absolute; left: 790px; top: 500px; width: 350px; height: 16px; display: flex; align-items: stretch;
  transform: rotate(-16deg); transform-origin: 0 50%;
  filter: drop-shadow(0 7px 5px rgba(0, 0, 0, 0.55)); }
.pencil .eraser { width: 18px; border-radius: 6px 0 0 6px; background: linear-gradient(180deg, #E0A89C, #C98477 60%, #A96A5E); }
.pencil .ferrule { width: 22px; background: linear-gradient(180deg, #B9B9B9, #EDEDED 40%, #8C8C8C 85%, #B1B1B1);
  box-shadow: inset 2px 0 0 rgba(0, 0, 0, 0.18), inset -2px 0 0 rgba(0, 0, 0, 0.18); }
.pencil .body { flex: 1; background: linear-gradient(180deg, #ECD05A 0%, #E5C44A 45%, #C9A630 70%, #B08F27 100%); }
.pencil .wood { width: 34px; background: linear-gradient(180deg, #E9D2A8, #D9B885 55%, #B8935F);
  clip-path: polygon(0 0, 100% 46%, 100% 54%, 0 100%); }
.pencil .lead { width: 9px; margin-left: -1px; background: linear-gradient(180deg, #4A4A4A, #262626);
  clip-path: polygon(0 36%, 100% 50%, 0 64%); }

/* A coffee ring, dried in. */
.ring { position: absolute; left: 936px; top: 68px; width: 122px; height: 122px; border-radius: 50%;
  border: 7px solid rgba(135, 88, 44, 0.24); filter: blur(0.5px);
  box-shadow: inset 0 0 5px rgba(135, 88, 44, 0.18), 0 0 4px rgba(135, 88, 44, 0.12); }
.ring.second { left: 952px; top: 84px; width: 110px; height: 110px; border-width: 4px;
  border-color: rgba(135, 88, 44, 0.18) rgba(135, 88, 44, 0.18) transparent transparent; transform: rotate(-30deg); }
`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${NAME} - share card</title><style>${css}</style></head>
<body>
  <div class="desk"></div>
  <div class="grain"></div>
  <div class="ring"></div>
  <div class="ring second"></div>
  <div class="pencil">
    <div class="eraser"></div><div class="ferrule"></div><div class="body"></div><div class="wood"></div><div class="lead"></div>
  </div>
  <div class="book">
    <div class="pages"></div>
    <div class="cover">
      <div class="spine"></div><div class="hinge"></div>
      <div class="frame"></div>
      <div class="kicker">LOGBOOK</div>
      <div class="name">${NAME}</div>
      <div class="rule"></div>
      <div class="label">
        <div class="tape"></div>
        <div class="l1">${LINE_1}</div>
        <div class="l2"><span class="hl">${LINE_2_HIGHLIGHT}</span>${LINE_2_REST}</div>
      </div>
      <div class="volume">VOL. I</div>
    </div>
    <div class="band"></div>
  </div>
  <div class="vignette"></div>
</body></html>`;

const htmlFlag = process.argv.indexOf('--html');
if (htmlFlag !== -1 && process.argv[htmlFlag + 1]) {
  writeFileSync(resolve(process.argv[htmlFlag + 1]), html);
}

// Prefer Playwright's bundled Chromium; fall back to the system Google Chrome, or a path in SHARE_CARD_BROWSER.
const launchBrowser = async () => {
  const attempts = [
    { name: 'bundled chromium', options: {} },
    { name: 'system Google Chrome', options: { channel: 'chrome' } },
  ];
  if (process.env.SHARE_CARD_BROWSER) {
    attempts.unshift({ name: process.env.SHARE_CARD_BROWSER, options: { executablePath: process.env.SHARE_CARD_BROWSER } });
  }
  const errors = [];
  for (const attempt of attempts) {
    try {
      return await chromium.launch(attempt.options);
    } catch (error) {
      errors.push(`${attempt.name}: ${String(error.message).split('\n')[0]}`);
    }
  }
  throw new Error(`No browser could be launched (try "npx playwright install chromium").\n${errors.join('\n')}`);
};

mkdirSync(OUT_DIR, { recursive: true });
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const fontOk = await page.evaluate(() => document.fonts.check("600 50px 'IBM Plex Sans'"));
  if (!fontOk) throw new Error('IBM Plex Sans did not load');
  await page.screenshot({ path: OUT_PNG, type: 'png', clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
} finally {
  await browser.close();
}
console.log(`wrote ${OUT_PNG}`);
