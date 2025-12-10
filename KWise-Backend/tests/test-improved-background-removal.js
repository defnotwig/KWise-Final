/**
 * Test Improved Background Removal Algorithm
 * Tests the enhanced flood-fill algorithm on CPU images
 */

const backgroundRemovalService = require('../utils/backgroundRemovalService');
const path = require('path');
const fs = require('fs').promises;

async function testImprovedBackgroundRemoval() {
    console.log('🧪 TESTING IMPROVED BACKGROUND REMOVAL ALGORITHM');
    console.log('================================================\n');

    const cpuDir = path.join(__dirname, '..', 'public', 'assets', 'parts', 'cpu');
    
    // Test on 3 CPU images with different characteristics
    const testImages = [
        'ryzen-3-3200g-1757965726285.webp',  // Gray/orange box
        'ryzen-3-4100-1757972941400.webp',    // Black box with orange
        'intel-core-i3-8100-1757973373694.webp' // Blue box
    ];

    let testsRun = 0;
    let testsPassed = 0;
    let testsFailed = 0;

    for (const imageName of testImages) {
        try {
            const imagePath = path.join(cpuDir, imageName);
            
            // Check if file exists
            try {
                await fs.access(imagePath);
            } catch {
                console.log(`⚠️ Skipping ${imageName} - file not found\n`);
                continue;
            }

            console.log(`🔍 Testing: ${imageName}`);
            
            // Get file size before
            const statsBefore = await fs.stat(imagePath);
            const sizeBefore = (statsBefore.size / 1024).toFixed(2);
            const extBefore = path.extname(imagePath);

            console.log(`📊 Size before: ${sizeBefore} KB, Format: ${extBefore}`);
            console.log(`🎨 Removing background with improved algorithm...`);

            // Process with improved algorithm
            const result = await backgroundRemovalService.processProductImage(imagePath, {
                threshold: 245,
                tolerance: 5,
                edgeBuffer: 3,
                preserveWhite: true
            });

            testsRun++;

            if (result.success) {
                // Get file size after
                const statsAfter = await fs.stat(result.outputPath);
                const sizeAfter = (statsAfter.size / 1024).toFixed(2);
                const extAfter = path.extname(result.outputPath);

                console.log(`✅ Success! Size after: ${sizeAfter} KB, Format: ${extAfter}`);
                console.log(`✅ Format preserved: ${extBefore === extAfter ? 'YES' : `NO (${extBefore} → ${extAfter})`}`);
                console.log(`💾 Backup created: ${result.backupPath ? 'Yes' : 'No'}`);
                
                testsPassed++;
            } else {
                console.log(`❌ Failed: ${result.error}`);
                testsFailed++;
            }

            console.log('');

        } catch (error) {
            console.error(`❌ Error testing ${imageName}:`, error.message);
            testsRun++;
            testsFailed++;
            console.log('');
        }
    }

    // Summary
    console.log('✅ TEST SUMMARY');
    console.log('===============');
    console.log(`Total tests: ${testsRun}`);
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`Success rate: ${testsRun > 0 ? ((testsPassed/testsRun)*100).toFixed(1) : 0}%`);
    console.log('');
    console.log('📝 Algorithm improvements:');
    console.log('   ✅ Flood fill from edges only');
    console.log('   ✅ Higher threshold (245 vs 240)');
    console.log('   ✅ Lower tolerance (5 vs 10)');
    console.log('   ✅ Edge buffer detection');
    console.log('   ✅ Preserves white colors inside products');
    console.log('');
}

// Run test
testImprovedBackgroundRemoval()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
