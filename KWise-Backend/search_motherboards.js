// Search for B650 motherboards
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function searchMotherboards() {
  try {
    const query = `
      SELECT id, name, price, stock
      FROM pc_parts
      WHERE category = 'Motherboard'
        AND is_active = true
        AND (
          name ILIKE '%B650%'
          OR name ILIKE '%B550%'
          OR name ILIKE '%X670%'
        )
      ORDER BY price DESC
      LIMIT 10
    `;
    
    const result = await pool.query(query);
    
    console.log('🔍 Available High-End AMD Motherboards:\n');
    result.rows.forEach(row => {
      console.log(`  ID ${row.id} | ${row.name} | ₱${row.price} | Stock: ${row.stock}`);
    });
    
    // Use a suitable alternative
    if (result.rows.length > 0) {
      const alternative = result.rows[0];
      console.log(`\n✅ Using alternative: ID ${alternative.id} - ${alternative.name}`);
      
      // Update Elite Build B with alternative
      const updateQuery = `
        UPDATE pc_parts
        SET specifications = jsonb_set(
          jsonb_set(
            specifications,
            '{components}',
            (
              SELECT jsonb_agg(
                CASE 
                  WHEN elem->>'name' = 'Motherboard' 
                  THEN jsonb_set(
                    jsonb_set(
                      jsonb_set(elem, '{part_id}', to_jsonb($1::integer)),
                      '{part_price}', to_jsonb($2::numeric)
                    ),
                    '{price}', to_jsonb($2::numeric)
                  )
                  ELSE elem
                END
              )
              FROM jsonb_array_elements(specifications->'components') elem
            )
          ),
          '{componentLinks}',
          (
            SELECT jsonb_agg(
              CASE 
                WHEN elem->>'componentType' = 'Motherboard' 
                THEN jsonb_set(
                  jsonb_set(elem, '{linkedStockIds}', to_jsonb(ARRAY[$1])),
                  '{hasMatch}', 'true'::jsonb
                )
                ELSE elem
              END
            )
            FROM jsonb_array_elements(specifications->'componentLinks') elem
          )
        ),
        updated_at = NOW()
        WHERE id = 12021
        RETURNING name
      `;
      
      await pool.query(updateQuery, [alternative.id, parseFloat(alternative.price)]);
      console.log(`\n✅ Updated Elite Build B motherboard with part_id=${alternative.id}\n`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

searchMotherboards();
