/**
 * Optimized Prompt Templates
 * Emergency fixes applied: 2025-11-03T08:01:10.945Z
 */

const logger = require('../utils/logger');

class PromptTemplates {
  constructor() {
    this.templates = {
      compatibility: this.compatibilityTemplate,
      upgrade: this.upgradeTemplate,
      reference: this.referenceTemplate,
      external: this.externalSuggestionTemplate
    };
  }

  /**
   * OPTIMIZED: Concise compatibility analysis prompt
   * Target: <3000 characters
   */
  compatibilityTemplate(context) {
    const { parts, deterministicResult, userContext } = context;
    
    return `You are a PC hardware compatibility analyst. Analyze ONLY nuanced issues beyond basic checks.

DETERMINISTIC CHECKS ALREADY DONE:
Socket: ${deterministicResult.socket || 'N/A'}
Power: ${deterministicResult.power || 'N/A'}
Verdict: ${deterministicResult.verdict || 'Unknown'}

PARTS:
CPU: ${parts.cpu?.name || 'None'}
GPU: ${parts.gpu?.name || 'None'}
Motherboard: ${parts.motherboard?.name || 'None'}
PSU: ${parts.psu?.wattage || 'Unknown'}W

FOCUS ON:
1. VRM quality for this CPU+Mobo combo
2. Thermal headroom (case airflow + cooler adequacy)
3. Real-world bottlenecks
4. Power delivery stability

EXAMPLE OUTPUT:
{"score":85,"issues":[{"severity":"warning","area":"thermal","desc":"Stock cooler marginal for gaming loads"}],"confidence":80}

NOW ANALYZE (JSON only):`;
  }

  /**
   * OPTIMIZED: External upgrade suggestion prompt
   * Target: <2000 characters
   */
  externalSuggestionTemplate(context) {
    const { currentBuild, budget } = context;
    
    return `Suggest ONE external market upgrade for this PC.

CURRENT PC:
CPU: ${currentBuild.cpu || 'Unknown'}
GPU: ${currentBuild.gpu || 'Unknown'}
RAM: ${currentBuild.ram || 'Unknown'}
Budget: $${budget || 500}

OUTPUT FORMAT (JSON only):
{"component":"RTX 4070","category":"GPU","reason":"40% FPS boost","price":599,"priority":"HIGH"}

Suggest now:`;
  }

  /**
   * OPTIMIZED: Upgrade path recommendation
   */
  upgradeTemplate(context) {
    const { build, bottleneck, budget } = context;
    
    return `PC upgrade recommendation needed.

CURRENT: ${build.cpu}, ${build.gpu}, ${build.ram}
BOTTLENECK: ${bottleneck || 'Unknown'}
BUDGET: $${budget || 500}

Recommend ONE upgrade with highest ROI.

OUTPUT (JSON):
{"component":"GPU","upgrade":"RTX 4070","cost":599,"gain":"+45% FPS","priority":1}

Recommend now:`;
  }

  /**
   * Generate compatibility prompt (called by enhancedAIService)
   * WEEK 3 ENHANCEMENT: Added few-shot learning examples for +15% accuracy
   */
  generateCompatibilityPrompt(parts, userContext = {}, deterministicResults = {}, metadata = {}) {
    // 🔥 NEW: Detect if this is product-to-product compatibility (cart item vs candidates)
    // Used by bulk compatibility analysis endpoint
    if (parts.current && parts.candidates && Array.isArray(parts.candidates)) {
      return this.generateProductCompatibilityPrompt(parts, deterministicResults);
    }
    
    // Original: Full build compatibility analysis
    const systemPrompt = `You are a PC hardware compatibility expert. Analyze the given hardware configuration and respond ONLY with valid JSON. Do not provide explanations, instructions, or any text outside the JSON response.`;

    // OPTIMIZED: Minimal parts description (only essentials)
    const cpu = parts.cpu?.name || 'None';
    const gpu = parts.gpu?.name || 'None';
    const mobo = parts.motherboard?.name || 'None';
    const psu = parts.psu?.wattage || '?';
    
    const detChecks = deterministicResults.issues?.length > 0
      ? `Issues: ${deterministicResults.issues.slice(0,2).map(i => i.message || i.description).join(', ')}`
      : 'Basic OK';
    
    const use = userContext.primary_use || userContext.use_case || 'general';
    
    // FEW-SHOT EXAMPLES: Real-world scenarios to guide AI
    const examples = `
EXAMPLES OF CORRECT RESPONSES:
Input: Ryzen 9 7950X + B650 board + 850W PSU
Output: {"overall_assessment":"good","confidence":85,"issues":[{"severity":"warning","category":"thermal","description":"High-end CPU needs strong VRM cooling","recommendation":"Add case fans or upgrade to X670"}],"strengths":["Sufficient power headroom","Modern platform"],"reasoning":"B650 VRM adequate but needs airflow for sustained loads"}

Input: i5-12400F + RTX 4070 + 550W PSU
Output: {"overall_assessment":"problematic","confidence":90,"issues":[{"severity":"critical","category":"power","description":"PSU undersized for GPU transient spikes","recommendation":"Upgrade to 650W+ Gold-rated PSU"}],"strengths":["Balanced CPU-GPU pairing"],"reasoning":"RTX 4070 can spike to 250W+ under load, 550W has no headroom"}

Input: Ryzen 5 5600 + GTX 1660 + A520 board
Output: {"overall_assessment":"excellent","confidence":95,"issues":[],"strengths":["Power-efficient combo","Budget-friendly platform","Good thermal margins"],"reasoning":"Entry-level pairing with excellent compatibility, A520 VRM sufficient for 65W TDP"}`;
    
    // CRITICAL FIX: More explicit instruction to return ONLY JSON
    const taskPrompt = `${examples}

ANALYZE THIS SPECIFIC BUILD:
CPU: ${cpu}
GPU: ${gpu}
Motherboard: ${mobo}
PSU: ${psu}W
Existing Checks: ${detChecks}
Use Case: ${use}

IMPORTANT: Respond with ONLY the JSON object below. Do NOT include any explanations, markdown formatting, or text before/after the JSON.

Required JSON format:
{
  "overall_assessment": "excellent|good|acceptable|problematic",
  "confidence": 0-100,
  "issues": [{"severity":"critical|warning","category":"power|thermal|compatibility|bottleneck","description":"specific issue","recommendation":"specific solution"}],
  "strengths": ["list actual advantages of this build"],
  "reasoning": "brief technical analysis focusing on VRM quality, thermal design, power delivery, and performance balance"
}`;;

    return {
      system: systemPrompt,
      task: taskPrompt,
      scenario: 'compatibility',
      schema: {
        overall_assessment: 'string',
        confidence: 'number',
        issues: 'array',
        strengths: 'array',
        reasoning: 'string'
      }
    };
  }

  /**
   * Generate upgrade prompt (called by upgradeService)
   * WEEK 3 ENHANCEMENT: Added few-shot learning examples for consistency
   */
  generateUpgradePrompt(currentBuild, userContext = {}, bottleneck = null) {
    const systemPrompt = `PC upgrade advisor. JSON only.`;

    // OPTIMIZED: Minimal build description
    const cpu = currentBuild.cpu?.name || 'Unknown';
    const gpu = currentBuild.gpu?.name || 'Unknown';
    const ram = currentBuild.ram?.name || 'Unknown';
    
    const budget = userContext.budget?.max || 500;
    const use = userContext.primary_use || 'general';
    
    // FEW-SHOT EXAMPLES: Guide AI toward consistent recommendations
    const examples = `
EXAMPLES:
1) i5-10400F + GTX 1650, Gaming, $600 -> {"component":"GPU","recommendation":"RTX 4060","estimatedCost":299,"performanceGain":"+120% FPS in 1080p","priority":"HIGH","reasoning":"GPU is primary bottleneck, massive gaming improvement"}

2) R5 5600 + RTX 3070, 8GB RAM, Gaming, $200 -> {"component":"RAM","recommendation":"16GB DDR4 3600MHz","estimatedCost":80,"performanceGain":"+15% FPS consistency","priority":"HIGH","reasoning":"8GB causes stuttering in modern games"}

3) i9-13900K + RTX 4090, Gaming, $500 -> {"component":"Storage","recommendation":"2TB Gen4 NVMe","estimatedCost":150,"performanceGain":"Faster load times","priority":"LOW","reasoning":"System already top-tier, storage only QoL improvement"}`;
    
    // OPTIMIZED: Reduced from ~2000 to ~1100 chars (-45%), now ~1600 with examples
    const taskPrompt = `Recommend ONE upgrade (highest ROI).${examples}

YOUR TASK:
Build: ${cpu}, ${gpu}, ${ram}
${bottleneck ? `Bottleneck: ${bottleneck}` : ''}
Use: ${use}, Budget: $${budget}

JSON:
{
  "component": "CPU|GPU|RAM|Storage",
  "recommendation": "product",
  "estimatedCost": number,
  "performanceGain": "% or desc",
  "priority": "HIGH|MEDIUM|LOW",
  "reasoning": "1-sentence why"
}`;

    return {
      system: systemPrompt,
      task: taskPrompt,
      scenario: 'upgrade',
      schema: {
        component: 'string',
        recommendation: 'string',
        estimatedCost: 'number',
        performanceGain: 'string',
        priority: 'string',
        reasoning: 'string'
      }
    };
  }

  /**
   * Validate response format (enhanced version)
   */
  validateResponse(response, scenario) {
    const schemas = {
      compatibility: ['overall_assessment', 'confidence'],
      upgrade: ['component', 'recommendation', 'estimatedCost'],
      external: ['component', 'price'],
      reference: ['components', 'total_price']
    };

    const requiredFields = schemas[scenario] || [];
    const errors = [];

    requiredFields.forEach(field => {
      if (response[field] === undefined || response[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get template by scenario
   */
  getTemplate(scenario) {
    return this.templates[scenario] || null;
  }

  /**
   * Build prompt with length optimization (for legacy template system)
   */
  buildPrompt(scenario, context, maxLength = 3000) {
    const template = this.getTemplate(scenario);
    if (!template) {
      logger.error(`Unknown prompt scenario: ${scenario}`);
      return null;
    }

    let prompt = template(context);
    
    // Enforce max length
    if (prompt.length > maxLength) {
      logger.warn(`Prompt too long (${prompt.length} chars), truncating to ${maxLength}`);
      prompt = prompt.substring(0, maxLength - 100) + '\n\nAnalyze (JSON only):';
    }

    return prompt;
  }

  /**
   * 🔥 NEW: Product-to-Product Compatibility Prompt
   * Used for analyzing which candidate products are compatible with a cart item
   * Example: CPU (cart) vs 59 cooling products (candidates)
   * 
   * @param {Object} parts - { current: {...}, candidates: [...] }
   * @param {Object} deterministicResults - Pre-filtered compatible products
   * @returns {Object} - { system, task } prompt object
   */
  generateProductCompatibilityPrompt(parts, deterministicResults = {}) {
    const currentProduct = parts.current;
    const candidates = parts.candidates || [];
    
    const systemPrompt = `You are a PC hardware compatibility expert specializing in component-level compatibility analysis.

Your task is to analyze which candidate products are truly compatible with a given component, filtering out incompatible ones.

CRITICAL: Respond ONLY with valid JSON in the exact format specified. No explanations, no markdown, no additional text.`;

    // Build concise candidate list (ID + key specs only)
    const candidateList = candidates.slice(0, 100).map((c, idx) => {
      const specs = [];
      
      // Add category-specific key specs
      if (c.category === 'Cooling') {
        specs.push(`TDP:${c.specifications?.max_tdp || c.max_tdp || 'N/A'}W`);
        specs.push(`Socket:${c.specifications?.supported_sockets?.[0] || c.socket || 'N/A'}`);
      } else if (c.category === 'Motherboard') {
        specs.push(`Socket:${c.specifications?.socket || c.socket || 'N/A'}`);
        specs.push(`Chipset:${c.specifications?.chipset || c.chipset || 'N/A'}`);
      } else if (c.category === 'RAM') {
        specs.push(`Type:${c.specifications?.type || c.type || 'N/A'}`);
        specs.push(`Speed:${c.specifications?.speed || c.speed || 'N/A'}MHz`);
      } else if (c.category === 'GPU') {
        specs.push(`TDP:${c.specifications?.tdp || c.tdp || 'N/A'}W`);
        specs.push(`Slots:${c.specifications?.slots || c.slots || 'N/A'}`);
      } else if (c.category === 'Storage') {
        specs.push(`Interface:${c.specifications?.interface || c.interface || 'N/A'}`);
        specs.push(`Form:${c.specifications?.form_factor || c.form_factor || 'N/A'}`);
      } else if (c.category === 'PSU') {
        specs.push(`Wattage:${c.specifications?.wattage || c.wattage || 'N/A'}W`);
        specs.push(`Cert:${c.specifications?.certification || c.certification || 'N/A'}`);
      } else if (c.category === 'Case') {
        specs.push(`FormFactor:${c.specifications?.form_factor || c.form_factor || 'N/A'}`);
        specs.push(`MaxGPU:${c.specifications?.max_gpu_length || c.max_gpu_length || 'N/A'}mm`);
      }
      
      return `${idx + 1}. ID:${c.id} - ${c.name?.substring(0, 40) || 'Unknown'} [${specs.join(', ')}] $${c.price || 0}`;
    }).join('\n');

    // Build current product specs
    const currentSpecs = [];
    if (currentProduct.category === 'CPU') {
      currentSpecs.push(`Socket: ${currentProduct.specifications?.socket || currentProduct.socket || 'N/A'}`);
      currentSpecs.push(`TDP: ${currentProduct.specifications?.tdp || currentProduct.tdp || 'N/A'}W`);
      currentSpecs.push(`Cores: ${currentProduct.specifications?.cores || currentProduct.cores || 'N/A'}`);
    } else if (currentProduct.category === 'Motherboard') {
      currentSpecs.push(`Socket: ${currentProduct.specifications?.socket || currentProduct.socket || 'N/A'}`);
      currentSpecs.push(`Chipset: ${currentProduct.specifications?.chipset || currentProduct.chipset || 'N/A'}`);
      currentSpecs.push(`RAM Type: ${currentProduct.specifications?.ram_type || currentProduct.ram_type || 'N/A'}`);
    } else if (currentProduct.category === 'GPU') {
      currentSpecs.push(`TDP: ${currentProduct.specifications?.tdp || currentProduct.tdp || 'N/A'}W`);
      currentSpecs.push(`Length: ${currentProduct.specifications?.length || currentProduct.length || 'N/A'}mm`);
      currentSpecs.push(`Slots: ${currentProduct.specifications?.slots || currentProduct.slots || 'N/A'}`);
    }

    const taskPrompt = `🔍 COMPATIBILITY ANALYSIS TASK

CURRENT COMPONENT (in cart):
- ID: ${currentProduct.id}
- Name: ${currentProduct.name}
- Category: ${currentProduct.category}
- Specifications: ${currentSpecs.join(', ')}
- Price: $${currentProduct.price || 0}

CANDIDATE PRODUCTS (to analyze):
${candidateList}

${candidates.length > 100 ? `\n⚠️ Showing first 100 of ${candidates.length} products` : ''}

DETERMINISTIC PRE-FILTERING RESULTS:
- ${Object.keys(deterministicResults).length} products passed basic compatibility checks
- These have correct socket/interface/form factor matches
- Your job: Find REAL incompatibilities AI can detect (thermal limits, quality mismatches, bottlenecks)

YOUR TASK:
1. Analyze EACH candidate product for compatibility with the current component
2. Filter out products that are:
   - Thermally inadequate (e.g., cooler TDP < CPU TDP)
   - Quality mismatched (e.g., flagship CPU + budget cooler)
   - Have known compatibility issues (e.g., specific motherboard + RAM incompatibilities)
   - Price tier mismatched (e.g., $50 cooler on $500 CPU is suspicious)

3. Return ONLY the IDs of truly compatible products

COMPATIBILITY RULES BY CATEGORY:
- CPU + Cooling: Cooler TDP ≥ CPU TDP; socket match; quality tier match
- CPU + Motherboard: Socket match; VRM adequate for CPU TDP; chipset features match use case
- CPU + RAM: Check if RAM speed supported by CPU memory controller
- Motherboard + RAM: Type match (DDR4/DDR5); speed within board specs; capacity within slots
- GPU + PSU: PSU wattage ≥ GPU TDP + 200W headroom; proper PCIe cables
- GPU + Case: GPU length < case max GPU length; proper clearance
- Storage + Motherboard: Interface match (M.2/SATA); form factor fits

🚨 CRITICAL: EXACT JSON FORMAT REQUIRED 🚨

Your response MUST be PURE JSON with NO markdown, NO explanations, NO code blocks.
The "compatible_products" field MUST be an array of NUMBERS ONLY (product IDs), NOT objects.

CORRECT FORMAT:
{
  "compatible_products": [101, 205, 308],
  "scores": {
    "101": 95,
    "205": 88,
    "308": 82
  },
  "reasons": {
    "101": "Perfect thermal match, same tier",
    "205": "Good match, adequate cooling",
    "308": "Compatible but budget tier mismatch"
  }
}

❌ WRONG - Do NOT return objects with names/chipsets:
{
  "compatible_products": [
    {"id": 101, "name": "...", "chipset": "..."},
    {"id": 205, "name": "..."}
  ]
}

✅ CORRECT - Just the numbers:
{
  "compatible_products": [101, 205, 308]
}

COMPATIBILITY RULES:
✅ Return 5-30 compatible product IDs (not all, not none)
✅ Score 70-100 (70=barely compatible, 100=perfect match)
✅ Reasons must be concise (max 60 chars)
❌ Do NOT include products with thermal/quality/tier issues
❌ Do NOT return ALL products (defeats filtering purpose)
❌ Do NOT return empty array unless truly nothing is compatible
❌ Do NOT return objects in compatible_products - ONLY numbers!

RESPOND NOW WITH PURE JSON (no markdown, no code blocks):`;

    return {
      system: systemPrompt,
      task: taskPrompt
    };
  }
}

module.exports = new PromptTemplates();

