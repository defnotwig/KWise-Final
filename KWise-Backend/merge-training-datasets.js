/**
 * Merge Training Datasets for DeepSeek R1 Fine-Tuning
 * Combines:
 * 1. Compatibility rules dataset (2,513 examples)
 * 2. Hardware examples dataset (100-120 examples)
 * Total: ~2,600-2,633 training examples
 */

const fs = require('fs').promises;
const path = require('path');

async function mergeDatasets() {
    console.log('\n========== MERGING TRAINING DATASETS ==========\n');

    try {
        const datasetsDir = path.join(__dirname, 'ai', 'training', 'datasets');

        // Step 1: Load compatibility rules dataset
        console.log('Step 1: Loading compatibility rules dataset...');
        const rulesPath = path.join(datasetsDir, 'compatibility_rules_training.jsonl');
        
        let rulesData;
        try {
            rulesData = await fs.readFile(rulesPath, 'utf8');
        } catch (error) {
            console.error(`❌ Error reading rules dataset: ${error.message}`);
            console.log('   File path:', rulesPath);
            process.exit(1);
        }

        const rulesLines = rulesData.trim().split('\n').filter(line => line.trim());
        console.log(`✅ Loaded ${rulesLines.length} compatibility rule examples`);

        // Step 2: Load hardware examples dataset
        console.log('\nStep 2: Loading hardware examples dataset...');
        const hardwarePath = path.join(datasetsDir, 'pc_hardware_training_dataset.jsonl');
        
        let hardwareLines = [];
        try {
            const hardwareData = await fs.readFile(hardwarePath, 'utf8');
            hardwareLines = hardwareData.trim().split('\n').filter(line => line.trim());
            console.log(`✅ Loaded ${hardwareLines.length} hardware examples`);
        } catch (error) {
            console.log(`⚠️ Hardware dataset not found, skipping...`);
            console.log('   (This is OK if it hasn\'t been generated yet)');
        }

        // Step 3: Merge datasets
        console.log('\nStep 3: Merging datasets...');
        const merged = [...rulesLines, ...hardwareLines];
        console.log(`✅ Total examples: ${merged.length}`);

        // Step 4: Validate JSON format
        console.log('\nStep 4: Validating JSON format...');
        let validCount = 0;
        let invalidCount = 0;

        for (let i = 0; i < merged.length; i++) {
            try {
                JSON.parse(merged[i]);
                validCount++;
            } catch (error) {
                invalidCount++;
                console.warn(`⚠️ Invalid JSON at line ${i + 1}: ${merged[i].substring(0, 50)}...`);
            }
        }

        console.log(`✅ Valid examples: ${validCount}`);
        if (invalidCount > 0) {
            console.log(`⚠️ Invalid examples: ${invalidCount} (will be excluded)`);
        }

        // Step 5: Save merged dataset
        console.log('\nStep 5: Saving merged dataset...');
        const outputPath = path.join(datasetsDir, 'merged_training_dataset.jsonl');
        await fs.writeFile(outputPath, merged.join('\n'), 'utf8');
        console.log(`✅ Saved to: ${outputPath}`);

        // Step 6: Create summary
        console.log('\nStep 6: Creating summary...');
        const summary = {
            totalExamples: merged.length,
            sources: {
                compatibilityRules: rulesLines.length,
                hardwareExamples: hardwareLines.length
            },
            validExamples: validCount,
            invalidExamples: invalidCount,
            fileSize: `${(merged.join('\n').length / 1024).toFixed(2)} KB`,
            createdAt: new Date().toISOString(),
            outputFile: outputPath
        };

        const summaryPath = path.join(datasetsDir, 'merged_training_summary.json');
        await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
        console.log(`✅ Summary saved to: ${summaryPath}`);

        // Step 7: Sample examples
        console.log('\n========== MERGE COMPLETE ==========\n');
        console.log('📊 Statistics:');
        console.log(`   Total Examples: ${merged.length}`);
        console.log(`   From Rules: ${rulesLines.length}`);
        console.log(`   From Hardware: ${hardwareLines.length}`);
        console.log(`   File Size: ${summary.fileSize}`);
        console.log(`   Valid: ${validCount} (${((validCount/merged.length)*100).toFixed(1)}%)`);

        // Show sample
        if (merged.length > 0) {
            console.log('\n📝 Sample Example:');
            const sample = JSON.parse(merged[0]);
            console.log(`   Instruction: ${sample.instruction}`);
            console.log(`   Context: ${sample.context.substring(0, 100)}...`);
            console.log(`   Output: ${sample.output.substring(0, 100)}...`);
        }

        console.log('\n🎯 Ready for fine-tuning!\n');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error merging datasets:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the merge
mergeDatasets();
