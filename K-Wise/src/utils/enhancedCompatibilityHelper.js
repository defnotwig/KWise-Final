/**
 * Enhanced Compatibility Helper for ProductPage
 * Phase 2 Enhancement: Integrates enhanced compatibility API with detailed analysis
 * 
 * @module EnhancedCompatibilityHelper
 * @version 2.0.0
 * @author K-Wise Phase 2 Team
 */

import { stockAPI } from '../services/api';
import { getFullImageUrl } from './networkConfig';

/**
 * Load enhanced compatible products with detailed compatibility analysis
 * @param {Object} productDetails - Current product details
 * @param {string} currentCategory - Product category
 * @param {Object} categoryImages - Category image mappings
 * @returns {Promise<Array>} Enhanced compatible products with detailed scoring
 */
export const loadEnhancedCompatibleProducts = async (productDetails, currentCategory, categoryImages, defaultImage) => {
  try {
    console.log('⚡ PHASE 2: Attempting enhanced compatibility API call...');
    
    if (!productDetails.id || !productDetails.specifications) {
      console.log('ℹ️ Product missing ID or specifications, skipping enhanced API');
      return null;
    }

    const enhancedResponse = await stockAPI.getEnhancedCompatibleProducts(
      productDetails.id,
      currentCategory,
      productDetails.specifications
    );
    
    if (!enhancedResponse || !enhancedResponse.success || !enhancedResponse.data || enhancedResponse.data.length === 0) {
      console.log('ℹ️ Enhanced API returned no results');
      return null;
    }

    console.log(`✅ Enhanced API returned ${enhancedResponse.data.length} products with detailed compatibility`);
    
    // Map enhanced products with additional compatibility details
    const compatibleItems = enhancedResponse.data.map(product => {
      // Determine compatibility badge
      let badge = '✅';
      let badgeTooltip = 'Excellent compatibility';
      
      if (product.compatibility_score < 90 && product.compatibility_score >= 80) {
        badge = '🟡';
        badgeTooltip = 'Good compatibility';
      } else if (product.compatibility_score < 80) {
        badge = '🟠';
        badgeTooltip = 'Fair compatibility - check requirements';
      }
      
      // Build detailed compatibility reason
      let compatibilityReason = `Compatible ${product.category}`;
      if (product.detailed_analysis) {
        const details = [];
        if (product.detailed_analysis.power_adequate !== undefined) {
          details.push(`Power: ${product.detailed_analysis.power_adequate ? '✅' : '⚠️'}`);
        }
        if (product.detailed_analysis.physical_clearance !== undefined) {
          details.push(`Clearance: ${product.detailed_analysis.physical_clearance ? '✅' : '⚠️'}`);
        }
        if (product.detailed_analysis.socket_match !== undefined) {
          details.push(`Socket: ${product.detailed_analysis.socket_match ? '✅' : '⚠️'}`);
        }
        if (product.detailed_analysis.tier_balanced !== undefined) {
          details.push(`Balanced: ${product.detailed_analysis.tier_balanced ? '✅' : '⚠️'}`);
        }
        
        if (details.length > 0) {
          compatibilityReason = `${badge} ${product.category} - ${details.join(', ')}`;
        }
      }
      
      return {
        id: product.id,
        name: product.name,
        price: product.price_formatted || `₱${product.price?.toLocaleString()}`,
        image: getFullImageUrl(product.image_url) || categoryImages[product.category] || defaultImage,
        category: product.category,
        compatibility_score: product.compatibility_score || 90,
        compatibility_status: product.compatibility_status || 'excellent',
        compatibility_reason: compatibilityReason,
        badge: badge,
        badge_tooltip: badgeTooltip,
        bios_warning: product.bios_warning,
        performance_notes: product.performance_notes,
        detailed_analysis: product.detailed_analysis,
        dbProduct: product,
        // Phase 2 enhancement flags
        enhanced: true,
        ai_analyzed: true
      };
    });
    
    // Log important warnings
    const biosWarnings = compatibleItems.filter(p => p.bios_warning);
    if (biosWarnings.length > 0) {
      console.log(`⚠️ BIOS UPDATE REQUIRED: ${biosWarnings.length} products need BIOS updates`);
      biosWarnings.forEach(p => {
        console.log(`  - ${p.name}: ${p.bios_warning}`);
      });
    }
    
    const performanceNotes = compatibleItems.filter(p => p.performance_notes);
    if (performanceNotes.length > 0) {
      console.log(`💡 PERFORMANCE NOTES: ${performanceNotes.length} products have performance insights`);
    }
    
    const fairCompatibility = compatibleItems.filter(p => p.compatibility_score < 80);
    if (fairCompatibility.length > 0) {
      console.log(`⚠️ ATTENTION: ${fairCompatibility.length} products have fair compatibility (score < 80)`);
    }
    
    return compatibleItems;
    
  } catch (error) {
    console.error('❌ Enhanced compatibility API error:', error);
    return null;
  }
};

/**
 * Format compatibility tooltip with detailed analysis
 * @param {Object} product - Product with detailed analysis
 * @returns {string} Formatted tooltip text
 */
export const formatCompatibilityTooltip = (product) => {
  if (!product.detailed_analysis) {
    return `Compatibility Score: ${product.compatibility_score}%`;
  }
  
  const tooltipLines = [
    `Compatibility Score: ${product.compatibility_score}%`,
    `Status: ${product.compatibility_status || 'Compatible'}`,
    ''
  ];
  
  const analysis = product.detailed_analysis;
  
  if (analysis.power_adequate !== undefined) {
    tooltipLines.push(`⚡ Power: ${analysis.power_adequate ? 'Adequate' : 'Check PSU requirements'}`);
  }
  
  if (analysis.physical_clearance !== undefined) {
    tooltipLines.push(`📏 Clearance: ${analysis.physical_clearance ? 'Fits' : 'Check dimensions'}`);
  }
  
  if (analysis.socket_match !== undefined) {
    tooltipLines.push(`🔌 Socket: ${analysis.socket_match ? 'Compatible' : 'Incompatible'}`);
  }
  
  if (analysis.tier_balanced !== undefined) {
    tooltipLines.push(`⚖️ Tier: ${analysis.tier_balanced ? 'Balanced' : 'May bottleneck'}`);
  }
  
  if (product.bios_warning) {
    tooltipLines.push('');
    tooltipLines.push(`⚠️ BIOS: ${product.bios_warning}`);
  }
  
  if (product.performance_notes) {
    tooltipLines.push('');
    tooltipLines.push(`💡 Note: ${product.performance_notes}`);
  }
  
  return tooltipLines.join('\n');
};

/**
 * Get compatibility badge color class
 * @param {number} score - Compatibility score (0-100)
 * @returns {string} CSS class name
 */
export const getCompatibilityBadgeClass = (score) => {
  if (score >= 90) return 'compatibility-excellent';
  if (score >= 80) return 'compatibility-good';
  if (score >= 70) return 'compatibility-fair';
  return 'compatibility-warning';
};

/**
 * Sort products by compatibility score (descending)
 * @param {Array} products - Products array
 * @returns {Array} Sorted products
 */
export const sortByCompatibilityScore = (products) => {
  return [...products].sort((a, b) => (b.compatibility_score || 0) - (a.compatibility_score || 0));
};

/**
 * Filter products by minimum compatibility score
 * @param {Array} products - Products array
 * @param {number} minScore - Minimum compatibility score threshold
 * @returns {Array} Filtered products
 */
export const filterByCompatibilityScore = (products, minScore = 70) => {
  return products.filter(p => (p.compatibility_score || 0) >= minScore);
};

/**
 * Check if product requires BIOS update
 * @param {Object} product - Product object
 * @returns {boolean} True if BIOS update required
 */
export const requiresBIOSUpdate = (product) => {
  return Boolean(product.bios_warning);
};

/**
 * Get compatibility summary statistics
 * @param {Array} products - Products array
 * @returns {Object} Summary stats
 */
export const getCompatibilitySummary = (products) => {
  const excellentCount = products.filter(p => p.compatibility_score >= 90).length;
  const goodCount = products.filter(p => p.compatibility_score >= 80 && p.compatibility_score < 90).length;
  const fairCount = products.filter(p => p.compatibility_score >= 70 && p.compatibility_score < 80).length;
  const warningCount = products.filter(p => p.compatibility_score < 70).length;
  const biosRequired = products.filter(p => p.bios_warning).length;
  const avgScore = products.reduce((sum, p) => sum + (p.compatibility_score || 0), 0) / (products.length || 1);
  
  return {
    total: products.length,
    excellent: excellentCount,
    good: goodCount,
    fair: fairCount,
    warning: warningCount,
    biosRequired,
    averageScore: Math.round(avgScore)
  };
};

const enhancedCompatibilityHelper = {
  loadEnhancedCompatibleProducts,
  formatCompatibilityTooltip,
  getCompatibilityBadgeClass,
  sortByCompatibilityScore,
  filterByCompatibilityScore,
  requiresBIOSUpdate,
  getCompatibilitySummary
};

export default enhancedCompatibilityHelper;
