const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST, 
  database: process.env.DB_NAME,
  password: 'humbleludwig13',
  port: process.env.DB_PORT
});

async function populateSpecifications() {
  try {
    console.log('🚀 Starting K-Wise Stock Specifications Population...\n');

    // Category mapping from pc_parts to actual table names
    const categoryTableMap = {
      'CPU': 'cpu',
      'GPU': 'gpu', 
      'RAM': 'ram',
      'Storage': 'storage',
      'Motherboard': 'motherboard',
      'PSU': 'psu',
      'Case': 'pc_case',
      'Cooling': 'cooling',
      'Headphones': 'headphones',
      'Keyboard': 'keyboard',
      'Monitor': 'monitor',
      'Mouse': 'mouse',
      'Speakers': 'speakers',
      'Webcam': 'webcam'
    };

    // Check current pc_parts items
    const partsResult = await pool.query(`
      SELECT id, name, category, specifications 
      FROM pc_parts 
      WHERE is_active = true 
      ORDER BY category, name
    `);

    console.log(`📊 Found ${partsResult.rows.length} items in pc_parts table\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const part of partsResult.rows) {
      const tableName = categoryTableMap[part.category];
      
      if (!tableName) {
        console.log(`⚠️  Unknown category: ${part.category} for item: ${part.name}`);
        skippedCount++;
        continue;
      }

      try {
        // Try to find matching item in category table by name
        let matchQuery = '';
        let specifications = {};

        // Build query based on category
        switch (part.category) {
          case 'CPU':
            const cpuResult = await pool.query(`
              SELECT launched, socket, series, base_clock, turbo_clock, cores, threads, 
                     integrated_gpu, max_ram, lithography, tdp, max_supported_ram, multithreading_supported
              FROM cpu 
              WHERE LOWER(name) LIKE LOWER($1) 
              LIMIT 1
            `, [`%${part.name.split(' ').slice(0, 3).join(' ')}%`]);
            
            if (cpuResult.rows.length > 0) {
              const cpu = cpuResult.rows[0];
              specifications = {
                launched: cpu.launched,
                socket: cpu.socket,
                series: cpu.series,
                base_clock: cpu.base_clock,
                turbo_clock: cpu.turbo_clock,
                cores: cpu.cores,
                threads: cpu.threads,
                integrated_gpu: cpu.integrated_gpu,
                max_ram: cpu.max_ram,
                lithography: cpu.lithography,
                tdp: cpu.tdp,
                max_supported_ram: cpu.max_supported_ram,
                multithreading_supported: cpu.multithreading_supported
              };
            }
            break;

          case 'GPU':
            const gpuResult = await pool.query(`
              SELECT launched, memory_type, memory_capacity, core_clock, boost_clock, effective_clock,
                     interface, frame_sync, length, tdp, pcie_8pin, ports_hdmi, fans
              FROM gpu 
              WHERE LOWER(name) LIKE LOWER($1) 
              LIMIT 1
            `, [`%${part.name.split(' ').slice(0, 3).join(' ')}%`]);
            
            if (gpuResult.rows.length > 0) {
              const gpu = gpuResult.rows[0];
              specifications = {
                launched: gpu.launched,
                memory_type: gpu.memory_type,
                memory_capacity: gpu.memory_capacity,
                core_clock: gpu.core_clock,
                boost_clock: gpu.boost_clock,
                effective_clock: gpu.effective_clock,
                interface: gpu.interface,
                frame_sync: gpu.frame_sync,
                length: gpu.length,
                tdp: gpu.tdp,
                pcie_8pin: gpu.pcie_8pin,
                ports_hdmi: gpu.ports_hdmi,
                fans: gpu.fans
              };
            }
            break;

          case 'RAM':
            const ramResult = await pool.query(`
              SELECT memory_type, configuration, speed, voltage, cas_latency, total_capacity
              FROM ram 
              WHERE LOWER(name) LIKE LOWER($1) 
              LIMIT 1
            `, [`%${part.name.split(' ').slice(0, 3).join(' ')}%`]);
            
            if (ramResult.rows.length > 0) {
              const ram = ramResult.rows[0];
              specifications = {
                memory_type: ram.memory_type,
                configuration: ram.configuration,
                speed: ram.speed,
                voltage: ram.voltage,
                cas_latency: ram.cas_latency,
                total_capacity: ram.total_capacity
              };
            }
            break;

          case 'Storage':
            const storageResult = await pool.query(`
              SELECT capacity, storage_type, interface, nvme_support, cache, m2_type, 
                     read_speed, write_speed, form_factor
              FROM storage 
              WHERE LOWER(name) LIKE LOWER($1) 
              LIMIT 1
            `, [`%${part.name.split(' ').slice(0, 3).join(' ')}%`]);
            
            if (storageResult.rows.length > 0) {
              const storage = storageResult.rows[0];
              specifications = {
                capacity: storage.capacity,
                storage_type: storage.storage_type,
                interface: storage.interface,
                nvme_support: storage.nvme_support,
                cache: storage.cache,
                m2_type: storage.m2_type,
                read_speed: storage.read_speed,
                write_speed: storage.write_speed,
                form_factor: storage.form_factor
              };
            }
            break;

          case 'Motherboard':
            const motherboardResult = await pool.query(`
              SELECT socket, chipset, memory_type, max_ram, ram_slots, m2_slots, 
                     ethernet_ports, wireless_networking, integrated_gpu_support
              FROM motherboard 
              WHERE LOWER(name) LIKE LOWER($1) 
              LIMIT 1
            `, [`%${part.name.split(' ').slice(0, 3).join(' ')}%`]);
            
            if (motherboardResult.rows.length > 0) {
              const mb = motherboardResult.rows[0];
              specifications = {
                socket: mb.socket,
                chipset: mb.chipset,
                memory_type: mb.memory_type,
                max_ram: mb.max_ram,
                ram_slots: mb.ram_slots,
                m2_slots: mb.m2_slots,
                ethernet_ports: mb.ethernet_ports,
                wireless_networking: mb.wireless_networking,
                integrated_gpu_support: mb.integrated_gpu_support
              };
            }
            break;

          case 'PSU':
            const psuResult = await pool.query(`
              SELECT form_factor, efficiency_rating, wattage, length, modular, 
                     pcie_connectors, sata_connectors
              FROM psu 
              WHERE LOWER(name) LIKE LOWER($1) 
              LIMIT 1
            `, [`%${part.name.split(' ').slice(0, 3).join(' ')}%`]);
            
            if (psuResult.rows.length > 0) {
              const psu = psuResult.rows[0];
              specifications = {
                form_factor: psu.form_factor,
                efficiency_rating: psu.efficiency_rating,
                wattage: psu.wattage,
                length: psu.length,
                modular: psu.modular,
                pcie_connectors: psu.pcie_connectors,
                sata_connectors: psu.sata_connectors
              };
            }
            break;

          case 'Case':
            const caseResult = await pool.query(`
              SELECT category, color, fans_included, case_category, max_gpu_length, 
                     max_cpu_cooler_height, tempered_glass
              FROM pc_case 
              WHERE LOWER(name) LIKE LOWER($1) 
              LIMIT 1
            `, [`%${part.name.split(' ').slice(0, 3).join(' ')}%`]);
            
            if (caseResult.rows.length > 0) {
              const pcCase = caseResult.rows[0];
              specifications = {
                category: pcCase.category,
                color: pcCase.color,
                fans_included: pcCase.fans_included,
                case_category: pcCase.case_category,
                max_gpu_length: pcCase.max_gpu_length,
                max_cpu_cooler_height: pcCase.max_cpu_cooler_height,
                tempered_glass: pcCase.tempered_glass
              };
            }
            break;

          case 'Cooling':
            const coolingResult = await pool.query(`
              SELECT max_rpm, max_noise, height, water_cooled, fanless
              FROM cooling 
              WHERE LOWER(name) LIKE LOWER($1) 
              LIMIT 1
            `, [`%${part.name.split(' ').slice(0, 3).join(' ')}%`]);
            
            if (coolingResult.rows.length > 0) {
              const cooling = coolingResult.rows[0];
              specifications = {
                max_rpm: cooling.max_rpm,
                max_noise: cooling.max_noise,
                height: cooling.height,
                water_cooled: cooling.water_cooled,
                fanless: cooling.fanless
              };
            }
            break;

          case 'Headphones':
            const headphonesResult = await pool.query(`
              SELECT type, frequency, microphone, wireless, enclosure, color
              FROM headphones 
              WHERE LOWER(name) LIKE LOWER($1) 
              LIMIT 1
            `, [`%${part.name.split(' ').slice(0, 3).join(' ')}%`]);
            
            if (headphonesResult.rows.length > 0) {
              const headphones = headphonesResult.rows[0];
              specifications = {
                type: headphones.type,
                frequency: headphones.frequency,
                microphone: headphones.microphone,
                wireless: headphones.wireless,
                enclosure: headphones.enclosure,
                color: headphones.color
              };
            }
            break;

          case 'Keyboard':
            const keyboardResult = await pool.query(`
              SELECT style, switch_type, backlit, tenkeyless, connection_type, color, polling_rate
              FROM keyboard 
              WHERE LOWER(name) LIKE LOWER($1) 
              LIMIT 1
            `, [`%${part.name.split(' ').slice(0, 3).join(' ')}%`]);
            
            if (keyboardResult.rows.length > 0) {
              const keyboard = keyboardResult.rows[0];
              specifications = {
                style: keyboard.style,
                switch_type: keyboard.switch_type,
                backlit: keyboard.backlit,
                tenkeyless: keyboard.tenkeyless,
                connection_type: keyboard.connection_type,
                color: keyboard.color,
                polling_rate: keyboard.polling_rate
              };
            }
            break;

          case 'Monitor':
            const monitorResult = await pool.query(`
              SELECT screen_size, resolution, refresh_rate, response_time, panel_type, 
                     aspect_ratio, curved, vesa_mount
              FROM monitor 
              WHERE LOWER(name) LIKE LOWER($1) 
              LIMIT 1
            `, [`%${part.name.split(' ').slice(0, 3).join(' ')}%`]);
            
            if (monitorResult.rows.length > 0) {
              const monitor = monitorResult.rows[0];
              specifications = {
                screen_size: monitor.screen_size,
                resolution: monitor.resolution,
                refresh_rate: monitor.refresh_rate,
                response_time: monitor.response_time,
                panel_type: monitor.panel_type,
                aspect_ratio: monitor.aspect_ratio,
                curved: monitor.curved,
                vesa_mount: monitor.vesa_mount
              };
            }
            break;

          case 'Mouse':
            const mouseResult = await pool.query(`
              SELECT tracking_method, connection_type, dpi, hand_orientation, color, 
                     programmable_buttons, polling_rate
              FROM mouse 
              WHERE LOWER(name) LIKE LOWER($1) 
              LIMIT 1
            `, [`%${part.name.split(' ').slice(0, 3).join(' ')}%`]);
            
            if (mouseResult.rows.length > 0) {
              const mouse = mouseResult.rows[0];
              specifications = {
                tracking_method: mouse.tracking_method,
                connection_type: mouse.connection_type,
                dpi: mouse.dpi,
                hand_orientation: mouse.hand_orientation,
                color: mouse.color,
                programmable_buttons: mouse.programmable_buttons,
                polling_rate: mouse.polling_rate
              };
            }
            break;

          case 'Speakers':
            const speakersResult = await pool.query(`
              SELECT configuration, total_wattage, frequency_response, color
              FROM speakers 
              WHERE LOWER(name) LIKE LOWER($1) 
              LIMIT 1
            `, [`%${part.name.split(' ').slice(0, 3).join(' ')}%`]);
            
            if (speakersResult.rows.length > 0) {
              const speakers = speakersResult.rows[0];
              specifications = {
                configuration: speakers.configuration,
                total_wattage: speakers.total_wattage,
                frequency_response: speakers.frequency_response,
                color: speakers.color
              };
            }
            break;

          case 'Webcam':
            const webcamResult = await pool.query(`
              SELECT resolution, connection, focus_type, operating_system, fov_angle, 
                     frame_rate, microphone_builtin
              FROM webcam 
              WHERE LOWER(name) LIKE LOWER($1) 
              LIMIT 1
            `, [`%${part.name.split(' ').slice(0, 3).join(' ')}%`]);
            
            if (webcamResult.rows.length > 0) {
              const webcam = webcamResult.rows[0];
              specifications = {
                resolution: webcam.resolution,
                connection: webcam.connection,
                focus_type: webcam.focus_type,
                operating_system: webcam.operating_system,
                fov_angle: webcam.fov_angle,
                frame_rate: webcam.frame_rate,
                microphone_builtin: webcam.microphone_builtin
              };
            }
            break;
        }

        // Remove null values and clean up the specifications
        const cleanedSpecs = {};
        for (const [key, value] of Object.entries(specifications)) {
          if (value !== null && value !== undefined && value !== '') {
            cleanedSpecs[key] = value;
          }
        }

        if (Object.keys(cleanedSpecs).length > 0) {
          // Update pc_parts with specifications
          await pool.query(`
            UPDATE pc_parts 
            SET specifications = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
          `, [JSON.stringify(cleanedSpecs), part.id]);

          console.log(`✅ Updated ${part.category}: ${part.name} (${Object.keys(cleanedSpecs).length} specs)`);
          updatedCount++;
        } else {
          console.log(`⚠️  No matching data found for ${part.category}: ${part.name}`);
          skippedCount++;
        }

      } catch (error) {
        console.log(`❌ Error processing ${part.category}: ${part.name} - ${error.message}`);
        skippedCount++;
      }
    }

    console.log(`\n📊 Population Summary:`);
    console.log(`✅ Updated: ${updatedCount} items`);
    console.log(`⚠️  Skipped: ${skippedCount} items`);
    console.log(`📈 Total: ${updatedCount + skippedCount} items processed`);

    await pool.end();
    console.log('\n🎯 Specification population completed!');

  } catch (error) {
    console.error('❌ Population failed:', error.message);
    await pool.end();
  }
}

populateSpecifications();