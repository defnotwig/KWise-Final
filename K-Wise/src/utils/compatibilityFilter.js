/**
 * Client-Side Compatibility Filtering Utility
 * Used by PC-Customizer (PCCustomized.js) and PC-Parts.js
 * 
 * Filters available components based on already-selected components
 * Uses the same compatibility rules as the backend comprehensive-check endpoint
 * 
 * Rules:
 * 1. CPU -> Motherboard: Socket must match
 * 2. Motherboard -> RAM: DDR type must match
 * 3. Motherboard -> CPU Cooler: Socket support must match
 * 4. GPU -> Case: GPU length must fit in case max GPU length
 * 5. GPU -> PSU: PSU must have enough wattage
 * 6. Cooler -> Case: Cooler height must fit in case max cooler height
 * 7. PSU -> Case: PSU form factor must match case supported form factors
 */

/**
 * Extract socket from CPU or Motherboard name/description
 */
const extractSocket = (name, description = '', specs = {}) => {
    // Check specs first (most reliable)
    if (specs?.socket) return specs.socket.toUpperCase();
    
    const text = `${name} ${description}`.toUpperCase();

    // Intel sockets
    if (text.match(/LGA\s?1700/)) return 'LGA1700';
    if (text.match(/LGA\s?1200/)) return 'LGA1200';
    if (text.match(/LGA\s?1151/)) return 'LGA1151';
    if (text.match(/LGA\s?2066/)) return 'LGA2066';

    // AMD sockets
    if (text.match(/AM5/)) return 'AM5';
    if (text.match(/AM4/)) return 'AM4';
    if (text.match(/TR4|TRX4/)) return 'TRX4';
    if (text.match(/SP3/)) return 'SP3';

    return null;
};

/**
 * Detect DDR type from RAM or Motherboard
 * 🔥 CRITICAL FIX: Prioritize 'type' field over 'memory_type' for consistency
 */
const detectDDRType = (name, description = '', specs = {}) => {
    // Check specs first - prioritize 'type' field (more reliable for RAM)
    if (specs?.type) {
        const typeUpper = String(specs.type).toUpperCase();
        if (typeUpper.includes('DDR')) return typeUpper;
    }
    if (specs?.memory_type) {
        const memTypeUpper = String(specs.memory_type).toUpperCase();
        if (memTypeUpper.includes('DDR')) return memTypeUpper;
    }
    if (specs?.ram_type) {
        const ramTypeUpper = String(specs.ram_type).toUpperCase();
        if (ramTypeUpper.includes('DDR')) return ramTypeUpper;
    }
    
    // Fallback to name/description parsing
    const text = `${name} ${description}`.toUpperCase();
    
    if (text.includes('DDR5')) return 'DDR5';
    if (text.includes('DDR4')) return 'DDR4';
    if (text.includes('DDR3')) return 'DDR3';
    
    return null;
};

/**
 * Extract TDP (Thermal Design Power) in watts
 */
const extractTDP = (name, description = '', specs = {}) => {
    if (specs?.tdp) return parseInt(specs.tdp);
    if (specs?.power) return parseInt(specs.power);
    
    const text = `${name} ${description}`;
    const match = text.match(/(\d+)\s?W(?:att)?/i);
    return match ? parseInt(match[1]) : null;
};

/**
 * Extract GPU length in millimeters
 */
/**
 * Extract GPU length in millimeters
 * Checks BOTH dimensions and specifications JSONB columns
 */
const extractGPULength = (product = {}) => {
    const dims = product.dimensions || {};
    const specs = product.specifications || product.specs || {};
    const name = product.name || '';
    const description = product.description || '';
    
    // 🔥 PRIORITY 1: Check dimensions.length_mm (most authoritative)
    if (dims.length_mm) return parseInt(dims.length_mm);
    
    // 🔥 PRIORITY 2: Check specifications.length_mm
    if (specs?.length_mm) return parseInt(specs.length_mm);
    if (specs?.Length) {
        // Handle "267mm" or "267" format
        const lengthStr = String(specs.Length).replace(/[^\d]/g, '');
        if (lengthStr) return parseInt(lengthStr);
    }
    if (specs?.length) return parseInt(specs.length);
    if (specs?.card_length) return parseInt(specs.card_length);
    if (specs?.gpu_length_mm) return parseInt(specs.gpu_length_mm);
    
    // 🔥 PRIORITY 3: Parse from name/description (fallback)
    const text = `${name} ${description}`;
    const match = text.match(/(\d{3})\s?mm/);
    return match ? parseInt(match[1]) : null;
};

/**
 * Extract cooler height in millimeters
 * Checks BOTH dimensions and specifications JSONB columns
 */
const extractCoolerHeight = (product = {}) => {
    const dims = product.dimensions || {};
    const specs = product.specifications || product.specs || {};
    const description = product.description || '';
    
    // 🔥 PRIORITY 1: Check dimensions.height_mm
    if (dims.height_mm) return parseInt(dims.height_mm);
    
    // 🔥 PRIORITY 2: Check specifications.height
    if (specs?.height_mm) return parseInt(specs.height_mm);
    if (specs?.height) return parseInt(specs.height);
    if (specs?.cooler_height) return parseInt(specs.cooler_height);
    
    // 🔥 PRIORITY 3: Parse from description (fallback)
    const match = description.match(/(\d{2,3})\s?mm.*height/i);
    return match ? parseInt(match[1]) : null;
};

/**
 * Extract PSU wattage
 */
const extractWattage = (name, specs = {}) => {
    if (specs?.wattage) return parseInt(specs.wattage);
    if (specs?.power) return parseInt(specs.power);
    
    const match = name.match(/(\d{3,4})\s?W/);
    return match ? parseInt(match[1]) : null;
};

/**
 * Extract cooler socket support
 * 🔥 CRITICAL FIX: Check ALL possible field names for socket support including compatible_sockets array
 */
const extractCoolerSocket = (name, description = '', specs = {}) => {
    const dims = specs.dimensions || {};
    
    // 🔥 CRITICAL FIX: Check compatible_sockets FIRST (most common field name)
    if (specs?.compatible_sockets) {
        if (Array.isArray(specs.compatible_sockets)) {
            const sockets = specs.compatible_sockets.map(s => String(s).toUpperCase());
            console.log(`🔍 Cooler socket support from compatible_sockets array: ${sockets.join(', ')}`);
            return sockets;
        }
        return String(specs.compatible_sockets).toUpperCase().split(/[,;]/);
    }
    
    // Check dimensions for socket_support (sometimes stored there)
    if (dims?.socket_support) {
        if (Array.isArray(dims.socket_support)) {
            const sockets = dims.socket_support.map(s => String(s).toUpperCase());
            console.log(`🔍 Cooler socket support from dimensions.socket_support: ${sockets.join(', ')}`);
            return sockets;
        }
        return String(dims.socket_support).toUpperCase().split(/[,;]/);
    }
    
    if (specs?.socket_support) {
        if (Array.isArray(specs.socket_support)) {
            return specs.socket_support.map(s => String(s).toUpperCase());
        }
        return String(specs.socket_support).toUpperCase().split(/[,;]/);
    }
    if (specs?.socket) return [String(specs.socket).toUpperCase()];
    if (specs?.supported_sockets) {
        if (Array.isArray(specs.supported_sockets)) {
            return specs.supported_sockets.map(s => String(s).toUpperCase());
        }
        return String(specs.supported_sockets).toUpperCase().split(/[,;]/);
    }
    
    const text = `${name} ${description}`.toUpperCase();
    const sockets = [];
    
    if (text.includes('LGA1700') || text.includes('1700')) sockets.push('LGA1700');
    if (text.includes('LGA1200') || text.includes('1200')) sockets.push('LGA1200');
    if (text.includes('LGA1151') || text.includes('1151')) sockets.push('LGA1151');
    if (text.includes('LGA1150') || text.includes('1150')) sockets.push('LGA1150');
    if (text.includes('LGA115')) sockets.push('LGA1151'); // Generic Intel 115x
    if (text.includes('AM5')) sockets.push('AM5');
    if (text.includes('AM4')) sockets.push('AM4');
    if (text.includes('AM3')) sockets.push('AM3');
    if (text.includes('UNIVERSAL') || text.includes('ALL')) return ['UNIVERSAL'];
    
    return sockets.length > 0 ? sockets : null;
};

/**
 * 🔥 CRITICAL FIX: Check if cooler is an AIO (liquid/water cooler)
 */
const isAIOCooler = (product = {}) => {
    const name = (product.name || '').toUpperCase();
    const description = (product.description || '').toUpperCase();
    const specs = product.specs || product.specifications || {};
    
    // Check specs first
    if (specs.water_cooled === true || specs.type === 'AIO' || specs.type === 'Liquid' || specs.cooling_type === 'AIO') {
        return true;
    }
    
    // Check for AIO/liquid indicators in name
    const aioKeywords = ['AIO', 'LIQUID', 'WATER', 'RADIATOR', '120MM', '240MM', '280MM', '360MM', '420MM'];
    const text = `${name} ${description}`;
    
    return aioKeywords.some(keyword => text.includes(keyword));
};

/**
 * 🔥 CRITICAL FIX: Extract AIO radiator size in mm
 * Parses cooler name/specs for radiator size (120, 240, 280, 360, 420)
 */
const extractRadiatorSize = (product = {}) => {
    const name = (product.name || '').toUpperCase();
    const description = (product.description || '').toUpperCase();
    const specs = product.specs || product.specifications || {};
    
    // Check specs first (most reliable)
    if (specs.radiator_size) {
        const size = parseInt(String(specs.radiator_size).replace(/mm/gi, ''));
        if (!isNaN(size)) return size;
    }
    if (specs.radiator_mm) return parseInt(specs.radiator_mm);
    
    const text = `${name} ${description}`;
    
    // Look for common radiator sizes in name (priority order - largest to smallest to avoid partial matches)
    const radiatorSizes = [420, 360, 280, 240, 120];
    for (const size of radiatorSizes) {
        // Match patterns like "360mm", "360 mm", "360", or "360 BLACK"
        const patterns = [
            new RegExp(`\\b${size}\\s*MM\\b`, 'i'),
            new RegExp(`\\b${size}\\s+(?:BLACK|WHITE|RGB|ARGB|PRO|ELITE|X|V2|V3)\\b`, 'i'),
            new RegExp(`\\b${size}\\b`, 'i')
        ];
        
        for (const pattern of patterns) {
            if (pattern.test(text)) {
                console.log(`🔍 Extracted radiator size ${size}mm from: "${product.name}"`);
                return size;
            }
        }
    }
    
    return null;
};

/**
 * 🔥 CRITICAL FIX: Extract case radiator support (max supported radiator size)
 * Returns the maximum radiator size the case can support
 * Handles multiple field names and string formats like "280mm front, 120mm rear"
 */
const extractCaseRadiatorSupport = (product = {}) => {
    const specs = product.specs || product.specifications || {};
    const dims = product.dimensions || {};
    
    // Check various possible field names for radiator support (numeric fields first)
    const numericFields = [
        specs.front_radiator_support,
        specs.max_radiator_size,
        dims.front_radiator_support,
        dims.max_radiator_size,
        specs.top_radiator_support,
        dims.top_radiator_support,
        specs.front_radiator_mm,
        specs.max_radiator_mm
    ];
    
    // First try numeric fields
    for (const field of numericFields) {
        if (field !== undefined && field !== null) {
            const size = parseInt(String(field).replace(/mm/gi, ''));
            if (!isNaN(size) && size > 0 && size < 600) { // Sanity check: radiators are 120-480mm
                console.log(`🔍 Case ${product.name} max radiator support: ${size}mm (from numeric field)`);
                return size;
            }
        }
    }
    
    // 🔥 FIX: Parse string fields like "280mm front, 120mm rear" - get MAX value
    const stringFields = [
        specs.radiator_support,
        dims.radiator_support
    ];
    
    for (const field of stringFields) {
        if (field && typeof field === 'string') {
            // Extract all numeric values followed by "mm"
            const matches = field.match(/(\d{2,3})mm/g);
            if (matches && matches.length > 0) {
                const sizes = matches.map(m => parseInt(m.replace('mm', '')));
                const maxSize = Math.max(...sizes);
                if (!isNaN(maxSize) && maxSize > 0) {
                    console.log(`🔍 Case ${product.name} max radiator support: ${maxSize}mm (parsed from "${field}")`);
                    return maxSize;
                }
            }
        }
    }
    
    return null;
};

/**
 * Main filtering function - filters products based on selected components
 * 
 * @param {Array} products - Array of products to filter
 * @param {Object} selectedComponents - Object with selected components by category
 * @param {string} currentCategory - Category being filtered
 * @returns {Array} - Filtered products that are compatible
 */
export const filterCompatibleProducts = (products, selectedComponents, currentCategory) => {
    // 🔥 UNCONDITIONAL DEBUG: Log function entry
    console.log('⚡ filterCompatibleProducts CALLED with:', {
        productsCount: products?.length || 0,
        selectedKeys: Object.keys(selectedComponents || {}),
        currentCategory: currentCategory
    });
    
    if (!products || products.length === 0) return [];
    
    const category = currentCategory.toUpperCase();
    
    // 🔥 CRITICAL FIX: ALWAYS filter out laptop RAM regardless of selected components
    // This must run BEFORE the early return for empty selectedComponents
    if (category === 'RAM' || category === 'MEMORY') {
        const isLaptopRAM = (product) => {
            const name = (product.name || '').toUpperCase();
            const description = (product.description || '').toUpperCase();
            const specs = product.specs || product.specifications || {};
            const formFactor = (specs.form_factor || specs.formFactor || specs.type || '').toUpperCase();
            
            // Check for laptop/SODIMM indicators
            const hasLaptopInName = name.includes('LAPTOP') || name.includes('NOTEBOOK') || name.includes('SODIMM') || name.includes('SO-DIMM');
            const hasLaptopInDesc = description.includes('LAPTOP') || description.includes('NOTEBOOK') || description.includes('SODIMM') || description.includes('SO-DIMM');
            const hasLaptopFormFactor = formFactor.includes('SODIMM') || formFactor.includes('SO-DIMM') || formFactor.includes('LAPTOP');
            
            return hasLaptopInName || hasLaptopInDesc || hasLaptopFormFactor;
        };
        
        // First pass: ALWAYS filter out all laptop RAM
        products = products.filter(ram => {
            if (isLaptopRAM(ram)) {
                console.log(`🚫 EARLY FILTER: Removed LAPTOP RAM: ${ram.name}`);
                return false;
            }
            return true;
        });
        console.log(`📊 After laptop RAM filter: ${products.length} products remaining`);
    }
    
    // Now handle the case of no selected components (returns filtered products)
    if (!selectedComponents || Object.keys(selectedComponents).length === 0) return products;

    // Note: 'category' already declared above as currentCategory.toUpperCase()
    
    // 🔥 CRITICAL FIX: Normalize all selectedComponents keys to lowercase for consistent lookup
    // This fixes the case mismatch bug where cart uses "Graphics Processing Unit" but filter looks for "gpu"
    const selected = {};
    Object.entries(selectedComponents).forEach(([key, value]) => {
        const normalizedKey = key.toLowerCase().trim();
        
        // Map common category names to standard keys
        if (normalizedKey.includes('cpu') || normalizedKey.includes('processor') || normalizedKey.includes('central')) {
            selected['cpu'] = value;
            selected['processor'] = value;
        } else if (normalizedKey.includes('motherboard') || normalizedKey.includes('mainboard')) {
            selected['motherboard'] = value;
        } else if (normalizedKey.includes('ram') || normalizedKey.includes('memory')) {
            selected['ram'] = value;
            selected['memory'] = value;
        } else if (normalizedKey.includes('gpu') || normalizedKey.includes('graphics')) {
            selected['gpu'] = value;
            selected['graphics processing unit'] = value;
        } else if (normalizedKey.includes('cool') || normalizedKey.includes('fan')) {
            selected['cooling'] = value;
            selected['cooler'] = value;
        } else if (normalizedKey.includes('storage') || normalizedKey.includes('ssd') || normalizedKey.includes('hdd')) {
            selected['storage'] = value;
        } else if (normalizedKey.includes('case') || normalizedKey.includes('chassis')) {
            selected['case'] = value;
        } else if (normalizedKey.includes('psu') || normalizedKey.includes('power')) {
            selected['psu'] = value;
            selected['power supply'] = value;
        } else {
            // Keep original key as lowercase
            selected[normalizedKey] = value;
        }
    });
    
    // 🔥 CRITICAL DEBUG: Log normalized selected components
    console.log('🔍 Normalized selected components for filtering:', {
        originalKeys: Object.keys(selectedComponents),
        normalizedKeys: Object.keys(selected),
        hasGPU: !!selected.gpu,
        gpuDims: selected.gpu?.dimensions ? Object.keys(selected.gpu.dimensions) : 'no GPU'
    });
    
    // 🔥 CRITICAL DEBUG: Show category BEFORE all if checks
    console.log(`🔶 FILTER ENTRY - currentCategory: "${currentCategory}", category (uppercase): "${category}"`);
    console.log(`🔶 Category check conditions:`, {
        isCASE: category === 'CASE',
        isPCCASE: category === 'PC CASE',
        categoryLength: category.length,
        categoryCharCodes: [...category].map(c => c.charCodeAt(0))
    });

    // CPU selection - no filtering needed (first component)
    if (category === 'CPU' || category === 'PROCESSOR') {
        return products;
    }

    // Motherboard filtering - must match CPU socket
    if (category === 'MOTHERBOARD') {
        const cpu = selected.cpu || selected.processor;
        if (!cpu) return products;

        const cpuSocket = extractSocket(cpu.name, cpu.description, cpu.specs || cpu.specifications);
        if (!cpuSocket) return products;

        return products.filter(mb => {
            const mbSocket = extractSocket(mb.name, mb.description, mb.specs || mb.specifications);
            return mbSocket && mbSocket === cpuSocket;
        });
    }

    // RAM filtering - must match motherboard DDR type AND existing RAM sticks
    // Note: Laptop RAM is already filtered out at the beginning of this function
    if (category === 'RAM' || category === 'MEMORY') {
        const motherboard = selected.motherboard;
        const existingRAM = selected.ram; // 🔥 CRITICAL FIX: Check if RAM already selected
        
        // Laptop RAM already filtered - now do DDR type matching
        if (!motherboard) return products; // Products already have laptop RAM filtered out

        const mbDDR = detectDDRType(motherboard.name, motherboard.description, motherboard.specs || motherboard.specifications);
        if (!mbDDR) return products;

        // 🔥 CRITICAL FIX: If RAM already selected, enforce DDR type consistency
        let requiredDDR = mbDDR;
        if (existingRAM) {
            const existingDDR = detectDDRType(existingRAM.name, existingRAM.description, existingRAM.specs || existingRAM.specifications || existingRAM.memory_type);
            if (existingDDR) {
                requiredDDR = existingDDR;
                console.log(`🎰 Existing RAM detected: ${existingRAM.name} (${existingDDR}) - enforcing consistency`);
            }
        }

        return products.filter(ram => {
            const ramDDR = detectDDRType(ram.name, ram.description, ram.specs || ram.specifications);
            const isCompatible = ramDDR && ramDDR === requiredDDR;
            
            if (!isCompatible && ramDDR) {
                console.log(`❌ Filtered out ${ram.name} (${ramDDR}) - requires ${requiredDDR}`);
            }
            
            return isCompatible;
        });
    }

    // CPU Cooler filtering - must support CPU socket AND fit in case (including AIO radiator size)
    if (category === 'COOLING' || category === 'COOLER' || category === 'CPU COOLER') {
        const cpu = selected.cpu || selected.processor;
        const motherboard = selected.motherboard;
        const pcCase = selected.case;
        
        console.log(`🔌 Cooler Filter Entry - CPU: ${cpu?.name || 'none'}, MB: ${motherboard?.name || 'none'}, Case: ${pcCase?.name || 'none'}`);
        
        if (!cpu && !motherboard) {
            console.log(`⚠️ Cooler Filter: No CPU or MB selected - returning all ${products.length} coolers`);
            return products;
        }

        const cpuSocket = cpu ? extractSocket(cpu.name, cpu.description, cpu.specs || cpu.specifications) : null;
        const mbSocket = motherboard ? extractSocket(motherboard.name, motherboard.description, motherboard.specs || motherboard.specifications) : null;
        const targetSocket = cpuSocket || mbSocket;
        
        console.log(`🔌 Cooler Filter: Target socket = "${targetSocket}" (CPU socket: ${cpuSocket}, MB socket: ${mbSocket})`);
        
        let filtered = products;
        
        // 🔥 CRITICAL FIX: Filter by socket compatibility with proper array handling
        if (targetSocket) {
            console.log(`🔌 Starting socket filter with ${filtered.length} coolers for ${targetSocket} socket...`);
            
            filtered = filtered.filter(cooler => {
                const coolerSpecs = cooler.specs || cooler.specifications || {};
                const coolerSupport = extractCoolerSocket(cooler.name, cooler.description, coolerSpecs);
                
                console.log(`   🔍 Checking cooler: ${cooler.name}, compatible_sockets: ${JSON.stringify(coolerSpecs.compatible_sockets)}, extracted support: ${JSON.stringify(coolerSupport)}`);
                
                if (!coolerSupport) {
                    console.log(`   ⚠️ Cooler ${cooler.name} has unknown socket support - allowing`);
                    return true; // Unknown support - allow it
                }
                
                // Handle array return from extractCoolerSocket
                if (Array.isArray(coolerSupport)) {
                    if (coolerSupport.includes('UNIVERSAL')) return true;
                    const isCompatible = coolerSupport.includes(targetSocket.toUpperCase());
                    if (!isCompatible) {
                        console.log(`   ❌ FILTERED OUT: ${cooler.name} (supports ${coolerSupport.join(', ')}) - requires ${targetSocket}`);
                    } else {
                        console.log(`   ✅ COMPATIBLE: ${cooler.name} (supports ${coolerSupport.join(', ')})`);
                    }
                    return isCompatible;
                }
                
                // Handle string return (legacy compatibility)
                if (coolerSupport === 'UNIVERSAL') return true;
                const isCompatible = String(coolerSupport).includes(targetSocket);
                if (!isCompatible) {
                    console.log(`   ❌ FILTERED OUT: ${cooler.name} (supports ${coolerSupport}) - requires ${targetSocket}`);
                }
                return isCompatible;
            });
            
            console.log(`✅ After socket filter: ${filtered.length} coolers compatible with ${targetSocket}`);
        }
        
        // 🔥 CRITICAL FIX: Filter AIO coolers by case radiator support
        if (pcCase) {
            const maxRadiatorSupport = extractCaseRadiatorSupport(pcCase);
            
            if (maxRadiatorSupport) {
                console.log(`🧊 Cooler Filter: Case supports max ${maxRadiatorSupport}mm radiator, filtering AIOs...`);
                
                filtered = filtered.filter(cooler => {
                    const isAIO = isAIOCooler(cooler);
                    
                    if (!isAIO) {
                        // Air cooler - no radiator size check needed
                        return true;
                    }
                    
                    const radiatorSize = extractRadiatorSize(cooler);
                    
                    if (!radiatorSize) {
                        console.log(`   ⚠️ AIO ${cooler.name} has unknown radiator size - allowing`);
                        return true; // Unknown size - allow it but warn
                    }
                    
                    const fits = radiatorSize <= maxRadiatorSupport;
                    
                    if (!fits) {
                        console.log(`   ❌ FILTERED OUT: ${cooler.name} (${radiatorSize}mm radiator, case max ${maxRadiatorSupport}mm)`);
                    } else {
                        console.log(`   ✅ AIO ${cooler.name} (${radiatorSize}mm) fits in case (max ${maxRadiatorSupport}mm)`);
                    }
                    
                    return fits;
                });
                
                console.log(`✅ Cooler Filter: ${filtered.length} coolers fit in case`);
            }
            
            // Also check cooler height for air coolers
            const caseDims = pcCase.dimensions || {};
            const caseSpecs = pcCase.specs || pcCase.specifications || {};
            let maxCoolerHeight = caseDims.max_cooler_height_mm || caseSpecs.max_cooler_height_mm || caseSpecs.max_cooler_height || caseSpecs.max_cpu_cooler_height;
            
            if (maxCoolerHeight) {
                if (typeof maxCoolerHeight === 'string') {
                    maxCoolerHeight = parseInt(maxCoolerHeight.replace(/mm/gi, ''));
                } else {
                    maxCoolerHeight = parseInt(maxCoolerHeight);
                }
                
                if (!isNaN(maxCoolerHeight)) {
                    console.log(`🧊 Cooler Filter: Case max cooler height ${maxCoolerHeight}mm, filtering air coolers...`);
                    
                    filtered = filtered.filter(cooler => {
                        // Skip AIOs - they don't have height issues
                        if (isAIOCooler(cooler)) return true;
                        
                        const coolerHeight = extractCoolerHeight(cooler);
                        if (!coolerHeight) return true; // Unknown height - allow
                        
                        const fits = coolerHeight <= maxCoolerHeight;
                        if (!fits) {
                            console.log(`   ❌ FILTERED OUT: ${cooler.name} (${coolerHeight}mm tall, case max ${maxCoolerHeight}mm)`);
                        }
                        return fits;
                    });
                }
            }
        }
        
        return filtered;
    }

    // Storage filtering - check motherboard for M.2/NVMe support (currently returns all)
    if (category === 'STORAGE') {
        // Future enhancement: Check motherboard M.2 slots, SATA ports
        return products;
    }

    // GPU filtering - check case clearance and PSU power
    if (category === 'GPU' || category === 'GRAPHICS PROCESSING UNIT') {
        const pcCase = selected.case;
        const psu = selected.psu;
        
        let filtered = products;

        // Filter by case GPU clearance
        if (pcCase) {
            // 🔥 FIX: Check BOTH dimensions and specifications for case GPU clearance
            const caseDims = pcCase.dimensions || {};
            const caseSpecs = pcCase.specs || pcCase.specifications || {};
            
            // 🔥 PRIORITY: dimensions.max_gpu_length_mm FIRST (most accurate)
            let caseMaxGPU = caseDims.max_gpu_length_mm || caseSpecs.max_gpu_length_mm || caseSpecs.max_gpu_length;
            
            if (typeof caseMaxGPU === 'string') {
                caseMaxGPU = parseInt(caseMaxGPU.replace(/mm/gi, ''));
            } else {
                caseMaxGPU = parseInt(caseMaxGPU);
            }
            
            if (caseMaxGPU && !isNaN(caseMaxGPU)) {
                filtered = filtered.filter(gpu => {
                    const gpuLength = extractGPULength(gpu);
                    if (!gpuLength) return true; // Unknown length - allow it
                    return gpuLength <= caseMaxGPU;
                });
            }
        }

        // Filter by PSU wattage (GPU needs sufficient power)
        if (psu) {
            const psuWattage = extractWattage(psu.name, psu.specs || psu.specifications);
            const cpu = selected.cpu || selected.processor;
            const cpuTDP = cpu ? extractTDP(cpu.name, cpu.description, cpu.specs || cpu.specifications) : 0;
            
            if (psuWattage) {
                const baseSystemPower = 100; // Motherboard, RAM, Storage, Cooling
                const availableForGPU = psuWattage - baseSystemPower - (cpuTDP || 0);
                
                filtered = filtered.filter(gpu => {
                    const gpuTDP = extractTDP(gpu.name, gpu.description, gpu.specs || gpu.specifications);
                    if (!gpuTDP) return true; // Unknown TDP - allow it
                    return gpuTDP <= availableForGPU;
                });
            }
        }

        return filtered;
    }

    // Case filtering - check GPU clearance, cooler height, motherboard form factor, AND AIO radiator size
    if (category === 'CASE' || category === 'PC CASE') {
        // 🔥 CRITICAL DEBUG: Log entry into Case filtering block
        console.log(`🔵 CASE FILTER BLOCK ENTERED. Category: ${category}`);
        console.log(`🔵 Selected keys:`, Object.keys(selected));
        console.log(`🔵 GPU from selected:`, selected.gpu ? { name: selected.gpu.name, hasDims: !!selected.gpu.dimensions } : 'NOT FOUND');
        
        const gpu = selected.gpu || selected['graphics processing unit'];
        const cooler = selected.cooling || selected.cooler || selected['cpu cooler'];
        const motherboard = selected.motherboard;
        
        console.log(`🔵 GPU resolved:`, gpu ? { name: gpu.name, dimKeys: Object.keys(gpu.dimensions || {}) } : 'NULL');
        console.log(`🔵 Motherboard resolved:`, motherboard ? motherboard.name : 'NULL');
        console.log(`🔵 Cooler resolved:`, cooler ? cooler.name : 'NULL');
        
        let filtered = products;

        // 🔥 CRITICAL FIX #1: Filter by motherboard form factor compatibility
        if (motherboard) {
            const mbSpecs = motherboard.specs || motherboard.specifications || {};
            const mbFormFactor = (mbSpecs.form_factor || mbSpecs.motherboard_form_factor || '').toUpperCase().trim();
            
            if (mbFormFactor) {
                console.log(`🔍 Case Filter: Motherboard is ${mbFormFactor}, filtering cases...`);
                
                filtered = filtered.filter(pcCase => {
                    const caseSpecs = pcCase.specs || pcCase.specifications || {};
                    let supportedFormFactors = caseSpecs.supported_form_factors || caseSpecs.motherboard_support || caseSpecs.form_factor || [];
                    
                    // Ensure it's an array
                    if (typeof supportedFormFactors === 'string') {
                        supportedFormFactors = supportedFormFactors.split(',').map(s => s.trim().toUpperCase());
                    } else if (Array.isArray(supportedFormFactors)) {
                        supportedFormFactors = supportedFormFactors.map(s => String(s).toUpperCase().trim());
                    } else {
                        return true; // Unknown support - allow it
                    }
                    
                    // Check if case supports this motherboard form factor
                    const isCompatible = supportedFormFactors.some(ff => ff.includes(mbFormFactor) || mbFormFactor.includes(ff));
                    
                    if (!isCompatible) {
                        console.log(`   ❌ FILTERED OUT: ${pcCase.name} (supports ${supportedFormFactors.join(', ')}, needs ${mbFormFactor})`);
                    }
                    
                    return isCompatible;
                });
                
                console.log(`✅ Case Filter: ${filtered.length} cases support ${mbFormFactor} motherboards`);
            }
        }

        // 🔥 CRITICAL FIX #2: Filter by AIO radiator size compatibility
        if (cooler) {
            const isAIO = isAIOCooler(cooler);
            
            if (isAIO) {
                const radiatorSize = extractRadiatorSize(cooler);
                
                if (radiatorSize) {
                    console.log(`🧊 Case Filter: Cooler is AIO with ${radiatorSize}mm radiator, filtering cases...`);
                    
                    filtered = filtered.filter(pcCase => {
                        const maxRadiatorSupport = extractCaseRadiatorSupport(pcCase);
                        
                        if (!maxRadiatorSupport) {
                            console.log(`   ⚠️ Case ${pcCase.name} has unknown radiator support - allowing`);
                            return true; // Unknown support - allow it but warn
                        }
                        
                        const fits = maxRadiatorSupport >= radiatorSize;
                        
                        if (!fits) {
                            console.log(`   ❌ FILTERED OUT: ${pcCase.name} (max ${maxRadiatorSupport}mm radiator, AIO is ${radiatorSize}mm)`);
                        } else {
                            console.log(`   ✅ Case ${pcCase.name} can fit ${radiatorSize}mm radiator (supports up to ${maxRadiatorSupport}mm)`);
                        }
                        
                        return fits;
                    });
                    
                    console.log(`✅ Case Filter: ${filtered.length} cases can fit ${radiatorSize}mm AIO radiator`);
                }
            }
        }

        // Filter by GPU length
        if (gpu) {
            const gpuLength = extractGPULength(gpu);
            
            // 🔥 CRITICAL DEBUG: Log GPU dimensions to verify data is present
            console.log(`🔍 GPU for case filtering:`, {
                name: gpu.name,
                dimensions: gpu.dimensions,
                specs: gpu.specifications?.length_mm || gpu.specifications?.length,
                extractedLength: gpuLength
            });
            
            if (gpuLength) {
                console.log(`🔍 Case Filter: GPU is ${gpuLength}mm long, filtering cases...`);
                
                filtered = filtered.filter(pcCase => {
                    const caseDims = pcCase.dimensions || {};
                    const caseSpecs = pcCase.specs || pcCase.specifications || {};
                    
                    // 🔥 CRITICAL FIX: Check dimensions FIRST (most authoritative), then specifications
                    let caseMaxGPU = caseDims.max_gpu_length_mm || caseSpecs.max_gpu_length_mm || caseSpecs.max_gpu_length;
                    
                    // 🔥 CRITICAL DEBUG: Log case dimensions
                    console.log(`   📦 Checking ${pcCase.name}:`, {
                        caseDims,
                        caseMaxGPU_raw: caseMaxGPU,
                        caseSpecs_max_gpu: caseSpecs.max_gpu_length_mm
                    });
                    
                    // Convert string to number (remove "mm" suffix if present)
                    if (typeof caseMaxGPU === 'string') {
                        caseMaxGPU = parseInt(caseMaxGPU.replace(/mm/gi, ''));
                    } else {
                        caseMaxGPU = parseInt(caseMaxGPU);
                    }
                    
                    if (!caseMaxGPU || isNaN(caseMaxGPU)) return true; // Unknown max - allow it
                    
                    const fits = caseMaxGPU >= gpuLength;
                    if (!fits) {
                        console.log(`   ❌ FILTERED OUT: ${pcCase.name} (max ${caseMaxGPU}mm, GPU is ${gpuLength}mm)`);
                    }
                    
                    return fits;
                });
                
                console.log(`✅ Case Filter: ${filtered.length} cases can fit ${gpuLength}mm GPU`);
            }
        }

        // Filter by cooler height
        if (cooler) {
            const coolerHeight = extractCoolerHeight(cooler);
            
            if (coolerHeight) {
                filtered = filtered.filter(pcCase => {
                    const caseDims = pcCase.dimensions || {};
                    const caseSpecs = pcCase.specs || pcCase.specifications || {};
                    
                    // 🔥 CRITICAL FIX: Check dimensions FIRST (most authoritative), then specifications
                    let caseMaxCooler = caseDims.max_cooler_height_mm || caseSpecs.max_cooler_height_mm || caseSpecs.max_cooler_height || caseSpecs.max_cpu_cooler_height;
                    
                    // Convert string to number (remove "mm" suffix if present)
                    if (typeof caseMaxCooler === 'string') {
                        caseMaxCooler = parseInt(caseMaxCooler.replace(/mm/gi, ''));
                    } else {
                        caseMaxCooler = parseInt(caseMaxCooler);
                    }
                    
                    if (!caseMaxCooler || isNaN(caseMaxCooler)) return true; // Unknown max - allow it
                    return caseMaxCooler >= coolerHeight;
                });
            }
        }

        return filtered;
    }

    // PSU filtering - check total power requirements AND GPU power connector compatibility
    if (category === 'PSU' || category === 'POWER SUPPLY UNIT' || category === 'POWER SUPPLY') {
        const cpu = selected.cpu || selected.processor;
        const gpu = selected.gpu || selected['graphics processing unit'];
        
        let totalPower = 100; // Base system
        
        if (cpu) {
            const cpuTDP = extractTDP(cpu.name, cpu.description, cpu.specs || cpu.specifications);
            if (cpuTDP) totalPower += cpuTDP;
        }
        
        if (gpu) {
            const gpuTDP = extractTDP(gpu.name, gpu.description, gpu.specs || gpu.specifications);
            if (gpuTDP) totalPower += gpuTDP;
        }
        
        // Recommend PSU with 30% headroom
        const recommendedWattage = Math.ceil(totalPower * 1.3);
        
        // 🔥 CRITICAL FIX: Check if GPU requires 12VHPWR connector (RTX 4000 series)
        let gpuRequires12VHPWR = false;
        let gpuName = '';
        if (gpu) {
            const gpuDims = gpu.dimensions || {};
            const gpuSpecs = gpu.specifications || gpu.specs || {};
            gpuName = gpu.name || '';
            
            // Check if GPU has 12VHPWR/16-pin power connector requirement
            const powerConnectors = gpuDims.power_connectors || gpuSpecs.power_connectors || gpuSpecs['Power Connectors'] || '';
            const powerConnStr = String(powerConnectors).toUpperCase();
            
            // RTX 4000 series detection
            const isRTX4000 = gpuName.toUpperCase().includes('RTX40') || gpuName.toUpperCase().includes('RTX 40');
            const has12VHPWR = powerConnStr.includes('12VHPWR') || powerConnStr.includes('16-PIN') || powerConnStr.includes('16PIN');
            
            gpuRequires12VHPWR = isRTX4000 || has12VHPWR;
            
            if (gpuRequires12VHPWR) {
                console.log(`⚡ GPU "${gpuName}" requires 12VHPWR connector - filtering PSUs...`);
            }
        }
        
        return products.filter(psu => {
            const psuSpecs = psu.specs || psu.specifications || {};
            const psuWattage = extractWattage(psu.name, psuSpecs);
            
            // Check wattage requirement
            if (psuWattage && psuWattage < recommendedWattage) {
                console.log(`❌ PSU ${psu.name} (${psuWattage}W) filtered: insufficient wattage (need ${recommendedWattage}W)`);
                return false;
            }
            
            // 🔥 CRITICAL: Check 12VHPWR connector for RTX 4000 series GPUs
            if (gpuRequires12VHPWR) {
                const has12VHPWR = psuSpecs.has_12vhpwr_connector === true || 
                                   String(psuSpecs.pcie_connectors || '').toUpperCase().includes('12VHPWR') ||
                                   String(psuSpecs.pcie_connectors || '').toUpperCase().includes('16-PIN') ||
                                   String(psuSpecs['Power Connectors'] || '').toUpperCase().includes('12VHPWR');
                
                if (!has12VHPWR) {
                    console.log(`❌ PSU ${psu.name} filtered: no 12VHPWR connector for RTX 4000 GPU "${gpuName}"`);
                    return false;
                }
                console.log(`✅ PSU ${psu.name} has 12VHPWR connector - compatible with RTX 4000`);
            }
            
            return true;
        });
    }

    // Default: return all products
    return products;
};

/**
 * Get compatibility reason for why a product is filtered out
 * Used for showing detailed explanations to users
 */
export const getIncompatibilityReason = (product, selectedComponents, currentCategory) => {
    const category = currentCategory.toUpperCase();
    const selected = selectedComponents;

    if (category === 'MOTHERBOARD') {
        const cpu = selected.cpu || selected.processor;
        if (cpu) {
            const cpuSocket = extractSocket(cpu.name, cpu.description, cpu.specs || cpu.specifications);
            const mbSocket = extractSocket(product.name, product.description, product.specs || product.specifications);
            
            if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
                return `❌ Socket mismatch: CPU requires ${cpuSocket}, this motherboard has ${mbSocket}`;
            }
        }
    }

    if (category === 'RAM' || category === 'MEMORY') {
        const motherboard = selected.motherboard;
        if (motherboard) {
            const mbDDR = detectDDRType(motherboard.name, motherboard.description, motherboard.specs || motherboard.specifications);
            const ramDDR = detectDDRType(product.name, product.description, product.specs || product.specifications);
            
            if (mbDDR && ramDDR && mbDDR !== ramDDR) {
                return `❌ Memory type mismatch: Motherboard requires ${mbDDR}, this RAM is ${ramDDR}`;
            }
        }
    }

    if (category === 'GPU' || category === 'GRAPHICS PROCESSING UNIT') {
        const pcCase = selected.case;
        if (pcCase) {
            const caseDims = pcCase.dimensions || {};
            const caseSpecs = pcCase.specs || pcCase.specifications || {};
            // 🔥 Check dimensions FIRST, then specifications
            const caseMaxGPU = caseDims.max_gpu_length_mm || caseSpecs.max_gpu_length || caseSpecs.max_gpu_length_mm;
            const gpuLength = extractGPULength(product);
            
            if (caseMaxGPU && gpuLength && gpuLength > caseMaxGPU) {
                return `❌ Too long for case: GPU is ${gpuLength}mm, case max is ${caseMaxGPU}mm`;
            }
        }
    }

    return null;
};;

export default {
    filterCompatibleProducts,
    getIncompatibilityReason
};
