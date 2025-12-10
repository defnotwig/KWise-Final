// parseMotherboardSpecs.js

export function parseMotherboardSpecs(specifications) {
    if (!specifications || typeof specifications !== 'string') {
      return {
        score: 0,
        bestUpgradeYear: "2027", // fallback as string for consistent typing
        recommendation: "Consider upgrading soon (specifications not available)",
      };
    }
  
    let score = 0;
    const currentYear = new Date().getFullYear(); // Dynamically get the current year
    const specs = specifications.toLowerCase();
  
    // Socket Type Scoring (AM5 is newest)
    if (specs.includes('am5')) {
      score += 50;
    } else if (specs.includes('lga1700')) {
      score += 40;
    } else if (specs.includes('am4') || specs.includes('lga1200')) {
      score += 20;
    }
  
    // Memory Type
    if (specs.includes('ddr5')) {
      score += 40;
    } else if (specs.includes('ddr4')) {
      score += 20;
    }
  
    // PCIe Version
    if (specs.includes('pcie 5.0')) {
      score += 50;
    } else if (specs.includes('pcie 4.0')) {
      score += 30;
    } else if (specs.includes('pcie 3.0')) {
      score += 10;
    }
  
    // Connectivity Features
    if (specs.includes('wifi 6') || specs.includes('wifi6')) {
      score += 20;
    } else if (specs.includes('wifi 5') || specs.includes('wifi5')) {
      score += 10;
    }
  
    if (specs.includes('usb 3.2') || specs.includes('usb4') || specs.includes('usb 4')) {
      score += 15;
    } else if (specs.includes('usb 3.1') || specs.includes('usb 3.0')) {
      score += 8;
    }
  
    // Additional valuable features
    if (specs.includes('2.5g lan') || specs.includes('2.5gb lan')) {
      score += 10;
    }
    if (specs.includes('bluetooth')) {
      score += 5;
    }
  
    // Determine upgrade recommendation
    let bestUpgradeYear;
    let recommendation;
  
    if (score >= 150) {
      bestUpgradeYear = currentYear + 6;
      recommendation = "Future-proof (upgrade after " + bestUpgradeYear + ")";
    } else if (score >= 100) {
      bestUpgradeYear = currentYear + 5;
      recommendation = "Good longevity (upgrade after " + bestUpgradeYear + ")";
    } else if (score >= 60) {
      bestUpgradeYear = currentYear + 4;
      recommendation = "Moderate lifespan (consider upgrading by " + bestUpgradeYear + ")";
    } else {
      bestUpgradeYear = currentYear + 2;
      recommendation = "Consider upgrading soon (by " + bestUpgradeYear + ")";
    }
  
    return {
      score,
      bestUpgradeYear,
      recommendation,
      isAM5: specs.includes('am5'),
      isDDR5: specs.includes('ddr5'),
      hasPCIe5: specs.includes('pcie 5.0')
    };
  }
  