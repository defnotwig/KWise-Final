/**
 * Simple Background Removal Test
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

async function simpleTest() {
    console.log('🧪 SIMPLE BACKGROUND REMOVAL TEST\n');

    // Find a test image
    const testDir = path.join(__dirname, '..', 'public', 'assets', 'parts', 'GPU');
    
    try {
        const files = await fs.readdir(testDir);
        const testImage = files.find(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
        
        if (!testImage) {
            console.log('❌ No test images found in GPU directory');
            return;
        }

        const inputPath = path.join(testDir, testImage);
        const outputPath = path.join(testDir, 'test-output-transparent.png');

        console.log(`📸 Input: ${testImage}`);
        console.log(`📤 Output: test-output-transparent.png\n`);

        // Load image
        const { data, info } = await sharp(inputPath)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        console.log(`📊 Image: ${info.width}x${info.height}, ${info.channels} channels`);

        // Process pixels
        const pixels = new Uint8Array(data);
        const threshold = 240;
        const tolerance = 10;
        let transparentCount = 0;

        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const brightness = (r + g + b) / 3;

            const isBackground = brightness > threshold && 
                                Math.abs(r - g) < tolerance &&
                                Math.abs(g - b) < tolerance &&
                                Math.abs(r - b) < tolerance;

            if (isBackground) {
                pixels[i + 3] = 0; // Transparent
                transparentCount++;
            } else {
                pixels[i + 3] = 255; // Opaque
            }
        }

        const totalPixels = pixels.length / 4;
        const transparentPercent = ((transparentCount / totalPixels) * 100).toFixed(1);

        console.log(`🎨 Processing: ${transparentCount.toLocaleString()} of ${totalPixels.toLocaleString()} pixels (${transparentPercent}%) made transparent\n`);

        // Save result
        await sharp(pixels, {
            raw: {
                width: info.width,
                height: info.height,
                channels: 4
            }
        })
        .png({ compressionLevel: 9 })
        .toFile(outputPath);

        console.log(`✅ Success! Output saved to: ${outputPath}`);
        console.log(`📝 Check the file to verify background removal worked`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

simpleTest();
