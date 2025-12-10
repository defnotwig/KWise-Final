// Quick script to check motherboard 143 specs in database
require('dotenv').config();
const { query } = require('./config/db');

async function checkMotherboard() {
  try {
    console.log('🔍 Checking motherboard ID 143 in database...\n');
    
    const result = await query(
      'SELECT id, name, category, brand, price, specifications, image_url FROM pc_parts WHERE id = 143'
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Motherboard ID 143 not found in database!');
      process.exit(1);
    }
    
    const mb = result.rows[0];
    console.log('📋 Motherboard Details:');
    console.log(`   ID: ${mb.id}`);
    console.log(`   Name: ${mb.name}`);
    console.log(`   Category: ${mb.category}`);
    console.log(`   Brand: ${mb.brand}`);
    console.log(`   Price: ₱${mb.price}`);
    console.log('\n📊 Specifications:');
    console.log(JSON.stringify(mb.specifications, null, 2));
    console.log(`\n🖼️ Image: ${mb.image_url}`);
    
    // Check critical specs
    const specs = mb.specifications;
    console.log('\n🔍 Critical Compatibility Specs:');
    console.log(`   Socket: ${specs.socket || 'NOT FOUND'}`);
    console.log(`   Chipset: ${specs.chipset || 'NOT FOUND'}`);
    console.log(`   Memory Type: ${specs.memory_type || 'NOT FOUND'}`);
    console.log(`   Form Factor: ${specs.form_factor || 'NOT FOUND'}`);
    
    // Verify it matches expected Intel B760 specs
    if (specs.socket !== 'LGA1700') {
      console.log('\n❌ ERROR: Socket should be LGA1700, but found:', specs.socket);
    } else {
      console.log('\n✅ Socket is correct (LGA1700)');
    }
    
    if (!specs.chipset || !specs.chipset.includes('Intel B760')) {
      console.log('❌ ERROR: Chipset should contain "Intel B760", but found:', specs.chipset);
    } else {
      console.log('✅ Chipset is correct (Intel B760)');
    }
    
    if (specs.memory_type !== 'DDR5') {
      console.log('❌ ERROR: Memory type should be DDR5, but found:', specs.memory_type);
    } else {
      console.log('✅ Memory type is correct (DDR5)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
}

checkMotherboard();
