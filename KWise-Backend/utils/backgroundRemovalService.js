const sharp = require('sharp');
const fs = require('node:fs').promises;
const path = require('node:path');
const logger = require('./logger');

/**
 * Background Removal Service
 * 
 * This service handles automatic background removal from product images.
 * It uses image processing techniques to detect and remove backgrounds,
 * making product images look professional with transparent backgrounds.
 * 
 * Process:
 * 1. Load the image
 * 2. Create an alpha mask based on background detection
 * 3. Apply the mask to make background transparent
 * 4. Save as PNG with transparency
 */

class BackgroundRemovalService {
    constructor() {
        this.supportedFormats = ['.jpg', '.jpeg', '.png', '.webp'];
        // Keep original format - both PNG and WebP support transparency
        this.preserveFormat = true;
    }

    /**
     * Check if file is a supported image format
     */
    isSupportedImage(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.supportedFormats.includes(ext);
    }

    /**
     * Remove background from an image using advanced edge detection
     * 
     * @param {string} inputPath - Path to input image
     * @param {string} outputPath - Path to save processed image
     * @param {object} options - Processing options
     * @returns {Promise<string>} Path to processed image
     */
    async removeBackground(inputPath, outputPath, options = {}) {
        try {
            logger.info(`🎨 Starting background removal for: ${path.basename(inputPath)}`);

            const {
                threshold = 245,       // Higher threshold - only very white backgrounds
                tolerance = 5,         // Lower tolerance - more strict color matching
                edgeBuffer = 3,        // Pixels from edge to consider as background
                preserveWhite = true   // Preserve white pixels inside product
            } = options;

            // Read the original image
            const image = sharp(inputPath);
            const metadata = await image.metadata();

            logger.info(`📊 Image info: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

            // Step 1: Convert to raw pixel data
            const { data, info } = await sharp(inputPath)
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            const pixels = new Uint8Array(data);
            const channels = info.channels;
            const width = info.width;
            const height = info.height;

            // Step 2: Create edge map - detect which pixels are on the edge
            const isEdgePixel = new Array(width * height).fill(false);
            
            // Mark edge pixels (pixels touching the border)
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const isOnBorder = (x < edgeBuffer || x >= width - edgeBuffer || 
                                       y < edgeBuffer || y >= height - edgeBuffer);
                    if (isOnBorder) {
                        isEdgePixel[y * width + x] = true;
                    }
                }
            }

            // Step 3: Flood fill from edges to find background regions
            const isBackground = new Array(width * height).fill(false);
            const visited = new Array(width * height).fill(false);
            const queue = [];

            // Start flood fill from all edge pixels that are white-ish
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (!isEdgePixel[y * width + x]) continue;
                    
                    const i = (y * width + x) * channels;
                    const r = pixels[i];
                    const g = pixels[i + 1];
                    const b = pixels[i + 2];
                    const brightness = (r + g + b) / 3;

                    // Only start from very white edge pixels
                    if (brightness > threshold && 
                        Math.abs(r - g) < tolerance &&
                        Math.abs(g - b) < tolerance &&
                        Math.abs(r - b) < tolerance) {
                        queue.push({x, y});
                        visited[y * width + x] = true;
                        isBackground[y * width + x] = true;
                    }
                }
            }

            // Flood fill algorithm - spread from edges inward
            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
            
            while (queue.length > 0) {
                const {x, y} = queue.shift();
                const i = (y * width + x) * channels;
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];

                // Check neighbors
                for (const [dx, dy] of directions) {
                    const nx = x + dx;
                    const ny = y + dy;

                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    if (visited[ny * width + nx]) continue;

                    const ni = (ny * width + nx) * channels;
                    const nr = pixels[ni];
                    const ng = pixels[ni + 1];
                    const nb = pixels[ni + 2];
                    const nBrightness = (nr + ng + nb) / 3;

                    // Only spread to similar white pixels
                    const colorDiff = Math.abs(nr - r) + Math.abs(ng - g) + Math.abs(nb - b);
                    if (nBrightness > threshold && colorDiff < tolerance * 3) {
                        queue.push({x: nx, y: ny});
                        visited[ny * width + nx] = true;
                        isBackground[ny * width + nx] = true;
                    }
                }
            }

            // Step 4: Apply transparency based on background map
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * channels;
                    
                    if (isBackground[y * width + x]) {
                        // Make background transparent
                        pixels[i + 3] = 0;
                    } else {
                        // Keep product opaque
                        pixels[i + 3] = 255;
                    }
                }
            }

            // Step 5: Save processed image with preserved format
            const ext = path.extname(outputPath).toLowerCase();
            const imageBuilder = sharp(pixels, {
                raw: {
                    width: info.width,
                    height: info.height,
                    channels: channels
                }
            });

            // Use appropriate format based on extension
            if (ext === '.webp') {
                await imageBuilder.webp({ quality: 100, lossless: true }).toFile(outputPath);
            } else {
                await imageBuilder.png({ compressionLevel: 9, quality: 100 }).toFile(outputPath);
            }

            logger.info(`✅ Background removed successfully: ${path.basename(outputPath)}`);

            return outputPath;

        } catch (error) {
            logger.error('❌ Error removing background:', error);
            throw new Error(`Background removal failed: ${error.message}`);
        }
    }

    /**
     * Process all images in a directory
     * 
     * @param {string} sourceDir - Source directory containing images
     * @param {string} outputDir - Output directory for processed images
     * @param {object} options - Processing options
     * @returns {Promise<Array>} Array of processed file paths
     */
    async processDirectory(sourceDir, outputDir, options = {}) {
        try {
            logger.info(`📁 Processing directory: ${sourceDir}`);

            // Ensure output directory exists
            await fs.mkdir(outputDir, { recursive: true });

            // Read all files in directory
            const files = await fs.readdir(sourceDir);
            const imageFiles = files.filter(file => this.isSupportedImage(file));

            logger.info(`🖼️ Found ${imageFiles.length} images to process`);

            const results = [];

            for (const file of imageFiles) {
                try {
                    const inputPath = path.join(sourceDir, file);
                    const fileName = path.parse(file).name;
                    const outputPath = path.join(outputDir, `${fileName}.png`);

                    await this.removeBackground(inputPath, outputPath, options);

                    results.push({
                        success: true,
                        input: inputPath,
                        output: outputPath,
                        filename: file
                    });

                } catch (error) {
                    logger.error(`❌ Failed to process ${file}:`, error.message);
                    results.push({
                        success: false,
                        input: path.join(sourceDir, file),
                        error: error.message,
                        filename: file
                    });
                }
            }

            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            logger.info(`✅ Batch processing complete: ${successful} successful, ${failed} failed`);

            return results;

        } catch (error) {
            logger.error('❌ Error processing directory:', error);
            throw new Error(`Directory processing failed: ${error.message}`);
        }
    }

    /**
     * Remove background from product image and replace original
     * 
     * @param {string} imagePath - Path to product image
     * @param {object} options - Processing options
     * @returns {Promise<object>} Result object with success status
     */
    async processProductImage(imagePath, options = {}) {
        try {
            if (!await this.fileExists(imagePath)) {
                throw new Error(`Image file not found: ${imagePath}`);
            }

            const { createBackup = true, ...processingOptions } = options;
            
            // Set better defaults for product images
            const defaultOptions = {
                threshold: 245,        // Only very white backgrounds
                tolerance: 5,          // Strict color matching
                edgeBuffer: 3,         // Pixels from edge
                preserveWhite: true    // Don't remove white from products
            };
            
            const finalOptions = { ...defaultOptions, ...processingOptions };

            // Create paths - preserve original format
            const dir = path.dirname(imagePath);
            const ext = path.extname(imagePath).toLowerCase();
            const basename = path.basename(imagePath, ext);
            
            // Determine output format - preserve webp, png; convert jpg/jpeg to png
            let outputExt = ext;
            if (ext === '.jpg' || ext === '.jpeg') {
                outputExt = '.png'; // Convert JPEG to PNG for transparency
            }
            
            const tempPath = path.join(dir, `${basename}_temp${outputExt}`);
            const outputPath = path.join(dir, `${basename}${outputExt}`);
            const backupPath = imagePath + '.original';

            // Create backup if requested and doesn't exist
            if (createBackup && !await this.fileExists(backupPath)) {
                await fs.copyFile(imagePath, backupPath);
                logger.info(`💾 Created backup: ${path.basename(backupPath)}`);
            }

            // Remove background with improved algorithm
            await this.removeBackground(imagePath, tempPath, finalOptions);

            // Replace original with processed image
            if (imagePath !== outputPath) {
                // Only delete original if format changed
                if (await this.fileExists(imagePath) && ext !== outputExt) {
                    await fs.unlink(imagePath);
                }
            }
            
            // Move temp file to final location
            if (await this.fileExists(outputPath) && outputPath !== tempPath) {
                await fs.unlink(outputPath); // Remove old file
            }
            await fs.rename(tempPath, outputPath);

            logger.info(`✅ Product image processed: ${path.basename(imagePath)} → ${path.basename(outputPath)}`);

            return {
                success: true,
                originalPath: imagePath,
                outputPath: outputPath,
                backupPath: createBackup ? backupPath : null,
                formatChanged: ext !== outputExt
            };

        } catch (error) {
            logger.error('❌ Error processing product image:', error);
            return {
                success: false,
                originalPath: imagePath,
                error: error.message
            };
        }
    }

    /**
     * Check if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = new BackgroundRemovalService();
