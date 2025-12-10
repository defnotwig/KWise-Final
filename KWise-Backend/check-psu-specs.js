/**
 * Check database specs for PSU ID 529
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'KWiseDB',
  password: process.env.DB_PASSWORD || 'admin',
  port: parseInt(process.env.DB_PORT) || 5432
});

async function checkPsuSpecs() {
  try {
    // Check both pc_parts and product_specs tables
    const result1 = await pool.query(
      `SELECT id, name, specifications, dimensions 
       FROM pc_parts 
       WHERE id = 529`
    );
    console.log('\n=== pc_parts table (PSU ID 529) ===');
    if (result1.rows[0]) {
      console.log('Name:', result1.rows[0].name);
      console.log('Specifications:', JSON.stringify(result1.rows[0].specifications, null, 2));
      console.log('Dimensions:', JSON.stringify(result1.rows[0].dimensions, null, 2));
    }

    const result2 = await pool.query(
      `SELECT normalized_specs, compatibility_metadata 
       FROM product_specs 
       WHERE product_id = 529`
    );
    console.log('\n=== product_specs table (PSU ID 529) ===');
    if (result2.rows[0]) {
      console.log('Normalized Specs:', JSON.stringify(result2.rows[0].normalized_specs, null, 2));
      console.log('Compatibility Metadata:', JSON.stringify(result2.rows[0].compatibility_metadata, null, 2));
    } else {
      console.log('NO product_specs entry for PSU 529!');
    }

    // Also check the GPU
    console.log('\n=== GPU ID 444 ===');
    const gpuResult = await pool.query(
      `SELECT id, name, specifications, dimensions 
       FROM pc_parts 
       WHERE id = 444`
    );
    if (gpuResult.rows[0]) {
      console.log('Name:', gpuResult.rows[0].name);
      console.log('Specifications:', JSON.stringify(gpuResult.rows[0].specifications, null, 2));
      console.log('Dimensions:', JSON.stringify(gpuResult.rows[0].dimensions, null, 2));
    }

    const gpuSpecs = await pool.query(
      `SELECT normalized_specs, compatibility_metadata 
       FROM product_specs 
       WHERE product_id = 444`
    );
    if (gpuSpecs.rows[0]) {
      console.log('GPU Normalized Specs:', JSON.stringify(gpuSpecs.rows[0].normalized_specs, null, 2));
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

checkPsuSpecs();
