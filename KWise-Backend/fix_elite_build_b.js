// Fix Elite Build B Motherboard
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function fixEliteBuildB() {
  try {
    // Find motherboard matching "GIGABYTE B650M GAMING WIFI"
    const searchQuery = `
      SELECT id, name, price, stock
      FROM pc_parts
      WHERE category = 'Motherboard'
        AND is_active = true
        AND name ILIKE '%B650M%'
        AND name ILIKE '%GAMING%'
        AND name ILIKE '%WIFI%'
      ORDER BY similarity(name, 'GIGABYTE B650M GAMING WIFI') DESC
      LIMIT 5
    `;
    
    const searchResult = await pool.query(searchQuery);
    
    console.log('🔍 Searching for matching motherboard...\n');
    
    if (searchResult.rows.length > 0) {
      console.log('Found potential matches:');
      searchResult.rows.forEach((row, idx) => {
        console.log(`  ${idx + 1}. ID ${row.id} | ${row.name} | ₱${row.price} | Stock: ${row.stock}`);
      });
      
      const bestMatch = searchResult.rows[0];
      console.log(`\n✅ Using: ID ${bestMatch.id} - ${bestMatch.name}`);
      
      // Update Elite Build B
      const updateQuery = `
        UPDATE pc_parts
        SET specifications = jsonb_set(
          specifications,
          '{components}',
          (
            SELECT jsonb_agg(
              CASE 
                WHEN elem->>'name' = 'Motherboard' 
                THEN jsonb_set(
                  jsonb_set(elem, '{part_id}', to_jsonb($1::integer)),
                  '{part_price}', to_jsonb($2::numeric)
                )
                ELSE elem
              END
            )
            FROM jsonb_array_elements(specifications->'components') elem
          )
        ),
        updated_at = NOW()
        WHERE id = 12021
        RETURNING name
      `;
      
      await pool.query(updateQuery, [bestMatch.id, parseFloat(bestMatch.price)]);
      console.log(`\n✅ Updated Elite Build B motherboard with part_id=${bestMatch.id}\n`);
      
    } else {
      console.log('❌ No matching motherboard found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixEliteBuildB();
