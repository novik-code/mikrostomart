#!/usr/bin/env node
/**
 * Generates per-page OpenGraph share images at 1200×630 (Facebook/LinkedIn/X
 * preferred). One template SVG, swapped title per service page.
 *
 * Why: pre-J-3 every page shared the same global /opengraph-image.png. That
 * makes every social card look identical regardless of which service the user
 * is sharing — wasted real estate for a brand that wants premium positioning.
 *
 * Output: public/og-{slug}.webp (+ .png fallback for stragglers).
 *
 * Layout idea (mirrors brand voice — gold accents on deep teal):
 *   ┌──────────────────────────────────────┐
 *   │  MIKROSTOMART                  [gold] │
 *   │                                      │
 *   │  Implanty zębów                      │  ← per-page title
 *   │                                      │
 *   │  Mikroskopowa stomatologia · Opole   │
 *   │  mikrostomart.pl                      │
 *   └──────────────────────────────────────┘
 *
 * Per-page titles intentionally PL (only PL pages get unique OGs; foreign
 * locales fall back to the global default until we localize). Adding locale
 * variants is a one-line loop change.
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DIR = join(__dirname, '..', 'public');

const COLORS = {
    bgStart: '#0d4f54',  // deep teal, dental/medical
    bgEnd: '#062a2d',    // darker teal
    gold: '#d4af37',     // premium accent (used in UI for date badges)
    white: '#ffffff',
    muted: '#cfd8d9',
};

// Each entry produces /public/og-<slug>.webp at 1200×630.
const OG_PAGES = [
    { slug: 'home', title: 'Mikroskopowa\nStomatologia Artystyczna', subtitle: 'Implanty · Endodoncja · Estetyka · Laser · Opole' },
    { slug: 'implantologia', title: 'Implanty zębów', subtitle: 'Cyfrowe planowanie · All-on-4 w jeden dzień · Opole' },
    { slug: 'leczenie-kanalowe', title: 'Leczenie kanałowe\npod mikroskopem', subtitle: 'Mikroskop ZEISS · CBCT · Ratujemy zęby najgorzej rokujące' },
    { slug: 'stomatologia-estetyczna', title: 'Stomatologia\nestetyczna', subtitle: 'Licówki · DSD · Bonding · Wybielanie · Opole' },
    { slug: 'ortodoncja', title: 'Ortodoncja', subtitle: 'Nakładkowa Invisalign-class · Stała · Dorośli + dzieci' },
    { slug: 'chirurgia', title: 'Chirurgia\nstomatologiczna', subtitle: 'Implanty · Resekcje · Augmentacja · Laser Fotona' },
    { slug: 'protetyka', title: 'Protetyka', subtitle: 'Korony · Mosty · Protezy · Pełna rehabilitacja zwarciowa' },
];

function escapeXml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function buildSvg({ title, subtitle }) {
    const lines = title.split('\n');
    // Title block vertically centered around y=345; each line ~88 px tall.
    const startY = 320 - ((lines.length - 1) * 44);
    const titleSpans = lines
        .map((line, i) => `<text x="80" y="${startY + i * 88}" font-family="Georgia, 'Times New Roman', serif" font-size="76" fill="${COLORS.white}" font-weight="700">${escapeXml(line)}</text>`)
        .join('\n  ');

    return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${COLORS.bgStart}"/>
      <stop offset="100%" stop-color="${COLORS.bgEnd}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <!-- Top: brand wordmark + gold rule -->
  <text x="80" y="100" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="${COLORS.gold}" letter-spacing="6" font-weight="600">MIKROSTOMART</text>
  <line x1="80" y1="130" x2="220" y2="130" stroke="${COLORS.gold}" stroke-width="3"/>
  <!-- Title -->
  ${titleSpans}
  <!-- Subtitle -->
  <text x="80" y="510" font-family="Georgia, 'Times New Roman', serif" font-size="26" fill="${COLORS.muted}">${escapeXml(subtitle)}</text>
  <!-- Bottom: domain -->
  <text x="80" y="565" font-family="Georgia, 'Times New Roman', serif" font-size="24" fill="${COLORS.gold}" font-weight="600">mikrostomart.pl</text>
</svg>`;
}

console.log(`Generating ${OG_PAGES.length} OG images @ 1200×630…`);

for (const page of OG_PAGES) {
    const svg = buildSvg(page);
    const outPath = join(PUBLIC_DIR, `og-${page.slug}.webp`);
    const pngPath = join(PUBLIC_DIR, `og-${page.slug}.png`);
    await sharp(Buffer.from(svg))
        .resize(1200, 630)
        .webp({ quality: 85, effort: 4 })
        .toFile(outPath);
    // PNG fallback for legacy social scrapers without WebP support
    await sharp(Buffer.from(svg))
        .resize(1200, 630)
        .png({ compressionLevel: 9 })
        .toFile(pngPath);
    console.log(`  ✓ og-${page.slug}.{webp,png}`);
}

console.log(`\nDone. ${OG_PAGES.length} OG images written to public/.`);
