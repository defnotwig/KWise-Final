import React, { useEffect, useState } from "react";
import "./FutureUpgrade.css";
import { useNavigate, useLocation } from "react-router-dom";
import aiService from "../api/aiService";
import { stockAPI } from "../services/api";
import api from "../api/api";
import builderAPI from "../api/builderAPI";
import priceIcon from "../assets/FutureUpgrade/priceIcon.webp";
import costIcon from "../assets/FutureUpgrade/costIcon.webp";
import gainIcon from "../assets/FutureUpgrade/gainIcon.webp";
import availIcon from "../assets/FutureUpgrade/availIcon.webp";
import futureIcon from "../assets/FutureUpgrade/futureIcon.webp";
import futureupgrades from "../assets/FutureUpgrade/futureupgrades.svg";
import currentIcon from "../assets/FutureUpgrade/currentIcon.webp";
import upgradeIcon from "../assets/FutureUpgrade/upgradeIcon.webp";
import whyUpgradeIcon from "../assets/FutureUpgrade/whyUpgradeIcon.webp";

/**
 * Format specifications object/string to clean readable format
 * Converts JSON objects to "key: value, key: value" format
 * @param {string|object} specs - The specifications to format
 * @returns {string} Formatted specifications string
 */
const formatSpecifications = (specs) => {
  if (!specs) return 'N/A';
  
  // If already a formatted string, return it directly
  if (typeof specs === 'string') {
    // Check if it's already a nicely formatted spec string (not JSON)
    if (!specs.startsWith('{') && !specs.startsWith('[')) {
      // Clean up any raw formatting issues
      const cleaned = specs.replace(/[{}"\[\]]|\\n/g, '').trim();
      return cleaned || 'N/A';
    }
    
    // Try to parse JSON string
    try {
      specs = JSON.parse(specs);
    } catch (e) {
      // Not valid JSON, return cleaned string
      return specs.replace(/[{}"\[\]]|\\n/g, '').trim() || 'N/A';
    }
  }
  
  // If it's an array, join the elements
  if (Array.isArray(specs)) {
    if (specs.length === 0) return 'N/A';
    return specs
      .filter(item => item !== null && item !== undefined && item !== '')
      .join(', ') || 'N/A';
  }
  
  // If it's an object, format it nicely based on known spec keys
  if (typeof specs === 'object' && specs !== null) {
    const entries = Object.entries(specs);
    if (entries.length === 0) return 'N/A';
    
    // Handle raw specs array from parseSpecifications
    if (specs.raw && Array.isArray(specs.raw)) {
      const rawFormatted = specs.raw
        .filter(item => item !== null && item !== undefined && item !== '')
        .join(', ');
      if (rawFormatted) return rawFormatted;
    }
    
    // Category-specific formatting for known spec structures
    const formattedParts = [];
    
    // GPU specs
    if (specs.vram) formattedParts.push(`${specs.vram}GB VRAM`);
    if (specs.clockSpeed && !specs.cores) formattedParts.push(`${specs.clockSpeed} MHz`);
    if (specs.busWidth) formattedParts.push(`${specs.busWidth}-bit`);
    
    // CPU specs
    if (specs.cores) formattedParts.push(`${specs.cores} Cores`);
    if (specs.threads) formattedParts.push(`${specs.threads} Threads`);
    if (specs.clockSpeed && specs.cores) formattedParts.push(`${specs.clockSpeed} GHz`);
    if (specs.baseSpeed) formattedParts.push(`${specs.baseSpeed} GHz Base`);
    if (specs.boostSpeed) formattedParts.push(`${specs.boostSpeed} GHz Boost`);
    
    // RAM specs
    if (specs.capacity && !specs.readSpeed) formattedParts.push(`${specs.capacity}GB`);
    if (specs.speed) formattedParts.push(`${specs.speed} MHz`);
    if (specs.type && (specs.type.includes('DDR') || specs.type === 'NVMe' || specs.type === 'SATA')) {
      formattedParts.push(specs.type);
    }
    
    // Storage specs
    if (specs.capacity && specs.readSpeed) formattedParts.push(`${specs.capacity}`);
    if (specs.readSpeed) formattedParts.push(`${specs.readSpeed} MB/s Read`);
    if (specs.writeSpeed) formattedParts.push(`${specs.writeSpeed} MB/s Write`);
    
    // PSU specs
    if (specs.wattage) formattedParts.push(`${specs.wattage}W`);
    if (specs.efficiency) formattedParts.push(specs.efficiency);
    if (specs.modular) formattedParts.push(specs.modular);
    
    // Cooling specs
    if (specs.fanSize) formattedParts.push(`${specs.fanSize}mm Fan`);
    if (specs.tdp) formattedParts.push(`${specs.tdp}W TDP`);
    if (specs.coolingType) formattedParts.push(specs.coolingType);
    
    // If we found category-specific specs, return them
    if (formattedParts.length > 0) {
      return formattedParts.join(', ');
    }
    
    // Fallback: format all key-value pairs generically
    const formatted = entries
      .filter(([key, value]) => {
        // Skip internal/raw keys and empty values
        if (key === 'raw' || key === '_original') return false;
        return value !== null && value !== undefined && value !== '';
      })
      .map(([key, value]) => {
        // Format the key: replace underscores with spaces, add spaces before capitals
        const formattedKey = key
          .replace(/_/g, ' ')
          .replace(/([A-Z])/g, ' $1')
          .replace(/^\w/, c => c.toUpperCase())
          .trim();
        
        // Format the value
        let formattedValue = value;
        if (typeof value === 'boolean') {
          formattedValue = value ? 'Yes' : 'No';
        } else if (typeof value === 'number') {
          formattedValue = value.toLocaleString();
        } else if (typeof value === 'object') {
          formattedValue = JSON.stringify(value).replace(/[{}"\[\]]|\\n/g, '');
        }
        
        return `${formattedKey}: ${formattedValue}`;
      })
      .join(', ');
    
    return formatted || 'N/A';
  }
  
  return String(specs) || 'N/A';
};

function FutureUpgrade() {
  const [cartItems, setCartItems] = useState([]);
  const [aiUpgradeSuggestions, setAiUpgradeSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiDiagnosticEnabled, setAiDiagnosticEnabled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 🔥 CRITICAL FIX: Prioritize storedCart (PC Parts) over customOrders to prevent duplicate suggestions
    // Order: storedCart (PC Parts ordering) → customOrders (AI Customization) → prebuiltCart (PreBuilt PCs)
    const customOrders = JSON.parse(localStorage.getItem("customOrders")) || [];
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    const prebuiltCart = JSON.parse(localStorage.getItem("prebuiltCart")) || [];

    console.log('🔍 FutureUpgrade - Raw data from localStorage:');
    console.log('  customOrders:', customOrders);
    console.log('  storedCart:', JSON.stringify(storedCart, null, 2));
    console.log('  prebuiltCart:', JSON.stringify(prebuiltCart, null, 2));

    let cartItems = [];
    
    // 🔥 FIX: Check storedCart FIRST for standard PC Parts ordering flow
    if (storedCart.length > 0 && storedCart[0] && !('product' in storedCart[0])) {
      // Standard PC Parts cart structure: [{id, name, category, price, uniqueId, ...}]
      console.log('🛒 Using standard PC Parts cart (cart key)');
      cartItems = storedCart.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: parseFloat((item.price || '0').toString().replace(/[^\d.]/g, '')) || 0,
        specifications: item.specifications || item.details || '',
        quantity: item.quantity || 1,
        image: item.image,
        uniqueId: item.uniqueId
      }));
    } else if (customOrders.length > 0) {
      // AI Customization flow - flatten custom orders into individual items
      console.log('🤖 Using AI Customization orders (customOrders key)');
      cartItems = customOrders.flatMap(order =>
        order.items.filter(Boolean) // Remove undefined/null items
      );
    } else if (prebuiltCart.length > 0) {
      // ✅ NEW: Handle prebuiltCart structure (from PreBuilt PC flow)
      console.log('📦 Detected PreBuilt cart structure (prebuiltCart key)');
      
      cartItems = prebuiltCart.flatMap((item, itemIdx) => {
        const items = [];
        
        console.log(`  🔍 Processing prebuilt item ${itemIdx + 1}:`, item);
        
        // Extract components from customized prebuilt
        if (item.components && Array.isArray(item.components)) {
          console.log(`    - Components array length: ${item.components.length}`);
          
          item.components.forEach((comp, idx) => {
            console.log(`      [${idx}] Component:`, comp);
            
            // PreBuilt components have structure: {cpu: {...}, gpu: {...}, etc.}
            // OR array structure: [{name: "CPU", value: "AMD..."}, ...]
            let componentName, componentValue, componentCategory;
            
            if (comp.name && comp.value) {
              // Array structure: {name: "CPU", value: "AMD RYZEN 7"}
              componentCategory = comp.name;
              componentValue = comp.value;
              componentName = comp.value;
            } else if (typeof comp === 'object') {
              // Object structure: extract category from key
              const entries = Object.entries(comp);
              if (entries.length > 0) {
                [componentCategory, componentValue] = entries[0];
                componentName = componentValue?.name || componentValue;
              }
            }
            
            if (componentName && componentValue) {
              const componentItem = {
                name: componentName,
                category: componentCategory || 'Component',
                price: comp.price || 0,
                specifications: comp.specifications || '',
                quantity: item.quantity || 1,
                isPreBuiltComponent: true
              };
              items.push(componentItem);
              console.log(`        ✅ Added component: ${componentCategory} = ${componentName}`);
            } else {
              console.warn(`        ⚠️ Skipping invalid component at index ${idx}:`, comp);
            }
          });
        }
        
        // Add peripherals if exists
        if (item.peripherals && Array.isArray(item.peripherals)) {
          item.peripherals.forEach(peripheral => {
            items.push({
              name: peripheral.name || 'Peripheral',
              category: peripheral.category || 'Peripheral',
              price: peripheral.price || 0,
              specifications: peripheral.specifications || '',
              quantity: peripheral.quantity || 1,
              isPeripheral: true
            });
          });
        }
        
        return items;
      });
      
      console.log('📊 Final extracted prebuilt cart items:', cartItems.length);
    } else if (storedCart.length > 0) {
        // Check if this is Pre-Built cart structure: [{product: {...}, addon: {...}}]
      if (storedCart[0] && typeof storedCart[0] === 'object' && 'product' in storedCart[0]) {
        // Pre-Built PC structure - extract components from each product
        console.log('📦 Detected Pre-Built cart structure');

        cartItems = storedCart.flatMap((order, orderIdx) => {
          const items = [];

          console.log(`  🔍 Processing order ${orderIdx + 1}:`, order);
          console.log(`    - Product:`, order.product);
          console.log(`    - Product.components:`, order.product?.components);
          console.log(`    - Addon:`, order.addon);

          // Extract components from Pre-Built product
          if (order.product && order.product.components && Array.isArray(order.product.components)) {
            console.log(`    - Components array length: ${order.product.components.length}`);

            order.product.components.forEach((comp, idx) => {
              console.log(`      [${idx}] Component raw:`, JSON.stringify(comp));

              // More flexible validation - check various possible structures
              const hasName = comp && (comp.name || comp.componentType || comp.type);
              const hasValue = comp && (comp.value || comp.componentValue || comp.name?.includes(':'));

              if (hasName && hasValue) {
                let componentName = comp.name || comp.componentType || comp.type || 'Component';
                let componentValue = comp.value || comp.componentValue || '';

                // Handle case where name contains both (e.g., "CPU: AMD RYZEN 7")
                if (!componentValue && componentName.includes(':')) {
                  const parts = componentName.split(':');
                  componentName = parts[0].trim();
                  componentValue = parts.slice(1).join(':').trim();
                }

                if (componentValue && componentValue.trim()) {
                  const componentItem = {
                    name: componentValue, // Use the actual component value (e.g., "AMD RYZEN 7 9700X")
                    category: componentName, // Use component type as category (e.g., "CPU", "Motherboard")
                    price: 0, // Components in Pre-Built don't have individual prices
                    specifications: comp.specifications || '',
                    quantity: order.quantity || 1,
                    isPreBuiltComponent: true
                  };
                  items.push(componentItem);
                  console.log(`        ✅ Added component: ${componentName} = ${componentValue}`);
                } else {
                  console.warn(`        ⚠️ Component value is empty at index ${idx}:`, comp);
                }
              } else {
                console.warn(`        ⚠️ Skipping invalid component at index ${idx} (hasName: ${hasName}, hasValue: ${hasValue}):`, comp);
              }
            });
          } else {
            console.warn('    ⚠️ No valid components array found in product');
            console.warn('    Product structure:', Object.keys(order.product || {}));
          }

          // Add addon if exists
          if (order.addon && order.addon.name) {
            const addonItem = {
              name: order.addon.name,
              category: order.addon.category || 'Gaming Monitors',
              price: order.addon.price || 0,
              specifications: order.addon.specifications || '',
              quantity: order.quantity || 1,
              isAddon: true
            };
            items.push(addonItem);
            console.log(`      ✅ Added addon: ${order.addon.name}`);
          }

          return items;
        });

        console.log('📊 Final extracted cart items:', cartItems.length);
        cartItems.forEach((item, idx) => {
          console.log(`  [${idx}] ${item.category}: ${item.name}${item.isAddon ? ' (ADDON)' : ''}`);
        });
      } else {
        // Regular PC Parts structure
        console.log('📦 Detected regular PC Parts structure');
        cartItems = storedCart;
      }
    }

    if (cartItems.length === 0) {
      console.error('❌ No cart items extracted! Check localStorage structure.');
    }

    setCartItems(cartItems);
  }, []);

  useEffect(() => {
    if (cartItems.length === 0) return;

    const generateAIUpgradeSuggestions = async () => {
      setLoading(true);
      try {
        console.log('🔮🤖 Generating enhanced dual upgrade suggestions...');

        // Prepare current build components for AI analysis
        const currentBuild = cartItems.map(item => ({
          name: item.name || 'Unknown Component',
          category: item.category || 'Unknown',
          price: parseFloat((item.price || '0').toString().replace(/[^\d.]/g, '')) || 0,
          specifications: item.specifications || '',
          quantity: item.quantity || 1
        }));

        console.log('📦 Current build for dual upgrade analysis:', currentBuild.length, 'components');

        // Try using enhanced kiosk hot picks endpoint (dual recommendations)
        try {
          const upgradeResponse = await aiService.getKioskHotPicks(
            currentBuild,
            100000, // ₱100k budget range for upgrades
            {
              analysisType: 'future_upgrade_dual',
              timeframe: '1-2 years',
              maxRecommendations: cartItems.length * 2, // 2 recommendations per item
              enhanceWithAI: true,
              marketTrends: '2024-2025 Philippines gaming and productivity trends',
              dualUpgrade: true // Request dual options
            }
          );

          if (upgradeResponse.success && upgradeResponse.data?.recommendations?.length > 0) {
            // Group recommendations by component (2 per component)
            const groupedSuggestions = [];
            const recommendations = upgradeResponse.data.recommendations;

            // 🔥 FIX: Store original cart length to prevent processing dynamically added items
            const originalCartLength = cartItems.length;
            for (let i = 0; i < originalCartLength; i++) {
              const component = cartItems[i];
              const stockUpgrade = recommendations.find(rec =>
                rec.type === 'stock_upgrade' && rec.category === component.category
              );
              const externalUpgrade = recommendations.find(rec =>
                rec.type === 'external_upgrade' && rec.category === component.category
              );

              if (stockUpgrade || externalUpgrade) {
                groupedSuggestions.push({
                  componentIndex: i,
                  currentItem: component.name,
                  category: component.category,
                  upgrades: [stockUpgrade, externalUpgrade].filter(Boolean)
                });
              }
            }

            if (groupedSuggestions.length > 0) {
              setAiUpgradeSuggestions(groupedSuggestions);
              setAiDiagnosticEnabled(true);
              console.log('🔮✅ Enhanced dual upgrade suggestions generated:', groupedSuggestions.length, 'components');
              return;
            } else {
              console.log('ℹ️ AI service returned no matched suggestions, proceeding with RuleBuilder + Builder API compatibility system...');
            }
          }
        } catch (aiError) {
          console.log('ℹ️ AI service unavailable, using RuleBuilder + Builder API compatibility system:', aiError.message);
        }

        // 🔄 Generate In-Stock upgrades + Individual Complete Builds per cart item using RuleBuilder + Builder API
        console.log('🔄 Generating In-Stock upgrade suggestions + Complete Builds using RuleBuilder + Builder API (3200+ compatibility rules)...');
        console.log('📊 Cart items to process:', cartItems.length);
        console.log('🔍 Cart item categories:', cartItems.map(i => i.category).join(', '));
        const stockSuggestions = [];

        // Define component order for complete build (8 components total)
        const componentOrder = ['CPU', 'Cooling', 'Motherboard', 'RAM', 'Storage', 'GPU', 'Case', 'PSU'];
        
        // 🔥 CRITICAL FIX: Only process ACTUAL cart items (not expanded components)
        const originalCartLength = cartItems.length;
        console.log('🎯 Generating', originalCartLength, 'FutureUpgrade suggestions (1 per cart item)');

        // Use only actual cart items - no test components
        for (let index = 0; index < originalCartLength; index++) {
          const cartItem = cartItems[index];
          
          // 🔥 FIX: Skip if this item doesn't have a name (invalid)
          if (!cartItem || !cartItem.name) {
            console.warn(`⚠️ Skipping invalid cart item at index ${index}:`, cartItem);
            continue;
          }
          let itemPrice = parseFloat((cartItem.price || '0').toString().replace(/[^\d.]/g, '')) || 0;

          // 🔥 FIX: Query database for actual product category
          let categoryName = cartItem.category || 'Component';
          let actualProduct = null;
          
          try {
            // Try to find product in database by name to get proper category
            const searchResult = await stockAPI.getAll({
              search: cartItem.name,
              limit: 1,
              status: 'active'
            });
            
            const products = searchResult.data?.data || searchResult.data || [];
            if (products.length > 0 && products[0].name.toLowerCase() === cartItem.name.toLowerCase()) {
              actualProduct = products[0];
              categoryName = actualProduct.category || categoryName;
              if (itemPrice === 0) {
                itemPrice = parseFloat(actualProduct.price) || itemPrice;
              }
              console.log(`   ✅ Found product in DB: ${actualProduct.name} - Category: ${categoryName}`);
            } else {
              // Fallback to detection
              const detectedCategory = detectCategoryFromName(cartItem.name, cartItem.category);
              categoryName = detectedCategory !== 'Component' ? detectedCategory : categoryName;
              console.log(`   ⚠️ Product not in DB, detected category: ${categoryName}`);
            }
          } catch (error) {
            console.warn(`   ⚠️ Error querying DB for product, using detection:`, error.message);
            const detectedCategory = detectCategoryFromName(cartItem.name, cartItem.category);
            categoryName = detectedCategory !== 'Component' ? detectedCategory : categoryName;
          }

          // 🔥 FIX: Estimate price for PreBuilt components (price = 0)
          if (itemPrice === 0 && cartItem.isPreBuiltComponent) {
            itemPrice = estimateComponentPrice(cartItem.name, categoryName);
            console.log(`   💰 Estimated price for PreBuilt component: ₱${itemPrice.toLocaleString()}`);
          }

          console.log(`🔍 Processing upgrade ${index + 1}/${cartItems.length}: ${cartItem.name}`);
          console.log(`   💡 Original category: "${cartItem.category}" → Detected: "${categoryName}" - ₱${itemPrice.toLocaleString()}`);

          // 🔥 ASYNC DATABASE QUERY - Generate In-Stock upgrade only
          const stockUpgrade = await generateStockUpgrade(cartItem, itemPrice, categoryName, index);

          if (stockUpgrade) {
            console.log(`  ✅ Generated stock upgrade: ${stockUpgrade.upgradeItem} - ₱${stockUpgrade.price}`);
            
            // 🏗️ Generate complete build for this upgrade
            const buildComponents = {};
            
            // Add upgraded component
            buildComponents[categoryName] = stockUpgrade;
            
            // Generate compatible components for all other categories
            for (const cat of componentOrder) {
              if (cat !== categoryName && !buildComponents[cat]) {
                const compatibleComponent = await generateCompatibleComponent(cat, buildComponents, categoryName);
                if (compatibleComponent) {
                  buildComponents[cat] = compatibleComponent;
                }
              }
            }
            
            // Build complete compatible build
            const completeBuild = await generateCompleteBuild(buildComponents, componentOrder);
            
            // 🔥 CRITICAL FIX: Only add if build is compatible (score >= 70)
            if (completeBuild && completeBuild.isCompatible && completeBuild.compatibilityScore >= 70) {
              stockSuggestions.push({
                componentIndex: index,
                currentItem: cartItem.name,
                category: categoryName,
                upgrade: stockUpgrade,
                suggestedBuild: completeBuild // Individual build per upgrade
              });
              console.log(`  ✅ Added COMPATIBLE suggestion (Score: ${completeBuild.compatibilityScore})`);
            } else {
              console.warn(`  ⚠️ Skipping INCOMPATIBLE build (Score: ${completeBuild?.compatibilityScore || 0}) - warnings:`, completeBuild?.compatibilityWarnings);
            }
          } else {
            console.warn(`  ⚠️ No stock upgrade found for ${categoryName}`);
          }
        }
        
        console.log('📊 Final In-Stock suggestions count:', stockSuggestions.length);
        setAiUpgradeSuggestions(stockSuggestions);
        setAiDiagnosticEnabled(false);
        console.log('✅ In-Stock upgrade suggestions + Complete Builds ready');

      } catch (error) {
        console.error('⚠️ Future upgrade generation failed:', error);
        setAiUpgradeSuggestions([]);
        setAiDiagnosticEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    // 🔧 HELPER: Estimate price for PreBuilt components (price = 0)
    function estimateComponentPrice(componentName, category) {
      // Philippine market average prices for PreBuilt components (2024-2025)
      const priceEstimates = {
        'CPU': 15000,        // Mid-tier Ryzen/Intel
        'GPU': 25000,        // Mid-high tier GPU
        'RAM': 5000,         // 16-32GB DDR4/DDR5
        'Storage': 4000,     // 512GB-1TB SSD
        'Motherboard': 8000, // B550/B650 chipset
        'PSU': 4000,         // 650-750W Bronze+
        'Case': 3000,        // Mid-range case
        'Cooling': 3500,     // AIO/Air cooler
        'Monitor': 8000,     // 24" Gaming monitor
        'Keyboard': 2000,
        'Mouse': 1500,
        'Headset': 2500
      };

      let basePrice = priceEstimates[category] || 5000;

      // Adjust based on component name indicators
      const nameLower = (componentName || '').toLowerCase();

      // High-end indicators (increase price)
      if (nameLower.includes('rtx 4090') || nameLower.includes('rtx 4080')) {
        basePrice *= 3;
      } else if (nameLower.includes('rtx 4070') || nameLower.includes('rtx 4060 ti')) {
        basePrice *= 1.8;
      } else if (nameLower.includes('rtx 4060') || nameLower.includes('rx 7800')) {
        basePrice *= 1.4;
      } else if (nameLower.includes('ryzen 9') || nameLower.includes('i9')) {
        basePrice *= 2;
      } else if (nameLower.includes('ryzen 7') || nameLower.includes('i7')) {
        basePrice *= 1.5;
      } else if (nameLower.includes('ryzen 5') || nameLower.includes('i5')) {
        basePrice *= 1.2;
      }

      // Capacity indicators
      if (nameLower.includes('64gb') || nameLower.includes('2tb')) {
        basePrice *= 1.8;
      } else if (nameLower.includes('32gb') || nameLower.includes('1tb')) {
        basePrice *= 1.3;
      }

      // Brand premium
      if (nameLower.includes('asus rog') || nameLower.includes('msi gaming')) {
        basePrice *= 1.2;
      }

      return Math.round(basePrice);
    }

    // 🔧 Generate compatible component for complete build using Builder API compatibility filtering
    async function generateCompatibleComponent(category, existingBuild, upgradedCategory) {
      try {
        console.log(`   🔍 Finding compatible ${category} for upgraded ${upgradedCategory}...`);
        
        // 🔥 NEW: Use Builder API for intelligent compatibility filtering
        let compatibleProducts = [];
        
        try {
          // Build current parts object for compatibility check with FULL component details
          const selectedParts = {};
          for (const [cat, comp] of Object.entries(existingBuild)) {
            if (comp && comp.dbProduct) {
              // 🔥 FIX: Pass full component details, not just ID
              selectedParts[cat] = {
                id: comp.dbProduct.id,
                name: comp.dbProduct.name || comp.name,
                // Include critical specs for compatibility filtering
                socket: comp.dbProduct.socket || comp.dbProduct.specifications?.socket,
                memory_type: comp.dbProduct.memory_type || comp.dbProduct.specifications?.memory_type,
                specifications: comp.dbProduct.specifications || {}
              };
            }
          }
          
          // Get compatible options from Builder API (uses RuleEngine + compatibility rules)
          if (Object.keys(selectedParts).length > 0) {
            compatibleProducts = await builderAPI.getAvailableOptions(category, selectedParts);
            console.log(`   🎯 Builder API returned ${compatibleProducts.length} compatible ${category} options`);
          }
        } catch (apiError) {
          console.warn(`   ⚠️ Builder API unavailable, falling back to price-based search:`, apiError.message);
        }
        
        // Fallback: Query for compatible component in mid-range price if API fails
        if (compatibleProducts.length === 0) {
          const targetPrice = 10000; // Mid-range default
          compatibleProducts = await queryUpgradeProducts(category, targetPrice);
          console.log(`   📦 Fallback search found ${compatibleProducts.length} ${category} options`);
        }
        
        if (compatibleProducts.length === 0) {
          console.warn(`   ⚠️ No compatible ${category} found`);
          return null;
        }
        
        // 🔥 ENHANCED: Try to find compatible product by checking socket/ram type compatibility
        let selectedProduct = null;
        
        if (category === 'Motherboard' && existingBuild.CPU) {
          // Find motherboard with matching socket
          const cpuSocket = existingBuild.CPU.dbProduct?.socket || existingBuild.CPU.dbProduct?.specifications?.socket;
          selectedProduct = compatibleProducts.find(p => 
            p.specifications?.socket === cpuSocket || p.socket === cpuSocket
          );
          if (selectedProduct) {
            console.log(`   ✅ Found Motherboard with matching CPU socket: ${cpuSocket}`);
          }
        } else if (category === 'RAM' && existingBuild.Motherboard) {
          // Find RAM with matching memory type
          const moboRamType = existingBuild.Motherboard.dbProduct?.specifications?.memory_type || 
                             existingBuild.Motherboard.dbProduct?.memory_type;
          selectedProduct = compatibleProducts.find(p => 
            p.specifications?.memory_type === moboRamType || p.memory_type === moboRamType
          );
          if (selectedProduct) {
            console.log(`   ✅ Found RAM matching Motherboard memory type: ${moboRamType}`);
          }
        } else if (category === 'CPU' && existingBuild.Motherboard) {
          // Find CPU with matching socket
          const moboSocket = existingBuild.Motherboard.dbProduct?.socket || 
                            existingBuild.Motherboard.dbProduct?.specifications?.socket;
          selectedProduct = compatibleProducts.find(p => 
            p.specifications?.socket === moboSocket || p.socket === moboSocket
          );
          if (selectedProduct) {
            console.log(`   ✅ Found CPU matching Motherboard socket: ${moboSocket}`);
          }
        } else if (category === 'Cooling' && existingBuild.CPU) {
          // Find cooling compatible with CPU socket
          const cpuSocket = existingBuild.CPU.dbProduct?.socket || existingBuild.CPU.dbProduct?.specifications?.socket;
          selectedProduct = compatibleProducts.find(p => {
            const compatSockets = p.specifications?.compatible_sockets || p.compatible_sockets || '';
            return compatSockets.includes(cpuSocket);
          });
          if (selectedProduct) {
            console.log(`   ✅ Found Cooling compatible with CPU socket: ${cpuSocket}`);
          }
        }
        
        // Fallback to first product if no specific match found
        if (!selectedProduct) {
          selectedProduct = compatibleProducts[0];
          console.log(`   ℹ️ No specific compatibility match, using first available ${category}`);
        }
        
        return {
          id: selectedProduct.id,
          upgradeItem: selectedProduct.name,
          name: selectedProduct.name,
          price: parseFloat(selectedProduct.price),
          category: category,
          // 🔥 CRITICAL FIX: Backend returns imageUrl (camelCase) not image_url
          image: selectedProduct.imageUrl 
            ? api.utils.getFullImageUrl(selectedProduct.imageUrl) 
            : (selectedProduct.image_url ? api.utils.getFullImageUrl(selectedProduct.image_url) 
            : (selectedProduct.image ? api.utils.getFullImageUrl(selectedProduct.image) : null)),
          dbProduct: selectedProduct,
          upgradeSpecs: selectedProduct.specifications || '',
          currentSpecs: ''
        };
      } catch (error) {
        console.error(`   ❌ Error generating compatible ${category}:`, error);
        return null;
      }
    }

    // 🏗️ Generate Complete Compatible Build with all 8 upgraded components
    async function generateCompleteBuild(buildComponents, componentOrder) {
      console.log('🔧 Generating complete compatible build with 8 components...');
      
      const buildForAPI = {};
      let totalPrice = 0;
      const components = [];
      let missingComponents = [];

      // Build in proper order and track missing components
      for (const category of componentOrder) {
        const component = buildComponents[category];
        if (component) {
          // Store full component for display
          const fullComponent = {
            id: component.dbProduct?.id || component.id,
            name: component.upgradeItem || component.name,
            price: component.price,
            category: category,
            image: component.image,
            specifications: component.upgradeSpecs || component.currentSpecs || ''
          };
          components.push(fullComponent);
          totalPrice += component.price;
          
          // Send full component details to backend for compatibility check
          const dbProduct = component.dbProduct || {};
          buildForAPI[category] = {
            id: dbProduct.id || component.id,
            name: dbProduct.name || component.name || component.upgradeItem,
            socket: dbProduct.socket || dbProduct.specifications?.socket,
            memory_type: dbProduct.memory_type || dbProduct.specifications?.memory_type,
            specifications: dbProduct.specifications || {}
          };
        } else {
          missingComponents.push(category);
        }
      }

      // ⚠️ Ensure all 8 components are present
      if (missingComponents.length > 0) {
        console.warn(`⚠️ Build incomplete - missing: ${missingComponents.join(', ')}`);
      }

      // Check compatibility using backend API (RuleEngine + compatibilityService)
      let compatibilityScore = 100;
      let compatibilityWarnings = [];
      
      try {
        const compatResult = await builderAPI.checkCompatibility(buildForAPI);
        if (compatResult.score !== undefined) {
          compatibilityScore = compatResult.score;
        }
        if (compatResult.warnings) {
          compatibilityWarnings = compatResult.warnings;
        }
        console.log(`✅ Compatibility check complete: ${compatibilityScore}/100 score, ${components.length}/8 components`);
      } catch (error) {
        console.warn('⚠️ Compatibility check failed:', error.message);
        // Reduce score if compatibility check fails
        compatibilityScore = 50;
      }

      return {
        components,
        totalPrice,
        compatibilityScore,
        compatibilityWarnings,
        isCompatible: compatibilityScore >= 70
      };
    }

    // 🔧 HELPER: Detect correct category from product name
    function detectCategoryFromName(productName, fallbackCategory) {
      if (!productName) return fallbackCategory || 'Component';

      const nameLower = productName.toLowerCase();

      // CPU detection
      if (nameLower.includes('ryzen') || nameLower.includes('intel') ||
        nameLower.includes('core i') || nameLower.includes('processor') ||
        nameLower.includes('cpu') || nameLower.includes('threadripper') ||
        nameLower.match(/i[3579]-\d+/)) {
        return 'CPU';
      }

      // GPU detection
      if (nameLower.includes('rtx') || nameLower.includes('gtx') ||
        nameLower.includes('rx ') || nameLower.includes('radeon') ||
        nameLower.includes('geforce') || nameLower.includes('graphics card') ||
        nameLower.includes('gpu') || nameLower.includes('vega')) {
        return 'GPU';
      }

      // RAM detection
      if (nameLower.includes('ram') || nameLower.includes('memory') ||
        nameLower.includes('ddr') || nameLower.includes('dimm') ||
        nameLower.match(/\d+gb.*ddr/)) {
        return 'RAM';
      }

      // Storage detection
      if (nameLower.includes('ssd') || nameLower.includes('hdd') ||
        nameLower.includes('nvme') || nameLower.includes('hard drive') ||
        nameLower.includes('storage') || nameLower.includes('m.2')) {
        return 'Storage';
      }

      // Motherboard detection
      if (nameLower.includes('motherboard') || nameLower.includes('mobo') ||
        nameLower.includes('b550') || nameLower.includes('x570') ||
        nameLower.includes('z690') || nameLower.includes('h610') ||
        nameLower.match(/[bhxz]\d{3}/)) {
        return 'Motherboard';
      }

      // PSU detection
      if (nameLower.includes('psu') || nameLower.includes('power supply') ||
        nameLower.includes('80+') || nameLower.match(/\d+w/)) {
        return 'PSU';
      }

      // Case detection
      if (nameLower.includes('case') || nameLower.includes('chassis') ||
        nameLower.includes('tower') || nameLower.includes('enclosure') ||
        nameLower.includes('phanteks') || nameLower.includes('eclipse') ||
        nameLower.includes('fractal') || nameLower.includes('nzxt') ||
        nameLower.includes('lian li') || (nameLower.includes('corsair') && nameLower.includes('rgb'))) {
        return 'Case';
      }

      // Cooling detection
      if (nameLower.includes('cooler') || nameLower.includes('cooling') ||
        nameLower.includes('aio') || nameLower.includes('fan') ||
        nameLower.includes('liquid') || nameLower.includes('heatsink')) {
        return 'Cooling';
      }

      // Monitor detection
      if (nameLower.includes('monitor') || nameLower.includes('display') ||
        nameLower.includes('screen') || nameLower.match(/\d+["']\s*(lcd|led|oled)/)) {
        return 'Monitor';
      }

      // Keyboard detection
      if (nameLower.includes('keyboard') || nameLower.includes('mechanical') ||
        nameLower.includes('keycap')) {
        return 'Keyboard';
      }

      // Mouse detection
      if (nameLower.includes('mouse') || nameLower.includes('mice')) {
        return 'Mouse';
      }

      // Headset detection
      if (nameLower.includes('headset') || nameLower.includes('headphone') ||
        nameLower.includes('earphone') || nameLower.includes('audio')) {
        return 'Headset';
      }

      console.warn(`⚠️ Could not detect category for: ${productName}, using fallback: ${fallbackCategory}`);
      return fallbackCategory || 'Component';
    }

    // 🔧 HELPER: Query database with fallback price ranges
    async function queryUpgradeProducts(category, targetPrice, attempt = 1) {
      const maxAttempts = 3;
      const priceMultipliers = [
        { min: 0.8, max: 1.2, label: '±20%' },    // Attempt 1: Tight range
        { min: 0.6, max: 1.5, label: '±40-50%' }, // Attempt 2: Wider range
        { min: 0.4, max: 2.0, label: '±60-100%' } // Attempt 3: Very wide range
      ];

      const multiplier = priceMultipliers[Math.min(attempt - 1, maxAttempts - 1)];
      const minPrice = targetPrice * multiplier.min;
      const maxPrice = targetPrice * multiplier.max;

      console.log(`   🔎 Query attempt ${attempt}/${maxAttempts}: ${category} in ₱${minPrice.toLocaleString()} - ₱${maxPrice.toLocaleString()} (${multiplier.label})`);

      try {
        const response = await stockAPI.getAll({
          category: category,
          minPrice: minPrice,
          maxPrice: maxPrice,
          limit: 10, // Increased from 5 to get more options
          status: 'active'
        });

        const products = response.data?.data || response.data || [];

        if (products.length > 0) {
          console.log(`   ✅ Found ${products.length} products`);
          return products;
        }

        // Try next attempt with wider range
        if (attempt < maxAttempts) {
          console.log(`   ⚠️ No products found, trying wider price range...`);
          return await queryUpgradeProducts(category, targetPrice, attempt + 1);
        }

        console.warn(`   ❌ No products found after ${maxAttempts} attempts`);
        return [];

      } catch (error) {
        console.error(`   ❌ Database query error:`, error);
        return [];
      }
    }

    // Helper functions for dual upgrade generation with enhanced intelligence
    async function generateStockUpgrade(cartItem, itemPrice, category, index) {
      try {
        const upgradePrice = itemPrice * 1.4; // 40% increase for stock

        console.log(`   📦 Searching stock upgrades for ${category} at ~₱${upgradePrice.toLocaleString()}`);

        // 🔥 REAL DATABASE QUERY with fallback price ranges
        const products = await queryUpgradeProducts(category, upgradePrice);

        if (products.length === 0) {
          console.warn(`   ⚠️ No stock upgrades found for ${category}`);
          return null;
        }

        // Select product (rotate through available options)
        const selectedProduct = products[index % products.length];

        console.log(`   ✅ Selected: ${selectedProduct.name} - ₱${parseFloat(selectedProduct.price).toLocaleString()}`);

        // Parse specifications for comparison
        const currentSpecs = parseSpecifications(cartItem.specifications || '', category);
        const upgradeSpecs = parseSpecifications(selectedProduct.specifications || '', category);

        // Calculate intelligent performance gain
        const performanceGain = calculateSpecBasedPerformance(currentSpecs, upgradeSpecs, category);

        // Generate persuasive upgrade reason
        const reason = generateStockUpgradeReason(
          cartItem.name,
          selectedProduct.name,
          category,
          performanceGain,
          currentSpecs,
          upgradeSpecs
        );

        return {
          id: selectedProduct.id, // Use actual database ID
          type: 'stock_upgrade',
          upgradeItem: selectedProduct.name,
          price: parseFloat(selectedProduct.price) || upgradePrice,
          priceDifference: `₱${(parseFloat(selectedProduct.price) - itemPrice).toLocaleString()}`,
          performanceGain: performanceGain,
          availability: selectedProduct.quantity > 0 ? `In Stock (${selectedProduct.quantity})` : 'In Stock',
          futureProofing: calculateFutureProofingRating(parseFloat(selectedProduct.price), itemPrice, category),
          reason: reason,
          priority: 'Stock Available',
          source: 'K-Wise Stock',
          currentSpecs: formatSpecsForDisplay(currentSpecs, category),
          upgradeSpecs: formatSpecsForDisplay(upgradeSpecs, category),
          image: api.utils.getFullImageUrl(selectedProduct.image_url || selectedProduct.image), // ✅ Real product image
          dbProduct: selectedProduct, // Store full product data for compatibility check
          category: category // Store category for build generation
        };
      } catch (error) {
        console.error(`   ❌ Error generating stock upgrade for ${category}:`, error);
        return null;
      }
    }

    // eslint-disable-next-line no-unused-vars
    async function generateAIExternalSuggestion(cartItem, itemPrice, category, index) {
      try {
        console.log(`   🤖 Using AI to suggest external market ${category} upgrade...`);

        // AI generates external market suggestions based on current trends
        const aiSuggestion = await aiService.generateExternalProductSuggestion({
          currentProduct: cartItem.name,
          category: category,
          currentPrice: itemPrice,
          targetPriceRange: [itemPrice * 1.5, itemPrice * 2.5],
          market: 'Philippines',
          year: new Date().getFullYear()
        });

        if (aiSuggestion && aiSuggestion.recommendation) {
          const recommendation = aiSuggestion.recommendation;
          return {
            id: `ai-external-${index}`,
            type: 'external_upgrade',
            upgradeItem: recommendation.productName || `Latest ${category}`,
            price: recommendation.estimatedPrice || itemPrice * 1.9,
            priceDifference: `₱${(recommendation.estimatedPrice - itemPrice).toLocaleString()}`,
            performanceGain: recommendation.performanceImprovement || '+50%',
            availability: '🌐 External Market (AI Suggested)',
            futureProofing: 'Excellent (3-5 years)',
            reason: recommendation.reason || `Latest ${category} technology available in external market`,
            priority: '🤖 AI Recommended',
            source: 'External Market - AI Suggestion',
            currentSpecs: cartItem.specifications || '',
            upgradeSpecs: recommendation.keyFeatures || 'Latest specifications',
            image: null, // No image for AI suggestions
            isAISuggestion: true
          };
        }

        return null;
      } catch (error) {
        console.error(`   ❌ AI external suggestion failed for ${category}:`, error);
        return null;
      }
    }

    // Enhanced helper functions
    // eslint-disable-next-line no-unused-vars
    function calculateIntelligentPerformanceGain(category, currentPrice, upgradePrice, type) {
      const priceRatio = upgradePrice / currentPrice;
      const baseGains = {
        'Cooling': { stock: 25, external: 45 },
        'GPU': { stock: 35, external: 65 },
        'CPU': { stock: 30, external: 55 },
        'RAM': { stock: 28, external: 50 },
        'Storage': { stock: 40, external: 70 },
        'Motherboard': { stock: 20, external: 35 },
        'PSU': { stock: 15, external: 25 },
        'Case': { stock: 10, external: 20 }
      };

      const baseGain = baseGains[category]?.[type] || 30;
      const gain = Math.round(baseGain + (priceRatio - 1) * 30);
      return `+${Math.min(Math.max(gain, 15), 85)}%`;
    }

    function calculateFutureProofingRating(upgradePrice, currentPrice, category) {
      const ratio = upgradePrice / currentPrice;
      const premiumCategories = ['GPU', 'CPU', 'Motherboard'];
      const isPremium = premiumCategories.includes(category);

      if (ratio >= 2.0 && isPremium) return 'Excellent (4+ years)';
      if (ratio >= 1.8) return 'Very Good (3-4 years)';
      if (ratio >= 1.5) return 'Good (2-3 years)';
      return 'Moderate (1-2 years)';
    }

    function generateStockUpgradeReason(currentName, upgradeName, category, performanceGain, currentSpecs, upgradeSpecs) {
      const specHighlight = getKeySpecDifference(currentSpecs, upgradeSpecs, category);
      return `${upgradeName} offers ${performanceGain} improvement over ${currentName}. ${specHighlight} Available immediately from our stock with warranty support and reliable operation.`;
    }

    // 🔥 NEW HELPER FUNCTIONS FOR REAL SPEC PARSING AND COMPARISON

    /**
     * Parse specifications string into structured object
     */
    function parseSpecifications(specString, category) {
      if (!specString) return {};

      try {
        // If it's already a JSON object
        if (typeof specString === 'object') return specString;

        // Try to parse as JSON first
        try {
          return JSON.parse(specString);
        } catch (e) {
          // Not JSON, parse as text
        }

        // Parse text-based specifications
        const specs = {};
        const lines = specString.split(/[,;\n]/);

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Extract key-value pairs
          if (trimmed.includes(':')) {
            const [key, value] = trimmed.split(':').map(s => s.trim());
            specs[key.toLowerCase()] = value;
          } else {
            // Store as raw text
            if (!specs.raw) specs.raw = [];
            specs.raw.push(trimmed);
          }
        }

        // Category-specific parsing
        switch (category) {
          case 'GPU':
            specs.vram = extractNumber(specString, /(\d+)\s*GB/i);
            specs.clockSpeed = extractNumber(specString, /(\d+)\s*MHz/i);
            break;
          case 'CPU':
            specs.cores = extractNumber(specString, /(\d+)\s*cores/i);
            specs.threads = extractNumber(specString, /(\d+)\s*threads/i);
            specs.clockSpeed = extractNumber(specString, /(\d+\.?\d*)\s*GHz/i);
            break;
          case 'RAM':
            specs.capacity = extractNumber(specString, /(\d+)\s*GB/i);
            specs.speed = extractNumber(specString, /(\d+)\s*MHz/i);
            break;
          case 'Storage':
            specs.capacity = extractNumber(specString, /(\d+)\s*(TB|GB)/i);
            specs.readSpeed = extractNumber(specString, /(\d+)\s*MB\/s\s*read/i);
            specs.type = specString.match(/(NVMe|SATA|M\.2)/i)?.[1];
            break;
          case 'PSU':
            specs.wattage = extractNumber(specString, /(\d+)\s*W/i);
            specs.efficiency = specString.match(/(80\+\s*(Bronze|Silver|Gold|Platinum|Titanium))/i)?.[1];
            break;
          default:
            // No specific parsing needed for other categories
            break;
        }

        return specs;
      } catch (error) {
        console.error('Error parsing specifications:', error);
        return {};
      }
    }

    /**
     * Extract number from string using regex
     */
    function extractNumber(str, regex) {
      const match = str.match(regex);
      return match ? parseFloat(match[1]) : null;
    }

    /**
     * Calculate performance gain based on actual specifications
     */
    function calculateSpecBasedPerformance(currentSpecs, upgradeSpecs, category, isPremium = false) {
      let gainPercentage = 30; // Default

      try {
        switch (category) {
          case 'GPU':
            if (currentSpecs.vram && upgradeSpecs.vram) {
              const vramGain = ((upgradeSpecs.vram - currentSpecs.vram) / currentSpecs.vram) * 100;
              gainPercentage = Math.round(vramGain * 0.7); // VRAM contributes 70% to perceived performance
            }
            if (currentSpecs.clockSpeed && upgradeSpecs.clockSpeed) {
              const clockGain = ((upgradeSpecs.clockSpeed - currentSpecs.clockSpeed) / currentSpecs.clockSpeed) * 100;
              gainPercentage += Math.round(clockGain * 0.3); // Clock contributes 30%
            } 
            break;

          case 'CPU':
            if (currentSpecs.cores && upgradeSpecs.cores) {
              const coreGain = ((upgradeSpecs.cores - currentSpecs.cores) / currentSpecs.cores) * 100;
              gainPercentage = Math.round(coreGain * 0.5);
            }
            if (currentSpecs.clockSpeed && upgradeSpecs.clockSpeed) {
              const clockGain = ((upgradeSpecs.clockSpeed - currentSpecs.clockSpeed) / currentSpecs.clockSpeed) * 100;
              gainPercentage += Math.round(clockGain * 0.5);
            }
            break;

          case 'RAM':
            if (currentSpecs.capacity && upgradeSpecs.capacity) {
              const capacityGain = ((upgradeSpecs.capacity - currentSpecs.capacity) / currentSpecs.capacity) * 100;
              gainPercentage = Math.round(capacityGain * 0.6);
            }
            if (currentSpecs.speed && upgradeSpecs.speed) {
              const speedGain = ((upgradeSpecs.speed - currentSpecs.speed) / currentSpecs.speed) * 100;
              gainPercentage += Math.round(speedGain * 0.4);
            }
            break;

          case 'Storage':
            if (currentSpecs.readSpeed && upgradeSpecs.readSpeed) {
              const speedGain = ((upgradeSpecs.readSpeed - currentSpecs.readSpeed) / currentSpecs.readSpeed) * 100;
              gainPercentage = Math.round(speedGain);
            }
            if (currentSpecs.type === 'SATA' && upgradeSpecs.type === 'NVMe') {
              gainPercentage += 50; // NVMe bonus
            }
            break;

          case 'PSU':
            if (currentSpecs.wattage && upgradeSpecs.wattage) {
              const wattageGain = ((upgradeSpecs.wattage - currentSpecs.wattage) / currentSpecs.wattage) * 100;
              gainPercentage = Math.round(wattageGain * 0.5);
            }
            break;

          default:
            // Use default gain percentage for other categories
            gainPercentage = 30;
            break;
        }

        // Apply premium boost
        if (isPremium) {
          gainPercentage = Math.round(gainPercentage * 1.3);
        }

        // Clamp between 15% and 85%
        gainPercentage = Math.min(Math.max(gainPercentage, 15), 85);

      } catch (error) {
        console.error('Error calculating spec-based performance:', error);
      }

      return `+${gainPercentage}%`;
    }

    /**
     * Get key specification difference for persuasive text
     */
    function getKeySpecDifference(currentSpecs, upgradeSpecs, category) {
      try {
        switch (category) {
          case 'GPU':
            if (upgradeSpecs.vram && currentSpecs.vram) {
              return `Upgrade from ${currentSpecs.vram}GB to ${upgradeSpecs.vram}GB VRAM for smoother gaming and rendering.`;
            }
            break;
          case 'CPU':
            if (upgradeSpecs.cores && currentSpecs.cores) {
              return `${upgradeSpecs.cores} cores vs ${currentSpecs.cores} cores means ${Math.round((upgradeSpecs.cores - currentSpecs.cores) / currentSpecs.cores * 100)}% more multitasking power.`;
            }
            break;
          case 'RAM':
            if (upgradeSpecs.capacity && currentSpecs.capacity) {
              return `Double your memory from ${currentSpecs.capacity}GB to ${upgradeSpecs.capacity}GB for seamless multitasking.`;
            }
            break;
          case 'Storage':
            if (upgradeSpecs.readSpeed && currentSpecs.readSpeed) {
              return `${Math.round(upgradeSpecs.readSpeed / currentSpecs.readSpeed)}x faster load times with ${upgradeSpecs.readSpeed}MB/s read speed.`;
            }
            break;
          case 'PSU':
            if (upgradeSpecs.efficiency) {
              return `${upgradeSpecs.efficiency} efficiency means lower power bills and cooler operation.`;
            }
            break;

          default:
            // Return generic message for other categories
            return 'Enhanced specifications for better performance.';
        }
      } catch (error) {
        console.error('Error generating spec difference:', error);
      }

      return 'Enhanced specifications for better performance.';
    }

    /**
     * Format specifications for display
     */
    function formatSpecsForDisplay(specs, category) {
      if (!specs || Object.keys(specs).length === 0) {
        return 'Standard specifications';
      }

      try {
        switch (category) {
          case 'GPU':
            return `${specs.vram || '?'}GB VRAM, ${specs.clockSpeed || '?'} MHz`;
          case 'CPU':
            return `${specs.cores || '?'} cores, ${specs.threads || '?'} threads, ${specs.clockSpeed || '?'} GHz`;
          case 'RAM':
            return `${specs.capacity || '?'}GB, ${specs.speed || '?'} MHz`;
          case 'Storage':
            return `${specs.capacity || '?'}, ${specs.readSpeed || '?'} MB/s, ${specs.type || 'SATA'}`;
          case 'PSU':
            return `${specs.wattage || '?'}W, ${specs.efficiency || '80+ Bronze'}`;
          default:
            if (specs.raw && specs.raw.length > 0) {
              return specs.raw.join(', ');
            }
            return JSON.stringify(specs).substring(0, 100);
        }
      } catch (error) {
        return 'Standard specifications';
      }
    }

    // eslint-disable-next-line no-unused-vars
    function getComponentSpecs(componentName, category) {
      // Extract specifications from component name or provide category defaults
      const specs = {
        'Cooling': 'Standard air cooling, basic thermal performance',
        'GPU': 'Standard graphics performance, basic gaming capabilities',
        'CPU': 'Standard processing power, basic multitasking',
        'RAM': 'Standard memory capacity and speed',
        'Storage': 'Standard storage performance and capacity',
        'Motherboard': 'Standard connectivity and features',
        'PSU': 'Standard power delivery and efficiency',
        'Case': 'Standard build quality and airflow'
      };

      return specs[category] || 'Standard specifications';
    }

    generateAIUpgradeSuggestions();
  }, [cartItems]);

  return (
    <div className="upgrade-page">
      <img src={futureupgrades} alt="Logo" className="upgrade-logo" />
      <h1 className="upgrade-title">
        Future Upgrades Predictions
        {aiDiagnosticEnabled && <span className="ai-badge">🤖 AI</span>}
      </h1>
      <span className="AI-identifyer"> Powered by AI </span>


      {cartItems.length === 0 ? (
        <p className="upgrade-empty">Your cart is empty. Please add PC parts first.</p>
      ) : loading ? (
        <p className="loading-text">🔄 Analyzing your build with Enhanced AI...</p>
      ) : (
        <div className="llama-suggestions">


          {aiUpgradeSuggestions.length > 0 ? (
            <>
              <h2>
                {aiDiagnosticEnabled && <span className="ai-verification">✅ Verified by AI</span>}
              </h2>
              <div className="suggestion-grid-container">
                <div className="vertical-scroll-container">

                  {/* Single row layout with all components horizontally */}
                  {aiUpgradeSuggestions.map((component, idx) => (
                    <div key={`component-wrapper-${component.componentIndex || idx}`} className="upgrade-card-container">
                      {/* Current Component Display - Matches Reference Design */}
                      <div className="current-component-display">
                        <h2 className="current-component-title">
                          <span className="current-category-label">Current {component.category}:</span>{' '}
                          <span className="current-item-name">{component.currentItem}</span>
                        </h2>
                      </div>

                      <div className="component-upgrade-section">
                        <div className="upgrade-content-wrapper">
                          {/* In-Stock Upgrade Section */}
                          <div className="upgrade-left">
                            {component.upgrade && (
                              <div className="upgrade-option stock_upgrade">
                                <div className="upgrade-header">
                                  <div className="source-label">{component.upgrade.source}</div>
                                </div>

                                {/* 🔥 REAL PRODUCT IMAGE FROM DATABASE */}
                                {component.upgrade.image && (
                                  <div className="upgrade-image-container">
                                    <img
                                      src={component.upgrade.image}
                                      alt={component.upgrade.upgradeItem}
                                      className="upgrade-image"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                    <div className="upgrade-image-placeholder" style={{ display: 'none' }}>
                                      📦
                                    </div>
                                  </div>
                                )}

                                <div className="upgrade-details">
                                  <div className="upgrade-specs">
                                    <div className="spec-row">
                                      <div className="spec-label-left">
                                        <img src={priceIcon} alt="" className="spec-icon" />
                                        <span className="spec-title">Price:</span>
                                      </div>
                                      <span className="spec-value-future">₱{component.upgrade.price.toLocaleString()}</span>
                                    </div>
                                    <div className="spec-row">
                                      <div className="spec-label-left">
                                        <img src={costIcon} alt="" className="spec-icon" />
                                        <span className="spec-title">Cost:</span>
                                      </div>
                                      <span className="spec-value-future upgrade-cost">{component.upgrade.priceDifference}</span>
                                    </div>
                                    <div className="spec-row">
                                      <div className="spec-label-left">
                                        <img src={gainIcon} alt="" className="spec-icon" />
                                        <span className="spec-title">Gain:</span>
                                      </div>
                                      <span className="spec-value-future performance-gain">{component.upgrade.performanceGain}</span>
                                    </div>
                                    <div className="spec-row">
                                      <div className="spec-label-left">
                                        <img src={availIcon} alt="" className="spec-icon" />
                                        <span className="spec-title">Avail:</span>
                                      </div>
                                      <span className="spec-value-future availability in-stock">In Stock</span>
                                    </div>
                                    <div className="spec-row">
                                      <div className="spec-label-left">
                                        <img src={futureIcon} alt="" className="spec-icon" />
                                        <span className="spec-title">Future:</span>
                                      </div>
                                      <span className="spec-value-future future-proof">{component.upgrade.futureProofing.split('(')[0]}</span>
                                    </div>
                                  </div>

                                  <div className="upgrade-name-container">
                                    <div className="upgrade-name">{component.upgrade.upgradeItem}</div>
                                  </div>

                                  {component.upgrade.currentSpecs && component.upgrade.upgradeSpecs && (
                                    <div className="spec-comparison">
                                        <div className="spec-comparison-row">
                                          <div className="spec-label-left">
                                            <img src={currentIcon} alt="" className="spec-icon" />
                                            <span className="spec-title">Current:</span>
                                          </div>
                                          <span className="spec-comparison-value current">
                                            {formatSpecifications(component.upgrade.currentSpecs)}
                                          </span>
                                        </div>
                                        <div className="spec-comparison-row">
                                          <div className="spec-label-left">
                                            <img src={upgradeIcon} alt="" className="spec-icon" />
                                            <span className="spec-title">Upgrade:</span>
                                          </div>
                                          <span className="spec-comparison-value upgrade">
                                            {formatSpecifications(component.upgrade.upgradeSpecs)}
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                  <div className="upgrade-reason">
                                    <div className="reason-label">
                                      <img src={whyUpgradeIcon} alt="" className="spec-icon" />Why Upgrade:</div>
                                    <p className="reason-text">{component.upgrade.reason}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Suggested Complete Build Section */}
                          {component.suggestedBuild && component.suggestedBuild.components && (
                            <div className="upgrade-right">
                              <div className="suggested-build-section">
                                <div className="suggested-build-header">
                                  <h3> SUGGESTED BUILD</h3>
                                </div>
                                
                                {component.suggestedBuild.compatibilityWarnings && component.suggestedBuild.compatibilityWarnings.length > 0 && (
                                  <div className="compatibility-warnings">
                                    {component.suggestedBuild.compatibilityWarnings.map((warning, idx) => (
                                      <div key={idx} className={`warning-item ${warning.severity}`}>
                                        {warning.message}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="future-build-components-list">
                                  {component.suggestedBuild.components.map((comp, idx) => (
                                    <div key={idx} className="future-build-component-item">
                                      {comp.image && (
                                        <img 
                                          src={comp.image} 
                                          alt={comp.name} 
                                          className="future-build-component-image"
                                          onError={(e) => {
                                            console.error(`❌ Image failed to load for ${comp.name}:`, comp.image);
                                          }}
                                        />
                                      )}
                                      <div className="future-build-component-details">
                                        <div className="future-build-component-label">{comp.category}</div>
                                        <div className="future-build-component-name">
                                          {comp.name && comp.name !== 'Name of Cooler' && comp.name !== 'Name of Motherboard' && 
                                           comp.name !== 'Name of RAM' && comp.name !== 'Name of Storage' && 
                                           comp.name !== 'Name of GPU' && comp.name !== 'Name of Case' ? 
                                            comp.name : `Name of ${comp.category}`}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="no-suggestions-message">
              <p className="no-suggestions-text">✨ Generating personalized upgrade recommendations...</p>
              <p className="no-suggestions-subtext">This should only take a moment.</p>
            </div>
          )}
        </div>
      )}
      <button
        className="not-today-btn"
        onClick={() => {
          // Preserve explicit origin when available; otherwise infer from storage
          const cart = JSON.parse(localStorage.getItem("cart")) || [];
          const customOrders = JSON.parse(localStorage.getItem("customOrders")) || [];
          let origin = location.state?.from || null;
          if (!origin) {
            if (customOrders.length > 0) origin = "pc-customized";
            else if (cart.length > 0 && cart[0] && typeof cart[0] === 'object' && 'product' in cart[0]) origin = "prebuilt-pc";
            else origin = "pc-parts";
          }
          navigate("/payment-window", { state: { from: origin } });
        }}
      >
        Not Today
      </button>
    </div>
  );
}

export default FutureUpgrade;
