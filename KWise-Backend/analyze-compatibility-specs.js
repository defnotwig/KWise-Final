const { query, pool } = require('./config/db');

async function analyzeCompatibilitySpecs() {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('    COMPATIBILITY SPECIFICATIONS ANALYSIS REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. GPU Specifications Analysis
    console.log('📊 GPU SPECIFICATIONS (Length, TDP, Power Connectors)');
    console.log('─────────────────────────────────────────────────────────');
    const gpus = await query(`
      SELECT g.id, g.name, g.length, g.tdp, g.pcie_8pin, g.memory_capacity,
             p.kiosk_visible
      FROM gpu g 
      INNER JOIN pc_parts p ON p.id = g.id
      WHERE p.kiosk_visible = true
      ORDER BY g.length DESC
      LIMIT 10
    `);
    
    console.log(`Total visible GPUs: ${gpus.rows.length}`);
    gpus.rows.forEach(g => {
      console.log(`  ${g.name}`);
      console.log(`    ├─ Length: ${g.length}mm`);
      console.log(`    ├─ TDP: ${g.tdp}W`);
      console.log(`    └─ 8-pin PCIe: ${g.pcie_8pin || 0}`);
    });

    // 2. Case Specifications Analysis
    console.log('\n📊 CASE SPECIFICATIONS (GPU Clearance, Form Factor)');
    console.log('─────────────────────────────────────────────────────────');
    const cases = await query(`
      SELECT c.id, c.name, c.max_gpu_length, c.max_cpu_cooler_height, 
             c.case_category, c.motherboard_support,
             p.kiosk_visible
      FROM pc_case c
      INNER JOIN pc_parts p ON p.id = c.id
      WHERE p.kiosk_visible = true
      ORDER BY c.id
      LIMIT 10
    `);
    
    console.log(`Total visible Cases: ${cases.rows.length}`);
    cases.rows.forEach(c => {
      console.log(`  ${c.name}`);
      console.log(`    ├─ Max GPU Length: ${c.max_gpu_length}`);
      console.log(`    ├─ Max CPU Cooler Height: ${c.max_cpu_cooler_height}`);
      console.log(`    ├─ Category: ${c.case_category}`);
      console.log(`    └─ Motherboard Support: ${c.motherboard_support || 'NOT SET'}`);
    });

    // 3. PSU Specifications Analysis
    console.log('\n📊 PSU SPECIFICATIONS (Wattage, Power Connectors, Form Factor)');
    console.log('─────────────────────────────────────────────────────────');
    const psus = await query(`
      SELECT ps.id, ps.name, ps.wattage, ps.pcie_connectors, 
             ps.sata_connectors, ps.form_factor, ps.modular,
             p.kiosk_visible
      FROM psu ps
      INNER JOIN pc_parts p ON p.id = ps.id
      WHERE p.kiosk_visible = true
      ORDER BY ps.wattage DESC
      LIMIT 10
    `);
    
    console.log(`Total visible PSUs: ${psus.rows.length}`);
    psus.rows.forEach(ps => {
      console.log(`  ${ps.name}`);
      console.log(`    ├─ Wattage: ${ps.wattage}W`);
      console.log(`    ├─ PCIe Connectors: ${ps.pcie_connectors || 'NOT SET'}`);
      console.log(`    ├─ SATA Connectors: ${ps.sata_connectors || 'NOT SET'}`);
      console.log(`    ├─ Form Factor: ${ps.form_factor || 'NOT SET'}`);
      console.log(`    └─ Modular: ${ps.modular ? 'Yes' : 'No'}`);
    });

    // 4. Motherboard Specifications Analysis
    console.log('\n📊 MOTHERBOARD SPECIFICATIONS (Slots, Form Factor, Chipset)');
    console.log('─────────────────────────────────────────────────────────');
    
    // First check columns
    const moboColumns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'motherboard'
      ORDER BY ordinal_position
    `);
    
    console.log('Available columns in motherboard table:');
    moboColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    const mobos = await query(`
      SELECT m.id, m.name, m.socket, m.chipset, m.memory_type, 
             m.max_ram, m.ram_slots, m.m2_slots,
             p.specifications, p.kiosk_visible
      FROM motherboard m
      INNER JOIN pc_parts p ON p.id = m.id
      WHERE p.kiosk_visible = true
      ORDER BY m.id
      LIMIT 5
    `);
    
    console.log(`\nTotal visible Motherboards: ${mobos.rows.length}`);
    mobos.rows.forEach(m => {
      console.log(`  ${m.name}`);
      console.log(`    ├─ Socket: ${m.socket}`);
      console.log(`    ├─ Chipset: ${m.chipset}`);
      console.log(`    ├─ Memory Type: ${m.memory_type}`);
      console.log(`    ├─ Max RAM: ${m.max_ram}GB`);
      console.log(`    ├─ RAM Slots: ${m.ram_slots}`);
      console.log(`    ├─ M.2 Slots: ${m.m2_slots}`);
      
      // Check specifications JSONB field
      if (m.specifications) {
        console.log(`    └─ Additional specs in JSONB:`);
        const specs = typeof m.specifications === 'string' ? JSON.parse(m.specifications) : m.specifications;
        console.log(`       ${JSON.stringify(specs, null, 2).split('\n').join('\n       ')}`);
      } else {
        console.log(`    └─ No additional specifications`);
      }
    });

    // 5. Check for missing critical specs
    console.log('\n⚠️  MISSING SPECIFICATIONS ANALYSIS');
    console.log('─────────────────────────────────────────────────────────');
    
    // Check GPUs missing length
    const gpuMissingLength = await query(`
      SELECT COUNT(*) as count
      FROM gpu g
      INNER JOIN pc_parts p ON p.id = g.id
      WHERE p.kiosk_visible = true AND (g.length IS NULL OR g.length = 0)
    `);
    console.log(`GPUs missing length: ${gpuMissingLength.rows[0].count}`);

    // Check Cases with max_gpu_length as string "300mm" instead of number
    const casesWithStringLength = await query(`
      SELECT id, name, max_gpu_length, max_cpu_cooler_height
      FROM pc_case
      WHERE max_gpu_length LIKE '%mm%'
      LIMIT 5
    `);
    console.log(`\nCases with string lengths (need conversion):`);
    casesWithStringLength.rows.forEach(c => {
      console.log(`  ${c.name}: max_gpu_length="${c.max_gpu_length}" (should be number)`);
    });

    // Check PSUs missing pcie_connectors
    const psuMissingPCIe = await query(`
      SELECT COUNT(*) as count
      FROM psu ps
      INNER JOIN pc_parts p ON p.id = ps.id
      WHERE p.kiosk_visible = true AND ps.pcie_connectors IS NULL
    `);
    console.log(`\nPSUs missing PCIe connectors: ${psuMissingPCIe.rows[0].count}`);

    // 6. Compatibility Issue Examples
    console.log('\n🔴 IDENTIFIED COMPATIBILITY ISSUES');
    console.log('─────────────────────────────────────────────────────────');
    
    // Find GPUs that won't fit in small cases
    console.log('\nISSUE 1: GPUs too long for cases');
    const gpuCaseIssues = await query(`
      SELECT 
        g.name as gpu_name,
        g.length as gpu_length,
        c.name as case_name,
        c.max_gpu_length as case_max_length
      FROM gpu g
      CROSS JOIN pc_case c
      INNER JOIN pc_parts p1 ON p1.id = g.id
      INNER JOIN pc_parts p2 ON p2.id = c.id
      WHERE p1.kiosk_visible = true 
        AND p2.kiosk_visible = true
        AND g.length > CAST(REPLACE(c.max_gpu_length, 'mm', '') AS INTEGER)
      LIMIT 5
    `);
    
    gpuCaseIssues.rows.forEach(issue => {
      console.log(`  ❌ ${issue.gpu_name} (${issue.gpu_length}mm) > ${issue.case_name} (${issue.case_max_length})`);
    });

    // Find GPUs that need 8-pin but PSU might not have it
    console.log('\nISSUE 2: GPUs requiring more PCIe connectors than PSU provides');
    const gpuPsuIssues = await query(`
      SELECT 
        g.name as gpu_name,
        g.pcie_8pin as gpu_needs,
        ps.name as psu_name,
        ps.pcie_connectors as psu_has
      FROM gpu g
      CROSS JOIN psu ps
      INNER JOIN pc_parts p1 ON p1.id = g.id
      INNER JOIN pc_parts p2 ON p2.id = ps.id
      WHERE p1.kiosk_visible = true 
        AND p2.kiosk_visible = true
        AND g.pcie_8pin > 0
        AND ps.pcie_connectors LIKE '1x 8-pin'
        AND g.pcie_8pin > 1
      LIMIT 5
    `);
    
    gpuPsuIssues.rows.forEach(issue => {
      console.log(`  ❌ ${issue.gpu_name} needs ${issue.gpu_needs}x 8-pin > ${issue.psu_name} has ${issue.psu_has}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                    ANALYSIS COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');

    await pool.end();
  } catch(e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

analyzeCompatibilitySpecs();
