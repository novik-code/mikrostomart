const sharp = require('sharp');
const path = require('path');

async function createGoldBorderIcon() {
    try {
        const logoPath = path.join(__dirname, '../public/logo-transparent.png');
        const icon512Path = path.join(__dirname, '../public/icon-512x512.png');
        const icon192Path = path.join(__dirname, '../public/icon-192x192.png');
        const faviconPath = path.join(__dirname, '../public/icon.png'); // for metadata
        const ogImagePath = path.join(__dirname, '../public/opengraph-image.png');

        console.log('Reading logo...');
        const logo = sharp(logoPath);
        const metadata = await logo.metadata();

        // Strategy: Crop the left-most square (assuming icon is there) 
        const size = Math.min(metadata.width, metadata.height);

        // Reduce width to avoid capturing the start of the text "M" (which is likely gold/yellow)
        const cropWidth = Math.floor(size * 0.85);
        console.log(`Cropping logo to ${cropWidth}x${size} from left...`);

        const toothIcon = logo.clone().extract({ left: 0, top: 0, width: cropWidth, height: size }); // Narrower crop

        // Create Gold Border SVG
        const width = 512;
        const borderWidth = 15;
        const goldColor = "#D4AF37"; // Metallic Gold
        const borderRadius = 80;

        const borderSvg = Buffer.from(`
            <svg width="${width}" height="${width}">
                <rect x="${borderWidth / 2}" y="${borderWidth / 2}" width="${width - borderWidth}" height="${width - borderWidth}" rx="${borderRadius}" ry="${borderRadius}" 
                      fill="none" stroke="${goldColor}" stroke-width="${borderWidth}" />
            </svg>
        `);

        // Create Base: Black Background
        // Composite: 
        // 1. Black Background
        // 2. Tooth Icon (resized to ~60% of 512)
        // 3. Gold Border

        const toothBuffer = await toothIcon
            .resize(Math.floor(width * 0.6)) // 60% size
            .toBuffer();

        console.log('Compositing 512x512 icon...');

        const finalImage = sharp({
            create: {
                width: width,
                height: width,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 1 } // Black
            }
        })
            .composite([
                { input: toothBuffer, gravity: 'center' },
                { input: borderSvg, gravity: 'center' }
            ]);

        // Save 512
        // We need to write to buffer first to reuse for resizing, or just use toFile and then reload?
        // Sharp instances are streams. 
        // Let's finish the 512 first.
        const icon512Buffer = await finalImage.png().toBuffer();
        await sharp(icon512Buffer).toFile(icon512Path);
        console.log('Saved 512x512');

        // Save 192 (Resize from buffer)
        await sharp(icon512Buffer).resize(192, 192).toFile(icon192Path);
        console.log('Saved 192x192');

        // Save Favicon (32x32)
        await sharp(icon512Buffer).resize(32, 32).toFile(faviconPath);
        console.log('Saved favicon (icon.png)');

        // Create Open Graph (1200x630) - Black BG + Centered Icon
        console.log('Creating Open Graph Image...');

        // We can reuse the 512 icon, just place it on a 1200x630 black canvas
        const ogIconBuffer = await finalImage.toBuffer(); // The 512 one

        await sharp({
            create: {
                width: 1200,
                height: 630,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 1 }
            }
        })
            .composite([
                { input: ogIconBuffer, gravity: 'center' }
            ])
            .toFile(ogImagePath);

        console.log('Saved opengraph-image.png');

    } catch (e) {
        console.error("Error creating icons:", e);
    }
}

createGoldBorderIcon();
