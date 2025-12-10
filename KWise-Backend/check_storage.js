const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function checkStorage() {
  try {
    // Check the storage devices that are causing issues
    const result = await pool.query(`
      SELECT 
        id,
        name,
        category,
        specifications->>'Storage Type' as storage_type_1,
        specifications->>'storage_type' as storage_type_2,
        specifications->>'Interface' as interface_1,
        specifications->>'interface' as interface_2,
        specifications
      FROM pc_parts
      WHERE category = 'Storage'
        AND (name LIKE '%SAMSUNG 990 Pro%' OR name LIKE '%WESTERN DIGITAL%')
      ORDER BY name;
    `);

    console.log('\n=== STORAGE DEVICES ===\n');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Name: ${row.name}`);
      console.log(`Category: ${row.category}`);
      console.log(`Storage Type (capital): ${row.storage_type_1}`);
      console.log(`storage_type (lowercase): ${row.storage_type_2}`);
      console.log(`Interface (capital): ${row.interface_1}`);
      console.log(`interface (lowercase): ${row.interface_2}`);
      console.log('Full specifications:', JSON.stringify(row.specifications, null, 2));
      console.log('\n---\n');
    });

    // Check case specs
    const caseResult = await pool.query(`
      SELECT 
        id,
        name,
        specifications->>'drive_bays_35' as drive_bays_35,
        specifications->>'drive_bays_25' as drive_bays_25,
        specifications->>'hdd_bays' as hdd_bays,
        specifications->>'ssd_bays' as ssd_bays,
        specifications
      FROM pc_parts
      WHERE category = 'Case'
        AND name LIKE '%1stPlayer MIKU 2%';
    `);

    console.log('\n=== CASE (1stPlayer MIKU 2) ===\n');
    caseResult.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Name: ${row.name}`);
      console.log(`drive_bays_35: ${row.drive_bays_35}`);
      console.log(`drive_bays_25: ${row.drive_bays_25}`);
      console.log(`hdd_bays: ${row.hdd_bays}`);
      console.log(`ssd_bays: ${row.ssd_bays}`);
      console.log('Full specifications:', JSON.stringify(row.specifications, null, 2));
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkStorage();
