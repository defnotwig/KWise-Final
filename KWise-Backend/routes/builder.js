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

// Data-driven spec field mappings per category
const CATEGORY_SPEC_MAP = {
    'MOTHERBOARD': ['socket', 'chipset', 'memory_type', 'max_ram', 'ram_slots', 'm2_slots', 'form_factor'],
    'Motherboard': ['socket', 'chipset', 'memory_type', 'max_ram', 'ram_slots', 'm2_slots', 'form_factor'],
    'RAM': ['memory_type', 'speed', 'cas_latency', 'total_capacity', 'configuration'],
    'CPU': ['socket', 'cores', 'threads', 'tdp', 'integrated_gpu'],
    'GPU': ['memory_type', 'memory_capacity', 'tdp', 'length'],
    'PSU': ['wattage', 'efficiency', 'modular'],
    'CASE': ['max_gpu_length', 'max_cpu_cooler_height', 'motherboard_support'],
    'Case': ['max_gpu_length', 'max_cpu_cooler_height', 'motherboard_support'],
    'STORAGE': ['capacity', 'storage_type', 'interface', 'nvme_support'],
    'Storage': ['capacity', 'storage_type', 'interface', 'nvme_support'],
    'COOLING': ['height', 'tdp_rating', 'water_cooled'],
    'Cooling': ['height', 'tdp_rating', 'water_cooled'],
};

// Special field renames
const SPEC_FIELD_RENAMES = {
    'CASE': { case_category: 'form_factor' },
    'Case': { case_category: 'form_factor' },
};

// ============================================================================
// Per-category SQL query builders (each in its own CC scope)
// ============================================================================

function buildCpuQuery() {
    return {
        sqlQuery: `
          SELECT cpu.id, cpu.name, cpu.socket, cpu.series, cpu.cores, cpu.threads, cpu.integrated_gpu, 
                 cpu.tdp, cpu.base_clock, cpu.turbo_clock, cpu.price,
                 COALESCE(p.image_url, p.image_path) AS "imageUrl",
                 p.brand, p.specifications, p.dimensions, 'CPU' as category
          FROM cpu 
          INNER JOIN pc_parts p ON p.id = cpu.id
          WHERE cpu.id IN (SELECT id FROM pc_parts WHERE category = 'CPU' AND is_active = true AND kiosk_visible = true)
          ORDER BY cpu.price ASC`,
        params: []
    };
}

function buildCoolingQuery(selectedParts) {
    if (selectedParts.CPU?.socket) {
        return {
            sqlQuery: `
              SELECT DISTINCT c.id, c.name, c.max_rpm, c.max_noise, c.height, 
                     c.water_cooled, c.fanless, c.price, p.compatible_sockets,
                     p.specifications, p.dimensions,
                     COALESCE(p.image_url, p.image_path) AS "imageUrl",
                     p.brand, 'Cooling' as category
              FROM cooling c
              INNER JOIN pc_parts p ON p.id = c.id AND p.category = 'Cooling'
              WHERE p.is_active = true AND p.kiosk_visible = true
                AND p.compatible_sockets @> $1::jsonb
              ORDER BY c.price ASC`,
            params: [JSON.stringify([selectedParts.CPU.socket])]
        };
    }
    return {
        sqlQuery: `
          SELECT c.id, c.name, c.max_rpm, c.max_noise, c.height, 
                 c.water_cooled, c.fanless, c.price,
                 p.image_url AS "imageUrl", p.brand, 'Cooling' as category
          FROM cooling c
          INNER JOIN pc_parts p ON p.id = c.id
          WHERE c.id IN (SELECT id FROM pc_parts WHERE category = 'Cooling' AND is_active = true AND kiosk_visible = true)
          ORDER BY c.price ASC`,
        params: []
    };
}

function buildMotherboardQuery(selectedParts) {
    const cpuSocket = selectedParts.CPU?.socket || selectedParts.CPU?.specifications?.socket;
    if (cpuSocket) {
        logger.info(`🔍 [BUILDER] Motherboard filtering for CPU socket: ${cpuSocket}`);
        return {
            sqlQuery: `
              SELECT mb.id, mb.name, mb.socket, mb.chipset, mb.memory_type, mb.max_ram, 
                     mb.ram_slots, mb.m2_slots, mb.wireless_networking, 
                     mb.integrated_gpu_support, mb.price,
                     COALESCE(p.image_url, p.image_path) AS "imageUrl",
                     p.brand, p.specifications, p.dimensions, 'Motherboard' as category
              FROM motherboard mb
              INNER JOIN pc_parts p ON p.id = mb.id
              WHERE mb.socket = $1
                AND mb.id IN (SELECT id FROM pc_parts WHERE category = 'Motherboard' AND is_active = true AND kiosk_visible = true)
              ORDER BY mb.price ASC`,
            params: [cpuSocket]
        };
    }
    if (selectedParts.CPU) {
        logger.warn('⚠️ [BUILDER] CPU selected but socket not specified - showing all motherboards');
    } else {
        logger.warn('⚠️ [BUILDER] Motherboard requested but no CPU selected - showing all');
    }
    return {
        sqlQuery: `
          SELECT mb.id, mb.name, mb.socket, mb.chipset, mb.memory_type, mb.max_ram, 
                 mb.ram_slots, mb.m2_slots, mb.price,
                 p.image_url AS "imageUrl", p.brand, p.specifications, p.dimensions,
                 'Motherboard' as category
          FROM motherboard mb
          INNER JOIN pc_parts p ON p.id = mb.id
          WHERE mb.id IN (SELECT id FROM pc_parts WHERE category = 'Motherboard' AND is_active = true AND kiosk_visible = true)
          ORDER BY mb.price ASC`,
        params: []
    };
}

function buildRamQuery(selectedParts) {
    if (!selectedParts.Motherboard) {
        logger.warn('⚠️ [BUILDER] RAM requested but no Motherboard selected - showing all RAM');
        return {
            sqlQuery: `
              SELECT r.id, r.name, r.memory_type, r.configuration, r.speed, 
                     r.total_capacity, r.price,
                     p.image_url AS "imageUrl", p.brand, p.specifications, p.dimensions,
                     'RAM' as category
              FROM ram r
              INNER JOIN pc_parts p ON p.id = r.id
              WHERE r.id IN (SELECT id FROM pc_parts WHERE category = 'RAM' AND is_active = true AND kiosk_visible = true)
              ORDER BY r.price ASC`,
            params: []
        };
    }

    const memoryType = selectedParts.Motherboard.memory_type || selectedParts.Motherboard.specifications?.memory_type;
    logger.info(`🔍 [BUILDER] RAM filtering for motherboard: ${selectedParts.Motherboard.name}`);
    logger.info(`   Memory Type: ${memoryType}`);

    if (!memoryType || memoryType === 'null' || memoryType === 'undefined' || memoryType === '') {
        logger.error(`❌ [BUILDER] Motherboard ${selectedParts.Motherboard.name} missing memory_type!`);
        return {
            error: {
                status: 400,
                body: {
                    success: false,
                    message: 'Selected motherboard has incomplete specifications',
                    hint: 'Motherboard memory_type must be DDR4 or DDR5. Please contact administrator.',
                    motherboard: {
                        id: selectedParts.Motherboard.id,
                        name: selectedParts.Motherboard.name,
                        missingField: 'memory_type'
                    }
                }
            }
        };
    }

    logger.info(`✅ [BUILDER] Filtering RAM: Only ${memoryType} modules will be shown`);
    return {
        sqlQuery: `
          SELECT r.id, r.name, r.memory_type, r.configuration, r.speed, 
                 r.cas_latency, r.total_capacity, r.voltage, r.price,
                 p.image_url AS "imageUrl", p.brand, p.specifications, p.dimensions,
                 'RAM' as category
          FROM ram r
          INNER JOIN pc_parts p ON p.id = r.id
          WHERE r.memory_type = $1
            AND r.id IN (SELECT id FROM pc_parts WHERE category = 'RAM' AND is_active = true AND kiosk_visible = true)
          ORDER BY r.price ASC`,
        params: [memoryType]
    };
}

function buildStorageQuery() {
    return {
        sqlQuery: `
          SELECT s.id, s.name, s.capacity, s.storage_type, s.interface, 
                 s.nvme_support, s.form_factor, s.read_speed, s.write_speed, s.price,
                 p.image_url AS "imageUrl", p.brand, p.specifications, p.dimensions,
                 'Storage' as category
          FROM storage s
          INNER JOIN pc_parts p ON p.id = s.id
          WHERE s.id IN (SELECT id FROM pc_parts WHERE category = 'Storage' AND is_active = true AND kiosk_visible = true)
          ORDER BY s.price ASC`,
        params: []
    };
}

function buildGpuQuery(selectedParts) {
    const gpuFilters = [];
    if (selectedParts.Case?.max_gpu_length) {
        const maxLength = Number.parseInt(selectedParts.Case.max_gpu_length, 10);
        if (!Number.isNaN(maxLength)) {
            gpuFilters.push(`length <= ${maxLength}`);
        }
    }
    return {
        sqlQuery: `
          SELECT g.id, g.name, g.memory_type, g.memory_capacity, g.core_clock, 
                 g.boost_clock, g.length, g.tdp, g.pcie_8pin, g.overall_score, g.price,
                 p.image_url AS "imageUrl", p.brand, p.specifications, p.dimensions,
                 'GPU' as category
          FROM gpu g
          INNER JOIN pc_parts p ON p.id = g.id
          WHERE g.id IN (SELECT id FROM pc_parts WHERE category = 'GPU' AND is_active = true AND kiosk_visible = true)
          ${gpuFilters.length > 0 ? 'AND ' + gpuFilters.join(' AND ') : ''}
          ORDER BY g.price ASC`,
        params: []
    };
}

function buildCaseQuery() {
    return {
        sqlQuery: `
          SELECT c.id, c.name, c.case_category, c.color, c.fans_included, 
                 c.max_gpu_length, c.max_cpu_cooler_height, c.motherboard_support,
                 c.tempered_glass, c.price,
                 p.image_url AS "imageUrl", p.brand, p.specifications, p.dimensions,
                 'Case' as category
          FROM pc_case c
          INNER JOIN pc_parts p ON p.id = c.id
          WHERE c.id IN (SELECT id FROM pc_parts WHERE category = 'Case' AND is_active = true AND kiosk_visible = true)
          ORDER BY c.price ASC`,
        params: []
    };
}

function buildPsuQuery(selectedParts) {
    let minWattage = 400;
    if (selectedParts.CPU && selectedParts.GPU) {
        const cpuTdp = selectedParts.CPU.tdp || 65;
        const gpuTdp = selectedParts.GPU.tdp || 75;
        minWattage = Math.max(minWattage, cpuTdp + gpuTdp + 200);
    } else if (selectedParts.CPU) {
        const cpuTdp = selectedParts.CPU.tdp || 65;
        minWattage = Math.max(minWattage, cpuTdp + 150);
    }
    return {
        sqlQuery: `
          SELECT ps.id, ps.name, ps.form_factor, ps.efficiency_rating, ps.wattage, 
                 ps.modular, ps.pcie_connectors, ps.sata_connectors, ps.price,
                 p.image_url AS "imageUrl", p.brand, p.specifications, p.dimensions,
                 'PSU' as category
          FROM psu ps
          INNER JOIN pc_parts p ON p.id = ps.id
          WHERE ps.wattage >= $1
            AND ps.id IN (SELECT id FROM pc_parts WHERE category = 'PSU' AND is_active = true AND kiosk_visible = true)
          ORDER BY ps.wattage ASC, ps.price ASC`,
        params: [minWattage]
    };
}

// Map category names to their query builder functions
const CATEGORY_QUERY_BUILDERS = {
    CPU: buildCpuQuery,
    COOLING: buildCoolingQuery,
    MOTHERBOARD: buildMotherboardQuery,
    RAM: buildRamQuery,
    STORAGE: buildStorageQuery,
    GPU: buildGpuQuery,
    CASE: buildCaseQuery,
    PSU: buildPsuQuery,
};

/**
 * GET /api/builder/available/:category
 * Get available compatible options for the next build step
 */
router.get('/available/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const selectedParts = req.query.selectedParts ? JSON.parse(req.query.selectedParts) : {};

    logger.info(`Fetching available ${category} with filters:`, selectedParts);

    const builder = CATEGORY_QUERY_BUILDERS[category.toUpperCase()];
    if (!builder) {
        return res.status(400).json({ success: false, message: `Invalid category: ${category}` });
    }

    const queryResult = builder(selectedParts);
    if (queryResult.error) {
        return res.status(queryResult.error.status).json(queryResult.error.body);
    }

    const result = await query(queryResult.sqlQuery, queryResult.params);

    logger.info(`Found ${result.rows.length} compatible ${category} options`);

    // Transform rows to include specifications object
    const transformedRows = result.rows.map(row => {
      if (!row.specifications) {
        row.specifications = {};
        const fields = CATEGORY_SPEC_MAP[category];
        if (fields) {
          for (const field of fields) {
            row.specifications[field] = row[field];
          }
        }
        const renames = SPEC_FIELD_RENAMES[category];
        if (renames) {
          for (const [from, to] of Object.entries(renames)) {
            row.specifications[to] = row[from];
          }
        }
      }
      return row;
    });

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

// Component enrichment config: [table, required_field]
const ENRICHMENT_CONFIG = {
    CPU: ['cpu', 'socket'],
    Motherboard: ['motherboard', 'socket'],
    RAM: ['ram', 'memory_type'],
    GPU: ['gpu', 'tdp'],
    PSU: ['psu', 'wattage'],
    Case: ['pc_case', 'max_gpu_length'],
    Cooling: ['cooling', 'compatible_sockets'],
    Storage: ['storage', 'storage_type'],
};

/**
 * Enrich build components with full DB details when only ID is provided
 */
async function enrichBuildComponents(build) {
    const db = require('../config/db');
    const enriched = { ...build };

    for (const [key, [table, requiredField]] of Object.entries(ENRICHMENT_CONFIG)) {
        if (enriched[key]?.id && !enriched[key][requiredField]) {
            const result = await db.query(`SELECT * FROM ${table} WHERE id = $1`, [enriched[key].id]);
            if (result.rows[0]) enriched[key] = { ...enriched[key], ...result.rows[0] };
        }
    }

    return enriched;
}

/**
 * Run all compatibility checks and return { score, warnings, recommendations }
 */
function runCompatibilityChecks(components) {
    const { cpu, motherboard, ram, gpu, psu, caseItem, cooling, storage } = components;
    const warnings = [];
    const recommendations = [];
    let score = 100;

    const result = { score, warnings, recommendations };
    
    checkSocketCompat(result, cpu, motherboard);
    checkRamCompat(result, ram, motherboard);
    checkPsuWattage(result, psu, cpu, gpu);
    checkCaseClearance(result, caseItem, gpu, cooling);
    checkGpuPresence(result, gpu, cpu);
    checkStoragePresence(result, storage);
    checkRamCapacity(result, motherboard, ram);

    return result;
}

function checkSocketCompat(result, cpu, motherboard) {
    if (cpu && motherboard && cpu.socket !== motherboard.socket) {
        result.warnings.push({ severity: 'critical', message: `CPU socket ${cpu.socket} is incompatible with motherboard socket ${motherboard.socket}`, affected: ['CPU', 'Motherboard'] });
        result.score -= 30;
    }
}

function checkRamCompat(result, ram, motherboard) {
    if (ram && motherboard && ram.memory_type !== motherboard.memory_type) {
        result.warnings.push({ severity: 'critical', message: `RAM type ${ram.memory_type} is not supported by motherboard (requires ${motherboard.memory_type})`, affected: ['RAM', 'Motherboard'] });
        result.score -= 25;
    }
}

function checkPsuWattage(result, psu, cpu, gpu) {
    if (!psu || !cpu) return;
    const totalTdp = (cpu.tdp || 65) + (gpu ? (gpu.tdp || 75) : 0) + 150;
    if (psu.wattage < totalTdp) {
        result.warnings.push({ severity: 'major', message: `PSU wattage (${psu.wattage}W) may be insufficient. Recommended: ${totalTdp}W+`, affected: ['PSU'] });
        result.score -= 20;
        result.recommendations.push({ category: 'PSU', reason: `Upgrade to ${Math.ceil(totalTdp / 50) * 50}W or higher for stability and future upgrades` });
    } else if (psu.wattage < totalTdp * 1.3) {
        result.warnings.push({ severity: 'minor', message: `PSU wattage is adequate but consider ${Math.ceil(totalTdp * 1.5 / 50) * 50}W for future upgrades`, affected: ['PSU'] });
        result.score -= 5;
    }
}

function checkCaseClearance(result, caseItem, gpu, cooling) {
    if (!caseItem) return;
    if (gpu && caseItem.max_gpu_length) {
        const maxGpuLength = Number.parseInt(caseItem.max_gpu_length, 10);
        if (!Number.isNaN(maxGpuLength) && gpu.length > maxGpuLength) {
            result.warnings.push({ severity: 'critical', message: `GPU length (${gpu.length}mm) exceeds case maximum (${maxGpuLength}mm)`, affected: ['GPU', 'Case'] });
            result.score -= 25;
        }
    }
    if (cooling && caseItem.max_cpu_cooler_height) {
        const maxCoolerHeight = Number.parseInt(caseItem.max_cpu_cooler_height, 10);
        if (!Number.isNaN(maxCoolerHeight) && cooling.height && cooling.height > maxCoolerHeight) {
            result.warnings.push({ severity: 'critical', message: `CPU cooler height (${cooling.height}mm) exceeds case maximum (${maxCoolerHeight}mm)`, affected: ['Cooling', 'Case'] });
            result.score -= 20;
        }
    }
}

function checkGpuPresence(result, gpu, cpu) {
    if (!gpu && cpu && !cpu.integrated_gpu) {
        result.warnings.push({ severity: 'minor', message: 'No dedicated GPU selected and CPU does not have integrated graphics.', affected: ['GPU'] });
        result.score -= 10;
        result.recommendations.push({ category: 'GPU', reason: 'Add a dedicated GPU for video output, or select a CPU with integrated graphics' });
    }
}

function checkStoragePresence(result, storage) {
    if (!storage) {
        result.warnings.push({ severity: 'major', message: 'No storage device selected. System requires at least one storage device.', affected: ['Storage'] });
        result.score -= 15;
    }
}

function checkRamCapacity(result, motherboard, ram) {
    if (!motherboard || !ram) return;
    const ramCapacity = Number.parseInt(ram.total_capacity, 10) || 0;
    const moboMaxRam = motherboard.max_ram || 128;
    if (ramCapacity > moboMaxRam) {
        result.warnings.push({ severity: 'minor', message: `RAM capacity (${ramCapacity}GB) exceeds motherboard maximum (${moboMaxRam}GB)`, affected: ['RAM', 'Motherboard'] });
        result.score -= 5;
    }
}

/**
 * Generate build summary based on score
 */
function generateBuildSummary(score, recommendations) {
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

    if (score >= 80 && !recommendations.length) {
        recommendations.push({ category: 'General', reason: 'Build looks great! Consider adding more storage or upgrading RAM for better multitasking.' });
    }

    return summary;
}

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

    const enriched = await enrichBuildComponents(build);
    const components = {
        cpu: enriched.CPU,
        motherboard: enriched.Motherboard,
        ram: enriched.RAM,
        gpu: enriched.GPU,
        psu: enriched.PSU,
        caseItem: enriched.Case,
        cooling: enriched.Cooling,
        storage: enriched.Storage,
    };

    logger.info('Compatibility check with full component details:', {
      hasCpuSocket: !!components.cpu?.socket,
      hasMoboSocket: !!components.motherboard?.socket,
      hasRamType: !!components.ram?.memory_type,
      hasPsuWattage: !!components.psu?.wattage
    });

    const { score, warnings, recommendations } = runCompatibilityChecks(components);
    const summary = generateBuildSummary(score, recommendations);

    res.json({
      success: true,
      data: {
        score,
        warnings,
        recommendations,
        summary,
        build_complete: Object.keys(build).length >= 7,
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
          const compatResult = await compatibilityRules.computeCompatibilityScore(buildContext, candidate); // NOSONAR - function is async

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
    if (part?.id) {
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
      if (rule?.issues && Array.isArray(rule.issues) && rule.issues.length > 0) {
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
      if (rule?.recommendations && Array.isArray(rule.recommendations) && rule.recommendations.length > 0) {
        recommendations.push(...rule.recommendations);
      }
    });
  }

  return recommendations;
}

module.exports = router;
