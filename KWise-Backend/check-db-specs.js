const { query, pool } = require('./config/db');

async function checkSpecs() {
  try {
    // Check GPU specs
    console.log('=== GPU Specs (checking length and pcie_8pin) ===');
    const gpus = await query(`
      SELECT g.id, g.name, g.length, g.tdp, g.pcie_8pin, g.memory_capacity
      FROM gpu g 
      INNER JOIN pc_parts p ON p.id = g.id
      WHERE p.kiosk_visible = true
      LIMIT 5
    `);
    gpus.rows.forEach(g => console.log(JSON.stringify(g)));
    
    // Check Case specs
    console.log('\n=== Case Specs (checking max_gpu_length) ===');
    const cases = await query(`
      SELECT c.id, c.name, c.max_gpu_length, c.max_cpu_cooler_height, c.case_category, c.motherboard_support
      FROM pc_case c
      INNER JOIN pc_parts p ON p.id = c.id
      WHERE p.kiosk_visible = true
      LIMIT 5
    `);
    cases.rows.forEach(c => console.log(JSON.stringify(c)));
    
    // Check PSU specs
    console.log('\n=== PSU Specs (checking pcie_connectors) ===');
    const psus = await query(`
      SELECT ps.id, ps.name, ps.wattage, ps.pcie_connectors, ps.sata_connectors, ps.form_factor, ps.modular
      FROM psu ps
      INNER JOIN pc_parts p ON p.id = ps.id
      WHERE p.kiosk_visible = true
      LIMIT 5
    `);
    psus.rows.forEach(ps => console.log(JSON.stringify(ps)));
    
    // Check Motherboard specs (form factor, slots)
    console.log('\n=== Motherboard Specs (checking slots) ===');
    const mobos = await query(`
      SELECT m.id, m.name, m.socket, m.memory_type, m.ram_slots, m.m2_slots,
             p.specifications
      FROM motherboard m
      INNER JOIN pc_parts p ON p.id = m.id
      WHERE p.kiosk_visible = true
      LIMIT 3
    `);
    mobos.rows.forEach(m => console.log(JSON.stringify(m)));
    
    // Check if motherboard table has form_factor column
    console.log('\n=== Motherboard Columns ===');
    const moboColumns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'motherboard'
    `);
    moboColumns.rows.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));
    
    // Check PSU columns
    console.log('\n=== PSU Columns ===');
    const psuColumns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'psu'
    `);
    psuColumns.rows.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));

    await pool.end();
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
checkSpecs();
