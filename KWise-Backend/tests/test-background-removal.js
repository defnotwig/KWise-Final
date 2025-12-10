/**
 * Background Removal Test Script
 * Tests the background removal service on actual product images
 */

const BackgroundRemovalService = require('../utils/backgroundRemovalService');
const path = require('path');
const fs = require('fs').promises;

const service = new BackgroundRemovalService();

async function testBackgroundRemoval() {
    console.log('🧪 TESTING BACKGROUND REMOVAL SERVICE');
    console.log('=' .repeat(80));

    const testDir = path.join(__dirname, '..', 'public', 'assets', 'parts');
    const categories = ['GPU', 'CPU', 'RAM', 'Case', 'Cooler'];
    
    let testImages = [];

    // Find a few test images from different categories
    for (const category of categories) {
        const categoryDir = path.join(testDir, category);
        try {
            const files = await fs.readdir(categoryDir);
            const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
            if (imageFiles.length > 0) {
                testImages.push({
                    category,
                    filename: imageFiles[0],
                    path: path.join(categoryDir, imageFiles[0])
                });
            }
        } catch (error) {
            console.log(`⚠️ Category ${category} not found or empty`);
        }
    }

    console.log(`\n📋 Found ${testImages.length} test images\n`);

    let successCount = 0;
    let failCount = 0;

    for (const img of testImages.slice(0, 3)) { // Test first 3 images
        try {
            console.log(`\n🎨 Processing: ${img.category}/${img.filename}`);
            
            const outputPath = img.path.replace(/\.(jpg|jpeg|png|webp)$/i, '-no-bg.png');
            const originalBackup = img.path + '.original';

            // Check if already processed
            const exists = await fs.access(outputPath).then(() => true).catch(() => false);
            if (exists) {
                console.log(`   ℹ️ Already processed (backup exists)`);
                successCount++;
                continue;
            }

            // Process the image
            const result = await service.processProductImage(img.path, {
                threshold: 240,
                tolerance: 10,
                createBackup: true
            });

            if (result.success) {
                console.log(`   ✅ Success! Output: ${path.basename(result.outputPath)}`);
                console.log(`   📦 Original backed up: ${path.basename(result.backupPath)}`);
                successCount++;
            } else {
                console.log(`   ❌ Failed: ${result.error}`);
                failCount++;
            }

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            failCount++;
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`📊 RESULTS: ${successCount} succeeded, ${failCount} failed`);
    console.log('='.repeat(80));

    if (successCount > 0) {
        console.log('\n✅ Background removal service is working!');
        console.log('📝 To process all images, use the API endpoint:');
        console.log('   POST /api/stock/remove-backgrounds');
        console.log('   Body: { "dryRun": true } (test without modifying)');
        console.log('   Body: { "dryRun": false } (actually process images)');
    }
}

// Run test
testBackgroundRemoval().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
