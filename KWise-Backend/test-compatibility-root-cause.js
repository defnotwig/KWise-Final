/**
 * ROOT CAUSE DIAGNOSTIC TEST
 * Test actual compatibility analysis to find why all products get 65/100 score
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testCompatibilityRootCause() {
    console.log('\n🔍 === ROOT CAUSE DIAGNOSTIC TEST ===\n');
    console.log('Testing why all products get same 65/100 score...\n');

    try {
        // Test 1: Single CPU-Motherboard compatibility check
        console.log('TEST 1: Single CPU against 3 motherboards\n');
        
        const cpu = {
            id: 302,
            name: 'AMD Ryzen 5 5600X',
            category: 'CPU',
            brand: 'AMD',
            price: 8500,
            specifications: {
                socket: 'AM4',
                cores: 6,
                threads: 12,
                base_clock: '3.7 GHz',
                boost_clock: '4.6 GHz',
                tdp: 65
            }
        };

        const motherboards = [
            {
                id: 101,
                name: 'MSI B550 Tomahawk (Compatible - AM4)',
                category: 'Motherboard',
                brand: 'MSI',
                price: 12000,
                specifications: {
                    socket: 'AM4',
                    chipset: 'B550',
                    form_factor: 'ATX',
                    memory_type: 'DDR4'
                }
            },
            {
                id: 102,
                name: 'ASUS ROG Strix Z690 (INCOMPATIBLE - LGA1700)',
                category: 'Motherboard',
                brand: 'ASUS',
                price: 18000,
                specifications: {
                    socket: 'LGA1700',
                    chipset: 'Z690',
                    form_factor: 'ATX',
                    memory_type: 'DDR5'
                }
            },
            {
                id: 103,
                name: 'Gigabyte B650 AORUS (INCOMPATIBLE - AM5)',
                category: 'Motherboard',
                brand: 'Gigabyte',
                price: 15000,
                specifications: {
                    socket: 'AM5',
                    chipset: 'B650',
                    form_factor: 'ATX',
                    memory_type: 'DDR5'
                }
            }
        ];

        const response = await axios.post(`${BASE_URL}/compatibility/analyze`, {
            currentProduct: cpu,
            candidateProducts: motherboards
        });

        console.log('✅ API Response:');
        console.log('Status:', response.status);
        console.log('Success:', response.data.success);
        console.log('\n📊 Results:\n');

        if (response.data.compatibleProducts) {
            response.data.compatibleProducts.forEach((product, index) => {
                console.log(`${index + 1}. ${product.name}`);
                console.log(`   Compatibility Score: ${product.compatibility_score}/100`);
                console.log(`   Compatible: ${product.compatible}`);
                console.log(`   AI Score: ${product.ai_score || 'N/A'}`);
                console.log(`   Deterministic Score: ${product.deterministic_score || 'N/A'}`);
                console.log(`   Tier Score: ${product.tier_score || 'N/A'}`);
                console.log(`   Reason: ${product.compatibility_reason || 'No reason provided'}`);
                
                if (product.deterministic_issues && product.deterministic_issues.length > 0) {
                    console.log(`   Issues: ${product.deterministic_issues.length} found`);
                    product.deterministic_issues.forEach(issue => {
                        console.log(`      - [${issue.severity}] ${issue.message}`);
                    });
                }
                
                console.log('');
            });
        }

        console.log('\n🔍 AI Analysis Details:');
        console.log('AI Available:', response.data.aiDetails?.ai_available);
        console.log('AI Source:', response.data.aiDetails?.ai_source);
        console.log('Cache Used:', response.data.aiDetails?.cache_used);
        console.log('Analysis Time:', response.data.aiDetails?.analysis_time_ms, 'ms');

        // Test 2: Analyze if all 3 got same score
        console.log('\n\n🎯 SCORE ANALYSIS:\n');
        
        if (response.data.compatibleProducts) {
            const scores = response.data.compatibleProducts.map(p => p.compatibility_score);
            const unique = [...new Set(scores)];
            
            console.log('All Scores:', scores.join(', '));
            console.log('Unique Scores:', unique.join(', '));
            
            if (unique.length === 1) {
                console.log('\n🔴 ROOT CAUSE CONFIRMED: All products have IDENTICAL score!');
                console.log(`🔴 Score: ${unique[0]}/100`);
                console.log('🔴 This indicates AI/scoring logic is broken\n');
            } else {
                console.log('\n✅ SCORES ARE DIFFERENT - Scoring logic working correctly\n');
            }
        }

        // Test 3: Check AI response structure
        console.log('\n🔍 CHECKING AI RESPONSE STRUCTURE:\n');
        const fullResponse = response.data;
        console.log('Response Keys:', Object.keys(fullResponse).join(', '));
        
        if (fullResponse.debug) {
            console.log('\nDebug Info:', JSON.stringify(fullResponse.debug, null, 2));
        }

    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }

    console.log('\n🔍 === TEST COMPLETE ===\n');
}

// Run test
testCompatibilityRootCause().then(() => {
    console.log('\nTest finished. Check results above.');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
