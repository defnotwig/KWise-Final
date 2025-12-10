import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./PCCustomized.css";

// Import the centralized API
import api from "../api/api";
import { filterCompatibleProducts } from "../utils/compatibilityFilter"; // 🔥 CRITICAL: Import client-side filter

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

const PCCustomized = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Add location hook to detect navigation changes

  // State management for real-time data
  const [categories, setCategories] = useState([]);
  const [selectedItem, setSelectedItem] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false); // 🔥 FIX ISSUE #2: Start with false - NO loading screen on initial render
  // Removed error state - using fallback categories instead

  // 🆕 DYNAMIC MULTI-SLOT CATEGORIES STATE
  const [dynamicCategories, setDynamicCategories] = useState([]); // Enhanced categories with dynamic RAM/Storage slots
  const [multiSlotCart, setMultiSlotCart] = useState({}); // Separate cart for multi-slot items { 'ram-0': item, 'ram-1': item, 'storage-m2-0': item }

  // Cart state - base 8 components (CPU, Cooling, Motherboard, RAM, Storage, GPU, Case, PSU)
  const [cart, setCart] = useState(new Array(8).fill(null));
  const [totalPrice, setTotalPrice] = useState(0);
  const [unlockedCategories, setUnlockedCategories] = useState([0]); // First category (CPU) always unlocked

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
    const hasCPU = cart[0] !== null;
    const hasCooling = cart[1] !== null;
    const hasMotherboard = cart[2] !== null;
    const hasGPU = cart[5] !== null;
    const hasCase = cart[6] !== null;
    
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
      unlocked.push(5); // Unlock GPU (optional - user can skip)
      unlocked.push(6); // Unlock Case (required before PSU)
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
    const warnings = [];
    
    // Get GPU from cart (index 5)
    const gpu = cart[5];
    // Get Case from cart (index 6)
    const pcCase = cart[6];
    // Get Cooler from cart (index 1)
    const cooler = cart[1];
    
    // Check GPU vs Case clearance
    if (gpu && pcCase) {
      const gpuDims = gpu.dimensions || {};
      const gpuSpecs = gpu.specifications || {};
      const caseDims = pcCase.dimensions || {};
      const caseSpecs = pcCase.specifications || {};
      
      // Get GPU length
      let gpuLength = gpuDims.length_mm || gpuSpecs.length_mm || gpuSpecs.length;
      if (typeof gpuLength === 'string') gpuLength = parseInt(gpuLength.replace(/mm/gi, ''));
      
      // Get Case max GPU length
      let caseMaxGPU = caseDims.max_gpu_length_mm || caseSpecs.max_gpu_length_mm || caseSpecs.max_gpu_length;
      if (typeof caseMaxGPU === 'string') caseMaxGPU = parseInt(caseMaxGPU.replace(/mm/gi, ''));
      
      if (gpuLength && caseMaxGPU && gpuLength > caseMaxGPU) {
        warnings.push({
          type: 'critical',
          component: 'GPU/Case',
          message: `GPU (${gpuLength}mm) exceeds Case max GPU length (${caseMaxGPU}mm)`,
          gpu: gpu.name,
          case: pcCase.name,
          gpuLength,
          caseMaxGPU
        });
        console.log(`🔴 COMPATIBILITY ERROR: GPU ${gpu.name} (${gpuLength}mm) doesn't fit in ${pcCase.name} (max ${caseMaxGPU}mm)`);
      }
    }
    
    // Check Cooler vs Case clearance
    if (cooler && pcCase) {
      const coolerDims = cooler.dimensions || {};
      const coolerSpecs = cooler.specifications || {};
      const caseDims = pcCase.dimensions || {};
      const caseSpecs = pcCase.specifications || {};
      
      // Get Cooler height
      let coolerHeight = coolerDims.height_mm || coolerSpecs.height_mm || coolerSpecs.height;
      if (typeof coolerHeight === 'string') coolerHeight = parseInt(coolerHeight.replace(/mm/gi, ''));
      
      // Get Case max cooler height
      let caseMaxCooler = caseDims.max_cooler_height_mm || caseSpecs.max_cooler_height_mm || caseSpecs.max_cpu_cooler_height_mm;
      if (typeof caseMaxCooler === 'string') caseMaxCooler = parseInt(caseMaxCooler.replace(/mm/gi, ''));
      
      if (coolerHeight && caseMaxCooler && coolerHeight > caseMaxCooler) {
        warnings.push({
          type: 'critical',
          component: 'Cooler/Case',
          message: `Cooler (${coolerHeight}mm) exceeds Case max cooler height (${caseMaxCooler}mm)`,
          cooler: cooler.name,
          case: pcCase.name,
          coolerHeight,
          caseMaxCooler
        });
        console.log(`🔴 COMPATIBILITY ERROR: Cooler ${cooler.name} (${coolerHeight}mm) doesn't fit in ${pcCase.name} (max ${caseMaxCooler}mm)`);
      }
      
      // 🔥 CRITICAL FIX: Check AIO radiator size vs Case radiator support
      const coolerName = (cooler.name || '').toUpperCase();
      const coolerDesc = (cooler.description || '').toUpperCase();
      const coolerText = `${coolerName} ${coolerDesc}`;
      
      // Check if cooler is an AIO
      const isAIO = coolerSpecs.water_cooled === true || 
                    coolerSpecs.type === 'AIO' || 
                    coolerSpecs.cooling_type === 'AIO' ||
                    coolerText.includes('AIO') || 
                    coolerText.includes('LIQUID') || 
                    coolerText.includes('WATER') ||
                    coolerText.match(/\b(120|240|280|360|420)\s?(MM|BLACK|WHITE|RGB|ARGB|PRO|ELITE)?\b/);
      
      if (isAIO) {
        // Extract radiator size from cooler name
        let radiatorSize = coolerSpecs.radiator_size || coolerSpecs.radiator_mm;
        if (!radiatorSize) {
          // Parse from name: look for 120, 240, 280, 360, 420
          const sizeMatch = coolerName.match(/\b(420|360|280|240|120)\b/);
          if (sizeMatch) {
            radiatorSize = parseInt(sizeMatch[1]);
          }
        } else if (typeof radiatorSize === 'string') {
          radiatorSize = parseInt(radiatorSize.replace(/mm/gi, ''));
        }
        
        // 🔥 FIX: Get case radiator support - check ALL possible field names and parse strings properly
        let caseRadiatorSupport = null;
        
        // Priority 1: Direct numeric fields from specifications
        if (caseSpecs.front_radiator_support) {
          caseRadiatorSupport = parseInt(caseSpecs.front_radiator_support);
        } else if (caseSpecs.top_radiator_support) {
          caseRadiatorSupport = parseInt(caseSpecs.top_radiator_support);
        } else if (caseSpecs.max_radiator_size) {
          caseRadiatorSupport = parseInt(caseSpecs.max_radiator_size);
        } else if (caseDims.front_radiator_support) {
          caseRadiatorSupport = parseInt(caseDims.front_radiator_support);
        } else if (caseDims.top_radiator_support) {
          caseRadiatorSupport = parseInt(caseDims.top_radiator_support);
        } else if (caseDims.max_radiator_size) {
          caseRadiatorSupport = parseInt(caseDims.max_radiator_size);
        }
        
        // Priority 2: Parse string fields (like "280mm front, 120mm rear")
        if (!caseRadiatorSupport || isNaN(caseRadiatorSupport)) {
          const radSupportStr = caseSpecs.radiator_support || caseDims.radiator_support || '';
          if (typeof radSupportStr === 'string' && radSupportStr) {
            const radMatches = radSupportStr.match(/(\d{2,3})mm/g);
            if (radMatches && radMatches.length > 0) {
              const sizes = radMatches.map(m => parseInt(m.replace('mm', '')));
              caseRadiatorSupport = Math.max(...sizes);
            }
          }
        }
        
        console.log(`🧊 AIO Check: Cooler ${cooler.name} is AIO with ${radiatorSize}mm radiator, Case ${pcCase.name} supports ${caseRadiatorSupport}mm`);
        
        if (radiatorSize && caseRadiatorSupport && !isNaN(caseRadiatorSupport) && radiatorSize > caseRadiatorSupport) {
          warnings.push({
            type: 'critical',
            component: 'Cooler/Case (AIO)',
            message: `AIO radiator (${radiatorSize}mm) exceeds Case max radiator support (${caseRadiatorSupport}mm)`,
            cooler: cooler.name,
            case: pcCase.name,
            radiatorSize,
            caseRadiatorSupport
          });
          console.log(`🔴 COMPATIBILITY ERROR: AIO ${cooler.name} (${radiatorSize}mm radiator) doesn't fit in ${pcCase.name} (max ${caseRadiatorSupport}mm radiator)`);
        }
      }
    }
    
    // 🔥 CRITICAL FIX: Check PSU vs GPU 12VHPWR connector compatibility
    // Get PSU from cart (index 7)
    const psu = cart[7];
    if (gpu && psu) {
      const gpuDims = gpu.dimensions || {};
      const gpuSpecs = gpu.specifications || {};
      const psuSpecs = psu.specifications || {};
      const gpuName = (gpu.name || '').toUpperCase();
      
      // Check if GPU requires 12VHPWR connector (RTX 4000 series)
      const powerConnectors = gpuDims.power_connectors || gpuSpecs.power_connectors || gpuSpecs['Power Connectors'] || '';
      const powerConnStr = String(powerConnectors).toUpperCase();
      
      // RTX 4000 series detection
      const isRTX4000 = gpuName.includes('RTX40') || gpuName.includes('RTX 40') || 
                        gpuName.includes('RTX4070') || gpuName.includes('RTX4080') || gpuName.includes('RTX4090');
      const gpuRequires12VHPWR = isRTX4000 || powerConnStr.includes('12VHPWR') || powerConnStr.includes('16-PIN') || powerConnStr.includes('16PIN');
      
      if (gpuRequires12VHPWR) {
        // Check if PSU has 12VHPWR connector
        const psuHas12VHPWR = psuSpecs.has_12vhpwr_connector === true || 
                              String(psuSpecs.pcie_connectors || '').toUpperCase().includes('12VHPWR') ||
                              String(psuSpecs.pcie_connectors || '').toUpperCase().includes('16-PIN') ||
                              String(psuSpecs['Power Connectors'] || '').toUpperCase().includes('12VHPWR');
        
        if (!psuHas12VHPWR) {
          warnings.push({
            type: 'critical',
            component: 'PSU/GPU',
            message: `PSU lacks 12VHPWR connector required by ${gpu.name}`,
            psu: psu.name,
            gpu: gpu.name,
            reason: 'RTX 4000 series GPUs require a 12VHPWR (16-pin) power connector'
          });
          console.log(`🔴 COMPATIBILITY ERROR: PSU ${psu.name} lacks 12VHPWR connector for RTX 4000 GPU ${gpu.name}`);
        }
      }
    }
    
    // 🔥 CRITICAL FIX: Check CPU vs Motherboard socket compatibility
    const cpu = cart[0];
    const motherboard = cart[2];
    if (cpu && motherboard) {
      const cpuSpecs = cpu.specifications || {};
      const mbSpecs = motherboard.specifications || {};
      const cpuSocket = (cpuSpecs.socket || '').toUpperCase();
      const mbSocket = (mbSpecs.socket || '').toUpperCase();
      
      if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
        warnings.push({
          type: 'critical',
          component: 'CPU/Motherboard',
          message: `CPU socket (${cpuSocket}) doesn't match Motherboard socket (${mbSocket})`,
          cpu: cpu.name,
          motherboard: motherboard.name,
          cpuSocket,
          mbSocket
        });
        console.log(`🔴 COMPATIBILITY ERROR: CPU ${cpu.name} (${cpuSocket}) incompatible with ${motherboard.name} (${mbSocket})`);
      }
    }
    
    // 🔥 CRITICAL FIX: Check RAM vs Motherboard DDR type compatibility
    const ram = cart[3]; // First RAM slot or check multiSlotCart
    if (motherboard) {
      const mbSpecs = motherboard.specifications || {};
      const mbDDR = (mbSpecs.memory_type || '').toUpperCase();
      
      // Check main RAM slot
      if (ram && mbDDR) {
        const ramSpecs = ram.specifications || {};
        const ramDDR = (ramSpecs.type || ramSpecs.memory_type || '').toUpperCase();
        
        if (ramDDR && mbDDR && !ramDDR.includes(mbDDR) && !mbDDR.includes(ramDDR)) {
          warnings.push({
            type: 'critical',
            component: 'RAM/Motherboard',
            message: `RAM (${ramDDR}) incompatible with Motherboard (${mbDDR})`,
            ram: ram.name,
            motherboard: motherboard.name,
            ramDDR,
            mbDDR
          });
          console.log(`🔴 COMPATIBILITY ERROR: RAM ${ram.name} (${ramDDR}) incompatible with ${motherboard.name} (${mbDDR})`);
        }
      }
    }
    
    return warnings;
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
    setUnlockedCategories(newUnlocked);
  }, [cart, multiSlotCart, calculateUnlockedCategories, categories]);

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
      categoryName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
          const price = parseFloat(item?.price) || 0;
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
    
    if (selectedCategoryFromState !== null && selectedCategoryFromState !== undefined) {
      const categoryIndex = parseInt(selectedCategoryFromState, 10);
      
      if (!isNaN(categoryIndex) && categoryIndex >= 0 && categoryIndex < 8) {
        console.log('🎯 Navigation state detected - selectedCategory:', categoryIndex);
        setSelectedItem(categoryIndex);
        
        // Clear the state after using it to prevent re-triggering
        window.history.replaceState({}, document.title);
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
      window.location.search.includes('added=true') ||  // Added item flag
      window.location.search.includes('selectedCategory') ||  // Selected category flag
      window.history.state?.usr ||  // React Router navigation state
      sessionStorage.getItem('pcCustomizedLoaded') === 'true';  // Session flag
    
    // If returning from navigation and categories already loaded, skip loading
    if (fromNavigation && categories.length > 0) {
      console.log('🔄 Returning from navigation - skipping data reload');
      setLoading(false);  // 🔥 Ensure loading is false
      return;
    }
    
    // If categories already loaded (component remount), skip loading
    if (categories.length > 0) {
      console.log('✅ Categories already loaded - skipping reload');
      setLoading(false);  // 🔥 Ensure loading is false
      return;
    }
    
    const loadBuildComponents = async () => {
      try {
        setLoading(true);
        console.log('🔄 Loading build components using direct category approach...');

        // Instead of using getBuildComponents (which has issues),
        // let's directly fetch all products for each category using getCategoryProducts
        const categoryNames = ['CPU', 'Cooling', 'Motherboard', 'RAM', 'Storage', 'GPU', 'Case', 'PSU'];
        
        console.log('📦 Fetching categories individually to avoid getBuildComponents issues...');
        
        const categoriesData = {};
        
        // 🔥 FIX ISSUE #3: Increase limit to 500 to get all products (some categories have 59 products)
        for (const categoryName of categoryNames) {
          try {
            console.log(`📦 Fetching ${categoryName} products...`);
            
            // FIX ISSUE 2: Use getCategoryProducts for better image/spec handling
            const categoryResponse = await api.kiosk.getCategoryProducts(categoryName, { limit: 500 });
            const categoryBrands = await api.kiosk.getCategoryBrands(categoryName);
            
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
        }
        
        console.log('📦 All categories loaded using direct approach');

        // Transform categories data into the expected structure  
        const dynamicCategories = Object.entries(categoriesData)
          .filter(([categoryKey, categoryData]) => categoryKey && categoryData) // Filter out invalid entries
          .map(([categoryKey, categoryData]) => ({
            name: formatCategoryNameLocal(categoryKey) || categoryKey,
            image: defaultCategoryImages[categoryKey.toLowerCase()] || CPU1,
            category: categoryKey,
            brands: Array.isArray(categoryData.brands) ? categoryData.brands : [],
            products: Array.isArray(categoryData.products) ? categoryData.products.map(product => ({
              ...product,
              // FIX ISSUE 2: Ensure proper image URL processing
              image: product.image || api.utils.getFullImageUrl(product.imageUrl) || defaultCategoryImages[categoryKey.toLowerCase()] || CPU1,
              imageUrl: product.imageUrl || product.image,
              // FIX ISSUE 2: Ensure specifications AND dimensions are preserved
              specifications: product.specifications || {},
              dimensions: product.dimensions || {}, // 🔥 CRITICAL FIX: Preserve dimensions for compatibility validation
              description: product.description || '',
              category: categoryKey.toLowerCase()
            })) : []
          }));

        // Sort categories by typical build order
        const buildOrder = ['cpu', 'cooling', 'motherboard', 'ram', 'storage', 'gpu', 'case', 'psu'];
        const sortedCategories = dynamicCategories.sort((a, b) => {
          const indexA = buildOrder.indexOf(a.category.toLowerCase());
          const indexB = buildOrder.indexOf(b.category.toLowerCase());
          return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

        // Filter out any invalid categories before setting state
        const validCategories = sortedCategories.filter(cat => cat && cat.name && cat.category);
        
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
        setLoading(false);
      }
    };

    loadBuildComponents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCategoryImages, formatCategoryNameLocal]);  // 🔥 FIX: Remove categories.length dependency

  /**
   * 🆕 DYNAMIC MULTI-SLOT CATEGORY EXPANSION
   * When motherboard is selected, expand RAM and Storage categories based on available slots
   */
  useEffect(() => {
    const expandCategories = async () => {
      if (!categories || categories.length === 0) return;

      // Find motherboard in cart
      const motherboardIndex = categories.findIndex(cat => 
        cat.category?.toLowerCase() === 'motherboard'
      );

      const motherboard = motherboardIndex >= 0 ? cart[motherboardIndex] : null;

      // If no motherboard selected, use base categories only
      if (!motherboard || !motherboard.specifications) {
        console.log('📦 No motherboard selected - using base categories');
        setDynamicCategories(categories);
        return;
      }

      console.log('🔧 Motherboard selected:', motherboard.name);
      
      // Fetch slot information from backend
      try {
        const existingRAM = Object.values(multiSlotCart).filter(item => {
          const categoryLower = item?.category?.toLowerCase() || '';
          return item && (categoryLower.includes('ram') || categoryLower.includes('memory'));
        });

        const existingStorage = Object.values(multiSlotCart).filter(item => {
          const categoryLower = item?.category?.toLowerCase() || '';
          return item && categoryLower.includes('storage');
        });

        // Calculate which physical slots are occupied by RAM (accounting for sticks_count)
        const ramOccupiedSlots = [];
        console.log('🔍 DEBUG: Analyzing multiSlotCart for RAM occupation:', Object.keys(multiSlotCart));
        console.log('🔍 DEBUG: Full multiSlotCart:', JSON.stringify(multiSlotCart, null, 2));
        
        Object.entries(multiSlotCart).forEach(([slotKey, item]) => {
          // 🔥 ENHANCED: More flexible category matching - check if category contains 'ram' or 'memory'
          const categoryLower = item?.category?.toLowerCase() || '';
          const isRAM = categoryLower.includes('ram') || categoryLower.includes('memory');
          
          console.log(`🔍 Checking slotKey: ${slotKey}, category: "${item?.category}", isRAM: ${isRAM}`);
          
          if (item && isRAM) {
            const slotMatch = slotKey.match(/ram-(\d+)/);
            if (slotMatch) {
              const startSlot = parseInt(slotMatch[1]);
              console.log(`🔍 DEBUG: Found RAM item - slotKey: ${slotKey}, category: "${item.category}", item:`, {
                name: item.name,
                specifications: item.specifications,
                sticks_count: item.specifications?.sticks_count,
                total_capacity_gb: item.specifications?.total_capacity_gb
              });
              
              // 🔥 CRITICAL FIX: Properly read sticks_count from specifications
              let sticksCount = item.specifications?.sticks_count;
              
              // If sticks_count is already a number, use it directly
              if (typeof sticksCount === 'number') {
                console.log(`✅ Using sticks_count=${sticksCount} from specifications`);
              } else if (typeof sticksCount === 'string') {
                sticksCount = parseInt(sticksCount);
                console.log(`✅ Parsed sticks_count=${sticksCount} from string`);
              }
              
              // Fallback: Parse from configuration field (e.g., "2x8GB", "4x8GB")
              if (!sticksCount && item.specifications?.configuration) {
                const configMatch = item.specifications.configuration.match(/^(\d+)x/i);
                if (configMatch) {
                  sticksCount = parseInt(configMatch[1]);
                  console.log(`💡 Inferred sticks_count=${sticksCount} from configuration: "${item.specifications.configuration}"`);
                }
              }
              
              // Fallback: Parse from product name (e.g., "16GB Kit (2x8GB)", "(4x8GB)")
              if (!sticksCount && item.name) {
                const nameMatch = item.name.match(/\((\d+)x\d+GB\)/i);
                if (nameMatch) {
                  sticksCount = parseInt(nameMatch[1]);
                  console.log(`💡 Inferred sticks_count=${sticksCount} from product name: "${item.name}"`);
                }
              }
              
              // Final fallback: Default to 1 (single stick)
              if (!sticksCount || isNaN(sticksCount)) {
                sticksCount = 1;
                console.log(`⚠️ Using default sticks_count=1 (could not determine from data)`);
              }
              
              const totalCapacity = parseInt(item.specifications?.total_capacity_gb) || 0;
              
              console.log(`🎰 RAM occupation: "${item.name}" in slot ${startSlot}, sticks=${sticksCount}, total_capacity=${totalCapacity}GB`);
              
              // Mark all slots occupied by this RAM kit
              for (let i = 0; i < sticksCount; i++) {
                const slotToOccupy = startSlot + i;
                ramOccupiedSlots.push(slotToOccupy);
                console.log(`   ✓ Slot ${slotToOccupy} OCCUPIED by ${item.name}`);
              }
            } else {
              console.warn(`⚠️ WARNING: RAM item found but slotKey "${slotKey}" doesn't match ram-(\\d+) pattern!`);
            }
          } else if (item) {
            console.log(`🔍 DEBUG: Skipping non-RAM item - slotKey: ${slotKey}, category: "${item.category}"`);
          }
        });
        
        console.log(`🎰 FINAL ramOccupiedSlots array:`, ramOccupiedSlots);

        // Calculate which physical slots are occupied by Storage
        const storageOccupiedSlots = [];
        Object.entries(multiSlotCart).forEach(([slotKey, item]) => {
          if (item && item.category && item.category.toLowerCase() === 'storage') {
            const m2Match = slotKey.match(/storage-m2-(\d+)/);
            const sataMatch = slotKey.match(/storage-sata-(\d+)/);
            if (m2Match) {
              storageOccupiedSlots.push(parseInt(m2Match[1]));
            } else if (sataMatch) {
              const totalM2 = parseInt(motherboard.specifications?.m2_slots) || 0;
              storageOccupiedSlots.push(totalM2 + parseInt(sataMatch[1]));
            }
          }
        });

        console.log('🎰 Occupied slots:', { ram: ramOccupiedSlots, storage: storageOccupiedSlots });

        // Get slot information from backend
        const [ramSlotResult, storageSlotResult] = await Promise.all([
          api.builder.checkRAMSlots(motherboard, existingRAM).catch(err => {
            console.error('Error fetching RAM slots:', err);
            return { totalSlots: parseInt(motherboard.specifications?.ram_slots) || 4, usedSlots: 0, availableSlots: parseInt(motherboard.specifications?.ram_slots) || 4 };
          }),
          api.builder.checkStorageSlots(motherboard, existingStorage).catch(err => {
            console.error('Error fetching Storage slots:', err);
            const m2Slots = parseInt(motherboard.specifications?.m2_slots) || 0;
            const sataSlots = parseInt(motherboard.specifications?.sata_ports) || 0;
            return { 
              m2: { total: m2Slots, used: 0, available: m2Slots }, 
              sata: { total: sataSlots, used: 0, available: sataSlots } 
            };
          })
        ]);

        console.log('🎰 Slot Info:', { ram: ramSlotResult, storage: storageSlotResult });

        // Generate dynamic categories with expanded RAM and Storage slots
        const expanded = [];
        
        for (let i = 0; i < categories.length; i++) {
          const cat = categories[i];
          const catLower = cat.category?.toLowerCase();

          // RAM category - expand to match available slots
          if (catLower === 'ram' || catLower === 'memory') {
            const totalSlots = ramSlotResult.totalSlots || 4;
            console.log(`💾 Expanding RAM to ${totalSlots} slots`);
            console.log(`💾 RAM occupied slots:`, ramOccupiedSlots);
            
            for (let slot = 0; slot < totalSlots; slot++) {
              const isOccupied = ramOccupiedSlots.includes(slot);
              const slotKey = `ram-${slot}`;
              const hasItem = !!multiSlotCart[slotKey];
              
              // 🔥 FIX: Calculate remaining available slots for this slot
              const availableSlotsRemaining = totalSlots - ramOccupiedSlots.length;
              console.log(`   Slot ${slot + 1} (${slotKey}): hasItem=${hasItem}, isOccupied=${isOccupied}, availableRemaining=${availableSlotsRemaining}`);
              
              // 🔥 FIX: Filter RAM products to only show configurations that fit in remaining slots
              let filteredRAMProducts = cat.products;
              if (!isOccupied && !hasItem) {
                // Only filter if this slot is available for selection
                filteredRAMProducts = cat.products.filter(product => {
                  // Extract sticks_count from specifications
                  const specs = product.specifications || {};
                  let sticksCount = specs.sticks_count;
                  
                  // If sticks_count is string, parse it
                  if (typeof sticksCount === 'string') {
                    sticksCount = parseInt(sticksCount);
                  }
                  
                  // Fallback: Parse from configuration field (e.g., "2x8GB", "4x8GB")
                  if (!sticksCount && specs.configuration) {
                    const configMatch = specs.configuration.match(/^(\d+)x/i);
                    if (configMatch) {
                      sticksCount = parseInt(configMatch[1]);
                    }
                  }
                  
                  // Fallback: Parse from product name
                  if (!sticksCount && product.name) {
                    const nameMatch = product.name.match(/\((\d+)x\d+GB\)/i);
                    if (nameMatch) {
                      sticksCount = parseInt(nameMatch[1]);
                    }
                  }
                  
                  // Default to 1 if cannot determine
                  if (!sticksCount || isNaN(sticksCount)) {
                    sticksCount = 1;
                  }
                  
                  // 🔥 CRITICAL FIX: Only show products that fit in remaining slots
                  const fitsInRemainingSlots = sticksCount <= availableSlotsRemaining;
                  
                  if (!fitsInRemainingSlots) {
                    console.log(`   ❌ Filtered out ${product.name}: needs ${sticksCount} sticks but only ${availableSlotsRemaining} slots remaining`);
                  }
                  
                  return fitsInRemainingSlots;
                });
                
                console.log(`   📦 Filtered RAM products: ${filteredRAMProducts.length}/${cat.products.length} (removed ${cat.products.length - filteredRAMProducts.length} incompatible configurations)`);
              }
              
              expanded.push({
                ...cat,
                name: `Memory (RAM) - Slot ${slot + 1}${isOccupied && !hasItem ? ' (Occupied)' : ''}`,
                slotIndex: slot,
                slotType: 'ram',
                isMultiSlot: true,
                originalIndex: i,
                isOccupied: isOccupied && !hasItem, // Occupied by another kit's sticks
                slotKey: slotKey,
                products: filteredRAMProducts, // 🔥 FIX: Use filtered products
                availableSlotsRemaining: availableSlotsRemaining // Pass this info
              });
            }
          }
          // Storage category - expand to match M.2 + SATA slots (only if they exist)
          else if (catLower === 'storage') {
            const totalM2 = storageSlotResult.m2?.total || 0;
            const totalSATA = storageSlotResult.sata?.total || 0;
            const totalStorageSlots = totalM2 + totalSATA;
            
            console.log(`💿 Expanding Storage to ${totalStorageSlots} slots (M.2: ${totalM2}, SATA: ${totalSATA})`);
            
            // Add M.2 slots only if motherboard has M.2 support
            if (totalM2 > 0) {
              // 🔍 DEBUG: Log filtering for M.2 products
              let m2LogCount = 0;
              const m2Filtered = cat.products.filter(p => {
                const interface_type = (p.specifications?.interface || p.specifications?.bus_type || '').toLowerCase();
                const storage_type = (p.specifications?.storage_type || '').toLowerCase();
                // M.2 NVMe: must have (nvme OR m.2 OR pcie) AND NOT sata
                const isM2 = (interface_type.includes('nvme') || interface_type.includes('m.2') || interface_type.includes('pcie') || storage_type.includes('nvme')) && 
                            !interface_type.includes('sata');
                if (m2LogCount < 3) { // Log first 3 products for debugging
                  console.log(`🔍 M.2 filter check (product ${m2LogCount + 1}):`, p.name, '| interface:', interface_type, '| storage_type:', storage_type, '| isM2:', isM2);
                  m2LogCount++;
                }
                return isM2;
              });
              console.log(`📦 M.2 products found: ${m2Filtered.length} out of ${cat.products.length} total storage products`);
              
              for (let slot = 0; slot < totalM2; slot++) {
                const slotKey = `storage-m2-${slot}`;
                expanded.push({
                  ...cat,
                  name: `Storage - M.2 Slot ${slot + 1}`,
                  slotIndex: slot,
                  slotType: 'storage-m2',
                  isMultiSlot: true,
                  originalIndex: i,
                  requiredInterface: 'nvme',
                  slotKey: slotKey,
                  products: m2Filtered  // 🔥 Use pre-filtered array
                });
              }
            }
            
            // Add SATA slots only if motherboard has SATA support
            if (totalSATA > 0) {
              // 🔍 DEBUG: Log filtering for SATA products
              let sataLogCount = 0;
              const sataFiltered = cat.products.filter(p => {
                const interface_type = (p.specifications?.interface || p.specifications?.bus_type || '').toLowerCase();
                // SATA must have 'sata' in interface AND must NOT have nvme/pcie/m.2
                const isSATA = interface_type.includes('sata') && 
                              !interface_type.includes('nvme') && 
                              !interface_type.includes('pcie') && 
                              !interface_type.includes('m.2');
                if (sataLogCount < 3) { // Log first 3 products for debugging
                  console.log(`🔍 SATA filter check (product ${sataLogCount + 1}):`, p.name, '| interface:', interface_type, '| isSATA:', isSATA);
                  sataLogCount++;
                }
                return isSATA;
              });
              console.log(`📦 SATA products found: ${sataFiltered.length} out of ${cat.products.length} total storage products`);
              
              for (let slot = 0; slot < totalSATA; slot++) {
                const slotKey = `storage-sata-${slot}`;
                expanded.push({
                  ...cat,
                  name: `Storage - SATA Port ${slot + 1}`,
                  slotIndex: totalM2 + slot,
                  slotType: 'storage-sata',
                  isMultiSlot: true,
                  originalIndex: i,
                  requiredInterface: 'sata',
                  slotKey: slotKey,
                  products: sataFiltered  // 🔥 Use pre-filtered array
                });
              }
            }
          }
          // Other categories remain unchanged - but ADD originalIndex for step numbering!
          else {
            expanded.push({
              ...cat,
              originalIndex: i  // 🔥 CRITICAL: Set originalIndex for non-multi-slot categories
            });
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
  }, [categories, cart, multiSlotCart]);

  /**
   * Calculate total price when cart or multiSlotCart changes
   */
  useEffect(() => {
    // Calculate base cart total
    const baseTotal = cart.reduce((sum, item) => {
      if (item && item.price) {
        const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
        return sum + price;
      }
      return sum;
    }, 0);
    
    // Calculate multi-slot cart total
    const multiSlotTotal = Object.values(multiSlotCart).reduce((sum, item) => {
      if (item && item.price) {
        const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
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
            if (category && category.products) {
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
          
          setMultiSlotCart(enhancedMultiSlotCart);
          
          // 🔥 CRITICAL: Update localStorage with enhanced multiSlotCart
          localStorage.setItem("multiSlotCart", JSON.stringify(enhancedMultiSlotCart));
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
          console.log('📊 Parsed cart array:', parsedCart);
          console.log('📊 Cart item at index 0 (CPU):', parsedCart[0]);
          
          // 🔥 CRITICAL FIX: Enhance cart items with dimensions from freshly loaded categories
          // This ensures items saved before the dimension fix still get dimensions
          // 🔥 CRITICAL FIX: Also ensure category field is preserved/restored for compatibility validation
          const enhancedCart = parsedCart.map((item, index) => {
            if (!item) return null;
            
            // Find matching product in categories to get dimensions
            const category = categories[index];
            if (category && category.products) {
              const matchingProduct = category.products.find(p => p.id === item.id);
              if (matchingProduct) {
                // Merge dimensions from category product into cart item
                // 🔥 CRITICAL FIX: Also restore category field if missing (for older cart data)
                const enhancedItem = {
                  ...item,
                  specifications: item.specifications || matchingProduct.specifications || {},
                  dimensions: item.dimensions && Object.keys(item.dimensions).length > 0 
                    ? item.dimensions 
                    : (matchingProduct.dimensions || {}),
                  // 🔥 CRITICAL FIX: Ensure category field exists for compatibility validation
                  category: item.category || matchingProduct.category || category.category?.toLowerCase() || '',
                  categoryName: item.categoryName || category.name || ''
                };
                console.log(`📏 Enhanced ${item.name} with dimensions:`, Object.keys(enhancedItem.dimensions), 'category:', enhancedItem.category);
                return enhancedItem;
              }
            }
            // 🔥 CRITICAL FIX: Even if no matching product found, try to derive category from index
            if (!item.category && category) {
              return {
                ...item,
                category: category.category?.toLowerCase() || '',
                categoryName: item.categoryName || category.name || ''
              };
            }
            return item;
          });
          
          setCart(enhancedCart);
          
          // 🔥 CRITICAL: Update localStorage with enhanced cart (so validation gets dimensions)
          localStorage.setItem("cart", JSON.stringify(enhancedCart));
          console.log('💾 Cart updated with dimensions in localStorage');
          
          // Use new unlock calculation logic
          const newUnlockedCategories = calculateUnlockedCategories();
          console.log('🔓 Final unlocked categories:', newUnlockedCategories);
          console.log('🔓 Category names:', newUnlockedCategories.map(idx => categories[idx]?.name));
          setUnlockedCategories(newUnlockedCategories);
        }
      } catch (error) {
        console.error('❌ Error loading cart from localStorage:', error);
      }
    } else {
      console.log('⚠️ No cart found in localStorage - starting fresh');
      // Initialize empty cart
      const emptyCart = new Array(categories.length).fill(null);
      setCart(emptyCart);
      localStorage.setItem("cart", JSON.stringify(emptyCart));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, categories.length, isCategoryOptional, location]);

  /**
   * 🔥 FIX ISSUE #1: Watch for cart changes from CustomizedDisplay
   * When user adds item via CustomizedDisplay, recalculate unlocked categories
   */
  useEffect(() => {
    const handleStorageChange = (event) => {
      console.log('🔔 Storage change event received:', event.type);
      const savedCart = localStorage.getItem("cart");
      const savedMultiSlotCart = localStorage.getItem("multiSlotCart");
      console.log('📦 Cart from localStorage:', savedCart);
      console.log('📦 MultiSlotCart from localStorage:', savedMultiSlotCart);
      
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
      
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          console.log('📊 Parsed cart:', parsedCart);
          
          if (Array.isArray(parsedCart)) {
            // 🔥 CRITICAL FIX: Enhance cart items with dimensions AND category from categories
            const enhancedCart = parsedCart.map((item, index) => {
              if (!item) return null;
              
              // Find matching product in categories to get dimensions
              const category = categories[index];
              
              // If item already has dimensions AND category, keep it
              if (item.dimensions && Object.keys(item.dimensions).length > 0 && item.category) {
                return item;
              }
              
              if (category && category.products) {
                const matchingProduct = category.products.find(p => p.id === item.id);
                if (matchingProduct) {
                  return {
                    ...item,
                    specifications: item.specifications || matchingProduct.specifications || {},
                    dimensions: item.dimensions && Object.keys(item.dimensions).length > 0 
                      ? item.dimensions 
                      : (matchingProduct.dimensions || {}),
                    // 🔥 CRITICAL FIX: Ensure category field exists for compatibility validation
                    category: item.category || matchingProduct.category || category.category?.toLowerCase() || '',
                    categoryName: item.categoryName || category.name || ''
                  };
                }
              }
              // 🔥 CRITICAL FIX: Even if no matching product, ensure category exists
              if (!item.category && category) {
                return {
                  ...item,
                  category: category.category?.toLowerCase() || '',
                  categoryName: item.categoryName || category.name || ''
                };
              }
              return item;
            });
            
            setCart(enhancedCart);
            
            // Use new unlock calculation logic
            const newUnlockedCategories = calculateUnlockedCategories();
            console.log('🔓 New unlocked categories:', newUnlockedCategories);
            setUnlockedCategories(newUnlockedCategories);
            
            // If an item was just added, update selectedItem to next category
            const lastFilledIndex = parsedCart.findIndex((item, idx) => {
              return item !== null && (idx === parsedCart.length - 1 || parsedCart[idx + 1] === null);
            });
            if (lastFilledIndex >= 0 && lastFilledIndex + 1 < categories.length) {
              console.log(`🎯 Auto-selecting next category: ${lastFilledIndex + 1}`);
              setSelectedItem(lastFilledIndex + 1);
            }
          }
        } catch (error) {
          console.error('❌ Error processing cart change:', error);
        }
      } else {
        console.log('⚠️ No cart in localStorage');
      }
    };

    console.log('👂 Setting up cart change listeners');
    // Listen for storage events (cross-tab) and custom events (same-tab)
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cartUpdated', handleStorageChange);

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up cart change listeners');
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length, isCategoryOptional]);

  /**
   * Handle navigation state for returning from product selection
   */
  useEffect(() => {
    const currentLocation = window.location;
    const urlParams = new URLSearchParams(currentLocation.search);
    const selectedCategory = urlParams.get('selectedCategory');
    const added = urlParams.get('added');
    
    if (selectedCategory !== null) {
      const categoryIndex = parseInt(selectedCategory, 10);
      if (!isNaN(categoryIndex) && categoryIndex >= 0 && categoryIndex < categories.length) {
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
    console.log('🖱️ Category clicked:', categoryIndex, categories[categoryIndex]?.name, 'slotKey:', slotKey);
    console.log('🔍 Category data check:', {
      categoryIndex,
      categoryExists: !!categories[categoryIndex],
      categoryName: categories[categoryIndex]?.name,
      hasProducts: categories[categoryIndex]?.products?.length > 0,
      productsCount: categories[categoryIndex]?.products?.length || 0
    });
    
    const component = slotKey ? multiSlotCart[slotKey] : cart[categoryIndex];
    const hasComponent = component && 
                        typeof component === 'object' &&
                        component.name && 
                        typeof component.name === 'string' &&
                        component.name.trim() !== '' &&
                        component.price !== null &&
                        component.price !== undefined &&
                        (typeof component.price === 'number' ? component.price > 0 : parseFloat(component.price) > 0);
    
    const isUnlocked = unlockedCategories.includes(categoryIndex);
    
    console.log('📊 Click state:', { 
      categoryIndex, 
      categoryName: categories[categoryIndex]?.name,
      hasComponent, 
      isUnlocked,
      componentData: component,
      slotKey 
    });
    
    if (!isUnlocked) {
      console.log('🔒 Category locked, cannot navigate');
      return;
    }
    
    if (hasComponent) {
      console.log('⚠️ Component already selected, but allowing view/change');
    }
    
    setSelectedItem(categoryIndex);

    // 🔥 CRITICAL FIX: Read cart from localStorage to get the LATEST data
    // This ensures we have the most up-to-date cart including any items just added
    let currentCartData = [...cart]; // Start with state
    try {
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          // Merge localStorage cart with state, preferring localStorage for dimensions
          currentCartData = parsedCart.map((lsItem, idx) => {
            if (!lsItem) return cart[idx] || null;
            
            // Check if localStorage item has dimensions
            if (lsItem.dimensions && Object.keys(lsItem.dimensions).length > 0) {
              return lsItem; // Use localStorage item (has dimensions)
            }
            
            // Otherwise try to enhance from categories
            const category = categories[idx];
            if (category && category.products) {
              const matchingProduct = category.products.find(p => p.id === lsItem.id);
              if (matchingProduct && matchingProduct.dimensions) {
                return {
                  ...lsItem,
                  dimensions: matchingProduct.dimensions,
                  specifications: lsItem.specifications || matchingProduct.specifications || {}
                };
              }
            }
            
            return lsItem;
          });
          console.log('🔵 Using localStorage cart with enhanced dimensions');
        }
      }
    } catch (e) {
      console.error('Error reading cart from localStorage:', e);
    }

    // Build selectedComponents object for validation
    // 🔥 CRITICAL FIX: Include ALL fields including dimensions for compatibility filtering
    console.log('🔵 DEBUG: Building selectedComponents from cart...');
    console.log('🔵 Cart data:', currentCartData.map((item, idx) => item ? { idx, name: item.name, category: item.category, hasDims: !!item.dimensions, dimKeys: Object.keys(item.dimensions || {}) } : { idx, item: null }));
    
    const selectedComponents = {};
    currentCartData.forEach((item, idx) => {
      if (item && item.category) {
        console.log(`🔵 Adding cart[${idx}] to selectedComponents['${item.category}']:`, {
          name: item.name,
          hasDims: !!item.dimensions,
          dimKeys: Object.keys(item.dimensions || {}),
          length_mm: item.dimensions?.length_mm
        });
        
        selectedComponents[item.category] = {
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          specifications: item.specifications || {},
          dimensions: item.dimensions || {}, // 🔥 CRITICAL: Include dimensions for GPU clearance
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
    });
    
    // Add multi-slot items to selectedComponents
    Object.values(multiSlotCart).forEach(item => {
      if (item && item.category) {
        selectedComponents[item.category] = {
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          specifications: item.specifications || {},
          dimensions: item.dimensions || {}, // 🔥 CRITICAL: Include dimensions for GPU clearance
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
    });
    
    console.log('🔍 Selected components for compatibility:', Object.keys(selectedComponents));
    
    // 🔥 CRITICAL DEBUG: Log dimensions of selected GPU (if any) for case filtering
    // Check both uppercase and lowercase keys
    const gpuComponent = selectedComponents['gpu'] || selectedComponents['GRAPHICS PROCESSING UNIT'] || selectedComponents['GPU'] || selectedComponents['graphics processing unit'] || selectedComponents['graphics'];
    if (gpuComponent) {
      console.log('🎮 GPU for case filtering:', {
        name: gpuComponent.name,
        hasDims: !!gpuComponent.dimensions && Object.keys(gpuComponent.dimensions).length > 0,
        dimKeys: Object.keys(gpuComponent.dimensions || {}),
        length_mm: gpuComponent.dimensions?.length_mm,
        specs_length: gpuComponent.specifications?.length_mm
      });
    }
    
    // 🔥 CRITICAL FIX: Apply client-side compatibility filter BEFORE navigation
    // This ensures users ONLY see compatible products from the start (step-by-step narrowing)
    let productsToShow = filteredProducts || categories[categoryIndex]?.products || [];
    
    // Apply client-side compatibility filtering if we have selected components
    if (Object.keys(selectedComponents).length > 0 && productsToShow.length > 0) {
      const categoryName = categories[categoryIndex]?.name || '';
      const catLower = categoryName.toLowerCase();
      
      // Determine category key for filtering
      let categoryKey = catLower;
      if (catLower.includes('cooler') || catLower.includes('cool')) categoryKey = 'cooling';
      else if (catLower.includes('cpu') || catLower.includes('processor')) categoryKey = 'cpu';
      else if (catLower.includes('mother')) categoryKey = 'motherboard';
      else if (catLower.includes('ram') || catLower.includes('memory')) categoryKey = 'ram';
      else if (catLower.includes('storage')) categoryKey = 'storage';
      else if (catLower.includes('gpu') || catLower.includes('graphics')) categoryKey = 'gpu';
      else if (catLower.includes('case')) categoryKey = 'case';
      else if (catLower.includes('psu') || catLower.includes('power')) categoryKey = 'psu';
      
      console.log(`🔍 Pre-filtering ${productsToShow.length} ${categoryKey} products based on ${Object.keys(selectedComponents).length} selected components...`);
      const clientFiltered = filterCompatibleProducts(productsToShow, selectedComponents, categoryKey);
      console.log(`✅ Client-side filter: ${productsToShow.length} → ${clientFiltered.length} compatible products (removed ${productsToShow.length - clientFiltered.length} incompatible)`);
      
      productsToShow = clientFiltered;
    }
    
    console.log('🚀 Navigating to category:', categories[categoryIndex]?.name, 'with', productsToShow.length, 'pre-filtered products', slotKey ? `(Slot: ${slotKey})` : '');

    // Navigate with compatibility context and PRE-FILTERED products
    navigate("/customized-products", {
      state: {
        category: categories[categoryIndex],
        categoryIndex,
        currentCart: cart,
        multiSlotCart: multiSlotCart,
        slotKey: slotKey, // Pass slot key for multi-slot items
        returnTo: "/pc-customized",
        categoryName: categories[categoryIndex]?.name,
        products: productsToShow, // 🔥 CRITICAL: Pass pre-filtered products, not all products
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
  const handleAddToCart = useCallback((product, categoryIndex) => {
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
      const numPrice = parseFloat(price.replace(/[^\d.]/g, ""));
      if (!isNaN(numPrice)) {
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
              COMPATIBILITY ISSUE DETECTED
            </strong>
            {cartCompatibilityWarnings.map((warning, idx) => (
              <div key={idx} style={{ fontSize: '14px', opacity: 0.95 }}>
                ❌ {warning.message}
              </div>
            ))}
            <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
              Please change your {cartCompatibilityWarnings[0]?.component?.split('/')[0]} or {cartCompatibilityWarnings[0]?.component?.split('/')[1]} selection to proceed
            </div>
          </div>
        </div>
      )}

      {/* Steps - DYNAMIC MULTI-SLOT SUPPORT */}
      <div className="pc-customizer-steps">
        {(dynamicCategories.length > 0 ? dynamicCategories : categories).filter(category => category && category.name).map((category, displayIndex) => {
          const isMultiSlot = category.isMultiSlot || false;
          const slotIndex = category.slotIndex || 0;
          const originalIndex = category.originalIndex !== undefined ? category.originalIndex : displayIndex;
          
          // Determine base step number (1-8 for main categories)
          const baseStepMap = { cpu: 1, cooling: 2, motherboard: 3, ram: 4, memory: 4, storage: 5, gpu: 6, case: 7, psu: 8 };
          const categoryKey = categories[originalIndex]?.category?.toLowerCase() || '';
          const baseStepNumber = baseStepMap[categoryKey] || (originalIndex + 1);
          
          // Get component from cart
          let component = null;
          if (isMultiSlot) {
            // Multi-slot items stored in multiSlotCart
            // 🔥 CRITICAL FIX: Use category.slotKey which has correct format (ram-0, storage-m2-0, storage-sata-0)
            const slotKey = category.slotKey || `${categoryKey}-${slotIndex}`;
            component = multiSlotCart[slotKey] || null;
            console.log('🔍 Looking up multi-slot item:', { slotKey, found: !!component });
          } else {
            // Base items stored in cart array
            component = cart[originalIndex] || null;
          }
          
          // Check if this category is optional (GPU)
          const isOptional = isCategoryOptional(originalIndex);
          
          // Validate component - must have name AND valid price
          const hasComponent = component && 
                              typeof component === 'object' &&
                              component.name && 
                              typeof component.name === 'string' &&
                              component.name.trim() !== '' &&
                              component.price !== null &&
                              component.price !== undefined &&
                              (typeof component.price === 'number' ? component.price > 0 : parseFloat(component.price) > 0);

          // Enhanced step class logic
          let stepClass = "pc-customizer-step ";
          
          // Check if this slot is occupied by another item's multi-stick configuration
          const isOccupiedSlot = category.isOccupied || false;
          
          // 🔥 CRITICAL FIX: Always check originalIndex for unlock status, not displayIndex!
          // unlockedCategories contains base indices (0-7), not expanded indices
          const isUnlocked = unlockedCategories.includes(originalIndex);

          if (isOccupiedSlot) {
            stepClass += "occupied-slot locked-step ";
          } else if (hasComponent) {
            stepClass += "selected-step unlocked-step ";
          } else if (isUnlocked) {
            stepClass += "active-step unlocked-step ";
            if (isOptional) {
              stepClass += "optional-step ";
            }
          } else {
            stepClass += "inactive-step locked-step ";
          }

          if (isMultiSlot) {
            stepClass += "multi-slot-step ";
          }

          return (
            <div key={`step-${displayIndex}-${category.slotIndex || 0}`} className="pc-customizer-step-container">
              {/* Step subtitle - always show Step X format for base categories */}
              <p className="step-subtitle">
                {isMultiSlot ? (
                  <>
                    Step {baseStepNumber}: {category.name}
                    {isOptional && <span className="optional-badge"> (Optional)</span>}
                  </>
                ) : (
                  <>
                    Step {baseStepNumber}: Choose a {category?.name?.toLowerCase() || "component"}
                    {isOptional && <span className="optional-badge"> (Optional)</span>}
                  </>
                )}
              </p>
              
              <div
                className={stepClass}
                onClick={() => {
                  // Block clicking on occupied slots
                  if (isOccupiedSlot) {
                    console.log('🚫 Cannot click occupied slot:', category.name);
                    return;
                  }
                  
                  // Allow clicking if it's active/unlocked or has component
                  const isActive = stepClass.includes("active-step");
                  const hasComp = stepClass.includes("selected-step");
                  if (isActive || hasComp) {
                    if (isMultiSlot) {
                      // For multi-slot items, use slotKey from category if available, otherwise generate it
                      const slotKey = category.slotKey || `${categoryKey}-${slotIndex}`;
                      console.log('🖱️ Clicking multi-slot category:', category.name, 'with slotKey:', slotKey, 'originalIndex:', originalIndex);
                      // 🔥 CRITICAL FIX: Use originalIndex (base category index) not displayIndex (expanded index)
                      handleComponentClick(originalIndex, slotKey, category.products);
                    } else {
                      // 🔥 CRITICAL FIX: For base items (GPU, Case, PSU), use originalIndex NOT displayIndex!
                      // displayIndex can be 15+ after RAM/Storage expansion, but originalIndex is always 0-7
                      console.log('🖱️ Clicking base category:', category.name, 'displayIndex:', displayIndex, 'originalIndex:', originalIndex);
                      handleComponentClick(originalIndex);
                    }
                  }
                }}
                style={{ 
                  cursor: isOccupiedSlot ? 'not-allowed' : (stepClass.includes("unlocked-step") ? 'pointer' : 'not-allowed'),
                  opacity: isOccupiedSlot ? 0.5 : 1
                }}
              >
                <div className="step-icon">
                  <img 
                    src={component?.image || category?.image || CPU1} 
                    alt={component?.name || category?.name || "Component"} 
                  />
                </div>

                <div className="step-details">
                  <p className="step-title">
                    {/* Show component name if selected, otherwise category name */}
                    {hasComponent && component?.name ? component.name : (category?.name || "Not selected")}
                  </p>
                  <p className="step-price">
                    {/* Show price only if component exists and has valid price */}
                    {hasComponent && component?.price ? formatPrice(component.price) : ""}
                  </p>
                </div>

                {/* Enhanced button logic - multi-slot aware */}
                <div className="step-button-container">
                  <div
                    className={`step-add-minus-icon${hasComponent ? " minus-active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasComponent) {
                        // Remove product from this step
                        if (isMultiSlot) {
                          const slotKey = category.slotKey || `${categoryKey}-${slotIndex}`;
                          console.log('➖ Removing multi-slot component:', category.name, 'slotKey:', slotKey, 'originalIndex:', originalIndex);
                          // 🔥 CRITICAL FIX: Use originalIndex for multi-slot items
                          handleRemoveFromCart(originalIndex, slotKey);
                        } else {
                          handleRemoveFromCart(displayIndex);
                        }
                      } else if (stepClass.includes("active-step")) {
                        // Only allow adding if this is the active step
                        if (isMultiSlot) {
                          const slotKey = category.slotKey || `${categoryKey}-${slotIndex}`;
                          console.log('➕ Adding multi-slot component:', category.name, 'slotKey:', slotKey, 'originalIndex:', originalIndex);
                          // 🔥 CRITICAL FIX: Use originalIndex (base category index) not displayIndex
                          handleComponentClick(originalIndex, slotKey, category.products);
                        } else {
                          handleComponentClick(displayIndex);
                        }
                      }
                    }}
                  >
                    {hasComponent ? (
                      // Show minus button if component exists
                      <div className="step-minus-icon">−</div>
                    ) : stepClass.includes("active-step") ? (
                      // Show plus button only for active (next) step
                      <div className="step-add-icon">+</div>
                    ) : null}
                  </div>
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
              {cart.filter(item => item !== null).length > 0 && (
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
                const hasCompatibilityIssues = cartCompatibilityWarnings.length > 0;
                
                const isDisabled = missingComponents.length > 0 || hasCompatibilityIssues;
                
                if (missingComponents.length > 0) {
                  console.log('🔒 Order Summary disabled - Missing components:', missingComponents.join(', '));
                } else if (hasCompatibilityIssues) {
                  console.log('🔒 Order Summary disabled - Compatibility issues:', cartCompatibilityWarnings.map(w => w.message).join(', '));
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
                  setCart(Array(categories.length).fill(null));
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