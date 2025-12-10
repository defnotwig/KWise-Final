/**
 * Check case ID 626 data for form factor inconsistency
 */
const db = require('../config/db');

async function checkCase() {
    try {
        // Check case 626 data
        const result = await db.query(`
            SELECT id, name, specifications, dimensions 
            FROM pc_parts 
            WHERE id = 626
        `);
        
        if (result.rows.length > 0) {
            const caseData = result.rows[0];
            console.log('=== Case ID 626 Data ===');
            console.log('Name:', caseData.name);
            console.log('\n=== Specifications ===');
            console.log(JSON.stringify(caseData.specifications, null, 2));
            console.log('\n=== Dimensions ===');
            console.log(JSON.stringify(caseData.dimensions, null, 2));
            
            // Check for the issue
            const specFormFactor = caseData.specifications?.form_factor;
            const dimFormFactor = caseData.dimensions?.form_factor;
            const supportedFormFactors = caseData.specifications?.supported_form_factors;
            
            console.log('\n=== Form Factor Analysis ===');
            console.log('specs.form_factor:', specFormFactor);
            console.log('dimensions.form_factor:', dimFormFactor);
            console.log('specs.supported_form_factors:', supportedFormFactors);
            
            if (specFormFactor !== dimFormFactor && dimFormFactor) {
                console.log('\n⚠️ CONFLICT DETECTED: dimensions.form_factor differs from specs.form_factor');
            }
        }
        
        // Also check motherboard ID 141
        const mbResult = await db.query(`
            SELECT id, name, specifications 
            FROM pc_parts 
            WHERE id = 141
        `);
        
        if (mbResult.rows.length > 0) {
            const mbData = mbResult.rows[0];
            console.log('\n=== Motherboard ID 141 Data ===');
            console.log('Name:', mbData.name);
            console.log('specs.form_factor:', mbData.specifications?.form_factor);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkCase();
