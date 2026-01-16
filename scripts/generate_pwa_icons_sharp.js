const sharp = require('sharp');
const path = require('path');

async function generateIcons() {
    try {
        const logoPath = path.join(__dirname, '../public/logo-transparent.png');
        const icon192Path = path.join(__dirname, '../public/icon-192x192.png');
        const icon512Path = path.join(__dirname, '../public/icon-512x512.png');

        console.log('Reading logo from:', logoPath);

        // Background color
        const background = { r: 15, g: 17, b: 21, alpha: 1 }; // #0f1115

        // Generate 512x512
        console.log('Generating 512x512...');
        await sharp(logoPath)
            .resize(400, 400, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .extend({
                top: 56,
                bottom: 56,
                left: 56,
                right: 56,
                background: background
            })
            .toFile(icon512Path);

        // Generate 192x192
        console.log('Generating 192x192...');
        await sharp(logoPath)
            .resize(150, 150, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .extend({
                top: 21,
                bottom: 21,
                left: 21,
                right: 21,
                background: background
            })
            .toFile(icon192Path);

        console.log('Icons generated successfully!');
    } catch (error) {
        console.error('Error generating icons:', error);
    }
}

generateIcons();
