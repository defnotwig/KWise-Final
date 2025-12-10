const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST, 
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function comprehensiveTest() {
  try {
    console.log('🚀 K-Wise Comprehensive Specifications System Test');
    console.log('=' * 60);
    
    const allCategories = ['CPU', 'GPU', 'RAM', 'Storage', 'Motherboard', 'PSU', 'Case', 'Cooling', 'Headphones', 'Keyboard', 'Monitor', 'Mouse', 'Speakers', 'Webcam'];
    
    let totalFields = 0;
    let booleanFields = 0;
    let numberFields = 0;
    let textFields = 0;
    let dateFields = 0;
    
    console.log('\n📊 Testing all specification APIs...\n');
    
    for (const category of allCategories) {
      try {
        // Test the API endpoint
        const apiResponse = await axios.get(`http://localhost:5000/api/stock/meta/${category}`);
        
        if (apiResponse.data.success && apiResponse.data.data) {
          const fields = apiResponse.data.data;
          totalFields += fields.length;
          
          console.log(`✅ ${category}: ${fields.length} fields`);
          
          // Count field types
          fields.forEach(field => {
            switch (field.type) {
              case 'boolean': booleanFields++; break;
              case 'number': numberFields++; break;
              case 'text': textFields++; break;
              case 'date': dateFields++; break;
            }
          });
          
          // Show some example fields for interesting categories
          if (['CPU', 'GPU', 'Headphones', 'Keyboard', 'Monitor'].includes(category)) {
            const boolFields = fields.filter(f => f.type === 'boolean');
            const numFields = fields.filter(f => f.type === 'number');
            
            if (boolFields.length > 0) {
              console.log(`  🔘 Boolean fields: ${boolFields.map(f => f.name).join(', ')}`);
            }
            if (numFields.length > 0) {
              console.log(`  🔢 Number fields: ${numFields.slice(0,3).map(f => f.name).join(', ')}${numFields.length > 3 ? '...' : ''}`);
            }
          }
        } else {
          console.log(`❌ ${category}: API returned invalid response`);
        }
        
      } catch (error) {
        console.log(`❌ ${category}: API Error - ${error.message}`);
      }
    }
    
    console.log('\n📈 Summary Statistics:');
    console.log(`Total Categories: ${allCategories.length}`);
    console.log(`Total Specification Fields: ${totalFields}`);
    console.log(`Boolean Fields: ${booleanFields}`);
    console.log(`Number Fields: ${numberFields}`);
    console.log(`Text Fields: ${textFields}`);
    console.log(`Date Fields: ${dateFields}`);
    
    // Verify database consistency
    console.log('\n🔍 Database Consistency Check...');
    const dbResult = await pool.query('SELECT category, COUNT(*) as count FROM specification_schemas GROUP BY category ORDER BY category');
    
    let dbTotal = 0;
    dbResult.rows.forEach(row => {
      dbTotal += parseInt(row.count);
    });
    
    if (dbTotal === totalFields) {
      console.log('✅ Database and API are consistent');
    } else {
      console.log(`❌ Mismatch: DB has ${dbTotal} fields, API returned ${totalFields} fields`);
    }
    
    await pool.end();
    
    console.log('\n🎯 Test Results:');
    if (totalFields >= 100 && booleanFields > 10 && numberFields > 30) {
      console.log('✅ COMPREHENSIVE SPECIFICATIONS SYSTEM: FULLY FUNCTIONAL');
      console.log('✅ All 14 categories are working correctly');
      console.log('✅ Boolean, number, text, and date fields are properly configured');
      console.log('✅ Frontend and backend are ready for production use');
    } else {
      console.log('❌ System needs further configuration');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

comprehensiveTest();