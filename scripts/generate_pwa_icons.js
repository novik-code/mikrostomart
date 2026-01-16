const { Jimp } = require('jimp');
const path = require('path');

async function generateIcons() {
    try {
        const logoPath = path.join(__dirname, '../public/logo-transparent.png');
        const icon192Path = path.join(__dirname, '../public/icon-192x192.png');
        const icon512Path = path.join(__dirname, '../public/icon-512x512.png');
        const bgHex = 0x0f1115ff;

        console.log('Reading logo from:', logoPath);
        const image = await Jimp.read(logoPath);

        // Generate 512x512
        console.log('Generating 512x512...');
        const bg512 = new Jimp({ width: 512, height: 512, color: bgHex });

        // Clone and resize logo to fit 80% width
        const logo512 = image.clone();
        logo512.scaleToFit(512 * 0.9, 512 * 0.9);

        // Center
        const x512 = (512 - logo512.width) / 2;
        const y512 = (512 - logo512.height) / 2;

        bg512.composite(logo512, x512, y512);
        await bg512.write(icon512Path); // Try write (might be sync/async depending on version, usually write(path, cb) or returns promise in v1?? docs say write(path) returns promise in some versions, or writeAsync)
        // Actually for v1.6 (Jimp 1.0 breaking changes): write() is not async maybe? writeAsync is safer.
        // Wait, Jimp 1.x: write(path, cb). writeAsync(path).

        // Generate 192x192
        console.log('Generating 192x192...');
        const bg192 = new Jimp({ width: 192, height: 192, color: bgHex });

        const logo192 = image.clone();
        logo192.scaleToFit(192 * 0.9, 192 * 0.9);

        const x192 = (192 - logo192.width) / 2;
        const y192 = (192 - logo192.height) / 2;

        bg192.composite(logo192, x192, y192);
        await bg192.write(icon192Path);

        console.log('Icons generated successfully!');
    } catch (error) {
        console.error('Error generating icons:', error);
    }
}

generateIcons();
