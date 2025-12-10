/**
 * Upgrade Value Scoring Service
 * Calculates performance gain per peso for upgrade recommendations
 * Implements ROI analysis for intelligent upgrade suggestions
 * 
 * ROOT CAUSE FIX #3: This service was completely missing
 */

const logger = require('../utils/logger');

class UpgradeValueService {
  constructor() {
    // Performance database - FPS benchmarks and productivity scores
    // Based on real-world benchmarks (TechPowerUp, Tom's Hardware, etc.)
    this.performanceDatabase = {
      // GPU Performance (relative to RTX 3060 = 100)
      gpu: {
        // High-end (150+)
        'RTX 4090': 250,
        'RTX 4080': 200,
        'RX 7900 XTX': 195,
        'RTX 4070 Ti': 160,
        
        // Mid-high (120-150)
        'RTX 4070': 140,
        'RX 7800 XT': 135,
        'RTX 3080': 130,
        'RX 6800 XT': 128,
        
        // Mid-range (80-120)
        'RTX 4060 Ti': 110,
        'RTX 3060 Ti': 105,
        'RTX 3060': 100,
        'RX 6700 XT': 98,
        'RTX 3050': 70,
        
        // Entry (40-80)
        'GTX 1660 Super': 60,
        'RX 6600': 85,
        'GTX 1650': 45,
        'RX 580': 50
      },
      
      // CPU Performance (relative to Ryzen 5 5600X = 100)
      cpu: {
        // High-end (150+)
        'Ryzen 9 7950X': 200,
        'Core i9-13900K': 195,
        'Ryzen 9 7900X': 180,
        'Core i7-13700K': 170,
        
        // Mid-high (120-150)
        'Ryzen 7 7700X': 145,
        'Ryzen 7 5800X3D': 140,
        'Core i5-13600K': 135,
        'Ryzen 7 5700X': 110,
        
        // Mid-range (80-120)
        'Ryzen 5 7600X': 125,
        'Ryzen 5 5600X': 100,
        'Core i5-12400F': 95,
        'Ryzen 5 5600': 95,
        
        // Entry (40-80)
        'Ryzen 5 3600': 75,
        'Core i3-12100F': 70,
        'Ryzen 3 3200G': 45
      },
      
      // RAM Performance (relative to 16GB DDR4-3200 = 100)
      ram: {
        '32GB DDR5-6000': 135,
        '32GB DDR5-5600': 130,
        '32GB DDR4-3600': 115,
        '32GB DDR4-3200': 110,
        '16GB DDR5-6000': 120,
        '16GB DDR5-5600': 115,
        '16GB DDR4-3600': 105,
        '16GB DDR4-3200': 100,
        '16GB DDR4-2666': 90,
        '8GB DDR4-3200': 60,
        '8GB DDR4-2666': 55
      }
    };
    
    // Typical Philippine market prices (November 2025)
    this.marketPrices = {
      gpu: {
        'RTX 4090': 120000,
        'RTX 4080': 85000,
        'RTX 4070 Ti': 45000,
        'RTX 4070': 32000,
        'RTX 4060 Ti': 24000,
        'RTX 3060 Ti': 22000,
        'RTX 3060': 18000,
        'RX 6700 XT': 19000,
        'GTX 1660 Super': 12000
      },
      cpu: {
        'Ryzen 9 7950X': 42000,
        'Ryzen 9 7900X': 35000,
        'Ryzen 7 7700X': 22000,
        'Ryzen 7 5800X3D': 18000,
        'Ryzen 5 7600X': 16000,
        'Ryzen 5 5600X': 11000,
        'Ryzen 5 5600': 9500
      },
      ram: {
        '32GB DDR5-6000': 9000,
        '32GB DDR5-5600': 8000,
        '32GB DDR4-3600': 6500,
        '32GB DDR4-3200': 6000,
        '16GB DDR5-6000': 5000,
        '16GB DDR4-3600': 3500,
        '16GB DDR4-3200': 3200,
        '8GB DDR4-3200': 1800
      }
    };
  }

  /**
   * Calculate value score for an upgrade
   * ROOT CAUSE FIX #3: Core algorithm for "performance gain per peso"
   * @param {Object} currentComponent - Current component
   * @param {Object} upgradeComponent - Upgrade option
   * @param {String} category - Component category (cpu/gpu/ram)
   * @returns {Object} Value score and analysis
   */
  calculateValueScore(currentComponent, upgradeComponent, category) {
    try {
      // Get performance scores
      const currentPerf = this.getPerformanceScore(currentComponent.name, category);
      const upgradePerf = this.getPerformanceScore(upgradeComponent.name, category);
      
      // Calculate performance gain
      const perfGainPercent = ((upgradePerf - currentPerf) / currentPerf) * 100;
      const perfGainAbsolute = upgradePerf - currentPerf;
      
      // Get price (from component or estimate)
      const upgradePrice = upgradeComponent.price || this.estimatePrice(upgradeComponent.name, category);
      
      // Calculate value score: (performance gain / price) * 1000
      // Multiplied by 1000 to get reasonable 0-100 scale
      const valueScore = (perfGainAbsolute / upgradePrice) * 1000;
      
      // Calculate ROI (bang for buck)
      const roi = perfGainPercent / (upgradePrice / 1000); // Gain per ₱1000
      
      // Determine value tier
      let valueTier = 'Poor';
      if (valueScore >= 0.8) valueTier = 'Excellent';
      else if (valueScore >= 0.5) valueTier = 'Very Good';
      else if (valueScore >= 0.3) valueTier = 'Good';
      else if (valueScore >= 0.15) valueTier = 'Fair';
      
      return {
        valueScore: Math.round(valueScore * 100) / 100,
        valueTier,
        performanceGainPercent: Math.round(perfGainPercent),
        performanceGainAbsolute: Math.round(perfGainAbsolute),
        upgradePrice,
        roi: Math.round(roi * 100) / 100,
        recommendation: this.generateRecommendation(valueScore, perfGainPercent, upgradePrice),
        currentPerformance: currentPerf,
        upgradePerformance: upgradePerf
      };
      
    } catch (error) {
      logger.error('Value score calculation failed', {
        error: error.message,
        currentComponent,
        upgradeComponent
      });
      
      return {
        valueScore: 0,
        valueTier: 'Unknown',
        error: error.message
      };
    }
  }

  /**
   * Get performance score for a component
   * @param {String} componentName - Component name
   * @param {String} category - Category (cpu/gpu/ram)
   * @returns {Number} Performance score
   */
  getPerformanceScore(componentName, category) {
    const db = this.performanceDatabase[category];
    if (!db) return 100; // Default

    // Try exact match first
    for (const [key, score] of Object.entries(db)) {
      if (componentName.toLowerCase().includes(key.toLowerCase())) {
        return score;
      }
    }

    // Fallback: estimate based on patterns
    return this.estimatePerformance(componentName, category);
  }

  /**
   * Estimate performance for unknown component
   * @param {String} componentName - Component name
   * @param {String} category - Category
   * @returns {Number} Estimated performance score
   */
  estimatePerformance(componentName, category) {
    const name = componentName.toLowerCase();
    
    if (category === 'gpu') {
      // RTX 40 series
      if (name.includes('4090')) return 250;
      if (name.includes('4080')) return 200;
      if (name.includes('4070')) return 140;
      if (name.includes('4060')) return 110;
      
      // RTX 30 series
      if (name.includes('3090')) return 180;
      if (name.includes('3080')) return 160;
      if (name.includes('3070')) return 130;
      if (name.includes('3060')) return 100;
      
      // AMD RX 7000
      if (name.includes('7900')) return 190;
      if (name.includes('7800')) return 135;
      if (name.includes('7700')) return 115;
    }
    
    if (category === 'cpu') {
      // Ryzen 7000 series
      if (name.includes('7950')) return 200;
      if (name.includes('7900')) return 180;
      if (name.includes('7700')) return 145;
      if (name.includes('7600')) return 125;
      
      // Ryzen 5000 series
      if (name.includes('5950')) return 170;
      if (name.includes('5900')) return 150;
      if (name.includes('5800')) return 120;
      if (name.includes('5600')) return 100;
    }
    
    return 100; // Default baseline
  }

  /**
   * Estimate price for component
   * @param {String} componentName - Component name
   * @param {String} category - Category
   * @returns {Number} Estimated price in pesos
   */
  estimatePrice(componentName, category) {
    const prices = this.marketPrices[category];
    if (!prices) return 10000; // Default

    // Try exact match
    for (const [key, price] of Object.entries(prices)) {
      if (componentName.toLowerCase().includes(key.toLowerCase())) {
        return price;
      }
    }

    // Fallback estimates
    if (category === 'gpu') {
      if (componentName.includes('4090')) return 120000;
      if (componentName.includes('4080')) return 85000;
      if (componentName.includes('4070')) return 35000;
      if (componentName.includes('3060')) return 20000;
    }

    return 15000; // Default estimate
  }

  /**
   * Generate recommendation text
   * @param {Number} valueScore - Value score
   * @param {Number} perfGain - Performance gain %
   * @param {Number} price - Price
   * @returns {String} Recommendation
   */
  generateRecommendation(valueScore, perfGain, price) {
    if (valueScore >= 0.8) {
      return `💰 EXCELLENT VALUE! ${perfGain}% performance boost for ₱${price.toLocaleString()}. Highly recommended upgrade.`;
    } else if (valueScore >= 0.5) {
      return `✅ Very good value. ${perfGain}% performance gain at ₱${price.toLocaleString()}.`;
    } else if (valueScore >= 0.3) {
      return `👍 Good upgrade option. ${perfGain}% faster for ₱${price.toLocaleString()}.`;
    } else if (valueScore >= 0.15) {
      return `⚠️ Fair value. ${perfGain}% gain but expensive at ₱${price.toLocaleString()}. Consider if budget allows.`;
    } else {
      return `❌ Poor value. Only ${perfGain}% gain for ₱${price.toLocaleString()}. Consider saving for better upgrade.`;
    }
  }

  /**
   * Rank upgrades by value score
   * ROOT CAUSE FIX #3: Returns top 3 best value upgrades
   * @param {Array} upgrades - List of upgrade options
   * @param {Object} currentComponent - Current component
   * @param {String} category - Category
   * @returns {Array} Sorted upgrades by value (best first)
   */
  rankUpgradesByValue(upgrades, currentComponent, category) {
    const scored = upgrades.map(upgrade => {
      const value = this.calculateValueScore(currentComponent, upgrade, category);
      return {
        ...upgrade,
        valueAnalysis: value,
        sortScore: value.valueScore
      };
    });

    // Sort by value score (highest first)
    scored.sort((a, b) => b.sortScore - a.sortScore);

    logger.info('Upgrades ranked by value', {
      category,
      total: scored.length,
      topValue: scored[0]?.sortScore,
      topTier: scored[0]?.valueAnalysis?.valueTier
    });

    return scored;
  }

  /**
   * Get top N best value upgrades
   * @param {Array} upgrades - List of upgrades
   * @param {Object} currentComponent - Current component
   * @param {String} category - Category
   * @param {Number} topN - Number of top results
   * @returns {Array} Top N upgrades by value
   */
  getTopValueUpgrades(upgrades, currentComponent, category, topN = 3) {
    const ranked = this.rankUpgradesByValue(upgrades, currentComponent, category);
    return ranked.slice(0, topN);
  }

  /**
   * Calculate sell and upgrade scenario
   * ROOT CAUSE FIX #3: "Sell old component + budget" calculator
   * @param {Object} currentComponent - Current component
   * @param {Number} budget - Available budget
   * @param {Number} resaleValue - Estimated resale value of current component
   * @returns {Object} Sell & upgrade analysis
   */
  calculateSellAndUpgrade(currentComponent, budget, resaleValue = null) {
    // Estimate resale value if not provided (typically 50-60% of original price)
    if (!resaleValue) {
      const currentPrice = currentComponent.price || this.estimatePrice(currentComponent.name, 'gpu');
      resaleValue = Math.floor(currentPrice * 0.55); // 55% resale value
    }

    const totalBudget = budget + resaleValue;

    return {
      currentComponent: currentComponent.name,
      estimatedResaleValue: resaleValue,
      availableBudget: budget,
      totalBudget: totalBudget,
      recommendation: `Sell your ${currentComponent.name} for ~₱${resaleValue.toLocaleString()}, add ₱${budget.toLocaleString()} = ₱${totalBudget.toLocaleString()} total budget`,
      message: `💡 TIP: Selling your current component increases your budget to ₱${totalBudget.toLocaleString()}`
    };
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      service: 'UpgradeValueService',
      status: 'operational',
      features: {
        valueScoring: true,
        roiCalculation: true,
        performanceDatabase: true,
        sellAndUpgrade: true
      },
      databaseSize: {
        gpus: Object.keys(this.performanceDatabase.gpu).length,
        cpus: Object.keys(this.performanceDatabase.cpu).length,
        ram: Object.keys(this.performanceDatabase.ram).length
      }
    };
  }
}

// Export singleton instance
module.exports = new UpgradeValueService();
