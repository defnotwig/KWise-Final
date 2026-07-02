import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./PCCustomized.css";
import { categoryKey as getCategoryKey, normalizeKioskProduct } from "../utils/kioskContracts";

// Import the centralized API
import api from "../api/api";

// ✅ COMPATIBILITY VALIDATION
import CompatibilityValidationModal from "../components/CompatibilityValidationModal"; // ✅ ENHANCED COMPATIBILITY MODAL

// Static assets
import Customized from "../assets/Customized.webp";
import CPU1 from "../assets/CPU1.webp";
import CPUCooler from "../assets/CPUCooler.webp";
import Motherboard1 from "../assets/Motherboard1.webp";
import Ram from "../assets/Ram.webp";
import Storage1 from "../assets/Storage1.webp";
import GPU1 from "../assets/GPU1.webp";
import SystemUnit1 from "../assets/SystemUnit1.webp";
import PSU1 from "../assets/PSU1.webp";
import Vector from "../assets/Vector (3).webp";
import Chest from "../assets/Chest.webp";

const baseConsole = globalThis.window !== undefined && globalThis.console
  ? globalThis.console
  : { log: () => {}, warn: () => {}, error: () => {} };

const console = process.env.NODE_ENV === "test"
  ? { ...baseConsole, log: () => {}, warn: () => {}, error: () => {} }
  : baseConsole;

/** Parse a dimension string, stripping 'mm' suffix */
function parseDimensionMM(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.parseInt(value.replaceAll(/mm/gi, ''), 10);
  return null;
}

/** Check GPU length vs Case max GPU length */
function checkGPUCaseClearance(gpu, pcCase) {
  if (!gpu || !pcCase) return [];
  const gpuDims = gpu.dimensions || {};
  const gpuSpecs = gpu.specifications || {};
  const caseDims = pcCase.dimensions || {};
  const caseSpecs = pcCase.specifications || {};

  const gpuLength = parseDimensionMM(gpuDims.length_mm || gpuSpecs.length_mm || gpuSpecs.length);
  const caseMaxGPU = parseDimensionMM(caseDims.max_gpu_length_mm || caseSpecs.max_gpu_length_mm || caseSpecs.max_gpu_length);

  if (gpuLength && caseMaxGPU && gpuLength > caseMaxGPU) {
    console.log(`🔴 COMPATIBILITY ERROR: GPU ${gpu.name} (${gpuLength}mm) doesn't fit in ${pcCase.name} (max ${caseMaxGPU}mm)`);
    return [{
      type: 'critical', component: 'GPU/Case',
      message: `GPU (${gpuLength}mm) exceeds Case max GPU length (${caseMaxGPU}mm)`,
      gpu: gpu.name, case: pcCase.name, gpuLength, caseMaxGPU
    }];
  }
  return [];
}

/** Check CPU Cooler height vs Case max cooler height */
function checkCoolerCaseHeight(cooler, pcCase) {
  if (!cooler || !pcCase) return [];
  const coolerDims = cooler.dimensions || {};
  const coolerSpecs = cooler.specifications || {};
  const caseDims = pcCase.dimensions || {};
  const caseSpecs = pcCase.specifications || {};

  const coolerHeight = parseDimensionMM(coolerDims.height_mm || coolerSpecs.height_mm || coolerSpecs.height);
  const caseMaxCooler = parseDimensionMM(caseDims.max_cooler_height_mm || caseSpecs.max_cooler_height_mm || caseSpecs.max_cpu_cooler_height_mm);

  if (coolerHeight && caseMaxCooler && coolerHeight > caseMaxCooler) {
    console.log(`🔴 COMPATIBILITY ERROR: Cooler ${cooler.name} (${coolerHeight}mm) doesn't fit in ${pcCase.name} (max ${caseMaxCooler}mm)`);
    return [{
      type: 'critical', component: 'Cooler/Case',
      message: `Cooler (${coolerHeight}mm) exceeds Case max cooler height (${caseMaxCooler}mm)`,
      cooler: cooler.name, case: pcCase.name, coolerHeight, caseMaxCooler
    }];
  }
  return [];
}

/** Parse AIO radiator size from cooler specs/name */
function parseRadiatorSize(cooler) {
  const specs = cooler.specifications || {};
  let size = specs.radiator_size || specs.radiator_mm;
  if (!size) {
    const sizeMatch = /\b(420|360|280|240|120)\b/.exec((cooler.name || '').toUpperCase());
    return sizeMatch ? Number.parseInt(sizeMatch[1], 10) : null;
  }
  return typeof size === 'string' ? Number.parseInt(size.replaceAll(/mm/gi, ''), 10) : size;
}

/** Get max radiator support from case specs/dimensions */
function getCaseRadiatorSupport(pcCase) {
  const caseDims = pcCase.dimensions || {};
  const caseSpecs = pcCase.specifications || {};
  const radFields = [
    caseSpecs.front_radiator_support, caseSpecs.top_radiator_support, caseSpecs.max_radiator_size,
    caseDims.front_radiator_support, caseDims.top_radiator_support, caseDims.max_radiator_size
  ];
  for (const field of radFields) {
    if (field) return Number.parseInt(field, 10);
  }
  const radSupportStr = caseSpecs.radiator_support || caseDims.radiator_support || '';
  if (typeof radSupportStr === 'string' && radSupportStr) {
    const radMatches = radSupportStr.match(/(\d{2,3})mm/g);
    if (radMatches?.length > 0) {
      return Math.max(...radMatches.map(m => Number.parseInt(m.replace('mm', ''), 10)));
    }
  }
  return null;
}

/** Check AIO radiator size vs Case radiator support */
function checkAIORadiator(cooler, pcCase) {
  if (!cooler || !pcCase) return [];
  const coolerSpecs = cooler.specifications || {};
  const coolerText = `${(cooler.name || '').toUpperCase()} ${(cooler.description || '').toUpperCase()}`;

  const isAIO = coolerSpecs.water_cooled === true ||
    coolerSpecs.type === 'AIO' ||
    coolerSpecs.cooling_type === 'AIO' ||
    coolerText.includes('AIO') ||
    coolerText.includes('LIQUID') ||
    coolerText.includes('WATER') ||
    /\b(120|240|280|360|420)\s?(MM|BLACK|WHITE|RGB|ARGB|PRO|ELITE)?\b/.exec(coolerText);

  if (!isAIO) return [];

  const radiatorSize = parseRadiatorSize(cooler);
  const caseRadiatorSupport = getCaseRadiatorSupport(pcCase);

  console.log(`🧊 AIO Check: Cooler ${cooler.name} is AIO with ${radiatorSize}mm radiator, Case ${pcCase.name} supports ${caseRadiatorSupport}mm`);

  if (radiatorSize && caseRadiatorSupport && !Number.isNaN(caseRadiatorSupport) && radiatorSize > caseRadiatorSupport) {
    console.log(`🔴 COMPATIBILITY ERROR: AIO ${cooler.name} (${radiatorSize}mm radiator) doesn't fit in ${pcCase.name} (max ${caseRadiatorSupport}mm radiator)`);
    return [{
      type: 'critical', component: 'Cooler/Case (AIO)',
      message: `AIO radiator (${radiatorSize}mm) exceeds Case max radiator support (${caseRadiatorSupport}mm)`,
      cooler: cooler.name, case: pcCase.name, radiatorSize, caseRadiatorSupport
    }];
  }
  return [];
}

/** Check PSU vs GPU 12VHPWR connector compatibility */
function checkPSUGPUConnector(gpu, psu) {
  if (!gpu || !psu) return [];
  const gpuDims = gpu.dimensions || {};
  const gpuSpecs = gpu.specifications || {};
  const psuSpecs = psu.specifications || {};
  const gpuName = (gpu.name || '').toUpperCase();

  const powerConnectors = gpuDims.power_connectors || gpuSpecs.power_connectors || gpuSpecs['Power Connectors'] || '';
  const powerConnStr = String(powerConnectors).toUpperCase();

  const gpuRequires12VHPWR = powerConnStr.includes('12VHPWR') || powerConnStr.includes('16-PIN') || powerConnStr.includes('16PIN');

  if (!gpuRequires12VHPWR) return [];

  const psuHas12VHPWR = psuSpecs.has_12vhpwr_connector === true ||
    String(psuSpecs.pcie_connectors || '').toUpperCase().includes('12VHPWR') ||
    String(psuSpecs.pcie_connectors || '').toUpperCase().includes('16-PIN') ||
    String(psuSpecs['Power Connectors'] || '').toUpperCase().includes('12VHPWR');

  if (!psuHas12VHPWR) {
    console.log(`🔴 COMPATIBILITY ERROR: PSU ${psu.name} lacks 12VHPWR connector for RTX 4000 GPU ${gpu.name}`);
    return [{
      type: 'manual_check', component: 'PSU/GPU',
      message: `PSU lacks 12VHPWR connector required by ${gpu.name}`,
      psu: psu.name, gpu: gpu.name,
      reason: 'RTX 4000 series GPUs require a 12VHPWR (16-pin) power connector'
    }];
  }
  return [];
}

/** Check CPU vs Motherboard socket compatibility */
function checkCPUSocket(cpu, motherboard) {
  if (!cpu || !motherboard) return [];
  const cpuSocket = (cpu.specifications?.socket || '').toUpperCase();
  const mbSocket = (motherboard.specifications?.socket || '').toUpperCase();

  if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
    console.log(`🔴 COMPATIBILITY ERROR: CPU ${cpu.name} (${cpuSocket}) incompatible with ${motherboard.name} (${mbSocket})`);
    return [{
      type: 'critical', component: 'CPU/Motherboard',
      message: `CPU socket (${cpuSocket}) doesn't match Motherboard socket (${mbSocket})`,
      cpu: cpu.name, motherboard: motherboard.name, cpuSocket, mbSocket
    }];
  }
  return [];
}

/** Check RAM vs Motherboard DDR type compatibility */
function checkRAMDDRType(ram, motherboard) {
  if (!ram || !motherboard) return [];
  const mbDDR = (motherboard.specifications?.memory_type || '').toUpperCase();
  if (!mbDDR) return [];

  const ramSpecs = ram.specifications || {};
  const ramDDR = (ramSpecs.type || ramSpecs.memory_type || '').toUpperCase();

  if (ramDDR && !ramDDR.includes(mbDDR) && !mbDDR.includes(ramDDR)) {
    console.log(`🔴 COMPATIBILITY ERROR: RAM ${ram.name} (${ramDDR}) incompatible with ${motherboard.name} (${mbDDR})`);
    return [{
      type: 'critical', component: 'RAM/Motherboard',
      message: `RAM (${ramDDR}) incompatible with Motherboard (${mbDDR})`,
      ram: ram.name, motherboard: motherboard.name, ramDDR, mbDDR
    }];
  }
  return [];
}

/** Parse RAM sticks count from item specs, configuration, or product name */
function getRAMSticksCount(item) {
  const specs = item?.specifications || {};
  let count = specs.sticks_count;
  if (typeof count === 'number') return count;
  if (typeof count === 'string') return Number.parseInt(count, 10) || 1;
  if (specs.configuration) {
    const configMatch = specs.configuration.match(/^(\d+)x/i);
    if (configMatch) return Number.parseInt(configMatch[1], 10);
  }
  if (item?.name) {
    const nameMatch = item.name.match(/\((\d+)x\d+GB\)/i);
    if (nameMatch) return Number.parseInt(nameMatch[1], 10);
  }
  return 1;
}

/** Calculate which physical RAM slots are occupied (accounting for multi-stick kits) */
function calculateRAMOccupiedSlots(multiSlotCartObj) {
  const occupied = [];
  for (const [slotKey, item] of Object.entries(multiSlotCartObj)) {
    const categoryLower = item?.category?.toLowerCase() || '';
    const isRAM = categoryLower.includes('ram') || categoryLower.includes('memory');
    if (!item || !isRAM) continue;
    const slotMatch = /ram-(\d+)/.exec(slotKey);
    if (!slotMatch) continue;
    const startSlot = Number.parseInt(slotMatch[1], 10);
    const sticksCount = getRAMSticksCount(item);
    for (let i = 0; i < sticksCount; i++) occupied.push(startSlot + i);
  }
  return occupied;
}

/** Calculate which storage slots are occupied */
function calculateStorageOccupiedSlots(multiSlotCartObj, motherboard) {
  const occupied = [];
  for (const [slotKey, item] of Object.entries(multiSlotCartObj)) {
    if (item?.category?.toLowerCase() !== 'storage') continue;
    const m2Match = /storage-m2-(\d+)/.exec(slotKey);
    const sataMatch = /storage-sata-(\d+)/.exec(slotKey);
    if (m2Match) {
      occupied.push(Number.parseInt(m2Match[1], 10));
    } else if (sataMatch) {
      const totalM2 = Number.parseInt(motherboard?.specifications?.m2_slots, 10) || 0;
      occupied.push(totalM2 + Number.parseInt(sataMatch[1], 10));
    }
  }
  return occupied;
}

/** Filter RAM products to only show configs that fit in remaining slots */
function filterRAMBySlotCapacity(products, availableSlotsRemaining) {
  return products.filter(product => {
    const sticksCount = getRAMSticksCount(product);
    return sticksCount <= availableSlotsRemaining;
  });
}

/** Expand a RAM category into individual slot entries */
function expandRAMCategory(cat, originalIndex, ramSlotResult, ramOccupiedSlots, multiSlotCartObj) {
  const totalSlots = ramSlotResult.totalSlots || 4;
  const expanded = [];
  for (let slot = 0; slot < totalSlots; slot++) {
    const isOccupied = ramOccupiedSlots.includes(slot);
    const slotKey = `ram-${slot}`;
    const hasItem = !!multiSlotCartObj[slotKey];
    const availableSlotsRemaining = totalSlots - ramOccupiedSlots.length;
    const filteredRAMProducts = (!isOccupied && !hasItem)
      ? filterRAMBySlotCapacity(cat.products, availableSlotsRemaining)
      : cat.products;
    expanded.push({
      ...cat,
      name: `Memory (RAM) - Slot ${slot + 1}${isOccupied && !hasItem ? ' (Occupied)' : ''}`,
      slotIndex: slot, slotType: 'ram', isMultiSlot: true, originalIndex,
      isOccupied: isOccupied && !hasItem, slotKey, products: filteredRAMProducts,
      availableSlotsRemaining
    });
  }
  return expanded;
}

/** Expand a Storage category into M.2 + SATA slot entries */
function expandStorageCategory(cat, originalIndex, storageSlotResult) {
  const totalM2 = storageSlotResult.m2?.total || 0;
  const totalSATA = storageSlotResult.sata?.total || 0;
  const expanded = [];

  if (totalM2 > 0) {
    const m2Filtered = cat.products.filter(p => {
      const iface = (p.specifications?.interface || p.specifications?.bus_type || '').toLowerCase();
      const stype = (p.specifications?.storage_type || '').toLowerCase();
      return (iface.includes('nvme') || iface.includes('m.2') || iface.includes('pcie') || stype.includes('nvme')) && !iface.includes('sata');
    });
    for (let slot = 0; slot < totalM2; slot++) {
      expanded.push({
        ...cat, name: `Storage - M.2 Slot ${slot + 1}`,
        slotIndex: slot, slotType: 'storage-m2', isMultiSlot: true, originalIndex,
        requiredInterface: 'nvme', slotKey: `storage-m2-${slot}`, products: m2Filtered
      });
    }
  }

  if (totalSATA > 0) {
    const sataFiltered = cat.products.filter(p => {
      const iface = (p.specifications?.interface || p.specifications?.bus_type || '').toLowerCase();
      return iface.includes('sata') && !iface.includes('nvme') && !iface.includes('pcie') && !iface.includes('m.2');
    });
    for (let slot = 0; slot < totalSATA; slot++) {
      expanded.push({
        ...cat, name: `Storage - SATA Port ${slot + 1}`,
        slotIndex: totalM2 + slot, slotType: 'storage-sata', isMultiSlot: true, originalIndex,
        requiredInterface: 'sata', slotKey: `storage-sata-${slot}`, products: sataFiltered
      });
    }
  }
  return expanded;
}

/** Enhance a cart item with dimensions and category from loaded categories */
function enhanceCartItem(item, index, categoriesList) {
  if (!item) return null;
  const category = categoriesList[index];
  if (item.dimensions && Object.keys(item.dimensions).length > 0 && item.category) return item;
  if (category?.products) {
    const matchingProduct = category.products.find(p => p.id === item.id);
    if (matchingProduct) {
      return {
        ...item,
        specifications: item.specifications || matchingProduct.specifications || {},
        dimensions: item.dimensions && Object.keys(item.dimensions).length > 0
          ? item.dimensions : (matchingProduct.dimensions || {}),
        category: item.category || matchingProduct.category || category.category?.toLowerCase() || '',
        categoryName: item.categoryName || category.name || ''
      };
    }
  }
  if (!item.category && category) {
    return { ...item, category: category.category?.toLowerCase() || '', categoryName: item.categoryName || category.name || '' };
  }
  return item;
}

/** Check if a cart component is valid (has name and positive price) */
function isValidComponent(component) {
  if (!component || typeof component !== 'object') return false;
  if (!component.name || typeof component.name !== 'string' || !component.name.trim()) return false;
  if (component.price === null || component.price === undefined) return false;
  return typeof component.price === 'number' ? component.price > 0 : Number.parseFloat(component.price) > 0;
}

/** Convert a cart item to a selectedComponents entry for compatibility filtering */
function toSelectedComponent(item) {
  return {
    id: item.id, name: item.name, category: item.category, price: item.price,
    specifications: item.specifications || {}, dimensions: item.dimensions || {},
    brand: item.brand || null,
    socket: item.socket || item.specifications?.socket,
    memory_type: item.memory_type || item.specifications?.memory_type,
    form_factor: item.form_factor || item.specifications?.form_factor,
    tdp: item.tdp || item.specifications?.tdp,
    wattage: item.wattage || item.specifications?.wattage,
    length: item.length || item.specifications?.length,
    height: item.height || item.specifications?.height,
    max_gpu_length: item.max_gpu_length || item.specifications?.max_gpu_length,
    max_cooler_height: item.max_cooler_height || item.specifications?.max_cooler_height
  };
}

/** Compute the CSS class for a build step */
function getStepClass(isOccupiedSlot, hasComponent, isUnlocked, isOptional, isMultiSlot) {
  let cls = "pc-customizer-step ";
  if (isOccupiedSlot) cls += "occupied-slot locked-step ";
  else if (hasComponent) cls += "selected-step unlocked-step ";
  else if (isUnlocked) {
    cls += "active-step unlocked-step ";
    if (isOptional) cls += "optional-step ";
  } else cls += "inactive-step locked-step ";
  if (isMultiSlot) cls += "multi-slot-step ";
  return cls;
}

/** Resolve the component for a category step from cart/multiSlotCart */
function getStepComponent(category, displayIndex, cartArr, multiSlotCartObj, categoriesList) {
  const isMultiSlot = category.isMultiSlot || false;
  const slotIndex = category.slotIndex || 0;
  const originalIndex = category.originalIndex ?? displayIndex;
  const categoryKey = categoriesList[originalIndex]?.category?.toLowerCase() || '';
  if (isMultiSlot) {
    const slotKey = category.slotKey || `${categoryKey}-${slotIndex}`;
    return multiSlotCartObj[slotKey] || null;
  }
  return cartArr[originalIndex] || null;
}

const PCCustomized = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Add location hook to detect navigation changes

  // State management for real-time data
  const [categories, setCategories] = useState([]);
  const [selectedItem, setSelectedItem] = useState(0);
  const loadingRef = useRef(false); // Internal loading flag - no re-render needed
  // Removed error state - using fallback categories instead

  // 🆕 DYNAMIC MULTI-SLOT CATEGORIES STATE
  const [dynamicCategories, setDynamicCategories] = useState([]); // Enhanced categories with dynamic RAM/Storage slots
  const [multiSlotCart, setMultiSlotCart] = useState({}); // Separate cart for multi-slot items { 'ram-0': item, 'ram-1': item, 'storage-m2-0': item }

  // Cart state - base 8 components (CPU, Cooling, Motherboard, RAM, Storage, GPU, Case, PSU)
  const [cart, setCart] = useState(new Array(8).fill(null));
  const [totalPrice, setTotalPrice] = useState(0);
  const [unlockedCategories, setUnlockedCategories] = useState([0]); // First category (CPU) always unlocked

  // Stable primitive values for useEffect dependencies (prevents request storms)
  const motherboardIndex = useMemo(() => 
    categories.findIndex(cat => cat.category?.toLowerCase() === 'motherboard'),
    [categories]
  );
  const motherboardId = cart[motherboardIndex]?.id ?? null;
  const multiSlotCartKeyCount = Object.keys(multiSlotCart).length;
  const categoryHydrationSignature = useMemo(() => (
    categories
      .map((category) => `${category.category || ''}:${category.products?.length || 0}`)
      .join('|')
  ), [categories]);

  // Modal state
  const [showStartOverModal, setShowStartOverModal] = useState(false);
  const [showCompatibilityValidationModal, setShowCompatibilityValidationModal] = useState(false); // ✅ NEW: Enhanced validation modal

  // 🔥 NEW: Cart compatibility warnings (detected on load/change)
  const [cartCompatibilityWarnings, setCartCompatibilityWarnings] = useState([]);

  // 🔥 RATE LIMIT FIX: Debounce timer refs
  const expandCategoriesTimerRef = useRef(null);
  const isExpandingRef = useRef(false);

  // 🔥 FIX ISSUE #1: Define optional categories (GPU is optional)
  const optionalCategories = React.useMemo(() => ['gpu', 'graphics processing unit'], []);
  
  // 🔥 FIX ISSUE #1: Helper to check if category is optional
  const isCategoryOptional = useCallback((categoryIndex) => {
    if (categoryIndex < 0 || categoryIndex >= categories.length) return false;
    const categoryName = categories[categoryIndex]?.name?.toLowerCase() || '';
    const categoryKey = categories[categoryIndex]?.category?.toLowerCase() || '';
    return optionalCategories.some(opt => categoryName.includes(opt) || categoryKey.includes(opt));
  }, [categories, optionalCategories]);

  /**
   * Calculate which categories should be unlocked based on cart state
   * NEW LOGIC: After CPU, Cooling, Motherboard are selected:
   * - Unlock all RAM slots
   * - After at least 1 RAM selected, unlock all Storage slots
   * - After at least 1 RAM + 1 Storage selected, unlock GPU + Case simultaneously
   * - PSU unlocks after Case is selected
   */
  const calculateUnlockedCategories = useCallback(() => {
    const unlocked = [0]; // CPU always unlocked
    
    // Check base cart for sequential unlocking
    const hasCPU = cart[0] != null;
    const hasCooling = cart[1] != null;
    const hasMotherboard = cart[2] != null;
    const hasGPU = cart[5] != null;
    const hasCase = cart[6] != null;
    
    console.log('🔍 Cart state check:', {
      'cart[0] CPU': cart[0]?.name || 'null',
      'cart[1] Cooling': cart[1]?.name || 'null',
      'cart[2] Motherboard': cart[2]?.name || 'null',
      'cart[5] GPU': cart[5]?.name || 'null',
      'cart[6] Case': cart[6]?.name || 'null',
      'cart[7] PSU': cart[7]?.name || 'null',
      hasCase: hasCase
    });
    
    // Check multiSlotCart for RAM and Storage
    const multiSlotItems = Object.values(multiSlotCart);
    const hasRAM = multiSlotItems.some(item => {
      const categoryLower = item?.category?.toLowerCase() || '';
      return item && (categoryLower.includes('ram') || categoryLower.includes('memory'));
    });
    const hasStorage = multiSlotItems.some(item => {
      const categoryLower = item?.category?.toLowerCase() || '';
      return item && categoryLower.includes('storage');
    });
    
    console.log('🔓 Unlock calculation:', { 
      hasCPU, hasCooling, hasMotherboard, hasRAM, hasStorage, hasGPU, hasCase,
      multiSlotItemsCount: multiSlotItems.length,
      multiSlotKeys: Object.keys(multiSlotCart),
      cart: cart.map((item, idx) => ({ index: idx, hasItem: item !== null, name: item?.name || 'null' }))
    });
    
    // Sequential unlocking for base components
    if (hasCPU) unlocked.push(1); // Unlock Cooling
    if (hasCooling) unlocked.push(2); // Unlock Motherboard
    if (hasMotherboard) unlocked.push(3); // Unlock RAM (base category index)
    
    // After motherboard, unlock all RAM slots (handled by dynamic categories)
    // After at least 1 RAM, unlock Storage
    if (hasRAM) unlocked.push(4); // Unlock Storage (base category index)
    
    // 🔥 CRITICAL FIX: After 1 RAM + 1 Storage, unlock GPU (5, optional) and Case (6, required)
    // PSU (7) remains LOCKED until Case is selected
    if (hasRAM && hasStorage) {
      unlocked.push(5, 6); // Unlock GPU (optional - user can skip) and Case (required before PSU)
      console.log('✅ GPU and Case unlocked (1 RAM + 1 Storage present)');
      console.log('🔒 PSU still locked (waiting for Case selection)');
    }
    
    // 🔥 PSU unlocks ONLY after Case is selected (cart[6] !== null)
    // This ensures proper build order: CPU → Cooling → Motherboard → RAM → Storage → (GPU optional) → Case → PSU
    if (hasCase) {
      unlocked.push(7); // Unlock PSU (final component)
      console.log('✅ PSU unlocked (Case component selected)');
    } else if (hasRAM && hasStorage) {
      console.log('🔒 PSU locked (waiting for Case component)');
    }
    
    console.log('🔓 Calculated unlocked categories:', unlocked);
    return unlocked;
  }, [cart, multiSlotCart]);

  /**
   * 🔥 NEW: Validate cart compatibility on load/change
   * Checks for GPU/Case clearance, Cooler/Case clearance, etc.
   * Returns array of compatibility warnings
   */
  const validateCartCompatibility = useCallback(() => {
    const gpu = cart[5];
    const pcCase = cart[6];
    const cooler = cart[1];
    const psu = cart[7];
    const cpu = cart[0];
    const motherboard = cart[2];
    const ram = cart[3];

    return [
      ...checkGPUCaseClearance(gpu, pcCase),
      ...checkCoolerCaseHeight(cooler, pcCase),
      ...checkAIORadiator(cooler, pcCase),
      ...checkPSUGPUConnector(gpu, psu),
      ...checkCPUSocket(cpu, motherboard),
      ...checkRAMDDRType(ram, motherboard)
    ];
  }, [cart]);

  /**
   * 🔥 NEW: Effect to validate cart compatibility on load/change
   */
  useEffect(() => {
    if (!cart || cart.length === 0) return;
    
    const warnings = validateCartCompatibility();
    setCartCompatibilityWarnings(warnings);
    
    if (warnings.length > 0) {
      console.log('⚠️ Cart compatibility warnings detected:', warnings);
    }
  }, [cart, validateCartCompatibility]);

  /**
   * 🔥 CRITICAL FIX: Auto-recalculate unlocked categories when cart/multiSlotCart changes
   * This prevents stale unlock state when user adds/removes components
   */
  useEffect(() => {
    if (!categories || categories.length === 0) return; // Wait for categories to load
    
    const newUnlocked = calculateUnlockedCategories();
    console.log('🔄 Auto-recalculating unlocked categories due to cart change:', newUnlocked);
    setUnlockedCategories((current) => (
      JSON.stringify(current) === JSON.stringify(newUnlocked) ? current : newUnlocked
    ));
  }, [cart, multiSlotCart, calculateUnlockedCategories, categories.length]);

  // Default category images mapping
  const defaultCategoryImages = React.useMemo(() => ({
    cpu: CPU1,
    cooling: CPUCooler,
    motherboard: Motherboard1,
    ram: Ram,
    memory: Ram,
    storage: Storage1,
    gpu: GPU1,
    case: SystemUnit1,
    psu: PSU1,
    monitor: SystemUnit1,
    peripherals: SystemUnit1
  }), []);

  /**
   * Format category name for display
   */
  const formatCategoryNameLocal = useCallback((categoryName) => {
    const nameMap = {
      cpu: "Processor",
      gpu: "Graphics Processing Unit",
      motherboard: "Motherboard",
      memory: "Memory (RAM)",
      ram: "Memory (RAM)",
      storage: "Storage",
      case: "PC Case",
      psu: "Power Supply Unit",
      cooling: "CPU Cooler"
    };

    return nameMap[categoryName.toLowerCase()] ||
      categoryName.replaceAll('_', ' ').replaceAll(/\b\w/g, l => l.toUpperCase());
  }, []);

  /**
   * Load AI suggestions if coming from AI flow
   * NEW - Feature 6: AI Customization Support
   */
  useEffect(() => {
    // Check if AI suggestions exist
    const aiComponents = location.state?.aiComponents;
    const aiSuggestedFromStorage = localStorage.getItem('aiCustomizedBuild');
    
    if (aiComponents || aiSuggestedFromStorage) {
      console.log('🤖 AI suggestions detected, pre-filling cart...');
      
      try {
        const suggestions = aiComponents || JSON.parse(aiSuggestedFromStorage);
        
        // Pre-fill cart with AI suggestions
        const aiCart = new Array(8).fill(null);
        const categoryMapping = ['cpu', 'cooling', 'motherboard', 'ram', 'storage', 'gpu', 'case', 'psu'];
        
        categoryMapping.forEach((key, index) => {
          if (suggestions[key]) {
            aiCart[index] = suggestions[key];
          }
        });
        
        setCart(aiCart);
        
        // Calculate total price with parseFloat to handle string prices
        const total = aiCart.reduce((sum, item) => {
          const price = Number.parseFloat(item?.price) || 0;
          return sum + price;
        }, 0);
        setTotalPrice(total);
        
        // Unlock all categories since AI has selected components
        setUnlockedCategories([0, 1, 2, 3, 4, 5, 6, 7]);
        
        // Clear AI suggestions from localStorage after loading
        localStorage.removeItem('aiCustomizedBuild');
        
        console.log('✅ AI suggestions loaded into cart', aiCart);
      } catch (error) {
        console.error('❌ Error loading AI suggestions:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  /**
   * 🔥 FIX: Handle selectedCategory from navigation state (Order More flow)
   * When OrderSumCustom navigates here with a selectedCategory, set it immediately
   */
  useEffect(() => {
    const selectedCategoryFromState = location.state?.selectedCategory;
    
    if (selectedCategoryFromState != null) {
      const categoryIndex = Number.parseInt(selectedCategoryFromState, 10);
      
      if (!Number.isNaN(categoryIndex) && categoryIndex >= 0 && categoryIndex < 8) {
        console.log('🎯 Navigation state detected - selectedCategory:', categoryIndex);
        setSelectedItem(categoryIndex);
        
        // Clear the state after using it to prevent re-triggering
        globalThis.history.replaceState({}, document.title);
      }
    }
  }, [location.state?.selectedCategory]);

  /**
   * Load build components from API on mount - FULLY DYNAMIC
   * FIX ISSUE #2: Prevent loading screen when returning from navigation
   */
  useEffect(() => {
    // 🔥 FIX ISSUE #2: Better detection of return navigation
    // Check multiple indicators that user is returning from another page
    const fromNavigation = 
      globalThis.location.search.includes('added=true') ||  // Added item flag
      globalThis.location.search.includes('selectedCategory') ||  // Selected category flag
      globalThis.history.state?.usr ||  // React Router navigation state
      sessionStorage.getItem('pcCustomizedLoaded') === 'true';  // Session flag
    
    // If returning from navigation and categories already loaded, skip loading
    if (fromNavigation && categories.length > 0) {
      console.log('🔄 Returning from navigation - skipping data reload');
      loadingRef.current = false;  // Ensure loading is false
      return;
    }
    
    // If categories already loaded (component remount), skip loading
    if (categories.length > 0) {
      console.log('✅ Categories already loaded - skipping reload');
      loadingRef.current = false;  // Ensure loading is false
      return;
    }
    
    const loadBuildComponents = async () => {
      try {
        loadingRef.current = true;
        console.log('🔄 Loading build components using direct category approach...');

        // Instead of using getBuildComponents (which has issues),
        // let's directly fetch all products for each category using getCategoryProducts
        const categoryNames = [];
        
        console.log('📦 Fetching categories individually to avoid getBuildComponents issues...');
        
        const categoriesData = await api.kiosk.getBuildComponents({ limit: 500 });
        
        // 🔥 FIX ISSUE #3: Increase limit to 500 to get all products (some categories have 59 products)
        await Promise.all(categoryNames.map(async (categoryName) => {
          try {
            console.log(`📦 Fetching ${categoryName} products...`);
            
            const bootstrap = await api.kiosk.getCatalogBootstrap({ category: categoryName, limit: 500 });
            const categoryResponse = { data: bootstrap.products || [] };
            const categoryBrands = (bootstrap.brands || [])
              .map((brand) => (typeof brand === 'string' ? brand : brand.name))
              .filter(Boolean);
            
            console.log(`✅ ${categoryName} response:`, categoryResponse?.data?.length || 0, 'products');
            console.log(`📸 ${categoryName} first image:`, categoryResponse?.data?.[0]?.image);
            console.log(`📋 ${categoryName} first specs:`, categoryResponse?.data?.[0]?.specifications);
            console.log(`📏 ${categoryName} first dimensions:`, categoryResponse?.data?.[0]?.dimensions); // 🔥 CRITICAL: Verify dimensions from API
            
            categoriesData[categoryName.toLowerCase()] = {
              products: categoryResponse.data || [],
              brands: categoryBrands || []
            };
            
            console.log(`✅ ${categoryName}: ${categoryResponse.data?.length || 0} products loaded`);
          } catch (error) {
            console.error(`❌ Error loading ${categoryName}:`, error);
            categoriesData[categoryName.toLowerCase()] = { products: [], brands: [] };
          }
        }));
        
        console.log('📦 All categories loaded using direct approach');

        // Helper to map product data with image and spec enrichment
        const mapProduct = (product, categoryKey) => {
          const normalizedProduct = normalizeKioskProduct(product, {
            category: product.category || categoryKey,
            fallbackImage: defaultCategoryImages[String(categoryKey).toLowerCase()] || CPU1
          });

          return {
            ...normalizedProduct,
            category: normalizedProduct.category || product.category || formatCategoryNameLocal(categoryKey) || categoryKey,
            categoryKey: normalizedProduct.categoryKey || getCategoryKey(categoryKey),
            specifications: normalizedProduct.specifications || {},
            dimensions: normalizedProduct.dimensions || {},
            description: normalizedProduct.description || ''
          };
        };

        // Transform categories data into the expected structure
        // Pre-map products per category to avoid deep nesting
        const mappedCategoryProducts = {};
        for (const [categoryKey, categoryData] of Object.entries(categoriesData)) {
          const products = Array.isArray(categoryData.products) ? categoryData.products : [];
          mappedCategoryProducts[categoryKey] = products.map(p => mapProduct(p, categoryKey));
        }

        const dynamicCategories = Object.entries(categoriesData)
          .filter(([categoryKey, categoryData]) => categoryKey && categoryData)
          .map(([categoryKey, categoryData]) => ({
            name: formatCategoryNameLocal(categoryKey) || categoryKey,
            image: defaultCategoryImages[categoryKey.toLowerCase()] || CPU1,
            category: categoryKey,
            brands: Array.isArray(categoryData.brands) ? categoryData.brands : [],
            products: mappedCategoryProducts[categoryKey] || []
          }));

        // Sort categories by typical build order
        const buildOrder = ['cpu', 'cooling', 'motherboard', 'ram', 'storage', 'gpu', 'case', 'psu'];
        const sortedCategories = [...dynamicCategories].sort((a, b) => {
          const indexA = buildOrder.indexOf(a.category.toLowerCase());
          const indexB = buildOrder.indexOf(b.category.toLowerCase());
          return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

        // Filter out any invalid categories before setting state
        const validCategories = sortedCategories.filter(cat => cat?.name && cat?.category);
        
        // 🔥 CRITICAL: Verify dimensions survived category mapping
        console.log('🔍 Verifying dimensions in final categories...');
        validCategories.forEach(cat => {
          if (cat.products && cat.products.length > 0) {
            const firstProduct = cat.products[0];
            console.log(`📦 ${cat.name} first product:`, {
              name: firstProduct.name,
              hasSpecs: !!firstProduct.specifications,
              hasDims: !!firstProduct.dimensions,
              specsKeys: Object.keys(firstProduct.specifications || {}),
              dimsKeys: Object.keys(firstProduct.dimensions || {})
            });
          }
        });
        
        setCategories(validCategories);
        
        // 🔥 FIX ISSUE #2: Set session flag to indicate data has been loaded
        sessionStorage.setItem('pcCustomizedLoaded', 'true');
        
        console.log('✅ Build components loaded successfully:', validCategories.length, 'categories');
      } catch (err) {
        console.error('❌ Error loading build components:', err);
        // Instead of fallback, show error message to user
        setCategories([
          { name: "System Error", category: "error", image: CPU1, products: [], brands: [], error: "Unable to connect to backend. Please check server status." }
        ]);
      } finally {
        loadingRef.current = false;
      }
    };

    loadBuildComponents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCategoryImages, formatCategoryNameLocal]);  // 🔥 FIX: Remove categories.length dependency

  /**
   * 🆕 DYNAMIC MULTI-SLOT CATEGORY EXPANSION
   * When motherboard is selected, expand RAM and Storage categories based on available slots
   * OPTIMIZED: Uses stable primitive dependencies (motherboard ID + cart length) instead of
   * full object references to prevent request storms on every re-render
   */
  useEffect(() => {
    if (!categories || categories.length === 0) return;

    const motherboardIndex = categories.findIndex(cat => 
      cat.category?.toLowerCase() === 'motherboard'
    );
    const motherboard = motherboardIndex >= 0 ? cart[motherboardIndex] : null;

    if (!motherboard?.specifications) {
      console.log('📦 No motherboard selected - using base categories');
      setDynamicCategories(categories);
      return;
    }

    console.log('🔧 Motherboard selected:', motherboard.name);
    
    const expandCategories = async () => {
      try {
        const existingRAM = Object.values(multiSlotCart).filter(item => {
          const cat = item?.category?.toLowerCase() || '';
          return item && (cat.includes('ram') || cat.includes('memory'));
        });
        const existingStorage = Object.values(multiSlotCart).filter(item =>
          item && (item.category?.toLowerCase() || '').includes('storage')
        );

        const ramOccupiedSlots = calculateRAMOccupiedSlots(multiSlotCart);
        const storageOccupiedSlots = calculateStorageOccupiedSlots(multiSlotCart, motherboard);
        console.log('🎰 Occupied slots:', { ram: ramOccupiedSlots, storage: storageOccupiedSlots });

        const [ramSlotResult, storageSlotResult] = await Promise.all([
          api.builder.checkRAMSlots(motherboard, existingRAM).catch(err => {
            console.error('Error fetching RAM slots:', err);
            return { totalSlots: Number.parseInt(motherboard.specifications?.ram_slots, 10) || 4, usedSlots: 0, availableSlots: Number.parseInt(motherboard.specifications?.ram_slots, 10) || 4 };
          }),
          api.builder.checkStorageSlots(motherboard, existingStorage).catch(err => {
            console.error('Error fetching Storage slots:', err);
            const m2Slots = Number.parseInt(motherboard.specifications?.m2_slots, 10) || 0;
            const sataSlots = Number.parseInt(motherboard.specifications?.sata_ports, 10) || 0;
            return { m2: { total: m2Slots, used: 0, available: m2Slots }, sata: { total: sataSlots, used: 0, available: sataSlots } };
          })
        ]);

        console.log('🎰 Slot Info:', { ram: ramSlotResult, storage: storageSlotResult });

        const expanded = [];
        for (let i = 0; i < categories.length; i++) {
          const cat = categories[i];
          const catLower = cat.category?.toLowerCase();

          if (catLower === 'ram' || catLower === 'memory') {
            expanded.push(...expandRAMCategory(cat, i, ramSlotResult, ramOccupiedSlots, multiSlotCart));
          } else if (catLower === 'storage') {
            expanded.push(...expandStorageCategory(cat, i, storageSlotResult));
          } else {
            expanded.push({ ...cat, originalIndex: i });
          }
        }

        console.log('✅ Dynamic categories expanded:', expanded.length, 'total slots');
        setDynamicCategories(expanded);
      } catch (error) {
        console.error('❌ Error expanding categories:', error);
        setDynamicCategories(categories);
      }
    };

    // 🔥 RATE LIMIT FIX: Debounce expandCategories to prevent request floods
    // Clear any pending timer
    if (expandCategoriesTimerRef.current) {
      clearTimeout(expandCategoriesTimerRef.current);
    }

    // Skip if already expanding
    if (isExpandingRef.current) {
      console.log('⏭️ Skipping expandCategories - already in progress');
      return;
    }

    // Debounce: Wait 300ms after last change before expanding
    expandCategoriesTimerRef.current = setTimeout(() => {
      console.log('🚀 Executing debounced expandCategories');
      isExpandingRef.current = true;
      expandCategories().finally(() => {
        isExpandingRef.current = false;
      });
    }, 300);

    // Cleanup timer on unmount
    return () => {
      if (expandCategoriesTimerRef.current) {
        clearTimeout(expandCategoriesTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length, motherboardId, multiSlotCartKeyCount]);

  /**
   * Calculate total price when cart or multiSlotCart changes
   */
  useEffect(() => {
    // Calculate base cart total
    const baseTotal = cart.reduce((sum, item) => {
      if (item?.price) {
        const price = typeof item.price === 'number' ? item.price : Number.parseFloat(item.price) || 0;
        return sum + price;
      }
      return sum;
    }, 0);
    
    // Calculate multi-slot cart total
    const multiSlotTotal = Object.values(multiSlotCart).reduce((sum, item) => {
      if (item?.price) {
        const price = typeof item.price === 'number' ? item.price : Number.parseFloat(item.price) || 0;
        return sum + price;
      }
      return sum;
    }, 0);
    
    setTotalPrice(baseTotal + multiSlotTotal);
  }, [cart, multiSlotCart]);

  /**
   * Recalculate unlocked categories whenever cart or multiSlotCart changes
   */
  useEffect(() => {
    if (categories.length > 0) {
      const newUnlocked = calculateUnlockedCategories();
      setUnlockedCategories(newUnlocked);
    }
  }, [cart, multiSlotCart, categories.length, calculateUnlockedCategories]);

  /**
   * Load cart from localStorage on mount and handle navigation state
   * FIX ISSUE #1: Handle optional categories when loading cart
   */
  /**
   * Load cart from localStorage on mount and when location changes
   * 🔥 CRITICAL: This must run AFTER categories are loaded
   */
  useEffect(() => {
    // Don't run if categories haven't loaded yet
    if (!categories || categories.length === 0) {
      console.log('⏳ Waiting for categories to load before processing cart');
      return;
    }

    console.log('🔄 PCCustomized: Processing cart (categories loaded:', categories.length, ')');
    const savedCart = localStorage.getItem("cart");
    const savedMultiSlotCart = localStorage.getItem("multiSlotCart");
    console.log('📦 Cart from localStorage:', savedCart);
    console.log('📦 MultiSlotCart from localStorage:', savedMultiSlotCart);
    
    // Load multiSlotCart first
    if (savedMultiSlotCart) {
      try {
        const parsedMultiSlotCart = JSON.parse(savedMultiSlotCart);
        if (typeof parsedMultiSlotCart === 'object' && parsedMultiSlotCart !== null) {
          console.log('📊 Parsed multiSlotCart:', parsedMultiSlotCart);
          
          // 🔥 CRITICAL FIX: Enhance multi-slot items with dimensions AND category from categories
          const enhancedMultiSlotCart = {};
          Object.entries(parsedMultiSlotCart).forEach(([slotKey, item]) => {
            if (!item) return;
            
            // Determine category from slot key (ram-0 → ram, storage-m2-0 → storage)
            let categoryKey = slotKey.split('-')[0].toLowerCase();
            if (slotKey.includes('storage')) categoryKey = 'storage';
            
            // Find category and matching product
            const category = categories.find(c => c.category.toLowerCase() === categoryKey);
            if (category?.products) {
              const matchingProduct = category.products.find(p => p.id === item.id);
              if (matchingProduct) {
                enhancedMultiSlotCart[slotKey] = {
                  ...item,
                  specifications: item.specifications || matchingProduct.specifications || {},
                  dimensions: item.dimensions && Object.keys(item.dimensions).length > 0 
                    ? item.dimensions 
                    : (matchingProduct.dimensions || {}),
                  // 🔥 CRITICAL FIX: Ensure category field exists for compatibility validation
                  category: item.category || matchingProduct.category || categoryKey,
                  categoryName: item.categoryName || category.name || ''
                };
                console.log(`📏 Enhanced multiSlot ${item.name} with dims:`, Object.keys(enhancedMultiSlotCart[slotKey].dimensions), 'category:', enhancedMultiSlotCart[slotKey].category);
                return;
              }
            }
            // 🔥 CRITICAL FIX: Even if no matching product found, ensure category exists
            enhancedMultiSlotCart[slotKey] = {
              ...item,
              category: item.category || categoryKey,
              categoryName: item.categoryName || (category?.name || '')
            };
          });
          
          const enhancedMultiSlotCartJson = JSON.stringify(enhancedMultiSlotCart);
          setMultiSlotCart((current) => (
            JSON.stringify(current) === enhancedMultiSlotCartJson
              ? current
              : enhancedMultiSlotCart
          ));
          
          // 🔥 CRITICAL: Update localStorage with enhanced multiSlotCart
          if (savedMultiSlotCart !== enhancedMultiSlotCartJson) {
            localStorage.setItem("multiSlotCart", enhancedMultiSlotCartJson);
          }
          console.log('💾 MultiSlotCart updated with dimensions in localStorage');
        }
      } catch (error) {
        console.error('❌ Error loading multiSlotCart from localStorage:', error);
      }
    }
    
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          const enhancedCart = parsedCart.map((item, index) => enhanceCartItem(item, index, categories));
          
          const enhancedCartJson = JSON.stringify(enhancedCart);
          setCart((current) => (
            JSON.stringify(current) === enhancedCartJson ? current : enhancedCart
          ));
          if (savedCart !== enhancedCartJson) {
            localStorage.setItem("cart", enhancedCartJson);
          }
          
          const newUnlockedCategories = calculateUnlockedCategories();
          setUnlockedCategories((current) => (
            JSON.stringify(current) === JSON.stringify(newUnlockedCategories)
              ? current
              : newUnlockedCategories
          ));
        }
      } catch (error) {
        console.error('❌ Error loading cart from localStorage:', error);
      }
    } else {
      console.log('⚠️ No cart found in localStorage - starting fresh');
      // Initialize empty cart
      const emptyCart = new Array(categories.length).fill(null);
      const emptyCartJson = JSON.stringify(emptyCart);
      setCart((current) => (
        JSON.stringify(current) === emptyCartJson ? current : emptyCart
      ));
      localStorage.setItem("cart", emptyCartJson);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryHydrationSignature, categories.length, location.state?.selectedCategory, location.pathname]);

  /**
   * 🔥 FIX ISSUE #1: Watch for cart changes from CustomizedDisplay
   * When user adds item via CustomizedDisplay, recalculate unlocked categories
   */
  useEffect(() => {
    const handleStorageChange = (event) => {
      console.log('🔔 Storage change event received:', event.type);
      const savedCart = localStorage.getItem("cart");
      const savedMultiSlotCart = localStorage.getItem("multiSlotCart");
      
      // Update multiSlotCart if changed
      if (savedMultiSlotCart) {
        try {
          const parsedMultiSlotCart = JSON.parse(savedMultiSlotCart);
          if (typeof parsedMultiSlotCart === 'object' && parsedMultiSlotCart !== null) {
            setMultiSlotCart(parsedMultiSlotCart);
          }
        } catch (error) {
          console.error('❌ Error processing multiSlotCart change:', error);
        }
      }
      
      if (!savedCart) {
        console.log('⚠️ No cart in localStorage');
        return;
      }

      try {
        const parsedCart = JSON.parse(savedCart);
        if (!Array.isArray(parsedCart)) return;

        const enhancedCart = parsedCart.map((item, index) => enhanceCartItem(item, index, categories));
        setCart(enhancedCart);
        
        const newUnlockedCategories = calculateUnlockedCategories();
        setUnlockedCategories(newUnlockedCategories);
        
        // If an item was just added, update selectedItem to next category
        const lastFilledIndex = parsedCart.findIndex((item, idx) =>
          item !== null && (idx === parsedCart.length - 1 || parsedCart[idx + 1] === null)
        );
        if (lastFilledIndex >= 0 && lastFilledIndex + 1 < categories.length) {
          setSelectedItem(lastFilledIndex + 1);
        }
      } catch (error) {
        console.error('❌ Error processing cart change:', error);
      }
    };

    console.log('👂 Setting up cart change listeners');
    // Listen for storage events (cross-tab) and custom events (same-tab)
    globalThis.addEventListener('storage', handleStorageChange);
    globalThis.addEventListener('cartUpdated', handleStorageChange);

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up cart change listeners');
      globalThis.removeEventListener('storage', handleStorageChange);
      globalThis.removeEventListener('cartUpdated', handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length, isCategoryOptional]);

  /**
   * Handle navigation state for returning from product selection
   */
  useEffect(() => {
    const currentLocation = globalThis.location;
    const urlParams = new URLSearchParams(currentLocation.search);
    const selectedCategory = urlParams.get('selectedCategory');
    const added = urlParams.get('added');
    
    if (selectedCategory !== null) {
      const categoryIndex = Number.parseInt(selectedCategory, 10);
      if (!Number.isNaN(categoryIndex) && categoryIndex >= 0 && categoryIndex < categories.length) {
        setSelectedItem(categoryIndex);
        
        // If item was added, focus on next unlocked category
        if (added === 'true') {
          const nextCategory = categoryIndex + 1;
          if (nextCategory < categories.length && unlockedCategories.includes(nextCategory)) {
            setSelectedItem(nextCategory);
          }
        }
      }
    }
  }, [categories.length, unlockedCategories]);

  /**
   * Handle component selection with optimized navigation
   * Prevent navigation if component is already selected (must remove first)
   * UPDATED: Support multi-slot categories with filtered products
   */
  const handleComponentClick = useCallback(async (categoryIndex, slotKey = null, filteredProducts = null) => {
    const isUnlocked = unlockedCategories.includes(categoryIndex);
    
    if (!isUnlocked) return;
    
    setSelectedItem(categoryIndex);

    // Read latest cart from localStorage and enhance with dimensions
    const currentCartData = cart.map((item, idx) => enhanceCartItem(item, idx, categories));
    try {
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          parsedCart.forEach((lsItem, idx) => {
            if (lsItem) currentCartData[idx] = enhanceCartItem(lsItem, idx, categories);
          });
        }
      }
    } catch (e) {
      console.error('Error reading cart from localStorage:', e);
    }

    // Build selectedComponents for compatibility filtering
    const selectedComponents = {};
    currentCartData.forEach(item => {
      if (item?.category) selectedComponents[item.category] = toSelectedComponent(item);
    });
    Object.values(multiSlotCart).forEach(item => {
      if (item?.category) selectedComponents[item.category] = toSelectedComponent(item);
    });
    
    let productsToShow = filteredProducts || categories[categoryIndex]?.products || [];

    navigate("/customized-products", {
      state: {
        category: categories[categoryIndex],
        categoryIndex,
        currentCart: cart,
        multiSlotCart: multiSlotCart,
        slotKey: slotKey,
        returnTo: "/pc-customized",
        categoryName: categories[categoryIndex]?.name,
        products: productsToShow,
        brands: categories[categoryIndex]?.brands || [],
        hasCompatibilityAnalysis: Object.keys(selectedComponents).length > 0,
        selectedComponents: selectedComponents
      }
    });
  }, [categories, unlockedCategories, navigate, cart, multiSlotCart]);

  /**
   * Add product to cart
   * FIX ISSUE #1: Handle optional categories when unlocking next
   */
  // eslint-disable-next-line no-unused-vars
  const _handleAddToCart = useCallback((product, categoryIndex) => {
    const newCart = [...cart];
    newCart[categoryIndex] = {
      ...product,
      categoryIndex,
      categoryName: categories[categoryIndex]?.name || "Unknown Component"
    };
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));

    // 🔥 FIX ISSUE #1: Unlock next category if this is the first time adding to this slot
    // Handle optional categories properly
    if (!cart[categoryIndex] && !unlockedCategories.includes(categoryIndex + 1) && categoryIndex + 1 < categories.length) {
      const newUnlocked = [...unlockedCategories, categoryIndex + 1];
      setUnlockedCategories(newUnlocked);
    }
  }, [cart, categories, unlockedCategories]);

  /**
   * Remove component from cart
   * FIX ISSUE 1: When removing, set that category as selected and find next priority
   * FIX ISSUE #1: Handle optional categories (GPU) - unlock next category automatically if category is optional
   */
  const handleRemoveFromCart = useCallback((categoryIndex, slotKey = null) => {
    if (slotKey) {
      // Remove multi-slot item from multiSlotCart
      const newMultiSlotCart = { ...multiSlotCart };
      delete newMultiSlotCart[slotKey];
      setMultiSlotCart(newMultiSlotCart);
      localStorage.setItem("multiSlotCart", JSON.stringify(newMultiSlotCart));
      
      // Slot info will be recalculated by the expandCategories useEffect
    } else {
      // Remove base component from cart array
      const newCart = [...cart];
      newCart[categoryIndex] = null;
      setCart(newCart);
      localStorage.setItem("cart", JSON.stringify(newCart));
      
      // If removing motherboard, clear all slot info and multi-slot items
      if (categoryIndex === 2) {
        setMultiSlotCart({});
        localStorage.removeItem("multiSlotCart");
        setDynamicCategories([]);
      }
    }
    
    // FIX ISSUE 1: Set the removed category as selectedItem to show it as priority for enlargement
    setSelectedItem(categoryIndex);
    
    // Use new unlock calculation logic
    const newUnlocked = calculateUnlockedCategories();
    setUnlockedCategories(newUnlocked);
  }, [cart, multiSlotCart, calculateUnlockedCategories]);

  /**
   * Handle start over confirmation
   * FIX ISSUE #1: Clear cart AND navigate to homepage
   */
  const handleStartOver = useCallback(() => {
    // Clear all cart data from localStorage
    localStorage.removeItem("cart");
    localStorage.removeItem("multiSlotCart");
    localStorage.removeItem("customOrders");
    localStorage.removeItem("cartCount");
    localStorage.removeItem("cartTotal");
    
    // Reset local state
    const emptyCart = new Array(categories.length).fill(null);
    setCart(emptyCart);
    setMultiSlotCart({});
    setDynamicCategories([]);
    setSelectedItem(0);
    setUnlockedCategories([0]); // Reset to only first category unlocked
    setShowStartOverModal(false);
    
    // CRITICAL: Navigate back to homepage (different from Cancel Order)
    navigate("/app");
  }, [categories.length, navigate]);

  /**
   * Navigate to checkout - FIX ISSUE 4: Navigate to correct route
   * FIX ISSUE #2: Only allow checkout when all required components are selected
   */
  const handleProceedToCheckout = useCallback(() => {
    // 🔥 CRITICAL FIX: Validate all required components BEFORE opening modal
    // Required: CPU (0), Cooling (1), Motherboard (2), Case (6), PSU (7), at least 1 RAM, at least 1 Storage
    // Optional: GPU (5), additional RAM slots, additional Storage slots
    
    console.log('🔍 Order Summary clicked - Validating required components...');
    
    // This validation is redundant with button disabled state, but kept as safety check
    const cartItems = cart.filter(item => item !== null);
    if (cartItems.length === 0) {
      console.log('❌ No components in cart');
      return; // Button should be disabled, but safety check
    }

    // Check base required components
    const requiredBaseIndices = [0, 1, 2, 6, 7]; // CPU, Cooling, Motherboard, Case, PSU
    const missingComponents = [];
    
    for (const i of requiredBaseIndices) {
      if (!cart[i]) {
        const componentNames = ['CPU', 'Cooling', 'Motherboard', 'RAM', 'Storage', 'GPU', 'Case', 'PSU'];
        missingComponents.push(componentNames[i]);
      }
    }
    
    // Check multiSlotCart for at least 1 RAM (required)
    const multiSlotItems = Object.values(multiSlotCart);
    const hasRAM = multiSlotItems.some(item => {
      const categoryLower = item?.category?.toLowerCase() || '';
      return item && (categoryLower.includes('ram') || categoryLower.includes('memory'));
    });
    
    if (!hasRAM) {
      missingComponents.push('Memory (RAM)');
    }
    
    // Check multiSlotCart for at least 1 Storage (required)
    const hasStorage = multiSlotItems.some(item => {
      const categoryLower = item?.category?.toLowerCase() || '';
      return item && categoryLower.includes('storage');
    });
    
    if (!hasStorage) {
      missingComponents.push('Storage');
    }
    
    if (missingComponents.length > 0) {
      console.log('❌ Missing required components:', missingComponents);
      // DO NOT open modal - button should be disabled
      // This is a safety check only
      return;
    }

    // ✅ All required components present - Open compatibility validation modal
    console.log('✅ All required components present - Opening compatibility validation modal');
    setShowCompatibilityValidationModal(true);
  }, [cart, multiSlotCart]);

  /**
   * Format price display
   */
  const formatPrice = (price) => {
    if (typeof price === "number") {
      return `₱${price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (typeof price === "string") {
      const numPrice = Number.parseFloat(price.replaceAll(/[^\d.]/g, ""));
      if (!Number.isNaN(numPrice)) {
        return `₱${numPrice.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }
    return "Price not available";
  };

  // 🔥 FIX ISSUE #2: COMPLETELY REMOVE LOADING SCREEN
  // No loading state rendering at all - data loads in background
  // Users see empty/previous state instead of loading animation

  return (
    <div className="pc-customizer-container">
      {/* Header - INTEGRATED FROM BACKUP (simpler structure) */}
      <div className="pc-customizer-header">
        <div className="pc-customizer-header-content">
        <img src={Customized} alt="Logo" className="pc-customizer-logo" />
          <div className="pc-customizer-title-container">
            <h1 className="pc-customizer-title">PC CUSTOMIZER</h1>
            <p className="pc-customizer-subtitle">Create your own PC</p>
          </div>
        </div>
      </div>
      
      {/* 🔥 COMPATIBILITY WARNING BANNER - Shows when cart has incompatible components */}
      {cartCompatibilityWarnings.length > 0 && (
        <div className="pc-customizer-compatibility-warning" style={{
          background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
          color: 'white',
          padding: '15px 20px',
          margin: '10px 20px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          boxShadow: '0 4px 15px rgba(255, 0, 0, 0.3)',
          animation: 'pulse 2s infinite'
        }}>
          <span style={{ fontSize: '28px' }}>⚠️</span>
          <div>
            <strong style={{ fontSize: '16px', display: 'block', marginBottom: '5px' }}>
              COMPATIBILITY WARNING DETECTED
            </strong>
            {cartCompatibilityWarnings.map((warning) => (
              <div key={warning.component} style={{ fontSize: '14px', opacity: 0.95 }}>
                ❌ {warning.message}
              </div>
            ))}
            <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
              These selections will be reviewed in the final compatibility check before checkout.
            </div>
          </div>
        </div>
      )}

      {/* Steps - DYNAMIC MULTI-SLOT SUPPORT */}
      <div className="pc-customizer-steps">
        {(dynamicCategories.length > 0 ? dynamicCategories : categories).filter(category => category?.name).map((category, displayIndex) => {
          const isMultiSlot = category.isMultiSlot || false;
          const slotIndex = category.slotIndex || 0;
          const originalIndex = category.originalIndex ?? displayIndex;
          const isOccupiedSlot = category.isOccupied || false;
          const isOptional = isCategoryOptional(originalIndex);
          const isUnlocked = unlockedCategories.includes(originalIndex);

          const baseStepMap = { cpu: 1, cooling: 2, motherboard: 3, ram: 4, memory: 4, storage: 5, gpu: 6, case: 7, psu: 8 };
          const categoryKey = categories[originalIndex]?.category?.toLowerCase() || '';
          const baseStepNumber = baseStepMap[categoryKey] || (originalIndex + 1);
          const slotKey = category.slotKey || `${categoryKey}-${slotIndex}`;

          const component = getStepComponent(category, displayIndex, cart, multiSlotCart, categories);
          const hasComponent = isValidComponent(component);
          const stepClass = getStepClass(isOccupiedSlot, hasComponent, isUnlocked, isOptional, isMultiSlot);
          const isClickable = !isOccupiedSlot && stepClass.includes("unlocked-step");
          const isActive = stepClass.includes("active-step");
          const stepLabel = isMultiSlot ? category.name : `Choose a ${category?.name?.toLowerCase() || "component"}`;

          return (
            <div key={`step-${displayIndex}-${slotIndex}`} className="pc-customizer-step-container">
              <p className="step-subtitle">
                Step {baseStepNumber}: {stepLabel}
                {isOptional && <span className="optional-badge"> (Optional)</span>}
              </p>
              
              <div
                role="button"
                tabIndex={0}
                className={stepClass}
                onClick={() => {
                  if (isOccupiedSlot) return;
                  if (!isActive && !hasComponent) return;
                  handleComponentClick(originalIndex, isMultiSlot ? slotKey : undefined, isMultiSlot ? category.products : undefined);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click(); }}
                style={{ cursor: isClickable ? 'pointer' : 'not-allowed', opacity: isOccupiedSlot ? 0.5 : 1 }}
              >
                <div className="step-icon">
                  <img src={component?.image || category?.image || CPU1} alt={component?.name || category?.name || "Component"} />
                </div>
                <div className="step-details">
                  <p className="step-title">{hasComponent && component?.name ? component.name : (category?.name || "Not selected")}</p>
                  <p className="step-price">{hasComponent && component?.price ? formatPrice(component.price) : ""}</p>
                </div>
                <div className="step-button-container">
                  <button
                    type="button"
                    tabIndex={0}
                    className={`step-add-minus-icon${hasComponent ? " minus-active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasComponent) {
                        handleRemoveFromCart(isMultiSlot ? originalIndex : displayIndex, isMultiSlot ? slotKey : undefined);
                      } else if (isActive) {
                        handleComponentClick(originalIndex, isMultiSlot ? slotKey : undefined, isMultiSlot ? category.products : undefined);
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click(); }}
                  >
                    {hasComponent && <div className="step-minus-icon">−</div>}
                    {!hasComponent && isActive && <div className="step-add-icon">+</div>}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Section */}
      <div className="pc-customized-bottom-section">
        <div className="pc-customized-process-container">
          <div className="pc-customized-order-info">
            <div className="pc-customized-cart-icon">
              <img src={Chest} alt="Cart" />
              {cart.some(item => item !== null) && (
                <div className="pc-customized-notification">
                  {cart.filter(item => item !== null).length}
                </div>
              )}
            </div>
            <div className="pc-customized-total-label">
              <div className="pc-customized-total">TOTAL</div>
              <div className="pc-customized-price">
                ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="pc-customized-right-buttons">
            <button
              className="pc-customized-order-summary"
              onClick={handleProceedToCheckout}
              disabled={(() => {
                // 🔥 CRITICAL FIX: Order Summary button requirements:
                // REQUIRED: CPU (0), Cooling (1), Motherboard (2), Case (6), PSU (7), at least 1 RAM, at least 1 Storage
                // OPTIONAL: GPU (5) - user can build without dedicated GPU if CPU has integrated graphics
                
                const requiredBaseIndices = [0, 1, 2, 6, 7]; // CPU, Cooling, Motherboard, Case, PSU
                const missingComponents = [];
                
                for (const i of requiredBaseIndices) {
                  const hasComponent = cart[i] !== null;
                  if (!hasComponent) {
                    const componentNames = ['CPU', 'Cooling', 'Motherboard', 'RAM', 'Storage', 'GPU', 'Case', 'PSU'];
                    missingComponents.push(componentNames[i]);
                  }
                }
                
                // Check multiSlotCart for at least 1 RAM and 1 Storage
                const multiSlotItems = Object.values(multiSlotCart);
                const hasRAM = multiSlotItems.some(item => {
                  const categoryLower = item?.category?.toLowerCase() || '';
                  return item && (categoryLower.includes('ram') || categoryLower.includes('memory'));
                });
                const hasStorage = multiSlotItems.some(item => {
                  const categoryLower = item?.category?.toLowerCase() || '';
                  return item && categoryLower.includes('storage');
                });
                
                if (!hasRAM) missingComponents.push('RAM');
                if (!hasStorage) missingComponents.push('Storage');
                
                // 🔥 CRITICAL: Also check for compatibility warnings
                const isDisabled = missingComponents.length > 0;
                
                if (missingComponents.length > 0) {
                  console.log('🔒 Order Summary disabled - Missing components:', missingComponents.join(', '));
                } else {
                  console.log('✅ Order Summary enabled - All required components present (GPU is optional)');
                }
                
                return isDisabled;
              })()}
            >
              Order Summary
            </button>
            <div className="pc-customized-action-buttons">
              <button
                className="pc-customized-cancel-order"
                onClick={() => {
                  // FIXED ISSUE #2: Clear cart but stay on PC Customized page
                  // Clear all cart data
                  localStorage.removeItem("cart");
                  localStorage.removeItem("multiSlotCart");
                  localStorage.removeItem("customOrders");
                  localStorage.removeItem("cartCount");
                  localStorage.removeItem("cartTotal");
                  
                  // Reset local state to start fresh
                  setCart(new Array(categories.length).fill(null));
                  setMultiSlotCart({});
                  setDynamicCategories([]);
                  setUnlockedCategories([0]); // Reset to only first category unlocked
                  
                  // Stay on PC Customized page - user can start a new build
                  // Removed: navigate("/") - No navigation, stay here!
                }}
              >
                Cancel Order
              </button>
              <button
                className="pc-customized-start-over"
                onClick={() => setShowStartOverModal(true)}
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Start Over Modal - INTEGRATED FROM BACKUP (cleaner design) */}
      {showStartOverModal && (
        <div className="pc-customized-modal-overlay">
          <div className="pc-customized-modal-background"></div>
          <div className="pc-customized-modal">
            <h2 className="pc-customized-modal-title">
              ARE YOU SURE YOU WANT TO<br /><span>START OVER?</span>
            </h2>
            <div className="pc-customized-modal-buttons">
              <button
                className="pc-customized-modal-btn"
                onClick={() => setShowStartOverModal(false)}
              >
                NO
              </button>
              <button
                className="pc-customized-modal-btn yes"
                onClick={handleStartOver}
              >
                YES
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ✅ NEW: Enhanced Compatibility Validation Modal for Order Summary */}
      {showCompatibilityValidationModal && (
        <CompatibilityValidationModal
          isOpen={showCompatibilityValidationModal}
          cartItems={[
            ...cart.filter(item => item !== null),
            ...Object.values(multiSlotCart).filter(item => item !== null)
          ]}
          pageName="PC-Customized"
          onClose={() => setShowCompatibilityValidationModal(false)}
          onProceed={() => {
            setShowCompatibilityValidationModal(false);
            // Combine cart and multiSlotCart for navigation
            // 🔥 CRITICAL FIX: Keep cart as indexed array (NOT filtered) to preserve positions
            // Filtering loses indices: [null, Cooling, null, ...] → [Cooling] breaks indexing!
            const baseCartItems = cart.filter(item => item !== null);
            const multiSlotItems = Object.values(multiSlotCart).filter(item => item !== null);
            const allCartItems = [...baseCartItems, ...multiSlotItems];
            
            // 🔥 CRITICAL FIX: Save the FULL indexed cart array, not a filtered version
            // This preserves the indices so items stay in correct positions when returning
            localStorage.setItem("cart", JSON.stringify(cart)); // Keep full indexed array
            localStorage.setItem("multiSlotCart", JSON.stringify(multiSlotCart));
            
            console.log('💾 Saved cart to localStorage (full indexed):', cart.map((item, idx) => item ? `[${idx}] ${item.name}` : `[${idx}] null`));
            console.log('💾 Saved multiSlotCart to localStorage:', Object.keys(multiSlotCart));
            
            navigate("/peripherals-prompt", {
              state: {
                from: "pc-customized",
                selectedCategory: selectedItem,
                cartItems: allCartItems,
                totalPrice,
                buildType: "custom",
                buildComponents: allCartItems.reduce((acc, item) => {
                  acc[(item.category || item.categoryName || '').toLowerCase()] = item;
                  return acc;
                }, {})
              }
            });
          }}
        />
      )}

    </div>
  );
};

// Export backward compatibility items for other components
export const menuItems = [
  { name: "Home", image: Vector, category: "home" },
  { name: "Central Processing Unit", image: CPU1, category: "cpu" },
  { name: "CPU Cooler", image: CPUCooler, category: "cooling" },
  { name: "Graphics Processing Unit", image: GPU1, category: "gpu" },
  { name: "Motherboard", image: Motherboard1, category: "motherboard" },
  { name: "Memory (RAM)", image: Ram, category: "ram" },
  { name: "Storage", image: Storage1, category: "storage" },
  { name: "PC Case", image: SystemUnit1, category: "case" },
  { name: "Power Supply Unit", image: PSU1, category: "psu" }
];

export const updateCartIcon = (count) => {
  console.warn('updateCartIcon is deprecated. Please use the new cart management system.');
  // Find cart icon and update count
  const cartIcon = document.querySelector('.pc-customized-cart-icon .pc-customized-notification');
  if (cartIcon) {
    cartIcon.textContent = count;
    cartIcon.style.display = count > 0 ? 'flex' : 'none';
  }
};

export default PCCustomized;
