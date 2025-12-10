/**
 * TEST SCRIPT: Compatibility Scoring Investigation
 * 
 * Tests the hypothesis that compatibility scores are 0 because
 * the build context only contains 1 component, so no pair rules trigger.
 */

const { query } = require('../config/db');
const compatibilityRules = require('../services/compatibilityRules');
const logger = require('../utils/logger');

async function testCompatibilityScoring() {
    console.log('🔬 COMPATIBILITY SCORING INVESTIGATION\n');
    console.log('=' .repeat(80));
    
    try {
        // Test 1: Single component build (current behavior - should score 0)
        console.log('\n📊 TEST 1: Single Component Build (Current Behavior)');
        console.log('-'.repeat(80));
        
        const singleComponentBuild = {
            cpu: {
                id: 1,
                specs: {
                    socket: 'LGA1700',
                    manufacturer: 'Intel',
                    generation: '14th Gen'
                }
            }
        };
        
        const gpuCandidate = {
            id: 50,
            category: 'GPU',
            specs: {
                length_mm: 280,
                power_connectors: ['8-pin', '8-pin'],
                tdp_watts: 320
            }
        };
        
        console.log('Build:', JSON.stringify(singleComponentBuild, null, 2));
        console.log('Candidate:', JSON.stringify(gpuCandidate, null, 2));
        
        const result1 = await compatibilityRules.computeCompatibilityScore(singleComponentBuild, gpuCandidate);
        console.log('\nResult:');
        console.log(`  - Compatible: ${result1.compatible}`);
        console.log(`  - Score: ${result1.score}`);
        console.log(`  - MaxScore: ${result1.maxScore}`);
        console.log(`  - PercentageScore: ${result1.percentageScore}%`);
        console.log(`  - Badge: ${result1.badge}`);
        console.log(`  - Rules Triggered: ${Object.keys(result1.ruleResults).length}`);
        console.log(`  - Issues: ${result1.issues.length}`);
        
        if (result1.percentageScore === 0) {
            console.log('\n❌ CONFIRMED: Score is 0 when build has only 1 component');
            console.log('   Root Cause: No component pairs exist to check compatibility');
        }
        
        // Test 2: Two-component build (should score > 0 if rules apply)
        console.log('\n\n📊 TEST 2: Two Component Build (CPU + Motherboard)');
        console.log('-'.repeat(80));
        
        const twoComponentBuild = {
            cpu: {
                id: 1,
                specs: {
                    socket: 'LGA1700',
                    manufacturer: 'Intel',
                    generation: '14th Gen',
                    tdp_watts: 125,
                    chipset_support: ['Z790', 'B760', 'H770']
                }
            },
            motherboard: {
                id: 20,
                specs: {
                    socket: 'LGA1700',
                    chipset: 'Z790',
                    form_factor: 'ATX',
                    ram_slots: 4,
                    max_ram_gb: 128,
                    ram_type: 'DDR5'
                }
            }
        };
        
        const ramCandidate = {
            id: 30,
            category: 'RAM',
            specs: {
                type: 'DDR5',
                speed_mhz: 6000,
                capacity_gb: 32,
                voltage: 1.35
            }
        };
        
        console.log('Build:', JSON.stringify(twoComponentBuild, null, 2));
        console.log('Candidate:', JSON.stringify(ramCandidate, null, 2));
        
        const result2 = await compatibilityRules.computeCompatibilityScore(twoComponentBuild, ramCandidate);
        console.log('\nResult:');
        console.log(`  - Compatible: ${result2.compatible}`);
        console.log(`  - Score: ${result2.score}`);
        console.log(`  - MaxScore: ${result2.maxScore}`);
        console.log(`  - PercentageScore: ${result2.percentageScore}%`);
        console.log(`  - Badge: ${result2.badge}`);
        console.log(`  - Rules Triggered: ${Object.keys(result2.ruleResults).length}`);
        Object.keys(result2.ruleResults).forEach(ruleName => {
            const ruleResult = result2.ruleResults[ruleName];
            console.log(`    * ${ruleName}: Score ${ruleResult.score}/${ruleResult.maxScore || 'N/A'}`);
        });
        console.log(`  - Issues: ${result2.issues.length}`);
        result2.issues.forEach(issue => {
            console.log(`    * [${issue.severity}] ${issue.message}`);
        });
        
        if (result2.percentageScore > 0) {
            console.log('\n✅ SUCCESS: Score > 0 when build has multiple components');
            console.log(`   Percentage Score: ${result2.percentageScore}%`);
        } else {
            console.log('\n⚠️ WARNING: Score still 0 even with multiple components');
            console.log('   Possible issue: Specs not normalized correctly or rules not matching');
        }
        
        // Test 3: Check real database product
        console.log('\n\n📊 TEST 3: Real Database Products');
        console.log('-'.repeat(80));
        
        const cpuResult = await query(`
            SELECT id, name, category, specifications 
            FROM pc_parts 
            WHERE category = 'CPU' AND is_active = true 
            LIMIT 1
        `);
        
        const motherboardResult = await query(`
            SELECT id, name, category, specifications 
            FROM pc_parts 
            WHERE category = 'Motherboard' AND is_active = true 
            LIMIT 1
        `);
        
        if (cpuResult.rows.length > 0 && motherboardResult.rows.length > 0) {
            const cpu = cpuResult.rows[0];
            const motherboard = motherboardResult.rows[0];
            
            console.log(`CPU: ${cpu.name} (ID: ${cpu.id})`);
            console.log(`Motherboard: ${motherboard.name} (ID: ${motherboard.id})`);
            console.log(`\nCPU Specs: ${JSON.stringify(cpu.specifications, null, 2)}`);
            console.log(`\nMotherboard Specs: ${JSON.stringify(motherboard.specifications, null, 2)}`);
            
            // Check if normalized specs exist
            const normalizedCpu = await compatibilityRules.loadNormalizedSpecs(cpu.id);
            const normalizedMb = await compatibilityRules.loadNormalizedSpecs(motherboard.id);
            
            console.log(`\nNormalized CPU Specs: ${JSON.stringify(normalizedCpu, null, 2)}`);
            console.log(`\nNormalized Motherboard Specs: ${JSON.stringify(normalizedMb, null, 2)}`);
            
            if (Object.keys(normalizedCpu).length === 0 || Object.keys(normalizedMb).length === 0) {
                console.log('\n⚠️ WARNING: Normalized specs not found in product_specs table!');
                console.log('   This is likely the root cause of 0 scores.');
                console.log('   Solution: Run spec normalization migration to populate product_specs table');
            } else {
                const realBuild = {
                    cpu: {
                        id: cpu.id,
                        specs: normalizedCpu
                    }
                };
                
                const realCandidate = {
                    id: motherboard.id,
                    category: 'Motherboard',
                    specs: normalizedMb
                };
                
                const result3 = await compatibilityRules.computeCompatibilityScore(realBuild, realCandidate);
                console.log('\nReal Product Compatibility Result:');
                console.log(`  - Compatible: ${result3.compatible}`);
                console.log(`  - Score: ${result3.score}`);
                console.log(`  - MaxScore: ${result3.maxScore}`);
                console.log(`  - PercentageScore: ${result3.percentageScore}%`);
                console.log(`  - Badge: ${result3.badge}`);
                console.log(`  - Rules Triggered: ${Object.keys(result3.ruleResults).length}`);
                
                if (result3.percentageScore > 0) {
                    console.log('\n✅ REAL DATA WORKS: Compatibility scoring functional with real products');
                } else {
                    console.log('\n❌ REAL DATA FAILS: Still getting 0 score with real products');
                }
            }
        } else {
            console.log('⚠️ Could not find CPU or Motherboard in database for testing');
        }
        
        // Summary
        console.log('\n\n' + '='.repeat(80));
        console.log('📋 INVESTIGATION SUMMARY');
        console.log('='.repeat(80));
        console.log('\n✅ Hypothesis: Compatibility scores are 0 because:');
        console.log('   1. Build context only contains 1 component (current product)');
        console.log('   2. Candidate is the product being evaluated');
        console.log('   3. No component pairs exist (e.g., CPU + Motherboard) to check');
        console.log('   4. All rules require 2+ components, so maxScore stays 0');
        console.log('   5. percentageScore = (0 / 0) = 0%');
        console.log('\n🔧 SOLUTION OPTIONS:');
        console.log('   A. Modify compatibility service to build fuller context');
        console.log('   B. Modify scoring function to handle single-component checks');
        console.log('   C. Add default compatibility score when no rules apply');
        console.log('   D. Implement component-specific scoring (GPU specs → inherent score)');
        console.log('\n💡 RECOMMENDED FIX: Option A + C');
        console.log('   - Pass more build context (if available from user session)');
        console.log('   - For missing context, assign default score based on:');
        console.log('     * Spec completeness (50%)');
        console.log('     * Category-appropriate defaults (30%)');
        console.log('     * Tier matching (20%)');
        
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

// Run the test
testCompatibilityScoring();
