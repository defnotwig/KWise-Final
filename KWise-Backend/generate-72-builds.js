/**
 * COMPREHENSIVE 72-BUILD GENERATOR
 * 
 * This script generates all 72 reference builds based on:
 * - Database analysis of actual available products
 * - Realistic price ranges per component category
 * - Usage-specific component priorities
 * - Age-appropriate technology levels
 */

const path = require('path');
process.chdir(path.join(__dirname, '..'));
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KWiseDB',
  password: 'humbleludwig13',
  port: 5432
});

// Define all combinations
const USAGE_TYPES = [
  'Gaming',
  'Office Work',
  'School/Study',
  'Content Creation',
  'Programming Development',
  'General Use'
];

const YEAR_RANGES = [
  {key: '2010-2015', label: '2010-2015 (Old)', ageRange: '10+ years', avgAge: 12},
  {key: '2016-2020', label: '2016-2020 (Mid-Age)', ageRange: '5-9 years', avgAge: 7},
  {key: '2021-2025', label: '2021-2025 (Recent)', ageRange: '0-4 years', avgAge: 2}
];

const BUDGET_RANGES = [
  {key: '10000-25000', min: 10000, max: 25000, label: 'Entry Level'},
  {key: '26000-50000', min: 26000, max: 50000, label: 'Mid Range'},
  {key: '51000-75000', min: 51000, max: 75000, label: 'High End'},
  {key: '76000-100000', min: 76000, max: 100000, label: 'Enthusiast'}
];

// Component allocation percentages by usage type
const COMPONENT_ALLOCATION = {
  'Gaming': {
    GPU: 0.40,    // 40% to GPU (most important)
    CPU: 0.20,    // 20% to CPU
    RAM: 0.10,    // 10% to RAM
    Storage: 0.08,
    Motherboard: 0.10,
    PSU: 0.06,
    Case: 0.04,
    Cooling: 0.02
  },
  'Content Creation': {
    CPU: 0.30,    // CPU-heavy tasks
    GPU: 0.25,    // GPU acceleration
    RAM: 0.20,    // Large RAM needed
    Storage: 0.12,
    Motherboard: 0.07,
    PSU: 0.04,
    Case: 0.01,
    Cooling: 0.01
  },
  'Programming Development': {
    CPU: 0.30,
    RAM: 0.25,    // RAM for VMs and IDEs
    Storage: 0.15, // Fast storage
    GPU: 0.10,
    Motherboard: 0.10,
    PSU: 0.05,
    Case: 0.03,
    Cooling: 0.02
  },
  'Office Work': {
    CPU: 0.25,
    RAM: 0.20,
    Storage: 0.15,
    Motherboard: 0.15,
    GPU: 0.05,    // Integrated or basic
    PSU: 0.10,
    Case: 0.05,
    Cooling: 0.05
  },
  'School/Study': {
    CPU: 0.25,
    RAM: 0.18,
    Storage: 0.15,
    Motherboard: 0.15,
    GPU: 0.07,
    PSU: 0.10,
    Case: 0.05,
    Cooling: 0.05
  },
  'General Use': {
    CPU: 0.22,
    RAM: 0.18,
    Storage: 0.15,
    Motherboard: 0.15,
    GPU: 0.08,
    PSU: 0.10,
    Case: 0.07,
    Cooling: 0.05
  }
};

// Upgrade suggestions by usage type
const UPGRADE_SUGGESTIONS = {
  'Gaming': {
    primary: ['GPU', 'CPU'],
    secondary: ['RAM', 'Storage'],
    reasoning: 'Focus on GPU for gaming performance, CPU for reducing bottlenecks'
  },
  'Content Creation': {
    primary: ['CPU', 'RAM'],
    secondary: ['GPU', 'Storage'],
    reasoning: 'More cores and RAM for rendering, GPU for acceleration'
  },
  'Programming Development': {
    primary: ['RAM', 'Storage'],
    secondary: ['CPU'],
    reasoning: 'More RAM for VMs/containers, fast storage for compilation'
  },
  'Office Work': {
    primary: ['RAM', 'Storage'],
    secondary: [],
    reasoning: 'Increase RAM for multitasking, larger SSD for documents'
  },
  'School/Study': {
    primary: ['RAM', 'Storage'],
    secondary: ['GPU'],
    reasoning: 'More RAM for research tabs, storage for projects, GPU for light editing'
  },
  'General Use': {
    primary: ['RAM', 'Storage'],
    secondary: ['GPU'],
    reasoning: 'Basic upgrades for better general performance'
  }
};

async function generateAllBuilds() {
  console.log('🏗️  GENERATING ALL 72 REFERENCE BUILDS\n');
  console.log('=' .repeat(60));
  
  const builds = {};
  let buildCount = 0;
  
  // Get actual products from database for matching
  console.log('\n📊 Analyzing database products...\n');
  
  const categoryPriceRanges = await pool.query(`
    SELECT 
      category,
      COUNT(*) as product_count,
      MIN(price) as min_price,
      MAX(price) as max_price,
      AVG(price) as avg_price,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price) as q1_price,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY price) as median_price,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price) as q3_price
    FROM pc_parts
    WHERE is_active = true AND kiosk_visible = true
    GROUP BY category
    ORDER BY category
  `);
  
  const priceData = {};
  categoryPriceRanges.rows.forEach(row => {
    priceData[row.category] = {
      count: parseInt(row.product_count),
      min: parseFloat(row.min_price),
      max: parseFloat(row.max_price),
      avg: parseFloat(row.avg_price),
      q1: parseFloat(row.q1_price),
      median: parseFloat(row.median_price),
      q3: parseFloat(row.q3_price)
    };
  });
  
  console.log('Category Price Data:');
  Object.keys(priceData).forEach(cat => {
    const data = priceData[cat];
    console.log(`  ${cat}: ${data.count} products, ₱${data.min.toFixed(0)}-₱${data.max.toFixed(0)}, median ₱${data.median.toFixed(0)}`);
  });
  
  // Generate all combinations
  for (const usage of USAGE_TYPES) {
    for (const yearRange of YEAR_RANGES) {
      for (const budgetRange of BUDGET_RANGES) {
        const buildKey = `${usage.toLowerCase().replace(/\s+/g, '-')}_${yearRange.key}_${budgetRange.key}`;
        
        // Calculate component budgets
        const totalBudget = (budgetRange.min + budgetRange.max) / 2; // Use midpoint
        const allocation = COMPONENT_ALLOCATION[usage];
        
        const componentBudgets = {
          GPU: totalBudget * allocation.GPU,
          CPU: totalBudget * allocation.CPU,
          RAM: totalBudget * allocation.RAM,
          Storage: totalBudget * allocation.Storage,
          Motherboard: totalBudget * allocation.Motherboard,
          PSU: totalBudget * allocation.PSU,
          Case: totalBudget * allocation.Case,
          Cooling: totalBudget * allocation.Cooling
        };
        
        // Generate realistic component specs based on year range and budget
        const components = {};
        let actualTotal = 0;
        
        // CPU
        const cpuPrice = componentBudgets.CPU;
        components.CPU = generateComponent('CPU', cpuPrice, yearRange.avgAge, usage, priceData);
        actualTotal += components.CPU.price;
        
        // GPU
        const gpuPrice = componentBudgets.GPU;
        if (usage === 'Office Work' || usage === 'School/Study') {
          components.GPU = {
            name: 'Integrated Graphics',
            specs: 'CPU integrated graphics',
            price: 0,
            reasoning: 'Sufficient for non-gaming tasks'
          };
        } else {
          components.GPU = generateComponent('GPU', gpuPrice, yearRange.avgAge, usage, priceData);
          actualTotal += components.GPU.price;
        }
        
        // Other components
        ['Motherboard', 'RAM', 'Storage', 'PSU', 'Case', 'Cooling'].forEach(cat => {
          components[cat] = generateComponent(cat, componentBudgets[cat], yearRange.avgAge, usage, priceData);
          actualTotal += components[cat].price;
        });
        
        // Build the complete build object
        builds[buildKey] = {
          usage,
          yearRange: yearRange.key,
          yearLabel: yearRange.label,
          budgetRange: budgetRange.key,
          budgetLabel: budgetRange.label,
          estimatedAge: yearRange.avgAge,
          components,
          totalBudget: Math.round(actualTotal),
          suggestedUpgrades: UPGRADE_SUGGESTIONS[usage].primary,
          secondaryUpgrades: UPGRADE_SUGGESTIONS[usage].secondary,
          upgradeReasoning: UPGRADE_SUGGESTIONS[usage].reasoning
        };
        
        buildCount++;
        
        if (buildCount % 12 === 0) {
          console.log(`\n✅ Generated ${buildCount}/72 builds (${usage} complete)`);
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n🎉 Successfully generated all ${buildCount} reference builds!\n`);
  
  // Save to file
  const fs = require('fs');
  const outputPath = path.join(__dirname, 'generated-reference-builds.json');
  fs.writeFileSync(outputPath, JSON.stringify(builds, null, 2));
  console.log(`📁 Saved to: ${outputPath}\n`);
  
  // Generate summary statistics
  console.log('📊 BUILD STATISTICS:\n');
  
  USAGE_TYPES.forEach(usage => {
    const usageBuilds = Object.values(builds).filter(b => b.usage === usage);
    const avgBudget = usageBuilds.reduce((sum, b) => sum + b.totalBudget, 0) / usageBuilds.length;
    console.log(`  ${usage}: ${usageBuilds.length} builds, avg budget ₱${avgBudget.toFixed(0)}`);
  });
  
  await pool.end();
}

function generateComponent(category, budget, age, usage, priceData) {
  // Map frontend categories to database categories
  const categoryMap = {
    'CPU': 'CPU',
    'GPU': 'GPU',
    'Motherboard': 'Motherboard',
    'RAM': 'RAM',
    'Storage': 'Storage',
    'PSU': 'PSU',
    'Case': 'Case',
    'Cooling': 'Cooling'
  };
  
  const dbCategory = categoryMap[category];
  const categoryData = priceData[dbCategory];
  
  if (!categoryData) {
    // Fallback for missing category
    return {
      name: `Generic ${category}`,
      specs: 'Standard specifications',
      price: Math.round(budget),
      reasoning: `Budget allocation for ${category}`
    };
  }
  
  // Determine price tier based on budget within category range
  let targetPrice = budget;
  
  // Clamp to category range
  if (targetPrice < categoryData.min) targetPrice = categoryData.min;
  if (targetPrice > categoryData.max) targetPrice = categoryData.max;
  
  // Determine tier
  let tier, pricePoint;
  if (targetPrice <= categoryData.q1) {
    tier = 'Budget';
    pricePoint = categoryData.q1;
  } else if (targetPrice <= categoryData.median) {
    tier = 'Entry';
    pricePoint = categoryData.median;
  } else if (targetPrice <= categoryData.q3) {
    tier = 'Mid-Range';
    pricePoint = categoryData.q3;
  } else {
    tier = 'High-End';
    pricePoint = categoryData.q3 * 1.2; // 20% above Q3
  }
  
  // Generate age-appropriate specs
  const specs = generateSpecs(category, age, tier, usage);
  const name = generateName(category, age, tier, usage);
  const reasoning = generateReasoning(category, age, tier, usage);
  
  return {
    name,
    specs,
    price: Math.round(pricePoint),
    reasoning
  };
}

function generateSpecs(category, age, tier, usage) {
  const specs = {
    CPU: {
      'Budget': age >= 10 ? '2-4 cores, 2.5-3.5GHz' : age >= 5 ? '4 cores, 3.0-3.5GHz' : '6 cores, 3.5-4.0GHz',
      'Entry': age >= 10 ? '4 cores, 3.0-3.8GHz' : age >= 5 ? '6 cores, 3.5-4.0GHz' : '6-8 cores, 4.0-4.5GHz',
      'Mid-Range': age >= 10 ? '4-6 cores, 3.5-4.2GHz' : age >= 5 ? '8 cores, 3.8-4.4GHz' : '8-12 cores, 4.2-4.8GHz',
      'High-End': age >= 10 ? '6-8 cores, 4.0-4.6GHz' : age >= 5 ? '12 cores, 4.0-4.7GHz' : '16+ cores, 4.5-5.0GHz'
    },
    GPU: {
      'Budget': age >= 10 ? '2-4GB VRAM, 1080p Low-Med' : age >= 5 ? '4-6GB VRAM, 1080p Med-High' : '6-8GB VRAM, 1080p High-Ultra',
      'Entry': age >= 10 ? '4GB VRAM, 1080p Medium' : age >= 5 ? '6GB VRAM, 1080p High' : '8GB VRAM, 1080p Ultra',
      'Mid-Range': age >= 10 ? '6GB VRAM, 1080p High' : age >= 5 ? '8GB VRAM, 1440p Med-High' : '12GB VRAM, 1440p Ultra',
      'High-End': age >= 10 ? '8GB+ VRAM, 1440p capable' : age >= 5 ? '10-12GB VRAM, 1440p Ultra/4K Med' : '16GB+ VRAM, 4K High'
    },
    Motherboard: {
      'Budget': age >= 10 ? 'DDR3, 2 RAM slots, basic I/O' : age >= 5 ? 'DDR4, basic chipset' : 'DDR4, B-series chipset',
      'Entry': age >= 10 ? 'DDR3, H-series, 4 slots' : age >= 5 ? 'DDR4, B-series, M.2' : 'DDR4/DDR5, B-series, PCIe 4.0',
      'Mid-Range': age >= 10 ? 'DDR3, Z-series, OC support' : age >= 5 ? 'DDR4, X-series, PCIe 3.0' : 'DDR4/DDR5, X-series, PCIe 4.0',
      'High-End': age >= 10 ? 'DDR3 2400MHz, Premium' : age >= 5 ? 'DDR4 3600MHz, X570/Z490' : 'DDR5, X670E/Z790, PCIe 5.0'
    },
    RAM: {
      'Budget': age >= 10 ? '4-8GB DDR3 1600MHz' : age >= 5 ? '8GB DDR4 2666MHz' : '8-16GB DDR4 3200MHz',
      'Entry': age >= 10 ? '8GB DDR3 1866MHz' : age >= 5 ? '16GB DDR4 3000MHz' : '16GB DDR4 3600MHz',
      'Mid-Range': age >= 10 ? '16GB DDR3 2133MHz' : age >= 5 ? '16-32GB DDR4 3200MHz' : '32GB DDR4 3600MHz CL16',
      'High-End': age >= 10 ? '32GB DDR3 2400MHz' : age >= 5 ? '32-64GB DDR4 3600MHz' : '64GB+ DDR5 5600MHz'
    },
    Storage: {
      'Budget': age >= 10 ? '500GB-1TB HDD' : age >= 5 ? '240-512GB SATA SSD' : '512GB NVMe Gen3',
      'Entry': age >= 10 ? '1TB HDD or 120GB SSD' : age >= 5 ? '512GB SATA SSD' : '512GB-1TB NVMe Gen3',
      'Mid-Range': age >= 10 ? '240GB SSD + 1TB HDD' : age >= 5 ? '512GB NVMe + 1TB HDD' : '1TB NVMe Gen4',
      'High-End': age >= 10 ? '512GB SSD + 2TB HDD' : age >= 5 ? '1TB+ NVMe Gen3/4' : '2TB NVMe Gen4'
    },
    PSU: {
      'Budget': age >= 10 ? '400-500W, No rating' : age >= 5 ? '450-550W 80+ Bronze' : '500-650W 80+ Bronze',
      'Entry': age >= 10 ? '500W 80+ Bronze' : age >= 5 ? '550W 80+ Bronze' : '650W 80+ Bronze',
      'Mid-Range': age >= 10 ? '600W 80+ Bronze/Silver' : age >= 5 ? '650W 80+ Gold' : '750W 80+ Gold',
      'High-End': age >= 10 ? '750W 80+ Gold' : age >= 5 ? '850W 80+ Gold/Platinum' : '850-1000W 80+ Platinum'
    },
    Case: {
      'Budget': 'Basic case, minimal features',
      'Entry': 'Mid tower, 1-2 fans, basic cable management',
      'Mid-Range': 'Mid tower, mesh front, 3-4 fans, good airflow',
      'High-End': 'Premium mid/full tower, tempered glass, RGB, excellent airflow'
    },
    Cooling: {
      'Budget': 'Stock CPU cooler',
      'Entry': 'Stock or budget tower cooler',
      'Mid-Range': 'Aftermarket tower cooler or 120-240mm AIO',
      'High-End': '240-360mm AIO or high-end air cooler'
    }
  };
  
  return specs[category][tier] || 'Standard specifications';
}

function generateName(category, age, tier, usage) {
  const names = {
    CPU: {
      'Budget': age >= 10 ? 'Intel Core i3/AMD A-Series' : age >= 5 ? 'AMD Ryzen 3/Intel i3' : 'AMD Ryzen 5/Intel i5',
      'Entry': age >= 10 ? 'Intel Core i5/AMD FX' : age >= 5 ? 'AMD Ryzen 5/Intel i5' : 'AMD Ryzen 5 5600/Intel i5-12400',
      'Mid-Range': age >= 10 ? 'Intel Core i5 K/AMD FX-8000' : age >= 5 ? 'AMD Ryzen 7 2700/Intel i7-8700' : 'AMD Ryzen 7 5800X/Intel i7-12700',
      'High-End': age >= 10 ? 'Intel Core i7 Extreme' : age >= 5 ? 'AMD Ryzen 9 3900X/Intel i9-9900K' : 'AMD Ryzen 9 5950X/Intel i9-13900K'
    },
    GPU: {
      'Budget': age >= 10 ? 'GTX 750 Ti/R7 260X' : age >= 5 ? 'GTX 1050 Ti/RX 560' : 'GTX 1650/RX 6500 XT',
      'Entry': age >= 10 ? 'GTX 960/R9 280' : age >= 5 ? 'GTX 1660/RX 580' : 'RTX 3050/RX 6600',
      'Mid-Range': age >= 10 ? 'GTX 970/R9 390' : age >= 5 ? 'RTX 2060/RX 5700' : 'RTX 3060 Ti/RX 6700 XT',
      'High-End': age >= 10 ? 'GTX 980 Ti/R9 Fury X' : age >= 5 ? 'RTX 2080 Ti/RX 5700 XT' : 'RTX 4070 Ti/RX 7900 XT'
    },
    Motherboard: {
      'Budget': age >= 10 ? 'H81/A88X Chipset' : age >= 5 ? 'A320/H310 Chipset' : 'A520/H510 Chipset',
      'Entry': age >= 10 ? 'H97/B85 Chipset' : age >= 5 ? 'B450/B360 Chipset' : 'B550/B660 Chipset',
      'Mid-Range': age >= 10 ? 'Z97/990FX Chipset' : age >= 5 ? 'X470/Z390 Chipset' : 'X570/Z690 Chipset',
      'High-End': age >= 10 ? 'X99 Extreme' : age >= 5 ? 'X570/Z490 Premium' : 'X670E/Z790 Extreme'
    },
    RAM: {
      'Budget': age >= 10 ? '8GB DDR3' : age >= 5 ? '8GB DDR4' : '16GB DDR4',
      'Entry': age >= 10 ? '8GB DDR3 1866MHz' : age >= 5 ? '16GB DDR4 2666MHz' : '16GB DDR4 3200MHz',
      'Mid-Range': age >= 10 ? '16GB DDR3 Dual Channel' : age >= 5 ? '16GB DDR4 3200MHz CL16' : '32GB DDR4 3600MHz CL16',
      'High-End': age >= 10 ? '32GB DDR3 High Speed' : age >= 5 ? '32GB DDR4 3600MHz Low Latency' : '64GB DDR5 5600MHz'
    },
    Storage: {
      'Budget': age >= 10 ? '500GB HDD' : age >= 5 ? '240GB SATA SSD' : '512GB NVMe SSD',
      'Entry': age >= 10 ? '1TB HDD' : age >= 5 ? '512GB SATA SSD' : '1TB NVMe Gen3',
      'Mid-Range': age >= 10 ? '240GB SSD + 1TB HDD' : age >= 5 ? '512GB NVMe + HDD' : '1TB NVMe Gen4',
      'High-End': age >= 10 ? '512GB SSD + 2TB HDD' : age >= 5 ? '1TB NVMe Gen4' : '2TB NVMe Gen4'
    },
    PSU: {
      'Budget': age >= 10 ? '400-500W Generic' : age >= 5 ? '500W 80+ Bronze' : '550W 80+ Bronze',
      'Entry': age >= 10 ? '500W 80+ Bronze' : age >= 5 ? '550W 80+ Bronze Modular' : '650W 80+ Bronze',
      'Mid-Range': age >= 10 ? '600W 80+ Gold' : age >= 5 ? '650W 80+ Gold' : '750W 80+ Gold Modular',
      'High-End': age >= 10 ? '750W 80+ Gold' : age >= 5 ? '850W 80+ Platinum' : '1000W 80+ Platinum'
    },
    Case: {
      'Budget': 'Basic ATX/Micro ATX Case',
      'Entry': 'Mid Tower Case',
      'Mid-Range': 'Premium Mid Tower with Mesh',
      'High-End': 'Premium Full/Mid Tower with Tempered Glass'
    },
    Cooling: {
      'Budget': 'Stock CPU Cooler',
      'Entry': 'Stock or Budget Tower Cooler',
      'Mid-Range': 'Tower Cooler or 120-240mm AIO',
      'High-End': '280-360mm AIO Liquid Cooler'
    }
  };
  
  return names[category][tier] || `${tier} ${category}`;
}

function generateReasoning(category, age, tier, usage) {
  const reasons = {
    CPU: {
      'Gaming': tier === 'Budget' ? 'Entry gaming CPU, bottleneck likely' : tier === 'Entry' ? 'Good for 1080p gaming' : tier === 'Mid-Range' ? 'Strong gaming performance' : 'High FPS and streaming capable',
      'Content Creation': tier === 'Budget' ? 'Basic editing capable' : tier === 'Entry' ? 'Handles 1080p editing' : tier === 'Mid-Range' ? 'Multi-core for rendering' : 'Professional rendering power',
      'Programming Development': tier === 'Budget' ? 'Basic development' : tier === 'Entry' ? 'Good for most IDEs' : tier === 'Mid-Range' ? 'Handles VMs well' : 'Multiple VMs and containers',
      'Office Work': 'Adequate for office productivity',
      'School/Study': 'Sufficient for school workload',
      'General Use': 'Good for everyday computing'
    },
    GPU: {
      'Gaming': tier === 'Budget' ? 'Entry 1080p gaming' : tier === 'Entry' ? 'Solid 1080p performance' : tier === 'Mid-Range' ? '1440p gaming capable' : '4K and ray tracing',
      'Content Creation': tier === 'Budget' ? 'Basic GPU acceleration' : tier === 'Entry' ? 'GPU-accelerated editing' : tier === 'Mid-Range' ? 'Professional GPU acceleration' : 'High-end rendering',
      'default': 'Graphics processing as needed'
    },
    Motherboard: {
      'Budget': `Basic features for ${age >= 10 ? 'older' : 'budget'} platform`,
      'Entry': 'Good feature set for money',
      'Mid-Range': 'Overclocking and premium features',
      'High-End': 'Enthusiast features and connectivity'
    },
    RAM: {
      'Gaming': tier === 'Budget' ? 'Minimum for gaming' : tier === 'Entry' ? 'Good for modern games' : tier === 'Mid-Range' ? 'Excellent for gaming & multitasking' : 'Future-proof capacity',
      'Content Creation': tier === 'Budget' ? 'Basic editing' : tier === 'Entry' ? '1080p editing' : tier === 'Mid-Range' ? '4K editing capable' : '8K and large projects',
      'default': tier === 'Budget' ? 'Basic multitasking' : tier === 'Entry' ? 'Good multitasking' : tier === 'Mid-Range' ? 'Excellent multitasking' : 'Maximum capacity'
    },
    Storage: {
      'Budget': age >= 10 ? 'Standard for era' : 'Fast boot times',
      'Entry': age >= 10 ? 'Hybrid storage approach' : 'Good storage speed',
      'Mid-Range': 'Fast loading and ample space',
      'High-End': 'Maximum speed and capacity'
    },
    PSU: {
      'Budget': 'Adequate power delivery',
      'Entry': 'Reliable power with efficiency',
      'Mid-Range': 'Quality PSU with headroom',
      'High-End': 'Premium efficiency and reliability'
    },
    Case: {
      'Budget': 'Functional enclosure',
      'Entry': 'Good airflow and cable management',
      'Mid-Range': 'Premium airflow and aesthetics',
      'High-End': 'Enthusiast case with excellent cooling'
    },
    Cooling: {
      'Budget': 'Included with CPU',
      'Entry': 'Adequate cooling',
      'Mid-Range': 'Good cooling for overclocking',
      'High-End': 'Excellent cooling performance'
    }
  };
  
  const categoryReasons = reasons[category];
  if (typeof categoryReasons === 'object' && categoryReasons[usage]) {
    return categoryReasons[usage];
  } else if (typeof categoryReasons === 'object' && categoryReasons[tier]) {
    return categoryReasons[tier];
  } else if (typeof categoryReasons === 'object' && categoryReasons['default']) {
    return categoryReasons['default'];
  }
  
  return `${tier} ${category} for ${usage}`;
}

generateAllBuilds().catch(err => {
  console.error('❌ Error generating builds:', err);
  pool.end();
  process.exit(1);
});
