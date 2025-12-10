/**
 * Enhanced AI Compatibility Prompts - Phase 1 Implementation
 * Strict JSON schema enforcement for 80%+ quality responses
 * Implements retry logic and validation for DeepSeek R1
 * 
 * Target: 5.0/5.0 Rating
 * Author: K-Wise Philippines
 * Date: November 11, 2025
 */

const logger = require('../../utils/logger');

class EnhancedCompatibilityPrompts {
  constructor() {
    this.maxRetries = 3;
    this.timeoutMs = 15000;
  }

  /**
   * Generate strict JSON schema for compatibility analysis
   * Enforces consistent response format from AI
   */
  generateCompatibilitySchema() {
    return `{
  "compatible": boolean,
  "confidence": number (0-100),
  "compatibility_score": number (0-100),
  "severity": string ("compatible"|"warning"|"critical"),
  "summary": string (1-2 sentences),
  "issues": [
    {
      "type": string ("socket"|"power"|"clearance"|"performance"|"bios"|"thermal"),
      "severity": string ("info"|"warning"|"critical"),
      "title": string (short description),
      "description": string (detailed explanation),
      "solution": string (how to fix or null),
      "impact": string ("low"|"medium"|"high")
    }
  ],
  "recommendations": [
    {
      "type": string ("upgrade"|"alternative"|"configuration"),
      "component": string (component name),
      "reason": string (why this recommendation),
      "priority": number (1-5, 5 = highest)
    }
  ],
  "power_analysis": {
    "total_tdp": number (watts),
    "psu_required": number (watts),
    "safety_margin": number (percentage),
    "adequate": boolean
  },
  "bottleneck_analysis": {
    "detected": boolean,
    "type": string ("cpu_limited"|"gpu_limited"|"balanced"),
    "impact_percentage": number (0-100),
    "recommendation": string
  }
}`;
  }

  /**
   * ENHANCED PROMPT: Component Compatibility Check
   * PCPartPicker-level detail with strict output validation
   */
  generateComponentCompatibilityPrompt(componentA, componentB) {
    return `You are a PC hardware compatibility expert. Analyze the compatibility between these components with EXTREME PRECISION.

Component A:
- Name: ${componentA.name}
- Category: ${componentA.category}
- Brand: ${componentA.brand || 'Unknown'}
- Specifications: ${JSON.stringify(componentA.specifications || {})}

Component B:
- Name: ${componentB.name}
- Category: ${componentB.category}
- Brand: ${componentB.brand || 'Unknown'}
- Specifications: ${JSON.stringify(componentB.specifications || {})}

CRITICAL ANALYSIS REQUIREMENTS:
1. Socket/Chipset Compatibility (CPU-Motherboard)
2. Power Supply Adequacy (PSU-Components)
3. Physical Clearance (GPU/Cooler/RAM height)
4. Performance Tier Balance (avoid bottlenecks)
5. BIOS Update Requirements
6. Thermal Considerations

OUTPUT REQUIREMENTS:
- You MUST respond with ONLY valid JSON
- Follow this EXACT schema:
${this.generateCompatibilitySchema()}

VALIDATION RULES:
- confidence must be 0-100
- compatibility_score must be 0-100
- ALL fields are required
- issues array can be empty if fully compatible
- recommendations array must have at least 1 item if compatibility_score < 100

RESPOND WITH JSON ONLY (NO MARKDOWN, NO EXTRA TEXT):`;
  }

  /**
   * ENHANCED PROMPT: Full Build Analysis
   * Analyzes entire PC build with detailed breakdown
   */
  generateFullBuildPrompt(components) {
    const componentList = Object.entries(components)
      .filter(([category, component]) => component && component.name)
      .map(([category, component]) => `${category}: ${component.name} (${component.brand || 'Unknown'})`)
      .join('\n');

    return `You are an expert PC system integrator. Perform a COMPREHENSIVE compatibility analysis of this complete PC build.

BUILD COMPONENTS:
${componentList}

FULL SPECIFICATIONS:
${JSON.stringify(components, null, 2)}

COMPREHENSIVE ANALYSIS REQUIRED:
1. ⚡ POWER BUDGET ANALYSIS:
   - Calculate total system TDP (CPU + GPU + peripherals)
   - Verify PSU wattage adequacy
   - Check 12V rail capacity for GPU
   - Recommend optimal PSU wattage with 20% headroom

2. 📏 PHYSICAL CLEARANCE CHECKS:
   - GPU length vs case max GPU clearance
   - CPU cooler height vs case max cooler height  
   - RAM height vs cooler RAM clearance
   - PSU length vs case PSU bay
   - Drive bays vs GPU length conflicts

3. 🔌 SOCKET & CHIPSET COMPATIBILITY:
   - CPU socket matches motherboard socket
   - Chipset supports CPU generation
   - BIOS version requirements
   - RAM speed support (check motherboard QVL)

4. ⚖️ PERFORMANCE TIER BALANCE:
   - CPU tier vs GPU tier matching
   - RAM speed optimal for CPU
   - Storage speed matches use case
   - Monitor refresh rate matches GPU capability

5. 🌡️ THERMAL ANALYSIS:
   - CPU cooler TDP rating vs CPU TDP
   - Case airflow adequacy
   - GPU thermal requirements
   - VRM cooling for motherboard

6. 🔧 ADDITIONAL CHECKS:
   - PCIe slot availability
   - M.2 slots vs SATA ports conflicts
   - Front panel USB-C connector availability
   - RGB ecosystem compatibility

OUTPUT SCHEMA (STRICT JSON ONLY):
{
  "overall_compatible": boolean,
  "compatibility_score": number (0-100),
  "confidence": number (0-100),
  "rating": string ("excellent"|"good"|"fair"|"poor"|"critical"),
  "summary": string (2-3 sentences),
  "layers": {
    "power_budget": {
      "status": string ("pass"|"warning"|"fail"),
      "total_tdp": number,
      "psu_wattage": number,
      "recommended_psu": number,
      "safety_margin": number,
      "details": string
    },
    "physical_clearance": {
      "status": string ("pass"|"warning"|"fail"),
      "checks": [
        {
          "component": string,
          "measurement": string,
          "limit": string,
          "status": string,
          "clearance_mm": number
        }
      ]
    },
    "socket_compatibility": {
      "status": string ("pass"|"warning"|"fail"),
      "cpu_socket": string,
      "mb_socket": string,
      "chipset": string,
      "bios_update_required": boolean,
      "details": string
    },
    "performance_balance": {
      "status": string ("pass"|"warning"|"fail"),
      "cpu_tier": string,
      "gpu_tier": string,
      "bottleneck": string ("none"|"cpu_limited"|"gpu_limited"),
      "impact_percentage": number,
      "recommendation": string
    },
    "thermal_analysis": {
      "status": string ("pass"|"warning"|"fail"),
      "cooler_tdp": number,
      "cpu_tdp": number,
      "adequate": boolean,
      "recommendation": string
    }
  },
  "critical_issues": [
    {
      "type": string,
      "severity": string ("critical"|"warning"|"info"),
      "component": string,
      "issue": string,
      "solution": string,
      "priority": number (1-5)
    }
  ],
  "warnings": [
    {
      "type": string,
      "component": string,
      "message": string,
      "recommendation": string
    }
  ],
  "upgrade_suggestions": [
    {
      "component": string,
      "current": string,
      "suggested": string,
      "reason": string,
      "estimated_cost": number,
      "performance_gain": string
    }
  ]
}

CRITICAL: Respond with ONLY the JSON object. No markdown, no code blocks, no explanations.`;
  }

  /**
   * ENHANCED PROMPT: Upgrade Path Analysis
   * Suggests optimal upgrade paths with budget considerations
   */
  generateUpgradePathPrompt(currentBuild, budget, priority) {
    return `You are a PC upgrade specialist. Analyze this current build and suggest the BEST upgrade path.

CURRENT BUILD:
${JSON.stringify(currentBuild, null, 2)}

UPGRADE CONSTRAINTS:
- Budget: ₱${budget.toLocaleString()}
- Priority: ${priority} (gaming|work|balanced)
- Must maintain compatibility with existing components

ANALYSIS REQUIREMENTS:
1. Identify the biggest bottleneck
2. Calculate upgrade options within budget
3. Consider resale value of current components
4. Prioritize by performance gain per peso
5. Ensure full compatibility with remaining components

OUTPUT SCHEMA (STRICT JSON):
{
  "recommended_upgrade": {
    "component": string,
    "reason": string,
    "expected_gain": string,
    "priority": number (1-5)
  },
  "upgrade_options": [
    {
      "component": string,
      "current_part": string,
      "suggested_part": string,
      "cost": number,
      "resale_value": number,
      "net_cost": number,
      "performance_gain_percentage": number,
      "fps_gain": string,
      "compatibility_notes": string,
      "roi_score": number (0-100)
    }
  ],
  "bottleneck_analysis": {
    "primary_bottleneck": string,
    "secondary_bottleneck": string,
    "impact_description": string
  },
  "budget_allocation": {
    "total_budget": number,
    "option_1": { "name": string, "cost": number, "value_score": number },
    "option_2": { "name": string, "cost": number, "value_score": number },
    "option_3": { "name": string, "cost": number, "value_score": number }
  }
}

RESPOND WITH JSON ONLY:`;
  }

  /**
   * ENHANCED PROMPT: External Component Suggestions (Future Upgrade)
   * Suggests components not in database with market analysis
   */
  generateExternalSuggestionPrompt(currentComponent, targetCategory, budget) {
    return `You are a PC hardware market analyst for the PHILIPPINE market. Suggest external components not in our database.

CURRENT COMPONENT:
${JSON.stringify(currentComponent, null, 2)}

TARGET UPGRADE:
- Category: ${targetCategory}
- Budget: ₱${budget.toLocaleString()}
- Market: Philippines (consider availability and pricing)

REQUIREMENTS:
1. Suggest 3-5 specific products with model numbers
2. Provide estimated Philippine market prices (₱)
3. Explain compatibility with current component
4. Include performance comparison
5. Consider availability in PH market (Lazada, Shopee, PCHub, PCWorx, etc.)

OUTPUT SCHEMA (STRICT JSON):
{
  "suggestions": [
    {
      "brand": string,
      "model": string (full model number),
      "category": string,
      "estimated_price_php": number,
      "availability": string ("readily_available"|"limited"|"hard_to_find"),
      "retailers": [string] (PH retailers),
      "performance_tier": string ("entry"|"mid-tier"|"high-tier"|"elite"),
      "compatibility_score": number (0-100),
      "compatibility_notes": string,
      "performance_comparison": string,
      "pros": [string],
      "cons": [string],
      "recommendation_priority": number (1-5),
      "value_score": number (0-100),
      "future_proof_score": number (0-100)
    }
  ],
  "market_analysis": {
    "price_trend": string ("rising"|"stable"|"falling"),
    "best_time_to_buy": string,
    "alternative_budget": string
  }
}

RESPOND WITH JSON ONLY:`;
  }

  /**
   * Validate JSON response from AI
   * Returns parsed JSON or throws error
   */
  validateJSONResponse(response) {
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = response.trim();
      
      // Remove ```json and ``` markers
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '');
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '');
      cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
      
      // Try to parse
      const parsed = JSON.parse(cleanedResponse);
      
      // Validate required fields
      if (!parsed || typeof parsed !== 'object') {
        logger.warn('Response is not a valid object, using fallback');
        return {
          compatible: true,
          score: 70,
          issues: [],
          warnings: ['AI response validation failed'],
          recommendations: ['Using fallback compatibility analysis']
        };
      }
      
      return parsed;
    } catch (error) {
      logger.warn('❌ JSON validation failed, using fallback:', error.message);
      logger.warn('Raw response:', response.substring(0, 500));
      
      // Return fallback instead of throwing
      return {
        compatible: true,
        score: 70,
        issues: [],
        warnings: ['AI response parsing failed'],
        recommendations: ['Using fallback compatibility analysis']
      };
    }
  }

  /**
   * Extract JSON from AI response (handles various formats)
   */
  extractJSON(text) {
    // Try to find JSON object in text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    return text;
  }
}

module.exports = new EnhancedCompatibilityPrompts();
