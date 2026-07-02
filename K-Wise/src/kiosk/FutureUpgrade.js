import React, { useEffect, useState } from "react";
import "./FutureUpgrade.css";
import { useNavigate, useLocation } from "react-router-dom";
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

// Data-driven spec formatting rules (eliminates if-chains in formatSpecifications)
const SPEC_FORMAT_RULES = [
  { key: 'vram', guard: null, fmt: v => `${v}GB VRAM` },
  { key: 'clockSpeed', guard: s => !s.cores, fmt: v => `${v} MHz` },
  { key: 'busWidth', guard: null, fmt: v => `${v}-bit` },
  { key: 'cores', guard: null, fmt: v => `${v} Cores` },
  { key: 'threads', guard: null, fmt: v => `${v} Threads` },
  { key: 'clockSpeed', guard: s => !!s.cores, fmt: v => `${v} GHz` },
  { key: 'baseSpeed', guard: null, fmt: v => `${v} GHz Base` },
  { key: 'boostSpeed', guard: null, fmt: v => `${v} GHz Boost` },
  { key: 'capacity', guard: s => !s.readSpeed, fmt: v => `${v}GB` },
  { key: 'speed', guard: null, fmt: v => `${v} MHz` },
  { key: 'type', guard: (_, v) => v?.includes?.('DDR') || v === 'NVMe' || v === 'SATA', fmt: v => v },
  { key: 'capacity', guard: s => !!s.readSpeed, fmt: v => `${v}` },
  { key: 'readSpeed', guard: null, fmt: v => `${v} MB/s Read` },
  { key: 'writeSpeed', guard: null, fmt: v => `${v} MB/s Write` },
  { key: 'wattage', guard: null, fmt: v => `${v}W` },
  { key: 'efficiency', guard: null, fmt: v => v },
  { key: 'modular', guard: null, fmt: v => v },
  { key: 'fanSize', guard: null, fmt: v => `${v}mm Fan` },
  { key: 'tdp', guard: null, fmt: v => `${v}W TDP` },
  { key: 'coolingType', guard: null, fmt: v => v },
];

// Performance metric weights per category
const PERF_METRICS = {
  GPU: [{ cur: 'vram', upg: 'vram', w: 0.7 }, { cur: 'clockSpeed', upg: 'clockSpeed', w: 0.3 }],
  CPU: [{ cur: 'cores', upg: 'cores', w: 0.5 }, { cur: 'clockSpeed', upg: 'clockSpeed', w: 0.5 }],
  RAM: [{ cur: 'capacity', upg: 'capacity', w: 0.6 }, { cur: 'speed', upg: 'speed', w: 0.4 }],
  Storage: [{ cur: 'readSpeed', upg: 'readSpeed', w: 1 }],
  PSU: [{ cur: 'wattage', upg: 'wattage', w: 0.5 }]
};

// Spec difference message generators per category
const SPEC_DIFF_GENERATORS = {
  GPU: (cur, upg) => (upg.vram && cur.vram) ? `Upgrade from ${cur.vram}GB to ${upg.vram}GB VRAM for smoother gaming and rendering.` : null,
  CPU: (cur, upg) => (upg.cores && cur.cores) ? `${upg.cores} cores vs ${cur.cores} cores means ${Math.round((upg.cores - cur.cores) / cur.cores * 100)}% more multitasking power.` : null,
  RAM: (cur, upg) => (upg.capacity && cur.capacity) ? `Double your memory from ${cur.capacity}GB to ${upg.capacity}GB for seamless multitasking.` : null,
  Storage: (cur, upg) => (upg.readSpeed && cur.readSpeed) ? `${Math.round(upg.readSpeed / cur.readSpeed)}x faster load times with ${upg.readSpeed}MB/s read speed.` : null,
  PSU: (cur, upg) => upg.efficiency ? `${upg.efficiency} efficiency means lower power bills and cooler operation.` : null
};

// Compatibility matchers for generateCompatibleComponent
const COMPATIBILITY_MATCHERS = [
  {
    category: 'Motherboard', dependsOn: 'CPU',
    getSpec: build => build.CPU?.dbProduct?.socket || build.CPU?.dbProduct?.specifications?.socket,
    match: (p, spec) => p.specifications?.socket === spec || p.socket === spec
  },
  {
    category: 'RAM', dependsOn: 'Motherboard',
    getSpec: build => build.Motherboard?.dbProduct?.specifications?.memory_type || build.Motherboard?.dbProduct?.memory_type,
    match: (p, spec) => p.specifications?.memory_type === spec || p.memory_type === spec
  },
  {
    category: 'CPU', dependsOn: 'Motherboard',
    getSpec: build => build.Motherboard?.dbProduct?.socket || build.Motherboard?.dbProduct?.specifications?.socket,
    match: (p, spec) => p.specifications?.socket === spec || p.socket === spec
  },
  {
    category: 'Cooling', dependsOn: 'CPU',
    getSpec: build => build.CPU?.dbProduct?.socket || build.CPU?.dbProduct?.specifications?.socket,
    match: (p, spec) => (p.specifications?.compatible_sockets || p.compatible_sockets || '').includes(spec)
  }
];

// Compute weighted spec gain from metrics array
const computeSpecGain = (metrics, currentSpecs, upgradeSpecs) => {
  let total = 0;
  let hasData = false;
  for (const m of metrics) {
    if (currentSpecs[m.cur] && upgradeSpecs[m.upg]) {
      const gain = ((upgradeSpecs[m.upg] - currentSpecs[m.cur]) / currentSpecs[m.cur]) * 100;
      total += Math.round(gain * m.w);
      hasData = true;
    }
  }
  return hasData ? total : 30;
};

// Format a single entry value for generic spec display
const formatEntryValue = (value) => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'object') return JSON.stringify(value).replaceAll(/[{}"[\]]|\\n/g, '');
  return value;
};

// Format object specs using data-driven rules + generic fallback
const formatObjectSpecs = (specs) => {
  const entries = Object.entries(specs);
  if (entries.length === 0) return 'N/A';

  if (specs.raw && Array.isArray(specs.raw)) {
    const rawFormatted = specs.raw.filter(item => item != null && item !== '').join(', ');
    if (rawFormatted) return rawFormatted;
  }

  const formattedParts = [];
  for (const rule of SPEC_FORMAT_RULES) {
    const val = specs[rule.key];
    if (!val) continue;
    if (rule.guard && !rule.guard(specs, val)) continue;
    formattedParts.push(rule.fmt(val));
  }
  if (formattedParts.length > 0) return formattedParts.join(', ');

  const formatted = entries
    .filter(([key, value]) => key !== 'raw' && key !== '_original' && value != null && value !== '')
    .map(([key, value]) => {
      const formattedKey = key.replaceAll('_', ' ').replaceAll(/([A-Z])/g, ' $1').replace(/^\w/, c => c.toUpperCase()).trim();
      return `${formattedKey}: ${formatEntryValue(value)}`;
    })
    .join(', ');

  return formatted || 'N/A';
};

/**
 * Format specifications object/string to clean readable format
 */
const formatSpecifications = (specs) => {
  if (!specs) return 'N/A';

  if (typeof specs === 'string') {
    if (!specs.startsWith('{') && !specs.startsWith('[')) {
      return specs.replaceAll(/[{}"[\]]|\\n/g, '').trim() || 'N/A';
    }
    try {
      specs = JSON.parse(specs);
    } catch {
      return specs.replaceAll(/[{}"[\]]|\\n/g, '').trim() || 'N/A';
    }
  }

  if (Array.isArray(specs)) {
    return specs.length === 0 ? 'N/A' : (specs.filter(item => item != null && item !== '').join(', ') || 'N/A');
  }

  if (typeof specs === 'object' && specs !== null) {
    return formatObjectSpecs(specs);
  }

  return typeof specs === 'object' ? JSON.stringify(specs) : String(specs) || 'N/A';
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

    console.log(`🔍 FutureUpgrade - localStorage: customOrders=${customOrders.length}, storedCart=${storedCart.length}, prebuiltCart=${prebuiltCart.length}`);

    let cartItems = [];
    
    // 🔥 FIX: Check storedCart FIRST for standard PC Parts ordering flow
    if (storedCart.length > 0 && storedCart[0] && !('product' in storedCart[0])) {
      // Standard PC Parts cart structure: [{id, name, category, price, uniqueId, ...}]
      console.log('🛒 Using standard PC Parts cart (cart key)');
      cartItems = storedCart.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: Number.parseFloat((item.price || '0').toString().replaceAll(/[^\d.]/g, '')) || 0,
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
        
        console.log(`  🔍 Processing prebuilt item ${itemIdx + 1}`);
        
        // Extract components from customized prebuilt
        if (item.components && Array.isArray(item.components)) {
          console.log(`    - Components array length: ${item.components.length}`);
          
          item.components.forEach((comp, idx) => {
            console.log(`      [${idx}] Component: ${comp?.name || comp?.value || 'unknown'}`);
            
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
              console.warn(`        ⚠️ Skipping invalid component at index ${idx}`);
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

          console.log(`  🔍 Processing order ${orderIdx + 1}: product=${order.product?.name || 'unknown'}, components=${order.product?.components?.length || 0}, addon=${!!order.addon}`);

          // Extract components from Pre-Built product
          if (Array.isArray(order.product?.components)) {
            console.log(`    - Components array length: ${order.product.components.length}`);

            order.product.components.forEach((comp, idx) => {
              console.log(`      [${idx}] Component: ${comp?.name || comp?.componentType || 'unknown'}`);

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

                if (componentValue?.trim()) {
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
          if (order.addon?.name) {
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

    // Helper: Resolve category and price for a cart item from DB or detection
    async function resolveCartItemCategory(cartItem) {
      let itemPrice = Number.parseFloat((cartItem.price || '0').toString().replaceAll(/[^\d.]/g, '')) || 0;
      let categoryName = cartItem.category || 'Component';
      try {
        const searchResult = await stockAPI.getAll({ search: cartItem.name, limit: 1, status: 'active' });
        const products = searchResult.data?.data || searchResult.data || [];
        if (products.length > 0 && products[0].name.toLowerCase() === cartItem.name.toLowerCase()) {
          categoryName = products[0].category || categoryName;
          if (itemPrice === 0) itemPrice = Number.parseFloat(products[0].price) || itemPrice;
        } else {
          const detected = detectCategoryFromName(cartItem.name, cartItem.category);
          if (detected !== 'Component') categoryName = detected;
        }
      } catch {
        const detected = detectCategoryFromName(cartItem.name, cartItem.category);
        if (detected !== 'Component') categoryName = detected;
      }
      if (itemPrice === 0 && cartItem.isPreBuiltComponent) {
        itemPrice = estimateComponentPrice(cartItem.name, categoryName);
      }
      return { itemPrice, categoryName };
    }

    // Helper: Build complete compatible build for an upgrade
    async function generateUpgradeBuild(stockUpgrade, categoryName, componentOrder) {
      const buildComponents = { [categoryName]: stockUpgrade };
      for (const cat of componentOrder) {
        if (cat !== categoryName && !buildComponents[cat]) {
          const comp = await generateCompatibleComponent(cat, buildComponents, categoryName);
          if (comp) buildComponents[cat] = comp;
        }
      }
      return generateCompleteBuild(buildComponents, componentOrder);
    }

    const generateOfflineUpgradeSuggestions = async () => {
      setLoading(true);
      try {
        // Generate stock upgrades + complete builds using local inventory and deterministic compatibility.
        const componentOrder = ['CPU', 'Cooling', 'Motherboard', 'RAM', 'Storage', 'GPU', 'Case', 'PSU'];
        const stockSuggestions = [];
        const originalCartLength = cartItems.length;

        for (let index = 0; index < originalCartLength; index++) {
          const cartItem = cartItems[index];
          if (!cartItem?.name) continue;

          const { itemPrice, categoryName } = await resolveCartItemCategory(cartItem);
          const stockUpgrade = await generateStockUpgrade(cartItem, itemPrice, categoryName, index);

          if (stockUpgrade) {
            const completeBuild = await generateUpgradeBuild(stockUpgrade, categoryName, componentOrder);
            if (completeBuild?.isCompatible && completeBuild.compatibilityScore >= 70) {
              stockSuggestions.push({
                componentIndex: index,
                currentItem: cartItem.name,
                category: categoryName,
                upgrade: stockUpgrade,
                suggestedBuild: completeBuild
              });
            }
          }
        }

        setAiUpgradeSuggestions(stockSuggestions);
        setAiDiagnosticEnabled(false);


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
            if (comp?.dbProduct) {
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
        
        // 🔥 ENHANCED: Find compatible product using data-driven compatibility matchers
        let selectedProduct = null;
        const matcher = COMPATIBILITY_MATCHERS.find(m => m.category === category && existingBuild[m.dependsOn]);
        const refSpec = matcher?.getSpec(existingBuild);
        if (matcher && refSpec) {
          selectedProduct = compatibleProducts.find(p => matcher.match(p, refSpec));
        }
        
        // Fallback to first product if no specific match found
        if (!selectedProduct) {
          selectedProduct = compatibleProducts[0];
          console.log(`   ℹ️ No specific compatibility match, using first available ${category}`);
        }
        
        // Resolve product image URL from available fields
        const rawImageUrl = selectedProduct.imageUrl || selectedProduct.image_url || selectedProduct.image;
        const resolvedImage = rawImageUrl ? api.utils.getFullImageUrl(rawImageUrl) : null;

        return {
          id: selectedProduct.id,
          upgradeItem: selectedProduct.name,
          name: selectedProduct.name,
          price: Number.parseFloat(selectedProduct.price),
          category: category,
          image: resolvedImage,
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
        { min: 0.4, max: 2, label: '±60-100%' } // Attempt 3: Very wide range
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

        console.log(`   ✅ Selected: ${selectedProduct.name} - ₱${Number.parseFloat(selectedProduct.price).toLocaleString()}`);

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
          price: Number.parseFloat(selectedProduct.price) || upgradePrice,
          priceDifference: `₱${(Number.parseFloat(selectedProduct.price) - itemPrice).toLocaleString()}`,
          performanceGain: performanceGain,
          availability: selectedProduct.quantity > 0 ? `In Stock (${selectedProduct.quantity})` : 'In Stock',
          futureProofing: calculateFutureProofingRating(Number.parseFloat(selectedProduct.price), itemPrice, category),
          reason: reason,
          priority: 'Stock Available',
          source: 'K-Wise Stock',
          currentSpecs: formatSpecsForDisplay(currentSpecs, category),
          upgradeSpecs: formatSpecsForDisplay(upgradeSpecs, category),
          image: api.utils.getFullImageUrl(selectedProduct.imageUrl || selectedProduct.image_url || selectedProduct.image), // ✅ Real product image
          dbProduct: selectedProduct, // Store full product data for compatibility check
          category: category // Store category for build generation
        };
      } catch (error) {
        console.error(`   ❌ Error generating stock upgrade for ${category}:`, error);
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

      if (ratio >= 2 && isPremium) return 'Excellent (4+ years)';
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
        } catch { // Not JSON, parse as text
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
      return match ? Number.parseFloat(match[1]) : null;
    }

    /**
     * Calculate performance gain based on actual specifications
     */
    function calculateSpecBasedPerformance(currentSpecs, upgradeSpecs, category, isPremium = false) {
      let gainPercentage = 30;
      try {
        const metrics = PERF_METRICS[category];
        if (metrics) {
          gainPercentage = computeSpecGain(metrics, currentSpecs, upgradeSpecs);
          if (category === 'Storage' && currentSpecs.type === 'SATA' && upgradeSpecs.type === 'NVMe') {
            gainPercentage += 50;
          }
        }
        if (isPremium) gainPercentage = Math.round(gainPercentage * 1.3);
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
        const generator = SPEC_DIFF_GENERATORS[category];
        if (generator) {
          const msg = generator(currentSpecs, upgradeSpecs);
          if (msg) return msg;
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
      } catch { // Spec parsing may fail for unusual formats
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

    generateOfflineUpgradeSuggestions();
  }, [cartItems]);

  return (
    <div className="upgrade-page">
      <img src={futureupgrades} alt="Logo" className="upgrade-logo" />
      <h1 className="upgrade-title">
        Future Upgrades Predictions
        {aiDiagnosticEnabled && <span className="ai-badge">Local</span>}
      </h1>
      <span className="AI-identifyer"> Local compatibility rules </span>


      {cartItems.length === 0 && (
        <p className="upgrade-empty">Your cart is empty. Please add PC parts first.</p>
      )}

      {cartItems.length > 0 && loading && (
        <p className="loading-text">Analyzing your build with local compatibility rules...</p>
      )}

      {cartItems.length > 0 && !loading && (
        <div className="llama-suggestions">


          {aiUpgradeSuggestions.length > 0 ? (
            <>
              <h2>
                {aiDiagnosticEnabled && <span className="ai-verification">Verified by local rules</span>}
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
                          {component.suggestedBuild?.components && (
                            <div className="upgrade-right">
                              <div className="suggested-build-section">
                                <div className="suggested-build-header">
                                  <h3> SUGGESTED BUILD</h3>
                                </div>
                                
                                {component.suggestedBuild.compatibilityWarnings && component.suggestedBuild.compatibilityWarnings.length > 0 && (
                                  <div className="compatibility-warnings">
                                    {component.suggestedBuild.compatibilityWarnings.map((warning, idx) => (
                                      <div key={`warn-${warning.severity}-${idx}`} className={`warning-item ${warning.severity}`}>
                                        {warning.message}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="future-build-components-list">
                                  {component.suggestedBuild.components.map((comp, idx) => (
                                    <div key={`build-${comp.category || idx}-${idx}`} className="future-build-component-item">
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
