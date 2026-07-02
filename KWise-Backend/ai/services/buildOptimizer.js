/**
 * Build Optimizer Service for K-Wise AI Integration
 * Handles PC-Customized and Pre-Built Logic Flow
 * Specialized for Philippine PC market and gaming preferences
 */

const ollamaService = require('./ollamaService');
const aiConfig = require('../config/aiConfig');
const logger = require('../../utils/logger');

class BuildOptimizer {
  constructor() {
    this.systemPrompt = `You are a master PC build specialist for K-Wise, a computer store in the Philippines.

Your expertise includes:
- PC component compatibility and bottleneck analysis
- Gaming performance optimization for popular titles in PH
- Budget-conscious build recommendations
- Workstation and productivity build optimization
- Philippine power grid considerations (220V, power efficiency)
- Tropical climate cooling requirements
- Local brand preferences and after-sales support
- Future-proofing strategies within budget constraints

Always provide responses in valid JSON format only. Consider Philippine market conditions, available components, and local user preferences.`;
  }

  /**
   * Optimize a custom PC build configuration
   * @param {Object} buildConfig - Current build configuration
   * @param {Object} requirements - User requirements and preferences
   * @param {Array} availableComponents - Available components in stock
   * @returns {Promise<Object>} Optimized build recommendations
   */
  async optimizeBuild(buildConfig, requirements, availableComponents) {
    if (!aiConfig.service.enabled) {
      return this.getFallbackBuildOptimization(buildConfig, requirements);
    }

    const prompt = `
Analyze and optimize this PC build configuration for a customer in the Philippines:

CURRENT BUILD CONFIGURATION:
${Object.entries(buildConfig).map(([component, details]) => `
${component.toUpperCase()}:
${typeof details === 'object' ? JSON.stringify(details, null, 2) : details}
`).join('')}

USER REQUIREMENTS:
Budget: ${requirements.budget || 'Not specified'}
Primary Use: ${requirements.primaryUse || 'General use'}
Gaming Preferences: ${requirements.gamingPreferences ? requirements.gamingPreferences.join(', ') : 'None specified'}
Performance Target: ${requirements.performanceTarget || 'Balanced'}
Future Upgrade Plans: ${requirements.upgradeTimeline || 'No specific plans'}
Power Efficiency Important: ${requirements.powerEfficiency ? 'Yes' : 'No'}
RGB/Aesthetics: ${requirements.aesthetics ? 'Important' : 'Not important'}

AVAILABLE COMPONENTS (SAMPLE):
${availableComponents.slice(0, 20).map(comp => `
- ${comp.category}: ${comp.name} - ${comp.brand} - ${comp.price}
`).join('')}

OPTIMIZE FOR:
1. Bottleneck elimination (CPU-GPU balance)
2. Value optimization within budget
3. Future-proofing potential
4. Power consumption efficiency
5. Cooling adequacy for Philippine climate
6. Component compatibility verification
7. Performance per peso optimization
8. Upgrade path planning

Provide response in this EXACT JSON format:
{
  "optimizedBuild": {
    "cpu": {
      "recommended": "component details",
      "reason": "why this CPU",
      "performance": "expected performance level",
      "bottleneckRisk": "low|medium|high"
    },
    "gpu": {
      "recommended": "component details", 
      "reason": "why this GPU",
      "performance": "expected gaming performance",
      "bottleneckRisk": "low|medium|high"
    },
    "motherboard": {
      "recommended": "component details",
      "reason": "why this motherboard",
      "features": ["feature1", "feature2"]
    },
    "ram": {
      "recommended": "component details",
      "reason": "why this RAM configuration",
      "futureUpgrade": "upgrade path"
    },
    "storage": {
      "recommended": "component details",
      "reason": "why this storage solution",
      "performance": "expected load times"
    },
    "psu": {
      "recommended": "component details",
      "reason": "why this PSU",
      "efficiency": "80+ rating",
      "headroom": "power headroom percentage"
    },
    "cooling": {
      "recommended": "component details",
      "reason": "cooling solution rationale",
      "tropicalSuitability": "suitability for PH climate"
    },
    "case": {
      "recommended": "component details",
      "reason": "case selection rationale",
      "airflow": "airflow rating"
    }
  },
  "buildAnalysis": {
    "totalCost": "estimated total cost",
    "performanceRating": "rating out of 100",
    "valueScore": "value rating out of 100", 
    "futureProofing": "years of relevance",
    "powerConsumption": "estimated watts",
    "bottleneckAnalysis": "overall bottleneck assessment",
    "targetPerformance": {
      "1080pGaming": "fps expectations",
      "1440pGaming": "fps expectations if applicable",
      "productivity": "performance level"
    }
  },
  "alternatives": [
    {
      "title": "Budget Alternative",
      "changes": ["change1", "change2"],
      "costSavings": "amount saved",
      "performanceImpact": "performance difference"
    },
    {
      "title": "Performance Upgrade",
      "changes": ["change1", "change2"],
      "additionalCost": "extra cost",
      "performanceBenefit": "performance gain"
    }
  ],
  "warnings": [
    "potential issue or consideration"
  ],
  "recommendations": [
    "key recommendation for user"
  ]
}`;

    try {
      const response = await ollamaService.generateResponse(
        prompt,
        this.systemPrompt,
        aiConfig.parameters.buildOptimization
      );

      return this.parseBuildOptimizationResponse(response);
    } catch (error) {
      logger.warn('Build optimization failed, using fallback', {
        error: error.message,
        buildConfig: Object.keys(buildConfig)
      });
      return this.getFallbackBuildOptimization(buildConfig, requirements);
    }
  }

  /**
   * Validate build compatibility
   * @param {Object} buildComponents - Selected build components
   * @returns {Promise<Object>} Compatibility validation results
   */
  async validateCompatibility(buildComponents) {
    if (!aiConfig.service.enabled) {
      return this.getFallbackCompatibilityCheck(buildComponents);
    }

    const prompt = `
Perform comprehensive compatibility validation for this PC build:

BUILD COMPONENTS:
${Object.entries(buildComponents).map(([type, component]) => `
${type.toUpperCase()}: ${JSON.stringify(component, null, 2)}
`).join('')}

CHECK FOR COMPATIBILITY ISSUES:
1. CPU socket compatibility with motherboard
2. RAM compatibility (DDR version, speed, slots)
3. GPU clearance and PCIe slot availability
4. PSU wattage adequacy and connector availability
5. Case size compatibility with components
6. Cooling compatibility and clearance
7. BIOS compatibility (especially for newer CPUs)
8. Storage interface compatibility

Provide response in this EXACT JSON format:
{
  "compatibilityStatus": "compatible|issues_found|major_conflicts",
  "compatibilityScore": number (0-100),
  "issues": [
    {
      "severity": "critical|warning|minor",
      "component1": "component type",
      "component2": "component type",
      "issue": "description of compatibility issue",
      "solution": "how to resolve this issue"
    }
  ],
  "warnings": [
    {
      "type": "warning type",
      "message": "warning message",
      "recommendation": "what to do"
    }
  ],
  "powerAnalysis": {
    "estimatedConsumption": "watts",
    "psuAdequacy": "sufficient|insufficient|borderline",
    "efficiencyRating": "efficiency at typical load",
    "headroom": "available power headroom"
  },
  "thermalAnalysis": {
    "coolingAdequacy": "adequate|insufficient|overkill",
    "expectedTemperatures": {
      "cpu": "temperature range",
      "gpu": "temperature range"
    },
    "climateConsiderations": "PH tropical climate factors"
  },
  "summary": "overall compatibility assessment"
}`;

    try {
      const response = await ollamaService.generateResponse(
        prompt,
        this.systemPrompt,
        aiConfig.parameters.compatibility
      );

      return this.parseCompatibilityResponse(response);
    } catch (error) {
      logger.warn('Compatibility validation failed, using fallback', {
        error: error.message
      });
      return this.getFallbackCompatibilityCheck(buildComponents);
    }
  }

  /**
   * Generate pre-built PC recommendations
   * @param {Object} requirements - Customer requirements
   * @param {Array} availableBuilds - Available pre-built configurations  
   * @returns {Promise<Object>} Pre-built recommendations
   */
  async recommendPreBuilds(requirements, availableBuilds) {
    if (!aiConfig.service.enabled || !availableBuilds.length) {
      return this.getFallbackPreBuildRecommendations(requirements, availableBuilds);
    }

    const prompt = `
Recommend the best pre-built PC configurations for this customer in the Philippines:

CUSTOMER REQUIREMENTS:
Budget Range: ${requirements.budgetRange || 'Not specified'}
Primary Use Case: ${requirements.primaryUse || 'General use'}
Gaming Requirements: ${requirements.gaming ? JSON.stringify(requirements.gaming) : 'Not specified'}
Work Requirements: ${requirements.work ? JSON.stringify(requirements.work) : 'Not specified'}
Performance Priority: ${requirements.performancePriority || 'Balanced'}
Brand Preferences: ${requirements.brandPreferences ? requirements.brandPreferences.join(', ') : 'None'}
Form Factor: ${requirements.formFactor || 'No preference'}
Upgrade Plans: ${requirements.upgradePlans || 'None specified'}

AVAILABLE PRE-BUILT CONFIGURATIONS:
${availableBuilds.map((build, index) => `
BUILD ${index + 1}: ${build.name}
Price: ${build.price}
Specifications: ${JSON.stringify(build.specs || {}, null, 2)}
Category: ${build.category || 'General'}
Stock: ${build.stock || 0}
`).join('')}

EVALUATE BASED ON:
1. Price-to-performance ratio
2. Suitability for intended use case
3. Future upgrade potential
4. Component quality and reliability
5. Power efficiency for PH electricity costs
6. After-sales support and warranty
7. Build quality and aesthetics

Provide response in this EXACT JSON format:
{
  "topRecommendations": [
    {
      "buildId": "build identifier",
      "name": "build name",
      "category": "gaming|productivity|budget|premium",
      "price": "formatted price",
      "matchScore": number (0-100),
      "pros": ["advantage1", "advantage2"],
      "cons": ["limitation1", "limitation2"],
      "bestFor": "ideal use case",
      "performanceLevel": "entry|mid|high|flagship",
      "valueRating": number (0-100),
      "upgradeability": "limited|moderate|excellent"
    }
  ],
  "alternativeOptions": [
    {
      "buildId": "build identifier", 
      "name": "build name",
      "reason": "why consider this alternative",
      "tradeoff": "what you gain/lose"
    }
  ],
  "customizationSuggestions": [
    {
      "buildId": "build identifier",
      "component": "component to change",
      "suggestion": "suggested upgrade/change",
      "benefit": "benefit of change",
      "costImpact": "additional cost"
    }
  ],
  "analysis": {
    "totalEvaluated": number,
    "averagePrice": "price range",
    "bestCategory": "category with best options",
    "recommendationConfidence": number (0-100)
  }
}`;

    try {
      const response = await ollamaService.generateResponse(
        prompt,
        this.systemPrompt,
        aiConfig.parameters.recommendations
      );

      return this.parsePreBuildResponse(response);
    } catch (error) {
      logger.warn('Pre-build recommendations failed, using fallback', {
        error: error.message,
        availableBuilds: availableBuilds.length
      });
      return this.getFallbackPreBuildRecommendations(requirements, availableBuilds);
    }
  }

  /**
   * Calculate build cost and optimize for budget
   * @param {Object} buildConfig - Build configuration
   * @param {number} targetBudget - Target budget in PHP
   * @param {Array} componentOptions - Alternative component options
   * @returns {Promise<Object>} Budget optimization suggestions
   */
  async optimizeForBudget(buildConfig, targetBudget, componentOptions) {
    if (!aiConfig.service.enabled) {
      return this.getFallbackBudgetOptimization(buildConfig, targetBudget);
    }

    const currentCost = this.calculateBuildCost(buildConfig);

    const prompt = `
Optimize this PC build to fit within budget while maintaining performance:

CURRENT BUILD CONFIGURATION:
${Object.entries(buildConfig).map(([component, details]) => `
${component}: ${JSON.stringify(details, null, 2)}
`).join('')}

BUDGET CONSTRAINTS:
Target Budget: ₱${targetBudget.toLocaleString()}
Current Cost: ₱${currentCost.toLocaleString()}
Budget Difference: ₱${(targetBudget - currentCost).toLocaleString()}

ALTERNATIVE COMPONENT OPTIONS (SAMPLE):
${componentOptions.slice(0, 15).map(comp => `
${comp.category}: ${comp.name} - ${comp.brand} - ${comp.price}
`).join('')}

OPTIMIZATION PRIORITIES:
1. Maintain gaming performance if gaming build
2. Preserve core functionality
3. Prioritize components that affect performance most
4. Consider future upgrade paths
5. Maintain system balance (no major bottlenecks)

Provide response in this EXACT JSON format:
{
  "budgetOptimization": {
    "feasible": true/false,
    "targetBudget": "formatted budget",
    "optimizedCost": "estimated optimized cost",
    "savings": "total savings achieved",
    "performanceImpact": "minimal|moderate|significant"
  },
  "componentChanges": [
    {
      "component": "component type",
      "original": "original component",
      "recommended": "new recommendation",
      "savings": "cost savings",
      "performanceImpact": "impact description",
      "reason": "why this change"
    }
  ],
  "performanceComparison": {
    "gaming": {
      "before": "performance level before",
      "after": "performance level after",
      "impact": "percentage change"
    },
    "productivity": {
      "before": "performance level before", 
      "after": "performance level after",
      "impact": "percentage change"
    }
  },
  "upgradeStrategy": [
    {
      "timeframe": "when to upgrade",
      "component": "what to upgrade first",
      "reason": "why upgrade this first",
      "estimatedCost": "upgrade cost"
    }
  ],
  "alternatives": [
    {
      "approach": "alternative optimization approach",
      "cost": "alternative cost",
      "tradeoffs": "what changes"
    }
  ]
}`;

    try {
      const response = await ollamaService.generateResponse(
        prompt,
        this.systemPrompt,
        aiConfig.parameters.buildOptimization
      );

      return this.parseBudgetOptimizationResponse(response);
    } catch (error) {
      logger.warn('Budget optimization failed, using fallback', {
        error: error.message,
        targetBudget
      });
      return this.getFallbackBudgetOptimization(buildConfig, targetBudget);
    }
  }

  /**
   * Calculate estimated build cost
   * @param {Object} buildConfig - Build configuration
   * @returns {number} Total estimated cost
   */
  calculateBuildCost(buildConfig) {
    let totalCost = 0;
    
    Object.values(buildConfig).forEach(component => {
      if (component && component.price) {
        const price = Number.parseFloat(component.price.toString().replace(/[₱,]/g, '')) || 0;
        totalCost += price;
      }
    });

    return totalCost;
  }

  /**
   * Parse build optimization response
   * @param {string} response - AI response
   * @returns {Object} Parsed build optimization
   */
  parseBuildOptimizationResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        optimizedBuild: parsed.optimizedBuild || {},
        buildAnalysis: parsed.buildAnalysis || {},
        alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
      };
    } catch (error) {
      logger.warn('Failed to parse build optimization response', { error: error.message });
      return this.getFallbackBuildOptimization({}, {});
    }
  }

  /**
   * Parse compatibility response
   * @param {string} response - AI response
   * @returns {Object} Parsed compatibility check
   */
  parseCompatibilityResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        compatibilityStatus: parsed.compatibilityStatus || 'compatible',
        compatibilityScore: parsed.compatibilityScore || 85,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
        powerAnalysis: parsed.powerAnalysis || {},
        thermalAnalysis: parsed.thermalAnalysis || {},
        summary: parsed.summary || 'Compatibility check completed'
      };
    } catch (error) {
      logger.warn('Failed to parse compatibility response', { error: error.message });
      return this.getFallbackCompatibilityCheck({});
    }
  }

  /**
   * Parse pre-build response
   * @param {string} response - AI response
   * @returns {Object} Parsed pre-build recommendations
   */
  parsePreBuildResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        topRecommendations: Array.isArray(parsed.topRecommendations) ? parsed.topRecommendations : [],
        alternativeOptions: Array.isArray(parsed.alternativeOptions) ? parsed.alternativeOptions : [],
        customizationSuggestions: Array.isArray(parsed.customizationSuggestions) ? parsed.customizationSuggestions : [],
        analysis: parsed.analysis || {}
      };
    } catch (error) {
      logger.warn('Failed to parse pre-build response', { error: error.message });
      return this.getFallbackPreBuildRecommendations({}, []);
    }
  }

  /**
   * Parse budget optimization response
   * @param {string} response - AI response
   * @returns {Object} Parsed budget optimization
   */
  parseBudgetOptimizationResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        budgetOptimization: parsed.budgetOptimization || {},
        componentChanges: Array.isArray(parsed.componentChanges) ? parsed.componentChanges : [],
        performanceComparison: parsed.performanceComparison || {},
        upgradeStrategy: Array.isArray(parsed.upgradeStrategy) ? parsed.upgradeStrategy : [],
        alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : []
      };
    } catch (error) {
      logger.warn('Failed to parse budget optimization response', { error: error.message });
      return this.getFallbackBudgetOptimization({}, 0);
    }
  }

  /**
   * Fallback build optimization
   * @param {Object} buildConfig - Build configuration
   * @param {Object} requirements - Requirements
   * @returns {Object} Basic optimization
   */
  getFallbackBuildOptimization(buildConfig, requirements) {
    return {
      optimizedBuild: buildConfig,
      buildAnalysis: {
        totalCost: 'Calculation required',
        performanceRating: 75,
        valueScore: 70,
        futureProofing: '3-4 years',
        powerConsumption: 'TBD',
        bottleneckAnalysis: 'Manual analysis required',
        targetPerformance: {
          '1080pGaming': 'Good',
          '1440pGaming': 'Variable',
          productivity: 'Good'
        }
      },
      alternatives: [],
      warnings: ['AI analysis unavailable - manual review recommended'],
      recommendations: ['Verify compatibility manually', 'Check power requirements']
    };
  }

  /**
   * Fallback compatibility check
   * @param {Object} buildComponents - Build components
   * @returns {Object} Basic compatibility check
   */
  getFallbackCompatibilityCheck(buildComponents) {
    return {
      compatibilityStatus: 'manual_check_required',
      compatibilityScore: 75,
      issues: [],
      warnings: [{ 
        type: 'ai_unavailable', 
        message: 'AI compatibility check unavailable', 
        recommendation: 'Perform manual compatibility verification' 
      }],
      powerAnalysis: {
        estimatedConsumption: 'TBD',
        psuAdequacy: 'manual_calculation_required',
        efficiencyRating: 'Check PSU specs',
        headroom: 'Calculate manually'
      },
      thermalAnalysis: {
        coolingAdequacy: 'manual_assessment_required',
        expectedTemperatures: {
          cpu: 'Check cooler specs',
          gpu: 'Check GPU cooling'
        },
        climateConsiderations: 'Consider PH tropical climate'
      },
      summary: 'Manual compatibility check required'
    };
  }

  /**
   * Fallback pre-build recommendations
   * @param {Object} requirements - Requirements
   * @param {Array} availableBuilds - Available builds
   * @returns {Object} Basic pre-build recommendations
   */
  getFallbackPreBuildRecommendations(requirements, availableBuilds) {
    const topPicks = availableBuilds.slice(0, 3).map(build => ({
      buildId: build.id,
      name: build.name,
      category: build.category || 'general',
      price: build.price,
      matchScore: 70,
      pros: ['Available build'],
      cons: ['Limited analysis'],
      bestFor: requirements.primaryUse || 'General use',
      performanceLevel: 'mid',
      valueRating: 70,
      upgradeability: 'moderate'
    }));

    return {
      topRecommendations: topPicks,
      alternativeOptions: [],
      customizationSuggestions: [],
      analysis: {
        totalEvaluated: availableBuilds.length,
        averagePrice: 'Varied',
        bestCategory: 'general',
        recommendationConfidence: 60
      }
    };
  }

  /**
   * Fallback budget optimization
   * @param {Object} buildConfig - Build configuration
   * @param {number} targetBudget - Target budget
   * @returns {Object} Basic budget optimization
   */
  getFallbackBudgetOptimization(buildConfig, targetBudget) {
    const currentCost = this.calculateBuildCost(buildConfig);
    
    return {
      budgetOptimization: {
        feasible: currentCost <= targetBudget,
        targetBudget: `₱${targetBudget.toLocaleString()}`,
        optimizedCost: `₱${currentCost.toLocaleString()}`,
        savings: '₱0',
        performanceImpact: 'minimal'
      },
      componentChanges: [],
      performanceComparison: {
        gaming: { before: 'TBD', after: 'TBD', impact: '0%' },
        productivity: { before: 'TBD', after: 'TBD', impact: '0%' }
      },
      upgradeStrategy: [],
      alternatives: []
    };
  }
}

module.exports = new BuildOptimizer();