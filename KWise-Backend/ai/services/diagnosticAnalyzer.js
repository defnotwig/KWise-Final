/**
 * Diagnostic Analyzer Service for K-Wise AI Integration
 * Handles PC-Checkup and PC-Upgrade Logic Flow
 * Specialized for Philippine PC service market
 */

const ollamaService = require('./ollamaService');
const aiConfig = require('../config/aiConfig');
const logger = require('../../utils/logger');

class DiagnosticAnalyzer {
  constructor() {
    this.systemPrompt = `You are an expert PC diagnostician and upgrade advisor for K-Wise, a computer store in the Philippines.

Your expertise includes:
- PC hardware diagnostics and troubleshooting
- Performance bottleneck identification
- Upgrade path recommendations based on budget
- Filipino PC usage patterns and preferences
- Tropical climate impact on PC performance
- Cost-effective solutions for various user types
- Local market availability and pricing considerations
- Gaming, productivity, and content creation optimization

Always provide responses in valid JSON format only. Consider Philippine market conditions, climate factors, and budget-conscious approaches.`;
  }

  /**
   * Analyze PC for checkup and diagnostics
   * @param {Object} systemSpecs - Current PC specifications
   * @param {Object} performanceData - Performance metrics and user complaints
   * @param {Array} availableServices - Available diagnostic services
   * @returns {Promise<Object>} Diagnostic analysis and recommendations
   */
  async performPCCheckup(systemSpecs, performanceData, availableServices = []) {
    if (!aiConfig.service.enabled) {
      return this.getFallbackPCCheckup(systemSpecs, performanceData);
    }

    const prompt = `
Perform comprehensive PC diagnostics and checkup for this system:

SYSTEM SPECIFICATIONS:
${Object.entries(systemSpecs).map(([component, specs]) => `
${component.toUpperCase()}:
${typeof specs === 'object' ? JSON.stringify(specs, null, 2) : specs}
`).join('')}

PERFORMANCE DATA & USER ISSUES:
Current Performance: ${JSON.stringify(performanceData.currentPerformance || {}, null, 2)}
User Complaints: ${performanceData.userComplaints ? performanceData.userComplaints.join(', ') : 'None specified'}
System Age: ${performanceData.systemAge || 'Unknown'}
Usage Patterns: ${performanceData.usagePatterns ? performanceData.usagePatterns.join(', ') : 'General use'}
Environmental Factors: ${performanceData.environment || 'Philippine tropical climate'}

AVAILABLE SERVICES:
${availableServices.map(service => `
- ${service.name}: ${service.description} (${service.price || 'Price varies'})
`).join('')}

DIAGNOSTIC FOCUS AREAS:
1. Hardware health and component wear
2. Performance bottlenecks and optimization
3. Thermal issues (important in PH climate)
4. Storage health and optimization
5. Memory issues and optimization
6. Power supply adequacy
7. Software optimization opportunities
8. Dust and maintenance needs
9. Gaming performance optimization
10. Productivity workflow optimization

Provide response in this EXACT JSON format:
{
  "diagnosticSummary": {
    "overallHealth": "excellent|good|fair|poor|critical",
    "healthScore": number (0-100),
    "primaryIssues": ["issue1", "issue2"],
    "systemAge": "age assessment",
    "performanceLevel": "current performance rating"
  },
  "componentAnalysis": {
    "cpu": {
      "status": "excellent|good|fair|poor|critical",
      "performance": "performance level",
      "temperature": "thermal status",
      "bottleneckRisk": "bottleneck assessment",
      "recommendations": ["recommendation1", "recommendation2"]
    },
    "gpu": {
      "status": "excellent|good|fair|poor|critical", 
      "performance": "gaming/graphics performance",
      "temperature": "thermal status",
      "bottleneckRisk": "bottleneck assessment",
      "recommendations": ["recommendation1", "recommendation2"]
    },
    "memory": {
      "status": "excellent|good|fair|poor|critical",
      "capacity": "capacity assessment",
      "speed": "speed assessment", 
      "utilization": "usage patterns",
      "recommendations": ["recommendation1", "recommendation2"]
    },
    "storage": {
      "status": "excellent|good|fair|poor|critical",
      "performance": "read/write performance",
      "health": "drive health status",
      "capacity": "storage capacity analysis",
      "recommendations": ["recommendation1", "recommendation2"]
    },
    "cooling": {
      "status": "excellent|good|fair|poor|critical",
      "efficiency": "cooling effectiveness",
      "climateImpact": "tropical climate considerations",
      "recommendations": ["recommendation1", "recommendation2"]
    },
    "powerSupply": {
      "status": "excellent|good|fair|poor|critical",
      "adequacy": "power supply sufficiency",
      "efficiency": "power efficiency rating",
      "recommendations": ["recommendation1", "recommendation2"]
    }
  },
  "performanceOptimization": {
    "bottlenecks": [
      {
        "component": "bottleneck component",
        "severity": "minor|moderate|major|critical",
        "impact": "performance impact description",
        "solution": "recommended solution"
      }
    ],
    "optimizationOpportunities": [
      {
        "area": "optimization area",
        "improvement": "expected improvement",
        "effort": "easy|moderate|complex",
        "cost": "cost range"
      }
    ]
  },
  "recommendedServices": [
    {
      "serviceName": "service name",
      "priority": "high|medium|low",
      "reason": "why this service is needed",
      "expectedBenefit": "benefit description",
      "estimatedCost": "service cost",
      "urgency": "immediate|soon|when_convenient"
    }
  ],
  "maintenanceSchedule": [
    {
      "task": "maintenance task",
      "frequency": "frequency recommendation", 
      "importance": "high|medium|low",
      "diyPossible": true/false
    }
  ],
  "summary": "overall diagnostic summary and next steps"
}`;

    try {
      const response = await ollamaService.generateResponse(
        prompt,
        this.systemPrompt,
        aiConfig.parameters.diagnostics
      );

      return this.parsePCCheckupResponse(response);
    } catch (error) {
      logger.warn('PC checkup analysis failed, using fallback', {
        error: error.message,
        systemSpecs: Object.keys(systemSpecs)
      });
      return this.getFallbackPCCheckup(systemSpecs, performanceData);
    }
  }

  /**
   * Analyze upgrade opportunities and recommendations
   * @param {Object} currentSystem - Current system specifications
   * @param {Object} upgradeGoals - User's upgrade goals and budget
   * @param {Array} availableComponents - Available upgrade components
   * @returns {Promise<Object>} Upgrade analysis and recommendations
   */
  async analyzeUpgradeOptions(currentSystem, upgradeGoals, availableComponents = []) {
    if (!aiConfig.service.enabled) {
      return this.getFallbackUpgradeAnalysis(currentSystem, upgradeGoals);
    }

    const prompt = `
Analyze upgrade opportunities for this PC system:

CURRENT SYSTEM:
${Object.entries(currentSystem).map(([component, specs]) => `
${component.toUpperCase()}:
${typeof specs === 'object' ? JSON.stringify(specs, null, 2) : specs}
`).join('')}

UPGRADE GOALS:
Budget: ${upgradeGoals.budget || 'Not specified'}
Primary Goal: ${upgradeGoals.primaryGoal || 'General performance improvement'}
Performance Targets: ${upgradeGoals.performanceTargets ? upgradeGoals.performanceTargets.join(', ') : 'None specified'}
Timeline: ${upgradeGoals.timeline || 'No rush'}
Future Plans: ${upgradeGoals.futurePlans || 'None specified'}
Keep Existing: ${upgradeGoals.keepComponents ? upgradeGoals.keepComponents.join(', ') : 'Open to all changes'}

AVAILABLE UPGRADE COMPONENTS (SAMPLE):
${availableComponents.slice(0, 20).map(comp => `
${comp.category}: ${comp.name} - ${comp.brand} - ${comp.price}
`).join('')}

UPGRADE ANALYSIS PRIORITIES:
1. Maximum performance improvement per peso spent
2. Bottleneck elimination (identify weakest links)
3. Future-proofing within budget
4. Component synergy and balance
5. Power and cooling considerations
6. Upgrade path planning (what to upgrade first)
7. Cost-effective timing recommendations
8. Compatibility with existing components

Provide response in this EXACT JSON format:
{
  "upgradeAssessment": {
    "overallRating": "excellent_candidate|good_candidate|fair_candidate|poor_candidate",
    "upgradeWorth": "highly_recommended|recommended|conditional|not_recommended",
    "expectedImprovement": "performance improvement percentage",
    "costEffectiveness": "excellent|good|fair|poor"
  },
  "prioritizedUpgrades": [
    {
      "component": "component to upgrade",
      "priority": "high|medium|low",
      "currentComponent": "current component details",
      "recommendedUpgrade": "recommended new component",
      "performanceGain": "expected performance improvement",
      "cost": "upgrade cost",
      "reason": "why prioritize this upgrade",
      "compatibility": "compatibility requirements",
      "timeline": "when to do this upgrade"
    }
  ],
  "upgradePathways": [
    {
      "pathName": "Budget Gaming Boost",
      "totalCost": "total pathway cost",
      "components": ["component1", "component2"],
      "expectedResults": "performance expectations",
      "suitableFor": "target user type",
      "timeline": "suggested timeline"
    },
    {
      "pathName": "Performance Maximizer",
      "totalCost": "total pathway cost", 
      "components": ["component1", "component2"],
      "expectedResults": "performance expectations",
      "suitableFor": "target user type",
      "timeline": "suggested timeline"
    }
  ],
  "costBenefitAnalysis": [
    {
      "upgradeOption": "upgrade description",
      "cost": "upgrade cost",
      "benefit": "performance benefit",
      "costPerBenefit": "cost efficiency rating",
      "recommendation": "recommended action"
    }
  ],
  "compatibilityConsiderations": [
    {
      "newComponent": "component being added",
      "requirement": "compatibility requirement",
      "currentStatus": "compatible|requires_additional_upgrade|incompatible",
      "additionalCosts": "extra costs if any"
    }
  ],
  "budgetOptimizations": [
    {
      "budgetRange": "budget range",
      "recommendedFocus": "what to prioritize",
      "expectedOutcome": "performance expectations",
      "components": ["priority components for this budget"]
    }
  ],
  "alternatives": [
    {
      "approach": "alternative upgrade approach",
      "pros": ["advantage1", "advantage2"],
      "cons": ["limitation1", "limitation2"],
      "suitability": "who this approach suits"
    }
  ],
  "recommendations": [
    "key recommendation for user"
  ]
}`;

    try {
      const response = await ollamaService.generateResponse(
        prompt,
        this.systemPrompt,
        aiConfig.parameters.upgrades
      );

      return this.parseUpgradeAnalysisResponse(response);
    } catch (error) {
      logger.warn('Upgrade analysis failed, using fallback', {
        error: error.message,
        currentSystem: Object.keys(currentSystem)
      });
      return this.getFallbackUpgradeAnalysis(currentSystem, upgradeGoals);
    }
  }

  /**
   * Generate service recommendations based on system analysis
   * @param {Object} systemAnalysis - System diagnostic results
   * @param {Array} availableServices - Available PC services
   * @param {Object} customerProfile - Customer preferences and budget
   * @returns {Promise<Object>} Service recommendations
   */
  async recommendServices(systemAnalysis, availableServices, customerProfile = {}) {
    if (!aiConfig.service.enabled || !availableServices.length) {
      return this.getFallbackServiceRecommendations(systemAnalysis, availableServices);
    }

    const prompt = `
Recommend appropriate PC services based on system analysis:

SYSTEM ANALYSIS RESULTS:
${JSON.stringify(systemAnalysis, null, 2)}

AVAILABLE SERVICES:
${availableServices.map(service => `
Service: ${service.name}
Description: ${service.description}
Price: ${service.price || 'Variable pricing'}
Category: ${service.category || 'General'}
Duration: ${service.duration || 'TBD'}
Includes: ${service.includes ? service.includes.join(', ') : 'Service details'}
`).join('')}

CUSTOMER PROFILE:
Budget Range: ${customerProfile.budgetRange || 'Not specified'}
Technical Level: ${customerProfile.technicalLevel || 'Average user'}
Urgency: ${customerProfile.urgency || 'Normal'}
Preferences: ${customerProfile.preferences ? customerProfile.preferences.join(', ') : 'None specified'}
Previous Services: ${customerProfile.previousServices || 'First time'}

RECOMMENDATION CRITERIA:
1. Match service to identified system issues
2. Consider customer budget and preferences
3. Prioritize by urgency and impact
4. Consider customer technical level
5. Maximize value for money
6. Preventive vs corrective recommendations
7. Bundle opportunities for cost savings

Provide response in this EXACT JSON format:
{
  "recommendedServices": [
    {
      "serviceId": "service identifier",
      "serviceName": "service name",
      "category": "service category",
      "priority": "high|medium|low",
      "urgency": "immediate|within_week|within_month|when_convenient",
      "reason": "why this service is recommended",
      "expectedBenefit": "benefit description",
      "estimatedCost": "service cost",
      "duration": "estimated time required",
      "customerSuitability": "why suitable for this customer"
    }
  ],
  "servicePackages": [
    {
      "packageName": "service package name",
      "services": ["service1", "service2"],
      "totalCost": "package cost",
      "savings": "savings vs individual services",
      "suitability": "who should consider this package",
      "benefits": ["benefit1", "benefit2"]
    }
  ],
  "maintenancePlan": {
    "immediate": [
      {
        "service": "service name",
        "reason": "why needed now",
        "impact": "consequence of delaying"
      }
    ],
    "shortTerm": [
      {
        "service": "service name",
        "timeframe": "1-3 months",
        "reason": "why needed soon"
      }
    ],
    "longTerm": [
      {
        "service": "service name", 
        "timeframe": "6+ months",
        "reason": "preventive maintenance"
      }
    ]
  },
  "budgetOptions": [
    {
      "budgetRange": "budget range",
      "recommendedServices": ["service1", "service2"],
      "expectedOutcome": "what to expect",
      "tradeoffs": "what might be compromised"
    }
  ],
  "diyAlternatives": [
    {
      "service": "service that can be DIY",
      "difficulty": "easy|medium|hard",
      "risks": "risks of DIY approach",
      "guidance": "basic guidance if attempting DIY"
    }
  ],
  "summary": "overall service recommendation summary"
}`;

    try {
      const response = await ollamaService.generateResponse(
        prompt,
        this.systemPrompt,
        aiConfig.parameters.serviceRecommendations
      );

      return this.parseServiceRecommendationsResponse(response);
    } catch (error) {
      logger.warn('Service recommendations failed, using fallback', {
        error: error.message,
        availableServices: availableServices.length
      });
      return this.getFallbackServiceRecommendations(systemAnalysis, availableServices);
    }
  }

  /**
   * Analyze system performance bottlenecks
   * @param {Object} performanceData - System performance metrics
   * @param {Object} userWorkloads - User's typical workloads
   * @returns {Promise<Object>} Bottleneck analysis
   */
  async analyzeBottlenecks(performanceData, userWorkloads = {}) {
    if (!aiConfig.service.enabled) {
      return this.getFallbackBottleneckAnalysis(performanceData);
    }

    const prompt = `
Analyze system performance bottlenecks:

PERFORMANCE DATA:
${JSON.stringify(performanceData, null, 2)}

USER WORKLOADS:
Gaming: ${userWorkloads.gaming ? JSON.stringify(userWorkloads.gaming) : 'Not specified'}
Productivity: ${userWorkloads.productivity ? JSON.stringify(userWorkloads.productivity) : 'Not specified'}
Content Creation: ${userWorkloads.contentCreation ? JSON.stringify(userWorkloads.contentCreation) : 'Not specified'}
General Use: ${userWorkloads.general ? JSON.stringify(userWorkloads.general) : 'Browsing, office work'}

BOTTLENECK ANALYSIS FOCUS:
1. CPU vs GPU balance for workloads
2. Memory capacity and speed limitations  
3. Storage I/O bottlenecks
4. Thermal throttling impacts
5. Power supply limitations
6. Network/connectivity issues
7. Software optimization opportunities

Provide response in this EXACT JSON format:
{
  "bottleneckAnalysis": {
    "primaryBottleneck": "main performance limiter",
    "severity": "minor|moderate|major|critical", 
    "impactAreas": ["affected performance area"],
    "confidenceLevel": number (0-100)
  },
  "detectedBottlenecks": [
    {
      "component": "bottleneck component",
      "type": "bottleneck type",
      "severity": "minor|moderate|major|critical",
      "affectedWorkloads": ["workload1", "workload2"],
      "symptoms": ["symptom1", "symptom2"],
      "solutions": ["solution1", "solution2"],
      "costToFix": "repair/upgrade cost range"
    }
  ],
  "workloadSpecificIssues": {
    "gaming": [
      {
        "issue": "gaming performance issue",
        "cause": "root cause",
        "solution": "recommended fix"
      }
    ],
    "productivity": [
      {
        "issue": "productivity issue",
        "cause": "root cause", 
        "solution": "recommended fix"
      }
    ]
  },
  "optimizationPriority": [
    {
      "priority": "high|medium|low",
      "component": "component to address",
      "expectedImprovement": "performance gain",
      "effort": "easy|moderate|complex",
      "cost": "cost range"
    }
  ]
}`;

    try {
      const response = await ollamaService.generateResponse(
        prompt,
        this.systemPrompt,
        aiConfig.parameters.diagnostics
      );

      return this.parseBottleneckAnalysisResponse(response);
    } catch (error) {
      logger.warn('Bottleneck analysis failed, using fallback', {
        error: error.message
      });
      return this.getFallbackBottleneckAnalysis(performanceData);
    }
  }

  /**
   * Parse PC checkup response
   * @param {string} response - AI response
   * @returns {Object} Parsed checkup results
   */
  parsePCCheckupResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        diagnosticSummary: parsed.diagnosticSummary || {},
        componentAnalysis: parsed.componentAnalysis || {},
        performanceOptimization: parsed.performanceOptimization || {},
        recommendedServices: Array.isArray(parsed.recommendedServices) ? parsed.recommendedServices : [],
        maintenanceSchedule: Array.isArray(parsed.maintenanceSchedule) ? parsed.maintenanceSchedule : [],
        summary: parsed.summary || 'Diagnostic analysis completed'
      };
    } catch (error) {
      logger.warn('Failed to parse PC checkup response', { error: error.message });
      return this.getFallbackPCCheckup({}, {});
    }
  }

  /**
   * Parse upgrade analysis response
   * @param {string} response - AI response
   * @returns {Object} Parsed upgrade analysis
   */
  parseUpgradeAnalysisResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        upgradeAssessment: parsed.upgradeAssessment || {},
        prioritizedUpgrades: Array.isArray(parsed.prioritizedUpgrades) ? parsed.prioritizedUpgrades : [],
        upgradePathways: Array.isArray(parsed.upgradePathways) ? parsed.upgradePathways : [],
        costBenefitAnalysis: Array.isArray(parsed.costBenefitAnalysis) ? parsed.costBenefitAnalysis : [],
        compatibilityConsiderations: Array.isArray(parsed.compatibilityConsiderations) ? parsed.compatibilityConsiderations : [],
        budgetOptimizations: Array.isArray(parsed.budgetOptimizations) ? parsed.budgetOptimizations : [],
        alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
      };
    } catch (error) {
      logger.warn('Failed to parse upgrade analysis response', { error: error.message });
      return this.getFallbackUpgradeAnalysis({}, {});
    }
  }

  /**
   * Parse service recommendations response
   * @param {string} response - AI response
   * @returns {Object} Parsed service recommendations
   */
  parseServiceRecommendationsResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        recommendedServices: Array.isArray(parsed.recommendedServices) ? parsed.recommendedServices : [],
        servicePackages: Array.isArray(parsed.servicePackages) ? parsed.servicePackages : [],
        maintenancePlan: parsed.maintenancePlan || {},
        budgetOptions: Array.isArray(parsed.budgetOptions) ? parsed.budgetOptions : [],
        diyAlternatives: Array.isArray(parsed.diyAlternatives) ? parsed.diyAlternatives : [],
        summary: parsed.summary || 'Service recommendations generated'
      };
    } catch (error) {
      logger.warn('Failed to parse service recommendations response', { error: error.message });
      return this.getFallbackServiceRecommendations({}, []);
    }
  }

  /**
   * Parse bottleneck analysis response
   * @param {string} response - AI response
   * @returns {Object} Parsed bottleneck analysis
   */
  parseBottleneckAnalysisResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        bottleneckAnalysis: parsed.bottleneckAnalysis || {},
        detectedBottlenecks: Array.isArray(parsed.detectedBottlenecks) ? parsed.detectedBottlenecks : [],
        workloadSpecificIssues: parsed.workloadSpecificIssues || {},
        optimizationPriority: Array.isArray(parsed.optimizationPriority) ? parsed.optimizationPriority : []
      };
    } catch (error) {
      logger.warn('Failed to parse bottleneck analysis response', { error: error.message });
      return this.getFallbackBottleneckAnalysis({});
    }
  }

  /**
   * Fallback PC checkup
   * @param {Object} systemSpecs - System specifications
   * @param {Object} performanceData - Performance data
   * @returns {Object} Basic checkup results
   */
  getFallbackPCCheckup(systemSpecs, performanceData) {
    return {
      diagnosticSummary: {
        overallHealth: 'manual_assessment_required',
        healthScore: 75,
        primaryIssues: ['AI analysis unavailable'],
        systemAge: performanceData.systemAge || 'Unknown',
        performanceLevel: 'Requires manual assessment'
      },
      componentAnalysis: {},
      performanceOptimization: {
        bottlenecks: [],
        optimizationOpportunities: []
      },
      recommendedServices: [],
      maintenanceSchedule: [],
      summary: 'Manual diagnostic assessment required - AI analysis unavailable'
    };
  }

  /**
   * Fallback upgrade analysis
   * @param {Object} currentSystem - Current system
   * @param {Object} upgradeGoals - Upgrade goals
   * @returns {Object} Basic upgrade analysis
   */
  getFallbackUpgradeAnalysis(currentSystem, upgradeGoals) {
    return {
      upgradeAssessment: {
        overallRating: 'manual_assessment_required',
        upgradeWorth: 'conditional',
        expectedImprovement: 'TBD',
        costEffectiveness: 'manual_calculation_required'
      },
      prioritizedUpgrades: [],
      upgradePathways: [],
      costBenefitAnalysis: [],
      compatibilityConsiderations: [],
      budgetOptimizations: [],
      alternatives: [],
      recommendations: ['Manual upgrade assessment recommended', 'Consult with technician']
    };
  }

  /**
   * Fallback service recommendations
   * @param {Object} systemAnalysis - System analysis
   * @param {Array} availableServices - Available services
   * @returns {Object} Basic service recommendations
   */
  getFallbackServiceRecommendations(systemAnalysis, availableServices) {
    const basicServices = availableServices.slice(0, 3).map(service => ({
      serviceId: service.id,
      serviceName: service.name,
      category: service.category || 'general',
      priority: 'medium',
      urgency: 'when_convenient',
      reason: 'General system maintenance',
      expectedBenefit: 'System optimization',
      estimatedCost: service.price || 'Contact for pricing',
      duration: service.duration || 'TBD',
      customerSuitability: 'Suitable for general maintenance'
    }));

    return {
      recommendedServices: basicServices,
      servicePackages: [],
      maintenancePlan: {
        immediate: [],
        shortTerm: [],
        longTerm: []
      },
      budgetOptions: [],
      diyAlternatives: [],
      summary: 'Basic service recommendations - AI analysis unavailable'
    };
  }

  /**
   * Fallback bottleneck analysis
   * @param {Object} performanceData - Performance data
   * @returns {Object} Basic bottleneck analysis
   */
  getFallbackBottleneckAnalysis(performanceData) {
    return {
      bottleneckAnalysis: {
        primaryBottleneck: 'Manual analysis required',
        severity: 'moderate',
        impactAreas: ['General performance'],
        confidenceLevel: 50
      },
      detectedBottlenecks: [],
      workloadSpecificIssues: {
        gaming: [],
        productivity: []
      },
      optimizationPriority: []
    };
  }
}

module.exports = new DiagnosticAnalyzer();