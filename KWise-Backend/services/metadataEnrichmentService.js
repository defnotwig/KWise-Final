/**
 * Metadata Enrichment Service for K-Wise Enhanced AI
 * 
 * Enhances part data with additional context:
 * - Real-time pricing and availability
 * - User ratings and reviews summary
 * - Known compatibility issues from community
 * - Thermal performance data
 * - PSU tier ratings
 * - BIOS/firmware version recommendations
 * 
 * Phase 2: Advanced Prompt Engineering
 * 
 * @module MetadataEnrichmentService
 * @author K-Wise AI Enhancement Team
 * @version 2.0.0
 */

const db = require('../config/db');
const logger = require('../utils/logger');

class MetadataEnrichmentService {
  
  /**
   * Enrich parts data with metadata for AI analysis
   * @param {Object} parts - Build parts configuration
   * @param {Object} options - Options for metadata enrichment
   * @returns {Promise<Object>} - Enriched metadata object
   */
  static async enrichPartsMetadata(parts, options = {}) {
    const startTime = Date.now();
    
    try {
      const metadata = {};
      
      // Enrich each part category
      if (parts.cpu) {
        metadata.cpu = await this.enrichCPUMetadata(parts.cpu);
      }
      
      if (parts.motherboard) {
        metadata.motherboard = await this.enrichMotherboardMetadata(parts.motherboard);
      }
      
      if (parts.gpu || parts.graphics_card) {
        metadata.gpu = await this.enrichGPUMetadata(parts.gpu || parts.graphics_card);
      }
      
      if (parts.ram || parts.memory) {
        metadata.ram = await this.enrichRAMMetadata(parts.ram || parts.memory);
      }
      
      if (parts.psu || parts.power_supply) {
        metadata.psu = await this.enrichPSUMetadata(parts.psu || parts.power_supply);
      }
      
      if (parts.cooler || parts.cpu_cooler) {
        metadata.cooler = await this.enrichCoolerMetadata(parts.cooler || parts.cpu_cooler);
      }
      
      if (parts.storage) {
        metadata.storage = await this.enrichStorageMetadata(parts.storage);
      }
      
      const latency = Date.now() - startTime;
      logger.info('✅ Metadata enrichment completed', { latency: `${latency}ms` });
      
      return metadata;
      
    } catch (error) {
      logger.error('❌ Metadata enrichment failed', { error: error.message });
      return {}; // Return empty metadata on failure (graceful degradation)
    }
  }

  /**
   * Enrich CPU metadata
   * @param {Object} cpu - CPU part object
   * @returns {Promise<Object>} - CPU metadata
   */
  static async enrichCPUMetadata(cpu) {
    try {
      const metadata = {
        pricing: await this.getPricing(cpu.id || cpu.part_id),
        availability: await this.getAvailability(cpu.id || cpu.part_id),
        ratings: await this.getUserRatings(cpu.id || cpu.part_id),
        thermal_data: this.extractThermalData(cpu),
        performance_tier: this.assessCPUTier(cpu),
        known_issues: await this.getKnownIssues('cpu', cpu.name || cpu.model)
      };
      
      return metadata;
    } catch (error) {
      logger.warn('⚠️ CPU metadata enrichment partial failure', { error: error.message });
      return {};
    }
  }

  /**
   * Enrich motherboard metadata
   * @param {Object} motherboard - Motherboard part object
   * @returns {Promise<Object>} - Motherboard metadata
   */
  static async enrichMotherboardMetadata(motherboard) {
    try {
      const metadata = {
        pricing: await this.getPricing(motherboard.id || motherboard.part_id),
        availability: await this.getAvailability(motherboard.id || motherboard.part_id),
        ratings: await this.getUserRatings(motherboard.id || motherboard.part_id),
        bios_version: await this.getRecommendedBIOSVersion(motherboard),
        vrm_quality: this.assessVRMQuality(motherboard),
        known_issues: await this.getKnownIssues('motherboard', motherboard.name || motherboard.model),
        compatibility_notes: await this.getCompatibilityNotes('motherboard', motherboard.id || motherboard.part_id)
      };
      
      return metadata;
    } catch (error) {
      logger.warn('⚠️ Motherboard metadata enrichment partial failure', { error: error.message });
      return {};
    }
  }

  /**
   * Enrich GPU metadata
   * @param {Object} gpu - GPU part object
   * @returns {Promise<Object>} - GPU metadata
   */
  static async enrichGPUMetadata(gpu) {
    try {
      const metadata = {
        pricing: await this.getPricing(gpu.id || gpu.part_id),
        availability: await this.getAvailability(gpu.id || gpu.part_id),
        ratings: await this.getUserRatings(gpu.id || gpu.part_id),
        thermal_data: this.extractGPUThermalData(gpu),
        performance_tier: this.assessGPUTier(gpu),
        known_issues: await this.getKnownIssues('gpu', gpu.name || gpu.model),
        driver_recommendations: 'latest' // Could be enhanced with driver version checking
      };
      
      return metadata;
    } catch (error) {
      logger.warn('⚠️ GPU metadata enrichment partial failure', { error: error.message });
      return {};
    }
  }

  /**
   * Enrich RAM metadata
   * @param {Object} ram - RAM part object
   * @returns {Promise<Object>} - RAM metadata
   */
  static async enrichRAMMetadata(ram) {
    try {
      const metadata = {
        pricing: await this.getPricing(ram.id || ram.part_id),
        availability: await this.getAvailability(ram.id || ram.part_id),
        ratings: await this.getUserRatings(ram.id || ram.part_id),
        compatibility: await this.getCompatibilityNotes('ram', ram.id || ram.part_id),
        xmp_stability: 'unknown', // Could be enhanced with community feedback
        known_issues: await this.getKnownIssues('ram', ram.name || ram.model)
      };
      
      return metadata;
    } catch (error) {
      logger.warn('⚠️ RAM metadata enrichment partial failure', { error: error.message });
      return {};
    }
  }

  /**
   * Enrich PSU metadata with tier rating
   * @param {Object} psu - PSU part object
   * @returns {Promise<Object>} - PSU metadata
   */
  static async enrichPSUMetadata(psu) {
    try {
      const tierRating = await this.getPSUTierRating(psu);
      
      const metadata = {
        pricing: await this.getPricing(psu.id || psu.part_id),
        availability: await this.getAvailability(psu.id || psu.part_id),
        ratings: await this.getUserRatings(psu.id || psu.part_id),
        tier: tierRating.tier,
        tier_explanation: tierRating.explanation,
        reliability: await this.getReliabilityReports(psu),
        known_issues: await this.getKnownIssues('psu', psu.name || psu.model)
      };
      
      return metadata;
    } catch (error) {
      logger.warn('⚠️ PSU metadata enrichment partial failure', { error: error.message });
      return {};
    }
  }

  /**
   * Enrich cooler metadata
   * @param {Object} cooler - Cooler part object
   * @returns {Promise<Object>} - Cooler metadata
   */
  static async enrichCoolerMetadata(cooler) {
    try {
      const metadata = {
        pricing: await this.getPricing(cooler.id || cooler.part_id),
        availability: await this.getAvailability(cooler.id || cooler.part_id),
        ratings: await this.getUserRatings(cooler.id || cooler.part_id),
        tdp_rating: this.assessCoolerTDP(cooler),
        noise_level: this.extractNoiseLevel(cooler),
        known_issues: await this.getKnownIssues('cooler', cooler.name || cooler.model)
      };
      
      return metadata;
    } catch (error) {
      logger.warn('⚠️ Cooler metadata enrichment partial failure', { error: error.message });
      return {};
    }
  }

  /**
   * Enrich storage metadata
   * @param {Object} storage - Storage part object
   * @returns {Promise<Object>} - Storage metadata
   */
  static async enrichStorageMetadata(storage) {
    try {
      const metadata = {
        pricing: await this.getPricing(storage.id || storage.part_id),
        availability: await this.getAvailability(storage.id || storage.part_id),
        ratings: await this.getUserRatings(storage.id || storage.part_id),
        performance_tier: this.assessStorageTier(storage),
        endurance_rating: this.extractEnduranceRating(storage),
        known_issues: await this.getKnownIssues('storage', storage.name || storage.model)
      };
      
      return metadata;
    } catch (error) {
      logger.warn('⚠️ Storage metadata enrichment partial failure', { error: error.message });
      return {};
    }
  }

  /**
   * Get pricing information from database
   * @param {Number} partId - Part ID
   * @returns {Promise<Object>} - Pricing object
   */
  static async getPricing(partId) {
    try {
      if (!partId) return { current: 0, currency: 'USD' };
      
      const result = await db.query(
        'SELECT price, sale_price FROM pc_parts WHERE id = $1 AND is_active = true',
        [partId]
      );
      
      if (result.rows.length > 0) {
        const part = result.rows[0];
        return {
          current: part.sale_price || part.price || 0,
          regular: part.price || 0,
          on_sale: part.sale_price && part.sale_price < part.price,
          currency: 'USD'
        };
      }
      
      return { current: 0, currency: 'USD' };
    } catch (error) {
      logger.warn('⚠️ Pricing lookup failed', { partId, error: error.message });
      return { current: 0, currency: 'USD' };
    }
  }

  /**
   * Get availability status
   * @param {Number} partId - Part ID
   * @returns {Promise<String>} - Availability status
   */
  static async getAvailability(partId) {
    try {
      if (!partId) return 'unknown';
      
      const result = await db.query(
        'SELECT stock_quantity, stock_status FROM pc_parts WHERE id = $1 AND is_active = true',
        [partId]
      );
      
      if (result.rows.length > 0) {
        const part = result.rows[0];
        if (part.stock_status === 'out_of_stock' || part.stock_quantity === 0) {
          return 'out_of_stock';
        } else if (part.stock_quantity < 5) {
          return 'low_stock';
        } else {
          return 'in_stock';
        }
      }
      
      return 'unknown';
    } catch (error) {
      logger.warn('⚠️ Availability lookup failed', { partId, error: error.message });
      return 'unknown';
    }
  }

  /**
   * Get user ratings and reviews summary
   * @param {Number} partId - Part ID
   * @returns {Promise<Object>} - Ratings object
   */
  static async getUserRatings(partId) {
    try {
      if (!partId) return { average: 0, count: 0 };
      
      // This would connect to a reviews system if implemented
      // For now, return placeholder
      return {
        average: 0,
        count: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    } catch (error) {
      logger.warn('⚠️ Ratings lookup failed', { partId, error: error.message });
      return { average: 0, count: 0 };
    }
  }

  /**
   * Get known issues for a component from community database
   * @param {String} category - Component category
   * @param {String} model - Component model name
   * @returns {Promise<Array>} - Array of known issues
   */
  static async getKnownIssues(category, model) {
    try {
      if (!model) return [];
      
      // Query compatibility_logs for community-reported issues
      const result = await db.query(`
        SELECT DISTINCT 
          jsonb_array_elements(issues)->>'description' as issue,
          COUNT(*) as frequency
        FROM compatibility_logs
        WHERE parts_json::text ILIKE $1
          AND outcome_quality = 'poor'
          AND created_at > NOW() - INTERVAL '6 months'
        GROUP BY issue
        HAVING COUNT(*) >= 3
        ORDER BY frequency DESC
        LIMIT 5
      `, [`%${model}%`]);
      
      return result.rows.map(row => ({
        description: row.issue,
        frequency: parseInt(row.frequency),
        source: 'community_reports'
      }));
    } catch (error) {
      logger.warn('⚠️ Known issues lookup failed', { category, model, error: error.message });
      return [];
    }
  }

  /**
   * Get compatibility notes from database
   * @param {String} category - Component category
   * @param {Number} partId - Part ID
   * @returns {Promise<Array>} - Compatibility notes
   */
  static async getCompatibilityNotes(category, partId) {
    try {
      if (!partId) return [];
      
      // This would query a compatibility_notes table if implemented
      // For now, return empty array
      return [];
    } catch (error) {
      logger.warn('⚠️ Compatibility notes lookup failed', { category, partId, error: error.message });
      return [];
    }
  }

  /**
   * Get recommended BIOS version for motherboard
   * @param {Object} motherboard - Motherboard object
   * @returns {Promise<Object>} - BIOS recommendation
   */
  static async getRecommendedBIOSVersion(motherboard) {
    try {
      // Placeholder - would query BIOS update database
      return {
        recommended: 'latest',
        notes: 'Check manufacturer website for latest stable BIOS'
      };
    } catch (error) {
      return { recommended: 'unknown' };
    }
  }

  /**
   * Assess VRM quality from specifications
   * @param {Object} motherboard - Motherboard object
   * @returns {Object} - VRM quality assessment
   */
  static assessVRMQuality(motherboard) {
    try {
      const specs = motherboard.specifications || {};
      const name = (motherboard.name || '').toLowerCase();
      
      // Simple heuristic based on chipset and board tier
      let quality = 'unknown';
      let maxCPUPower = 0;
      
      if (name.includes('x670e') || name.includes('x870e') || name.includes('z790')) {
        quality = 'excellent';
        maxCPUPower = 250;
      } else if (name.includes('x670') || name.includes('x870') || name.includes('z690')) {
        quality = 'good';
        maxCPUPower = 200;
      } else if (name.includes('b650') || name.includes('b760')) {
        quality = 'adequate';
        maxCPUPower = 150;
      } else if (name.includes('a620') || name.includes('h610')) {
        quality = 'basic';
        maxCPUPower = 100;
      }
      
      return {
        quality,
        max_cpu_power_watts: maxCPUPower,
        notes: quality === 'basic' ? 'May struggle with high-end CPUs under sustained load' : ''
      };
    } catch (error) {
      return { quality: 'unknown', max_cpu_power_watts: 0 };
    }
  }

  /**
   * Get PSU tier rating (based on tier list methodology)
   * @param {Object} psu - PSU object
   * @returns {Promise<Object>} - Tier rating
   */
  static async getPSUTierRating(psu) {
    try {
      const name = (psu.name || psu.model || '').toLowerCase();
      const specs = psu.specifications || {};
      
      // Simplified tier system based on common PSU brands and models
      let tier = 'C'; // Default mid-tier
      let explanation = 'Standard quality PSU suitable for most builds';
      
      // Tier A (Top tier): Corsair RMx, Seasonic Prime, EVGA Supernova P2/T2/G2
      if (
        name.includes('seasonic prime') ||
        name.includes('corsair rmx') ||
        name.includes('corsair hx') ||
        name.includes('evga supernova p2') ||
        name.includes('evga supernova t2') ||
        name.includes('be quiet! dark power')
      ) {
        tier = 'A';
        explanation = 'Top-tier PSU with excellent voltage regulation, efficiency, and reliability';
      }
      // Tier B: Good quality mainstream
      else if (
        name.includes('corsair rm') ||
        name.includes('seasonic focus') ||
        name.includes('evga supernova g') ||
        name.includes('msi mpg')
      ) {
        tier = 'B';
        explanation = 'High-quality PSU suitable for enthusiast builds';
      }
      // Tier D/E: Budget/low quality
      else if (
        name.includes('thermaltake smart') ||
        name.includes('evga w1') ||
        name.includes('evga br')
      ) {
        tier = 'D';
        explanation = 'Budget PSU - acceptable for low-power builds only';
      }
      
      return { tier, explanation };
    } catch (error) {
      return { tier: 'unknown', explanation: 'Unable to determine PSU quality tier' };
    }
  }

  /**
   * Get reliability reports for PSU
   * @param {Object} psu - PSU object
   * @returns {Promise<Object>} - Reliability data
   */
  static async getReliabilityReports(psu) {
    try {
      // Placeholder - would query reliability database
      return {
        failure_rate: 'unknown',
        warranty_years: psu.specifications?.warranty || 0,
        rma_reputation: 'unknown'
      };
    } catch (error) {
      return { failure_rate: 'unknown' };
    }
  }

  /**
   * Extract thermal data from CPU specifications
   * @param {Object} cpu - CPU object
   * @returns {Object} - Thermal data
   */
  static extractThermalData(cpu) {
    const specs = cpu.specifications || {};
    return {
      tdp: specs.tdp || specs.TDP || 0,
      base_clock: specs.base_clock || specs['Base Clock'] || 0,
      boost_clock: specs.boost_clock || specs['Boost Clock'] || 0,
      thermal_notes: specs.tdp > 150 ? 'High TDP - requires robust cooling' : ''
    };
  }

  /**
   * Extract thermal data from GPU specifications
   * @param {Object} gpu - GPU object
   * @returns {Object} - Thermal data
   */
  static extractGPUThermalData(gpu) {
    const specs = gpu.specifications || {};
    return {
      tdp: specs.tdp || specs.TDP || specs['Power Consumption'] || 0,
      cooler_type: specs.cooler_type || specs['Cooling Type'] || 'unknown',
      thermal_notes: specs.tdp > 300 ? 'High power - ensure adequate case airflow' : ''
    };
  }

  /**
   * Assess CPU performance tier
   * @param {Object} cpu - CPU object
   * @returns {String} - Performance tier
   */
  static assessCPUTier(cpu) {
    const name = (cpu.name || cpu.model || '').toLowerCase();
    
    if (name.includes('ultra 9') || name.includes('ryzen 9') || name.includes('threadripper')) {
      return 'flagship';
    } else if (name.includes('ultra 7') || name.includes('ryzen 7') || name.includes('i9')) {
      return 'high_end';
    } else if (name.includes('ultra 5') || name.includes('ryzen 5') || name.includes('i7')) {
      return 'mid_range';
    } else if (name.includes('ryzen 3') || name.includes('i5')) {
      return 'mainstream';
    } else {
      return 'entry_level';
    }
  }

  /**
   * Assess GPU performance tier
   * @param {Object} gpu - GPU object
   * @returns {String} - Performance tier
   */
  static assessGPUTier(gpu) {
    const name = (gpu.name || gpu.model || '').toLowerCase();
    
    if (name.includes('rtx 4090') || name.includes('rtx 4080') || name.includes('rx 7900')) {
      return 'flagship';
    } else if (name.includes('rtx 4070') || name.includes('rx 7800')) {
      return 'high_end';
    } else if (name.includes('rtx 4060') || name.includes('rx 7600')) {
      return 'mid_range';
    } else if (name.includes('rtx 3050') || name.includes('rx 6500')) {
      return 'entry_level';
    } else {
      return 'unknown';
    }
  }

  /**
   * Assess cooler TDP capacity
   * @param {Object} cooler - Cooler object
   * @returns {Object} - TDP rating
   */
  static assessCoolerTDP(cooler) {
    const specs = cooler.specifications || {};
    const name = (cooler.name || '').toLowerCase();
    
    let maxTDP = 0;
    
    // Air coolers
    if (name.includes('nh-d15') || name.includes('dark rock pro')) {
      maxTDP = 250;
    } else if (name.includes('nh-u12') || name.includes('dark rock 4')) {
      maxTDP = 180;
    }
    // AIO liquid coolers
    else if (name.includes('360mm') || name.includes('420mm')) {
      maxTDP = 300;
    } else if (name.includes('280mm') || name.includes('240mm')) {
      maxTDP = 200;
    } else if (name.includes('120mm')) {
      maxTDP = 120;
    }
    // Stock coolers
    else if (name.includes('stock') || name.includes('wraith')) {
      maxTDP = 95;
    }
    
    return {
      max_tdp: maxTDP || specs.max_tdp || 0,
      type: name.includes('aio') || name.includes('liquid') ? 'aio_liquid' : 'air',
      notes: maxTDP < 150 ? 'Limited cooling capacity - suitable for low-power CPUs only' : ''
    };
  }

  /**
   * Extract noise level data
   * @param {Object} cooler - Cooler object
   * @returns {Object} - Noise level data
   */
  static extractNoiseLevel(cooler) {
    const specs = cooler.specifications || {};
    return {
      min_dba: specs.noise_level_min || 0,
      max_dba: specs.noise_level_max || 0,
      notes: (specs.noise_level_max || 0) > 35 ? 'May be audible under load' : 'Quiet operation expected'
    };
  }

  /**
   * Assess storage performance tier
   * @param {Object} storage - Storage object
   * @returns {String} - Performance tier
   */
  static assessStorageTier(storage) {
    const specs = storage.specifications || {};
    const name = (storage.name || '').toLowerCase();
    
    if (name.includes('gen5') || name.includes('pcie 5.0')) {
      return 'flagship_gen5';
    } else if (name.includes('gen4') || name.includes('pcie 4.0') || specs.interface === 'NVMe PCIe 4.0') {
      return 'high_end_gen4';
    } else if (name.includes('gen3') || name.includes('pcie 3.0') || specs.interface === 'NVMe PCIe 3.0') {
      return 'mainstream_gen3';
    } else if (name.includes('sata')) {
      return 'sata_ssd';
    } else {
      return 'unknown';
    }
  }

  /**
   * Extract endurance rating
   * @param {Object} storage - Storage object
   * @returns {Object} - Endurance data
   */
  static extractEnduranceRating(storage) {
    const specs = storage.specifications || {};
    return {
      tbw: specs.tbw || specs.endurance_tbw || 0,
      warranty_years: specs.warranty_years || 0,
      notes: (specs.tbw || 0) < 300 ? 'Entry-level endurance - suitable for casual use' : 'Good endurance for heavy workloads'
    };
  }
}

module.exports = MetadataEnrichmentService;
