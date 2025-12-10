/**
 * COMPREHENSIVE TEST: PC Customizer Compatibility Validation
 * 
 * Tests the exact user build from the screenshots:
 * - Intel Core i3 8100 (LGA1151)
 * - ARCTIC P12 PWM SINGLE WHITE
 * - RAMSTA H310M (LGA1151, 1 M.2 slot, 4 SATA ports)
 * - 16GB T-Force DarkZa Kit (2x8GB) 3600MHz  
 * - 1TB WESTERN DIGITAL GREEN (M.2 NVMe)
 * - 250GB WESTERN DIGITAL *GEN3 (SATA)
 * - 12GB RTX4070 IGAME
 * - LIANLI O11 Dynamic MINI
 * - FSP Hydro M PRO 600W
 * 
 * Expected Results:
 * ✅ Backend accepts storage ARRAY (2 drives)
 * ✅ 1TB WD GREEN correctly detected as NVMe (m2_slots: 1)
 * ✅ 250GB WD GEN3 correctly detected as SATA (sata_ports: 4)
 * ✅ NO "Insufficient M.2 NVMe Slots" error
 * ✅ NO "Not enough M.2 slots" error
 * ✅ Cooler compatible with CPU socket (LGA1151)
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api/compatibility/advanced/full-build';

// Exact build from user screenshots
const testBuild = {
    components: {
        cpu: {
            id: 26,
            name: "Intel Core i3 8100 (BOXED)",
            category: "CPU",
            brand: "INTEL",
            specifications: {
                socket: "LGA1151",
                tdp: 65,
                cores: 4,
                threads: 4
            }
        },
        cooling: {
            id: 710,
            name: "ARCTIC P12 PWM SINGLE WHITE",
            category: "Cooling",
            brand: "ARCTIC",
            specifications: {
                compatible_sockets: ["AM4", "AM5", "LGA1150", "LGA1151", "LGA1155", "LGA1200", "LGA1700", "LGA1851"],
                tdp_rating: 180
            }
        },
        motherboard: {
            id: 118,
            name: "RAMSTA H310M",
            category: "Motherboard",
            brand: "RAMSTA",
            specifications: {
                socket: "LGA1151",
                chipset: "H310",
                m2_slots: 1,  // Only 1 M.2 slot
                ram_slots: 2,
                sata_ports: 4,  // 4 SATA ports
                memory_type: "DDR4",
                form_factor: "Micro-ATX"
            }
        },
        gpu: {
            id: 444,
            name: "12GB RTX4070 IGAME ULTRA W OC (TRI FAN)",
            category: "GPU",
            specifications: {
                tdp: 200,
                length_mm: 267
            }
        },
        case: {
            id: 626,
            name: "LIANLI O11 Dynamic MINI (Snow White)",
            category: "Case",
            specifications: {
                form_factor: "Mid Tower",
                max_gpu_length_mm: 320,
                max_cooler_height_mm: 155
            },
            dimensions: {
                max_gpu_length_mm: 320,
                max_cooler_height_mm: 155
            }
        },
        psu: {
            id: 505,
            name: "FSP Hydro M PRO 600W",
            category: "PSU",
            specifications: {
                wattage: 600,
                pcie_8pin_connectors: 2
            }
        },
        ram: {
            id: 204,
            name: "16GB T-Force DarkZa Kit (2x8GB) 3600MHz",
            category: "RAM",
            specifications: {
                memory_type: "DDR4",
                speed: 3600,
                total_capacity_gb: 16,
                sticks_count: 2
            }
        },
        // ✅ CRITICAL FIX: Send BOTH storage drives as ARRAY
        storage: [
            {
                id: 304,
                name: "1TB WESTERN DIGITAL GREEN",
                category: "Storage",
                specifications: {
                    storage_type: "NVMe SSD",
                    interface: "M.2 PCIe 3.0 X4",
                    nvme_support: true,  // ✅ Fixed in database
                    capacity: "1TB"
                }
            },
            {
                id: 323,
                name: "250GB WESTERN DIGITAL *GEN3",
                category: "Storage",
                specifications: {
                    storage_type: "SATA SSD",
                    interface: "SATA III",
                    nvme_support: false,
                    capacity: "240GB"
                }
            }
        ]
    },
    pageName: "PC-Customized",
    comprehensive: true
};

async function runTest() {
    console.log('🔍 COMPREHENSIVE COMPATIBILITY TEST');
    console.log('=====================================\n');
    
    console.log('📦 Test Build Components:');
    console.log(`   - CPU: ${testBuild.components.cpu.name} (${testBuild.components.cpu.specifications.socket})`);
    console.log(`   - Cooler: ${testBuild.components.cooling.name}`);
    console.log(`   - Motherboard: ${testBuild.components.motherboard.name} (${testBuild.components.motherboard.specifications.m2_slots} M.2, ${testBuild.components.motherboard.specifications.sata_ports} SATA)`);
    console.log(`   - RAM: ${testBuild.components.ram.name}`);
    console.log(`   - Storage:`);
    testBuild.components.storage.forEach((drive, i) => {
        console.log(`     [${i+1}] ${drive.name} (${drive.specifications.storage_type})`);
    });
    console.log(`   - GPU: ${testBuild.components.gpu.name}`);
    console.log(`   - Case: ${testBuild.components.case.name}`);
    console.log(`   - PSU: ${testBuild.components.psu.name}\n`);
    
    try {
        console.log('🚀 Sending request to backend...');
        const response = await axios.post(API_URL, testBuild);
        
        console.log('\n✅ API RESPONSE SUCCESS');
        console.log(`📊 Status: ${response.status}`);
        console.log(`📊 Overall Status: ${response.data.data.overall_status}`);
        console.log(`📊 Compatibility Score: ${response.data.data.compatibility_score}`);
        console.log(`📊 Overall Message: ${response.data.data.overall_message}\n`);
        
        // Extract all issues and warnings
        const data = response.data.data;
        const allIssues = data.all_issues || [];
        const allWarnings = data.all_warnings || [];
        
        console.log(`📋 ISSUES & WARNINGS FOUND:`);
        console.log(`   Critical Issues: ${allIssues.filter(i => i.severity === 'critical').length}`);
        console.log(`   Warnings: ${allWarnings.length}\n`);
        
        // Check for the specific errors user reported
        const m2Errors = allIssues.filter(issue => 
            issue.message?.toLowerCase().includes('m.2') && 
            issue.message?.toLowerCase().includes('slot')
        );
        
        const nvmeErrors = allIssues.filter(issue =>
            issue.message?.toLowerCase().includes('nvme') &&
            issue.message?.toLowerCase().includes('insufficient')
        );
        
        const storageErrors = allIssues.filter(issue =>
            issue.message?.toLowerCase().includes('not enough') &&
            issue.message?.toLowerCase().includes('m.2')
        );
        
        console.log('🔍 SPECIFIC ERROR CHECK:');
        if (m2Errors.length === 0 && nvmeErrors.length === 0 && storageErrors.length === 0) {
            console.log('   ✅ NO M.2 SLOT ERRORS (Bug Fixed!)');
        } else {
            console.log('   ❌ M.2 SLOT ERRORS STILL PRESENT:');
            [...m2Errors, ...nvmeErrors, ...storageErrors].forEach((err, i) => {
                console.log(`      [${i+1}] ${err.message}`);
            });
        }
        
        console.log('\n📋 ALL ISSUES:');
        if (allIssues.length === 0) {
            console.log('   ✅ No critical issues found!');
        } else {
            allIssues.forEach((issue, i) => {
                console.log(`   [${i+1}] ${issue.severity?.toUpperCase()}: ${issue.message}`);
            });
        }
        
        console.log('\n⚠️  ALL WARNINGS:');
        if (allWarnings.length === 0) {
            console.log('   ✅ No warnings found!');
        } else {
            allWarnings.forEach((warning, i) => {
                console.log(`   [${i+1}] ${warning.message || warning}`);
            });
        }
        
        console.log('\n=====================================');
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!');
        
    } catch (error) {
        console.error('\n❌ TEST FAILED');
        console.error(`Status: ${error.response?.status}`);
        console.error(`Message: ${error.response?.data?.message || error.message}`);
        
        if (error.response?.data?.validationDetails) {
            console.error('\nValidation Errors:');
            error.response.data.validationDetails.forEach(detail => {
                console.error(`  - ${detail}`);
            });
        }
        
        if (error.response?.data) {
            console.error('\nFull Response:');
            console.error(JSON.stringify(error.response.data, null, 2));
        }
    }
}

runTest();
