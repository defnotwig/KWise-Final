/**
 * Top 5 Most Important Specifications per Category
 * 
 * This configuration defines the most critical specs to show in Filter & Sort
 * for each PC component category. These are the specs that users most commonly
 * filter by when shopping for parts.
 */

export const TOP_SPECS_BY_CATEGORY = {
  // CPU / Processor
  cpu: [
    'cores',           // Number of cores (4, 6, 8, 12, 16)
    'threads',         // Number of threads
    'base_clock',      // Base clock speed (GHz)
    'boost_clock',     // Max boost clock speed (GHz)
    'tdp'              // Thermal Design Power (Watts)
  ],
  
  // GPU / Graphics Card
  gpu: [
    'vram',            // Video RAM (4GB, 6GB, 8GB, 12GB, 16GB)
    'boost_clock',     // Boost clock speed (MHz)
    'tdp',             // Power consumption (Watts)
    'interface',       // PCIe interface (PCIe 3.0, 4.0, 5.0)
    'display_ports'    // Number/type of display outputs
  ],
  
  // Motherboard
  motherboard: [
    'socket',          // CPU socket (AM4, AM5, LGA1700, LGA1851)
    'chipset',         // Chipset (B650, X670, Z790, etc.)
    'memory_type',     // RAM type (DDR4, DDR5)
    'form_factor',     // Size (ATX, Micro-ATX, Mini-ITX)
    'm2_slots'         // Number of M.2 slots
  ],
  
  // RAM / Memory
  ram: [
    'capacity',        // Total capacity (8GB, 16GB, 32GB, 64GB)
    'speed',           // Speed (MHz) (3200, 3600, 4800, 5200, 6000)
    'memory_type',     // DDR4 or DDR5
    'cas_latency',     // CAS latency (CL16, CL18, CL30, CL36)
    'configuration'    // Kit configuration (1x8GB, 2x8GB, 2x16GB)
  ],
  
  // Storage (SSD/HDD)
  storage: [
    'capacity',        // Storage size (256GB, 512GB, 1TB, 2TB)
    'interface',       // Interface type (NVMe, SATA, M.2)
    'form_factor',     // Physical form (M.2 2280, 2.5", 3.5")
    'read_speed',      // Sequential read speed (MB/s)
    'write_speed'      // Sequential write speed (MB/s)
  ],
  
  // PSU / Power Supply
  psu: [
    'wattage',         // Power output (450W, 550W, 650W, 750W, 850W)
    'efficiency',      // 80 Plus rating (Bronze, Silver, Gold, Platinum, Titanium)
    'modular',         // Cable management (Non-modular, Semi-modular, Fully modular)
    'form_factor',     // Size (ATX, SFX, SFX-L)
    'pcie_connectors'  // Number of PCIe power connectors (for GPUs)
  ],
  
  // Case / Chassis
  case: [
    'form_factor',     // Motherboard support (ATX, Micro-ATX, Mini-ITX)
    'max_gpu_length',  // Maximum GPU length (mm)
    'max_cpu_cooler_height', // Maximum CPU cooler height (mm)
    'fan_support',     // Number/size of fan mounts
    'radiator_support' // Radiator support (240mm, 280mm, 360mm)
  ],
  
  // CPU Cooler / Cooling
  cooling: [
    'cooler_type',     // Type (Air, AIO Liquid, Custom Loop)
    'socket',          // Compatible sockets
    'tdp_rating',      // Maximum TDP supported (Watts)
    'fan_size',        // Fan size (120mm, 140mm, etc.)
    'height'           // Cooler height (mm)
  ],
  
  // Peripherals
  monitor: [
    'resolution',      // Screen resolution (1080p, 1440p, 4K)
    'refresh_rate',    // Refresh rate (Hz) (60, 144, 165, 240)
    'panel_type',      // Panel technology (IPS, VA, TN)
    'response_time',   // Response time (ms)
    'screen_size'      // Diagonal size (inches)
  ],
  
  mouse: [
    'dpi',             // Max DPI
    'sensor_type',     // Optical or Laser
    'connection',      // Wired or Wireless
    'weight',          // Weight (grams)
    'buttons'          // Number of programmable buttons
  ],
  
  keyboard: [
    'switch_type',     // Mechanical switch type (Cherry MX Red, Blue, etc.)
    'layout',          // Full-size, TKL, 60%, 75%
    'connection',      // Wired or Wireless
    'backlight',       // RGB, Single-color, None
    'keycaps'          // Keycap material (ABS, PBT)
  ],
  
  headset: [
    'connection',      // Wired or Wireless
    'driver_size',     // Driver diameter (mm)
    'frequency_response', // Frequency range (Hz)
    'microphone',      // Microphone type
    'compatibility'    // Platform compatibility
  ],
  
  speaker: [
    'channels',        // 2.0, 2.1, 5.1, 7.1
    'total_power',     // Total RMS power (Watts)
    'frequency_response', // Frequency range (Hz)
    'connection',      // Connection type (3.5mm, USB, Bluetooth)
    'subwoofer'        // Has subwoofer (Yes/No)
  ],
  
  webcam: [
    'resolution',      // Video resolution (720p, 1080p, 4K)
    'frame_rate',      // FPS (30fps, 60fps)
    'focus_type',      // Autofocus or Fixed
    'microphone',      // Built-in microphone
    'connection'       // USB 2.0, USB 3.0, USB-C
  ]
};

/**
 * Get top specifications for a category
 * @param {string} category - Category name (normalized)
 * @returns {array} - Array of top 5 specification keys
 */
export function getTopSpecsForCategory(category) {
  if (!category) return [];
  
  const catLower = category.toLowerCase().replaceAll(/\s+/g, '');
  
  // Map variations to canonical names
  const categoryMap = {
    'processor': 'cpu',
    'graphicscard': 'gpu',
    'videocard': 'gpu',
    'memory': 'ram',
    'systemunit': 'case',
    'chassis': 'case',
    'powersupply': 'psu',
    'cooler': 'cooling',
    'cpucooler': 'cooling'
  };
  
  const mappedCategory = categoryMap[catLower] || catLower;
  
  return TOP_SPECS_BY_CATEGORY[mappedCategory] || [];
}

/**
 * Format specification key for display
 * Converts snake_case to Title Case
 * @param {string} key - Specification key
 * @returns {string} - Formatted display name
 */
export function formatSpecKey(key) {
  if (!key) return '';
  
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extract specification filters from products (limited to top 5)
 * @param {array} products - Array of products
 * @param {string} category - Category name
 * @returns {object} - Specification filters object
 */
export function extractTopSpecFilters(products, category) {
  if (!Array.isArray(products) || products.length === 0) {
    return {};
  }
  
  const topSpecs = getTopSpecsForCategory(category);
  if (topSpecs.length === 0) {
    return {};
  }
  
  const specValues = {};
  
  // Initialize spec value sets for top specs only
  topSpecs.forEach(specKey => {
    specValues[specKey] = new Set();
  });
  
  // Collect values from products
  products.forEach(product => {
    if (!product.specifications || typeof product.specifications !== 'object') {
      return;
    }
    
    topSpecs.forEach(specKey => {
      const value = product.specifications[specKey];
      
      // Skip null, undefined, empty strings, and complex objects
      if (value === null || value === undefined || value === '' || typeof value === 'object') {
        return;
      }
      
      // Add value to set
      specValues[specKey].add(String(value));
    });
  });
  
  // Convert Sets to sorted arrays
  const filters = {};
  Object.entries(specValues).forEach(([key, valueSet]) => {
    // Only include specs that have values
    if (valueSet.size === 0) return;
    
    filters[key] = Array.from(valueSet).sort((a, b) => {
      // Try numeric sort first
      const numA = Number.parseFloat(a);
      const numB = Number.parseFloat(b);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
        return numA - numB;
      }
      // Fallback to string sort
      return a.localeCompare(b);
    });
  });
  
  return filters;
}

export default TOP_SPECS_BY_CATEGORY;
