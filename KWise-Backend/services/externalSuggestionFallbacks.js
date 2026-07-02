/**
 * Fallback suggestions when AI fails for external upgrades
 * Rule-based recommendations as safety net
 */

const fallbackSuggestions = {
  // GPU upgrades by current tier
  gpu: {
    'RTX 3050': { component: 'RTX 4060', price: 299, gain: '+35% FPS' },
    'RTX 3060': { component: 'RTX 4070', price: 549, gain: '+45% FPS' },
    'RTX 3070': { component: 'RTX 4070 Ti', price: 749, gain: '+30% FPS' },
    'RTX 4060': { component: 'RTX 4070 Super', price: 599, gain: '+40% FPS' },
    'RX 6600': { component: 'RX 7700 XT', price: 449, gain: '+50% FPS' },
    'RX 6700 XT': { component: 'RX 7800 XT', price: 499, gain: '+35% FPS' }
  },

  // CPU upgrades by socket
  cpu: {
    'AM4': [
      { component: 'Ryzen 7 5800X3D', price: 329, reason: 'Best gaming CPU for AM4' },
      { component: 'Ryzen 9 5900X', price: 399, reason: 'Excellent all-rounder' }
    ],
    'AM5': [
      { component: 'Ryzen 7 7800X3D', price: 449, reason: 'Best gaming CPU 2024' },
      { component: 'Ryzen 9 7900X', price: 499, reason: 'High-end multitasking' }
    ],
    'LGA1700': [
      { component: 'Intel i7-14700K', price: 409, reason: 'Excellent performance' },
      { component: 'Intel i9-14900K', price: 589, reason: 'Top-tier gaming' }
    ]
  },

  // RAM upgrades by generation
  ram: {
    'DDR4': { component: '32GB DDR4-3600', price: 89, reason: 'Sweet spot for DDR4' },
    'DDR5': { component: '32GB DDR5-6000', price: 129, reason: 'Optimal for AM5/LGA1700' }
  }
};

function getFallbackSuggestion(currentBuild, budget = 500) {
  const suggestions = [];

  // GPU upgrade (most impactful for gaming)
  if (currentBuild.gpu) {
    for (const [oldGpu, upgrade] of Object.entries(fallbackSuggestions.gpu)) {
      if (currentBuild.gpu.includes(oldGpu) && upgrade.price <= budget) {
        suggestions.push({
          component: upgrade.component,
          category: 'GPU',
          reason: upgrade.gain + ' over current GPU',
          estimatedPrice: upgrade.price,
          priority: 'HIGH',
          source: 'rule-based-fallback'
        });
      }
    }
  }

  // CPU upgrade
  if (currentBuild.cpu && currentBuild.motherboard) {
    const socket = detectSocket(currentBuild.motherboard);
    if (socket && fallbackSuggestions.cpu[socket]) {
      const cpuOptions = fallbackSuggestions.cpu[socket];
      const affordable = cpuOptions.find(opt => opt.price <= budget);
      if (affordable) {
        suggestions.push({
          component: affordable.component,
          category: 'CPU',
          reason: affordable.reason,
          estimatedPrice: affordable.price,
          priority: 'MEDIUM',
          source: 'rule-based-fallback'
        });
      }
    }
  }

  // RAM upgrade
  if (currentBuild.ram && Number.parseInt(currentBuild.ram, 10) < 32) {
    const ramType = currentBuild.ram.includes('DDR5') ? 'DDR5' : 'DDR4';
    const ramUpgrade = fallbackSuggestions.ram[ramType];
    if (ramUpgrade && ramUpgrade.price <= budget) {
      suggestions.push({
        component: ramUpgrade.component,
        category: 'RAM',
        reason: ramUpgrade.reason,
        estimatedPrice: ramUpgrade.price,
        priority: 'LOW',
        source: 'rule-based-fallback'
      });
    }
  }

  // Return highest priority suggestion within budget
  return suggestions.sort((a, b) => {
    const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  })[0] || null;
}

function detectSocket(motherboardName) {
  if (motherboardName.includes('B550') || motherboardName.includes('X570')) return 'AM4';
  if (motherboardName.includes('B650') || motherboardName.includes('X670')) return 'AM5';
  if (motherboardName.includes('B660') || motherboardName.includes('Z690') || 
      motherboardName.includes('B760') || motherboardName.includes('Z790')) return 'LGA1700';
  return null;
}

module.exports = { getFallbackSuggestion };
