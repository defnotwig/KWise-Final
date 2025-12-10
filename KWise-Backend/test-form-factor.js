const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'KWiseDB',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
});

async function checkFormFactors() {
  try {
    console.log('🔍 Checking form factor and GPU clearance issues...\n');
    
    // Check POWERLOGIC SLIM case
    const caseResult = await pool.query(
      "SELECT name, specifications FROM pc_parts WHERE category = 'PC Case' AND name LIKE '%POWERLOGIC SLIM%' LIMIT 1"
    );
    
    if (caseResult.rows.length > 0) {
      const c = caseResult.rows[0];
      console.log('📦 POWERLOGIC SLIM Case:');
      console.log('   supported_form_factors:', c.specifications.supported_form_factors);
      console.log('   max_gpu_length_mm:', c.specifications.max_gpu_length_mm);
      console.log('   gpu_clearance_mm:', c.specifications.gpu_clearance_mm);
      
      // Normalize form factors
      const ff = c.specifications.supported_form_factors;
      const ffArray = Array.isArray(ff) ? ff : (typeof ff === 'string' ? [ff] : []);
      const normalized = ffArray.map(f => (f || '').toUpperCase().replace(/[^A-Z]/g, ''));
      console.log('   Normalized form factors:', normalized);
      console.log('');
    }
    
    // Check AORUS ELITE B550M AX motherboard
    const mbResult = await pool.query(
      "SELECT name, specifications FROM pc_parts WHERE category = 'Motherboard' AND name LIKE '%AORUS ELITE B550M AX%' LIMIT 1"
    );
    
    if (mbResult.rows.length > 0) {
      const mb = mbResult.rows[0];
      console.log('🔧 AORUS ELITE B550M AX Motherboard:');
      console.log('   form_factor:', mb.specifications.form_factor);
      const mbFF = (mb.specifications.form_factor || '').toUpperCase().replace(/[^A-Z]/g, '');
      console.log('   Normalized:', mbFF);
      console.log('');
    }
    
    // Check RTX4070 GPU
    const gpuResult = await pool.query(
      "SELECT name, specifications FROM pc_parts WHERE category = 'GPU' AND name LIKE '%RTX 4070%' AND name LIKE '%TGAME%' LIMIT 1"
    );
    
    if (gpuResult.rows.length > 0) {
      const gpu = gpuResult.rows[0];
      console.log('🎮 RTX4070 GPU:');
      console.log('   length_mm:', gpu.specifications.length_mm);
      console.log('   gpu_length_mm:', gpu.specifications.gpu_length_mm);
      const gpuLen = parseFloat(gpu.specifications.length_mm || gpu.specifications.gpu_length_mm || 0);
      console.log('   Parsed length:', gpuLen, 'mm');
      console.log('');
    }
    
    // Test validation logic
    console.log('🧪 Testing validation logic:');
    const caseFF = ['Micro-ATX', 'Mini-ITX'];
    const normalized = caseFF.map(ff => (ff || '').toUpperCase().replace(/[^A-Z]/g, ''));
    console.log('   Case form factors normalized:', normalized);
    
    const mbFormFactor = 'MICROATX';
    const isCompatible = normalized.some(ff => 
      ff === mbFormFactor || 
      (mbFormFactor === 'MICROATX' && ff === 'MATX') ||
      (mbFormFactor === 'MINIITX' && (ff === 'ITX' || ff === 'MITX'))
    );
    
    console.log('   Motherboard:', mbFormFactor);
    console.log('   Is compatible?', isCompatible);
    console.log('   Should be TRUE! (MICROATX === MICROATX)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkFormFactors();
