# K-WISE BRUTAL STRESS TEST REPORT

**Date:** 11/20/2025, 3:41:05 AM
**Rating:** 0/5.0 🔴 CATASTROPHIC_FAILURE
**Duration:** 60.2s

## Executive Summary

- **Total Trap Tests:** 15
- **Passed:** 14 (93.3%)
- **Failed:** 1
- **Catastrophic Failures:** 1
- **Critical Failures:** 0

## Test Sections

### Section 1: PC-Parts Page (Filtered Selection)

- Traps: 14/15 passed (93.3%)

#### Test 1.2

❌ **Trap 6:** DDR4 RAM still showing for DDR5 motherboard - CRITICAL FAIL
   - Details: AI validation failed
✅ **Trap 7:** Micro-ATX case highlighted for ATX motherboard - FAIL
✅ **Trap 8:** SATA-only SSD prioritized over NVMe - FAIL
✅ **Trap 9:** AM5 cooler mounting kit should NEVER show for LGA1700

#### Test 1.3

✅ **Trap 10:** NZXT H510 (315mm clearance) showing for 336mm GPU - FAIL
✅ **Trap 11:** 750W PSU highlighted without warning - should show YELLOW
✅ **Trap 12:** PCIe 3.0 x16 board slips through for PCIe 4.0 GPU - FAIL
✅ **Trap 13:** Pairing RTX 4090 with i3-12100F (severe bottleneck) - should WARN

#### Test 1.4

✅ **Trap 14:** DDR5-7200 showing on H770 board (limited OC) - should WARN
✅ **Trap 15:** 4x32GB (128GB) on board with 64GB maximum - FAIL
✅ **Trap 16:** 52mm tall RAM with NH-D15 air cooler (clearance issue) - FAIL

#### Test 1.5

✅ **Trap 17:** Inject incompatible component after validation - should re-check
✅ **Trap 18:** Component at exact edge of compatibility - should WARN
✅ **Trap 19:** Front-mounted AIO with limited radiator clearance - FAIL
✅ **Trap 20:** Modular PSU missing required GPU cables - FAIL

## Performance Metrics

- Average Duration: 0ms
- Meets Target: 3/3
- Meets Max: 3/3

## Configuration

```json
{
  "ai": {
    "model": "deepseek-r1:1.5b",
    "ollamaUrl": "http://localhost:11434/api/generate",
    "temperature": 0.1,
    "max_tokens": 4000,
    "timeout": 30000,
    "retries": 3
  },
  "performance": {
    "singleComponentFilter": {
      "target": 50,
      "max": 100,
      "description": "Single component filter response"
    },
    "twoComponentChained": {
      "target": 100,
      "max": 150,
      "description": "2-component chained filter"
    },
    "fourComponentChained": {
      "target": 200,
      "max": 300,
      "description": "4-component chained filter"
    },
    "fullValidation": {
      "target": 700,
      "max": 1000,
      "description": "Full 8-component validation"
    },
    "productPageCompatibility": {
      "target": 250,
      "max": 400,
      "description": "Product page compatibility (50 items)"
    },
    "orderSummary": {
      "target": 800,
      "max": 1000,
      "description": "Order summary generation"
    },
    "aiBuildGeneration": {
      "target": 2000,
      "max": 3000,
      "description": "AI build generation"
    },
    "futureUpgradeSuggestions": {
      "target": 1800,
      "max": 2500,
      "description": "Future upgrade suggestions (3 items)"
    }
  },
  "load": {
    "concurrentUsers": 50,
    "testDuration": 60000,
    "rampUpTime": 10000,
    "acceptableDegradation": 0.2,
    "targetErrorRate": 0.001
  },
  "scoring": {
    "perfect": {
      "min": 95,
      "max": 100
    },
    "excellent": {
      "min": 90,
      "max": 94
    },
    "good": {
      "min": 80,
      "max": 89
    },
    "acceptable": {
      "min": 70,
      "max": 79
    },
    "poor": {
      "min": 0,
      "max": 69
    }
  },
  "budget": {
    "tolerance": 0.03,
    "tiers": {
      "bronze": {
        "min": 10000,
        "max": 25000
      },
      "silver": {
        "min": 25001,
        "max": 50000
      },
      "gold": {
        "min": 51000,
        "max": 75000
      },
      "platinum": {
        "min": 75001,
        "max": 100000
      },
      "diamond": {
        "min": 100001,
        "max": 999999
      }
    }
  },
  "trapComponents": {
    "amdMotherboard": {
      "id": "TRAP_001",
      "name": "ASUS ROG STRIX B550-F",
      "category": "Motherboard",
      "socket": "AM4",
      "chipset": "B550",
      "memory_type": "DDR4",
      "form_factor": "ATX"
    },
    "oldIntelBoard": {
      "id": "TRAP_002",
      "name": "MSI MAG Z490 TOMAHAWK",
      "category": "Motherboard",
      "socket": "LGA1200",
      "chipset": "Z490",
      "memory_type": "DDR4",
      "form_factor": "ATX"
    },
    "ddr4OnlyBoard": {
      "id": "TRAP_003",
      "name": "GIGABYTE B660M DS3H",
      "category": "Motherboard",
      "socket": "LGA1700",
      "chipset": "B660",
      "memory_type": "DDR4",
      "form_factor": "Micro-ATX"
    },
    "lowWattPsu": {
      "id": "TRAP_004",
      "name": "Corsair CV500",
      "category": "PSU",
      "wattage": 500,
      "efficiency": "80+ Bronze"
    },
    "lowProfileCooler": {
      "id": "TRAP_005",
      "name": "Intel Stock Cooler",
      "category": "Cooler",
      "tdp_rating": 65,
      "compatible_sockets": "LGA1700",
      "height": 45
    }
  },
  "testCPUs": {
    "intelI9_14900K": {
      "id": "TEST_CPU_001",
      "name": "Intel Core i9-14900K",
      "category": "CPU",
      "socket": "LGA1700",
      "tdp": 253,
      "memory_controller": "DDR5",
      "tier": "elite"
    },
    "amdRyzen9_7950X": {
      "id": "TEST_CPU_002",
      "name": "AMD Ryzen 9 7950X",
      "category": "CPU",
      "socket": "AM5",
      "tdp": 170,
      "boost_tdp": 230,
      "memory_controller": "DDR5",
      "tier": "elite"
    },
    "amdRyzen5_3600": {
      "id": "TEST_CPU_003",
      "name": "AMD Ryzen 5 3600",
      "category": "CPU",
      "socket": "AM4",
      "tdp": 95,
      "memory_controller": "DDR4",
      "tier": "mid-tier"
    }
  },
  "testGPUs": {
    "rtx4090": {
      "id": "TEST_GPU_001",
      "name": "NVIDIA RTX 4090",
      "category": "GPU",
      "length": 336,
      "width": 61,
      "height": 137,
      "tdp": 450,
      "power_connector": "12VHPWR",
      "tier": "elite"
    },
    "rtx4070": {
      "id": "TEST_GPU_002",
      "name": "NVIDIA RTX 4070",
      "category": "GPU",
      "length": 304,
      "width": 61,
      "height": 137,
      "tdp": 200,
      "power_connector": "8pin",
      "tier": "high-tier"
    }
  },
  "severity": {
    "CATASTROPHIC": {
      "level": 0,
      "description": "Immediate test failure - incompatible shown as compatible",
      "action": "ABORT_ALL_TESTS"
    },
    "CRITICAL": {
      "level": 1,
      "description": "Major issue - missing validation or wrong calculation",
      "action": "MARK_FAILED"
    },
    "STANDARD": {
      "level": 2,
      "description": "Standard failure - must fix but not blocking",
      "action": "MARK_WARNING"
    },
    "MINOR": {
      "level": 3,
      "description": "Minor issue - should fix for best experience",
      "action": "MARK_NOTICE"
    }
  },
  "reporting": {
    "outputDir": "./tests/brutal-stress-test/results",
    "generateMarkdown": true,
    "generateJson": true,
    "generateSummary": true,
    "includeAILogs": true,
    "screenshotFailures": false,
    "verboseMode": true
  },
  "database": {
    "rulesCount": 3200,
    "minRulesRequired": 3000,
    "componentPairs": 28
  }
}
```
