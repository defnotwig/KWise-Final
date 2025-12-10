const { query } = require('../config/db');

async function validateEliteBuildAFix() {
    try {
        console.log('='.repeat(80));
        console.log('ELITE BUILD A FIX VALIDATION');
        console.log('='.repeat(80));
        console.log('\n');
        
        // Get Elite Build A
        const result = await query('SELECT * FROM pc_parts WHERE id = 12020');
        
        if (result.rows.length === 0) {
            console.log('❌ Elite Build A not found!');
            process.exit(1);
        }
        
        const eliteBuildA = result.rows[0];
        const specs = eliteBuildA.specifications;
        
        console.log('Elite Build A Data:');
        console.log('-'.repeat(80));
        console.log('ID:', eliteBuildA.id);
        console.log('Name:', eliteBuildA.name);
        console.log('Price:', eliteBuildA.price);
        console.log('Stock:', eliteBuildA.stock);
        console.log('Image URL:', eliteBuildA.image_url);
        console.log('\n');
        
        console.log('Specifications Analysis:');
        console.log('-'.repeat(80));
        
        // Check buildType
        console.log('Build Type:', specs.buildType);
        const buildTypeValid = typeof specs.buildType === 'string' && specs.buildType === 'Elite';
        console.log(`  Status: ${buildTypeValid ? '✅ VALID' : '❌ INVALID'}`);
        console.log('');
        
        // Check purposes
        console.log('Purposes:', specs.purposes);
        const purposesValid = Array.isArray(specs.purposes) && specs.purposes.length > 0;
        console.log(`  Status: ${purposesValid ? '✅ VALID' : '❌ INVALID'}`);
        console.log('');
        
        // Check components
        console.log('Components:');
        const componentsValid = Array.isArray(specs.components) && specs.components.length > 0;
        console.log(`  Count: ${specs.components?.length || 0}`);
        console.log(`  Status: ${componentsValid ? '✅ VALID' : '❌ INVALID'}`);
        
        if (componentsValid) {
            console.log('  Structure Check:');
            specs.components.forEach((comp, idx) => {
                const hasName = comp.hasOwnProperty('name');
                const hasValue = comp.hasOwnProperty('value');
                const isValid = hasName && hasValue;
                console.log(`    ${idx + 1}. ${isValid ? '✅' : '❌'} ${comp.name}: ${comp.value}`);
            });
        }
        console.log('');
        
        // Check componentLinks
        console.log('Component Links:');
        const linksValid = Array.isArray(specs.componentLinks) && specs.componentLinks.length > 0;
        console.log(`  Count: ${specs.componentLinks?.length || 0}`);
        console.log(`  Status: ${linksValid ? '✅ VALID' : '❌ INVALID'}`);
        
        if (linksValid) {
            console.log('  Structure Check:');
            specs.componentLinks.forEach((link, idx) => {
                const hasType = link.hasOwnProperty('componentType');
                const hasName = link.hasOwnProperty('componentName');
                const hasIds = Array.isArray(link.linkedStockIds);
                const hasMatch = link.hasOwnProperty('hasMatch');
                const isValid = hasType && hasName && hasIds && hasMatch;
                console.log(`    ${idx + 1}. ${isValid ? '✅' : '❌'} ${link.componentType}: ${link.componentName}`);
            });
        }
        console.log('');
        
        // Check totalComponents and matchedComponents
        console.log('Metadata:');
        console.log(`  Total Components: ${specs.totalComponents}`);
        console.log(`  Matched Components: ${specs.matchedComponents}`);
        const metadataValid = typeof specs.totalComponents === 'number' && typeof specs.matchedComponents === 'number';
        console.log(`  Status: ${metadataValid ? '✅ VALID' : '❌ INVALID'}`);
        console.log('');
        
        // FINAL VERDICT
        const allValid = buildTypeValid && purposesValid && componentsValid && linksValid && metadataValid;
        
        console.log('='.repeat(80));
        console.log('FINAL VERDICT');
        console.log('='.repeat(80));
        console.log(`Build Type: ${buildTypeValid ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Purposes: ${purposesValid ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Components: ${componentsValid ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Component Links: ${linksValid ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Metadata: ${metadataValid ? '✅ PASS' : '❌ FAIL'}`);
        console.log('');
        console.log(`OVERALL: ${allValid ? '✅ ELITE BUILD A IS COMPLETELY FIXED!' : '❌ ELITE BUILD A STILL HAS ISSUES'}`);
        console.log('='.repeat(80));
        
        process.exit(allValid ? 0 : 1);
        
    } catch (error) {
        console.error('❌ Error validating Elite Build A:', error);
        process.exit(1);
    }
}

validateEliteBuildAFix();
