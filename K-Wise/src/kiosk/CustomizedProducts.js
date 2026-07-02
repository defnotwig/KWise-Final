import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AlertCircle, CheckCircle, AlertTriangle, X } from "lucide-react";
import "./CustomizedProducts.css";
import Customized from "../assets/Customized.webp";
import dropdown from "../assets/PCParts/dropdown.svg";
import filterspecs from "../assets/CustomProducts/filterspecs.svg";
import api from "../api/api"; // Import centralized API
import { extractBrandsFromProducts, countProductsByBrand, detectProductBrand } from "../utils/brandDetection"; // 🔥 FIX: Import brand detection utility
import KioskProductImage from "../components/KioskProductImage";

// Import default category images
import CPU1 from "../assets/CPU1.webp";
import CPUCooler from "../assets/CPUCooler.webp";
import Motherboard1 from "../assets/Motherboard1.webp";
import Ram from "../assets/Ram.webp";
import Storage1 from "../assets/Storage1.webp";
import GPU1 from "../assets/GPU1.webp";
import SystemUnit1 from "../assets/SystemUnit1.webp";
import PSU1 from "../assets/PSU1.webp";

/** Detect the normalized category key from a raw category string */
function detectCategoryKey(rawCategory) {
  const catLower = (rawCategory || '').toLowerCase();
  let key = catLower
    .trim()
    .replaceAll(/\s+/g, '_')
    .replaceAll(/central_processing_unit/ig, 'cpu')
    .replaceAll(/graphics_processing_unit/ig, 'gpu')
    .replaceAll(/memory_\(ram\)/ig, 'ram')
    .replaceAll(/memory/ig, 'ram')
    .replaceAll(/cpu_cooler/ig, 'cooling')
    .replaceAll(/power_supply_unit/ig, 'psu')
    .replaceAll(/pc_case/ig, 'case');

  if (catLower.includes('cpu') || catLower.includes('processor') || catLower.includes('central processing')) return 'cpu';
  if (catLower.includes('cool') || catLower.includes('fan')) return 'cooling';
  if (catLower.includes('mother')) return 'motherboard';
  if (catLower.includes('ram') || catLower.includes('memory')) return 'ram';
  if (catLower.includes('storage') || catLower.includes('ssd') || catLower.includes('hdd')) return 'storage';
  if (catLower.includes('gpu') || catLower.includes('graphics')) return 'gpu';
  if (catLower.includes('case') || catLower.includes('chassis')) return 'case';
  if (catLower.includes('psu') || catLower.includes('power')) return 'psu';
  return key;
}

/** Build a full component object with all compatibility-relevant fields */
function buildComponentObject(comp) {
  const specs = comp.specifications || comp.normalized_specs || {};
  return {
    id: comp.id,
    name: comp.name,
    category: comp.category || comp.categoryName || '',
    brand: comp.brand || null,
    price: comp.price || 0,
    specifications: specs,
    dimensions: comp.dimensions || {},
    image_url: comp.image_url || comp.imageUrl || comp.file_path || comp.image || null,
    imageVariants: comp.imageVariants || comp.image_variants || null,
    socket: comp.socket || specs.socket,
    memory_type: comp.memory_type || specs.memory_type || specs.type,
    form_factor: comp.form_factor || specs.form_factor,
    tdp: comp.tdp || specs.tdp,
    wattage: comp.wattage || specs.wattage,
    length: comp.length || specs.length,
    max_gpu_length: comp.max_gpu_length || specs.max_gpu_length,
    max_gpu_length_mm: comp.max_gpu_length_mm || specs.max_gpu_length_mm,
    height: comp.height || specs.height,
    pcie_6pin_connectors: comp.pcie_6pin_connectors || specs.pcie_6pin_connectors || 0,
    pcie_8pin_connectors: comp.pcie_8pin_connectors || specs.pcie_8pin_connectors || 0,
    sata_ports: comp.sata_ports || specs.sata_ports,
    m2_slots: comp.m2_slots || specs.m2_slots,
    pcie_slots: comp.pcie_slots || specs.pcie_slots,
    storage_type: comp.storage_type || specs.storage_type || comp.type,
    speed: comp.speed || specs.speed,
  };
}

/** Build the components map from selected components for compatibility checking */
function buildComponentsMap(selectedComponents) {
  const components = {};
  const ramSticks = [];
  for (const comp of selectedComponents) {
    if (!comp) continue;
    const categoryKey = detectCategoryKey(comp.category || comp.categoryName || '');
    if (categoryKey === 'ram') ramSticks.push(comp);
    // For RAM and Storage, only use the first item as reference
    if ((categoryKey === 'ram' || categoryKey === 'storage') && components[categoryKey]) continue;
    components[categoryKey] = buildComponentObject(comp);
  }
  return { components, ramSticks };
}

/** Merge multiSlotCart items into selectedComponents array, avoiding duplicates */
function mergeMultiSlotItems(cartItems, multiSlotCartObj) {
  const selected = cartItems.filter(item => item !== null);
  if (!multiSlotCartObj || Object.keys(multiSlotCartObj).length === 0) return selected;
  for (const item of Object.values(multiSlotCartObj)) {
    if (item?.id && !selected.some(comp => comp?.id === item.id)) {
      selected.push(item);
    }
  }
  return selected;
}

/** Parse a numeric price from a product's price field */
function parseProductPrice(price) {
  if (typeof price === 'number') return price;
  return Number.parseFloat(String(price || '').replaceAll(/[^0-9.]/g, '')) || 0;
}

const CustomizedProducts = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    categoryName, 
    products, 
    brands, 
    currentCart, 
    multiSlotCart,
    slotKey,
    categoryIndex, 
    hasCompatibilityAnalysis 
  } = location.state || {};

  // AI enhancement states
  const [aiEnabled, setAiEnabled] = useState(hasCompatibilityAnalysis || false);

  // Enhanced products with AI analysis (use products from state if they have compatibility data)
  // 🔥 CRITICAL FIX: Ensure enhancedProducts is ALWAYS an array
  const [enhancedProducts, setEnhancedProducts] = useState(() => {
    if (Array.isArray(products)) {
      // 🔥 CRITICAL: Log dimensions from products received via navigation
      if (products.length > 0) {
        console.log(`📦 CustomizedProducts received ${products.length} products`);
        console.log(`🔍 First product: hasSpecs=${!!products[0].specifications}, hasDims=${!!products[0].dimensions}`);
      }
      return products;
    }
    return [];
  });

  // Compatibility modal state
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);

  // Brand filtering states
  const [selectedBrand, setSelectedBrand] = useState('');
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [availableBrands, setAvailableBrands] = useState(brands || []);
  const [brandCounts, setBrandCounts] = useState({});

  // Filter modal states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortOrder, setSortOrder] = useState('name-asc');
  
  // 🔥 NEW: Dynamic specification filters
  const [specificationFilters, setSpecificationFilters] = useState({});
  const [specSectionOpen, setSpecSectionOpen] = useState({}); // Track which spec sections are expanded

  // Default category images mapping
  const defaultCategoryImages = {
    cpu: CPU1,
    cooling: CPUCooler,
    motherboard: Motherboard1,
    ram: Ram,
    memory: Ram,
    storage: Storage1,
    gpu: GPU1,
    case: SystemUnit1,
    psu: PSU1
  };

  /**
   * 🔥 CRITICAL FIX: Normalize category name to API format
   */
  const normalizeCategory = (cat) => {
    if (!cat) return '';
    const catLower = cat.toLowerCase();
    
    // Map formatted names to API format
    if (catLower.includes('processor') || catLower.includes('cpu') || catLower.includes('central processing')) return 'cpu';
    if (catLower.includes('graphics') || catLower.includes('gpu')) return 'gpu';
    if (catLower.includes('motherboard') || catLower.includes('mobo')) return 'motherboard';
    if (catLower.includes('memory') || catLower.includes('ram')) return 'ram';
    if (catLower.includes('storage') || catLower.includes('ssd') || catLower.includes('nvme') || catLower.includes('hdd')) return 'storage';
    if (catLower.includes('cooler') || catLower.includes('cooling') || catLower.includes('fan')) return 'cooling';
    if (catLower.includes('power') || catLower.includes('psu')) return 'psu';
    if (catLower.includes('case') || catLower.includes('chassis')) return 'case';
    
    return catLower; // Return as-is if no match
  };

  /**
   * Get fallback image based on category
   */
  const getFallbackImage = (category) => {
    const catLower = (category || '').toLowerCase();
    return defaultCategoryImages[catLower] || SystemUnit1;
  };

  /**
   * Helper: Extract brand from product using multiple fallback paths
   * Builder API products may have brand in different fields
   */
  // eslint-disable-next-line no-unused-vars
  const _extractBrandFromProduct = (product, category) => {
    if (!product) return '';

    // Try all possible brand field variations
    const brandField = 
      product.brand || 
      product.Brand || 
      product.item_brand || 
      product.product_brand || 
      product.manufacturer || 
      product.maker ||
      product.specifications?.brand ||
      product.specifications?.manufacturer ||
      product.info?.brand ||
      '';

    if (brandField && typeof brandField === 'string' && brandField.trim()) {
      return brandField.trim();
    }

    // Fallback: Use brandDetection utility to extract from name
    const categoryKey = (category || '').toLowerCase();
    return detectProductBrand(product, categoryKey);
  };

  /**
   * Calculate brand counts from enhanced products
   * 🔥 FIX: Reset brands to empty ten no compatible products to prevent showing stale brands
   * 🔥 FIX: Use brandDetection utility for consistent brand extraction
   */
  useEffect(() => {
    if (!enhancedProducts || enhancedProducts.length === 0) {
      setBrandCounts({});
      setAvailableBrands([]); // ← FIX: Clear brands when no products
      return;
    }

    // 🔥 Use utility functions for brand detection
    // Normalize category name for brandDetection (remove spaces, use canonical names)
    let normalizedCategory = (categoryName || '').toLowerCase().replaceAll(/\s+/g, '');
    if (normalizedCategory.includes('cooler') || normalizedCategory.includes('cooling')) normalizedCategory = 'cooling';
    else if (normalizedCategory.includes('processor')) normalizedCategory = 'cpu';
    else if (normalizedCategory.includes('memory')) normalizedCategory = 'ram';
    
    const detectedBrands = extractBrandsFromProducts(enhancedProducts, normalizedCategory);
    const counts = countProductsByBrand(enhancedProducts, normalizedCategory);

    // Normalize brand names to handle case sensitivity (DeepCool vs DEEPCOOL)
    const normalizedBrands = detectedBrands.map(brand => {
      // Keep original casing for known brands
      const upper = brand.toUpperCase();
      if (upper === 'DEEPCOOL' || upper === 'DEEP COOL') return 'DeepCool';
      if (upper === 'THERMALRIGHT') return 'Thermalright';
      if (upper === 'NOCTUA') return 'Noctua';
      if (upper === 'CORSAIR') return 'Corsair';
      if (upper === 'ARCTIC') return 'ARCTIC';
      return brand; // Keep original for others
    });

    setAvailableBrands(normalizedBrands);
    setBrandCounts(counts);

    console.log(`📊 Brand recalculation: ${normalizedBrands.length} brands from ${enhancedProducts.length} products`, normalizedBrands);
    
    // Debug: Log first 3 products to verify brand field
    if (enhancedProducts.length > 0) {
      console.log(`🔍 Brand detection: ${enhancedProducts.slice(0, 3).map(p => p.brand || 'unknown').join(', ')}...`);
    }
  }, [enhancedProducts, categoryName]);

  /**
   * 🔥 NEW: Extract available specification filters from products
   * This creates dynamic filter options based on actual product specifications
   */
  const [availableSpecFilters, setAvailableSpecFilters] = useState({});
  
  useEffect(() => {
    if (!enhancedProducts || enhancedProducts.length === 0) {
      setAvailableSpecFilters({});
      return;
    }

    const specValues = {};
    
    // Iterate through all products and collect unique specification values
    enhancedProducts.forEach(product => {
      if (product.specifications && typeof product.specifications === 'object') {
        Object.entries(product.specifications).forEach(([key, value]) => {
          // Skip null, undefined, empty strings, and complex objects
          if (value === null || value === undefined || value === '' || typeof value === 'object') {
            return;
          }
          
          // Initialize array for this spec key if not exists
          if (!specValues[key]) {
            specValues[key] = new Set();
          }
          
          // Add value to set (automatically handles duplicates)
          specValues[key].add(String(value));
        });
      }
    });
    
    // Convert Sets to sorted arrays
    const filters = {};
    Object.entries(specValues).forEach(([key, valueSet]) => {
      filters[key] = Array.from(valueSet).sort((a, b) => {
        // Try numeric sort first
        const numA = Number.parseFloat(a);
        const numB = Number.parseFloat(b);
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
          return numA - numB;
        }
        // Fallback to string sort
        return a.localeCompare(b);
      });
    });
    
    setAvailableSpecFilters(filters);
    console.log('🔍 Available specification filters:', filters);
  }, [enhancedProducts]);

  /**
   * Load AI recommendations and compatibility analysis with optimized batching
   * 🔥 CRITICAL FIX: Show ONLY compatible products at each step (no double-filtering)
   */
  useEffect(() => {
    const loadAIEnhancements = async () => {
      const fallbackProducts = Array.isArray(products) ? products : [];
      if (!products?.length || !currentCart) {
        setEnhancedProducts(fallbackProducts);
        return;
      }

      try {
        const selectedComponents = mergeMultiSlotItems(currentCart, multiSlotCart);
        if (selectedComponents.length < 1) {
          setEnhancedProducts(fallbackProducts);
          setAiEnabled(false);
          return;
        }

        const compatible = await getCompatibleProducts(products, selectedComponents, categoryName);
        if (compatible?.length > 0) {
          setEnhancedProducts(compatible);
          setAiEnabled(true);
        } else {
          setEnhancedProducts(fallbackProducts);
          setAiEnabled(false);
        }
      } catch (error) {
        console.warn('⚠️ Compatibility validation failed:', error);
        setEnhancedProducts(Array.isArray(products) ? products : []);
        setAiEnabled(false);
      }
    };

    loadAIEnhancements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, currentCart, categoryName]);

  /**
   * 🔥 CRITICAL FIX: Use Advanced Compatibility API for filtering (same as Order Summary validation)
   * This ensures step-by-step filtering uses THE SAME validation logic as the final check
   * Prevents false compatibility errors at Order Summary
   */
  const getCompatibleProducts = async (allProducts, selectedComponents, catName) => {
    try {
      const { ramSticks } = buildComponentsMap(selectedComponents);

      // Validate RAM DDR type consistency
      if (ramSticks.length > 1) {
        const firstDDR = ramSticks[0].specifications?.type || ramSticks[0].specifications?.memory_type;
        const allSameDDR = ramSticks.every(stick =>
          (stick.specifications?.type || stick.specifications?.memory_type) === firstDDR
        );
        if (!allSameDDR) {
          console.warn('⚠️ MIXED DDR TYPES DETECTED in RAM sticks');
        }
      }

      const selectingCategory = detectCategoryKey(catName);
      if (!selectingCategory) return allProducts;

      const batchResponse = await api.kiosk.checkCompatibilityCandidates({
        contextParts: selectedComponents.map(buildComponentObject),
        candidates: allProducts.map(product => buildComponentObject({ ...product, category: catName })),
        targetCategory: selectingCategory,
        mode: 'candidate_filter'
      });

      if (!batchResponse.success) return allProducts;

      return (batchResponse.data || [])
        .map(product => {
          const compatibilityBadgeType = product.compatible === false
            ? 'incompatible'
            : (product.verdict === 'warning' || product.verdict === 'manual_check' ? 'warning' : 'compatible');
          const compatibilityScore = product.compatibility_score || 0;

          return {
            ...product,
            badge: compatibilityBadgeType,
            compatibilityBadgeType,
            compatibilityScore,
            aiScore: compatibilityScore,
            aiAnalyzed: true,
            aiRecommended: compatibilityBadgeType === 'compatible' && compatibilityScore >= 90,
            recommended: product.compatible !== false,
            isCompatible: product.compatible !== false,
            compatible: product.compatible !== false,
            warnings: product.warnings?.length > 0 ? product.warnings : undefined,
            issues: product.deterministic_issues || product.compatibility_issues || [],
            manualChecks: product.manualChecks || []
          };
        });
    } catch (error) {
      console.error('❌ Advanced compatibility check failed:', error);
      return allProducts;
    }
  };

  const handleBackClick = () => {
    // 🔥 FIX ISSUE #2: Set flag to indicate returning from navigation
    sessionStorage.setItem('pcCustomizedLoaded', 'true');
    
    // If coming from Peripherals flow, go back to peripherals page
    if (location.state?.fromPeripherals || location.state?.returnTo === '/peripherals') {
      navigate('/peripherals', {
        state: {
          buildComponents: location.state?.buildComponents,
          assessment: location.state?.assessment,
          selectedPeripherals: location.state?.selectedPeripherals
        }
      });
      return;
    }
    
    // If coming from AI Edit Build flow, go back to EditBuild
    if (location.state?.fromAI && location.state?.fromEdit && location.state?.returnTo === '/customize-ai/edit-build') {
      navigate('/customize-ai/edit-build', {
        state: {
          buildComponents: location.state?.currentBuild || location.state?.buildComponents,
          assessment: location.state?.assessment
        }
      });
      return;
    }
    
    // If coming from PCUpgrade flow, go back to its 'current-parts' step explicitly
    if (location.state?.from === 'pc-upgrade') {
      const returnTo = location.state?.returnTo || '/pc-upgrade';
      navigate(returnTo, { state: { step: 'current-parts' } });
      return;
    }
    
    // Navigate back to PC Customized
    navigate(location.state?.returnTo || "/pc-customized", {
      state: { selectedCategory: categoryIndex }
    });
  };

  const handleProductClick = (product) => {
    // FIX ISSUE #3: Ensure full product data including image URLs, specifications AND dimensions
    console.log('🖱️ Product clicked:', product?.name, 'category:', product?.category);

    if (product?.compatible === false) {
      const shouldContinue = globalThis.confirm?.(
        `${product.name} is marked incompatible with the current build. Continue anyway?`
      );
      if (!shouldContinue) return;
    }
    
    navigate("/customized-display", {
      state: {
        product: {
          ...product,
          // Ensure image URL is properly constructed
          image: api.utils.getFullImageUrl(product.imageUrl || product.image_url || product.file_path || product.image) || getFallbackImage(product.category || categoryName),
          imageUrl: product.imageUrl || product.image_url || product.file_path || product.image,
          image_url: product.image_url || product.imageUrl || product.file_path || product.image,
          imageVariants: product.imageVariants || product.image_variants || {},
          image_variants: product.imageVariants || product.image_variants || {},
          // 🔥 CRITICAL: Ensure specifications AND dimensions are included for compatibility validation
          specifications: product.specifications || product.spec || {},
          dimensions: product.dimensions || {},
          // 🔥 CRITICAL FIX: Ensure category field exists for compatibility validation
          // Use product.category if it exists, otherwise derive from categoryName
          category: product.category || normalizeCategory(categoryName),
          price: product.price,
          name: product.name,
          brand: product.brand,
          description: product.description
        },
        categoryName,
        products: enhancedProducts,
        brands,
        categoryIndex: categoryIndex,
        slotKey: slotKey, // Pass slot key for multi-slot items
        multiSlotCart: multiSlotCart, // Pass multiSlotCart state
        from: location.state?.from,
        returnTo: location.state?.returnTo,
        categoryKey: location.state?.categoryKey,
        currentCart: currentCart,
        currentBuild: location.state?.currentBuild, // Pass AI build for replacements
        assessment: location.state?.assessment, // Pass AI assessment
        fromAI: location.state?.fromAI, // Flag for AI build replacement flow
        fromEdit: location.state?.fromEdit, // Flag for AI Edit Build flow
        fromPeripherals: location.state?.fromPeripherals, // Flag for peripheral selection
        selectedPeripherals: location.state?.selectedPeripherals, // Pass peripheral selections
        buildComponents: location.state?.buildComponents, // Pass build components for peripherals
        aiEnabled: aiEnabled
      },
    });
  };

  /**
   * Render compatibility badge (PCPartPicker-style)
   */
  const renderAIBadge = (product) => {
    const badge = String(product.badge || '');
    const compatibilityBadgeType = product.compatibilityBadgeType
      || (product.compatible === false ? 'incompatible' : '')
      || (product.verdict === 'warning' || product.verdict === 'manual_check' ? 'warning' : '')
      || (product.verdict === 'pass' ? 'compatible' : '')
      || (badge.includes('Incompatible') ? 'incompatible' : '')
      || (badge.includes('May Work') ? 'warning' : '')
      || (badge.includes('Compatible') ? 'compatible' : '');

    if (!aiEnabled && !badge && !compatibilityBadgeType) return null;

    const compatibilityScore = product.compatibilityScore || product.aiScore || 0;

    if (compatibilityBadgeType === 'compatible') {
      return (
        <div className="compatibility-badge compatible" title={`Compatible (Score: ${compatibilityScore}/100)`}>
          <CheckCircle size={16} />
          <span>Compatible</span>
        </div>
      );
    }

    if (compatibilityBadgeType === 'warning') {
      return (
        <div className="compatibility-badge warning" title={`May work with issues (Score: ${compatibilityScore}/100)`}>
          <AlertTriangle size={16} />
          <span>May Work</span>
        </div>
      );
    }

    if (compatibilityBadgeType === 'incompatible') {
      return (
        <div className="compatibility-badge incompatible" title={`Incompatible (Score: ${compatibilityScore}/100)`}>
          <AlertCircle size={16} />
          <span>Incompatible</span>
        </div>
      );
    }

    // Legacy field fallback populated by deterministic compatibility responses.
    if (product.aiRecommended) {
      return <div className="ai-badge ai-recommended" title="Recommended for your build">Recommended</div>;
    }
    
    if (product.aiCompatibilityWarning) {
      return <div className="ai-badge ai-warning" title="Potential compatibility issues detected">⚠️ Check Compatibility</div>;
    }

    return null;
  };

  /**
   * Open compatibility modal
   */
  const openCompatibilityModal = (e, product) => {
    e.stopPropagation(); // Prevent card click
    setSelectedProductForModal(product);
    setShowCompatibilityModal(true);
  };

  /**
   * Close compatibility modal
   */
  const closeCompatibilityModal = () => {
    setShowCompatibilityModal(false);
    setSelectedProductForModal(null);
  };

  /**
   * Handle brand selection
   */
  const handleBrandSelect = (brand) => {
    setSelectedBrand(brand === selectedBrand ? '' : brand);
  };

  /**
   * Toggle filter modal
   */
  const toggleFilterModal = () => {
    setShowFilterModal(!showFilterModal);
  };

  /**
   * Apply filters and reset
   */
  const applyFilters = () => {
    setShowFilterModal(false);
  };

  const resetFilters = () => {
    setSelectedBrand('');
    setPriceRange({ min: '', max: '' });
    setSortOrder('name-asc');
    setSpecificationFilters({}); // 🔥 NEW: Reset specification filters
  };

  /**
   * Sort and filter products
   */
  const sortedProducts = React.useMemo(() => {
    // 🔥 CRITICAL FIX: Ensure enhancedProducts is an array before spreading
    if (!Array.isArray(enhancedProducts)) {
      console.error('❌ enhancedProducts is not an array:', enhancedProducts);
      return [];
    }
    let filtered = [...enhancedProducts];

    // Brand filter
    if (selectedBrand) {
      filtered = filtered.filter(p => p.brand === selectedBrand);
    }

    // Price filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(p => {
        const price = typeof p.price === 'number' ? p.price : Number.parseFloat(String(p.price || '').replaceAll(/[^0-9.]/g, '')) || 0;
        const min = priceRange.min ? Number.parseFloat(priceRange.min) : 0;
        const max = priceRange.max ? Number.parseFloat(priceRange.max) : Infinity;
        return price >= min && price <= max;
      });
    }
    
    // 🔥 NEW: Specification filters
    if (Object.keys(specificationFilters).length > 0) {
      filtered = filtered.filter(product => {
        // Product must match ALL active specification filters
        return Object.entries(specificationFilters).every(([specKey, selectedValue]) => {
          if (!selectedValue || selectedValue === '') return true; // Skip if no value selected
          const productValue = product.specifications?.[specKey];
          return String(productValue) === String(selectedValue);
        });
      });
    }

    // Sort
    filtered.sort((a, b) => {
      const compatibilityRank = (product) => {
        if (product.compatible === false || product.compatibilityBadgeType === 'incompatible') return 3;
        if (product.verdict === 'warning' || product.verdict === 'manual_check' || product.compatibilityBadgeType === 'warning') return 2;
        return 1;
      };
      const rankDiff = compatibilityRank(a) - compatibilityRank(b);
      if (rankDiff !== 0) return rankDiff;
      const scoreDiff = (b.compatibilityScore || b.compatibility_score || 0) - (a.compatibilityScore || a.compatibility_score || 0);
      if (scoreDiff !== 0) return scoreDiff;

      if (aiEnabled) {
        if (a.aiRecommended && !b.aiRecommended) return -1;
        if (!a.aiRecommended && b.aiRecommended) return 1;
        if (a.aiScore !== b.aiScore) return (b.aiScore || 0) - (a.aiScore || 0);
      }

      switch (sortOrder) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'price-asc':
          return parseProductPrice(a.price) - parseProductPrice(b.price);
        case 'price-desc':
          return parseProductPrice(b.price) - parseProductPrice(a.price);
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    });

    return filtered;
  }, [enhancedProducts, selectedBrand, priceRange, sortOrder, specificationFilters, aiEnabled]);


  return (
    <div className="customized-products-container">
      <div className="customized-products-header">
        <div className="customized-products-header-content">
          <img src={Customized} alt="Logo" className="customized-products-icon" />
          <div className="customized-products-header-text">
            <h2 className="customized-products-title">
              {categoryName} <span className="category-count">[{sortedProducts.length}]</span>
            </h2>
          </div>
        </div>
        
        {/* Brands & Filter Section */}
        <div className="brands-filter-section">
          <div className="brand-section">
            {/* Brand Dropdown */}
            <div className="brand-dropdown-container">
              <button
                type="button"
                className="brand-dropdown-trigger"
                onClick={() => setBrandDropdownOpen(!brandDropdownOpen)}
              >
                <span>
                  {selectedBrand || 'All Brands'} ({selectedBrand ? (brandCounts[selectedBrand] || 0) : availableBrands.length})
                </span>
                <span className={`dropdown-arrow ${brandDropdownOpen ? 'open' : ''}`}>
                  <img src={dropdown} alt="Dropdown Arrow" />
                </span>
              </button>
              
              {brandDropdownOpen && (
                <div className="brand-dropdown-menu">
                  {/* All Brands option */}
                  <button
                    type="button"
                    className={selectedBrand === '' ? 'active' : ''}
                    onClick={() => {
                      handleBrandSelect('');
                      setBrandDropdownOpen(false);
                    }}
                  >
                    All Brands ({availableBrands.length})
                  </button>
                  
                  {/* Individual brand options */}
                  {availableBrands && availableBrands.length > 0 ? (
                    availableBrands.map((brand) => {
                      const brandCount = brandCounts[brand] || 0;
                      const active = selectedBrand === brand;
                      return (
                        <button
                          type="button"
                          key={brand}
                          className={active ? 'active' : ''}
                          onClick={() => {
                            handleBrandSelect(brand);
                            setBrandDropdownOpen(false);
                          }}
                        >
                          {brand} ({brandCount})
                        </button>
                      );
                    })
                  ) : (
                    <button type="button" disabled>No Brands Available</button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Filter Button */}
          <div className="filter-button-container">
            <button className="filter-button" onClick={toggleFilterModal}>
              <img src={filterspecs} alt="Filter Icon" className="filter-icon" />{' '}
              FILTER SPECS
            </button>
          </div>
        </div>
      </div>
      <div className="customized-products-grid">
        {sortedProducts?.map((product, index) => {
          const badge = String(product.badge || '');
          const compatibilityBadgeType = product.compatibilityBadgeType
            || (product.compatible === false ? 'incompatible' : '')
            || (product.verdict === 'warning' || product.verdict === 'manual_check' ? 'warning' : '')
            || (badge.includes('Incompatible') ? 'incompatible' : '')
            || (badge.includes('May Work') ? 'warning' : '');
          const isIncompatible = product.compatible === false || compatibilityBadgeType === 'incompatible';
          const hasWarning = compatibilityBadgeType === 'warning';
          const hasBiosWarning = product.biosWarning;

          return (
            <button
              type="button"
              key={product.id || index}
              className={`customized-products-card ${
                product.aiRecommended ? 'ai-recommended-card' : ''
              } ${
                product.aiCompatibilityWarning ? 'ai-warning-card' : ''
              } ${
                isIncompatible ? 'incompatible-card' : ''
              } ${
                hasWarning ? 'warning-card' : ''
              }`}
              tabIndex={0}
              onClick={() => handleProductClick(product)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleProductClick(product); } }}
              style={{ 
                opacity: isIncompatible ? 0.5 : 1,
                cursor: 'pointer'
              }}
            >
              <div className="product-card-header">
                {renderAIBadge(product)}
                {(aiEnabled || product.aiAnalyzed) && (
                  <div className="ai-score" title={product.compatibilityInfo || `Compatibility Score: ${product.compatibilityScore || product.aiScore}/100`}>
                    {product.compatibilityScore || product.aiScore || '?'}
                  </div>
                )}
              </div>

              {/* BIOS Warning Banner */}
              {hasBiosWarning && (
                <div className="bios-warning-banner">
                  <AlertTriangle size={16} />
                  <span>{product.biosWarning}</span>
                </div>
              )}

              <KioskProductImage
                product={product}
                alt={product.name}
                className="customized-products-image"
                fallbackSrc={getFallbackImage(product.category || categoryName)}
                sizes="(max-width: 768px) 45vw, 220px"
                width="220"
                height="220"
              />
            <div className="customized-products-details"> 
            <div className="customized-products-name">{product.name}</div>
            
            {/* PSU Power Connector Information */}
            {(product.category === 'PSU' || product.category === 'Power Supply' || categoryName === 'PSU') && product.specifications && (
              <div className="psu-specs-info">
                {(() => {
                  const specs = product.specifications;
                  const pcie6pin = specs.pcie_6pin_connectors || 0;
                  const pcie8pin = specs.pcie_8pin_connectors || 0;
                  const has12vhpwr = specs.has_12vhpwr_connector || false;
                  const formFactor = specs.form_factor || 'ATX';
                  const wattage = specs.wattage || product.wattage || '';
                  const modular = specs.modular || specs.is_modular || product.modular || '';
                  
                  const powerInfo = [];
                  if (pcie6pin > 0) powerInfo.push(`${pcie6pin}x 6-pin`);
                  if (pcie8pin > 0) powerInfo.push(`${pcie8pin}x 8-pin`);
                  if (has12vhpwr) powerInfo.push('12VHPWR');
                  
                  return (
                    <>
                      {powerInfo.length > 0 && (
                        <div className="psu-power-connectors" title="GPU Power Connectors">
                          <strong>Power:</strong> {powerInfo.join(', ')}
                        </div>
                      )}
                      <div className="psu-form-wattage">
                        {formFactor && <span title="Form Factor"><strong>Form:</strong> {formFactor}</span>}
                        {wattage && <span title="Wattage"><strong>|</strong> {wattage}W</span>}
                        {modular && <span title="Modular Type"><strong>|</strong> {modular}</span>}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            
            <div className="customized-products-price">
              {product.price
                ? `₱${Number.parseFloat(product.price.toString().replaceAll(/[^0-9.,]/g, "").replaceAll(',', ""))
                  .toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}`
                : "Price Unavailable"}
            </div>
            </div>
            {/* Why Incompatible? Button */}
            {(isIncompatible || hasWarning) && product.issues && product.issues.length > 0 && (
              <button 
                className="why-incompatible-btn" 
                onClick={(e) => openCompatibilityModal(e, product)}
              >
                <AlertCircle size={16} />
                <span>Why {isIncompatible ? 'Incompatible' : 'Warning'}?</span>
              </button>
            )}
          </button>
        );
        })}
      </div>

      {/* Compatibility Modal */}
      {showCompatibilityModal && selectedProductForModal && (
        <div className="incompatibility-modal-overlay" role="none" onClick={closeCompatibilityModal} onKeyDown={(e) => { if (e.key === 'Escape') closeCompatibilityModal(); }}>
          <dialog open className="incompatibility-modal-content" aria-label="Compatibility Analysis">
            <div role="none" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') closeCompatibilityModal(); }}>
            <div className="modal-header">
              <h3>
                <AlertCircle size={24} />
                Compatibility Analysis: {selectedProductForModal.name}
              </h3>
              <button className="modal-close-btn" onClick={closeCompatibilityModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {/* Compatibility Score */}
              <div className="modal-score-section">
                <h4>Compatibility Score</h4>
                <div className="score-display">
                  {(() => {
                    const score = selectedProductForModal.compatibilityScore || 0;
                    let barColor = '#ef4444';
                    if (score >= 85) barColor = '#22c55e';
                    else if (score >= 60) barColor = '#f59e0b';
                    return (
                      <div
                        className="score-bar"
                        style={{
                          width: `${score}%`,
                          backgroundColor: barColor
                        }}
                      >
                        {score}%
                      </div>
                    );
                  })()}
                </div>
                <p className="score-description">{selectedProductForModal.badge}</p>
              </div>

              {/* Issues */}
              {selectedProductForModal.issues && selectedProductForModal.issues.length > 0 && (
                <div className="modal-issues-section">
                  <h4>Issues Detected</h4>
                  <ul className="issues-list">
                    {selectedProductForModal.issues.map((issue, idx) => (
                      <li key={`issue-${issue.severity || 'warn'}-${idx}`} className={`issue-item ${issue.severity || 'warning'}`}>
                        <div className="issue-icon">
                          {issue.severity === 'critical' ? <AlertCircle size={20} /> : <AlertTriangle size={20} />}
                        </div>
                        <div className="issue-text">{issue}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {selectedProductForModal.recommendations && selectedProductForModal.recommendations.length > 0 && (
                <div className="modal-recommendations-section">
                  <h4>Recommendations</h4>
                  <ul className="recommendations-list">
                    {selectedProductForModal.recommendations.map((rec, idx) => (
                      <li key={`rec-${idx}-${typeof rec === 'string' ? rec.slice(0, 20) : idx}`} className="recommendation-item">
                        <CheckCircle size={16} />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* BIOS Warning */}
              {selectedProductForModal.biosWarning && (
                <div className="modal-bios-warning">
                  <AlertTriangle size={20} />
                  <span>{selectedProductForModal.biosWarning}</span>
                </div>
              )}

              {/* Rule Results (Technical Details) */}
              {selectedProductForModal.ruleResults && selectedProductForModal.ruleResults.length > 0 && (
                <div className="modal-rules-section">
                  <h4>Technical Details</h4>
                  <details className="rules-details">
                    <summary>View Compatibility Rules</summary>
                    <ul className="rules-list">
                      {selectedProductForModal.ruleResults.map((rule, idx) => (
                        <li key={`rule-${rule.rule || idx}`} className="rule-item">
                          <strong>{rule.rule}:</strong> Score {rule.score}/100
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="modal-close-button" onClick={closeCompatibilityModal}>
                Close
              </button>
            </div>
            </div>
          </dialog>
        </div>
      )}

      {/* Filter & Sort Popup - PC-Parts Style */}
      {showFilterModal && (
        <div className="popup-overlay" role="none" onClick={toggleFilterModal} onKeyDown={(e) => { if (e.key === 'Escape') toggleFilterModal(); }}>
          <div className="popup" role="none" onClick={(e) => e.stopPropagation()}>
            <h2 className="popup-title">FILTER & SORT</h2>
            <button className="popup-close-btn" onClick={toggleFilterModal}>
              <X size={24} />
            </button>

            <div className="popup-body">
              {/* Price Range Section */}
              <div className="filter-section">
                <h4>Price Range</h4>
                <div className="price-range-inputs">
                  <input
                    type="number"
                    placeholder="Min Price"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                  />
                </div>
              </div>

              {/* Sort Order */}
              <div className="filter-section">
                <h4>Sort By</h4>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="sort-select"
                >
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="price-asc">Price (Low to High)</option>
                  <option value="price-desc">Price (High to Low)</option>
                </select>
              </div>
              
              {/* 🔥 COPY OF PC-PARTS: Expandable Button Style Specification Filters */}
              {Object.entries(availableSpecFilters).map(([specKey, values]) => {
                // Format spec key for display (convert snake_case to Title Case)
                const displayName = specKey
                  .split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                
                // Skip if only one value (no point filtering)
                if (values.length <= 1) return null;
                
                const isOpen = specSectionOpen[specKey];
                const currentValue = specificationFilters[specKey];
                
                return (
                  <div key={specKey} className="filter-section">
                    <div className="filter-header">
                      <span>{displayName}</span>
                      <button 
                        className="toggle-button"
                        onClick={() => {
                          const newOpenState = { ...specSectionOpen };
                          newOpenState[specKey] = !newOpenState[specKey];
                          setSpecSectionOpen(newOpenState);
                        }}
                      >
                        {isOpen ? "−" : "+"}
                      </button>
                    </div>
                    
                    {isOpen && (
                      <div className="filter-options">
                        <button
                          className={['filter-btn', !currentValue && 'active'].filter(Boolean).join(' ')}
                          onClick={() => {
                            const newFilters = { ...specificationFilters };
                            delete newFilters[specKey];
                            setSpecificationFilters(newFilters);
                          }}
                        >All</button>
                        {values.map(value => (
                          <button
                            key={value}
                            className={`filter-btn ${currentValue === value ? 'active' : ''}`}
                            onClick={() => setSpecificationFilters({
                              ...specificationFilters,
                              [specKey]: value
                            })}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="popup-actions">
              <button className="popup-reset-button" onClick={resetFilters}>
                Reset All
              </button>
              <button className="popup-apply-button" onClick={applyFilters}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="customized-products-footer">
        <button className="customized-products-back-button" onClick={handleBackClick}>
          Back
        </button>
      </div>
    </div>
  );
};

export default CustomizedProducts;
