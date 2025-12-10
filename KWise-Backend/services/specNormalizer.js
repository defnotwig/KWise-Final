/**
 * PHASE 4: SPEC NORMALIZER SERVICE
 * Enriches part metadata for deeper component intelligence
 */

const db = require('../config/db');
const logger = require('../utils/logger');

class SpecNormalizer {
  constructor() {
    this.initialized = false;
    logger.info('🔧 Spec Normalizer initialized');
  }

  /**
   * Normalize and enrich product specifications
   * Extracts structured data from raw specifications
   */
  async normalizeProductSpecs(productId) {
    try {
      // Get product with specifications
      const productResult = await db.query(`
        SELECT id, name, category, specifications, brand, tier, price
        FROM pc_parts
        WHERE id = $1
      `, [productId]);

      if (productResult.rows.length === 0) {
        throw new Error(`Product ${productId} not found`);
      }

      const product = productResult.rows[0];
      const normalized = await this.extractAndNormalizeSpecs(product);

      // Store in product_specs table if it exists
      try {
        await db.query(`
          INSERT INTO product_specs (
            product_id, category, socket, chipset, form_factor, memory_type,
            max_memory, tdp, power_consumption, cores, threads, base_clock,
            boost_clock, normalized_specs, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, NOW(), NOW())
          ON CONFLICT (product_id)
          DO UPDATE SET
            socket = EXCLUDED.socket,
            chipset = EXCLUDED.chipset,
            form_factor = EXCLUDED.form_factor,
            memory_type = EXCLUDED.memory_type,
            max_memory = EXCLUDED.max_memory,
            tdp = EXCLUDED.tdp,
            power_consumption = EXCLUDED.power_consumption,
            cores = EXCLUDED.cores,
            threads = EXCLUDED.threads,
            base_clock = EXCLUDED.base_clock,
            boost_clock = EXCLUDED.boost_clock,
            normalized_specs = EXCLUDED.normalized_specs,
            updated_at = NOW()
        `, [
          product.id,
          product.category,
          normalized.socket || null,
          normalized.chipset || null,
          normalized.form_factor || null,
          normalized.memory_type || null,
          normalized.max_memory || null,
          normalized.tdp || null,
          normalized.power_consumption || null,
          normalized.cores || null,
          normalized.threads || null,
          normalized.base_clock || null,
          normalized.boost_clock || null,
          JSON.stringify(normalized)
        ]);

        logger.info(`✅ Normalized specs for product ${productId}`);
      } catch (dbError) {
        // Table might not exist yet, just log the normalized specs
        logger.info(`ℹ️  Specs normalized for ${product.name} (DB storage skipped)`);
      }

      return normalized;

    } catch (error) {
      logger.error(`Error normalizing product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Extract and normalize specifications from product
   */
  async extractAndNormalizeSpecs(product) {
    const specs = {};

    try {
      let rawSpecs = {};

      if (typeof product.specifications === 'string') {
        try {
          rawSpecs = JSON.parse(product.specifications);
        } catch {
          rawSpecs = this.parseTextSpecifications(product.specifications);
        }
      } else if (typeof product.specifications === 'object') {
        rawSpecs = product.specifications;
      }

      // Extract category-specific specs
      switch (product.category?.toUpperCase()) {
        case 'CPU':
          specs.socket = this.extractSocket(rawSpecs, product.name);
          specs.cores = this.extractCores(rawSpecs, product.name);
          specs.threads = this.extractThreads(rawSpecs, product.name);
          specs.base_clock = this.extractClock(rawSpecs, 'base');
          specs.boost_clock = this.extractClock(rawSpecs, 'boost');
          specs.tdp = this.extractTDP(rawSpecs, product.name);
          specs.memory_type = this.extractMemoryType(rawSpecs, product.name);
          specs.integrated_graphics = this.hasIntegratedGraphics(rawSpecs, product.name);
          break;

        case 'MOTHERBOARD':
          specs.socket = this.extractSocket(rawSpecs, product.name);
          specs.chipset = this.extractChipset(rawSpecs, product.name);
          specs.form_factor = this.extractFormFactor(rawSpecs, product.name);
          specs.memory_type = this.extractMemoryType(rawSpecs, product.name);
          specs.memory_slots = this.extractMemorySlots(rawSpecs);
          specs.max_memory = this.extractMaxMemory(rawSpecs);
          specs.pcie_slots = this.extractPCIeSlots(rawSpecs);
          specs.m2_slots = this.extractM2Slots(rawSpecs);
          specs.sata_ports = this.extractSATAPorts(rawSpecs);
          specs.vrm_phases = this.extractVRMPhases(rawSpecs, product.name);
          break;

        case 'RAM':
          specs.memory_type = this.extractMemoryType(rawSpecs, product.name);
          specs.capacity = this.extractCapacity(rawSpecs, product.name);
          specs.speed = this.extractSpeed(rawSpecs, product.name);
          specs.cas_latency = this.extractCASLatency(rawSpecs);
          specs.voltage = this.extractVoltage(rawSpecs);
          specs.form_factor = this.extractRAMFormFactor(rawSpecs, product.name);
          break;

        case 'GPU':
          specs.gpu_chipset = this.extractGPUChipset(rawSpecs, product.name);
          specs.memory_size = this.extractCapacity(rawSpecs, product.name);
          specs.memory_type = this.extractMemoryType(rawSpecs, product.name);
          specs.core_clock = this.extractClock(rawSpecs, 'core');
          specs.boost_clock = this.extractClock(rawSpecs, 'boost');
          specs.tdp = this.extractTDP(rawSpecs, product.name);
          specs.power_connectors = this.extractPowerConnectors(rawSpecs);
          specs.display_outputs = this.extractDisplayOutputs(rawSpecs);
          specs.length = this.extractLength(rawSpecs);
          specs.slots_required = this.extractSlotsRequired(rawSpecs);
          break;

        case 'PSU':
          specs.wattage = this.extractWattage(rawSpecs, product.name);
          specs.efficiency = this.extractEfficiency(rawSpecs, product.name);
          specs.modular = this.isModular(rawSpecs, product.name);
          specs.form_factor = this.extractFormFactor(rawSpecs, product.name);
          specs.pcie_connectors = this.extractPCIeConnectors(rawSpecs);
          specs.sata_connectors = this.extractSATAConnectors(rawSpecs);
          break;

        case 'CASE':
          specs.form_factor_support = this.extractFormFactorSupport(rawSpecs, product.name);
          specs.max_gpu_length = this.extractMaxGPULength(rawSpecs);
          specs.max_cpu_cooler_height = this.extractMaxCPUCoolerHeight(rawSpecs);
          specs.drive_bays = this.extractDriveBays(rawSpecs);
          specs.fan_support = this.extractFanSupport(rawSpecs);
          specs.radiator_support = this.extractRadiatorSupport(rawSpecs);
          break;

        case 'STORAGE':
          specs.capacity = this.extractCapacity(rawSpecs, product.name);
          specs.interface_type = this.extractStorageInterface(rawSpecs, product.name);
          specs.form_factor = this.extractStorageFormFactor(rawSpecs, product.name);
          specs.read_speed = this.extractReadSpeed(rawSpecs);
          specs.write_speed = this.extractWriteSpeed(rawSpecs);
          break;

        case 'CPU COOLER':
          specs.socket_support = this.extractSocketSupport(rawSpecs);
          specs.tdp_rating = this.extractTDP(rawSpecs, product.name);
          specs.height = this.extractHeight(rawSpecs);
          specs.fan_size = this.extractFanSize(rawSpecs);
          specs.noise_level = this.extractNoiseLevel(rawSpecs);
          break;
      }

      // Add enrichment metadata
      specs.category = product.category;
      specs.brand = product.brand;
      specs.tier = product.tier;
      specs.price = product.price;
      specs.enriched_at = new Date().toISOString();

      return specs;

    } catch (error) {
      logger.error(`Error extracting specs for ${product.name}:`, error);
      return { error: error.message };
    }
  }

  // ============================================================================
  // EXTRACTION METHODS (Intelligent Pattern Matching)
  // ============================================================================

  extractSocket(specs, name) {
    const socketPatterns = [
      /LGA\s*(\d{4})/i,
      /AM(\d)/i,
      /sTRX4/i,
      /sWRX8/i,
      /TR4/i
    ];

    const specStr = JSON.stringify(specs) + ' ' + name;
    for (const pattern of socketPatterns) {
      const match = specStr.match(pattern);
      if (match) return match[0].replace(/\s/g, '').toUpperCase();
    }
    return null;
  }

  extractChipset(specs, name) {
    const chipsetPatterns = [
      /[ZBH]\d{3}/i,  // Intel: Z790, B660, H610
      /X\d{3}/i,      // AMD: X570, X670
      /B\d{3}/i       // AMD: B550, B650
    ];

    const specStr = JSON.stringify(specs) + ' ' + name;
    for (const pattern of chipsetPatterns) {
      const match = specStr.match(pattern);
      if (match) return match[0].toUpperCase();
    }
    return null;
  }

  extractFormFactor(specs, name) {
    const specStr = JSON.stringify(specs) + ' ' + name;
    const patterns = ['E-ATX', 'ATX', 'Micro-ATX', 'Mini-ITX', 'mATX', 'mITX'];
    
    for (const pattern of patterns) {
      if (specStr.match(new RegExp(pattern, 'i'))) {
        return pattern.replace('m', 'Micro-').replace('ITX', 'ITX');
      }
    }
    return null;
  }

  extractMemoryType(specs, name) {
    const specStr = JSON.stringify(specs) + ' ' + name;
    const match = specStr.match(/DDR([45])/i);
    return match ? `DDR${match[1]}` : null;
  }

  extractCores(specs, name) {
    const specStr = JSON.stringify(specs) + ' ' + name;
    const match = specStr.match(/(\d+)[\s-]?core/i);
    return match ? parseInt(match[1]) : null;
  }

  extractThreads(specs, name) {
    const specStr = JSON.stringify(specs) + ' ' + name;
    const match = specStr.match(/(\d+)[\s-]?thread/i);
    return match ? parseInt(match[1]) : null;
  }

  extractClock(specs, type) {
    const specStr = JSON.stringify(specs);
    const pattern = type === 'base' 
      ? /base.*?([\d.]+)\s*GHz/i 
      : /boost.*?([\d.]+)\s*GHz/i;
    const match = specStr.match(pattern);
    return match ? `${match[1]}GHz` : null;
  }

  extractTDP(specs, name) {
    const specStr = JSON.stringify(specs) + ' ' + name;
    const match = specStr.match(/(\d+)\s*W(?:\s+TDP)?/i);
    return match ? `${match[1]}W` : null;
  }

  extractWattage(specs, name) {
    const specStr = JSON.stringify(specs) + ' ' + name;
    const match = specStr.match(/(\d+)\s*W/i);
    return match ? parseInt(match[1]) : null;
  }

  extractEfficiency(specs, name) {
    const specStr = JSON.stringify(specs) + ' ' + name;
    const match = specStr.match(/80\+\s*(Bronze|Silver|Gold|Platinum|Titanium)/i);
    return match ? `80+ ${match[1]}` : null;
  }

  extractCapacity(specs, name) {
    const specStr = JSON.stringify(specs) + ' ' + name;
    const match = specStr.match(/(\d+)\s*(GB|TB)/i);
    return match ? `${match[1]}${match[2].toUpperCase()}` : null;
  }

  extractSpeed(specs, name) {
    const specStr = JSON.stringify(specs) + ' ' + name;
    const match = specStr.match(/(\d+)\s*MHz/i);
    return match ? parseInt(match[1]) : null;
  }

  // Stub methods for other extractors (implement as needed)
  extractMemorySlots(specs) { return this.extractNumber(specs, /(\d+)\s*(?:x\s*)?DIMM/i); }
  extractMaxMemory(specs) { return this.extractPattern(specs, /(\d+)\s*GB\s*max/i); }
  extractPCIeSlots(specs) { return this.extractNumber(specs, /(\d+)\s*(?:x\s*)?PCIe/i); }
  extractM2Slots(specs) { return this.extractNumber(specs, /(\d+)\s*(?:x\s*)?M\.2/i); }
  extractSATAPorts(specs) { return this.extractNumber(specs, /(\d+)\s*(?:x\s*)?SATA/i); }
  extractVRMPhases(specs, name) { return this.extractNumber(specs, /(\d+)\s*phase/i); }
  extractCASLatency(specs) { return this.extractPattern(specs, /CL\s*(\d+)/i); }
  extractVoltage(specs) { return this.extractPattern(specs, /([\d.]+)\s*V/i); }
  extractRAMFormFactor(specs, name) { return name.includes('SO-DIMM') ? 'SO-DIMM' : 'DIMM'; }
  extractGPUChipset(specs, name) { return this.extractPattern(specs, /(RTX|GTX|RX)\s*(\d+)/i); }
  extractPowerConnectors(specs) { return this.extractPattern(specs, /(\d+)\s*x\s*(\d+)\s*pin/i); }
  extractDisplayOutputs(specs) { return JSON.stringify(specs).match(/(HDMI|DisplayPort|DVI)/gi); }
  extractLength(specs) { return this.extractNumber(specs, /(\d+)\s*mm\s*length/i); }
  extractSlotsRequired(specs) { return this.extractNumber(specs, /(\d+)[\s-]?slot/i) || 2; }
  isModular(specs, name) { return /modular|semi-modular/i.test(JSON.stringify(specs) + ' ' + name); }
  extractPCIeConnectors(specs) { return this.extractNumber(specs, /(\d+)\s*(?:x\s*)?(?:6\+2|8)[\s-]?pin/i); }
  extractSATAConnectors(specs) { return this.extractNumber(specs, /(\d+)\s*(?:x\s*)?SATA/i); }
  extractFormFactorSupport(specs, name) { return this.extractPattern(specs, /(ATX|Micro-ATX|Mini-ITX)/i); }
  extractMaxGPULength(specs) { return this.extractNumber(specs, /(\d+)\s*mm\s*GPU/i); }
  extractMaxCPUCoolerHeight(specs) { return this.extractNumber(specs, /(\d+)\s*mm\s*(?:cooler|CPU)/i); }
  extractDriveBays(specs) { return this.extractPattern(specs, /(\d+)\s*x\s*(2\.5|3\.5)"/i); }
  extractFanSupport(specs) { return this.extractPattern(specs, /(\d+)\s*x\s*(\d+mm)/i); }
  extractRadiatorSupport(specs) { return this.extractPattern(specs, /(\d+mm)\s*radiator/i); }
  extractStorageInterface(specs, name) { return this.extractPattern(specs, /(NVMe|SATA|PCIe)/i); }
  extractStorageFormFactor(specs, name) { return this.extractPattern(specs, /(M\.2|2\.5"|3\.5")/i); }
  extractReadSpeed(specs) { return this.extractNumber(specs, /(\d+)\s*MB\/s\s*read/i); }
  extractWriteSpeed(specs) { return this.extractNumber(specs, /(\d+)\s*MB\/s\s*write/i); }
  extractSocketSupport(specs) { return this.extractPattern(specs, /(LGA\d+|AM\d)/i); }
  extractHeight(specs) { return this.extractNumber(specs, /(\d+)\s*mm\s*height/i); }
  extractFanSize(specs) { return this.extractNumber(specs, /(\d+)\s*mm\s*fan/i); }
  extractNoiseLevel(specs) { return this.extractNumber(specs, /([\d.]+)\s*dB/i); }
  hasIntegratedGraphics(specs, name) { return /integrated|igpu|uhd|iris/i.test(JSON.stringify(specs) + ' ' + name); }

  // Helper methods
  extractNumber(specs, pattern) {
    const match = JSON.stringify(specs).match(pattern);
    return match ? parseInt(match[1]) : null;
  }

  extractPattern(specs, pattern) {
    const match = JSON.stringify(specs).match(pattern);
    return match ? match[0] : null;
  }

  parseTextSpecifications(specText) {
    const specs = {};
    const lines = specText.split(/[|\n,]/).map(s => s.trim()).filter(s => s.length > 0);

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim().toLowerCase().replace(/\s+/g, '_');
        const value = line.substring(colonIndex + 1).trim();
        specs[key] = value;
      }
    }

    return specs;
  }

  /**
   * Batch normalize all products in a category
   */
  async normalizeCategory(category, limit = 50) {
    try {
      logger.info(`🔍 Normalizing specs for ${category} category...`);

      const products = await db.query(`
        SELECT id, name, category
        FROM pc_parts
        WHERE category = $1
          AND stock > 0
        ORDER BY id
        LIMIT $2
      `, [category, limit]);

      logger.info(`   Found ${products.rows.length} products to normalize`);

      let successCount = 0;
      let errorCount = 0;

      for (const product of products.rows) {
        try {
          await this.normalizeProductSpecs(product.id);
          successCount++;
        } catch (error) {
          errorCount++;
          logger.warn(`   Failed to normalize ${product.name}: ${error.message}`);
        }
      }

      logger.info(`✅ Category normalization complete: ${successCount} success, ${errorCount} errors`);
      return { success: successCount, errors: errorCount };

    } catch (error) {
      logger.error(`Error normalizing category ${category}:`, error);
      throw error;
    }
  }
}

module.exports = new SpecNormalizer();
