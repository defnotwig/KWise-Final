import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./OrderSumCustom.css";
import Customized from "../assets/Customized.webp";
import api from "../api/api";
import CompatibilityNotes from "../components/CompatibilityNotes/CompatibilityNotes";
import compatibilityValidator from "../utils/compatibilityValidator"; // ✅ COMPATIBILITY VALIDATION
import CompatibilityWarningModal from "../components/CompatibilityWarningModal"; // ✅ WARNING MODAL

// Utility to get price number from item
const getItemPrice = (item) => {
  if (!item?.price) return 0;
  return typeof item.price === "string"
    ? Number.parseFloat(item.price.replaceAll(/[^0-9.,]/g, "").replaceAll(',', "")) || 0
    : item.price || 0;
};

// ── Data-driven category normalization (reduces Cognitive Complexity) ──
const CATEGORY_RULES = [
  { exact: ['cpu'], includes: ['processor', 'central processing'], result: 'CPU' },
  { exact: ['gpu', 'graphics card'], includes: ['graphics', 'video card'], result: 'GPU' },
  { exact: ['motherboard'], includes: ['mobo', 'mainboard'], result: 'Motherboard' },
  { exact: ['ram', 'memory', 'memory (ram)'], includes: ['memory', 'ddr'], result: 'RAM' },
  { exact: ['storage', 'ssd', 'hdd', 'nvme'], includes: [], result: 'Storage' },
  { exact: ['psu', 'power supply'], includes: ['power'], result: 'PSU' },
  { exact: ['case', 'chassis', 'pc case'], includes: [], result: 'Case' },
  { exact: ['cooling', 'cooler'], includes: ['cpu cooler', 'cpu-cooler'], result: 'Cooling' },
  { exact: ['monitor'], includes: ['display'], result: 'Monitor' },
  { exact: ['keyboard'], includes: [], result: 'Keyboard' },
  { exact: ['mouse'], includes: [], result: 'Mouse' },
  { exact: ['headphones'], includes: ['headset'], result: 'Headphones' },
  { exact: ['speakers'], includes: [], result: 'Speakers' },
  { exact: ['webcam'], includes: [], result: 'Webcam' },
];

const mapRawCategory = (rawCategory) => {
  if (!rawCategory) return '';
  const lower = rawCategory.toLowerCase().trim();
  for (const rule of CATEGORY_RULES) {
    if (rule.exact.includes(lower)) return rule.result;
    if (rule.includes.some(kw => lower.includes(kw))) return rule.result;
  }
  return '';
};

// Name-based category inference for items lacking category metadata
const NAME_INFERENCE_RULES = [
  { keywords: ['ryzen', 'intel', 'core i', 'i5-', 'i7-', 'i9-', 'i3-'], result: 'cpu' },
  { keywords: ['rtx', 'gtx', 'radeon', 'geforce', 'rx 7', 'rx 6'], result: 'gpu' },
  { keywords: ['motherboard', 'b550', 'b650', 'b660', 'b760', 'x570', 'x670', 'z690', 'z790', 'a620', 'b450'], result: 'motherboard' },
  { keywords: ['ddr4', 'ddr5', 'dimm', 'vengeance', 'trident', 'g.skill'], result: 'ram' },
  { keywords: ['ssd', 'nvme', 'hdd', 'hard drive', 'western digital', 'seagate', 'crucial', 'adata', 'legend'], result: 'storage' },
  { keywords: ['cooler', 'deepcool', 'noctua', 'cooling', 'aio', 'liquid', 'hyper 212'], result: 'cooling' },
  { keywords: ['psu', 'power supply', 'watt', 'corsair rm', 'evga', 'seasonic', 'coolermaster mwe'], result: 'psu' },
  { keywords: ['chassis', 'darkflash', 'nzxt', 'mid tower', 'keytech', 'darkvader'], result: 'case' },
];

const inferCategoryFromName = (name) => {
  if (!name) return null;
  const nameLower = name.toLowerCase();
  for (const rule of NAME_INFERENCE_RULES) {
    if (rule.keywords.some(kw => nameLower.includes(kw))) return rule.result;
  }
  if (nameLower.includes('ram') && !nameLower.includes('program')) return 'ram';
  if (nameLower.includes('memory')) return 'ram';
  if (nameLower.includes('case') && !nameLower.includes('showcase')) return 'case';
  return null;
};

// Category field variation map (lowercase output)
const CATEGORY_FIELD_MAP = new Map([
  ['cpu', 'cpu'], ['processor', 'cpu'],
  ['gpu', 'gpu'], ['graphics', 'gpu'],
  ['motherboard', 'motherboard'], ['mobo', 'motherboard'],
  ['ram', 'ram'], ['memory', 'ram'],
  ['storage', 'storage'], ['ssd', 'storage'], ['hdd', 'storage'],
  ['psu', 'psu'], ['power', 'psu'],
  ['case', 'case'], ['chassis', 'case'],
  ['cooling', 'cooling'], ['cool', 'cooling'], ['fan', 'cooling'], ['aio', 'cooling'],
]);

const normalizeCategoryField = (category) => {
  if (!category) return null;
  const lower = category.toLowerCase().trim();
  if (CATEGORY_FIELD_MAP.has(lower)) return CATEGORY_FIELD_MAP.get(lower);
  for (const [key, value] of CATEGORY_FIELD_MAP) {
    if (lower.includes(key)) return value;
  }
  return lower || null;
};

// Stock calculation helper
const calculateTotalUsage = (orders, itemName, targetIndex, newQuantity) => {
  let total = 0;
  for (const [ordIndex, ord] of orders.entries()) {
    if (!ord?.items || !Array.isArray(ord.items)) continue;
    for (const ordItem of ord.items) {
      if (ordItem?.name === itemName) {
        total += ordIndex === targetIndex ? newQuantity : (ord.quantity || 1);
      }
    }
  }
  return total;
};

// Fetch real-time stock for an item
const fetchItemStock = async (item) => {
  try {
    const stockResponse = await api.kiosk.getCategoryProducts(
      item.category || item.categoryName, { limit: 1000 }
    );
    const currentProduct = stockResponse.data.find(p => p.id === item.id || p.name === item.name);
    return currentProduct ? currentProduct.stock : 0;
  } catch (error) {
    console.error('⚠️ Failed to fetch stock, using cached value:', error);
    return item.stock || 0;
  }
};

// Cart rebuilding helpers for Order More flow
const CATEGORY_INDEX_MAP = {
  'cpu': 0, 'processor': 0, 'central processing unit': 0,
  'cooling': 1, 'cooler': 1, 'cpu cooler': 1, 'cpu-cooler': 1,
  'motherboard': 2,
  'gpu': 5, 'graphics processing unit': 5, 'graphics': 5,
  'case': 6, 'pc case': 6, 'chassis': 6,
  'psu': 7, 'power supply': 7, 'power supply unit': 7,
};

const rebuildCartStructure = (items) => {
  const baseCartItems = new Array(8).fill(null);
  const multiSlotItems = {};
  let ramSlotIndex = 0;
  let storageM2Index = 0;
  let storageSataIndex = 0;

  items.forEach(item => {
    const cat = (item.category || item.categoryName || '').toLowerCase().trim();
    if (cat === 'ram' || cat === 'memory' || cat.includes('memory')) {
      multiSlotItems[`ram-${ramSlotIndex}`] = item;
      ramSlotIndex++;
    } else if (cat === 'storage' || cat.includes('ssd') || cat.includes('hdd') || cat.includes('nvme')) {
      const isNVMe = (item.name || '').toUpperCase().includes('NVME') ||
                    (item.name || '').toUpperCase().includes('M.2') ||
                    (item.specifications?.interface || '').includes('NVMe');
      if (isNVMe) {
        multiSlotItems[`storage-m2-${storageM2Index}`] = item;
        storageM2Index++;
      } else {
        multiSlotItems[`storage-sata-${storageSataIndex}`] = item;
        storageSataIndex++;
      }
    } else {
      const index = CATEGORY_INDEX_MAP[cat];
      if (index !== undefined) {
        baseCartItems[index] = item;
      }
    }
  });

  return { baseCartItems, multiSlotItems };
};

function OrderSumCustom() {
  const navigate = useNavigate();
  const location = useLocation();

  // Persisted list of completed custom builds
  const [orders, setOrders] = useState([]);

  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [orderIndexToRemove, setOrderIndexToRemove] = useState(null);
  const [showPreviousBuildModal, setShowPreviousBuildModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalMessage, setStockModalMessage] = useState('');

  // ✅ COMPATIBILITY VALIDATION STATE
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
  const [compatibilityValidation, setCompatibilityValidation] = useState(null);
  const [isValidatingCompatibility, setIsValidatingCompatibility] = useState(false);

  // PRIORITY 3: Compatibility checking state
  // eslint-disable-next-line react/hook-use-state
  const [, setCompatibilityData] = useState(null);
  const [loadingCompatibility, setLoadingCompatibility] = useState(false);

  // Only allow navigation back to appropriate page based on source
  const previousCategory = location.state?.selectedCategory ?? 0;

  const handleEmptyStateRedirect = useCallback(() => {
    const fromSource = location.state?.from;
    
    if (fromSource === 'customize-ai') {
      // CustomizeAI flow: Go back to CustomizeAI page
      navigate("/customize-ai");
    } else {
      // PC Customized flow: Go back to PC Customized page
      navigate("/pc-customized", {
        state: { selectedCategory: previousCategory },
      });
    }
  }, [navigate, previousCategory, location.state?.from]);

  // On mount: capture current cart as a completed order snapshot and clear cart
  useEffect(() => {
    console.log('🚀 OrderSumCustom mounted');
    console.log('📍 location.state:', location.state);
    console.log('🔑 from source:', location.state?.from);
    
    // 🔥 CRITICAL FIX: Merge cart with multiSlotCart to get ALL items including RAM/Storage slots
    const baseCart = JSON.parse(localStorage.getItem("cart")) || [];
    const multiSlotCart = JSON.parse(localStorage.getItem("multiSlotCart")) || {};
    
    // 🔥 DEBUG: Log cart items with their category fields
    console.log('🔍 DEBUG - baseCart items with categories:');
    baseCart.forEach((item, idx) => {
      if (item) {
        console.log(`  [${idx}] ${item.name}: category="${item.category}", categoryName="${item.categoryName}", type="${item.type}"`);
      }
    });
    
    console.log('🔍 DEBUG - multiSlotCart items with categories:');
    Object.entries(multiSlotCart).forEach(([key, item]) => {
      if (item) {
        console.log(`  [${key}] ${item.name}: category="${item.category}", categoryName="${item.categoryName}", type="${item.type}"`);
      }
    });
    
    // Convert multiSlotCart object to array and merge with base cart
    const multiSlotItems = Object.values(multiSlotCart).filter(item => item !== null && item !== undefined);
    
    // Filter out any RAM/Storage items from baseCart that are also in multiSlotCart (avoid duplicates)
    const baseCartFiltered = baseCart.filter(item => {
      if (!item) return false;
      const cat = (item.category || item.categoryName || '').toLowerCase();
      // Keep non-RAM/Storage items from base cart
      if (!cat.includes('ram') && !cat.includes('memory') && !cat.includes('storage')) {
        return true;
      }
      // For RAM/Storage, only keep if NOT also in multiSlotCart (by ID)
      const isDuplicateInMultiSlot = multiSlotItems.some(msItem => 
        msItem && (msItem.id === item.id || msItem.product_id === item.product_id)
      );
      return !isDuplicateInMultiSlot;
    });
    
    // Combine: filtered base cart + all multi-slot items
    const storedCart = [...baseCartFiltered, ...multiSlotItems];
    let customOrders = JSON.parse(localStorage.getItem("customOrders")) || [];

    console.log("OrderSumCustom - baseCart:", baseCart);
    console.log("OrderSumCustom - multiSlotCart:", multiSlotCart);
    console.log("OrderSumCustom - multiSlotItems:", multiSlotItems);
    console.log("OrderSumCustom - storedCart (MERGED):", storedCart);
    console.log("OrderSumCustom - storedCart length:", storedCart.length);
    console.log("OrderSumCustom - existing customOrders:", customOrders);

    // If there are items in the working cart, save them as a new order snapshot
    const hasItems = Array.isArray(storedCart) && storedCart.some(Boolean);
    console.log("OrderSumCustom - hasItems:", hasItems);
    
    if (hasItems) {
      // 🔥 CRITICAL FIX: Improved duplicate detection logic
      const isOrderMoreFlow = localStorage.getItem("orderMoreFlow") === "true";
      
      // 🔥 FIX: Check if this exact order already exists to prevent duplicates
      // Create a robust comparison key: sort items by ID and include quantities
      const createOrderKey = (items) => {
        if (!items || !Array.isArray(items) || items.length === 0) return 'empty';
        return items
          .map(item => `${item.id || item.product_id}:${item.name}:${item.quantity || 1}`)
          .sort((a, b) => a.localeCompare(b))
          .join('|');
      };
      
      const cartKey = createOrderKey(storedCart);
      
      // Check if this exact build already exists (ignore Order More flow - always create new)
      const orderExists = !isOrderMoreFlow && customOrders.some(order => {
        const orderKey = createOrderKey(order.items);
        return orderKey === cartKey;
      });

      if (orderExists) {
        console.log("⚠️ OrderSumCustom - Duplicate build detected, skipping:", cartKey);
      } else {
        // Clean up any metadata before saving
        const cleanedItems = storedCart.map(item => {
          const { _reusedFromBuild, _reuseTimestamp, ...cleanItem } = item;
          return structuredClone(cleanItem);
        });
        
        // 🔥 CRITICAL DEBUG: Log item categories before saving
        console.log('🔍 OrderSumCustom - Item categories before saving:');
        cleanedItems.forEach((item, idx) => {
          console.log(`   [${idx}] ${item?.name}: category="${item?.category}", categoryName="${item?.categoryName}", id=${item?.id}`);
        });
        
        const newOrder = {
          id: Date.now() + Math.random(), // Ensure unique ID even with rapid clicks
          items: cleanedItems,
          quantity: 1,
          createdAt: new Date().toISOString(),
        };
        customOrders = [...customOrders, newOrder];
        localStorage.setItem("customOrders", JSON.stringify(customOrders));

        console.log("✅ OrderSumCustom - Created new build:", {
          buildId: newOrder.id,
          itemCount: newOrder.items.length,
          isOrderMore: isOrderMoreFlow,
          cartKey: cartKey
        });
        console.log("📦 OrderSumCustom - Total builds:", customOrders.length);
        
        // Clear the Order More flag after creating the build
        localStorage.removeItem("orderMoreFlow");
      }

      // Clear working cart and multiSlotCart to prevent duplication when returning here again
      localStorage.removeItem("cart");
      localStorage.removeItem("multiSlotCart"); // 🔥 CRITICAL: Also clear multi-slot items
    }

    // If nothing to display, redirect back to customizer
    if ((!customOrders || customOrders.length === 0) && !hasItems) {
      console.warn('⚠️ OrderSumCustom - No orders to display, redirecting...');
      console.log('🔍 customOrders:', customOrders);
      console.log('🔍 hasItems:', hasItems);
      console.log('🔍 fromSource:', location.state?.from);
      handleEmptyStateRedirect();
      return;
    }

    console.log('✅ OrderSumCustom - Setting orders:', customOrders);
    setOrders(customOrders);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleEmptyStateRedirect]);

  // PRIORITY 3: Check compatibility when orders change
  useEffect(() => {
    const checkCompatibility = async () => {
      if (!orders || orders.length === 0) {
        setCompatibilityData(null);
        return;
      }

      setLoadingCompatibility(true);

      try {
        // Build components map from latest order
        const latestOrder = orders.at(-1);
        if (!latestOrder?.items || latestOrder.items.length === 0) {
          setCompatibilityData(null);
          setLoadingCompatibility(false);
          return;
        }

        // 🔧 FIX: Format components to match backend schema (price as number, proper structure)
        const formatComponent = (item) => {
          if (!item) return null;

          // Parse price to number
          const price = typeof item.price === "number"
            ? item.price
            : Number.parseFloat(String(item.price).replaceAll(/[^\d.]/g, "")) || 0;

          // 🔥 CRITICAL FIX: Normalize category to exact API enum values
          // API accepts: CPU, GPU, Motherboard, RAM, Storage, PSU, Case, Cooling, Monitor, Keyboard, Mouse, Headphones, Speakers, Webcam
          const rawCategory = (item.categoryName || item.category || item.type || '').toLowerCase().trim();
          
          // 🔥 DEBUG: Log when rawCategory is empty
          if (!rawCategory) {
            console.warn('⚠️ Empty rawCategory for item:', {
              name: item.name,
              id: item.id,
              categoryName: item.categoryName,
              category: item.category,
              type: item.type,
              allKeys: Object.keys(item)
            });
          }
          
          const normalizedCategory = mapRawCategory(rawCategory);
          
          // 🔥 DEBUG: Log when normalizedCategory is still empty after mapping
          if (!normalizedCategory && rawCategory) {
            console.warn('⚠️ Could not map rawCategory to API enum:', rawCategory, 'for item:', item.name);
          }

          return {
            id: item.id || item.product_id || 0,
            name: item.name || '',
            category: normalizedCategory, // API requires exact enum value
            brand: item.brand || '',
            price: price,
            stock: item.stock || 0,
            specifications: item.specifications || {},
            image_url: item.image || item.image_url || '',
            description: item.description || '',
            performance_index: item.performance_index || 0,
            quantity: item.quantity || 1
          };
        };

        // Build components object (not array)
        const components = {};
        latestOrder.items.forEach(item => {
          if (!item) return; // Skip null/undefined items

          const formatted = formatComponent(item);

          // Only add component if it has valid ID and category
          if (formatted?.id > 0 && formatted?.category) {
            const categoryKey = formatted.category.toLowerCase();
            if (categoryKey === 'cpu') components.cpu = formatted;
            else if (categoryKey === 'gpu') components.gpu = formatted;
            else if (categoryKey === 'motherboard') components.motherboard = formatted;
            else if (categoryKey === 'ram') components.ram = formatted;
            else if (categoryKey === 'storage') components.storage = formatted;
            else if (categoryKey === 'psu') components.psu = formatted;
            else if (categoryKey === 'case') components.case = formatted;
            else if (categoryKey === 'cooling') components.cooling = formatted;
            else {
              console.log('ℹ️ Skipping non-core component:', formatted.category, formatted.name);
            }
          } else {
            console.warn('⚠️ Skipping invalid component:', item.name, 'ID:', formatted?.id, 'Category:', formatted?.category);
          }
        });

        console.log('🔍 Formatted components for API:', JSON.stringify(components, null, 2));

        // Only call API if we have at least CPU and motherboard
        const hasCriticalComponents = components.cpu && components.motherboard;
        if (!hasCriticalComponents) {
          console.log('ℹ️ Skipping compatibility check - missing critical components');
          setCompatibilityData(null);
          setLoadingCompatibility(false);
          return;
        }

        // Call compatibility API using kiosk module
        const response = await api.kiosk.checkFullBuildCompatibility(components);

        if (response.success) {
          // PHASE 9 FIX: Pass response.data.data (the actual compatibility analysis) not response.data (the wrapper)
          setCompatibilityData(response.data.data);
        }
      } catch (error) {
        console.log('ℹ️ Compatibility check not available:', error.response?.data?.message || error.message);
        // Don't block user flow if compatibility check fails
        setCompatibilityData(null);
      } finally {
        setLoadingCompatibility(false);
      }
    };

    checkCompatibility();
  }, [orders]);

  // Compute price for a given order
  const orderSubtotal = (order) => {
    if (!order?.items) return 0;
    return order.items.reduce((acc, item) => acc + getItemPrice(item), 0);
  };

  // Grand total across all orders (subtotal * quantity)
  const grandTotal = orders.reduce(
    (total, order) => total + orderSubtotal(order) * (order.quantity || 1),
    0
  );

  // Quantity handlers
  const updateOrders = (next) => {
    setOrders(next);
    localStorage.setItem("customOrders", JSON.stringify(next));
  };

  const handleQuantityChange = async (index, delta) => {
    // 🔒 STOCK VALIDATION: Check if all components have enough stock before increasing
    if (delta > 0) {
      const order = orders[index];
      if (order?.items && Array.isArray(order.items)) {
        const newQuantity = (order.quantity || 1) + delta;

        // Check stock for all components in the custom build
        for (const item of order.items) {
          if (!item) continue; // Skip null items

          const itemStock = await fetchItemStock(item);
          console.log('📦 Real-time stock check:', {
            component: item.name,
            cachedStock: item.stock,
            currentStock: itemStock
          });

          const totalUsedAcrossOrders = calculateTotalUsage(orders, item.name || '', index, newQuantity);

          if (totalUsedAcrossOrders > itemStock) {
            const componentName = item.name || item.categoryName || 'Unknown Component';
            setStockModalMessage(`Cannot add more. Component "${componentName}" has insufficient stock. Total needed across all builds: ${totalUsedAcrossOrders}. Available stock: ${itemStock}.`);
            setShowStockModal(true);
            console.warn('⚠️ Insufficient component stock:', {
              component: componentName,
              stock: itemStock,
              totalNeeded: totalUsedAcrossOrders,
              currentBuildQty: newQuantity
            });
            return; // Block quantity increase
          }
        }
      }
    }

    const next = orders.map((o, i) =>
      i === index ? { ...o, quantity: Math.max(1, (o.quantity || 1) + delta) } : o
    );
    updateOrders(next);
  };

  // Remove an order (with confirmation modal)
  const requestRemoveOrder = (index) => {
    setOrderIndexToRemove(index);
    setShowRemoveModal(true);
  };

  const confirmRemoveOrder = () => {
    if (orderIndexToRemove === null) return;
    const next = orders.filter((_, i) => i !== orderIndexToRemove);
    setShowRemoveModal(false);
    setOrderIndexToRemove(null);
    updateOrders(next);
    if (next.length === 0) {
      handleEmptyStateRedirect();
    }
  };

  // "Order More" flow
  const handleOrderMore = () => {
    setShowPreviousBuildModal(true);
  };

  const handleUsePreviousYes = () => {
    setShowPreviousBuildModal(false);
    
    // Check source explicitly
    const fromSource = location.state?.from;
    
    if (fromSource === 'customize-ai') {
      // CustomizeAI flow: Reuse the latest AI build
      const last = orders.at(-1);
      if (last?.items) {
        // Separate PC components from peripherals - build properly formatted object
        // 🔥 FIX: Exclude peripherals when reusing previous build
        const buildComponents = {};
        last.items.forEach(item => {
          if (item.fromAI && !item.isPeripheral) {
            const category = item.category.toLowerCase();
            buildComponents[category] = item;
          }
        });
        
        // Save to localStorage for EditBuild to access
        localStorage.setItem('aiCustomizedBuild', JSON.stringify(buildComponents));
        
        // Navigate with the properly formatted buildComponents
        navigate("/customize-ai/edit-build", {
          state: {
            buildComponents: buildComponents,
            assessment: location.state?.assessment
          }
        });
      } else {
        // No items, go back to assessment
        navigate("/customize-ai");
      }
    } else {
      // PC Customized flow: Reuse the latest saved build by loading its items back to working cart
      // 🔥 FIX: Filter out peripherals from previous build - only keep PC components
      const last = orders.at(-1);
      if (last?.items) {
        const pcComponentsOnly = last.items.filter(item => !item.isPeripheral);
        
        // 🔥 CRITICAL FIX: Deep clone items to prevent state mutations
        const reusedItems = pcComponentsOnly.map(item => {
          const { _reusedFromBuild, _reuseTimestamp, ...cleanItem } = item;
          return structuredClone(cleanItem);
        });
        
        const { baseCartItems, multiSlotItems } = rebuildCartStructure(reusedItems);
        
        console.log('🔄 Order More - Rebuilding cart structure:');
        console.log('📦 Base cart items:', baseCartItems.map((item, idx) => item ? `[${idx}] ${item.name}` : `[${idx}] null`));
        console.log('📦 MultiSlot items:', Object.entries(multiSlotItems).map(([k, v]) => `${k}: ${v.name}`));
        
        // Save both cart structures
        localStorage.setItem("cart", JSON.stringify(baseCartItems));
        localStorage.setItem("multiSlotCart", JSON.stringify(multiSlotItems));
        
        // Store a flag indicating we're in "Order More" flow
        localStorage.setItem("orderMoreFlow", "true");
        
        // 🔥 CRITICAL FIX: Find the first missing component category
        // Menu items are in this exact order in PCCustomized.js
        const menuItemCategories = ['CPU', 'Cooling', 'Motherboard', 'RAM', 'Storage', 'GPU', 'Case', 'PSU'];
        
        // Get existing categories from cart items using robust normalization
        const existingCategories = pcComponentsOnly
          .map(item => mapRawCategory(item.category || item.categoryName))
          .filter(cat => cat !== ''); // Filter out unknowns
        
        // Find which categories are missing (required categories only - GPU is optional)
        const requiredCategories = new Set(['CPU', 'Cooling', 'Motherboard', 'RAM', 'Storage', 'Case', 'PSU']);
        const missingCategories = menuItemCategories.filter(cat => {
          const isRequired = requiredCategories.has(cat);
          const exists = existingCategories.includes(cat);
          return isRequired && !exists; // Only missing if required AND not present
        });
        
        // Find the index of the FIRST missing category in the menu order
        const firstMissingIndex = missingCategories.length > 0
          ? menuItemCategories.indexOf(missingCategories[0])
          : -1;
        
        console.log('🔍 Order More - Reused components:', pcComponentsOnly.map(i => ({ 
          name: i.name, 
          rawCategory: i.category || i.categoryName,
          normalized: mapRawCategory(i.category || i.categoryName)
        })));
        console.log('🔍 Order More - Existing categories (normalized):', existingCategories);
        console.log('🔍 Order More - Missing REQUIRED categories:', missingCategories);
        console.log('🔍 Order More - First missing category:', missingCategories[0] || 'NONE (all required components present)');
        console.log('🔍 Order More - Navigating to index:', Math.max(firstMissingIndex, 0));
        
        // Navigate to pc-customized with the index of the first missing component
        // If no required categories are missing, navigate to first category (CPU) for optional GPU
        navigate("/pc-customized", {
          state: { selectedCategory: Math.max(firstMissingIndex, 0) },
        });
      } else {
        navigate("/pc-customized", {
          state: { selectedCategory: 0 },
        });
      }
    }
  };

  const handleUsePreviousNo = () => {
    setShowPreviousBuildModal(false);
    
    // Check source explicitly
    const fromSource = location.state?.from;
    
    if (fromSource === 'customize-ai') {
      // CustomizeAI flow: Start new AI build from beginning
      localStorage.removeItem('aiCustomizedBuild');
      navigate("/customize-ai");
    } else {
      // PC Customized flow: Start a new empty build
      localStorage.removeItem("cart");
      localStorage.removeItem("multiSlotCart"); // 🔥 CRITICAL: Also clear multi-slot items
      localStorage.removeItem("customOrders"); // Clear previous orders
      navigate("/pc-customized", {
        state: { selectedCategory: 0 }, // Reset to first category (Processor)
      });
    }
  };

  // ✅ COMPATIBILITY VALIDATION BEFORE CHECKOUT
  const handleProceedToPayment = async () => {
    try {
      setIsValidatingCompatibility(true);
      
      // Get all items from all orders
      const allItems = orders.flatMap(order => order.items || []);
      
      if (allItems.length === 0) {
        alert('No items in cart to validate');
        setIsValidatingCompatibility(false);
        return;
      }

      console.log('🔍 Validating compatibility for', allItems.length, 'items before checkout');

      // 🔥 CRITICAL FIX: Helper to normalize category from multiple sources
      const normalizeCategory = (item) => {
        if (!item) return null;
        
        const category = (item.category || item.categoryName || item.type || '').toLowerCase().trim();
        
        if (!category && item.name) {
          return inferCategoryFromName(item.name);
        }
        
        return normalizeCategoryField(category);
      };

      // Convert items to components object for validation
      const buildComponents = {};
      allItems.forEach(item => {
        if (item) {
          const category = normalizeCategory(item);
          if (category) {
            // Store full item for validation (first one wins if multiple of same category)
            if (!buildComponents[category]) {
              buildComponents[category] = {
                ...item,
                category: category // Ensure category is set
              };
              console.log(`✅ Added ${category}: ${item.name}`);
            }
          } else {
            console.log(`⚠️ Could not determine category for: ${item.name}`);
          }
        }
      });

      console.log('📦 Build components for validation:', Object.keys(buildComponents));
      console.log('📦 Full build components:', buildComponents);

      // 🔥 FIX: If we have less than 2 recognized components, skip validation and go DIRECTLY to payment
      if (Object.keys(buildComponents).length < 2) {
        console.log('⚠️ Less than 2 components found, bypassing validation and going directly to payment');
        console.log('🚀 Calling proceedDirectlyToPayment()...');
        proceedDirectlyToPayment();
        return;
      }

      console.log('✅ Starting full build validation with', Object.keys(buildComponents).length, 'components...');
      
      // Call full build validation
      const validation = compatibilityValidator.validateFullBuild(buildComponents);
      
      console.log('📊 Validation result:', validation);
      console.log('📊 Validation blocking:', validation.blocking);
      console.log('📊 Validation warnings:', validation.warnings);

      if (validation.blocking) {
        // Critical issues found - block checkout
        console.log('🚫 CRITICAL issues found, showing modal to block checkout');
        setCompatibilityValidation(validation);
        setShowCompatibilityModal(true);
        setIsValidatingCompatibility(false);
        return;
      }

      // 🔥 CRITICAL FIX: Don't show modal for warnings - proceed directly
      // Warnings are informational only and should not block checkout
      if (validation.warnings && validation.warnings.length > 0) {
        console.log('⚠️ Validation warnings found but NOT blocking - proceeding to payment');
        console.log('📋 Warnings:', validation.warnings);
      }

      // No critical issues - proceed directly (ignore warnings)
      console.log('✅ No critical issues, proceeding to payment...');
      console.log('🚀 Calling proceedToPayment()...');
      setIsValidatingCompatibility(false);
      proceedToPayment();
      
    } catch (error) {
      console.error('❌ Error validating compatibility:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error message:', error.message);
      setIsValidatingCompatibility(false);
      
      // 🔥 CRITICAL: Don't ask user, just proceed directly to payment
      console.log('⚠️ Validation error occurred, proceeding directly to payment anyway...');
      proceedDirectlyToPayment();
    }
  };

  // Helper function to actually navigate to payment or future upgrades
  const proceedToPayment = () => {
    const allItems = orders.flatMap(order => order.items || []);
    const fromSource = location.state?.from || "pc-customized";
    console.log('🚀 proceedToPayment called');
    console.log('🚀 From source:', fromSource, 'with', allItems.length, 'items');
    
    // Close modal and clear validation state
    setIsValidatingCompatibility(false);
    setShowCompatibilityModal(false);
    setCompatibilityValidation(null);
    
    // 🔥 FIX: Go DIRECTLY to payment-window, skip future-upgrades
    // User expects to go to payment after clicking "Proceed to Payment"
    console.log('🚀 Navigating to /payment-window (skipping future-upgrades)');
    console.log('📦 Passing state:', { from: fromSource, cartItems: allItems });
    
    // Use setTimeout to ensure state is cleared before navigation
    setTimeout(() => {
      navigate("/payment-window", {
        state: {
          from: fromSource,
          cartItems: allItems
        },
        replace: false // Don't replace history, allow back navigation
      });
      console.log('✅ Navigation to payment-window executed');
    }, 100);
  };
  
  // Alternative: Skip future upgrades and go directly to payment
  const proceedDirectlyToPayment = () => {
    const allItems = orders.flatMap(order => order.items || []);
    const fromSource = location.state?.from || "pc-customized";
    console.log('🚀 proceedDirectlyToPayment called');
    console.log('🚀 From source:', fromSource, 'with', allItems.length, 'items');
    
    // Close modal and clear validation state
    setIsValidatingCompatibility(false);
    setShowCompatibilityModal(false);
    setCompatibilityValidation(null);
    
    console.log('🚀 Navigating to /payment-window with state:', { from: fromSource, cartItems: allItems });
    
    // Use setTimeout to ensure state is cleared before navigation
    setTimeout(() => {
      navigate("/payment-window", {
        state: { 
          from: fromSource,
          cartItems: allItems // Include cart items
        },
        replace: false
      });
      console.log('✅ Navigation command executed');
    }, 100);
  };

  return (
    <div className="order-sum-custom-container">
      <h1 className="order-sum-custom-title">ORDER SUMMARY</h1>

      <div className="order-sum-custom-orders-wrapper">
        {orders.map((order, idx) => {
          const subtotal = orderSubtotal(order);
          const totalForOrder = subtotal * (order.quantity || 1);
          return (
            <div className="order-sum-custom-itemContainer" key={order.id}>
              <div className="order-sum-custom-productWrapper">
                <img
                  src={Customized}
                  alt={`Customized Build ${idx + 1}`}
                  className="order-sum-custom-productImage"
                />
              </div>

              <div className="order-sum-custom-priceAndControls">
                <div className="order-sum-custom-priceContainer">
                  <p className="order-sum-custom-productName">Your Customized Build #{idx + 1}</p>
                  <p className="order-sum-custom-productPrice">
                    ₱{totalForOrder.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="order-sum-custom-quantityControls">
                  <button
                    className="order-sum-custom-quantityBtn"
                    disabled={(order.quantity || 1) <= 1}
                    onClick={() => handleQuantityChange(idx, -1)}
                  >
                    −
                  </button>
                  <span className="order-sum-custom-quantityProduct">{order.quantity || 1}</span>
                  <button
                    className="order-sum-custom-quantityBtn"
                    onClick={() => handleQuantityChange(idx, 1)}
                  >
                    +
                  </button>
                  <button
                    className="order-sum-custom-removeBtn"
                    onClick={() => requestRemoveOrder(idx)}
                  >
                    Remove Build
                  </button>
                </div>
              </div>

              <div className="order-sum-custom-components-summary">
                <h2 className="order-sum-custom-components-title">Components</h2>
                <div className="order-sum-custom-components-table">
                  {order.items?.filter(item => item?.name && !item.isPeripheral).map((item, itemIdx) => {
                    // 🔥 FIX: Display items directly using their actual category names to avoid mismatch
                    const displayCategory = item.categoryName || item.category || 'Component';

                    return (
                      <div key={`${order.id}-${item.name}-${itemIdx}`} className="order-sum-custom-component-row">
                        <span className="order-sum-custom-component-label">{displayCategory}</span>
                        <span className="order-sum-custom-component-value">{item.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Peripherals Section - Separate table for peripheral items */}
              {order.items?.some(item => item?.isPeripheral) && (
                <div className="order-sum-custom-peripherals-summary">
                  <h2 className="order-sum-custom-peripherals-title">Peripherals</h2>
                  <div className="order-sum-custom-peripherals-table">
                    {order.items?.filter(item => item?.name && item?.isPeripheral).map((item, itemIdx) => {
                      const displayCategory = item.category || 'Peripheral';

                      return (
                        <div key={`${order.id}-peripheral-${item.name}-${itemIdx}`} className="order-sum-custom-peripheral-row">
                          <span className="order-sum-custom-peripheral-category">{displayCategory}</span>
                          <span className="order-sum-custom-peripheral-value">{item.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PRIORITY 3: PCPartPicker-Style Compatibility Display */}
      {loadingCompatibility && (
        <div className="compatibility-loading">
          <div className="loading-spinner"></div>
          <span>Checking compatibility...</span>
        </div>
      )}

      {/* PCPartPicker-style Compatibility Notes */}
      <CompatibilityNotes
        buildComponents={orders.length > 0 ? orders.at(-1).items : []}
        buildType="pc-customized"
      />

      <div className="order-sum-custom-bottom-section">
        <div className="order-sum-custom-process-container">
          <div className="order-sum-custom-total-info">
            <h1 className="order-sum-custom-total-label">Total</h1>
            <span className="order-sum-custom-price">
              ₱{grandTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="order-sum-custom-action-buttons">
            <button
              className="order-sum-custom-order-more"
              onClick={handleOrderMore}
              disabled={!orders.length}
            >
              Order More
            </button>
            <button
              className="order-sum-custom-proceed-payment"
              onClick={handleProceedToPayment}
              disabled={!orders.length || isValidatingCompatibility}
            >
              {isValidatingCompatibility ? 'Validating Compatibility...' : 'Proceed to Payment'}
            </button>
          </div>
        </div>
      </div>

      {showStockModal && (
        <div className="pc-customized-modal-overlay">
          <div className="pc-customized-modal-background"></div>
          <div className="pc-customized-modal">
            <div className="pc-customized-modal-icon" />
            <h2 className="pc-customized-modal-title">
              <span>{stockModalMessage}</span>
            </h2>
            <div className="pc-customized-modal-buttons">
              <button className="pc-customized-modal-btn yes" onClick={() => setShowStockModal(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showRemoveModal && (
        <div className="pc-customized-modal-overlay">
          <div className="pc-customized-modal-background"></div>
          <div className="pc-customized-modal">
            <div className="pc-customized-modal-icon" />
            <h2 className="pc-customized-modal-title">
              ARE YOU SURE YOU WANT TO<br />
              <span>REMOVE ITEM?</span>
            </h2>
            <div className="pc-customized-modal-buttons">
              <button
                className="pc-customized-modal-btn"
                onClick={() => {
                  setShowRemoveModal(false);
                  setOrderIndexToRemove(null);
                }}
              >
                NO
              </button>
              <button className="pc-customized-modal-btn yes" onClick={confirmRemoveOrder}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreviousBuildModal && (
        <div className="pc-customized-modal-overlay">
          <div className="pc-customized-modal-background"></div>
          <div className="pc-customized-modal">
            <div className="pc-customized-modal-icon" />
            <h2 className="pc-customized-modal-title">
              DO YOU WANT TO<br />
              <span>USE THE PREVIOUS BUILD?</span>
            </h2>
            <div className="pc-customized-modal-buttons">
              <button className="pc-customized-modal-btn" onClick={handleUsePreviousNo}>
                NO
              </button>
              <button className="pc-customized-modal-btn yes" onClick={handleUsePreviousYes}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ COMPATIBILITY WARNING MODAL */}
      {showCompatibilityModal && compatibilityValidation && (
        <CompatibilityWarningModal
          show={showCompatibilityModal}
          compatibility={{
            score: compatibilityValidation.score || 0,
            issues: compatibilityValidation.issues || [],
            warnings: compatibilityValidation.warnings || [],
            recommendations: compatibilityValidation.recommendations || []
          }}
          onClose={() => {
            console.log('🚪 Modal closed by user');
            setShowCompatibilityModal(false);
            setCompatibilityValidation(null);
            setIsValidatingCompatibility(false);
          }}
          onProceed={() => {
            console.log('✅ User clicked Proceed in modal');
            console.log('🔍 Blocking status:', compatibilityValidation.blocking);
            if (compatibilityValidation.blocking) {
              console.log('🚫 Cannot proceed - critical issues present');
            } else {
              proceedToPayment();
            }
          }}
          onFixIssues={() => {
            console.log('🔧 User clicked Fix Issues');
            setShowCompatibilityModal(false);
            setCompatibilityValidation(null);
            setIsValidatingCompatibility(false);
            // Navigate back to appropriate customizer
            const fromSource = location.state?.from;
            if (fromSource === 'customize-ai') {
              navigate('/customize-ai');
            } else {
              navigate('/pc-customized');
            }
          }}
        />
      )}
    </div>
  );
}

export default OrderSumCustom;
