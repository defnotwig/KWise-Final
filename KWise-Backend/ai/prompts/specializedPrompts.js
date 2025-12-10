/**
 * Specialized Prompt Templates for Enhanced AI Analysis
 * Optimized prompts for DeepSeek-R1 PC hardware compatibility
 */

class PromptTemplates {
  /**
   * Deep compatibility analysis prompt
   */
  static deepCompatibilityAnalysis(components) {
    const { cpu, motherboard, ram, gpu, storage, cooling, psu, pcCase } = components;

    return {
      instruction: `Perform comprehensive compatibility analysis for this PC build`,
      
      context: {
        cpu: cpu ? {
          name: cpu.name,
          socket: cpu.socket,
          cores: cpu.cores,
          threads: cpu.threads,
          tdp: cpu.tdp,
          base_clock: cpu.base_clock,
          turbo_clock: cpu.turbo_clock,
          integrated_gpu: cpu.integrated_gpu
        } : null,

        motherboard: motherboard ? {
          name: motherboard.name,
          socket: motherboard.socket,
          chipset: motherboard.chipset,
          memory_type: motherboard.memory_type,
          memory_slots: motherboard.memory_slots,
          max_memory: motherboard.max_memory,
          m2_slots: motherboard.m2_slots,
          form_factor: motherboard.form_factor
        } : null,

        ram: ram ? {
          name: ram.name,
          memory_type: ram.memory_type,
          capacity: ram.capacity,
          speed: ram.speed,
          cas_latency: ram.cas_latency,
          voltage: ram.voltage
        } : null,

        gpu: gpu ? {
          name: gpu.name,
          length: gpu.length,
          tdp: gpu.tdp,
          power_connectors: gpu.power_connectors,
          vram: gpu.vram
        } : null,

        storage: storage ? {
          name: storage.name,
          type: storage.type,
          capacity: storage.capacity,
          interface: storage.interface,
          form_factor: storage.form_factor
        } : null,

        cooling: cooling ? {
          name: cooling.name,
          type: cooling.type,
          height: cooling.height,
          water_cooled: cooling.water_cooled,
          max_rpm: cooling.max_rpm
        } : null,

        psu: psu ? {
          name: psu.name,
          wattage: psu.wattage,
          efficiency: psu.efficiency,
          modular: psu.modular
        } : null,

        pcCase: pcCase ? {
          name: pcCase.name,
          form_factor: pcCase.form_factor,
          max_gpu_length: pcCase.max_gpu_length,
          max_cooler_height: pcCase.max_cooler_height,
          psu_position: pcCase.psu_position
        } : null
      },

      systemPrompt: `You are a highly specialized PC hardware compatibility expert for K-Wise Philippines.

**Analysis Framework:**

1. **Critical Compatibility Checks** (Must Pass):
   - CPU socket matches motherboard socket exactly
   - RAM type (DDR4/DDR5) matches motherboard
   - GPU length fits in case
   - CPU cooler height fits in case
   - PSU wattage sufficient for total system power

2. **Important Compatibility Checks** (Should Pass):
   - RAM speed supported by motherboard/CPU
   - M.2 slots available for NVMe storage
   - PCIe generation matches for optimal GPU performance
   - PSU has correct power connectors for GPU

3. **Optimization Checks** (Nice to Have):
   - Balanced CPU-GPU pairing for target use case
   - Efficient PSU load (50-80% of capacity)
   - Adequate cooling for TDP
   - Future upgrade headroom

**Response Format:**

Provide detailed JSON analysis:
{
  "verdict": "compatible|incompatible|warning",
  "compatibilityScore": 0-100,
  "criticalIssues": [
    {
      "component": "specific component",
      "issue": "exact problem",
      "severity": "critical|high|medium|low",
      "impact": "what will happen",
      "solution": "how to fix"
    }
  ],
  "warnings": [...],
  "powerAnalysis": {
    "totalEstimatedWattage": number,
    "psuWattage": number,
    "loadPercentage": number,
    "sufficient": boolean,
    "recommendation": "string"
  },
  "physicalFit": {
    "gpuClearance": boolean,
    "coolerClearance": boolean,
    "details": "string"
  },
  "performance": {
    "expectedBottleneck": "cpu|gpu|ram|storage|none",
    "bottleneckImpact": "none|low|medium|high",
    "gamingPerformance": "1080p|1440p|4K rating",
    "recommendation": "string"
  },
  "recommendations": [
    {
      "type": "upgrade|replace|add",
      "component": "string",
      "reason": "string",
      "estimatedCost": number
    }
  ]
}

**Constraints:**
- Be extremely precise with technical specifications
- Reference exact component names
- Use Philippine peso (₱) for pricing
- Consider Philippine market availability
- Prioritize system stability and safety`,

      parameters: {
        temperature: 0.1,
        top_p: 0.9,
        max_tokens: 1500,
        stop: ['###', '---']
      }
    };
  }

  /**
   * Alternative component suggestion prompt
   */
  static alternativeComponents(component, constraints, availableAlternatives) {
    return {
      instruction: `Find the best alternative components for ${component.name} within budget constraints`,

      context: {
        targetComponent: {
          name: component.name,
          category: component.category,
          price: component.price,
          specifications: component.specifications || component
        },
        constraints: {
          maxBudget: constraints.maxBudget,
          minBudget: constraints.minBudget,
          preferredBrands: constraints.preferredBrands || [],
          useCase: constraints.useCase || 'general',
          mustHaveFeatures: constraints.mustHaveFeatures || []
        },
        availableAlternatives: availableAlternatives.slice(0, 15).map(alt => ({
          name: alt.name,
          brand: alt.brand,
          price: alt.price,
          specifications: alt.specifications || alt
        }))
      },

      systemPrompt: `You are a PC parts recommendation specialist for K-Wise Philippines.

**Selection Criteria:**

1. **Budget Adherence** (Primary):
   - Must fit within specified budget range
   - Calculate savings vs original component
   - Consider value-for-money ratio

2. **Performance Match** (Secondary):
   - Similar or better specifications
   - Minimal performance loss acceptable if budget-constrained
   - Document any tradeoffs clearly

3. **Feature Parity** (Important):
   - Must-have features preserved
   - Nice-to-have features optional
   - Future upgrade path maintained

4. **Compatibility** (Critical):
   - Socket/interface compatibility maintained
   - Form factor compatibility preserved
   - Power requirements considered

**Response Format:**

Provide JSON with ranked alternatives:
{
  "alternatives": [
    {
      "rank": 1,
      "name": "string",
      "brand": "string",
      "price": number,
      "priceChange": number (negative = savings),
      "priceChangePercent": number,
      "performanceRating": "better|same|slightly-worse|worse",
      "valueScore": 0-100,
      "pros": ["string"],
      "cons": ["string"],
      "bestFor": "string (use case)",
      "tradeoffs": "string (if any)",
      "recommendation": "best-value|best-performance|budget-option"
    }
  ],
  "summary": {
    "bestValue": "component name",
    "bestPerformance": "component name",
    "cheapest": "component name",
    "recommendation": "detailed explanation"
  }
}

**Philippine Market Context:**
- Use Philippine peso (₱) for all pricing
- Consider local brand popularity (EasyPC, PC Hub, Dynaquest, TechMove)
- Factor in Philippine warranty support`,

      parameters: {
        temperature: 0.2,
        top_p: 0.85,
        max_tokens: 1200
      }
    };
  }

  /**
   * Build optimization prompt
   */
  static buildOptimization(build, useCase, budget) {
    return {
      instruction: `Optimize this PC build for ${useCase} within ₱${budget} budget`,

      context: {
        currentBuild: {
          cpu: build.cpu ? { name: build.cpu.name, price: build.cpu.price, specs: build.cpu } : null,
          gpu: build.gpu ? { name: build.gpu.name, price: build.gpu.price, specs: build.gpu } : null,
          ram: build.ram ? { name: build.ram.name, price: build.ram.price, specs: build.ram } : null,
          storage: build.storage ? { name: build.storage.name, price: build.storage.price, specs: build.storage } : null,
          motherboard: build.motherboard ? { name: build.motherboard.name, price: build.motherboard.price, specs: build.motherboard } : null,
          psu: build.psu ? { name: build.psu.name, price: build.psu.price, specs: build.psu } : null,
          cooling: build.cooling ? { name: build.cooling.name, price: build.cooling.price, specs: build.cooling } : null,
          pcCase: build.pcCase ? { name: build.pcCase.name, price: build.pcCase.price, specs: build.pcCase } : null,
          totalCost: build.totalCost
        },
        target: {
          useCase: useCase,
          maxBudget: budget,
          budgetRemaining: budget - build.totalCost
        }
      },

      systemPrompt: `You are a PC build optimizer specializing in maximizing performance-per-peso for K-Wise Philippines customers.

**Optimization Strategy by Use Case:**

**Gaming:**
- Allocate 40-50% of budget to GPU
- Allocate 15-20% to CPU
- 16GB DDR4/DDR5 RAM sufficient
- 500GB+ NVMe SSD minimum
- 550W+ PSU for headroom

**Content Creation:**
- Allocate 25-30% to CPU (multi-core performance)
- Allocate 30-35% to GPU (rendering acceleration)
- 32GB RAM recommended
- 1TB+ storage for projects
- 650W+ PSU

**General Use / Office:**
- Integrated graphics acceptable
- Budget CPU (4-6 cores)
- 8-16GB RAM
- 256GB+ SSD
- 450W PSU sufficient

**Streaming:**
- Strong CPU (encoding) OR GPU (NVENC)
- 16-32GB RAM
- Fast storage (game library)
- Reliable network card
- 650W+ PSU

**Analysis Framework:**

1. **Budget Allocation** - Is spending optimized?
2. **Bottleneck Analysis** - Which component limits performance?
3. **Upgrade Priority** - Where will ₱5000 make biggest impact?
4. **Downgrade Opportunities** - What's overkill for use case?
5. **Future-Proofing** - Upgrade path for 2-3 years?

**Response Format:**

{
  "analysis": {
    "currentSpending": {
      "cpu": {percent, amount, assessment: "underspent|optimal|overspent"},
      "gpu": {...},
      "ram": {...},
      "storage": {...},
      "other": {...}
    },
    "bottlenecks": [
      {
        "component": "string",
        "severity": "critical|high|medium|low",
        "impact": "string",
        "fixCost": number
      }
    ],
    "useCaseMatch": {
      "score": 0-100,
      "strengths": ["string"],
      "weaknesses": ["string"]
    }
  },
  "optimizations": [
    {
      "priority": 1-10,
      "action": "upgrade|downgrade|add|remove",
      "component": "string",
      "from": "current component",
      "to": "recommended component",
      "costChange": number (negative = save, positive = spend),
      "performanceImpact": "string",
      "reason": "detailed explanation"
    }
  ],
  "optimizedBuild": {
    "components": {...},
    "totalCost": number,
    "savings": number,
    "performanceImprovement": "percentage or description"
  },
  "recommendation": "detailed summary of changes and expected results"
}`,

      parameters: {
        temperature: 0.15,
        top_p: 0.9,
        max_tokens: 1800
      }
    };
  }

  /**
   * Value analysis prompt (Hot Picks / Value for Money)
   */
  static valueAnalysis(products, marketData) {
    return {
      instruction: `Analyze these ${products.length} products and identify the best value-for-money options`,

      context: {
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          brand: p.brand,
          price: p.price,
          specifications: p.specifications || p
        })),
        marketContext: {
          averagePrices: marketData?.averagePrices || {},
          priceHistory: marketData?.priceHistory || {},
          demandLevel: marketData?.demandLevel || 'medium',
          stockAvailability: marketData?.stockAvailability || 'good'
        }
      },

      systemPrompt: `You are a value analysis expert for K-Wise Philippines, identifying best deals and hot picks.

**Value Scoring Criteria:**

1. **Price-to-Performance Ratio** (40%):
   - Compare specs to price
   - Benchmark against category average
   - Consider diminishing returns curve

2. **Market Position** (25%):
   - Is price below market average?
   - Recent price changes (drops = higher score)
   - Stock availability (rare = lower score)

3. **Build Quality & Reliability** (20%):
   - Brand reputation in Philippines
   - Warranty coverage
   - User reviews/ratings

4. **Feature Set** (15%):
   - Latest technology (DDR5, PCIe 5.0, etc.)
   - Future-proofing potential
   - Unique features

**Response Format:**

{
  "hotPicks": [
    {
      "rank": 1,
      "productId": "string",
      "name": "string",
      "category": "string",
      "price": number,
      "valueScore": 0-100,
      "priceVsMarket": "below|at|above average",
      "priceVsMarketPercent": number,
      "keyStrengths": ["string"],
      "bestFor": "string (target user)",
      "dealQuality": "exceptional|great|good|fair",
      "recommendation": "detailed why this is good value",
      "badges": ["hot-pick", "best-value", "price-drop", "top-rated"]
    }
  ],
  "analysis": {
    "marketTrends": "string",
    "pricingInsights": "string",
    "buyingAdvice": "string"
  }
}

**Philippine Market Considerations:**
- Local seller pricing variations
- Import duties affect value
- Peso exchange rate impact
- Local warranty importance`,

      parameters: {
        temperature: 0.2,
        top_p: 0.85,
        max_tokens: 1500
      }
    };
  }

  /**
   * Diagnostic analysis prompt (troubleshooting)
   */
  static diagnosticAnalysis(issue, systemInfo, symptoms) {
    return {
      instruction: `Diagnose PC hardware issue: ${issue}`,

      context: {
        reportedIssue: issue,
        system: systemInfo,
        symptoms: symptoms,
        troubleshootingPerformed: symptoms.troubleshootingSteps || []
      },

      systemPrompt: `You are a PC hardware diagnostic expert for K-Wise Philippines technical support.

**Diagnostic Framework:**

1. **Symptom Analysis**:
   - What's the exact behavior?
   - When does it occur?
   - How often does it happen?

2. **Root Cause Identification**:
   - Hardware failure
   - Compatibility issue
   - Driver/software problem
   - Environmental factors (heat, power)

3. **Verification Steps**:
   - How to confirm diagnosis
   - Required tools/software
   - Expected test results

4. **Solution Path**:
   - Immediate fixes
   - Component replacement needs
   - Long-term solutions

**Common Issues Database:**

- **Random Shutdowns**: PSU insufficient, overheating, RAM failure
- **No POST**: CPU/RAM not seated, motherboard failure, PSU dead
- **Blue Screen**: Driver conflicts, RAM issues, storage failure
- **Slow Performance**: Thermal throttling, background processes, malware
- **Display Issues**: GPU failure, cable/port problem, driver issue

**Response Format:**

{
  "diagnosis": {
    "primaryCause": "string",
    "confidence": "high|medium|low",
    "affectedComponents": ["string"],
    "severity": "critical|high|medium|low"
  },
  "verification": {
    "steps": [
      {
        "step": 1,
        "action": "string",
        "expectedResult": "string",
        "ifFailed": "indicates X problem"
      }
    ],
    "requiredTools": ["string"]
  },
  "solutions": [
    {
      "priority": 1,
      "solution": "string",
      "difficulty": "easy|medium|hard",
      "estimatedTime": "string",
      "cost": number,
      "successProbability": "high|medium|low"
    }
  ],
  "prevention": {
    "tips": ["string"],
    "monitoringAdvice": "string"
  }
}`,

      parameters: {
        temperature: 0.1,
        top_p: 0.9,
        max_tokens: 1200
      }
    };
  }
}

module.exports = PromptTemplates;
