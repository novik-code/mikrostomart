// One-shot script: resize Marcin/Ela portrait JPGs (~7.5MB) to WebP (~250-400KB)
// for /o-nas page. Run from project root: `node scripts/resize-portraits.js`.
//
// Source files are kept as JPG fallback. New WebP files are generated next to
// originals; update <Image src=...> in /o-nas/page.tsx to point at the .webp variants.

const sharp = require('sharp');
const fs = require('fs');

const inputs = [
    { src: 'public/marcin-final.jpg', dst: 'public/marcin-final.webp' },
    { src: 'public/ela-final.jpg', dst: 'public/ela-final.webp' },
];

async function run() {
    for (const { src, dst } of inputs) {
        try {
            const metadata = await sharp(src).metadata();
            const srcStats = fs.statSync(src);
            console.log(`Source ${src}: ${metadata.width}x${metadata.height}, ${(srcStats.size / 1024 / 1024).toFixed(1)}MB`);
            await sharp(src)
                .rotate()
                .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(dst);
            const stats = fs.statSync(dst);
            console.log(`Output ${dst}: ${(stats.size / 1024).toFixed(0)}KB (${((stats.size / srcStats.size) * 100).toFixed(1)}% of source)`);
        } catch (e) {
            console.error(`Error on ${src}:`, e.message);
        }
    }
}

run();
