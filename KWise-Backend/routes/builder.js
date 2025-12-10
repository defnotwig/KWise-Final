const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const logger = require('../utils/logger');
const compatibilityRules = require('../services/compatibilityRules');

/**
 * Guided PC Builder Controller
 * Provides step-by-step component selection with real-time compatibility filtering
 * Enhanced with Phase 2 deterministic compatibility rules
 */

// Build step order
const BUILD_STEPS = ['CPU', 'Cooling', 'Motherboard', 'RAM', 'Storage', 'GPU', 'Case', 'PSU'];

/**
 * GET /api/builder/available/:category
 * Get available compatible options for the next build step
 */
router.get('/available/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const selectedParts = req.query.selectedParts ? JSON.parse(req.query.selectedParts) : {};

    logger.info(`Fetching available ${category} with filters:`, selectedParts);

    let sqlQuery;
    let params = [];
    let paramIndex = 1;

    switch (category.toUpperCase()) {
      case 'CPU':
        // CPU is first step - show all active CPUs
        sqlQuery = `
          SELECT cpu.id, cpu.name, cpu.socket, cpu.series, cpu.cores, cpu.threads, cpu.integrated_gpu, 
                 cpu.tdp, cpu.base_clock, cpu.turbo_clock, cpu.price,
                 COALESCE(p.image_url, p.image_path) AS "imageUrl",
                 p.brand,
                 p.specifications,
                 p.dimensions,
                 'CPU' as category
          FROM cpu 
          INNER JOIN pc_parts p ON p.id = cpu.id
          WHERE cpu.id IN (SELECT id FROM pc_parts WHERE category = 'CPU' AND is_active = true AND kiosk_visible = true)
          ORDER BY cpu.price ASC
        `;
        break;

      case 'COOLING':
        // Filter cooling by CPU socket compatibility
        if (selectedParts.CPU && selectedParts.CPU.socket) {
          sqlQuery = `
            SELECT DISTINCT 
              c.id, c.name, c.max_rpm, c.max_noise, c.height, 
              c.water_cooled, c.fanless, c.price,
              p.compatible_sockets,
              p.specifications,
              p.dimensions,
              COALESCE(p.image_url, p.image_path) AS "imageUrl",
              p.brand,
              'Cooling' as category
            FROM cooling c
            INNER JOIN pc_parts p ON p.id = c.id AND p.category = 'Cooling'
            WHERE p.is_active = true 
              AND p.kiosk_visible = true
              AND p.compatible_sockets @> $${paramIndex++}::jsonb
            ORDER BY c.price ASC
          `;
          params.push(JSON.stringify([selectedParts.CPU.socket]));
        } else {
          // No CPU selected yet - show all cooling
          sqlQuery = `
            SELECT c.id, c.name, c.max_rpm, c.max_noise, c.height, 
                   c.water_cooled, c.fanless, c.price,
                   p.image_url AS "imageUrl",
                   p.brand,
                   'Cooling' as category
            FROM cooling c
            INNER JOIN pc_parts p ON p.id = c.id
            WHERE c.id IN (SELECT id FROM pc_parts WHERE category = 'Cooling' AND is_active = true AND kiosk_visible = true)
            ORDER BY c.price ASC
          `;
        }
        break;

      case 'MOTHERBOARD':
        // Filter motherboard by CPU socket
        if (selectedParts.CPU) {
          // FIX: Check both top-level and specifications.socket
          const cpuSocket = selectedParts.CPU.socket || selectedParts.CPU.specifications?.socket;
          
          if (cpuSocket) {
            logger.info(`🔍 [BUILDER] Motherboard filtering for CPU socket: ${cpuSocket}`);
            
            sqlQuery = `
              SELECT mb.id, mb.name, mb.socket, mb.chipset, mb.memory_type, mb.max_ram, 
                     mb.ram_slots, mb.m2_slots, mb.wireless_networking, 
                     mb.integrated_gpu_support, mb.price,
                     COALESCE(p.image_url, p.image_path) AS "imageUrl",
                     p.brand,
                     p.specifications,
                     p.dimensions,
                     'Motherboard' as category
              FROM motherboard mb
              INNER JOIN pc_parts p ON p.id = mb.id
              WHERE mb.socket = $${paramIndex++}
                AND mb.id IN (SELECT id FROM pc_parts WHERE category = 'Motherboard' AND is_active = true AND kiosk_visible = true)
              ORDER BY mb.price ASC
            `;
            params.push(cpuSocket);
            
            logger.info(`✅ [BUILDER] Filtering Motherboards: Only ${cpuSocket} socket`);
          } else {
            logger.warn(`⚠️ [BUILDER] CPU selected but socket not specified - showing all motherboards`);
            // No socket info - show all
            sqlQuery = `
              SELECT mb.id, mb.name, mb.socket, mb.chipset, mb.memory_type, mb.max_ram, 
                     mb.ram_slots, mb.m2_slots, mb.price,
                   p.image_url AS "imageUrl",
                   p.brand,
                   p.specifications,
                   p.dimensions,
                   'Motherboard' as category
              FROM motherboard mb
              INNER JOIN pc_parts p ON p.id = mb.id
              WHERE mb.id IN (SELECT id FROM pc_parts WHERE category = 'Motherboard' AND is_active = true AND kiosk_visible = true)
              ORDER BY mb.price ASC
            `;
          }
        } else {
          logger.warn(`⚠️ [BUILDER] Motherboard requested but no CPU selected - showing all`);
          // No CPU selected - show all
          sqlQuery = `
            SELECT mb.id, mb.name, mb.socket, mb.chipset, mb.memory_type, mb.max_ram, 
                   mb.ram_slots, mb.m2_slots, mb.price,
                   p.image_url AS "imageUrl",
                   p.brand,
                   p.specifications,
                   p.dimensions,
                   'Motherboard' as category
            FROM motherboard mb
            INNER JOIN pc_parts p ON p.id = mb.id
            WHERE mb.id IN (SELECT id FROM pc_parts WHERE category = 'Motherboard' AND is_active = true AND kiosk_visible = true)
            ORDER BY mb.price ASC
          `;
        }
        break;

      case 'RAM':
        // Filter RAM by motherboard memory type - STRICT FILTERING
        if (selectedParts.Motherboard) {
          // FIX: Check both top-level and specifications.memory_type
          const memoryType = selectedParts.Motherboard.memory_type || selectedParts.Motherboard.specifications?.memory_type;
          
          logger.info(`🔍 [BUILDER] RAM filtering for motherboard: ${selectedParts.Motherboard.name}`);
          logger.info(`   Memory Type: ${memoryType}`);
          
          // FIX: Require memory_type to be set - reject undefined/null/empty
          if (!memoryType || memoryType === 'null' || memoryType === 'undefined' || memoryType === '') {
            logger.error(`❌ [BUILDER] Motherboard ${selectedParts.Motherboard.name} missing memory_type!`);
            return res.status(400).json({
              success: false,
              message: 'Selected motherboard has incomplete specifications',
              hint: 'Motherboard memory_type must be DDR4 or DDR5. Please contact administrator.',
              motherboard: {
                id: selectedParts.Motherboard.id,
                name: selectedParts.Motherboard.name,
                missingField: 'memory_type'
              }
            });
          }
          
          // FIX: Strict filtering - only exact memory type match
          sqlQuery = `
            SELECT r.id, r.name, r.memory_type, r.configuration, r.speed, 
                   r.cas_latency, r.total_capacity, r.voltage, r.price,
                   p.image_url AS "imageUrl",
                   p.brand,
                   p.specifications,
                   p.dimensions,
                   'RAM' as category
            FROM ram r
            INNER JOIN pc_parts p ON p.id = r.id
            WHERE r.memory_type = $${paramIndex++}
              AND r.id IN (SELECT id FROM pc_parts WHERE category = 'RAM' AND is_active = true AND kiosk_visible = true)
            ORDER BY r.price ASC
          `;
          params.push(memoryType);
          
          logger.info(`✅ [BUILDER] Filtering RAM: Only ${memoryType} modules will be shown`);
        } else {
          logger.warn(`⚠️ [BUILDER] RAM requested but no Motherboard selected - showing all RAM`);
          // No motherboard selected - show all
          sqlQuery = `
            SELECT r.id, r.name, r.memory_type, r.configuration, r.speed, 
                   r.total_capacity, r.price,
                   p.image_url AS "imageUrl",
                   p.brand,
                   p.specifications,
                   p.dimensions,
                   'RAM' as category
            FROM ram r
            INNER JOIN pc_parts p ON p.id = r.id
            WHERE r.id IN (SELECT id FROM pc_parts WHERE category = 'RAM' AND is_active = true AND kiosk_visible = true)
            ORDER BY r.price ASC
          `;
        }
        break;

      case 'STORAGE':
        // Storage has no dependencies - show all
        sqlQuery = `
          SELECT s.id, s.name, s.capacity, s.storage_type, s.interface, 
                 s.nvme_support, s.form_factor, s.read_speed, s.write_speed, s.price,
                 p.image_url AS "imageUrl",
                 p.brand,
                 p.specifications,
                 p.dimensions,
                 'Storage' as category
          FROM storage s
          INNER JOIN pc_parts p ON p.id = s.id
          WHERE s.id IN (SELECT id FROM pc_parts WHERE category = 'Storage' AND is_active = true AND kiosk_visible = true)
          ORDER BY s.price ASC
        `;
        break;

      case 'GPU':
        // Filter GPU by case max length (if case selected)
        // Also consider if CPU has integrated GPU (GPU is optional)
        let gpuFilters = [];
        
        if (selectedParts.Case && selectedParts.Case.max_gpu_length) {
          const maxLength = parseInt(selectedParts.Case.max_gpu_length);
          if (!isNaN(maxLength)) {
            gpuFilters.push(`length <= ${maxLength}`);
          }
        }

        sqlQuery = `
          SELECT g.id, g.name, g.memory_type, g.memory_capacity, g.core_clock, 
                 g.boost_clock, g.length, g.tdp, g.pcie_8pin, g.overall_score, g.price,
                 p.image_url AS "imageUrl",
                 p.brand,
                 p.specifications,
                 p.dimensions,
                 'GPU' as category
          FROM gpu g
          INNER JOIN pc_parts p ON p.id = g.id
          WHERE g.id IN (SELECT id FROM pc_parts WHERE category = 'GPU' AND is_active = true AND kiosk_visible = true)
          ${gpuFilters.length > 0 ? 'AND ' + gpuFilters.join(' AND ') : ''}
          ORDER BY g.price ASC
        `;
        break;

      case 'CASE':
        // Filter case by max GPU length and cooler height
        sqlQuery = `
          SELECT c.id, c.name, c.case_category, c.color, c.fans_included, 
                 c.max_gpu_length, c.max_cpu_cooler_height, c.motherboard_support,
                 c.tempered_glass, c.price,
                 p.image_url AS "imageUrl",
                 p.brand,
                 p.specifications,
                 p.dimensions,
                 'Case' as category
          FROM pc_case c
          INNER JOIN pc_parts p ON p.id = c.id
          WHERE c.id IN (SELECT id FROM pc_parts WHERE category = 'Case' AND is_active = true AND kiosk_visible = true)
          ORDER BY c.price ASC
        `;
        break;

      case 'PSU':
        // Filter PSU by total TDP (CPU + GPU + overhead)
        let minWattage = 400; // Minimum recommended
        
        if (selectedParts.CPU && selectedParts.GPU) {
          const cpuTdp = selectedParts.CPU.tdp || 65;
          const gpuTdp = selectedParts.GPU.tdp || 75;
          minWattage = Math.max(minWattage, cpuTdp + gpuTdp + 200); // Add 200W overhead
        } else if (selectedParts.CPU) {
          const cpuTdp = selectedParts.CPU.tdp || 65;
          minWattage = Math.max(minWattage, cpuTdp + 150);
        }

        sqlQuery = `
          SELECT ps.id, ps.name, ps.form_factor, ps.efficiency_rating, ps.wattage, 
                 ps.modular, ps.pcie_connectors, ps.sata_connectors, ps.price,
                 p.image_url AS "imageUrl",
                 p.brand,
                 p.specifications,
                 p.dimensions,
                 'PSU' as category
          FROM psu ps
          INNER JOIN pc_parts p ON p.id = ps.id
          WHERE ps.wattage >= $${paramIndex++}
            AND ps.id IN (SELECT id FROM pc_parts WHERE category = 'PSU' AND is_active = true AND kiosk_visible = true)
          ORDER BY ps.wattage ASC, ps.price ASC
        `;
        params.push(minWattage);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Invalid category: ${category}`
        });
    }

    const result = await query(sqlQuery, params);

    logger.info(`Found ${result.rows.length} compatible ${category} options`);

    // FIX: Transform rows to include specifications object
    const transformedRows = result.rows.map(row => {
      // If specifications already exist in pc_parts, use them
      // Otherwise, construct from category-specific fields
      if (!row.specifications) {
        row.specifications = {};
        
        // Motherboard-specific fields
        if (category === 'MOTHERBOARD' || category === 'Motherboard') {
          row.specifications.socket = row.socket;
          row.specifications.chipset = row.chipset;
          row.specifications.memory_type = row.memory_type;
          row.specifications.max_ram = row.max_ram;
          row.specifications.ram_slots = row.ram_slots;
          row.specifications.m2_slots = row.m2_slots;
          row.specifications.form_factor = row.form_factor;
        }
        
        // RAM-specific fields
        if (category === 'RAM') {
          row.specifications.memory_type = row.memory_type;
          row.specifications.speed = row.speed;
          row.specifications.cas_latency = row.cas_latency;
          row.specifications.total_capacity = row.total_capacity;
          row.specifications.configuration = row.configuration;
        }
        
        // CPU-specific fields
        if (category === 'CPU') {
          row.specifications.socket = row.socket;
          row.specifications.cores = row.cores;
          row.specifications.threads = row.threads;
          row.specifications.tdp = row.tdp;
          row.specifications.integrated_gpu = row.integrated_gpu;
        }
        
        // GPU-specific fields
        if (category === 'GPU') {
          row.specifications.memory_type = row.memory_type;
          row.specifications.memory_capacity = row.memory_capacity;
          row.specifications.tdp = row.tdp;
          row.specifications.length = row.length;
        }
        
        // PSU-specific fields
        if (category === 'PSU') {
          row.specifications.wattage = row.wattage;
          row.specifications.efficiency = row.efficiency;
          row.specifications.modular = row.modular;
        }
        
        // Case-specific fields
        if (category === 'CASE' || category === 'Case') {
          row.specifications.max_gpu_length = row.max_gpu_length;
          row.specifications.max_cpu_cooler_height = row.max_cpu_cooler_height;
          row.specifications.motherboard_support = row.motherboard_support;
          row.specifications.form_factor = row.case_category;
        }
        
        // Storage-specific fields
        if (category === 'STORAGE' || category === 'Storage') {
          row.specifications.capacity = row.capacity;
          row.specifications.storage_type = row.storage_type;
          row.specifications.interface = row.interface;
          row.specifications.nvme_support = row.nvme_support;
        }
        
        // Cooling-specific fields
        if (category === 'COOLING' || category === 'Cooling') {
          row.specifications.height = row.height;
          row.specifications.tdp_rating = row.tdp_rating;
          row.specifications.water_cooled = row.water_cooled;
        }
      }
      
      return row;
    });

    // ============================================================================
    // PHASE 2 COMPATIBILITY ANALYSIS
    // ============================================================================
    // Run deterministic compatibility checks on each product
    const analyzedProducts = await analyzeProductCompatibility(transformedRows, selectedParts, category);

    res.json({
      success: true,
      data: analyzedProducts,
      filters: selectedParts,
      count: analyzedProducts.length,
      compatibilityEnabled: true
    });

  } catch (error) {
    logger.error(`Error fetching available ${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available options',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/builder/check-compatibility
 * Run comprehensive compatibility check on the current build
 */
router.post('/check-compatibility', async (req, res) => {
  try {
    const { build } = req.body;

    if (!build || typeof build !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Build object is required'
      });
    }

    logger.info('Running compatibility check on build:', Object.keys(build));

    const warnings = [];
    const recommendations = [];
    let score = 100;

    // Extract component IDs and fetch full details from database
    const db = require('../config/db');
    
    let cpu = build.CPU;
    let motherboard = build.Motherboard;
    let ram = build.RAM;
    let gpu = build.GPU;
    let psu = build.PSU;
    let caseItem = build.Case;
    let cooling = build.Cooling;
    let storage = build.Storage;

    // Fetch full component details if only ID is provided
    if (cpu && cpu.id && !cpu.socket) {
      const result = await db.query('SELECT * FROM cpu WHERE id = $1', [cpu.id]);
      if (result.rows[0]) cpu = { ...cpu, ...result.rows[0] };
    }
    
    if (motherboard && motherboard.id && !motherboard.socket) {
      const result = await db.query('SELECT * FROM motherboard WHERE id = $1', [motherboard.id]);
      if (result.rows[0]) motherboard = { ...motherboard, ...result.rows[0] };
    }
    
    if (ram && ram.id && !ram.memory_type) {
      const result = await db.query('SELECT * FROM ram WHERE id = $1', [ram.id]);
      if (result.rows[0]) ram = { ...ram, ...result.rows[0] };
    }
    
    if (gpu && gpu.id && !gpu.tdp) {
      const result = await db.query('SELECT * FROM gpu WHERE id = $1', [gpu.id]);
      if (result.rows[0]) gpu = { ...gpu, ...result.rows[0] };
    }
    
    if (psu && psu.id && !psu.wattage) {
      const result = await db.query('SELECT * FROM psu WHERE id = $1', [psu.id]);
      if (result.rows[0]) psu = { ...psu, ...result.rows[0] };
    }
    
    if (caseItem && caseItem.id && !caseItem.max_gpu_length) {
      const result = await db.query('SELECT * FROM pc_case WHERE id = $1', [caseItem.id]);
      if (result.rows[0]) caseItem = { ...caseItem, ...result.rows[0] };
    }
    
    if (cooling && cooling.id && !cooling.compatible_sockets) {
      const result = await db.query('SELECT * FROM cooling WHERE id = $1', [cooling.id]);
      if (result.rows[0]) cooling = { ...cooling, ...result.rows[0] };
    }
    
    if (storage && storage.id && !storage.storage_type) {
      const result = await db.query('SELECT * FROM storage WHERE id = $1', [storage.id]);
      if (result.rows[0]) storage = { ...storage, ...result.rows[0] };
    }
    
    logger.info('Compatibility check with full component details:', {
      hasCpuSocket: !!cpu?.socket,
      hasMoboSocket: !!motherboard?.socket,
      hasRamType: !!ram?.memory_type,
      hasPsuWattage: !!psu?.wattage
    });

    // 1. CPU ↔ Motherboard Socket Compatibility
    if (cpu && motherboard) {
      if (cpu.socket !== motherboard.socket) {
        warnings.push({
          severity: 'critical',
          message: `CPU socket ${cpu.socket} is incompatible with motherboard socket ${motherboard.socket}`,
          affected: ['CPU', 'Motherboard']
        });
        score -= 30;
      }
    }

    // 2. RAM ↔ Motherboard Compatibility
    if (ram && motherboard) {
      if (ram.memory_type !== motherboard.memory_type) {
        warnings.push({
          severity: 'critical',
          message: `RAM type ${ram.memory_type} is not supported by motherboard (requires ${motherboard.memory_type})`,
          affected: ['RAM', 'Motherboard']
        });
        score -= 25;
      }
    }

    // 3. PSU Wattage Check
    if (psu && cpu) {
      let totalTdp = cpu.tdp || 65;
      if (gpu) {
        totalTdp += gpu.tdp || 75;
      }
      totalTdp += 150; // Add overhead for other components

      if (psu.wattage < totalTdp) {
        warnings.push({
          severity: 'major',
          message: `PSU wattage (${psu.wattage}W) may be insufficient. Recommended: ${totalTdp}W+`,
          affected: ['PSU']
        });
        score -= 20;
        recommendations.push({
          category: 'PSU',
          reason: `Upgrade to ${Math.ceil(totalTdp / 50) * 50}W or higher for stability and future upgrades`
        });
      } else if (psu.wattage < totalTdp * 1.3) {
        warnings.push({
          severity: 'minor',
          message: `PSU wattage is adequate but consider ${Math.ceil(totalTdp * 1.5 / 50) * 50}W for future upgrades`,
          affected: ['PSU']
        });
        score -= 5;
      }
    }

    // 4. Case Clearance Checks
    if (caseItem) {
      // GPU Length
      if (gpu && caseItem.max_gpu_length) {
        const maxGpuLength = parseInt(caseItem.max_gpu_length);
        if (!isNaN(maxGpuLength) && gpu.length > maxGpuLength) {
          warnings.push({
            severity: 'critical',
            message: `GPU length (${gpu.length}mm) exceeds case maximum (${maxGpuLength}mm)`,
            affected: ['GPU', 'Case']
          });
          score -= 25;
        }
      }

      // CPU Cooler Height
      if (cooling && caseItem.max_cpu_cooler_height) {
        const maxCoolerHeight = parseInt(caseItem.max_cpu_cooler_height);
        if (!isNaN(maxCoolerHeight) && cooling.height && cooling.height > maxCoolerHeight) {
          warnings.push({
            severity: 'critical',
            message: `CPU cooler height (${cooling.height}mm) exceeds case maximum (${maxCoolerHeight}mm)`,
            affected: ['Cooling', 'Case']
          });
          score -= 20;
        }
      }
    }

    // 5. Cooling ↔ CPU Socket Compatibility
    if (cooling && cpu) {
      // This check is already done in the filter, but double-check here
      // (We'll rely on the compatible_sockets field we added)
    }

    // 6. GPU Optional Check
    if (!gpu && cpu && !cpu.integrated_gpu) {
      warnings.push({
        severity: 'minor',
        message: 'No dedicated GPU selected and CPU does not have integrated graphics. System may not display video output.',
        affected: ['GPU']
      });
      score -= 10;
      recommendations.push({
        category: 'GPU',
        reason: 'Add a dedicated GPU for video output, or select a CPU with integrated graphics'
      });
    }

    // 7. Storage Check
    if (!storage) {
      warnings.push({
        severity: 'major',
        message: 'No storage device selected. System requires at least one storage device.',
        affected: ['Storage']
      });
      score -= 15;
    }

    // 8. Motherboard RAM Capacity Check
    if (motherboard && ram) {
      const ramCapacity = parseInt(ram.total_capacity) || 0;
      const moboMaxRam = motherboard.max_ram || 128;
      if (ramCapacity > moboMaxRam) {
        warnings.push({
          severity: 'minor',
          message: `RAM capacity (${ramCapacity}GB) exceeds motherboard maximum (${moboMaxRam}GB)`,
          affected: ['RAM', 'Motherboard']
        });
        score -= 5;
      }
    }

    // Generate summary
    let summary;
    if (score >= 90) {
      summary = '✅ Excellent build! All components are compatible with no major issues.';
    } else if (score >= 75) {
      summary = '✅ Good build with minor warnings. Review recommendations for optimal performance.';
    } else if (score >= 50) {
      summary = '⚠️ Build has compatibility concerns. Please address warnings before proceeding.';
    } else {
      summary = '❌ Critical compatibility issues detected. Build may not function properly.';
    }

    // Add general recommendations
    if (score >= 80 && !recommendations.length) {
      recommendations.push({
        category: 'General',
        reason: 'Build looks great! Consider adding more storage or upgrading RAM for better multitasking.'
      });
    }

    res.json({
      success: true,
      data: {
        score,
        warnings,
        recommendations,
        summary,
        build_complete: Object.keys(build).length >= 7, // At least 7 components (GPU optional)
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error checking compatibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check compatibility',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/builder/steps
 * Get the build step order and current progress
 */
router.get('/steps', (req, res) => {
  const completedSteps = req.query.completed ? JSON.parse(req.query.completed) : [];
  
  const steps = BUILD_STEPS.map((step, index) => ({
    order: index + 1,
    category: step,
    completed: completedSteps.includes(step),
    optional: step === 'GPU', // GPU is optional if CPU has integrated graphics
    next: !completedSteps.includes(step)
  }));

  const nextStep = steps.find(s => !s.completed);

  res.json({
    success: true,
    data: {
      steps,
      current_step: nextStep ? nextStep.order : steps.length,
      total_steps: steps.length,
      progress_percentage: Math.round((completedSteps.length / steps.length) * 100)
    }
  });
});

/**
 * ============================================================================
 * HELPER: Analyze Product Compatibility with Phase 2 Rules
 * ============================================================================
 */
async function analyzeProductCompatibility(products, selectedParts, category) {
  try {
    // If no parts selected yet, return products as-is (all compatible at first step)
    if (Object.keys(selectedParts).length === 0) {
      return products.map(product => ({
        ...product,
        compatible: true,
        badge: '✅ Compatible',
        compatibilityScore: 100,
        issues: [],
        recommendations: [],
        biosWarning: null
      }));
    }

    // Load build context for Phase 2 analysis
    const buildContext = await loadBuildContextForBuilder(selectedParts);

    // Analyze each product
    const analyzed = await Promise.all(
      products.map(async (product) => {
        try {
          // Create candidate object
          const candidate = {
            id: product.id,
            category: category,
            specs: await loadProductSpecs(product.id, category, product)
          };

          // Run Phase 2 compatibility check
          const compatResult = await compatibilityRules.computeCompatibilityScore(buildContext, candidate);

          // Determine badge based on score
          let badge = '✅ Compatible';
          let compatible = true;
          
          if (compatResult.score < 60) {
            badge = '❌ Incompatible';
            compatible = false;
          } else if (compatResult.score < 85) {
            badge = '⚠️ May Work';
          }

          // Check for BIOS warnings
          const biosWarning = checkBiosWarningForBuilder(buildContext, candidate);

          // Extract issues and recommendations
          const issues = extractIssues(compatResult);
          const recommendations = extractRecommendations(compatResult);

          return {
            ...product,
            compatible,
            badge,
            compatibilityScore: Math.round(compatResult.score),
            issues,
            recommendations,
            biosWarning,
            ruleResults: compatResult.ruleResults || []
          };

        } catch (error) {
          logger.error(`Error analyzing product ${product.id}:`, error);
          // On error, mark as compatible to avoid blocking user
          return {
            ...product,
            compatible: true,
            badge: '✅ Compatible',
            compatibilityScore: null,
            issues: [],
            recommendations: [],
            biosWarning: null,
            analysisError: true
          };
        }
      })
    );

    return analyzed;

  } catch (error) {
    logger.error('Error in analyzeProductCompatibility:', error);
    // Return products without analysis on error
    return products;
  }
}

/**
 * Load build context for Phase 2 compatibility rules
 */
async function loadBuildContextForBuilder(selectedParts) {
  const context = {};

  for (const [category, part] of Object.entries(selectedParts)) {
    if (part && part.id) {
      context[category] = {
        id: part.id,
        category: category,
        specs: await loadProductSpecs(part.id, category, part)
      };
    }
  }

  return context;
}

/**
 * Load product specs for compatibility analysis
 */
async function loadProductSpecs(productId, category, productData) {
  try {
    // First try to get from pc_parts table
    const result = await query(
      'SELECT specifications FROM pc_parts WHERE id = $1',
      [productId]
    );

    if (result.rows.length > 0 && result.rows[0].specifications) {
      return result.rows[0].specifications;
    }

    // Fallback: construct specs from product data
    return constructSpecsFromProduct(category, productData);

  } catch (error) {
    logger.error(`Error loading specs for product ${productId}:`, error);
    return constructSpecsFromProduct(category, productData);
  }
}

/**
 * Construct specs object from product data
 */
function constructSpecsFromProduct(category, product) {
  const specs = {};

  switch (category) {
    case 'CPU':
      specs.socket = product.socket;
      specs.series = product.series;
      specs.cores = product.cores;
      specs.threads = product.threads;
      specs.tdp = product.tdp;
      specs.integratedGpu = product.integrated_gpu;
      break;

    case 'Cooling':
      specs.height = product.height;
      specs.waterCooled = product.water_cooled;
      break;

    case 'Motherboard':
      specs.socket = product.socket;
      specs.chipset = product.chipset;
      specs.memoryType = product.memory_type;
      specs.maxRam = product.max_ram;
      specs.ramSlots = product.ram_slots;
      specs.m2Slots = product.m2_slots;
      specs.formFactor = product.form_factor;
      break;

    case 'RAM':
      specs.memoryType = product.memory_type;
      specs.speed = product.speed;
      specs.capacity = product.total_capacity;
      break;

    case 'Storage':
      specs.capacity = product.capacity;
      specs.storageType = product.storage_type;
      specs.interface = product.interface;
      specs.nvmeSupport = product.nvme_support;
      break;

    case 'GPU':
      specs.length = product.length;
      specs.tdp = product.tdp;
      specs.pcie8pin = product.pcie_8pin;
      break;

    case 'Case':
      specs.maxGpuLength = product.max_gpu_length;
      specs.maxCpuCoolerHeight = product.max_cpu_cooler_height;
      specs.motherboardSupport = product.motherboard_support;
      break;

    case 'PSU':
      specs.wattage = product.wattage;
      specs.efficiencyRating = product.efficiency_rating;
      specs.modular = product.modular;
      specs.pcieConnectors = product.pcie_connectors;
      break;
  }

  return specs;
}

/**
 * Check for BIOS warnings
 */
function checkBiosWarningForBuilder(buildContext, candidate) {
  // Only check if we have both CPU and Motherboard
  const cpu = buildContext.CPU;
  const motherboard = candidate.category === 'Motherboard' ? candidate : buildContext.Motherboard;

  if (!cpu || !motherboard) return null;

  const cpuName = cpu.specs?.name || '';
  const mbChipset = motherboard.specs?.chipset || '';

  // AMD Ryzen 7000 series on older chipsets
  if (cpuName.includes('7000') || cpuName.includes('7950') || cpuName.includes('7900') || cpuName.includes('7700') || cpuName.includes('7600')) {
    if (mbChipset.includes('X570') || mbChipset.includes('B550')) {
      return '⚠️ BIOS update required for Ryzen 7000 series on X570/B550';
    }
  }

  // AMD Ryzen 5000 series on 400-series chipsets
  if (cpuName.includes('5000') || cpuName.includes('5950') || cpuName.includes('5900') || cpuName.includes('5800') || cpuName.includes('5600')) {
    if (mbChipset.includes('X470') || mbChipset.includes('B450') || mbChipset.includes('A320')) {
      return '⚠️ BIOS update required for Ryzen 5000 series on 400-series chipsets';
    }
  }

  // Intel 13th/14th gen on 600-series chipsets
  if (cpuName.includes('13') || cpuName.includes('14')) {
    if (mbChipset.includes('Z690') || mbChipset.includes('B660') || mbChipset.includes('H670')) {
      return '⚠️ BIOS update may be required for 13th/14th gen Intel CPUs on 600-series chipsets';
    }
  }

  return null;
}

/**
 * Extract issues from compatibility result
 */
function extractIssues(compatResult) {
  const issues = [];

  // 🔥 FIX: ruleResults is an OBJECT, not an array
  if (compatResult.ruleResults && typeof compatResult.ruleResults === 'object') {
    Object.values(compatResult.ruleResults).forEach(rule => {
      if (rule && rule.issues && Array.isArray(rule.issues) && rule.issues.length > 0) {
        issues.push(...rule.issues);
      }
    });
  }

  return issues;
}

/**
 * Extract recommendations from compatibility result
 */
function extractRecommendations(compatResult) {
  const recommendations = [];

  // 🔥 FIX: ruleResults is an OBJECT, not an array
  if (compatResult.ruleResults && typeof compatResult.ruleResults === 'object') {
    Object.values(compatResult.ruleResults).forEach(rule => {
      if (rule && rule.recommendations && Array.isArray(rule.recommendations) && rule.recommendations.length > 0) {
        recommendations.push(...rule.recommendations);
      }
    });
  }

  return recommendations;
}

module.exports = router;
