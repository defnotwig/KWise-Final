/**
 * ============================================================================
 * RULE ENGINE SERVICE - Database-Driven Compatibility Rules
 * ============================================================================
 * 
 * Purpose: Query and evaluate compatibility rules from the compatibility_rules table
 * 
 * Features:
 * - Fetches rules by component pair categories
 * - Evaluates JSONB expressions against product specifications
 * - Applies severity levels (error/warning/info)
 * - Tracks which rules matched for logging
 * - Caching support for frequently used rules
 * 
 * Author: GitHub Copilot
 * Created: 2025-11-08
 * 
 * ============================================================================
 */

const db = require('../config/db');
const logger = require('../utils/logger');

class RuleEngine {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 1000 * 60 * 60; // 1 hour (rules don't change often)
  }

  /**
   * Fetch compatibility rules for a specific component pair
   * @param {string} componentA - Category of first component (e.g., 'CPU', 'Motherboard')
   * @param {string} componentB - Category of second component
   * @returns {Promise<Array>} Array of rule objects
   */
  async fetchRulesByComponents(componentA, componentB) {
    const cacheKey = `${componentA}:${componentB}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        logger.debug(`[RuleEngine] Cache HIT for ${cacheKey}`);
        return cached.rules;
      }
    }

    try {
      logger.debug(`[RuleEngine] Fetching rules for ${componentA} ↔ ${componentB}`);
      
      const result = await db.query(`
        SELECT 
          rule_name,
          rule_category,
          rule_type,
          rule_expression,
          component_a_category,
          component_b_category,
          severity,
          error_message,
          warning_message,
          solution_message,
          priority,
          enabled
        FROM compatibility_rules
        WHERE enabled = true
          AND (
            (component_a_category = $1 AND component_b_category = $2)
            OR
            (component_a_category = $2 AND component_b_category = $1)
          )
        ORDER BY 
          CASE severity
            WHEN 'error' THEN 1
            WHEN 'warning' THEN 2
            WHEN 'info' THEN 3
            ELSE 4
          END,
          priority DESC
      `, [componentA, componentB]);

      // Cache the results
      this.cache.set(cacheKey, {
        rules: result.rows,
        timestamp: Date.now()
      });

      logger.info(`[RuleEngine] Found ${result.rows.length} rules for ${componentA} ↔ ${componentB}`);
      return result.rows;

    } catch (error) {
      logger.error('[RuleEngine] Error fetching rules:', error);
      return [];
    }
  }

  /**
   * Fetch all rules for a specific category (e.g., all 'socket' rules)
   * @param {string} category - Rule category
   * @returns {Promise<Array>} Array of rule objects
   */
  async fetchRulesByCategory(category) {
    const cacheKey = `category:${category}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.rules;
      }
    }

    try {
      const result = await db.query(`
        SELECT 
          rule_name,
          rule_category,
          rule_type,
          rule_expression,
          component_a_category,
          component_b_category,
          severity,
          error_message,
          warning_message,
          solution_message,
          priority
        FROM compatibility_rules
        WHERE enabled = true
          AND rule_category = $1
        ORDER BY priority DESC
      `, [category]);

      this.cache.set(cacheKey, {
        rules: result.rows,
        timestamp: Date.now()
      });

      return result.rows;

    } catch (error) {
      logger.error(`[RuleEngine] Error fetching rules for category ${category}:`, error);
      return [];
    }
  }

  /**
   * Evaluate a JSONB rule expression against component specifications
   * @param {object} rule - Rule object with rule_expression JSONB
   * @param {object} componentA - First component with category and specifications
   * @param {object} componentB - Second component with category and specifications (optional)
   * @returns {object} { matches: boolean, details: string, matchedKeys: array }
   */
  evaluateRule(rule, componentA, componentB = null) {
    try {
      const expression = rule.rule_expression;
      
      if (!expression || typeof expression !== 'object') {
        return { matches: false, details: 'Invalid rule expression', matchedKeys: [] };
      }

      const matchedKeys = [];
      const unmatchedKeys = [];
      
      // Prepare enriched specs with category-specific key mapping
      const specsA = this.enrichComponentSpecs(componentA);
      const specsB = componentB ? this.enrichComponentSpecs(componentB) : null;
      
      // Evaluate each key in the expression
      for (const [key, expectedValue] of Object.entries(expression)) {
        // Check in both components (enriched specs include category-specific mappings)
        const actualValueA = this.getNestedValue(specsA, key);
        const actualValueB = specsB ? this.getNestedValue(specsB, key) : null;
        
        const matchesA = this.compareValues(actualValueA, expectedValue);
        const matchesB = actualValueB !== null ? this.compareValues(actualValueB, expectedValue) : false;
        
        if (matchesA || matchesB) {
          matchedKeys.push({
            key,
            expected: expectedValue,
            actual: matchesA ? actualValueA : actualValueB,
            component: matchesA ? 'A' : 'B'
          });
        } else {
          unmatchedKeys.push({
            key,
            expected: expectedValue,
            actualA: actualValueA,
            actualB: actualValueB
          });
        }
      }

      // Rule matches if ALL keys match
      const matches = unmatchedKeys.length === 0;
      
      const details = matches
        ? `All ${matchedKeys.length} conditions met`
        : `${unmatchedKeys.length} condition(s) not met: ${unmatchedKeys.map(k => k.key).join(', ')}`;

      return { matches, details, matchedKeys, unmatchedKeys };

    } catch (error) {
      logger.error('[RuleEngine] Error evaluating rule:', error);
      return { matches: false, details: 'Evaluation error', matchedKeys: [] };
    }
  }

  /**
   * Enrich component with category-specific key mappings
   * Maps generic keys to category-specific keys expected by rules
   * @param {object} component - Component with category and specifications
   * @returns {object} Enriched specifications object
   */
  enrichComponentSpecs(component) {
    if (!component) return {};
    
    const category = component.category;
    const specs = component.specifications || {};
    
    // Create enriched object with all original specs plus category-specific mappings
    const enriched = { ...specs };
    
    // Map category-specific keys based on component category
    if (category === 'CPU') {
      // Map socket -> cpu_socket
      if (specs.socket) enriched.cpu_socket = specs.socket;
      
      // Extract generation from name or specs
      if (component.name) {
        const genMatch = component.name.match(/(\d+)(?:th|st|nd|rd)\s+Gen/i);
        if (genMatch) enriched.cpu_generation = `${genMatch[1]}th Gen`;
        
        // Also check for Ryzen generations
        const ryzenMatch = component.name.match(/Ryzen\s+(\d+)/i);
        if (ryzenMatch) enriched.cpu_series = Number.parseInt(ryzenMatch[1], 10);
      }
      
      // Copy other CPU-specific fields
      if (specs.cores) enriched.cpu_cores = specs.cores;
      if (specs.threads) enriched.cpu_threads = specs.threads;
      if (specs.tdp) enriched.cpu_tdp = specs.tdp;
      if (specs.model) enriched.cpu_model = specs.model;
      
    } else if (category === 'Motherboard') {
      // Map socket -> motherboard_socket
      if (specs.socket) enriched.motherboard_socket = specs.socket;
      
      // Map chipset -> motherboard_chipset (already exists but ensure)
      if (specs.chipset) enriched.motherboard_chipset = specs.chipset;
      
      // Copy other motherboard-specific fields
      if (specs.chipset) enriched.chipset = specs.chipset;
      if (specs.memory_type) enriched.memory_type = specs.memory_type;
      if (specs.max_ram) enriched.max_ram = specs.max_ram;
      if (specs.ram_slots) enriched.ram_slots = specs.ram_slots;
      if (specs.m2_slots) enriched.m2_slots = specs.m2_slots;
      
    } else if (category === 'RAM') {
      // Map RAM-specific fields
      if (specs.memory_type) enriched.ram_type = specs.memory_type;
      if (specs.speed) enriched.ram_speed = specs.speed;
      if (specs.capacity) enriched.ram_capacity = specs.capacity;
      if (specs.cas_latency) enriched.ram_cl = specs.cas_latency;
      
    } else if (category === 'GPU') {
      // Map GPU-specific fields
      if (specs.chipset) enriched.gpu_chipset = specs.chipset;
      if (specs.memory) enriched.gpu_memory = specs.memory;
      if (specs.tdp) enriched.gpu_tdp = specs.tdp;
      if (specs.pcie_version) enriched.pcie_version = specs.pcie_version;
      if (specs.length) enriched.gpu_length = specs.length;
      
    } else if (category === 'PSU') {
      // Map PSU-specific fields
      if (specs.wattage) enriched.psu_wattage = specs.wattage;
      if (specs.efficiency) enriched.psu_efficiency = specs.efficiency;
      if (specs.modular) enriched.psu_modular = specs.modular;
      if (specs.pcie_connectors) enriched.psu_pcie_connectors = specs.pcie_connectors;
      
    } else if (category === 'Storage') {
      // Map Storage-specific fields
      if (specs.type) enriched.storage_type = specs.type;
      if (specs.capacity) enriched.storage_capacity = specs.capacity;
      if (specs.interface) enriched.storage_interface = specs.interface;
      if (specs.form_factor) enriched.storage_form_factor = specs.form_factor;
      
    } else if (category === 'Cooling') {
      // Map Cooling-specific fields
      if (specs.type) enriched.cooling_type = specs.type;
      if (specs.fan_size) enriched.cooling_fan_size = specs.fan_size;
      if (specs.tdp_rating) enriched.cooling_tdp = specs.tdp_rating;
      if (specs.socket_compatibility) enriched.cooling_socket = specs.socket_compatibility;
      
    } else if (category === 'Case') {
      // Map Case-specific fields
      if (specs.form_factor) enriched.case_form_factor = specs.form_factor;
      if (specs.max_gpu_length) enriched.case_max_gpu = specs.max_gpu_length;
      if (specs.max_cpu_cooler_height) enriched.case_max_cooler = specs.max_cpu_cooler_height;
    }
    
    return enriched;
  }

  /**
   * Get nested value from object using dot notation (e.g., 'specs.socket')
   */
  getNestedValue(obj, path) {
    if (!obj) return null;
    
    const keys = path.split('.');
    let value = obj;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value;
  }

  /**
   * Compare actual value against expected value (supports various comparison types)
   */
  compareValues(actual, expected) {
    if (actual === null || actual === undefined) return false;
    if (expected === null || expected === undefined) return false;

    // Exact match
    if (actual === expected) return true;

    // Case-insensitive string match
    if (typeof actual === 'string' && typeof expected === 'string') {
      return actual.toLowerCase().includes(expected.toLowerCase());
    }

    // Numeric comparison
    if (typeof expected === 'object' && !Array.isArray(expected)) {
      if ('min' in expected && actual < expected.min) return false;
      if ('max' in expected && actual > expected.max) return false;
      if ('equals' in expected && actual !== expected.equals) return false;
      return true;
    }

    // Array contains check
    if (Array.isArray(expected)) {
      return expected.some(val => this.compareValues(actual, val));
    }

    return false;
  }

  /**
   * Check compatibility for a complete build
   * @param {object} build - Build object with components { CPU: {...}, Motherboard: {...}, RAM: {...}, etc. }
   * @returns {Promise<object>} Compatibility result with issues and rules applied
   */
  async checkBuildCompatibility(build) {
    const startTime = Date.now();
    logger.info('[RuleEngine] Starting build compatibility check');

    const results = {
      compatible: true,
      score: 100,
      issues: [],
      warnings: [],
      info: [],
      rulesApplied: [],
      componentPairsChecked: 0,
      totalRulesFetched: 0,
      totalRulesMatched: 0,
      executionTime: 0
    };

    try {
      const componentCategories = Object.keys(build).filter(key => build[key]);
      
      // Check each component pair
      for (let i = 0; i < componentCategories.length; i++) {
        for (let j = i + 1; j < componentCategories.length; j++) {
          const catA = componentCategories[i];
          const catB = componentCategories[j];
          
          const componentA = build[catA];
          const componentB = build[catB];
          
          if (!componentA || !componentB) continue;

          results.componentPairsChecked++;
          
          // Fetch rules for this pair
          const rules = await this.fetchRulesByComponents(catA, catB);
          results.totalRulesFetched += rules.length;

          // Evaluate each rule
          for (const rule of rules) {
            const evaluation = this.evaluateRule(rule, componentA, componentB);
            
            if (evaluation.matches) {
              results.totalRulesMatched++;
              
              const ruleResult = {
                ruleName: rule.rule_name,
                category: rule.rule_category,
                severity: rule.severity,
                componentPair: `${catA} ↔ ${catB}`,
                matched: true,
                details: evaluation.details,
                priority: rule.priority
              };

              results.rulesApplied.push(ruleResult);

              // Add to appropriate severity list
              if (rule.severity === 'error') {
                results.compatible = false;
                results.score -= 20;
                results.issues.push({
                  ...ruleResult,
                  message: rule.error_message,
                  solution: rule.solution_message
                });
              } else if (rule.severity === 'warning') {
                results.score -= 5;
                results.warnings.push({
                  ...ruleResult,
                  message: rule.warning_message,
                  solution: rule.solution_message
                });
              } else {
                results.info.push({
                  ...ruleResult,
                  message: rule.warning_message || rule.error_message
                });
              }
            }
          }
        }
      }

      // Ensure score doesn't go negative
      results.score = Math.max(0, results.score);
      
      results.executionTime = Date.now() - startTime;
      
      logger.info(`[RuleEngine] Check complete in ${results.executionTime}ms: ${results.totalRulesFetched} rules fetched, ${results.totalRulesMatched} matched, Compatible: ${results.compatible}`);

    } catch (error) {
      logger.error('[RuleEngine] Error checking build compatibility:', error);
      results.error = error.message;
    }

    return results;
  }

  /**
   * Check compatibility between two specific components
   * @param {object} componentA - First component with category and specifications
   * @param {object} componentB - Second component with category and specifications
   * @returns {Promise<object>} Compatibility result
   */
  async checkComponentPair(componentA, componentB) {
    const startTime = Date.now();
    
    const results = {
      compatible: true,
      issues: [],
      warnings: [],
      info: [],
      rulesApplied: [],
      executionTime: 0
    };

    try {
      const rules = await this.fetchRulesByComponents(componentA.category, componentB.category);
      
      for (const rule of rules) {
        const evaluation = this.evaluateRule(rule, componentA, componentB);
        
        if (evaluation.matches) {
          const ruleResult = {
            ruleName: rule.rule_name,
            category: rule.rule_category,
            severity: rule.severity,
            matched: true,
            details: evaluation.details
          };

          results.rulesApplied.push(ruleResult);

          if (rule.severity === 'error') {
            results.compatible = false;
            results.issues.push({
              ...ruleResult,
              message: rule.error_message,
              solution: rule.solution_message
            });
          } else if (rule.severity === 'warning') {
            results.warnings.push({
              ...ruleResult,
              message: rule.warning_message,
              solution: rule.solution_message
            });
          } else {
            results.info.push({
              ...ruleResult,
              message: rule.warning_message || rule.error_message
            });
          }
        }
      }

      results.executionTime = Date.now() - startTime;

    } catch (error) {
      logger.error('[RuleEngine] Error checking component pair:', error);
      results.error = error.message;
    }

    return results;
  }

  /**
   * Clear the rule cache (useful after rule updates)
   */
  clearCache() {
    this.cache.clear();
    logger.info('[RuleEngine] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
const ruleEngine = new RuleEngine();

module.exports = ruleEngine;
