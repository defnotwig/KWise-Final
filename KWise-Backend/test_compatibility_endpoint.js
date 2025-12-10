// Quick test script for /api/compatibility/advanced/full-build endpoint
const axios = require('axios');

const testCompatibility = async () => {
  try {
    console.log('🧪 Testing /api/compatibility/advanced/full-build endpoint...\n');

    const response = await axios.post('http://localhost:5000/api/compatibility/advanced/full-build', {
      components: [
        { 
          product_id: 1,  // Example product IDs - adjust based on actual database
          category: 'CPU'
        },
        { 
          product_id: 2, 
          category: 'Motherboard'
        },
        { 
          product_id: 3, 
          category: 'RAM'
        },
        { 
          product_id: 4, 
          category: 'GPU'
        },
        { 
          product_id: 5, 
          category: 'Case'
        }
      ]
    });

    console.log('✅ Response Status:', response.status);
    console.log('\n📊 Compatibility Score:', response.data.compatibility_score);
    console.log('\n🔴 Critical Issues:', response.data.all_issues?.length || 0);
    console.log('🟡 Warnings:', response.data.all_warnings?.length || 0);
    console.log('✅ Compatible Notes:', response.data.compatible_notes?.length || 0);

    if (response.data.all_issues && response.data.all_issues.length > 0) {
      console.log('\n🔴 CRITICAL ISSUES:');
      response.data.all_issues.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue.message}`);
        if (issue.details) console.log(`     Details: ${issue.details}`);
      });
    }

    if (response.data.compatible_notes && response.data.compatible_notes.length > 0) {
      console.log('\n✅ COMPATIBLE NOTES:');
      response.data.compatible_notes.forEach((note, idx) => {
        console.log(`  ${idx + 1}. ${note.message}`);
        if (note.details) console.log(`     Details: ${note.details}`);
      });
    }

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
};

testCompatibility();
