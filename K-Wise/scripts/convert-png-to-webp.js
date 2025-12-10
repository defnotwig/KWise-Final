#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

(async () => {
  const root = path.resolve(__dirname, '..');
  const assetsDir = path.join(root, 'src', 'assets');

  try {
    const entries = await fs.readdir(assetsDir, { withFileTypes: true });
    const pngs = entries.filter((e) => e.isFile() && /\.png$/i.test(e.name));

    if (pngs.length === 0) {
      console.log('No PNG files found in assets directory.');
      return;
    }

    console.log(`Found ${pngs.length} PNG file(s). Converting to WebP...`);

    for (const e of pngs) {
      const pngPath = path.join(assetsDir, e.name);
      const webpPath = pngPath.replace(/\.png$/i, '.webp');

      try {
        await sharp(pngPath).webp({ quality: 85 }).toFile(webpPath);
        const stat = await fs.stat(webpPath);
        if (stat.size > 0) {
          await fs.unlink(pngPath);
          console.log(`Converted and removed: ${e.name} -> ${path.basename(webpPath)}`);
        } else {
          console.warn(`Warning: Output file empty for ${e.name}. Keeping original PNG.`);
        }
      } catch (err) {
        console.error(`Failed to convert ${e.name}: ${err.message}`);
      }
    }

    console.log('Conversion complete.');
  } catch (err) {
    console.error(`Error processing assets directory: ${err.message}`);
    process.exit(1);
  }
})();
