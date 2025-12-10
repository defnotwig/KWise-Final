/**
 * PCUpgradeProduct.js - Detailed Product View Component  
 * UI Pattern: Matches CustomizedDisplay.js styling
 * Features: Full specifications, compatibility notes, Add to Upgrade action
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PCUpgradeProduct.css';
import api from '../api/api';
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
  
  const { product: initialProduct, categoryName, categoryKey } = location.state || {};
  
  const [product] = useState(initialProduct);
  // eslint-disable-next-line no-unused-vars
  const [showAddedModal, setShowAddedModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [compatibilityNote, setCompatibilityNote] = useState(null);

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
      // Simple compatibility check
      const issues = [];
      
      // Example compatibility checks (can be expanded)
      const catLower = (categoryKey || '').toLowerCase();
      
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

      if (issues.length > 0) {
        setCompatibilityNote({
          type: 'warning',
          issues: issues
        });
      } else if (selectedComponents.length > 0) {
        setCompatibilityNote({
          type: 'compatible',
          message: 'This component appears compatible with your current build'
        });
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
      // eslint-disable-next-line no-unused-vars
      const currentParts = upgradeProgress.currentParts || {}; // Keep for backward compatibility

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
        image: product.image_url || product.image,
        image_url: product.image_url || product.image,
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
      setShowAddedModal(true);
      
      // Auto-hide after 2 seconds and redirect back to PC Upgrade Step 3
      setTimeout(() => {
        setShowAddedModal(false);
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
        categoryName
      }
    });
  };

  /**
   * Extract specifications from product
   */
  const getSpecifications = () => {
    const specs = {};
    
    // Try to get specifications from specifications object first
    if (product.specifications && typeof product.specifications === 'object') {
      Object.entries(product.specifications).forEach(([key, value]) => {
        if (value) specs[key] = value;
      });
    }
    
    // Common fields
    if (product.brand) specs['Brand'] = product.brand;
    if (product.category) specs['Category'] = product.category;
    if (product.model) specs['Model'] = product.model;
    
    // Category-specific specs
    const catLower = (categoryKey || '').toLowerCase();
    
    if (catLower.includes('cpu') || catLower.includes('processor')) {
      if (product.cores) specs['Cores'] = product.cores;
      if (product.threads) specs['Threads'] = product.threads;
      if (product.base_clock) specs['Base Clock'] = product.base_clock;
      if (product.boost_clock) specs['Boost Clock'] = product.boost_clock;
      if (product.socket) specs['Socket'] = product.socket;
      if (product.tdp) specs['TDP'] = product.tdp;
    }
    
    if (catLower.includes('gpu') || catLower.includes('graph')) {
      if (product.memory) specs['Memory'] = product.memory;
      if (product.memory_type) specs['Memory Type'] = product.memory_type;
      if (product.core_clock) specs['Core Clock'] = product.core_clock;
      if (product.boost_clock) specs['Boost Clock'] = product.boost_clock;
      if (product.power_consumption) specs['Power'] = product.power_consumption;
    }
    
    if (catLower.includes('ram') || catLower.includes('memory')) {
      if (product.capacity) specs['Capacity'] = product.capacity;
      if (product.speed) specs['Speed'] = product.speed;
      if (product.type) specs['Type'] = product.type;
      if (product.memory_type) specs['Memory Type'] = product.memory_type;
      if (product.latency) specs['Latency'] = product.latency;
    }
    
    if (catLower.includes('storage')) {
      if (product.capacity) specs['Capacity'] = product.capacity;
      if (product.type) specs['Type'] = product.type;
      if (product.interface) specs['Interface'] = product.interface;
      if (product.read_speed) specs['Read Speed'] = product.read_speed;
      if (product.write_speed) specs['Write Speed'] = product.write_speed;
    }
    
    if (catLower.includes('mother')) {
      if (product.chipset) specs['Chipset'] = product.chipset;
      if (product.socket) specs['Socket'] = product.socket;
      if (product.form_factor) specs['Form Factor'] = product.form_factor;
      if (product.memory_type) specs['Memory Type'] = product.memory_type;
      if (product.max_memory) specs['Max Memory'] = product.max_memory;
    }
    
    if (catLower.includes('psu') || catLower.includes('power')) {
      if (product.wattage) specs['Wattage'] = product.wattage;
      if (product.efficiency) specs['Efficiency'] = product.efficiency;
      if (product.modular) specs['Modular'] = product.modular;
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

  const productImage = api.utils.getFullImageUrl(product.image_url || product.image) || getFallbackImage();

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
        <img
          src={productImage}
          alt={product.name}
          className="customized-display-image"
          onError={(e) => { e.target.src = getFallbackImage(); }}
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
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, l => l.toUpperCase());
                
                // Format the value
                let formattedValue = value;
                if (Array.isArray(value)) {
                  formattedValue = value.join(', ');
                } else if (typeof value === 'object' && value !== null) {
                  formattedValue = JSON.stringify(value);
                } else {
                  formattedValue = value?.toString() || 'N/A';
                }
                
                return (
                  <div key={index} className="spec-item">
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
