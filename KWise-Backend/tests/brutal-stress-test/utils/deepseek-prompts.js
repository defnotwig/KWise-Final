/**
 * DEEPSEEK-R1 AI VALIDATION PROMPTS
 * Specialized prompts for brutal compatibility testing
 */

const DeepSeekPrompts = {
    /**
     * TEST 1.1: Initial CPU Selection - Socket Compatibility
     */
    validateCpuSelection(cpu, availableMotherboards, availableCoolers, availableRam, availablePsu) {
        return `You are a PC hardware compatibility expert performing BRUTAL validation. Zero tolerance for errors.

SELECTED COMPONENT:
CPU: ${cpu.name}
- Socket: ${cpu.socket}
- TDP: ${cpu.tdp}W
- Memory Controller: ${cpu.memory_controller}
- Chipset Support: ${cpu.supported_chipsets || 'Standard for socket'}

VALIDATION TASK:
Analyze these motherboards and determine which are TRULY compatible. Flag ANY incompatibility.

AVAILABLE MOTHERBOARDS:
${availableMotherboards.map((mb, idx) => `
${idx + 1}. ${mb.name}
   - Socket: ${mb.socket}
   - Chipset: ${mb.chipset}
   - Memory Type: ${mb.memory_type}
   - Form Factor: ${mb.form_factor}
   - VRM Phases: ${mb.vrm_phases || 'Unknown'}
`).join('')}

CRITICAL VALIDATION RULES (ZERO TOLERANCE):
1. Socket MUST match exactly (${cpu.socket} ONLY)
2. Chipset MUST support CPU generation
3. VRM MUST handle CPU TDP (min ${Math.ceil(cpu.tdp / 10)} phases recommended)
4. Memory type MUST match CPU controller

TRAP DETECTION:
- ❌ TRAP 1: AMD motherboard for Intel CPU
- ❌ TRAP 2: Wrong socket generation (LGA1200 vs LGA1700)
- ❌ TRAP 3: DDR4 motherboard when CPU requires DDR5

Respond in JSON format:
{
  "compatible_motherboards": [1, 3, 5],
  "incompatible": {
    "2": "Socket mismatch: AM4 vs LGA1700 - CATASTROPHIC",
    "4": "DDR4 only, CPU requires DDR5 - CRITICAL"
  },
  "warnings": {
    "1": "VRM phases marginal for sustained load"
  },
  "validation_confidence": 98
}

RESPOND ONLY WITH JSON. NO EXPLANATIONS OUTSIDE JSON.`;
    },

    /**
     * TEST 1.2: Motherboard + CPU - RAM Filtering
     */
    validateRamCompatibility(cpu, motherboard, availableRam) {
        return `BRUTAL COMPATIBILITY CHECK: RAM Validation

EXISTING BUILD:
CPU: ${cpu.name} (${cpu.memory_controller} controller)
Motherboard: ${motherboard.name} (${motherboard.memory_type} support, ${motherboard.max_memory || '128GB'} max)

AVAILABLE RAM MODULES:
${availableRam.map((ram, idx) => `
${idx + 1}. ${ram.name}
   - Type: ${ram.memory_type}
   - Speed: ${ram.speed}MHz
   - Capacity: ${ram.capacity}
   - Kit: ${ram.kit_config || '2x8GB'}
`).join('')}

CRITICAL RULES:
1. Memory type MUST match motherboard EXACTLY
2. DDR4 and DDR5 are NEVER interchangeable
3. Speed must be supported by BOTH CPU and motherboard
4. Total capacity must not exceed motherboard maximum

TRAP DETECTION:
- ❌ TRAP 6: DDR4 RAM showing for DDR5 motherboard
- ❌ TRAP 15: Capacity exceeding board maximum
- ❌ TRAP 48: DDR4 module for DDR5-only system

Respond in JSON:
{
  "compatible_ram": [1, 3, 4],
  "incompatible": {
    "2": "DDR4 incompatible with DDR5 motherboard - CATASTROPHIC",
    "5": "128GB exceeds 64GB board maximum - CRITICAL"
  },
  "scores": {
    "1": 100,
    "3": 95,
    "4": 92
  },
  "validation_confidence": 100
}`;
    },

    /**
     * TEST 1.3: GPU Physical Clearance + Power Budget
     */
    validateGpuCompatibility(build, availableGpus, availableCases, availablePsus) {
        return `BRUTAL GPU COMPATIBILITY VALIDATION

CURRENT BUILD:
CPU: ${build.cpu.name} (${build.cpu.tdp}W TDP)
Motherboard: ${build.motherboard.name} (${build.motherboard.pcie_slots || 'PCIe 4.0 x16'})
${build.case ? `Case: ${build.case.name} (${build.case.max_gpu_length}mm GPU clearance)` : 'Case: NOT SELECTED YET'}

AVAILABLE GPUS:
${availableGpus.map((gpu, idx) => `
${idx + 1}. ${gpu.name}
   - Length: ${gpu.length}mm
   - Width: ${gpu.width}mm (${Math.ceil(gpu.width / 20)}-slot)
   - TDP: ${gpu.tdp}W
   - Power: ${gpu.power_connector}
`).join('')}

VALIDATION REQUIREMENTS:
1. Physical Clearance: GPU length ${build.case ? `< ${build.case.max_gpu_length}mm` : 'unknown until case selected'}
2. Power Budget: CPU (${build.cpu.tdp}W) + GPU (XW) + System (150W) = Total
3. Recommended PSU: Total × 1.15 (efficiency loss)
4. PCIe slot validation
5. CPU tier matching (prevent bottlenecks)

CRITICAL POWER CALCULATION:
${availableGpus.map((gpu, idx) => {
    const totalPower = build.cpu.tdp + gpu.tdp + 150;
    const recommended = Math.ceil(totalPower * 1.15 / 50) * 50;
    return `GPU ${idx + 1}: ${totalPower}W total → ${recommended}W PSU minimum`;
}).join('\n')}

TRAP DETECTION:
- ❌ TRAP 10: Case with insufficient clearance
- ❌ TRAP 11: Undersized PSU (<750W for 600W+ load)
- ❌ TRAP 56: Power calculation excludes GPU

Respond in JSON:
{
  "compatible_gpus": [1, 3],
  "physical_conflicts": {
    "2": "336mm GPU exceeds 315mm case limit - CATASTROPHIC"
  },
  "power_requirements": {
    "1": { "total_watts": 650, "recommended_psu": 850, "status": "adequate" },
    "2": { "total_watts": 850, "recommended_psu": 1000, "status": "upgrade_required" }
  },
  "bottleneck_analysis": {
    "1": { "cpu_bottleneck": 5, "severity": "minor", "resolution": "1440p" },
    "3": { "cpu_bottleneck": 25, "severity": "severe", "resolution": "1080p" }
  },
  "validation_confidence": 95
}`;
    },

    /**
     * TEST 1.5: Full Build 28-Pair Validation
     */
    validateFullBuild(components) {
        const buildSummary = `
CPU: ${components.cpu?.name || 'None'} (${components.cpu?.socket || 'N/A'}, ${components.cpu?.tdp || 0}W)
Cooler: ${components.cooler?.name || 'None'} (${components.cooler?.tdp_rating || 0}W rated)
Motherboard: ${components.motherboard?.name || 'None'} (${components.motherboard?.socket || 'N/A'}, ${components.motherboard?.memory_type || 'N/A'})
RAM: ${components.ram?.name || 'None'} (${components.ram?.memory_type || 'N/A'}, ${components.ram?.capacity || 0})
Storage: ${components.storage?.name || 'None'} (${components.storage?.interface || 'N/A'})
GPU: ${components.gpu?.name || 'None'} (${components.gpu?.length || 0}mm, ${components.gpu?.tdp || 0}W)
Case: ${components.case?.name || 'None'} (${components.case?.form_factor || 'N/A'}, ${components.case?.max_gpu_length || 0}mm GPU)
PSU: ${components.psu?.name || 'None'} (${components.psu?.wattage || 0}W, ${components.psu?.efficiency || 'N/A'})
`;

        return `COMPREHENSIVE 28-PAIR COMPATIBILITY VALIDATION

BUILD CONFIGURATION:
${buildSummary}

YOUR TASK:
Perform exhaustive validation of ALL 28 component pairs as specified in PCPartPicker-level analysis.

28 COMPONENT PAIRS TO VALIDATE:
1. CPU ↔ Motherboard (socket, chipset, VRM)
2. CPU ↔ Cooler (socket mount, TDP adequacy)
3. CPU ↔ RAM (memory controller type, speed support)
4. CPU ↔ GPU (tier matching, bottleneck analysis)
5. CPU ↔ PSU (power allocation)
6. Motherboard ↔ RAM (type, slots, capacity, speed)
7. Motherboard ↔ Storage (M.2 slots, SATA ports)
8. Motherboard ↔ GPU (PCIe lanes, slot availability)
9. Motherboard ↔ Case (form factor, I/O shield)
10. Motherboard ↔ PSU (power connectors: 24-pin, EPS)
11. Motherboard ↔ Cooler (mounting holes, headers)
12. RAM ↔ Cooler (height clearance)
13. RAM ↔ Case (no air cooler conflict)
14. Storage ↔ Case (drive bays, M.2 mounts)
15. Storage ↔ PSU (SATA power)
16. GPU ↔ Case (length, width, height clearance)
17. GPU ↔ PSU (wattage, power connectors)
18. GPU ↔ Cooler (airflow configuration)
19. GPU ↔ Motherboard (slot position, power delivery)
20. Case ↔ Cooler (radiator mounts, height)
21. Case ↔ PSU (form factor, cable routing)
22. Case ↔ Fans (mounting points)
23. PSU ↔ Cooler (power delivery)
24. PSU ↔ Case (mounting, length)
25. PSU ↔ All Components (total wattage)
26. RAM ↔ Storage (no conflicts)
27. Cooler ↔ Storage (no physical conflicts)
28. Case ↔ RAM (standard DIMM fit)

6-LAYER COMPATIBILITY ANALYSIS:
✓ Layer 1 - Interface Matching: Sockets, connectors, physical interfaces
✓ Layer 2 - Power Delivery: Total system power, PSU adequacy, efficiency
✓ Layer 3 - Physical Dimensions: Clearances, fitment, form factors
✓ Layer 4 - Thermal Design: Cooling adequacy, airflow, temperatures
✓ Layer 5 - Feature Compatibility: XMP/EXPO, RGB sync, BIOS versions
✓ Layer 6 - Known Issues: Database check for reported problems

CRITICAL TRAP DETECTION:
- ❌ TRAP 67: Introduce incompatibility at final step
- ❌ TRAP 70: Compatibility score >80% despite clear problem

Respond in JSON:
{
  "compatibility_score": 98,
  "layer_results": {
    "layer_1_interface": { "passed": 28, "failed": 0, "issues": [] },
    "layer_2_power": { "passed": 26, "failed": 0, "warnings": ["PSU at 75% load"] },
    "layer_3_physical": { "passed": 28, "failed": 0, "issues": [] },
    "layer_4_thermal": { "passed": 27, "failed": 0, "warnings": ["Cooler TDP marginal"] },
    "layer_5_features": { "passed": 25, "failed": 0, "notes": ["BIOS update recommended"] },
    "layer_6_known_issues": { "passed": 28, "failed": 0, "issues": [] }
  },
  "pairwise_results": {
    "cpu_motherboard": { "compatible": true, "score": 100 },
    "cpu_cooler": { "compatible": true, "score": 95, "warning": "TDP rating 90%" },
    "gpu_case": { "compatible": true, "score": 92, "note": "20mm clearance" }
  },
  "problems": [],
  "warnings": [
    "A. BIOS Update Recommended: Motherboard may ship with older BIOS. Update before installation.",
    "B. Cooler TDP Marginal: 240W rated vs 253W CPU. Expect 85-90°C under load."
  ],
  "notes": [
    "C. Optimal Fan Configuration: Top exhaust, front intake recommended.",
    "D. Cable Management: Route 8-pin CPU cable before motherboard installation."
  ],
  "validation_confidence": 98,
  "execution_time_ms": 250
}`;
    },

    /**
     * TEST 5.1: AI Build Generation - Budget-Constrained
     */
    validateAIBuildGeneration(requirements) {
        return `AI BUILD GENERATION - BUDGET-CONSTRAINED OPTIMIZATION

USER REQUIREMENTS:
- Use Case: ${requirements.useCase || 'Gaming'}
- Budget: ₱${requirements.budget} (${requirements.tier} Tier)
- Preference: ${requirements.preference || 'Balanced'}
- Gaming Type: ${requirements.gamingType || 'AAA Games'}

YOUR TASK:
Generate an optimal PC build within budget constraints with ZERO incompatibilities.

BUDGET ALLOCATION STRATEGY:
- GPU: 35-40% (₱${Math.round(requirements.budget * 0.35)}-₱${Math.round(requirements.budget * 0.40)})
- CPU: 25-30% (₱${Math.round(requirements.budget * 0.25)}-₱${Math.round(requirements.budget * 0.30)})
- Motherboard: 12% (₱${Math.round(requirements.budget * 0.12)})
- RAM: 8% (₱${Math.round(requirements.budget * 0.08)})
- Storage: 6% (₱${Math.round(requirements.budget * 0.06)})
- PSU: 5% (₱${Math.round(requirements.budget * 0.05)})
- Case: 4% (₱${Math.round(requirements.budget * 0.04)})

CRITICAL REQUIREMENTS:
✓ Total cost MUST be within ₱${requirements.budget * 0.97}-₱${requirements.budget * 1.03} (±3% tolerance)
✓ ALL components must be in stock
✓ ZERO incompatibilities (100% compatibility score)
✓ Performance target: 1080p AAA gaming 60+ FPS high settings
✓ Apply 3200 compatibility rules during selection
✓ Bottleneck analysis: CPU-GPU tier matching (±1 tier acceptable)

TRAP DETECTION:
- ❌ TRAP 71: Build over budget (>₱${requirements.budget * 1.03})
- ❌ TRAP 72: Tier mismatch (RTX 4090 + Celeron)
- ❌ TRAP 73: Out-of-stock items
- ❌ TRAP 74: Incompatible components

Respond in JSON:
{
  "build": {
    "cpu": { "name": "AMD Ryzen 5 7600X", "price": 18500, "reason": "Excellent 1080p performance" },
    "gpu": { "name": "AMD RX 7700 XT", "price": 26200, "reason": "Best value in budget" },
    "motherboard": { "name": "ASUS TUF B650-PLUS", "price": 8200, "reason": "Solid VRM" },
    "ram": { "name": "Kingston FURY DDR5-6000 16GB", "price": 5400, "reason": "Fast DDR5" },
    "storage": { "name": "WD Black SN770 1TB", "price": 4100, "reason": "PCIe 4.0 NVMe" },
    "psu": { "name": "Corsair CV650", "price": 3200, "reason": "Adequate wattage" },
    "case": { "name": "Tecware Forge M2", "price": 2850, "reason": "Good airflow" }
  },
  "total_cost": 68450,
  "budget_fit": "within_tolerance",
  "compatibility_score": 98,
  "performance_expectations": {
    "1080p_ultra": "90-120 FPS",
    "1440p_high": "60-80 FPS"
  },
  "budget_breakdown": {
    "gpu_percent": 38,
    "cpu_percent": 27,
    "other_percent": 35
  },
  "validation_confidence": 95
}`;
    },

    /**
     * TEST 6.2: Upgrade Component Filtering
     */
    validateUpgradeCompatibility(existingBuild, upgradeCategory, availableUpgrades) {
        return `UPGRADE COMPATIBILITY VALIDATION

EXISTING BUILD:
${Object.entries(existingBuild).map(([key, component]) => 
    `${key.toUpperCase()}: ${component.name} (${component.year || '2020'})`
).join('\n')}

UPGRADE TARGET: ${upgradeCategory}

AVAILABLE UPGRADES:
${availableUpgrades.map((item, idx) => `
${idx + 1}. ${item.name}
   - Price: ₱${item.price}
   - TDP: ${item.tdp || item.wattage || 'N/A'}W
   - Performance Tier: ${item.tier || 'Unknown'}
`).join('')}

VALIDATION REQUIREMENTS:
1. Socket/Interface Compatibility with existing components
2. PSU wattage sufficiency (existing: ${existingBuild.psu?.wattage || 550}W)
3. CPU bottleneck analysis (existing: ${existingBuild.cpu?.name || 'Ryzen 5 3600'})
4. Physical clearance (case: ${existingBuild.case?.max_gpu_length || 320}mm GPU max)
5. Power budget: Existing system + new component

TRAP DETECTION:
- ❌ TRAP 94: Shows RTX 4090 without PSU/bottleneck warnings
- ❌ TRAP 96: PSU inadequacy hidden
- ❌ TRAP 97: Wrong performance uplift calculation

Respond in JSON:
{
  "compatible_upgrades": [1, 3, 5],
  "tier_recommendations": {
    "1": { "tier": "optimal", "bottleneck": "none", "psu": "adequate" },
    "2": { "tier": "acceptable", "bottleneck": "minor_10%", "psu": "upgrade_recommended" },
    "4": { "tier": "wasteful", "bottleneck": "severe_30%", "psu": "critical_upgrade" }
  },
  "performance_uplift": {
    "1": "+85% avg FPS vs current",
    "3": "+90% avg FPS vs current"
  },
  "warnings": {
    "2": "PSU at 85% load, recommend 650W+ upgrade",
    "4": "CPU will bottleneck, 30% of GPU performance wasted"
  },
  "validation_confidence": 92
}`;
    },

    /**
     * Generic Compatibility Analysis Prompt
     */
    analyzeCompatibility(component1, component2, context = {}) {
        return `PAIRWISE COMPATIBILITY ANALYSIS

COMPONENT A: ${component1.name} (${component1.category})
Specifications: ${JSON.stringify(component1.specifications || {})}

COMPONENT B: ${component2.name} (${component2.category})
Specifications: ${JSON.stringify(component2.specifications || {})}

CONTEXT: ${JSON.stringify(context)}

ANALYSIS REQUIREMENTS:
1. Socket/Interface matching
2. Power compatibility
3. Physical clearance
4. Feature support
5. Performance tier balance

Respond in JSON:
{
  "compatible": true/false,
  "score": 0-100,
  "issues": ["list of problems"],
  "warnings": ["list of warnings"],
  "confidence": 0-100
}`;
    }
};

module.exports = DeepSeekPrompts;

