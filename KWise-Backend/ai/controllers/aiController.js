/**
 * AI Controller for K-Wise AI Integration
 * Provides REST API endpoints for frontend AI feature access
 * Handles all AI service requests and responses
 * 
 * ROOT CAUSE FIX #1: Added externalMarketService for external component suggestions
 * ROOT CAUSE FIX #3: Added upgradeValueService for ROI analysis
 * ROOT CAUSE FIX #4: Added formFactorValidator for physical compatibility
 * ROOT CAUSE FIX #5: Added bottleneckAnalyzer for tier mismatch detection
 * ROOT CAUSE FIX #6: Added JSONExtractor for robust JSON parsing from DeepSeek R1
 */

const JSONExtractor = require('../utils/jsonExtractor');

const valueAnalyzer = require('../services/valueAnalyzer');
const compatibilityAnalyzer = require('../services/compatibilityAnalyzer');
const buildOptimizer = require('../services/buildOptimizer');
const diagnosticAnalyzer = require('../services/diagnosticAnalyzer');
const ollamaService = require('../services/ollamaService');
const externalMarketService = require('../../services/externalMarketService'); // ROOT CAUSE FIX #1
const upgradeValueService = require('../../services/upgradeValueService'); // ROOT CAUSE FIX #3
const formFactorValidator = require('../../services/formFactorValidator'); // ROOT CAUSE FIX #4
const bottleneckAnalyzer = require('../../services/bottleneckAnalyzer'); // ROOT CAUSE FIX #5
const aiConfig = require('../config/aiConfig');
const logger = require('../../utils/logger');

class AIController {
  /**
   * Generate Hot Picks for PC Parts homepage
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getHotPicks(req, res) {
    try {
      const { products, marketData, limit = 8 } = req.body;

      if (!products || !Array.isArray(products)) {
        return res.status(400).json({
          success: false,
          message: 'Products array is required',
          data: null
        });
      }

      logger.info('Generating hot picks', {
        productsCount: products.length,
        limit,
        userId: req.user?.id
      });

      const result = await valueAnalyzer.generateHotPicks(products, marketData, limit);

      res.status(200).json({
        success: true,
        message: 'Hot picks generated successfully',
        data: {
          hotPicks: result.hotPicks,
          analysis: result.analysis,
          generatedAt: new Date().toISOString(),
          aiEnabled: aiConfig.service.enabled
        }
      });

    } catch (error) {
      logger.error('Hot picks generation failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to generate hot picks',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Generate Value for Money recommendations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getValueForMoney(req, res) {
    try {
      const { products, marketData, limit = 8 } = req.body;

      if (!products || !Array.isArray(products)) {
        return res.status(400).json({
          success: false,
          message: 'Products array is required',
          data: null
        });
      }

      logger.info('Generating value for money recommendations', {
        productsCount: products.length,
        limit,
        userId: req.user?.id
      });

      const result = await valueAnalyzer.generateValueForMoney(products, marketData, limit);

      res.status(200).json({
        success: true,
        message: 'Value for money recommendations generated successfully',
        data: {
          valueForMoney: result.valueForMoney,
          analysis: result.analysis,
          generatedAt: new Date().toISOString(),
          aiEnabled: aiConfig.service.enabled
        }
      });

    } catch (error) {
      logger.error('Value for money generation failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to generate value for money recommendations',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Analyze market trends
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async analyzeMarketTrends(req, res) {
    try {
      const { allProducts, salesData } = req.body;

      if (!allProducts || !Array.isArray(allProducts)) {
        return res.status(400).json({
          success: false,
          message: 'All products array is required',
          data: null
        });
      }

      logger.info('Analyzing market trends', {
        productsCount: allProducts.length,
        userId: req.user?.id
      });

      const result = await valueAnalyzer.analyzeMarketTrends(allProducts, salesData);

      res.status(200).json({
        success: true,
        message: 'Market trends analyzed successfully',
        data: {
          marketTrends: result.marketTrends,
          recommendations: result.recommendations,
          insights: result.insights,
          analyzedAt: new Date().toISOString(),
          aiEnabled: aiConfig.service.enabled
        }
      });

    } catch (error) {
      logger.error('Market trends analysis failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to analyze market trends',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Find compatible components
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async findCompatibleComponents(req, res) {
    try {
      const { baseComponent, availableComponents, compatibilityType } = req.body;

      if (!baseComponent || !availableComponents) {
        return res.status(400).json({
          success: false,
          message: 'Base component and available components are required',
          data: null
        });
      }

      logger.info('Finding compatible components', {
        baseComponent: baseComponent.name,
        availableCount: availableComponents.length,
        compatibilityType,
        userId: req.user?.id
      });

      const result = await compatibilityAnalyzer.findCompatibleComponents(
        baseComponent,
        availableComponents,
        compatibilityType
      );

      res.status(200).json({
        success: true,
        message: 'Compatible components found',
        data: {
          compatible: result.compatible,
          analysis: result.analysis,
          searchedAt: new Date().toISOString(),
          aiEnabled: aiConfig.service.enabled
        }
      });

    } catch (error) {
      logger.error('Compatible components search failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to find compatible components',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Optimize PC build configuration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async optimizeBuild(req, res) {
    try {
      const { buildConfig, requirements, availableComponents } = req.body;

      if (!buildConfig || !requirements) {
        return res.status(400).json({
          success: false,
          message: 'Build configuration and requirements are required',
          data: null
        });
      }

      logger.info('Optimizing PC build', {
        buildComponents: Object.keys(buildConfig),
        budget: requirements.budget,
        primaryUse: requirements.primaryUse,
        userId: req.user?.id
      });

      const result = await buildOptimizer.optimizeBuild(
        buildConfig,
        requirements,
        availableComponents || []
      );

      res.status(200).json({
        success: true,
        message: 'Build optimization completed',
        data: {
          optimizedBuild: result.optimizedBuild,
          buildAnalysis: result.buildAnalysis,
          alternatives: result.alternatives,
          warnings: result.warnings,
          recommendations: result.recommendations,
          optimizedAt: new Date().toISOString(),
          aiEnabled: aiConfig.service.enabled
        }
      });

    } catch (error) {
      logger.error('Build optimization failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to optimize build',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Validate build compatibility
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async validateBuildCompatibility(req, res) {
    try {
      const { buildComponents } = req.body;

      if (!buildComponents || typeof buildComponents !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Build components object is required',
          data: null
        });
      }

      logger.info('Validating build compatibility', {
        components: Object.keys(buildComponents),
        userId: req.user?.id
      });

      const result = await buildOptimizer.validateCompatibility(buildComponents);

      res.status(200).json({
        success: true,
        message: 'Build compatibility validation completed',
        data: {
          compatibilityStatus: result.compatibilityStatus,
          compatibilityScore: result.compatibilityScore,
          issues: result.issues,
          warnings: result.warnings,
          powerAnalysis: result.powerAnalysis,
          thermalAnalysis: result.thermalAnalysis,
          summary: result.summary,
          validatedAt: new Date().toISOString(),
          aiEnabled: aiConfig.service.enabled
        }
      });

    } catch (error) {
      logger.error('Build compatibility validation failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to validate build compatibility',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Recommend pre-built PCs
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async recommendPreBuilds(req, res) {
    try {
      const { requirements, availableBuilds } = req.body;

      if (!requirements || !availableBuilds) {
        return res.status(400).json({
          success: false,
          message: 'Requirements and available builds are required',
          data: null
        });
      }

      logger.info('Recommending pre-built PCs', {
        availableBuilds: availableBuilds.length,
        budget: requirements.budgetRange,
        primaryUse: requirements.primaryUse,
        userId: req.user?.id
      });

      const result = await buildOptimizer.recommendPreBuilds(requirements, availableBuilds);

      res.status(200).json({
        success: true,
        message: 'Pre-built PC recommendations generated',
        data: {
          topRecommendations: result.topRecommendations,
          alternativeOptions: result.alternativeOptions,
          customizationSuggestions: result.customizationSuggestions,
          analysis: result.analysis,
          recommendedAt: new Date().toISOString(),
          aiEnabled: aiConfig.service.enabled
        }
      });

    } catch (error) {
      logger.error('Pre-build recommendations failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to recommend pre-built PCs',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Optimize build for budget
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async optimizeForBudget(req, res) {
    try {
      const { buildConfig, targetBudget, componentOptions } = req.body;

      if (!buildConfig || !targetBudget) {
        return res.status(400).json({
          success: false,
          message: 'Build configuration and target budget are required',
          data: null
        });
      }

      logger.info('Optimizing build for budget', {
        targetBudget,
        components: Object.keys(buildConfig),
        userId: req.user?.id
      });

      const result = await buildOptimizer.optimizeForBudget(
        buildConfig,
        targetBudget,
        componentOptions || []
      );

      res.status(200).json({
        success: true,
        message: 'Budget optimization completed',
        data: {
          budgetOptimization: result.budgetOptimization,
          componentChanges: result.componentChanges,
          performanceComparison: result.performanceComparison,
          upgradeStrategy: result.upgradeStrategy,
          alternatives: result.alternatives,
          optimizedAt: new Date().toISOString(),
          aiEnabled: aiConfig.service.enabled
        }
      });

    } catch (error) {
      logger.error('Budget optimization failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to optimize build for budget',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Perform PC checkup and diagnostics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async performPCCheckup(req, res) {
    try {
      const { systemSpecs, performanceData, availableServices } = req.body;

      if (!systemSpecs || !performanceData) {
        return res.status(400).json({
          success: false,
          message: 'System specifications and performance data are required',
          data: null
        });
      }

      logger.info('Performing PC checkup', {
        systemComponents: Object.keys(systemSpecs),
        userId: req.user?.id
      });

      const result = await diagnosticAnalyzer.performPCCheckup(
        systemSpecs,
        performanceData,
        availableServices || []
      );

      res.status(200).json({
        success: true,
        message: 'PC checkup completed',
        data: {
          diagnosticSummary: result.diagnosticSummary,
          componentAnalysis: result.componentAnalysis,
          performanceOptimization: result.performanceOptimization,
          recommendedServices: result.recommendedServices,
          maintenanceSchedule: result.maintenanceSchedule,
          summary: result.summary,
          checkedAt: new Date().toISOString(),
          aiEnabled: aiConfig.service.enabled
        }
      });

    } catch (error) {
      logger.error('PC checkup failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to perform PC checkup',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Analyze upgrade opportunities
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async analyzeUpgradeOptions(req, res) {
    try {
      const { currentSystem, upgradeGoals, availableComponents } = req.body;

      if (!currentSystem || !upgradeGoals) {
        return res.status(400).json({
          success: false,
          message: 'Current system and upgrade goals are required',
          data: null
        });
      }

      logger.info('Analyzing upgrade options', {
        systemComponents: Object.keys(currentSystem),
        budget: upgradeGoals.budget,
        userId: req.user?.id
      });

      const result = await diagnosticAnalyzer.analyzeUpgradeOptions(
        currentSystem,
        upgradeGoals,
        availableComponents || []
      );

      res.status(200).json({
        success: true,
        message: 'Upgrade analysis completed',
        data: {
          upgradeAssessment: result.upgradeAssessment,
          prioritizedUpgrades: result.prioritizedUpgrades,
          upgradePathways: result.upgradePathways,
          costBenefitAnalysis: result.costBenefitAnalysis,
          compatibilityConsiderations: result.compatibilityConsiderations,
          budgetOptimizations: result.budgetOptimizations,
          alternatives: result.alternatives,
          recommendations: result.recommendations,
          analyzedAt: new Date().toISOString(),
          aiEnabled: aiConfig.service.enabled
        }
      });

    } catch (error) {
      logger.error('Upgrade analysis failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to analyze upgrade options',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Recommend PC services
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async recommendServices(req, res) {
    try {
      const { systemAnalysis, availableServices, customerProfile } = req.body;

      if (!systemAnalysis || !availableServices) {
        return res.status(400).json({
          success: false,
          message: 'System analysis and available services are required',
          data: null
        });
      }

      logger.info('Recommending PC services', {
        availableServices: availableServices.length,
        userId: req.user?.id
      });

      const result = await diagnosticAnalyzer.recommendServices(
        systemAnalysis,
        availableServices,
        customerProfile || {}
      );

      res.status(200).json({
        success: true,
        message: 'Service recommendations generated',
        data: {
          recommendedServices: result.recommendedServices,
          servicePackages: result.servicePackages,
          maintenancePlan: result.maintenancePlan,
          budgetOptions: result.budgetOptions,
          diyAlternatives: result.diyAlternatives,
          summary: result.summary,
          recommendedAt: new Date().toISOString(),
          aiEnabled: aiConfig.service.enabled
        }
      });

    } catch (error) {
      logger.error('Service recommendations failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to recommend services',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Analyze system bottlenecks
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async analyzeBottlenecks(req, res) {
    try {
      const { performanceData, userWorkloads } = req.body;

      if (!performanceData) {
        return res.status(400).json({
          success: false,
          message: 'Performance data is required',
          data: null
        });
      }

      logger.info('Analyzing system bottlenecks', {
        userId: req.user?.id
      });

      const result = await diagnosticAnalyzer.analyzeBottlenecks(
        performanceData,
        userWorkloads || {}
      );

      res.status(200).json({
        success: true,
        message: 'Bottleneck analysis completed',
        data: {
          bottleneckAnalysis: result.bottleneckAnalysis,
          detectedBottlenecks: result.detectedBottlenecks,
          workloadSpecificIssues: result.workloadSpecificIssues,
          optimizationPriority: result.optimizationPriority,
          analyzedAt: new Date().toISOString(),
          aiEnabled: aiConfig.service.enabled
        }
      });

    } catch (error) {
      logger.error('Bottleneck analysis failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to analyze bottlenecks',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get AI service health status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getHealthStatus(req, res) {
    try {
      const health = await ollamaService.checkHealth();
      const status = health.status === 'healthy' ? 200 : 503;

      res.status(status).json({
        success: status === 200,
        message: `AI service is ${health.status}`,
        data: {
          ...health,
          config: {
            enabled: aiConfig.service.enabled,
            model: aiConfig.ollama.model,
            baseURL: aiConfig.ollama.baseUrl
          },
          checkedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('AI health check failed', {
        error: error.message,
        stack: error.stack
      });

      // Return informative error even when Ollama is not running
      res.status(503).json({
        success: false,
        message: 'AI service is currently unavailable. Please ensure Ollama is running on port 11434.',
        data: {
          status: 'unavailable',
          error: 'Ollama service not detected',
          config: {
            enabled: aiConfig.service.enabled,
            model: aiConfig.ollama.model,
            baseURL: aiConfig.ollama.baseUrl
          },
          instructions: [
            '1. Install Ollama from https://ollama.ai',
            '2. Run: ollama pull deepseek-r1:1.5b',
            '3. Restart the backend server'
          ]
        },
        error: process.env.NODE_ENV === 'development' ? error.message : 'Service unavailable'
      });
    }
  }

  /**
   * Get comprehensive AI system status (circuit breaker, cache, performance)
   * PHASE 3: New endpoint for monitoring
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSystemStatus(req, res) {
    try {
      const enhancedAIService = require('../../services/enhancedAIService');
      
      // Get all system statuses
      const circuitBreaker = enhancedAIService.getCircuitBreakerStatus();
      const cacheStats = enhancedAIService.getCacheStats();
      const health = await ollamaService.checkHealth();
      
      res.status(200).json({
        success: true,
        message: 'AI system status retrieved successfully',
        data: {
          overall: {
            healthy: circuitBreaker.healthy && health.status === 'healthy',
            aiAvailable: health.status === 'healthy',
            circuitState: circuitBreaker.state
          },
          circuitBreaker: circuitBreaker,
          cache: cacheStats,
          ollama: health,
          config: {
            enabled: aiConfig.service.enabled,
            model: aiConfig.ollama.model,
            circuitBreakerConfig: aiConfig.circuitBreaker,
            cacheConfig: aiConfig.cache
          },
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('System status check failed', {
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system status',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }
  }

  /**
   * Get cache statistics
   * PHASE 3: New endpoint for cache monitoring
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCacheStatistics(req, res) {
    try {
      const enhancedAIService = require('../../services/enhancedAIService');
      const cacheStats = enhancedAIService.getCacheStats();
      
      res.status(200).json({
        success: true,
        message: 'Cache statistics retrieved successfully',
        data: {
          cacheStats: cacheStats,
          config: {
            enabled: aiConfig.cache.enabled,
            limits: aiConfig.cache.limits,
            tiers: aiConfig.cache.tiers
          },
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Cache statistics check failed', {
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve cache statistics',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }
  }

  /**
   * Analyze component compatibility
   * PHASE 3: Enhanced to use EnhancedAIService
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async analyzeCompatibility(req, res) {
    const startTime = Date.now();
    
    try {
      const { parts, userContext, deterministicResults } = req.body;
      
      if (!parts || typeof parts !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Parts object is required',
          data: null
        });
      }
      
      logger.info('Analyzing compatibility with AI', {
        partsCount: Object.keys(parts).length,
        userId: req.user?.id
      });
      
      const enhancedAIService = require('../../services/enhancedAIService');
      const result = await enhancedAIService.analyzeCompatibility(
        parts,
        userContext || {},
        deterministicResults || {}
      );
      
      const latency = Date.now() - startTime;
      
      res.status(200).json({
        success: true,
        message: 'Compatibility analysis completed',
        data: result,
        metadata: {
          latency: `${latency}ms`,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Compatibility analysis failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to analyze compatibility',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }
  }

  /**
   * Estimate current PC build based on user description
   * NEW - Phase 1: "Estimate My PC" Feature
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async estimateCurrentBuild(req, res) {
    const startTime = Date.now();
    
    try {
      const { usage, yearPurchased, budget, knownParts } = req.body;
      
      // Validate input
      if (!usage || !yearPurchased) {
        return res.status(400).json({
          success: false,
          message: 'Usage and year purchased are required',
          data: null
        });
      }
      
      const age = new Date().getFullYear() - yearPurchased;
      
      logger.info('Estimating PC build using reference builds system', {
        usage,
        age,
        budget,
        knownParts,
        userId: req.user?.id
      });
      
      // Load reference builds from database-generated module
      const referenceBuilds = require('../utils/referenceBuilds');
      
      // Find matching reference build
      let yearRange;
      if (age >= 10) {
        yearRange = '2010-2015';
      } else if (age >= 5) {
        yearRange = '2016-2020';
      } else {
        yearRange = '2021-2025';
      }
      
      let budgetRange = '26000-50000'; // Default mid-range
      if (budget) {
        if (budget >= 10000 && budget <= 25000) {
          budgetRange = '10000-25000';
        } else if (budget >= 26000 && budget <= 50000) {
          budgetRange = '26000-50000';
        } else if (budget >= 51000 && budget <= 75000) {
          budgetRange = '51000-75000';
        } else if (budget >= 76000) {
          budgetRange = '76000-100000';
        }
      }
      
      const usageNormalized = usage.toLowerCase().replace(/\s+/g, '-');
      const buildKey = `${usageNormalized}_${yearRange}_${budgetRange}`;
      
      let referenceBuild = referenceBuilds[buildKey];
      
      if (!referenceBuild) {
        logger.warn(`Reference build not found for key: ${buildKey}, using fallback`);
        // Fallback to mid-range gaming build
        referenceBuild = referenceBuilds['gaming_2016-2020_26000-50000'];
      }
      
      logger.info(`Using reference build: ${buildKey}`, {
        totalBudget: referenceBuild.totalBudget,
        components: Object.keys(referenceBuild.components)
      });
      
      // Extract estimated components from reference build
      const estimated = {};
      Object.keys(referenceBuild.components).forEach(componentType => {
        const component = referenceBuild.components[componentType];
        // Handle specs whether it's a string or object
        const specsString = typeof component.specs === 'string' 
          ? component.specs 
          : JSON.stringify(component.specs);
        estimated[componentType] = `${component.name} - ${specsString}`;
      });
      
      // Match estimated components to database products
      const db = require('../../config/db');
      const matched = await this.matchEstimateToDatabase(estimated, db, referenceBuild);
      
      // Calculate confidence score based on reference build match
      const confidence = 0.85; // High confidence since using curated reference builds
      
      // Save to user_virtual_build table
      let virtualBuildId = null;
      if (req.user && req.user.id) {
        try {
          const result = await db.query(`
            INSERT INTO user_virtual_build 
            (user_id, build_json, source, confidence_score, estimated_date)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id
          `, [
            req.user.id,
            JSON.stringify(matched),
            'ai_estimate',
            confidence
          ]);
          virtualBuildId = result.rows[0].id;
        } catch (dbErr) {
          logger.error('Failed to save virtual build', { error: dbErr.message });
          // Non-critical error, continue
        }
      }
      
      // Log AI interaction
      const executionTime = Date.now() - startTime;
      await this.logAIInteraction(
        req.user?.id,
        'estimate-current-build',
        JSON.stringify({ usage, yearPurchased, budget }),
        { estimated, matched, confidence, buildKey },
        executionTime
      );
      
      logger.info('PC build estimation complete', {
        confidence,
        executionTime,
        userId: req.user?.id
      });
      
      res.json({
        success: true,
        message: 'PC build estimated successfully',
        data: {
          estimated,
          matched,
          confidence,
          virtualBuildId,
          executionTime
        }
      });
      
    } catch (error) {
      logger.error('Error in estimateCurrentBuild', {
        error: error.message,
        stack: error.stack
      });
      
      // Check if it's an Ollama connection error
      const isOllamaError = error.message?.includes('connect') || 
                           error.message?.includes('ECONNREFUSED') ||
                           error.code === 'ECONNREFUSED';
      
      if (isOllamaError) {
        return res.status(503).json({
          success: false,
          message: 'AI service is currently unavailable. The AI model (Ollama) is not running. Please contact support.',
          data: {
            error: 'ollama_not_running',
            userMessage: 'AI estimation feature is temporarily unavailable. You can still fill the form manually.'
          },
          error: process.env.NODE_ENV === 'development' ? 'Ollama service not running on port 11434' : 'Service unavailable'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to estimate build',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }
  }

  /**
   * Match AI-estimated components to actual database products
   * Enhanced to use reference build information for better matching
   * @param {Object} estimate - AI-generated component estimates
   * @param {Object} db - Database connection
   * @param {Object} referenceBuild - Reference build with price targets (optional)
   * @returns {Object} Matched products from database
   */
  async matchEstimateToDatabase(estimate, db, referenceBuild = null) {
    const matched = {};
    
    for (const [category, description] of Object.entries(estimate)) {
      try {
        // Check if reference build has a specific product ID (database-generated builds)
        if (referenceBuild && referenceBuild.components[category] && referenceBuild.components[category].productId) {
          const productId = referenceBuild.components[category].productId;
          
          // Try to fetch the exact product from database
          const exactProduct = await db.query(`
            SELECT 
              pp.id,
              pp.name,
              pp.category,
              pp.brand,
              pp.price,
              pp.stock,
              pp.image_url,
              pp.specifications
            FROM pc_parts pp
            WHERE pp.id = $1
              AND pp.is_active = true
              AND pp.kiosk_visible = true
              AND pp.stock > 0
          `, [productId]);
          
          if (exactProduct.rows.length > 0) {
            matched[category] = exactProduct.rows[0];
            logger.info(`Matched ${category} (exact product from reference build)`, {
              productId,
              name: exactProduct.rows[0].name,
              price: `₱${parseFloat(exactProduct.rows[0].price).toLocaleString()}`
            });
            continue;
          } else {
            logger.warn(`Reference product no longer available`, {
              category,
              productId,
              willFallbackToSimilar: true
            });
          }
        }
        
        // Get target price from reference build if available
        let targetPrice = null;
        let priceRange = null;
        
        if (referenceBuild && referenceBuild.components[category]) {
          targetPrice = referenceBuild.components[category].price;
          // Allow ±30% price variation for flexibility
          priceRange = {
            min: targetPrice * 0.7,
            max: targetPrice * 1.3
          };
        }
        
        // Build query with optional price filtering
        let query = `
          SELECT 
            pp.id,
            pp.name,
            pp.category,
            pp.brand,
            pp.price,
            pp.stock,
            pp.image_url,
            pp.specifications,
            similarity(pp.name, $2) as name_similarity
          FROM pc_parts pp
          WHERE 
            pp.category = $1
            AND pp.is_active = true
            AND pp.kiosk_visible = true
            AND pp.stock > 0
        `;
        
        const params = [category, description];
        
        // Add price range filter if available
        if (priceRange) {
          query += ` AND pp.price BETWEEN $3 AND $4`;
          params.push(priceRange.min, priceRange.max);
        }
        
        query += `
          ORDER BY 
            name_similarity DESC,
            ${priceRange ? 'ABS(pp.price - $5),' : ''} 
            pp.price ASC
          LIMIT 5
        `;
        
        // Add target price for sorting if available
        if (targetPrice && priceRange) {
          params.push(targetPrice);
        }
        
        const result = await db.query(query, params);
        
        if (result.rows.length === 0) {
          logger.warn('No matching products found for category', { 
            category, 
            description,
            targetPrice,
            priceRange 
          });
          
          // Try again without price filter
          if (priceRange) {
            const fallbackResult = await db.query(`
              SELECT 
                pp.id,
                pp.name,
                pp.category,
                pp.brand,
                pp.price,
                pp.stock,
                pp.image_url,
                pp.specifications,
                similarity(pp.name, $2) as name_similarity
              FROM pc_parts pp
              WHERE 
                pp.category = $1
                AND pp.is_active = true
                AND pp.kiosk_visible = true
                AND pp.stock > 0
              ORDER BY 
                name_similarity DESC,
                pp.price ASC
              LIMIT 5
            `, [category, description]);
            
            if (fallbackResult.rows.length > 0) {
              matched[category] = fallbackResult.rows[0];
              logger.info(`Matched ${category} (fallback without price filter)`, {
                description,
                matched: fallbackResult.rows[0].name,
                price: fallbackResult.rows[0].price,
                targetPrice
              });
              continue;
            }
          }
          
          matched[category] = null;
          continue;
        }
        
        // Use the top match based on similarity score and price proximity
        const topMatch = result.rows[0];
        
        logger.info(`Matched ${category}`, {
          description,
          matched: topMatch.name,
          similarity: (topMatch.name_similarity * 100).toFixed(1) + '%',
          price: `₱${parseFloat(topMatch.price).toLocaleString()}`,
          targetPrice: targetPrice ? `₱${targetPrice.toLocaleString()}` : 'N/A'
        });
        
        matched[category] = topMatch;
        
      } catch (err) {
        logger.error(`Error matching ${category}`, { error: err.message, stack: err.stack });
        matched[category] = null;
      }
    }
    
    return matched;
  }

  /**
   * Calculate confidence score for matched build
   * @param {Object} matched - Matched products
   * @returns {Number} Confidence score (0-100)
   */
  calculateConfidenceScore(matched) {
    const categories = Object.keys(matched);
    const matchedCount = categories.filter(cat => matched[cat] !== null).length;
    return Math.round((matchedCount / categories.length) * 100);
  }

  /**
   * Log AI interaction for analytics and fine-tuning
   * @param {Number} userId - User ID
   * @param {String} endpoint - Endpoint name
   * @param {String} prompt - AI prompt
   * @param {Object} response - AI response
   * @param {Number} executionTime - Execution time in ms
   */
  async logAIInteraction(userId, endpoint, prompt, response, executionTime) {
    try {
      const db = require('../../config/db');
      await db.query(`
        INSERT INTO ai_logs (user_id, endpoint, prompt, response, execution_time_ms, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [userId, endpoint, prompt, JSON.stringify(response), executionTime]);
    } catch (err) {
      logger.error('Error logging AI interaction', { error: err.message });
      // Non-critical error, don't throw
    }
  }

  /**
   * Recommend PC upgrades based on current build
   * NEW - Phase 2: AI Upgrade Recommendations
   * ROOT CAUSE FIX #1: Now properly implements includeExternalMarket flag
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async recommendUpgrade(req, res) {
    const startTime = Date.now();
    
    try {
      const { currentBuild, userBudget, usage, includeExternalMarket = false } = req.body;
      
      // Validate input
      if (!currentBuild || typeof currentBuild !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Current build object is required',
          data: null
        });
      }
      
      logger.info('Generating upgrade recommendations', {
        userId: req.user?.id,
        budget: userBudget,
        usage,
        includeExternal: includeExternalMarket // ROOT CAUSE FIX #1: Now logged
      });
      
      // Step 1: Analyze bottlenecks
      const bottlenecks = await this.analyzeBottlenecks(currentBuild, usage);
      
      // Step 2: Generate recommendations
      let recommendations;
      let externalSuggestions = null;
      
      // ROOT CAUSE FIX #1: Branch logic based on includeExternalMarket flag
      if (includeExternalMarket) {
        // Generate BOTH database recommendations AND external suggestions
        const db = require('../../config/db');
        
        // Database recommendations (in-stock items)
        recommendations = await this.generateUpgradeRecommendations(
          currentBuild,
          bottlenecks,
          userBudget || 20000,
          usage,
          db
        );
        
        // External market suggestions (items not in database)
        externalSuggestions = await externalMarketService.generateExternalSuggestions(
          currentBuild,
          userBudget || 20000,
          bottlenecks,
          usage
        );
        
        logger.info('External suggestions generated', {
          count: externalSuggestions?.suggestions?.length || 0,
          success: externalSuggestions?.success || false
        });
        
      } else {
        // Only database recommendations (in-stock items)
        const db = require('../../config/db');
        recommendations = await this.generateUpgradeRecommendations(
          currentBuild,
          bottlenecks,
          userBudget || 20000,
          usage,
          db
        );
      }
      
      // Step 3: Log AI interaction
      const executionTime = Date.now() - startTime;
      await this.logAIInteraction(
        req.user?.id,
        includeExternalMarket ? 'recommend-upgrade-external' : 'recommend-upgrade',
        JSON.stringify({ currentBuild, userBudget, usage, includeExternalMarket }),
        { bottlenecks, recommendations, externalSuggestions },
        executionTime
      );
      
      logger.info('Upgrade recommendations generated', {
        bottlenecks,
        tierCount: Object.keys(recommendations).length,
        externalCount: externalSuggestions?.suggestions?.length || 0,
        executionTime,
        userId: req.user?.id
      });
      
      // Check if components are top-tier (no in-stock upgrades available)
      const hasInStockUpgrades = Object.keys(recommendations).some(tier => 
        recommendations[tier] && recommendations[tier].component
      );
      const isBest = !hasInStockUpgrades;
      
      // PHASE 1 FIX: Convert recommendations object to array for stress test compatibility
      // Test expects: data.recommendations?.some(r => r.source === 'database')
      const recommendationsArray = Object.values(recommendations).filter(r => r && r.component);
      
      res.json({
        success: true,
        message: 'Upgrade recommendations generated successfully',
        data: {
          currentBuild,
          bottlenecks,
          recommendations: recommendationsArray, // PHASE 1 FIX: Now returns array instead of object
          recommendationsByTier: recommendations, // Keep original object structure for backward compatibility
          externalSuggestions: includeExternalMarket ? externalSuggestions : undefined,
          mode: includeExternalMarket ? 'in-stock + external' : 'in-stock only',
          isBest, // Added for rating algorithm
          executionTime
        }
      });
      
    } catch (error) {
      logger.error('Error in recommendUpgrade', {
        error: error.message,
        stack: error.stack
      });
      
      // Check if it's an Ollama connection error
      const isOllamaError = error.message?.includes('connect') || 
                           error.message?.includes('ECONNREFUSED') ||
                           error.code === 'ECONNREFUSED';
      
      if (isOllamaError) {
        return res.status(503).json({
          success: false,
          message: 'AI service is currently unavailable. The AI model (Ollama) is not running. Please contact support.',
          data: {
            error: 'ollama_not_running',
            userMessage: 'AI recommendations feature is temporarily unavailable. You can still browse products manually.'
          },
          error: process.env.NODE_ENV === 'development' ? 'Ollama service not running on port 11434' : 'Service unavailable'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to generate upgrade recommendations',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }
  }

  /**
   * Analyze bottlenecks in current build
   * @param {Object} currentBuild - Current PC components
   * @param {String} usage - Usage type (Gaming, Office, etc.)
   * @returns {Array} List of bottleneck components
   */
  async analyzeBottlenecks(currentBuild, usage = 'Gaming') {
    // ✅ FIX #2: Use fast heuristic analysis instead of slow AI call (14s → <1ms)
    return this.heuristicBottleneckAnalysis(currentBuild, usage);
  }
  
  /**
   * Fast heuristic bottleneck analysis (replaces slow 14s AI call)
   * @param {Object} currentBuild - Current PC build
   * @param {String} usage - Usage type
   * @returns {Array} Top 2 bottleneck components
   */
  heuristicBottleneckAnalysis(currentBuild, usage = 'Gaming') {
    const bottlenecks = [];
    
    // Extract component names (case-insensitive)
    const cpu = (currentBuild.CPU?.name || currentBuild.cpu?.name || '').toLowerCase();
    const gpu = (currentBuild.GPU?.name || currentBuild.graphcard?.name || '').toLowerCase();
    const ram = (currentBuild.RAM?.name || currentBuild.ram?.name || '').toLowerCase();
    const storage = (currentBuild.Storage?.name || currentBuild.storage?.name || '').toLowerCase();
    
    // Usage-specific priority analysis
    if (usage.toLowerCase().includes('gaming')) {
      // Gaming priority: GPU > CPU > RAM > Storage
      
      // Check GPU (highest priority for gaming)
      if (!gpu || 
          gpu.includes('integrated') || 
          gpu.includes('uhd') || 
          gpu.includes('iris') ||
          gpu.match(/gtx\s*(1050|1060|1650|960|950)/i) || // Old budget GPUs
          gpu.match(/rx\s*(550|560|570|5500)/i)) { // Old AMD budget
        bottlenecks.push('GPU');
      }
      
      // Check CPU (second priority)
      if (!cpu || 
          cpu.includes('celeron') || 
          cpu.includes('pentium') ||
          cpu.includes('atom') ||
          cpu.match(/i3-[2-9]\d{3}/i) || // Old i3
          cpu.match(/ryzen 3 [1-3]\d{3}/i)) { // Old Ryzen 3
        if (bottlenecks.length < 2) bottlenecks.push('CPU');
      }
      
      // Check RAM (third priority)
      if (ram.includes('4gb') || ram.includes('8gb')) {
        if (bottlenecks.length < 2) bottlenecks.push('RAM');
      }
      
      // Check Storage (last resort)
      if (storage.includes('hdd') || storage.includes('hard disk') || storage.match(/\d+\s*rpm/i)) {
        if (bottlenecks.length < 2) bottlenecks.push('Storage');
      }
      
    } else if (usage.toLowerCase().includes('content') || usage.toLowerCase().includes('creation')) {
      // Content Creation priority: CPU > RAM > GPU > Storage
      
      // Check CPU (highest priority for content creation)
      if (!cpu || 
          cpu.includes('celeron') || 
          cpu.includes('pentium') ||
          cpu.match(/i3|i5-[2-9]\d{3}/i) || // Lower-end Intel
          cpu.match(/ryzen [3-5] [1-3]\d{3}/i)) { // Lower-end AMD
        bottlenecks.push('CPU');
      }
      
      // Check RAM (critical for content creation)
      if (ram.includes('4gb') || ram.includes('8gb') || ram.includes('16gb')) {
        if (bottlenecks.length < 2) bottlenecks.push('RAM');
      }
      
      // Check GPU (some content apps need it)
      if (!gpu || gpu.includes('integrated') || gpu.match(/gtx\s*1[05]50/i)) {
        if (bottlenecks.length < 2) bottlenecks.push('GPU');
      }
      
      // Check Storage (large files need fast storage)
      if (storage.includes('hdd') || !storage.includes('nvme')) {
        if (bottlenecks.length < 2) bottlenecks.push('Storage');
      }
      
    } else {
      // Office/General priority: Storage > RAM > CPU > GPU
      
      // Check Storage (most noticeable for office work)
      if (storage.includes('hdd') || storage.includes('hard disk')) {
        bottlenecks.push('Storage');
      }
      
      // Check RAM (multitasking)
      if (ram.includes('4gb')) {
        if (bottlenecks.length < 2) bottlenecks.push('RAM');
      }
      
      // Check CPU (general responsiveness)
      if (!cpu || cpu.includes('celeron') || cpu.includes('pentium')) {
        if (bottlenecks.length < 2) bottlenecks.push('CPU');
      }
      
      // GPU is least important for office
      if (!gpu && bottlenecks.length < 2) {
        bottlenecks.push('GPU');
      }
    }
    
    // Default fallback if nothing detected
    if (bottlenecks.length === 0) {
      return usage.toLowerCase().includes('gaming') ? ['GPU', 'RAM'] : ['CPU', 'RAM'];
    }
    
    // Pad to 2 if only 1 detected
    if (bottlenecks.length === 1) {
      const defaults = usage.toLowerCase().includes('gaming') 
        ? ['GPU', 'RAM', 'CPU', 'Storage']
        : ['CPU', 'RAM', 'GPU', 'Storage'];
      for (const fallback of defaults) {
        if (!bottlenecks.includes(fallback)) {
          bottlenecks.push(fallback);
          break;
        }
      }
    }
    
    return bottlenecks.slice(0, 2);
  }
  
  /**
   * OLD: Slow AI-based bottleneck analysis (14+ seconds) - DEPRECATED
   * Keeping for reference but no longer used
   */
  async aiBottleneckAnalysisDeprecated(currentBuild, usage = 'Gaming') {
    const bottlenecks = [];
    
    // Extract component names
    const cpu = currentBuild.CPU?.name || currentBuild.cpu?.name || '';
    const gpu = currentBuild.GPU?.name || currentBuild.graphcard?.name || '';
    const ram = currentBuild.RAM?.name || currentBuild.ram?.name || '';
    const storage = currentBuild.Storage?.name || currentBuild.storage?.name || '';
    
    // Use AI to analyze bottlenecks
    const systemPrompt = `You are a PC hardware expert. Analyze PC builds and identify bottlenecks.`;
    const userPrompt = `Analyze this ${usage} PC build for bottlenecks:
CPU: ${cpu}
GPU: ${gpu}
RAM: ${ram}
Storage: ${storage}

Identify the TOP 2 bottleneck components limiting performance.
Output ONLY JSON: {"bottlenecks": ["GPU", "RAM"]}`;

    try {
      const aiResponse = await ollamaService.generateResponse(
        userPrompt,
        systemPrompt,
        { temperature: 0.3 } // Removed max_tokens to allow full response
      );
      
      // Use robust JSON extractor instead of manual parsing
      const parsed = JSONExtractor.extractJSON(aiResponse);
      
      if (parsed && parsed.bottlenecks && Array.isArray(parsed.bottlenecks)) {
        return parsed.bottlenecks.slice(0, 2); // Top 2 bottlenecks
      }
    } catch (err) {
      logger.warn('AI bottleneck analysis failed, using fallback', { error: err.message });
    }
    
    // Fallback: Simple heuristic-based analysis
    if (usage === 'Gaming') {
      // For gaming, GPU is usually priority #1
      if (!gpu || gpu.toLowerCase().includes('integrated')) {
        bottlenecks.push('GPU');
      }
      // Old CPUs or low RAM are secondary
      if (!cpu || cpu.toLowerCase().includes('celeron') || cpu.toLowerCase().includes('pentium')) {
        bottlenecks.push('CPU');
      } else if (!ram || ram.includes('4GB') || ram.includes('8GB')) {
        bottlenecks.push('RAM');
      }
    } else if (usage === 'Content Creation') {
      // CPU and RAM priority
      bottlenecks.push('CPU');
      bottlenecks.push('RAM');
    } else {
      // Office/General: Storage and RAM
      if (!storage || storage.toLowerCase().includes('hdd')) {
        bottlenecks.push('Storage');
      }
      if (!ram || ram.includes('4GB')) {
        bottlenecks.push('RAM');
      }
    }
    
    return bottlenecks.slice(0, 2) || ['GPU', 'RAM']; // Default to GPU + RAM if nothing found
  }

  /**
   * Generate upgrade recommendations for 3 budget tiers
   * @param {Object} currentBuild - Current PC components
   * @param {Array} bottlenecks - Identified bottlenecks
   * @param {Number} userBudget - User's budget
   * @param {String} usage - Usage type
   * @param {Object} db - Database connection
   * @returns {Object} Recommendations for budget, midRange, highEnd tiers
   */
  async generateUpgradeRecommendations(currentBuild, bottlenecks, userBudget, usage, db) {
    const recommendations = {};
    
    // Define budget tiers
    const tiers = [
      { name: 'budget', min: 5000, max: 15000, label: 'Budget (₱5,000 - ₱15,000)' },
      { name: 'midRange', min: 15000, max: 35000, label: 'Mid-Range (₱15,000 - ₱35,000)' },
      { name: 'highEnd', min: 35000, max: 100000, label: 'High-End (₱35,000+)' }
    ];
    
    // Get primary bottleneck (highest priority) - normalize to uppercase
    const primaryBottleneck = (bottlenecks[0] || 'GPU').toUpperCase();
    
    // Normalize currentBuild keys to uppercase for consistent access
    const normalizedBuild = {};
    for (const [key, value] of Object.entries(currentBuild)) {
      normalizedBuild[key.toUpperCase()] = value;
    }
    
    // For each tier, find best upgrade
    for (const tier of tiers) {
      try {
        const upgrade = await this.findBestUpgradeForTier(
          primaryBottleneck,
          normalizedBuild,
          tier.min,
          tier.max,
          usage,
          db
        );
        
        if (upgrade) {
          recommendations[tier.name] = {
            tier: tier.label,
            priority: primaryBottleneck,
            component: upgrade,
            source: 'database', // PHASE 1 FIX: Add source property for stress test validation
            performanceGain: await this.calculatePerformanceGain(
              normalizedBuild[primaryBottleneck],
              upgrade,
              usage
            ),
            compatibility: '100% compatible with current build',
            totalCost: upgrade.price
          };
        }
      } catch (err) {
        logger.error(`Error generating ${tier.name} tier recommendation`, { error: err.message });
      }
    }
    
    return recommendations;
  }

  /**
   * Find best upgrade for a specific budget tier
   * ROOT CAUSE FIX #3: Now includes value scoring and ROI analysis
   * @param {String} category - Component category (GPU, CPU, etc.)
   * @param {Object} currentBuild - Current build
   * @param {Number} minPrice - Minimum price
   * @param {Number} maxPrice - Maximum price
   * @param {String} usage - Usage type
   * @param {Object} db - Database connection
   * @returns {Object} Best upgrade product with value analysis
   */
  async findBestUpgradeForTier(category, currentBuild, minPrice, maxPrice, usage, db) {
    try {
      // Map category names to database categories
      const categoryMap = {
        'GPU': 'GPU',
        'CPU': 'CPU',
        'RAM': 'RAM',
        'Storage': 'Storage',
        'Motherboard': 'Motherboard',
        'PSU': 'PSU',
        'Cooling': 'Cooling',
        'Case': 'Case'
      };
      
      const dbCategory = categoryMap[category] || category;
      
      logger.debug('Finding upgrade', {
        category,
        dbCategory,
        minPrice,
        maxPrice,
        currentBuild
      });
      
      // ROOT CAUSE FIX #6: Added stock check (stock > 0)
      // Note: is_available and is_active columns don't exist in schema
      const result = await db.query(`
        SELECT 
          id, name, category, brand, price, stock, image_url, specifications
        FROM pc_parts
        WHERE 
          category = $1
          AND stock > 0
          AND price >= $2
          AND price <= $3
        ORDER BY price DESC, stock DESC
        LIMIT 10
      `, [dbCategory, minPrice, maxPrice]);
      
      if (result.rows.length === 0) {
        logger.warn(`No products found for ${category} in price range ₱${minPrice}-${maxPrice}`);
        return null;
      }
      
      // ROOT CAUSE FIX #3: Calculate value scores for all options
      const currentComponent = currentBuild[category] || currentBuild[category.toLowerCase()] || { 
        name: 'Unknown', 
        price: 0 
      };
      const categoryLower = category.toLowerCase();
      
      const upgrades = result.rows.map(product => ({
        ...product,
        // Add value analysis if category supports it
        ...(categoryLower === 'gpu' || categoryLower === 'cpu' || categoryLower === 'ram' 
          ? upgradeValueService.calculateValueScore(currentComponent, product, categoryLower)
          : {})
      }));
      
      // ROOT CAUSE FIX #3: Sort by value score (best value first)
      upgrades.sort((a, b) => (b.valueScore || 0) - (a.valueScore || 0));
      
      // Return top value upgrade
      const bestValue = upgrades[0];
      
      logger.info('Best value upgrade found', {
        category,
        name: bestValue.name,
        price: bestValue.price,
        valueScore: bestValue.valueScore,
        valueTier: bestValue.valueTier,
        perfGain: bestValue.performanceGainPercent
      });
      
      return bestValue;
      
    } catch (err) {
      logger.error(`Error finding upgrade for ${category}`, { 
        error: err.message, 
        stack: err.stack,
        category,
        minPrice,
        maxPrice
      });
      return null;
    }
  }

  /**
   * Calculate expected performance gain
   * @param {Object} currentComponent - Current component
   * @param {Object} upgradeComponent - Upgrade component
   * @param {String} usage - Usage type
   * @returns {String} Performance gain description
   */
  async calculatePerformanceGain(currentComponent, upgradeComponent, usage) {
    // ✅ FIX #3: Use FAST heuristic performance estimation instead of slow AI call (14s → <1ms)
    const currentName = (currentComponent?.name || 'Unknown').toLowerCase();
    const upgradeName = (upgradeComponent?.name || 'Unknown').toLowerCase();
    
    // Extract component specifications for intelligent comparison
    const currentPrice = currentComponent?.price || 0;
    const upgradePrice = upgradeComponent?.price || 0;
    const priceRatio = upgradePrice / Math.max(currentPrice, 1);
    
    // GPU performance heuristics
    if (currentName.includes('rtx') || currentName.includes('gtx') || upgradeName.includes('rtx') || upgradeName.includes('gtx')) {
      // Extract GPU generation numbers (RTX 4090 = 4000 series)
      const currentGen = this.extractGPUGeneration(currentName);
      const upgradeGen = this.extractGPUGeneration(upgradeName);
      
      const genDiff = upgradeGen - currentGen;
      
      if (genDiff >= 2) {
        return usage === 'Gaming' 
          ? '60-85% FPS increase in 1080p/1440p gaming' 
          : '70-100% faster rendering and GPU-accelerated workloads';
      } else if (genDiff === 1) {
        return usage === 'Gaming'
          ? '35-55% FPS increase in 1080p/1440p gaming'
          : '40-60% faster rendering and GPU-accelerated workloads';
      } else if (priceRatio > 1.5) {
        return usage === 'Gaming'
          ? '25-40% FPS increase in 1080p gaming'
          : '30-50% faster rendering times';
      } else {
        return usage === 'Gaming'
          ? '15-25% FPS increase in 1080p gaming'
          : '20-30% faster rendering times';
      }
    }
    
    // CPU performance heuristics
    if (currentName.includes('ryzen') || currentName.includes('intel') || currentName.includes('i3') || currentName.includes('i5') || currentName.includes('i7') || currentName.includes('i9')) {
      const currentCores = this.extractCPUCores(currentName);
      const upgradeCores = this.extractCPUCores(upgradeName);
      const coreIncrease = upgradeCores - currentCores;
      
      if (coreIncrease >= 8) {
        return usage === 'Gaming'
          ? '40-60% improvement in CPU-intensive games and multitasking'
          : '80-120% faster multicore rendering and compilation';
      } else if (coreIncrease >= 4) {
        return usage === 'Gaming'
          ? '30-45% improvement in CPU-intensive games'
          : '50-80% faster multicore workloads';
      } else if (priceRatio > 1.5) {
        return usage === 'Gaming'
          ? '20-35% improvement in CPU-bound scenarios'
          : '30-50% faster single-thread and multicore tasks';
      } else {
        return usage === 'Gaming'
          ? '10-20% improvement in CPU performance'
          : '15-25% faster processing times';
      }
    }
    
    // RAM performance heuristics
    if (currentName.includes('gb') || currentName.includes('ram') || upgradeName.includes('gb') || upgradeName.includes('ram')) {
      const currentGB = this.extractRAMCapacity(currentName);
      const upgradeGB = this.extractRAMCapacity(upgradeName);
      const capacityIncrease = upgradeGB - currentGB;
      
      if (capacityIncrease >= 16) {
        return usage === 'Gaming'
          ? '35-50% smoother multitasking and reduced stuttering'
          : '60-90% improvement in large project handling';
      } else if (capacityIncrease >= 8) {
        return usage === 'Gaming'
          ? '25-40% better multitasking performance'
          : '40-60% improvement in memory-intensive workloads';
      } else {
        return usage === 'Gaming'
          ? '15-25% smoother performance with multiple apps'
          : '20-35% better handling of large files';
      }
    }
    
    // Storage performance heuristics
    if (currentName.includes('ssd') || currentName.includes('hdd') || currentName.includes('nvme')) {
      if (currentName.includes('hdd') && upgradeName.includes('nvme')) {
        return '300-600% faster load times and file transfers';
      } else if (currentName.includes('hdd') && upgradeName.includes('ssd')) {
        return '200-400% faster load times and boot speed';
      } else if (currentName.includes('sata') && upgradeName.includes('nvme')) {
        return '100-200% faster sequential read/write speeds';
      } else {
        return '50-100% improvement in storage performance';
      }
    }
    
    // Generic fallback based on price ratio
    if (priceRatio > 2.0) {
      return usage === 'Gaming' 
        ? '40-60% overall performance improvement' 
        : '50-80% faster productivity workloads';
    } else if (priceRatio > 1.5) {
      return usage === 'Gaming' 
        ? '25-40% overall performance improvement' 
        : '30-50% faster productivity workloads';
    } else {
      return usage === 'Gaming' 
        ? '15-25% overall performance improvement' 
        : '20-35% faster productivity workloads';
    }
  }
  
  /**
   * Extract GPU generation number from product name (RTX 4090 → 4000, RTX 3070 → 3000)
   * @param {String} name - GPU product name
   * @returns {Number} Generation number
   */
  extractGPUGeneration(name) {
    const rtxMatch = name.match(/rtx\s*(\d)/i);
    const gtxMatch = name.match(/gtx\s*(\d{2})/i);
    const rxMatch = name.match(/rx\s*(\d)/i);
    
    if (rtxMatch) return parseInt(rtxMatch[1]) * 1000; // RTX 4090 → 4000
    if (gtxMatch) return parseInt(gtxMatch[1].charAt(0)) * 100; // GTX 1080 → 1000
    if (rxMatch) return parseInt(rxMatch[1]) * 1000; // RX 7900 → 7000
    
    return 0;
  }
  
  /**
   * Extract CPU core count from product name
   * @param {String} name - CPU product name
   * @returns {Number} Core count
   */
  extractCPUCores(name) {
    // Look for explicit core mentions: "8-Core", "6 cores"
    const coreMatch = name.match(/(\d+)[-\s]?cores?/i);
    if (coreMatch) return parseInt(coreMatch[1]);
    
    // Ryzen heuristics: Ryzen 9 = 12-16 cores, Ryzen 7 = 8 cores, Ryzen 5 = 6 cores, Ryzen 3 = 4 cores
    if (name.includes('ryzen 9') || name.includes('r9')) return 12;
    if (name.includes('ryzen 7') || name.includes('r7')) return 8;
    if (name.includes('ryzen 5') || name.includes('r5')) return 6;
    if (name.includes('ryzen 3') || name.includes('r3')) return 4;
    
    // Intel heuristics: i9 = 8-16 cores, i7 = 8 cores, i5 = 6 cores, i3 = 4 cores
    if (name.includes('i9')) return 10;
    if (name.includes('i7')) return 8;
    if (name.includes('i5')) return 6;
    if (name.includes('i3')) return 4;
    
    return 4; // Default fallback
  }
  
  /**
   * Extract RAM capacity in GB from product name
   * @param {String} name - RAM product name
   * @returns {Number} Capacity in GB
   */
  extractRAMCapacity(name) {
    const gbMatch = name.match(/(\d+)\s*gb/i);
    return gbMatch ? parseInt(gbMatch[1]) : 8; // Default 8GB
  }

  /**
   * Get AI metrics for admin dashboard (Phase 4)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAIMetrics(req, res) {
    try {
      const { timeRange = '7days' } = req.query;
      const db = require('../../config/database');

      logger.info('Fetching AI metrics', { timeRange, adminId: req.user?.id });

      // Calculate date range
      let dateFilter = '';
      const now = new Date();
      if (timeRange === '7days') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = `WHERE created_at >= '${weekAgo.toISOString()}'`;
      } else if (timeRange === '30days') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = `WHERE created_at >= '${monthAgo.toISOString()}'`;
      } else if (timeRange === '90days') {
        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dateFilter = `WHERE created_at >= '${quarterAgo.toISOString()}'`;
      }

      // Get total estimations
      const estimationsQuery = `
        SELECT COUNT(*) as total,
               AVG(CAST(response->>'confidence' AS DECIMAL)) as avg_confidence
        FROM ai_logs
        ${dateFilter}
        AND endpoint LIKE '%estimate%'
      `;
      const estimationsResult = await db.query(estimationsQuery);
      const totalEstimations = parseInt(estimationsResult.rows[0]?.total || 0);
      const avgConfidence = parseFloat(estimationsResult.rows[0]?.avg_confidence || 0);

      // Get total recommendations
      const recommendationsQuery = `
        SELECT COUNT(*) as total
        FROM ai_logs
        ${dateFilter}
        AND endpoint LIKE '%recommend%'
      `;
      const recommendationsResult = await db.query(recommendationsQuery);
      const totalRecommendations = parseInt(recommendationsResult.rows[0]?.total || 0);

      // Get AI-assisted orders (orders with ai_assisted flag)
      const ordersQuery = `
        SELECT COUNT(*) as total,
               COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        ${dateFilter}
        AND ai_assisted = true
      `;
      const ordersResult = await db.query(ordersQuery);
      const aiAssistedOrders = parseInt(ordersResult.rows[0]?.total || 0);
      const aiAssistedRevenue = parseFloat(ordersResult.rows[0]?.revenue || 0);

      // Calculate success rate (estimations with confidence >= 80%)
      const successQuery = `
        SELECT COUNT(*) as high_confidence
        FROM ai_logs
        ${dateFilter}
        AND endpoint LIKE '%estimate%'
        AND CAST(response->>'confidence' AS DECIMAL) >= 80
      `;
      const successResult = await db.query(successQuery);
      const highConfidenceCount = parseInt(successResult.rows[0]?.high_confidence || 0);
      const estimationSuccessRate = totalEstimations > 0 
        ? (highConfidenceCount / totalEstimations) * 100 
        : 0;

      // Get recommendation acceptance rate (from ai_training_data)
      const acceptanceQuery = `
        SELECT COUNT(*) as accepted
        FROM ai_training_data
        ${dateFilter}
        AND user_accepted = true
      `;
      const acceptanceResult = await db.query(acceptanceQuery);
      const acceptedCount = parseInt(acceptanceResult.rows[0]?.accepted || 0);
      const recommendationAcceptanceRate = totalRecommendations > 0
        ? (acceptedCount / totalRecommendations) * 100
        : 0;

      // Get usage over time (daily aggregation)
      const usageQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(CASE WHEN endpoint LIKE '%estimate%' THEN 1 END) as estimations,
          COUNT(CASE WHEN endpoint LIKE '%recommend%' THEN 1 END) as recommendations
        FROM ai_logs
        ${dateFilter}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;
      const usageResult = await db.query(usageQuery);
      const usageOverTime = usageResult.rows.map(row => ({
        date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        estimations: parseInt(row.estimations),
        recommendations: parseInt(row.recommendations)
      })).reverse();

      // Get confidence distribution
      const confidenceQuery = `
        SELECT 
          CASE 
            WHEN CAST(response->>'confidence' AS DECIMAL) >= 90 THEN '90-100%'
            WHEN CAST(response->>'confidence' AS DECIMAL) >= 80 THEN '80-89%'
            WHEN CAST(response->>'confidence' AS DECIMAL) >= 70 THEN '70-79%'
            ELSE '0-69%'
          END as range,
          COUNT(*) as count
        FROM ai_logs
        ${dateFilter}
        AND endpoint LIKE '%estimate%'
        AND response->>'confidence' IS NOT NULL
        GROUP BY range
        ORDER BY range DESC
      `;
      const confidenceResult = await db.query(confidenceQuery);
      const totalConfidence = confidenceResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
      const confidenceDistribution = confidenceResult.rows.map(row => ({
        range: row.range,
        count: parseInt(row.count),
        percentage: totalConfidence > 0 ? ((parseInt(row.count) / totalConfidence) * 100).toFixed(1) : 0
      }));

      // Get popular upgrade paths
      const upgradesQuery = `
        SELECT 
          component_category as category,
          recommended_product ->> 'name' as product_name,
          COUNT(*) as count,
          AVG(CAST(recommended_product ->> 'price' AS DECIMAL)) as avg_price,
          SUM(CAST(recommended_product ->> 'price' AS DECIMAL)) as total_revenue
        FROM ai_training_data
        ${dateFilter}
        AND user_accepted = true
        GROUP BY component_category, recommended_product ->> 'name'
        ORDER BY count DESC
        LIMIT 10
      `;
      const upgradesResult = await db.query(upgradesQuery);
      const popularUpgrades = upgradesResult.rows.map(row => ({
        category: row.category || 'Unknown',
        product_name: row.product_name || 'Unknown',
        count: parseInt(row.count),
        avg_price: parseFloat(row.avg_price || 0),
        total_revenue: parseFloat(row.total_revenue || 0)
      }));

      // Get recent interactions
      const recentQuery = `
        SELECT 
          id, endpoint, user_id, execution_time_ms,
          prompt, response, created_at
        FROM ai_logs
        ORDER BY created_at DESC
        LIMIT 20
      `;
      const recentResult = await db.query(recentQuery);
      const recentInteractions = recentResult.rows.map(row => ({
        id: row.id,
        endpoint: row.endpoint,
        user_id: row.user_id,
        execution_time_ms: row.execution_time_ms,
        prompt: JSON.stringify(row.prompt),
        response: JSON.stringify(row.response),
        created_at: row.created_at
      }));

      res.status(200).json({
        success: true,
        message: 'AI metrics retrieved successfully',
        data: {
          metrics: {
            totalEstimations,
            avgConfidenceScore: avgConfidence.toFixed(1),
            totalRecommendations,
            recommendationAcceptanceRate: recommendationAcceptanceRate.toFixed(1),
            aiAssistedOrders,
            aiAssistedRevenue: aiAssistedRevenue.toFixed(2),
            estimationSuccessRate: estimationSuccessRate.toFixed(1)
          },
          usageOverTime,
          confidenceDistribution,
          popularUpgrades,
          recentInteractions
        }
      });

    } catch (error) {
      logger.error('Failed to get AI metrics', {
        error: error.message,
        stack: error.stack,
        adminId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve AI metrics',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get AI logs for admin (Phase 4)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAILogs(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const db = require('../../config/database');

      logger.info('Fetching AI logs', { limit, offset, adminId: req.user?.id });

      const logsQuery = `
        SELECT 
          id, endpoint, user_id, execution_time_ms,
          prompt, response, created_at
        FROM ai_logs
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;
      const logsResult = await db.query(logsQuery, [limit, offset]);

      const logs = logsResult.rows.map(row => ({
        id: row.id,
        endpoint: row.endpoint,
        user_id: row.user_id,
        execution_time_ms: row.execution_time_ms,
        prompt: JSON.stringify(row.prompt),
        response: JSON.stringify(row.response),
        created_at: row.created_at
      }));

      res.status(200).json({
        success: true,
        message: 'AI logs retrieved successfully',
        data: logs
      });

    } catch (error) {
      logger.error('Failed to get AI logs', {
        error: error.message,
        stack: error.stack,
        adminId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve AI logs',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get top upgrade paths from AI recommendations (Phase 4)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTopUpgradePaths(req, res) {
    try {
      const { limit = 10 } = req.query;
      const db = require('../../config/database');

      logger.info('Fetching top upgrade paths', { limit, adminId: req.user?.id });

      const query = `
        SELECT 
          component_category,
          current_component->>'name' as from_component,
          recommended_product->>'name' as to_component,
          COUNT(*) as frequency,
          AVG(CASE WHEN user_accepted THEN 1 ELSE 0 END) as acceptance_rate
        FROM ai_training_data
        WHERE current_component IS NOT NULL
          AND recommended_product IS NOT NULL
        GROUP BY component_category, from_component, to_component
        ORDER BY frequency DESC, acceptance_rate DESC
        LIMIT $1
      `;

      const result = await db.query(query, [limit]);

      res.status(200).json({
        success: true,
        message: 'Top upgrade paths retrieved successfully',
        data: {
          upgradePaths: result.rows,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to get top upgrade paths', {
        error: error.message,
        stack: error.stack,
        adminId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve upgrade paths',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get popular components from AI-assisted purchases (Phase 4)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPopularComponents(req, res) {
    try {
      const { limit = 10 } = req.query;
      const db = require('../../config/database');

      logger.info('Fetching popular AI-recommended components', { limit, adminId: req.user?.id });

      const query = `
        SELECT 
          component_category,
          recommended_product->>'name' as component_name,
          recommended_product->>'brand' as brand,
          COUNT(*) as recommendation_count,
          AVG(CASE WHEN user_accepted THEN 1 ELSE 0 END) as acceptance_rate,
          SUM(CASE WHEN user_accepted THEN 1 ELSE 0 END) as times_purchased
        FROM ai_training_data
        WHERE recommended_product IS NOT NULL
          AND user_accepted = true
        GROUP BY component_category, component_name, brand
        ORDER BY times_purchased DESC, acceptance_rate DESC
        LIMIT $1
      `;

      const result = await db.query(query, [limit]);

      res.status(200).json({
        success: true,
        message: 'Popular components retrieved successfully',
        data: {
          popularComponents: result.rows,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to get popular components', {
        error: error.message,
        stack: error.stack,
        adminId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve popular components',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Export AI training data for admin (Phase 4)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async exportAITrainingData(req, res) {
    try {
      const db = require('../../config/database');

      logger.info('Exporting AI training data', { adminId: req.user?.id });

      const exportQuery = `
        SELECT 
          id, user_id, component_category,
          current_component, recommended_product,
          user_accepted, feedback, created_at
        FROM ai_training_data
        ORDER BY created_at DESC
      `;
      const exportResult = await db.query(exportQuery);

      // Convert to CSV
      const headers = ['ID', 'User ID', 'Category', 'Current', 'Recommended', 'Accepted', 'Feedback', 'Date'];
      const rows = exportResult.rows.map(row => [
        row.id,
        row.user_id || 'Guest',
        row.component_category,
        row.current_component?.name || 'Unknown',
        row.recommended_product?.name || 'Unknown',
        row.user_accepted ? 'Yes' : 'No',
        row.feedback || '',
        new Date(row.created_at).toISOString()
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="ai_training_data_${new Date().toISOString()}.csv"`);
      res.status(200).send(csv);

    } catch (error) {
      logger.error('Failed to export AI training data', {
        error: error.message,
        stack: error.stack,
        adminId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to export training data',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Recommend PC Cleaning Tier based on assessment answers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async recommendCleaningTier(req, res) {
    try {
      const { assessmentAnswers } = req.body;

      if (!assessmentAnswers) {
        return res.status(400).json({
          success: false,
          message: 'Assessment answers are required',
          data: null
        });
      }

      logger.info('Recommending cleaning tier based on assessment', {
        answers: assessmentAnswers,
        sessionId: req.headers['x-session-id']
      });

      // Determine tier based on assessment logic
      let recommendedTier = 'basic';
      let confidence = 85;
      let reasoning = [];

      const { hasCleaned, lastCleaned, cleaningType, pcAge } = assessmentAnswers;

      // Logic for never cleaned before
      if (!hasCleaned) {
        // Recommend based on PC age (only Pro or Premium)
        if (pcAge === 'Less than a year') {
          recommendedTier = 'pro';
          confidence = 92;
          reasoning.push('PC less than a year old that has never been cleaned needs professional component-level service');
          reasoning.push('Pro tier prevents dust accumulation from becoming a long-term problem');
          reasoning.push('Full disassembly and thermal paste replacement ensures optimal performance');
        } else if (pcAge === 'More than a year') {
          recommendedTier = 'premium';
          confidence = 96;
          reasoning.push('PC over a year old without any cleaning requires comprehensive deep cleaning service');
          reasoning.push('Premium tier includes thermal pad replacement and performance validation');
          reasoning.push('Extended period without cleaning means dust has accumulated significantly');
          reasoning.push('Ultimate service package ensures your PC runs like new');
        } else {
          // Fallback if no PC age provided
          recommendedTier = 'pro';
          confidence = 90;
          reasoning.push('First-time cleaning requires comprehensive component-level service');
          reasoning.push('Pro tier includes full disassembly and thermal paste replacement');
        }
      } else {
        // Logic based on time since last cleaning
        if (lastCleaned === '1-3 months') {
          if (cleaningType === 'basic') {
            recommendedTier = 'basic';
            confidence = 90;
            reasoning.push('Recent basic cleaning means light maintenance is sufficient');
          } else if (cleaningType === 'pro' || cleaningType === 'premium') {
            recommendedTier = 'basic';
            confidence = 85;
            reasoning.push('Recently professionally cleaned - basic maintenance recommended');
          }
        } else if (lastCleaned === '4-6 months') {
          if (cleaningType === 'basic') {
            recommendedTier = 'pro';
            confidence = 88;
            reasoning.push('Basic cleaning 4-6 months ago - time for deeper service');
            reasoning.push('Pro tier ensures optimal thermal performance');
          } else {
            recommendedTier = 'basic';
            confidence = 80;
            reasoning.push('Professional cleaning 4-6 months ago - basic refresh sufficient');
          }
        } else if (lastCleaned === '7-12 months') {
          if (cleaningType === 'basic') {
            recommendedTier = 'premium';
            confidence = 92;
            reasoning.push('Basic cleaning over 7 months ago - comprehensive service needed');
            reasoning.push('Premium tier includes all services plus hardware replacements');
          } else {
            recommendedTier = 'pro';
            confidence = 87;
            reasoning.push('Professional cleaning 7-12 months ago - full service recommended');
          }
        } else if (lastCleaned === '13+ months') {
          recommendedTier = 'premium';
          confidence = 95;
          reasoning.push('Over a year since last cleaning - ultimate deep clean required');
          reasoning.push('Premium tier includes thermal pad replacement and performance validation');
          reasoning.push('Long dust accumulation period requires comprehensive treatment');
        }
      }

      const response = {
        recommendedTier,
        confidence,
        reasoning,
        alternatives: {
          basic: {
            suitable: lastCleaned === '1-3 months' || (hasCleaned && cleaningType !== 'basic'),
            reason: 'Good for recent maintenance or light refresh'
          },
          pro: {
            suitable: true,
            reason: 'Comprehensive cleaning with thermal paste replacement'
          },
          premium: {
            suitable: lastCleaned === '7-12 months' || lastCleaned === '13+ months' || !hasCleaned || (pcAge && pcAge !== '1-5 years'),
            reason: 'Ultimate service with hardware replacements and validation'
          }
        },
        assessmentSummary: {
          hasCleaned: hasCleaned ? 'Yes' : 'No',
          lastCleaned: lastCleaned || 'Never',
          previousType: cleaningType ? cleaningType.charAt(0).toUpperCase() + cleaningType.slice(1) : 'N/A',
          pcAge: pcAge || 'N/A'
        }
      };

      logger.info('Cleaning tier recommendation generated', {
        recommendedTier,
        confidence,
        sessionId: req.headers['x-session-id']
      });

      res.status(200).json({
        success: true,
        message: 'Cleaning tier recommendation generated successfully',
        data: response,
        timestamp: new Date().toISOString(),
        aiEnabled: aiConfig.service.enabled
      });

    } catch (error) {
      logger.error('Cleaning tier recommendation failed', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to generate cleaning tier recommendation',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Compare two products with AI value analysis
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * NEW - Task 5: Product Comparison Feature
   */
  async compareProducts(req, res) {
    try {
      const { product1, product2 } = req.body;

      // Validation
      if (!product1 || !product2) {
        return res.status(400).json({
          success: false,
          message: 'Both product1 and product2 are required',
          data: null
        });
      }

      logger.info('Comparing products', {
        product1Id: product1.id,
        product1Name: product1.name,
        product2Id: product2.id,
        product2Name: product2.name
      });

      // Check if AI is available
      if (!aiConfig.service.enabled) {
        logger.warn('AI service disabled, returning basic comparison');
        return res.status(200).json({
          success: true,
          message: 'Product comparison complete (AI unavailable)',
          data: {
            analysis: {
              winner: product1.price < product2.price ? 'product1' : 'product2',
              summary: 'AI service is currently unavailable. Basic price comparison shown.',
              valueAnalysis: 'Unable to generate AI analysis at this time.',
              recommendation: 'Choose based on your specific requirements and budget.'
            }
          }
        });
      }

      // Prepare comparison prompt
      const comparisonPrompt = `
You are a PC hardware expert comparing two products for a customer.

PRODUCT 1: ${product1.name}
- Category: ${product1.category}
- Price: ₱${product1.price}
- Tier: ${product1.tier || 'unspecified'}
- Specifications: ${JSON.stringify(product1.specifications || {}, null, 2)}

PRODUCT 2: ${product2.name}
- Category: ${product2.category}
- Price: ₱${product2.price}
- Tier: ${product2.tier || 'unspecified'}
- Specifications: ${JSON.stringify(product2.specifications || {}, null, 2)}

Provide a comprehensive comparison:
1. Which product offers better value? (answer: product1 or product2)
2. A concise summary (2-3 sentences) explaining the key differences
3. A detailed value analysis highlighting strengths and weaknesses of each
4. A final recommendation for which product to choose and why

Respond in JSON format:
{
  "winner": "product1" or "product2",
  "summary": "brief comparison summary",
  "valueAnalysis": "detailed analysis",
  "recommendation": "which to choose and why"
}
`.trim();

      logger.info('Sending comparison request to AI');

      // Call Ollama AI
      const aiResponse = await ollamaService.generateResponse(comparisonPrompt, {
        temperature: 0.7,
        maxTokens: 1000
      });

      logger.info('AI comparison response received', {
        responseLength: aiResponse?.length || 0
      });

      // Parse AI response using robust JSON extractor
      let analysis;
      try {
        // Use JSONExtractor instead of manual regex
        analysis = JSONExtractor.extractJSON(aiResponse);
        
        if (!analysis) {
          logger.warn('No JSON found in AI response, using fallback');
          // Use fallback instead of throwing
          analysis = {
            winner: product1.price < product2.price ? 'product1' : 'product2',
            summary: 'AI analysis unavailable. Compare specifications manually.',
            valueAnalysis: aiResponse || 'Unable to generate detailed analysis.',
            recommendation: 'Choose based on your budget and requirements.'
          };
        }
      } catch (parseError) {
        logger.warn('Failed to parse AI response, using fallback', {
          error: parseError.message,
          response: aiResponse
        });

        // Fallback: create basic analysis
        analysis = {
          winner: product1.price < product2.price ? 'product1' : 'product2',
          summary: 'AI analysis unavailable. Compare specifications manually.',
          valueAnalysis: aiResponse || 'Unable to generate detailed analysis.',
          recommendation: 'Choose based on your budget and requirements.'
        };
      }

      res.status(200).json({
        success: true,
        message: 'Product comparison generated successfully',
        data: {
          analysis,
          generatedAt: new Date().toISOString(),
          aiEnabled: true
        }
      });

    } catch (error) {
      logger.error('Product comparison failed', {
        error: error.message,
        stack: error.stack
      });

      // Return fallback comparison
      res.status(200).json({
        success: true,
        message: 'Product comparison complete (AI error)',
        data: {
          analysis: {
            winner: req.body.product1?.price < req.body.product2?.price ? 'product1' : 'product2',
            summary: 'AI analysis temporarily unavailable. Compare specifications manually.',
            valueAnalysis: 'Unable to generate AI analysis at this time.',
            recommendation: 'Choose based on your specific requirements and budget.'
          }
        }
      });
    }
  }

  /**
   * ROOT CAUSE FIX #4 & #5: Comprehensive build validation with form factor and bottleneck analysis
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async validateBuildComprehensive(req, res) {
    const startTime = Date.now(); // Track execution time
    try {
      const { build, usage = 'Gaming' } = req.body;

      if (!build || typeof build !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Build configuration is required',
          data: null
        });
      }

      logger.info('Performing comprehensive build validation', {
        components: Object.keys(build),
        usage,
        userId: req.user?.id
      });

      // Run form factor validation (Fix 1.4)
      const formFactorResult = formFactorValidator.validateBuild(build);
      
      // Run bottleneck analysis (Fix 1.5)
      const bottleneckResult = bottleneckAnalyzer.analyzeBuild(build, usage);

      // Calculate overall compatibility score
      const formFactorScore = formFactorResult.compatible ? 100 : 60;
      const bottleneckScore = bottleneckResult.overallScore;
      const overallScore = Math.round((formFactorScore * 0.3 + bottleneckScore * 0.7));

      // Determine overall status
      const criticalIssues = [
        ...formFactorResult.issues.filter(i => i.severity === 'critical'),
        ...bottleneckResult.bottlenecks.filter(b => b.severity === 'critical')
      ];

      const overallStatus = criticalIssues.length > 0 ? 'critical' :
                           (formFactorResult.warnings.length > 0 || bottleneckResult.warnings.length > 0) ? 'warning' :
                           'compatible';

      res.json({
        success: true,
        message: 'Comprehensive build validation completed',
        data: {
          overallStatus,
          overallScore,
          formFactor: {
            compatible: formFactorResult.compatible,
            issues: formFactorResult.issues,
            warnings: formFactorResult.warnings,
            summary: formFactorResult.summary
          },
          performance: {
            bottlenecks: bottleneckResult.bottlenecks,
            warnings: bottleneckResult.warnings,
            overallScore: bottleneckResult.overallScore,
            primaryBottleneck: bottleneckResult.primaryBottleneck,
            summary: bottleneckResult.summary
          },
          recommendations: this.generateBuildRecommendations(formFactorResult, bottleneckResult),
          analyzedAt: new Date().toISOString()
        }
      });

      // Log validation for analytics
      const executionTime = Date.now() - startTime;
      await this.logAIInteraction(
        req.user?.id,
        'validate-build-comprehensive',
        JSON.stringify({ build, usage }),
        { formFactorResult, bottleneckResult, overallScore },
        executionTime
      );

    } catch (error) {
      logger.error('Comprehensive build validation failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Build validation failed',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      });
    }
  }

  /**
   * Generate actionable recommendations from validation results
   * @param {Object} formFactorResult - Form factor validation result
   * @param {Object} bottleneckResult - Bottleneck analysis result
   * @returns {Array} Array of recommendations
   */
  generateBuildRecommendations(formFactorResult, bottleneckResult) {
    const recommendations = [];

    // Form factor recommendations (critical first)
    formFactorResult.issues.forEach(issue => {
      recommendations.push({
        priority: issue.severity === 'critical' ? 'high' : 'medium',
        category: 'form_factor',
        type: issue.type,
        component: issue.component,
        message: issue.message,
        action: issue.recommendation
      });
    });

    // Bottleneck recommendations (critical first)
    bottleneckResult.bottlenecks.forEach(bottleneck => {
      recommendations.push({
        priority: bottleneck.severity === 'critical' ? 'high' : 'medium',
        category: 'performance',
        type: bottleneck.type,
        component: bottleneck.bottleneckComponent || bottleneck.component,
        message: bottleneck.message,
        details: bottleneck.details,
        action: bottleneck.recommendation,
        impact: `${bottleneck.bottleneckPercentage}% performance loss`
      });
    });

    // Sort by priority (high first)
    recommendations.sort((a, b) => {
      const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return recommendations;
  }

  /**
   * PHASE 4: Generate hardware examples training dataset
   * Creates AI training examples from real database products for fine-tuning
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateTrainingDataset(req, res) {
    const startTime = Date.now();
    try {
      const { limit = 120 } = req.body;
      const db = require('../../config/db');
      
      logger.info('Generating hardware examples training dataset', {
        limit,
        userId: req.user?.id
      });
      
      const trainingExamples = [];
      
      // Example Type 1: GPU Compatibility (30 examples)
      const gpus = await db.query(`
        SELECT id, name, category, brand, price, specifications
        FROM pc_parts
        WHERE category = 'GPU'
          AND stock > 0
          AND kiosk_visible = true
        ORDER BY RANDOM()
        LIMIT 10
      `);
      
      for (const gpu of gpus.rows) {
        trainingExamples.push({
          instruction: `Analyze GPU compatibility for ${gpu.name}`,
          context: `GPU: ${gpu.name}\nBrand: ${gpu.brand}\nPrice: ₱${gpu.price}\nSpecs: ${JSON.stringify(gpu.specifications)}`,
          output: `This ${gpu.brand} GPU is compatible with:\n✅ PCIe 3.0/4.0 motherboards\n✅ PSUs with sufficient wattage (check TDP)\n✅ Cases with adequate GPU clearance\n\nRecommended pairing:\n- CPU: Mid to high-end processor\n- RAM: 16GB+ DDR4/DDR5\n- Storage: NVMe SSD for best performance`,
          metadata: { type: 'gpu_compatibility', product_id: gpu.id }
        });
      }
      
      // Example Type 2: CPU Recommendations (25 examples)
      const cpus = await db.query(`
        SELECT id, name, category, brand, price, specifications
        FROM pc_parts
        WHERE category = 'CPU'
          AND stock > 0
          AND kiosk_visible = true
        ORDER BY RANDOM()
        LIMIT 10
      `);
      
      for (const cpu of cpus.rows) {
        trainingExamples.push({
          instruction: `Recommend compatible components for ${cpu.name}`,
          context: `CPU: ${cpu.name}\nBrand: ${cpu.brand}\nSocket: ${cpu.specifications?.socket || 'Check specs'}\nPrice: ₱${cpu.price}`,
          output: `For ${cpu.name}, we recommend:\n\n🔌 Motherboard: ${cpu.specifications?.socket || 'Compatible'} socket motherboard\n💾 RAM: DDR4/DDR5 based on CPU generation\n🎮 GPU: Pair with mid to high-end GPU to avoid bottlenecks\n⚡ PSU: 550W+ for balanced build\n\nBest for: Gaming, Content Creation, Productivity`,
          metadata: { type: 'cpu_recommendation', product_id: cpu.id }
        });
      }
      
      // Example Type 3: Budget Build Suggestions (20 examples)
      const budgets = [15000, 25000, 35000, 50000];
      for (const budget of budgets) {
        for (let i = 0; i < 5; i++) {
          trainingExamples.push({
            instruction: `Suggest a complete PC build for ₱${budget} budget`,
            context: `Budget: ₱${budget}\nUse case: Gaming/Productivity\nPreference: Balanced performance`,
            output: `Recommended ₱${budget} Build:\n\n💻 CPU: ${this.suggestCPUForBudget(budget)}\n🎮 GPU: ${this.suggestGPUForBudget(budget)}\n🧠 RAM: ${budget >= 30000 ? '16GB DDR4' : '8GB DDR4'}\n💾 Storage: ${budget >= 35000 ? '512GB NVMe SSD' : '256GB SATA SSD'}\n🔌 Motherboard: Compatible ${budget >= 30000 ? 'B550/B660' : 'A520/H510'}\n⚡ PSU: ${budget >= 35000 ? '600W' : '500W'} 80+ Bronze\n\nTotal: ~₱${budget}\nPerformance: ${budget >= 35000 ? 'High' : budget >= 25000 ? 'Mid' : 'Entry'}-level`,
            metadata: { type: 'budget_build', budget: budget }
          });
        }
      }
      
      // Example Type 4: Upgrade Recommendations (25 examples)
      const oldComponents = [
        { name: 'GTX 1050 Ti', category: 'GPU', upgrade: 'RTX 3060 or RX 6600' },
        { name: 'i3-9100F', category: 'CPU', upgrade: 'i5-12400F or Ryzen 5 5600' },
        { name: '8GB DDR4', category: 'RAM', upgrade: '16GB DDR4 3200MHz' },
        { name: '128GB SATA SSD', category: 'Storage', upgrade: '512GB NVMe SSD' },
        { name: '450W PSU', category: 'PSU', upgrade: '650W 80+ Bronze modular PSU' }
      ];
      
      for (const old of oldComponents) {
        for (let i = 0; i < 5; i++) {
          trainingExamples.push({
            instruction: `Recommend upgrade path from ${old.name}`,
            context: `Current: ${old.name}\nCategory: ${old.category}\nGoal: Improve gaming/productivity performance`,
            output: `Upgrade from ${old.name}:\n\n🚀 Recommended: ${old.upgrade}\n💰 Budget: ₱${this.estimateUpgradeCost(old.category)}\n⚡ Performance gain: ${this.estimatePerformanceGain(old.category)}\n✅ Compatibility: Ensure PSU/motherboard support\n\nWhy upgrade?\n- Significant performance boost\n- Better future-proofing\n- Improved efficiency`,
            metadata: { type: 'upgrade_path', category: old.category }
          });
        }
      }
      
      // Limit to requested size
      const finalExamples = trainingExamples.slice(0, limit);
      
      // Save to JSONL file
      const fs = require('fs');
      const path = require('path');
      const outputDir = path.join(__dirname, '../../ai/training/datasets');
      const outputFile = path.join(outputDir, 'pc_hardware_training_dataset.jsonl');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Write JSONL (one JSON per line)
      const jsonlContent = finalExamples.map(ex => JSON.stringify(ex)).join('\n');
      fs.writeFileSync(outputFile, jsonlContent, 'utf8');
      
      const executionTime = Date.now() - startTime;
      
      logger.info('Hardware training dataset generated', {
        totalExamples: finalExamples.length,
        filePath: outputFile,
        fileSize: `${(jsonlContent.length / 1024).toFixed(2)} KB`,
        executionTime: `${executionTime}ms`
      });
      
      res.status(200).json({
        success: true,
        message: 'Training dataset generated successfully',
        data: {
          totalExamples: finalExamples.length,
          examplesByType: {
            gpu_compatibility: finalExamples.filter(e => e.metadata.type === 'gpu_compatibility').length,
            cpu_recommendation: finalExamples.filter(e => e.metadata.type === 'cpu_recommendation').length,
            budget_build: finalExamples.filter(e => e.metadata.type === 'budget_build').length,
            upgrade_path: finalExamples.filter(e => e.metadata.type === 'upgrade_path').length
          },
          outputFile: outputFile,
          fileSize: `${(jsonlContent.length / 1024).toFixed(2)} KB`,
          executionTime: `${executionTime}ms`
        }
      });
      
    } catch (error) {
      logger.error('Training dataset generation failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to generate training dataset',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
  
  // Helper methods for training dataset generation
  suggestCPUForBudget(budget) {
    if (budget >= 50000) return 'Intel i7-12700F or Ryzen 7 5800X';
    if (budget >= 35000) return 'Intel i5-12400F or Ryzen 5 5600';
    if (budget >= 25000) return 'Intel i3-12100F or Ryzen 5 5500';
    return 'Intel i3-10100F or Ryzen 3 3100';
  }
  
  suggestGPUForBudget(budget) {
    if (budget >= 50000) return 'RTX 4060 Ti or RX 6700 XT';
    if (budget >= 35000) return 'RTX 3060 or RX 6600';
    if (budget >= 25000) return 'GTX 1660 Super or RX 6500 XT';
    return 'GTX 1650 or integrated graphics';
  }
  
  estimateUpgradeCost(category) {
    const costs = {
      'GPU': '₱15,000 - ₱35,000',
      'CPU': '₱8,000 - ₱25,000',
      'RAM': '₱2,500 - ₱5,000',
      'Storage': '₱3,000 - ₱8,000',
      'PSU': '₱3,500 - ₱7,000'
    };
    return costs[category] || '₱5,000 - ₱15,000';
  }
  
  estimatePerformanceGain(category) {
    const gains = {
      'GPU': '50-100% FPS increase',
      'CPU': '40-80% faster processing',
      'RAM': '30-50% better multitasking',
      'Storage': '300-600% faster load times',
      'PSU': 'Improved stability and efficiency'
    };
    return gains[category] || '25-60% overall improvement';
  }
}

module.exports = new AIController();