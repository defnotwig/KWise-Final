/**
 * BRUTAL STRESS TEST CONFIGURATION
 * Zero-tolerance testing for K-Wise compatibility system
 */

module.exports = {
    // AI Model Configuration
    ai: {
        model: 'deepseek-r1:1.5b', // Use 1.5B for speed
        ollamaUrl: 'http://localhost:11434/api/generate',
        temperature: 0.1, // Very low for deterministic analysis
        max_tokens: 4000, // Enough for reasoning model
        timeout: 60000, // 60 second timeout (increased for complex validations)
        retries: 2,
        optional: true // AI validation is secondary, not primary
    },

    // Performance Thresholds (milliseconds)
    performance: {
        singleComponentFilter: {
            target: 50,
            max: 100,
            description: 'Single component filter response'
        },
        twoComponentChained: {
            target: 100,
            max: 150,
            description: '2-component chained filter'
        },
        fourComponentChained: {
            target: 200,
            max: 300,
            description: '4-component chained filter'
        },
        fullValidation: {
            target: 700,
            max: 1000,
            description: 'Full 8-component validation'
        },
        productPageCompatibility: {
            target: 250,
            max: 400,
            description: 'Product page compatibility (50 items)'
        },
        orderSummary: {
            target: 800,
            max: 1000,
            description: 'Order summary generation'
        },
        aiBuildGeneration: {
            target: 2000,
            max: 3000,
            description: 'AI build generation'
        },
        futureUpgradeSuggestions: {
            target: 1800,
            max: 2500,
            description: 'Future upgrade suggestions (3 items)'
        }
    },

    // Concurrent Load Testing
    load: {
        concurrentUsers: 50,
        testDuration: 60000, // 60 seconds
        rampUpTime: 10000, // 10 seconds
        acceptableDegradation: 0.20, // 20% max response time increase
        targetErrorRate: 0.001 // 0.1% max error rate
    },

    // Compatibility Scoring
    scoring: {
        perfect: { min: 95, max: 100 },
        excellent: { min: 90, max: 94 },
        good: { min: 80, max: 89 },
        acceptable: { min: 70, max: 79 },
        poor: { min: 0, max: 69 }
    },

    // Budget Tolerances
    budget: {
        tolerance: 0.03, // ±3% acceptable
        tiers: {
            bronze: { min: 10000, max: 25000 },
            silver: { min: 25001, max: 50000 },
            gold: { min: 51000, max: 75000 },
            platinum: { min: 75001, max: 100000 },
            diamond: { min: 100001, max: 999999 }
        }
    },

    // Test Component Database
    // These are intentionally incompatible components for trap testing
    trapComponents: {
        // Trap 1: AMD motherboard for Intel CPU
        amdMotherboard: {
            id: 'TRAP_001',
            name: 'ASUS ROG STRIX B550-F',
            category: 'Motherboard',
            socket: 'AM4',
            chipset: 'B550',
            memory_type: 'DDR4',
            form_factor: 'ATX'
        },
        // Trap 2: LGA1200 board for LGA1700 CPU
        oldIntelBoard: {
            id: 'TRAP_002',
            name: 'MSI MAG Z490 TOMAHAWK',
            category: 'Motherboard',
            socket: 'LGA1200',
            chipset: 'Z490',
            memory_type: 'DDR4',
            form_factor: 'ATX'
        },
        // Trap 3: DDR4-only motherboard
        ddr4OnlyBoard: {
            id: 'TRAP_003',
            name: 'GIGABYTE B660M DS3H',
            category: 'Motherboard',
            socket: 'LGA1700',
            chipset: 'B660',
            memory_type: 'DDR4',
            form_factor: 'Micro-ATX'
        },
        // Trap 4: 500W PSU for high-end build
        lowWattPsu: {
            id: 'TRAP_004',
            name: 'Corsair CV500',
            category: 'PSU',
            wattage: 500,
            efficiency: '80+ Bronze'
        },
        // Trap 5: Low-profile cooler for high TDP CPU
        lowProfileCooler: {
            id: 'TRAP_005',
            name: 'Intel Stock Cooler',
            category: 'Cooler',
            tdp_rating: 65,
            compatible_sockets: 'LGA1700',
            height: 45
        },
        // More traps continue...
    },

    // Test CPUs
    testCPUs: {
        intelI9_14900K: {
            id: 'TEST_CPU_001',
            name: 'Intel Core i9-14900K',
            category: 'CPU',
            socket: 'LGA1700',
            tdp: 253,
            memory_controller: 'DDR5',
            tier: 'elite'
        },
        amdRyzen9_7950X: {
            id: 'TEST_CPU_002',
            name: 'AMD Ryzen 9 7950X',
            category: 'CPU',
            socket: 'AM5',
            tdp: 170,
            boost_tdp: 230,
            memory_controller: 'DDR5',
            tier: 'elite'
        },
        amdRyzen5_3600: {
            id: 'TEST_CPU_003',
            name: 'AMD Ryzen 5 3600',
            category: 'CPU',
            socket: 'AM4',
            tdp: 95,
            memory_controller: 'DDR4',
            tier: 'mid-tier'
        }
    },

    // Test GPUs
    testGPUs: {
        rtx4090: {
            id: 'TEST_GPU_001',
            name: 'NVIDIA RTX 4090',
            category: 'GPU',
            length: 336,
            width: 61,
            height: 137,
            tdp: 450,
            power_connector: '12VHPWR',
            tier: 'elite'
        },
        rtx4070: {
            id: 'TEST_GPU_002',
            name: 'NVIDIA RTX 4070',
            category: 'GPU',
            length: 304,
            width: 61,
            height: 137,
            tdp: 200,
            power_connector: '8pin',
            tier: 'high-tier'
        }
    },

    // Failure Severity Levels
    severity: {
        CATASTROPHIC: {
            level: 0,
            description: 'Immediate test failure - incompatible shown as compatible',
            action: 'ABORT_ALL_TESTS'
        },
        CRITICAL: {
            level: 1,
            description: 'Major issue - missing validation or wrong calculation',
            action: 'MARK_FAILED'
        },
        STANDARD: {
            level: 2,
            description: 'Standard failure - must fix but not blocking',
            action: 'MARK_WARNING'
        },
        MINOR: {
            level: 3,
            description: 'Minor issue - should fix for best experience',
            action: 'MARK_NOTICE'
        }
    },

    // Reporting Configuration
    reporting: {
        outputDir: './tests/brutal-stress-test/results',
        generateMarkdown: true,
        generateJson: true,
        generateSummary: true,
        includeAILogs: true,
        screenshotFailures: false, // Set true if running browser tests
        verboseMode: true
    },

    // Database Configuration
    database: {
        rulesCount: 3200,
        minRulesRequired: 3000,
        componentPairs: 28
    }
};

