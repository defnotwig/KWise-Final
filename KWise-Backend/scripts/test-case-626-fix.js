/**
 * Test script to verify Case 626 (LIANLI O11 Dynamic MINI) form factor fix
 * Tests that ATX motherboard (AORUS B850) is correctly identified as compatible
 */

const pool = require('../config/db');

async function testCase626Fix() {
    console.log('🧪 Testing Case 626 (LIANLI O11 Dynamic MINI) Form Factor Fix\n');
    console.log('='.repeat(70));
    
    try {
        // Get case 626 data
        const caseResult = await pool.query(
            `SELECT id, name, specifications, dimensions 
             FROM pc_parts 
             WHERE id = 626`
        );
        
        if (caseResult.rows.length === 0) {
            console.log('❌ Case 626 not found!');
            return;
        }
        
        const pcCase = caseResult.rows[0];
        const caseSpecs = pcCase.specifications || {};
        const caseDims = pcCase.dimensions || {};
        
        console.log(`\n📦 Case: ${pcCase.name}`);
        console.log(`   specifications.form_factor: ${caseSpecs.form_factor}`);
        console.log(`   specifications.supported_form_factors: ${caseSpecs.supported_form_factors}`);
        console.log(`   dimensions.form_factor: ${caseDims.form_factor}`);
        
        // Parse supported form factors
        let supportedFormFactors = caseSpecs.supported_form_factors || '';
        if (typeof supportedFormFactors === 'string') {
            supportedFormFactors = supportedFormFactors.split(',').map(s => s.trim().toUpperCase());
        }
        
        console.log(`\n✅ Supported Motherboard Sizes: ${supportedFormFactors.join(', ')}`);
        
        // Test ATX compatibility
        const atxCompatible = supportedFormFactors.some(s => s.includes('ATX') && !s.includes('MICRO'));
        console.log(`\n🔍 ATX Motherboard Compatible: ${atxCompatible ? '✅ YES' : '❌ NO'}`);
        
        // Get AORUS B850 motherboard
        const mbResult = await pool.query(
            `SELECT id, name, specifications, dimensions 
             FROM pc_parts 
             WHERE LOWER(name) LIKE '%aorus%b850%' OR LOWER(name) LIKE '%b850%aorus%'
             LIMIT 1`
        );
        
        if (mbResult.rows.length > 0) {
            const motherboard = mbResult.rows[0];
            const mbSpecs = motherboard.specifications || {};
            
            console.log(`\n🔧 Motherboard: ${motherboard.name}`);
            console.log(`   Form Factor: ${mbSpecs.form_factor || 'Not specified'}`);
            
            const mbFormFactor = (mbSpecs.form_factor || 'ATX').toUpperCase().replace(/[^A-Z-]/g, '');
            const normalizedMB = mbFormFactor.replaceAll('-', '');
            
            // Check compatibility
            const compatible = supportedFormFactors.some(supported => {
                const normalizedSupported = supported.replaceAll('-', '');
                return normalizedMB === normalizedSupported || 
                       normalizedMB.includes(normalizedSupported) || 
                       normalizedSupported.includes(normalizedMB);
            });
            
            console.log(`\n🎯 Validation Result: ${compatible ? '✅ COMPATIBLE' : '❌ INCOMPATIBLE'}`);
            
            if (compatible) {
                console.log('\n✅ FIX VERIFIED: ATX motherboard correctly recognized as compatible with LIANLI O11 Dynamic MINI!');
            } else {
                console.log('\n❌ FIX FAILED: ATX motherboard still showing as incompatible!');
            }
        } else {
            console.log('\n⚠️ AORUS B850 motherboard not found for testing');
        }
        
        console.log('\n' + '='.repeat(70));
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

testCase626Fix();
