/**
 * Fix cases with incorrect dimensions.form_factor
 * The dimensions.form_factor should represent the case type (Mid Tower, Full Tower, etc)
 * NOT the smallest motherboard it supports
 */
const db = require('../config/db');

async function fixCaseFormFactors() {
    try {
        console.log('=== Checking all cases for form_factor inconsistency ===\n');
        
        // Get all cases
        const result = await db.query(`
            SELECT id, name, specifications, dimensions 
            FROM pc_parts 
            WHERE LOWER(category) = 'case'
            ORDER BY id
        `);
        
        console.log(`Found ${result.rows.length} cases\n`);
        
        const issues = [];
        
        for (const caseData of result.rows) {
            const specFormFactor = caseData.specifications?.form_factor || null;
            const dimFormFactor = caseData.dimensions?.form_factor || null;
            const supportedFormFactors = caseData.specifications?.supported_form_factors || null;
            
            // Check if dimensions.form_factor conflicts with specifications
            if (dimFormFactor && specFormFactor && dimFormFactor !== specFormFactor) {
                issues.push({
                    id: caseData.id,
                    name: caseData.name,
                    specFormFactor,
                    dimFormFactor,
                    supportedFormFactors
                });
                console.log(`⚠️ ID ${caseData.id}: ${caseData.name}`);
                console.log(`   specs.form_factor: ${specFormFactor}`);
                console.log(`   dimensions.form_factor: ${dimFormFactor} ← INCORRECT`);
                console.log(`   supported_form_factors: ${supportedFormFactors}`);
                console.log('');
            }
        }
        
        console.log(`\n=== Found ${issues.length} cases with form_factor issues ===\n`);
        
        if (issues.length > 0) {
            console.log('Fixing dimensions.form_factor to match specifications.form_factor...\n');
            
            for (const issue of issues) {
                // The dimensions.form_factor should match the case type (Mid Tower, Full Tower, etc)
                // NOT the motherboard form factor it supports
                const correctFormFactor = issue.specFormFactor;
                
                await db.query(`
                    UPDATE pc_parts 
                    SET dimensions = jsonb_set(dimensions, '{form_factor}', $1::jsonb)
                    WHERE id = $2
                `, [JSON.stringify(correctFormFactor), issue.id]);
                
                console.log(`✅ Fixed ID ${issue.id}: dimensions.form_factor = "${correctFormFactor}"`);
            }
            
            console.log(`\n✅ Fixed ${issues.length} cases`);
        } else {
            console.log('No issues found!');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

fixCaseFormFactors();
