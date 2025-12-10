const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'KWiseDB',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
});

let output = '';

async function checkCaseAndGPU() {
  try {
    const log = (msg) => {
      console.log(msg);
      output += msg + '\n';
    };
    
    log('🔍 Checking POWERLOGIC SLIM case and RTX4070 GPU specifications...\n');
    
    // Check the case
    const caseResult = await pool.query(
      "SELECT id, name, specifications->'supported_form_factors' as supported_form_factors, specifications->'max_gpu_length_mm' as max_gpu_length_mm, specifications FROM pc_parts WHERE category = 'PC Case' AND name LIKE '%POWERLOGIC SLIM%' LIMIT 1"
    );
    
    if (caseResult.rows.length > 0) {
      const caseData = caseResult.rows[0];
      log('📦 POWERLOGIC SLIM CASE:');
      log('   ID: ' + caseData.id);
      log('   Name: ' + caseData.name);
      log('   supported_form_factors: ' + JSON.stringify(caseData.supported_form_factors));
      log('   max_gpu_length_mm: ' + caseData.max_gpu_length_mm);
      log('   Full specs: ' + JSON.stringify(caseData.specifications, null, 2));
      log('');
    } else {
      log('❌ Case not found in database!\n');
    }
    
    // Check the GPU
    const gpuResult = await pool.query(
      "SELECT id, name, specifications->'length_mm' as length_mm, specifications FROM pc_parts WHERE category = 'GPU' AND name LIKE '%RTX 4070%' AND name LIKE '%TGAME%' LIMIT 1"
    );
    
    if (gpuResult.rows.length > 0) {
      const gpuData = gpuResult.rows[0];
      log('🎮 RTX4070 GPU:');
      log('   ID: ' + gpuData.id);
      log('   Name: ' + gpuData.name);
      log('   length_mm: ' + gpuData.length_mm);
      log('   Full specs: ' + JSON.stringify(gpuData.specifications, null, 2));
      log('');
    } else {
      log('❌ GPU not found in database!\n');
    }
    
    // Check motherboard
    const mbResult = await pool.query(
      "SELECT id, name, specifications->'form_factor' as form_factor, specifications FROM pc_parts WHERE category = 'Motherboard' AND name LIKE '%AORUS ELITE B550M AX%' LIMIT 1"
    );
    
    if (mbResult.rows.length > 0) {
      const mbData = mbResult.rows[0];
      log('🔧 AORUS ELITE B550M AX MOTHERBOARD:');
      log('   ID: ' + mbData.id);
      log('   Name: ' + mbData.name);
      log('   form_factor: ' + mbData.form_factor);
      log('   Full specs: ' + JSON.stringify(mbData.specifications, null, 2));
      log('');
    } else {
      log('❌ Motherboard not found in database!\n');
    }
    
    fs.writeFileSync('case-gpu-check.txt', output);
    log('✅ Output saved to case-gpu-check.txt');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkCaseAndGPU();
