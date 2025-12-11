/**
 * FRONTEND COMPATIBILITY VALIDATOR
 * Enforces strict compatibility validation across all kiosk pages
 * Works with backend compatibilityService for comprehensive validation
 * 
 * COVERAGE: All 19 compatibility relationships
 * ENFORCEMENT: Hard blocks + visual warnings
 * 
 * Date: January 27, 2025
 * Author: K-Wise Development Team
 */

import api from '../api/api';

/**
 * Compatibility Validator Class
 * Centralized validation logic for all kiosk pages
 */
class CompatibilityValidator {
  constructor() {
    this.validationCache = new Map(); // Cache validation results
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generate cache key for validation request
   */
  generateCacheKey(selectedComponents, newComponent) {
    const componentIds = Object.values(selectedComponents)
      .filter(c => c && c.id)
      .map(c => c.id)
      .sort()
      .join('_');
    const newId = newComponent?.id || 'new';
    return `${componentIds}_${newId}`;
  }

  /**
   * Clear cache (call when cart changes)
   */
  clearCache() {
    this.validationCache.clear();
  }

  /**
   * MAIN VALIDATION METHOD
   * Validates a new component against currently selected components
   * 
   * @param {Object|Array} selectedComponents - Currently selected build components (object or array)
   * @param {Object} newComponent - New component to validate
   * @returns {Object} - Validation result with compatibility score, issues, and blocking status
   */
  async validateComponent(selectedComponents, newComponent) {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(selectedComponents, newComponent);
      const cached = this.validationCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        console.log('✅ Using cached validation result for', newComponent?.name || newComponent?.id);
        return cached.result;
      }

      // Filter out null/undefined components and convert to proper format
      let validComponents = {};
      
      if (selectedComponents) {
        if (Array.isArray(selectedComponents)) {
          // Convert array to object by category
          selectedComponents.forEach(component => {
            if (component && component.id && component.category) {
              validComponents[component.category] = component;
            }
          });
        } else if (typeof selectedComponents === 'object') {
          // Already an object, just filter nulls
          validComponents = Object.entries(selectedComponents)
            .filter(([key, component]) => component && component.id)
            .reduce((obj, [key, component]) => {
              obj[key] = component;
              return obj;
            }, {});
        }
      }

      // If no components selected yet, allow everything
      if (Object.keys(validComponents).length === 0) {
        return {
          compatible: true,
          score: 100,
          issues: [],
          warnings: [],
          blocking: false,
          message: 'First component - no compatibility checks needed'
        };
      }

      console.log('🔍 Validating component:', newComponent?.name || newComponent?.id, 'against', Object.keys(validComponents).length, 'selected components');

      // Call backend compatibility API (pass the object directly, kioskAPI will handle conversion)
      const response = await api.kiosk.checkCompatibility(validComponents, newComponent);

      console.log('📊 Backend response:', response);

      // Handle different response formats
      const compatibilityData = response?.data || response;
      const score = compatibilityData?.compatibility_score || compatibilityData?.compatibilityScore || compatibilityData?.score || compatibilityData?.confidence * 100 || 50;
      const issues = compatibilityData?.compatibility_issues || compatibilityData?.issues || [];
      const warnings = compatibilityData?.warnings || compatibilityData?.suggestions || [];

      // Determine if component should be blocked
      const criticalIssues = issues.filter(issue => 
        issue.severity === 'critical' || 
        issue.severity === 'blocker' ||
        issue.severity === 'error' ||
        issue.type === 'critical'
      );

      const blocking = criticalIssues.length > 0 || score < 50;

      const result = {
        compatible: score >= 50 && criticalIssues.length === 0,
        score: score,
        issues: criticalIssues,
        warnings: warnings,
        blocking: blocking,
        message: blocking 
          ? `⚠️ Incompatible: ${criticalIssues.map(i => i.message).join(', ')}`
          : score >= 90 
            ? '✅ Fully Compatible'
            : score >= 75
              ? '⚠️ Compatible with Minor Warnings'
              : '🔶 May Work (Not Recommended)'
      };

      // Cache result
      this.validationCache.set(cacheKey, {
        timestamp: Date.now(),
        result: result
      });

      return result;

    } catch (error) {
      console.error('❌ Compatibility validation error:', error);
      return {
        compatible: false,
        score: 0,
        issues: [{ severity: 'critical', message: `Validation failed: ${error.message}` }],
        warnings: [],
        blocking: true,
        message: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * BATCH VALIDATION
   * Validates multiple products at once (for product list filtering)
   * 
   * @param {Object} selectedComponents - Currently selected build components
   * @param {Array} products - Array of products to validate
   * @returns {Array} - Products with compatibility scores attached
   */
  async validateProductList(selectedComponents, products) {
    try {
      // If no components selected, return all products as compatible
      const validComponents = Object.entries(selectedComponents)
        .filter(([key, component]) => component && component.id)
        .reduce((obj, [key, component]) => {
          obj[key] = component.id;
          return obj;
        }, {});

      if (Object.keys(validComponents).length === 0) {
        return products.map(product => ({
          ...product,
          compatibility_score: 100,
          compatibility_compatible: true,
          compatibility_issues: [],
          compatibility_warnings: [],
          compatibility_blocking: false
        }));
      }

      console.log('🔍 Batch validating', products.length, 'products against', Object.keys(validComponents).length, 'selected components');

      // Call backend batch compatibility API
      const response = await api.post('/kiosk/compatibility/batch-analyze', {
        selectedParts: validComponents,
        candidateProducts: products.map(p => ({ id: p.id, category: p.category }))
      });

      if (!response.data.success) {
        console.error('❌ Batch compatibility check failed:', response.data.message);
        return products; // Return original products without scores
      }

      // Attach compatibility scores to products
      const scoredProducts = products.map(product => {
        const compatResult = response.data.data.find(r => r.product_id === product.id);
        
        if (!compatResult) {
          return {
            ...product,
            compatibility_score: 0,
            compatibility_compatible: false,
            compatibility_issues: [{ severity: 'critical', message: 'Compatibility data not found' }],
            compatibility_warnings: [],
            compatibility_blocking: true
          };
        }

        const score = compatResult.compatibility_score || compatResult.compatibilityScore || 0;
        const issues = compatResult.compatibility_issues || compatResult.issues || [];
        const warnings = compatResult.warnings || [];
        const criticalIssues = issues.filter(i => 
          i.severity === 'critical' || i.severity === 'blocker'
        );

        return {
          ...product,
          compatibility_score: score,
          compatibility_compatible: score >= 50 && criticalIssues.length === 0,
          compatibility_issues: criticalIssues,
          compatibility_warnings: warnings,
          compatibility_blocking: criticalIssues.length > 0 || score < 50
        };
      });

      return scoredProducts;

    } catch (error) {
      console.error('❌ Batch compatibility validation error:', error);
      return products; // Return original products on error
    }
  }

  /**
   * FULL BUILD VALIDATION
   * Validates entire build before checkout
   * 
   * @param {Object} buildComponents - All selected build components
   * @returns {Object} - Validation result with blocking issues and warnings
   */
  async validateFullBuild(buildComponents) {
    try {
      // 🔥 CRITICAL FIX: Send FULL component objects, NOT just IDs
      // The backend needs specifications and dimensions for accurate GPU clearance validation
      const validComponents = Object.entries(buildComponents)
        .filter(([key, component]) => component && component.id)
        .reduce((obj, [key, component]) => {
          // Send full component object with all specs and dimensions
          obj[key] = {
            id: component.id,
            name: component.name,
            category: component.category,
            specifications: component.specifications || {},
            dimensions: component.dimensions || {},
            // Include other relevant fields
            price: component.price,
            form_factor: component.form_factor || component.specifications?.form_factor,
            socket: component.socket || component.specifications?.socket
          };
          return obj;
        }, {});

      if (Object.keys(validComponents).length < 2) {
        return {
          valid: false,
          blocking: true,
          message: 'Incomplete build - minimum 2 components required',
          issues: [{ severity: 'critical', message: 'Build must have at least CPU + Motherboard' }],
          warnings: [],
          compatibilityScore: 0
        };
      }

      console.log('🔍 Validating full build with', Object.keys(validComponents).length, 'components');

      // Call backend full build validation API
      const response = await api.kiosk.checkFullBuildCompatibility(validComponents);

      if (!response.success) {
        console.error('❌ Full build validation failed:', response.message);
        return {
          valid: false,
          blocking: true,
          message: response.message,
          issues: [{ severity: 'critical', message: response.message }],
          warnings: [],
          compatibilityScore: 0
        };
      }

      const data = response.data || response;
      const score = data.compatibility_score || data.compatibilityScore || 0;
      const issues = data.critical_issues || data.criticalIssues || [];
      const warnings = data.warnings || [];
      
      // 🔥 CRITICAL FIX: Only block if there are ACTUAL critical issues
      // Backend marks builds as "compatible" even with low scores
      // Warnings should NEVER block navigation to payment
      const isCompatible = data.compatible === true || data.overall_status === 'compatible';
      
      // ONLY block if:
      // 1. There are critical issues (issues array not empty)
      // 2. AND the backend explicitly marked it as incompatible
      const hasCriticalIssues = issues.length > 0;
      const blocking = hasCriticalIssues && !isCompatible;

      console.log('🔍 Validation result:', {
        isCompatible,
        hasCriticalIssues,
        blocking,
        issuesCount: issues.length,
        warningsCount: warnings.length,
        score
      });

      return {
        valid: !blocking, // Build is valid if not blocking
        blocking: blocking, // Only block if critical issues + incompatible
        message: blocking 
          ? `⚠️ Build has critical compatibility issues`
          : score >= 90
            ? '✅ Fully Compatible Build'
            : score >= 75
              ? '⚠️ Build Compatible with Minor Warnings'
              : isCompatible
                ? '✅ Build Compatible'
                : '🔶 Build May Work (Not Recommended)',
        issues: issues, // Critical issues only
        warnings: warnings, // Non-blocking warnings
        compatibilityScore: score,
        score: score, // Also provide as 'score' for consistency
        details: data.details || {}
      };

    } catch (error) {
      console.error('❌ Full build validation error:', error);
      return {
        valid: false,
        blocking: true,
        message: `Validation failed: ${error.message}`,
        issues: [{ severity: 'critical', message: error.message }],
        warnings: [],
        compatibilityScore: 0
      };
    }
  }

  /**
   * VISUAL COMPATIBILITY INDICATOR
   * Returns CSS class and icon based on compatibility score
   */
  getCompatibilityIndicator(score) {
    if (score >= 90) {
      return {
        className: 'compatibility-excellent',
        icon: '✅',
        color: '#4CAF50',
        text: 'Fully Compatible',
        description: 'This component works perfectly with your current selection'
      };
    } else if (score >= 75) {
      return {
        className: 'compatibility-good',
        icon: '⚠️',
        color: '#FFC107',
        text: 'Compatible',
        description: 'This component works with minor warnings'
      };
    } else if (score >= 50) {
      return {
        className: 'compatibility-warning',
        icon: '🔶',
        color: '#FF9800',
        text: 'May Work',
        description: 'This component may work but is not recommended'
      };
    } else {
      return {
        className: 'compatibility-blocked',
        icon: '❌',
        color: '#F44336',
        text: 'Incompatible',
        description: 'This component is incompatible with your current selection'
      };
    }
  }

  /**
   * FORMAT COMPATIBILITY ISSUES
   * Formats issues for display in modals/tooltips
   */
  formatIssues(issues, warnings) {
    const formatted = {
      critical: issues.filter(i => i.severity === 'critical' || i.severity === 'blocker'),
      major: issues.filter(i => i.severity === 'major'),
      warnings: warnings,
      info: issues.filter(i => i.severity === 'info')
    };

    return formatted;
  }
}

// Export singleton instance
const compatibilityValidator = new CompatibilityValidator();
export default compatibilityValidator;
