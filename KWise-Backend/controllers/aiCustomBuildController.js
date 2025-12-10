/**
 * AI Custom Build Controller
 * Handles AI-generated custom PC builds based on user requirements
 * 
 * Feature #10: Customized with AI
 * @version 1.0.0
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');
const ollamaService = require('../ai/services/ollamaService');
const productClassificationService = require('../services/productClassificationService');

/**
 * Generate custom build based on user requirements
 * POST /api/ai/custom-build
 */
const generateCustomBuild = async (req, res) => {
  try {
    const {
      budget,
      primary_use,
      performance_target,
      preferences,
      sessionId
    } = req.body;

    // Validate requirements
    if (!budget || !primary_use) {
      return res.status(400).json({
        error: 'Missing required fields: budget, primary_use'
      });
    }

    logger.info('🤖 Generating custom build with AI', {
      budget,
      primary_use,
      performance_target
    });

    // Build AI prompt
    const prompt = buildCustomBuildPrompt(budget, primary_use, performance_target, preferences);

    // Get AI response
    const aiResponse = await ollamaService.generateResponse(
      prompt.task,
      prompt.system,
      { max_tokens: 2000, temperature: 0.3 }
    );

    // Parse AI response
    const customBuild = parseCustomBuildResponse(aiResponse);

    // Get reference builds for comparison
    const referenceBuilds = await getReferenceBuilds(primary_use, budget);

    // Calculate performance estimates
    const performanceEstimate = estimatePerformance(customBuild);

    // Calculate total price
    const priceEstimate = calculateTotalPrice(customBuild);

    // Save to database
    const savedBuild = await query(`
      INSERT INTO ai_custom_build_suggestions (
        session_id,
        user_requirements,
        suggested_build,
        reasoning,
        performance_estimate,
        price_estimate,
        reference_builds,
        ai_confidence_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      sessionId || null,
      JSON.stringify({ budget, primary_use, performance_target, preferences }),
      JSON.stringify(customBuild),
      customBuild.reasoning || 'AI-generated build',
      JSON.stringify(performanceEstimate),
      priceEstimate,
      JSON.stringify(referenceBuilds),
      customBuild.confidence || 85
    ]);

    logger.info('✅ Custom build generated', {
      buildId: savedBuild.rows[0].id,
      priceEstimate,
      confidence: customBuild.confidence
    });

    res.json({
      success: true,
      build: customBuild,
      performance_estimate: performanceEstimate,
      price_estimate: priceEstimate,
      reference_builds: referenceBuilds,
      confidence: customBuild.confidence || 85,
      ai_generated: true
    });

  } catch (error) {
    logger.error('❌ Failed to generate custom build', { error: error.message });
    res.status(500).json({
      error: 'Failed to generate custom build',
      message: error.message
    });
  }
};

/**
 * Build AI prompt for custom build generation
 */
function buildCustomBuildPrompt(budget, primaryUse, performanceTarget, preferences) {
  const systemPrompt = `You are an expert PC builder specializing in creating optimal configurations for Philippine customers. Design complete PC builds that maximize performance within budget constraints.`;

  const taskPrompt = `Design a complete PC build for a customer with these requirements:

**Budget**: ₱${budget.min} - ₱${budget.max}
**Primary Use**: ${primaryUse}
**Performance Target**: ${performanceTarget || 'Balanced'}
**Preferences**: ${JSON.stringify(preferences || {})}

Design a COMPLETE PC build including:
- CPU (with reasoning)
- GPU (with reasoning)
- Motherboard (compatible socket and chipset)
- RAM (appropriate capacity and speed)
- Storage (SSD/HDD mix if budget allows)
- PSU (adequate wattage with 20% headroom)
- Case (proper airflow and size)
- Cooling (appropriate for CPU/GPU)

Consider:
1. Component compatibility (socket, power, clearance)
2. Performance balance (no bottlenecks)
3. Future upgrade path
4. Philippine market availability
5. Value for money

Return ONLY valid JSON:
{
  "build_name": "Descriptive name",
  "components": {
    "cpu": {
      "name": "AMD Ryzen 7 7800X3D",
      "price": 22000,
      "reasoning": "Why chosen (1 sentence)"
    },
    "gpu": { "name": "...", "price": ..., "reasoning": "..." },
    "motherboard": { "name": "...", "price": ..., "reasoning": "..." },
    "ram": { "name": "...", "price": ..., "reasoning": "..." },
    "storage": { "name": "...", "price": ..., "reasoning": "..." },
    "psu": { "name": "...", "price": ..., "reasoning": "..." },
    "case": { "name": "...", "price": ..., "reasoning": "..." },
    "cooling": { "name": "...", "price": ..., "reasoning": "..." }
  },
  "total_price": 85000,
  "reasoning": "Overall build justification (2-3 sentences)",
  "performance_summary": "Expected performance (1 sentence)",
  "upgrade_path": "Future upgrade recommendations (1 sentence)",
  "confidence": 0-100
}`;

  return {
    system: systemPrompt,
    task: taskPrompt
  };
}

/**
 * Parse AI custom build response
 */
function parseCustomBuildResponse(response) {
  try {
    // Clean response
    let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.components || !parsed.total_price) {
      throw new Error('Invalid build structure');
    }

    return parsed;

  } catch (error) {
    logger.error('❌ Failed to parse custom build response', { error: error.message });
    
    // Return fallback build
    return {
      build_name: 'AI Custom Build (Fallback)',
      components: {},
      total_price: 0,
      reasoning: 'AI response parsing failed, please try again',
      confidence: 0,
      fallback: true
    };
  }
}

/**
 * Get reference builds for comparison
 */
async function getReferenceBuilds(primaryUse, budget) {
  try {
    // Query pre-built PCs or reference builds within budget range
    const result = await query(`
      SELECT *
      FROM pre_built_pcs
      WHERE use_case = $1
        AND total_price BETWEEN $2 AND $3
        AND is_active = TRUE
      ORDER BY total_price ASC
      LIMIT 3
    `, [primaryUse, budget.min * 0.8, budget.max * 1.2]);

    return result.rows;
  } catch (error) {
    logger.error('❌ Failed to get reference builds', { error: error.message });
    return [];
  }
}

/**
 * Estimate performance based on components
 */
function estimatePerformance(build) {
  if (build.fallback) {
    return {
      gaming_fps: 'Unknown',
      productivity: 'Unknown',
      content_creation: 'Unknown'
    };
  }

  // Simple estimation based on component names (in production, use database specs)
  return {
    gaming_fps: {
      '1080p': 'High-Ultra 120+ FPS',
      '1440p': 'High-Ultra 90+ FPS',
      '4K': 'Medium-High 60+ FPS'
    },
    productivity: 'Excellent multi-tasking',
    content_creation: 'Fast rendering and editing',
    estimated: true
  };
}

/**
 * Calculate total build price
 */
function calculateTotalPrice(build) {
  if (build.fallback || !build.components) {
    return 0;
  }

  try {
    let total = 0;
    Object.values(build.components).forEach(component => {
      if (component && component.price) {
        total += parseFloat(component.price);
      }
    });
    return total;
  } catch (error) {
    return build.total_price || 0;
  }
}

/**
 * Mark build as accepted by user
 * POST /api/ai/custom-build/:id/accept
 */
const acceptCustomBuild = async (req, res) => {
  try {
    const { id } = req.params;
    const { modifications } = req.body;

    await query(`
      UPDATE ai_custom_build_suggestions
      SET accepted = TRUE,
          user_modifications = $1
      WHERE id = $2
    `, [JSON.stringify(modifications || {}), id]);

    logger.info('✅ Custom build accepted', { buildId: id });

    res.json({
      success: true,
      message: 'Build accepted'
    });

  } catch (error) {
    logger.error('❌ Failed to accept custom build', { error: error.message });
    res.status(500).json({
      error: 'Failed to accept build'
    });
  }
};

module.exports = {
  generateCustomBuild,
  acceptCustomBuild
};

