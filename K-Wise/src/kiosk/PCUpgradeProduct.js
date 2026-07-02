/**
 * PCUpgradeProduct.js - Detailed Product View Component  
 * UI Pattern: Matches CustomizedDisplay.js styling
 * Features: Full specifications, compatibility notes, Add to Upgrade action
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PCUpgradeProduct.css';
import KioskProductImage from '../components/KioskProductImage';
import PCUpgrade from '../assets/PCUpgrade.webp';
import CPU1 from '../assets/CPU1.webp';
import CPUCooler from '../assets/CPUCooler.webp';
import Motherboard1 from '../assets/Motherboard1.webp';
import Ram from '../assets/Ram.webp';
import Storage1 from '../assets/Storage1.webp';
import GPU1 from '../assets/GPU1.webp';
import SystemUnit1 from '../assets/SystemUnit1.webp';
import PSU1 from '../assets/PSU1.webp';

const PCUpgradeProduct = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { product: initialProduct, categoryName, categoryKey, apiCategory } = location.state || {};
  
  const [product] = useState(initialProduct);
  const showAddedModalRef = useRef(false);
  const compatibilityNoteRef = useRef(null);

  // Default category images
  const defaultCategoryImages = {
    cpu: CPU1,
    processor: CPU1,
    'cpu-cooler': CPUCooler,
    cooling: CPUCooler,
    motherboard: Motherboard1,
    ram: Ram,
    memory: Ram,
    storage: Storage1,
    gpu: GPU1,
    graphcard: GPU1,
    case: SystemUnit1,
    chassis: SystemUnit1,
    psu: PSU1,
    'power supply': PSU1
  };

  /**
   * Get fallback image based on category
   */
  const getFallbackImage = () => {
    const catLower = (categoryKey || '').toLowerCase();
    return defaultCategoryImages[catLower] || SystemUnit1;
  };

  const checkCategoryCompatibility = (catLower, currentParts) => {
    const issues = [];
    if (catLower.includes('cpu')) {
      const motherboard = Object.values(currentParts).find(p => p?.category?.toLowerCase().includes('motherboard'));
      if (motherboard && product.socket && motherboard.socket && product.socket !== motherboard.socket) {
        issues.push(`Socket mismatch: This CPU uses ${product.socket}, but your motherboard uses ${motherboard.socket}`);
      }
    }
    if (catLower.includes('ram')) {
      const motherboard = Object.values(currentParts).find(p => p?.category?.toLowerCase().includes('motherboard'));
      if (motherboard && product.memory_type && motherboard.memory_type && product.memory_type !== motherboard.memory_type) {
        issues.push(`Memory type mismatch: This RAM is ${product.memory_type}, but your motherboard supports ${motherboard.memory_type}`);
      }
    }
    return issues;
  };

  /**
   * Check compatibility with existing upgrade parts
   */
  useEffect(() => {
    if (!initialProduct) {
      navigate(-1);
      return;
    }

    // Check compatibility with current upgrade parts
    const upgradeProgress = JSON.parse(localStorage.getItem('pc-upgrade-progress') || '{}');
    const currentParts = upgradeProgress.currentParts || {};
    const selectedComponents = Object.values(currentParts).filter(item => item !== null);

    if (selectedComponents.length > 0) {
      const catLower = (categoryKey || '').toLowerCase();
      const issues = checkCategoryCompatibility(catLower, currentParts);

      if (issues.length > 0) {
        compatibilityNoteRef.current = {
          type: 'warning',
          issues: issues
        };
      } else {
        compatibilityNoteRef.current = {
          type: 'compatible',
          message: 'This component appears compatible with your current build'
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Format price
   */
  const formatPrice = (price) => {
    return `₱${(price || 0).toLocaleString('en-PH')}`;
  };

  /**
   * Handle add to upgrade
   */
  const handleAddToUpgrade = () => {
    try {
      // Map category ID to currentParts key format
      // 🔥 FIX: Changed 'gpu' mapping from 'graphcard' to 'gpu' to match PCUpgrade.js
      const categoryKeyMap = {
        'processor': 'cpu',
        'cpu': 'cpu',
        'gpu': 'gpu',  // 🔥 FIXED: Changed from 'graphcard' to 'gpu'
        'graphcard': 'gpu',  // 🔥 FIXED: Changed from 'graphcard' to 'gpu'
        'ram': 'ram',
        'storage': 'storage',
        'motherboard': 'motherboard',
        'psu': 'power supply',
        'power supply': 'power supply',
        'cpu-cooler': 'cpu-cooler',
        'cooling': 'cpu-cooler',
        'chassis': 'case',
        'case': 'case'
      };

      const currentPartsKey = categoryKeyMap[categoryKey] || categoryKey;
      
      console.log('🔧 Adding to upgrade:', {
        categoryKey,
        currentPartsKey,
        productName: product.name
      });

      // Get current upgrade progress from localStorage
      const upgradeProgress = JSON.parse(localStorage.getItem('pc-upgrade-progress') || '{}');

      // 🔥 CRITICAL FIX: Save to pc-upgrade-selections (actual parts to BUY)
      // NOT to pc-upgrade-current (which contains AI-estimated build for display only)
      
      // Load actual upgrade selections (NOT the estimated build)
      const upgradeParts = JSON.parse(localStorage.getItem('pc-upgrade-selections') || '{}');
      
      // Update the upgrade parts with selected product
      upgradeParts[currentPartsKey] = {
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        price: product.sale_price || product.price,
        image: product.imageUrl || product.image_url || product.file_path || product.image,
        image_url: product.image_url || product.imageUrl || product.file_path || product.image,
        imageUrl: product.imageUrl || product.image_url || product.file_path || product.image,
        quantity: 1,
        stock: product.stock,
        specifications: product.specifications
      };

      // Update upgrade progress
      upgradeProgress.upgradeParts = upgradeParts;
      localStorage.setItem('pc-upgrade-progress', JSON.stringify(upgradeProgress));

      // 🔥 FIX: Save to pc-upgrade-selections (actual parts to purchase)
      localStorage.setItem('pc-upgrade-selections', JSON.stringify(upgradeParts));
      
      console.log('✅ Saved upgrade selection:', currentPartsKey, '→', upgradeParts[currentPartsKey].name);
      console.log('📦 All upgrade selections:', upgradeParts);

      // Show success modal
      showAddedModalRef.current = true;
      
      // Auto-hide after 2 seconds and redirect back to PC Upgrade Step 3
      setTimeout(() => {
        showAddedModalRef.current = false;
        navigate('/pc-upgrade', {
          state: {
            step: 'current-parts',
            scrollToCategory: currentPartsKey,
            fromSelection: true // 🔥 FIX: Preserve state after product selection
          }
        });
      }, 2000);

    } catch (err) {
      console.error('Error adding to upgrade:', err);
      alert('Failed to add product to upgrade. Please try again.');
    }
  };

  /**
   * Handle go back
   */
  const handleBack = () => {
    navigate('/pc-upgrade-display', {
      state: {
        categoryKey,
        categoryName,
        apiCategory: apiCategory || product.category
      }
    });
  };

  /**
   * Extract specifications from product
   */
  // Category-specific spec field mappings (data-driven to minimize CC)
  const CATEGORY_SPEC_FIELDS = {
    cpu: { cores: 'Cores', threads: 'Threads', base_clock: 'Base Clock', boost_clock: 'Boost Clock', socket: 'Socket', tdp: 'TDP' },
    processor: { cores: 'Cores', threads: 'Threads', base_clock: 'Base Clock', boost_clock: 'Boost Clock', socket: 'Socket', tdp: 'TDP' },
    gpu: { memory: 'Memory', memory_type: 'Memory Type', core_clock: 'Core Clock', boost_clock: 'Boost Clock', power_consumption: 'Power' },
    graph: { memory: 'Memory', memory_type: 'Memory Type', core_clock: 'Core Clock', boost_clock: 'Boost Clock', power_consumption: 'Power' },
    ram: { capacity: 'Capacity', speed: 'Speed', type: 'Type', memory_type: 'Memory Type', latency: 'Latency' },
    memory: { capacity: 'Capacity', speed: 'Speed', type: 'Type', memory_type: 'Memory Type', latency: 'Latency' },
    storage: { capacity: 'Capacity', type: 'Type', interface: 'Interface', read_speed: 'Read Speed', write_speed: 'Write Speed' },
    mother: { chipset: 'Chipset', socket: 'Socket', form_factor: 'Form Factor', memory_type: 'Memory Type', max_memory: 'Max Memory' },
    psu: { wattage: 'Wattage', efficiency: 'Efficiency', modular: 'Modular' },
    power: { wattage: 'Wattage', efficiency: 'Efficiency', modular: 'Modular' },
  };

  const applySpecFields = (specObj, fieldMap, prod) => {
    for (const [key, label] of Object.entries(fieldMap)) {
      if (prod[key]) specObj[label] = prod[key];
    }
  };

  const getSpecifications = () => {
    const specs = {};
    
    // Try to get specifications from specifications object first
    if (product.specifications && typeof product.specifications === 'object') {
      Object.entries(product.specifications).forEach(([key, value]) => {
        if (value) specs[key] = value;
      });
    }
    
    // Common fields
    const commonFields = { brand: 'Brand', category: 'Category', model: 'Model' };
    applySpecFields(specs, commonFields, product);
    
    // Category-specific specs (data-driven lookup)
    const catLower = (categoryKey || '').toLowerCase();
    for (const [keyword, fieldMap] of Object.entries(CATEGORY_SPEC_FIELDS)) {
      if (catLower.includes(keyword)) {
        applySpecFields(specs, fieldMap, product);
        break;
      }
    }

    return specs;
  };

  const specifications = getSpecifications();

  if (!product) {
    return (
      <div className="customized-display-container">
        <div className="pcu-product-error">
          <p>❌ Product not found</p>
          <button onClick={handleBack}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="customized-display-container">
      {/* Header - Matches CustomizedDisplay.js */}
      <div className="customized-display-header">
        <div className="customized-display-header-content">
          <img src={PCUpgrade} alt="Logo" className="customized-display-icon" />
          <div className="customized-display-header-text">
            <h2 className="customized-display-title">
              {categoryName}
            </h2>
          </div>
        </div>
      </div>

      {/* Product Display - Exact CustomizedDisplay.js Layout */}
      <div className="customized-display-product">
        {/* Product Image */}
        <KioskProductImage
          product={product}
          alt={product.name}
          className="customized-display-image"
          fallbackSrc={getFallbackImage()}
          variant="detail"
          sizes="420px"
          width="420"
          height="420"
        />

        {/* Product Info - Price first, then name (CustomizedDisplay order) */}
        <div className="customized-display-info">
          <p className="customized-display-price">
            {formatPrice(product.sale_price || product.price)}
          </p>
          <h3 className="customized-display-name">{product.name}</h3>
        </div>
      </div>

      {/* Specifications - Exact CustomizedDisplay.js Layout */}
      <div className="customized-display-specifications">
        <h3>Specifications</h3>
        {Object.keys(specifications).length > 0 ? (
          <div className="specifications-content">
            <div className="specifications-list">
              {Object.entries(specifications).map(([key, value], index) => {
                // Format the key for display
                const formattedKey = key
                  .replaceAll('_', ' ')
                  .replaceAll(/\b\w/g, l => l.toUpperCase());
                
                // Format the value
                let formattedValue;
                if (Array.isArray(value)) {
                  formattedValue = value.join(', ');
                } else if (typeof value === 'object' && value !== null) {
                  formattedValue = JSON.stringify(value);
                } else {
                  formattedValue = value?.toString() || 'N/A';
                }
                
                return (
                  <div key={`spec-${key}`} className="spec-item">
                    <span className="spec-label">{formattedKey}:</span>{' '}
                    <span className="spec-value">{formattedValue}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="no-specifications">No specifications available</p>
        )}
      </div>

      {/* Actions - Matches CustomizedDisplay.js */}
      <div className="customized-display-actions">
        <button className="customized-display-back-button" onClick={handleBack}>
          Back
        </button>
        <button 
          className="customized-display-add-button" 
          onClick={handleAddToUpgrade}
        >
          Add
        </button>
      </div>
    </div>
  );
};

export default PCUpgradeProduct;
