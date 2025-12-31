const { Jimp } = require('jimp');

async function processImage(inputPath, outputPath) {
    try {
        console.log(`Reading ${inputPath}...`);
        const image = await Jimp.read(inputPath);

        console.log(`Processing...`);
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const red = this.bitmap.data[idx + 0];
            const green = this.bitmap.data[idx + 1];
            const blue = this.bitmap.data[idx + 2];

            // Simple "Black Key" removal
            if (red < 30 && green < 30 && blue < 30) {
                this.bitmap.data[idx + 3] = 0; // Set alpha to 0
            }
        });

        await new Promise((resolve, reject) => {
            image.write(outputPath, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log(`Saved to ${outputPath}`);
    } catch (e) {
        console.error(`Error processing ${inputPath}:`, e);
    }
}

(async () => {
    await processImage('public/raw_template_hollywood.png', 'public/template_hollywood.png');
    await processImage('public/raw_template_natural.png', 'public/template_natural.png');
    // Create copies for soft/strong if we don't have them yet, or just map them in UI
    // frontend uses: template_${style}.png
    // We only have hollywood and natural.
    // Let's copy natural to soft and hollywood to strong for now as placeholders.
    await processImage('public/raw_template_natural.png', 'public/template_soft.png');
    await processImage('public/raw_template_hollywood.png', 'public/template_strong.png');
})();
