// Optimize public/interior/*.jpeg → WebP for schema.image and InteriorCollage
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dir = 'public/interior';
const inputs = fs.readdirSync(dir).filter(f => f.endsWith('.jpeg'));

async function run() {
    for (const file of inputs) {
        const src = path.join(dir, file);
        const dst = path.join(dir, file.replace('.jpeg', '.webp'));
        try {
            const srcStats = fs.statSync(src);
            await sharp(src)
                .rotate()
                .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 82 })
                .toFile(dst);
            const dstStats = fs.statSync(dst);
            console.log(`${file} ${(srcStats.size/1024/1024).toFixed(1)}MB → ${(dstStats.size/1024).toFixed(0)}KB (${((dstStats.size/srcStats.size)*100).toFixed(1)}%)`);
        } catch (e) {
            console.error(`Error on ${file}:`, e.message);
        }
    }
}
run();
