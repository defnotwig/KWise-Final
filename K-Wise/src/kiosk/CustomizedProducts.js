import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AlertCircle, CheckCircle, AlertTriangle, X } from "lucide-react";
import "./CustomizedProducts.css";
import Customized from "../assets/Customized.webp";
import dropdown from "../assets/PCParts/dropdown.svg";
import filterspecs from "../assets/CustomProducts/filterspecs.svg";
import api from "../api/api"; // Import centralized API
import aiService from "../api/aiService"; // Re-enabled for compatibility analysis
import { extractBrandsFromProducts, countProductsByBrand, detectProductBrand } from "../utils/brandDetection"; // 🔥 FIX: Import brand detection utility
import { filterCompatibleProducts } from "../utils/compatibilityFilter"; // 🔥 CRITICAL: Client-side pre-filtering

// Import default category images
import CPU1 from "../assets/CPU1.webp";
import CPUCooler from "../assets/CPUCooler.webp";
import Motherboard1 from "../assets/Motherboard1.webp";
import Ram from "../assets/Ram.webp";
import Storage1 from "../assets/Storage1.webp";
import GPU1 from "../assets/GPU1.webp";
import SystemUnit1 from "../assets/SystemUnit1.webp";
import PSU1 from "../assets/PSU1.webp";

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
        console.log('📦 CustomizedProducts received products:', products.length);
        console.log('🔍 First product dimensions check:', {
          name: products[0].name,
          hasSpecs: !!products[0].specifications,
          hasDims: !!products[0].dimensions,
          specsKeys: Object.keys(products[0].specifications || {}),
          dimsKeys: Object.keys(products[0].dimensions || {})
        });
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
  const extractBrandFromProduct = (product, category) => {
    if (!product) return '';

    // Try all possible brand field variations
    const brandField = 
      product.brand || 
      product.Brand || 
      product.item_brand || 
      product.product_brand || 
      product.manufacturer || 
      product.maker ||
      (product.specifications && product.specifications.brand) ||
      (product.specifications && product.specifications.manufacturer) ||
      (product.info && product.info.brand) ||
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
    let normalizedCategory = (categoryName || '').toLowerCase().replace(/\s+/g, '');
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
      console.log('🔍 Sample products with brands:', enhancedProducts.slice(0, 3).map(p => ({
        name: p.name,
        brand: p.brand,
        hasBrandField: !!p.brand
      })));
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
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) {
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
      if (!products?.length || !currentCart) {
        setEnhancedProducts(Array.isArray(products) ? products : []);
        return;
      }

      try {
        console.log('🤖 Loading compatibility validation for category:', categoryName);

        // 🔥 CRITICAL FIX: Merge currentCart with multiSlotCart to get ALL selected components
        // This ensures RAM slots and Storage slots are included in compatibility checks
        const selectedComponents = currentCart.filter(item => item !== null);
        
        // Add multi-slot items (RAM, Storage) to selected components
        if (multiSlotCart && Object.keys(multiSlotCart).length > 0) {
          console.log('📦 Including multi-slot items in compatibility check:', Object.keys(multiSlotCart));
          Object.values(multiSlotCart).forEach(item => {
            if (item && item.id) {
              // Check if this item is already in selectedComponents (avoid duplicates)
              const exists = selectedComponents.some(comp => comp && comp.id === item.id);
              if (!exists) {
                selectedComponents.push(item);
              }
            }
          });
        }
        
        // 🔥 FIXED: Run compatibility filtering when there is 1+ component
        // User requirement: "when CPU selected the compatibility filtering should run automatically"
        if (selectedComponents.length >= 1) {
          console.log('🔍 Running compatibility validation with', selectedComponents.length, 'existing components');
          console.log('📦 Products to validate:', products?.length || 0);
          
          // 🔥 CRITICAL FIX: Use ONLY backend validation (remove double-filtering)
          // Backend validation is authoritative - it uses the same rules as Order Summary
          const compatibleProducts = await getCompatibleProducts(products, selectedComponents, categoryName);
          
          if (compatibleProducts && compatibleProducts.length >= 0) {
            console.log('✅ Backend validated:', compatibleProducts.length, 'compatible products');
            
            // 🔥 CRITICAL FIX: Trust backend validation completely - NO additional filtering
            // Show exactly what backend says is compatible (same as Order Summary validation)
            console.log(`📊 Showing ${compatibleProducts.length} compatible products (${products.length - compatibleProducts.length} incompatible items hidden)`);
            
            setEnhancedProducts(Array.isArray(compatibleProducts) ? compatibleProducts : []);
            setAiEnabled(true);
          } else {
            // If backend validation fails, show all products as fallback
            console.warn('⚠️ Backend validation failed - showing all products');
            setEnhancedProducts(Array.isArray(products) ? products : []);
            setAiEnabled(false);
          }
          
          console.log('✅ Compatibility validation completed');
        } else {
          // No existing components - show all products without filtering
          setEnhancedProducts(Array.isArray(products) ? products : []);
          setAiEnabled(false);
          console.log('💡 No existing components - showing all products');
        }

      } catch (error) {
        console.warn('⚠️ Compatibility validation failed, using standard product list:', error);
        setEnhancedProducts(Array.isArray(products) ? products : []);
        setAiEnabled(false);
      } finally {
        // Always re-enable UI after processing
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
  const getCompatibleProducts = async (products, selectedComponents, categoryName) => {
    try {
      console.log('🔍 Advanced compatibility filtering for:', categoryName);
      console.log('📦 Total products:', products.length);
      console.log('🔧 Selected components:', selectedComponents.length);

      // Build components object in the format expected by Advanced Compatibility API
      const components = {};
      const ramSticks = []; // 🔥 CRITICAL FIX: Collect ALL RAM sticks for DDR type validation
      const storageDevices = []; // Collect all storage devices
      
      selectedComponents.forEach(comp => {
        if (!comp) return;
        
        // Determine component type based on category or name
        const category = comp.categoryName || comp.category || '';
        const catLower = category.toLowerCase();
        
        console.log(`🔍 Analyzing component: ${comp.name} (${category})`);
        
        // Use same normalization as CompatibilityValidationModal
        let categoryKey = catLower
          .trim()
          .replace(/\s+/g, '_')
          .replace(/central_processing_unit/gi, 'cpu')
          .replace(/graphics_processing_unit/gi, 'gpu')
          .replace(/memory_\(ram\)/gi, 'ram')
          .replace(/memory/gi, 'ram')
          .replace(/cpu_cooler/gi, 'cooling')
          .replace(/power_supply_unit/gi, 'psu')
          .replace(/pc_case/gi, 'case');
        
        // Detect component type and build complete component object
        if (catLower.includes('cpu') || catLower.includes('processor') || catLower.includes('central processing')) {
          categoryKey = 'cpu';
        } 
        else if (catLower.includes('cool') || catLower.includes('fan')) {
          categoryKey = 'cooling';
        }
        else if (catLower.includes('mother')) {
          categoryKey = 'motherboard';
        }
        else if (catLower.includes('ram') || catLower.includes('memory')) {
          categoryKey = 'ram';
          // 🔥 CRITICAL FIX: Collect RAM sticks separately to check DDR type consistency
          ramSticks.push(comp);
        }
        else if (catLower.includes('storage') || catLower.includes('ssd') || catLower.includes('hdd')) {
          categoryKey = 'storage';
          storageDevices.push(comp);
        }
        else if (catLower.includes('gpu') || catLower.includes('graphics')) {
          categoryKey = 'gpu';
        }
        else if (catLower.includes('case') || catLower.includes('chassis')) {
          categoryKey = 'case';
        }
        else if (catLower.includes('psu') || catLower.includes('power')) {
          categoryKey = 'psu';
        }
        
        // Build full component object with ALL fields (same as validation modal)
        // 🔥 CRITICAL FIX: For RAM and Storage, use the FIRST item as reference for validation
        if (categoryKey === 'ram' && !components['ram']) {
          components[categoryKey] = {
            id: comp.id,
            name: comp.name,
            category: category,
            brand: comp.brand || null,
            price: comp.price || 0,
            specifications: comp.specifications || comp.normalized_specs || {},
            dimensions: comp.dimensions || {}, // 🔥 CRITICAL FIX: Pass dimensions for validation
            image_url: comp.image_url || null,
            // Include direct fields for compatibility checks
            socket: comp.socket || comp.specifications?.socket,
            memory_type: comp.memory_type || comp.specifications?.memory_type || comp.specifications?.type,
            form_factor: comp.form_factor || comp.specifications?.form_factor,
            tdp: comp.tdp || comp.specifications?.tdp,
            wattage: comp.wattage || comp.specifications?.wattage,
            length: comp.length || comp.specifications?.length,
            max_gpu_length: comp.max_gpu_length || comp.specifications?.max_gpu_length,
            height: comp.height || comp.specifications?.height,
            pcie_6pin_connectors: comp.pcie_6pin_connectors || comp.specifications?.pcie_6pin_connectors || 0,
            pcie_8pin_connectors: comp.pcie_8pin_connectors || comp.specifications?.pcie_8pin_connectors || 0,
            sata_ports: comp.sata_ports || comp.specifications?.sata_ports,
            m2_slots: comp.m2_slots || comp.specifications?.m2_slots,
            pcie_slots: comp.pcie_slots || comp.specifications?.pcie_slots
          };
        } else if (categoryKey === 'storage' && !components['storage']) {
          components[categoryKey] = {
            id: comp.id,
            name: comp.name,
            category: category,
            brand: comp.brand || null,
            price: comp.price || 0,
            specifications: comp.specifications || comp.normalized_specs || {},
            dimensions: comp.dimensions || {}, // 🔥 CRITICAL FIX: Pass dimensions for validation
            image_url: comp.image_url || null,
            socket: comp.socket || comp.specifications?.socket,
            memory_type: comp.memory_type || comp.specifications?.memory_type,
            form_factor: comp.form_factor || comp.specifications?.form_factor,
            tdp: comp.tdp || comp.specifications?.tdp,
            wattage: comp.wattage || comp.specifications?.wattage,
            length: comp.length || comp.specifications?.length,
            max_gpu_length: comp.max_gpu_length || comp.specifications?.max_gpu_length,
            height: comp.height || comp.specifications?.height,
            pcie_6pin_connectors: comp.pcie_6pin_connectors || comp.specifications?.pcie_6pin_connectors || 0,
            pcie_8pin_connectors: comp.pcie_8pin_connectors || comp.specifications?.pcie_8pin_connectors || 0,
            sata_ports: comp.sata_ports || comp.specifications?.sata_ports,
            m2_slots: comp.m2_slots || comp.specifications?.m2_slots,
            pcie_slots: comp.pcie_slots || comp.specifications?.pcie_slots,
            storage_type: comp.storage_type || comp.specifications?.storage_type || comp.type,
            speed: comp.speed || comp.specifications?.speed
          };
        } else if (categoryKey !== 'ram' && categoryKey !== 'storage') {
          // For non-multi-slot components, just add normally
          components[categoryKey] = {
            id: comp.id,
            name: comp.name,
            category: category,
            brand: comp.brand || null,
            price: comp.price || 0,
            specifications: comp.specifications || comp.normalized_specs || {},
            dimensions: comp.dimensions || {}, // 🔥 CRITICAL FIX: Pass dimensions for validation
            image_url: comp.image_url || null,
            // Include direct fields for compatibility checks
            socket: comp.socket || comp.specifications?.socket,
            memory_type: comp.memory_type || comp.specifications?.memory_type,
            form_factor: comp.form_factor || comp.specifications?.form_factor,
            tdp: comp.tdp || comp.specifications?.tdp,
            wattage: comp.wattage || comp.specifications?.wattage,
            length: comp.length || comp.specifications?.length,
            max_gpu_length: comp.max_gpu_length || comp.specifications?.max_gpu_length,
            height: comp.height || comp.specifications?.height,
            pcie_6pin_connectors: comp.pcie_6pin_connectors || comp.specifications?.pcie_6pin_connectors || 0,
            pcie_8pin_connectors: comp.pcie_8pin_connectors || comp.specifications?.pcie_8pin_connectors || 0,
            sata_ports: comp.sata_ports || comp.specifications?.sata_ports,
            m2_slots: comp.m2_slots || comp.specifications?.m2_slots,
            pcie_slots: comp.pcie_slots || comp.specifications?.pcie_slots
          };
        }
        
        console.log(`✅ ${categoryKey} added to compatibility check`);
      });

      // 🔥 CRITICAL FIX: Validate RAM DDR type consistency
      if (ramSticks.length > 1) {
        console.log(`🎰 Multiple RAM sticks detected (${ramSticks.length}), checking DDR type consistency...`);
        const firstDDR = ramSticks[0].specifications?.type || ramSticks[0].specifications?.memory_type;
        const allSameDDR = ramSticks.every(stick => {
          const stickDDR = stick.specifications?.type || stick.specifications?.memory_type;
          return stickDDR === firstDDR;
        });
        
        if (!allSameDDR) {
          console.warn('⚠️ MIXED DDR TYPES DETECTED! RAM sticks have different DDR types:', 
            ramSticks.map(s => ({name: s.name, ddr: s.specifications?.type || s.specifications?.memory_type}))
          );
        } else {
          console.log(`✅ All RAM sticks are ${firstDDR}`);
        }
      }

      console.log('📊 Components for advanced validation:', Object.keys(components));

      // Determine which category we're selecting for
      let selectingCategory = null;
      const catLower = categoryName.toLowerCase();
      
      if (catLower.includes('cooler') || catLower.includes('cool') || catLower.includes('fan')) selectingCategory = 'cooling';
      else if (catLower.includes('cpu') || catLower.includes('processor')) selectingCategory = 'cpu';
      else if (catLower.includes('mother')) selectingCategory = 'motherboard';
      else if (catLower.includes('ram') || catLower.includes('memory')) selectingCategory = 'ram';
      else if (catLower.includes('storage') || catLower.includes('ssd') || catLower.includes('hdd')) selectingCategory = 'storage';
      else if (catLower.includes('gpu') || catLower.includes('graphics')) selectingCategory = 'gpu';
      else if (catLower.includes('case') || catLower.includes('chassis')) selectingCategory = 'case';
      else if (catLower.includes('psu') || catLower.includes('power')) selectingCategory = 'psu';

      if (!selectingCategory) {
        console.warn('⚠️ Could not determine category for:', categoryName);
        return products; // Return all products if category unknown
      }

      console.log(`🎯 Testing compatibility for each ${selectingCategory}...`);

      // 🔥 PERFORMANCE OPTIMIZATION: Use client-side filter FIRST
      // This eliminates obviously incompatible products (socket mismatch, DDR mismatch, etc.)
      // Reduces API calls by 70-90%, preventing rate limiting
      console.log('📊 Step 1: Client-side pre-filtering...');
      const clientFilteredProducts = filterCompatibleProducts(products, components, selectingCategory);
      console.log(`✅ Client-side filter: ${products.length} → ${clientFilteredProducts.length} products (removed ${products.length - clientFilteredProducts.length} obvious incompatibilities)`);

      // 🔥 CRITICAL FIX: If client-side filter removes ALL products, return empty array
      // This prevents showing incompatible products that passed no validation
      if (clientFilteredProducts.length === 0) {
        console.log('⚠️ Client-side filter eliminated all products - no compatible options available');
        return [];
      }

      // Test each remaining product with Advanced Compatibility API for comprehensive validation
      const compatibleProducts = [];
      const incompatibleProducts = [];
      
      console.log('📊 Step 2: API validation of client-filtered products...');
      
      // 🔥 RATE LIMITING PROTECTION: Process in small batches with delays
      const BATCH_SIZE = 5; // Only 5 products at a time
      const DELAY_BETWEEN_BATCHES = 500; // 500ms delay between batches
      
      for (let i = 0; i < clientFilteredProducts.length; i += BATCH_SIZE) {
        const batch = clientFilteredProducts.slice(i, i + BATCH_SIZE);
        console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(clientFilteredProducts.length / BATCH_SIZE)}`);
        
        for (const product of batch) {
          try {
            // Create test components object with this product added
            const rawTestComponents = {
              ...components,
              [selectingCategory]: {
                id: product.id,
                name: product.name,
                category: categoryName,
                brand: product.brand || null,
                price: product.price || 0,
                specifications: product.specifications || {},
                dimensions: product.dimensions || {}, // 🔥 CRITICAL FIX: Pass dimensions for validation
                // Include all compatibility-relevant fields
                socket: product.socket || product.specifications?.socket,
                memory_type: product.memory_type || product.specifications?.memory_type,
                form_factor: product.form_factor || product.specifications?.form_factor,
                tdp: product.tdp || product.specifications?.tdp,
                wattage: product.wattage || product.specifications?.wattage,
                length: product.length || product.specifications?.length,
                max_gpu_length: product.max_gpu_length || product.specifications?.max_gpu_length,
                max_gpu_length_mm: product.max_gpu_length_mm || product.specifications?.max_gpu_length_mm,
                height: product.height || product.specifications?.height,
                pcie_6pin_connectors: product.pcie_6pin_connectors || product.specifications?.pcie_6pin_connectors || 0,
                pcie_8pin_connectors: product.pcie_8pin_connectors || product.specifications?.pcie_8pin_connectors || 0,
                sata_ports: product.sata_ports || product.specifications?.sata_ports,
                m2_slots: product.m2_slots || product.specifications?.m2_slots,
                pcie_slots: product.pcie_slots || product.specifications?.pcie_slots,
                storage_type: product.storage_type || product.specifications?.storage_type || product.type,
                speed: product.speed || product.specifications?.speed
              }
            };
            
            // 🔥 FIX: Filter out null/undefined components to prevent backend errors
            const testComponents = Object.keys(rawTestComponents).reduce((acc, key) => {
              if (rawTestComponents[key] !== null && rawTestComponents[key] !== undefined) {
                acc[key] = rawTestComponents[key];
              }
              return acc;
            }, {});
            
            // Call Advanced Compatibility API (same as Order Summary)
            const apiBaseUrl = api.config.baseUrl;
            const response = await fetch(`${apiBaseUrl}/compatibility/advanced/full-build`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                components: testComponents,
                comprehensive: true 
              })
            });
            
            if (response.ok) {
              const validation = await response.json();
              
              if (validation.success && validation.data) {
                const { criticalIssues = [], warnings = [], score = 0 } = validation.data;
                
                // 🔥 CRITICAL FIX: Only include products with NO critical issues
                // This ensures step-by-step filtering matches Order Summary validation
                if (criticalIssues.length === 0) {
                  compatibleProducts.push({
                    ...product,
                    badge: '✅ Compatible',
                    compatibilityScore: score,
                    aiAnalyzed: true,
                    recommended: true,
                    isCompatible: true,
                    compatible: true,
                    warnings: warnings.length > 0 ? warnings : undefined
                  });
                } else {
                  // 🔥 CRITICAL FIX: Mark as incompatible (do NOT include in compatibleProducts)
                  incompatibleProducts.push({
                    ...product,
                    badge: '❌ Incompatible',
                    compatibilityScore: score,
                    compatible: false,
                    issues: criticalIssues
                  });
                }
              } else {
                // 🔥 CRITICAL FIX: If validation response is malformed, treat as incompatible
                console.warn(`⚠️ Malformed validation response for ${product.name} - marking incompatible`);
                incompatibleProducts.push({
                  ...product,
                  badge: '❌ Incompatible',
                  compatibilityScore: 0,
                  compatible: false,
                  issues: [{ message: 'Validation error: malformed response' }]
                });
              }
            } else if (response.status === 429) {
              // 🔥 RATE LIMIT FIX: On 429, STOP processing and return what we have
              // This prevents cascading failures
              console.warn(`⚠️ Rate limited - stopping validation at product: ${product.name}`);
              console.warn(`📊 Returning ${compatibleProducts.length} validated compatible products`);
              return compatibleProducts;
            } else {
              // 🔥 CRITICAL FIX: If validation fails (4xx/5xx), treat as INCOMPATIBLE
              // This prevents showing incompatible products that fail validation
              const errorData = await response.json().catch(() => ({}));
              console.warn(`❌ Validation failed for ${product.name} (${response.status}):`, errorData.message || errorData.error);
              incompatibleProducts.push({
                ...product,
                badge: '❌ Incompatible',
                compatibilityScore: 0,
                compatible: false,
                issues: [{ message: errorData.message || errorData.error || `Validation error: ${response.statusText}` }]
              });
            }
          } catch (error) {
            // 🔥 CRITICAL FIX: On error, mark as INCOMPATIBLE instead of assuming compatible
            // This prevents showing products that couldn't be validated
            console.error(`❌ Error validating ${product.name}:`, error.message);
            incompatibleProducts.push({
              ...product,
              badge: '❌ Error',
              compatibilityScore: 0,
              compatible: false,
              issues: [{ message: `Validation error: ${error.message}` }]
            });
          }
        }
        
        // Add delay between batches to prevent rate limiting
        if (i + BATCH_SIZE < clientFilteredProducts.length) {
          console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }
      
      console.log(`✅ Advanced validation complete: ${compatibleProducts.length} compatible, ${incompatibleProducts.length} incompatible`);
      
      // Return ONLY compatible products (same as user requirement)
      return compatibleProducts;
      
    } catch (error) {
      console.error('❌ Advanced compatibility check failed:', error);
      // 🔥 CRITICAL FIX: On failure, return empty array to prevent showing unvalidated products
      console.warn('⚠️ Returning empty array due to validation failure');
      return [];
    }
  };

  /**
   * Analyze products with AGGRESSIVE throttling to prevent rate limiting
   * Only used as fallback when database filtering can't determine compatibility
   */
  const analyzeProductsWithBatching = async (products, selectedComponents) => {
    const BATCH_SIZE = 2; // Only 2 products at a time (very conservative)
    const BATCH_DELAY = 1000; // 1 second delay between batches
    const REQUEST_DELAY = 500; // 500ms delay between individual requests in batch
    
    console.log(`🤖 Starting AI analysis for ${products.length} products with aggressive throttling...`);
    
    const results = [];
    
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      console.log(`📊 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(products.length / BATCH_SIZE)}`);
      
      try {
        // Process batch sequentially (NOT in parallel) to prevent rate limiting
        for (const product of batch) {
          try {
            await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
            
            const compatibilityResult = await aiService.checkCompatibility(selectedComponents, product);
            
            // 🔥 FIX ISSUE #1: Preserve image URLs when adding AI analysis results
            results.push({
              ...product,
              // Ensure image field is preserved or reconstructed
              image: product.image || api.utils.getFullImageUrl(product.imageUrl || product.image_url) || getFallbackImage(product.category || categoryName),
              imageUrl: product.imageUrl || product.image_url || product.image,
              aiRecommended: compatibilityResult.recommended || false,
              aiScore: compatibilityResult.compatibility_score || 75,
              compatibilityScore: compatibilityResult.compatibility_score || 75,
              compatibilityInfo: compatibilityResult.message || 'Compatible',
              aiCompatibilityWarning: compatibilityResult.warnings || null,
              aiAnalyzed: true
            });
            
            console.log(`✅ AI analysis successful for: ${product.name}`);
            
          } catch (error) {
            console.warn(`⚠️ AI analysis failed for ${product.name}:`, error.message);
            // 🔥 FIX ISSUE #1: Preserve image URLs when adding AI analysis results
            results.push({
              ...product,
              // Ensure image field is preserved or reconstructed
              image: product.image || api.utils.getFullImageUrl(product.imageUrl || product.image_url) || getFallbackImage(product.category || categoryName),
              imageUrl: product.imageUrl || product.image_url || product.image,
              aiScore: 60,
              compatibilityScore: 60,
              compatibilityInfo: 'Manual verification recommended',
              aiAnalyzed: false
            });
          }
        }
        
        // Add delay between batches to prevent rate limiting
        if (i + BATCH_SIZE < products.length) {
          console.log(`⏳ Waiting ${BATCH_DELAY}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
        
      } catch (error) {
        console.warn('❌ Batch processing failed:', error);
        // 🔥 FIX ISSUE #1: Preserve image URLs when batch fails
        results.push(...batch.map(product => ({
          ...product,
          // Ensure image field is preserved or reconstructed
          image: product.image || api.utils.getFullImageUrl(product.imageUrl || product.image_url) || getFallbackImage(product.category || categoryName),
          imageUrl: product.imageUrl || product.image_url || product.image,
          aiScore: 60,
          compatibilityScore: 60,
          compatibilityInfo: 'Manual verification recommended',
          aiAnalyzed: false
        })));
      }
    }
    
    console.log(`✅ AI analysis completed for ${results.length} products`);
    return results;
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
    
    navigate("/customized-display", {
      state: {
        product: {
          ...product,
          // Ensure image URL is properly constructed
          image: api.utils.getFullImageUrl(product.imageUrl || product.image) || getFallbackImage(product.category || categoryName),
          imageUrl: product.imageUrl || product.image,
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
    if (!aiEnabled && !product.badge) return null;

    // Phase 2 compatibility badges
    const badge = product.badge || '';
    const compatibilityScore = product.compatibilityScore || product.aiScore || 0;

    if (badge === '✅ Compatible') {
      return (
        <div className="compatibility-badge compatible" title={`Compatible (Score: ${compatibilityScore}/100)`}>
          <CheckCircle size={16} />
          <span>Compatible</span>
        </div>
      );
    }

    if (badge === '⚠️ May Work') {
      return (
        <div className="compatibility-badge warning" title={`May work with issues (Score: ${compatibilityScore}/100)`}>
          <AlertTriangle size={16} />
          <span>May Work</span>
        </div>
      );
    }

    if (badge === '❌ Incompatible') {
      return (
        <div className="compatibility-badge incompatible" title={`Incompatible (Score: ${compatibilityScore}/100)`}>
          <AlertCircle size={16} />
          <span>Incompatible</span>
        </div>
      );
    }

    // Fallback to old AI badges
    if (product.aiRecommended) {
      return <div className="ai-badge ai-recommended" title="AI Recommended for your build">🤖 AI Pick</div>;
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
        const price = typeof p.price === 'number' ? p.price : parseFloat(String(p.price || '').replace(/[^0-9.]/g, '')) || 0;
        const min = priceRange.min ? parseFloat(priceRange.min) : 0;
        const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
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
      // AI recommended products first
      if (aiEnabled) {
        if (a.aiRecommended && !b.aiRecommended) return -1;
        if (!a.aiRecommended && b.aiRecommended) return 1;
        if (a.aiScore !== b.aiScore) return (b.aiScore || 0) - (a.aiScore || 0);
      }

      // Then apply selected sort order
      switch (sortOrder) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'price-asc': {
          const priceA = typeof a.price === 'number' ? a.price : parseFloat(String(a.price || '').replace(/[^0-9.]/g, '')) || 0;
          const priceB = typeof b.price === 'number' ? b.price : parseFloat(String(b.price || '').replace(/[^0-9.]/g, '')) || 0;
          return priceA - priceB;
        }
        case 'price-desc': {
          const priceA = typeof a.price === 'number' ? a.price : parseFloat(String(a.price || '').replace(/[^0-9.]/g, '')) || 0;
          const priceB = typeof b.price === 'number' ? b.price : parseFloat(String(b.price || '').replace(/[^0-9.]/g, '')) || 0;
          return priceB - priceA;
        }
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
              <img src={filterspecs} alt="Filter Icon" className="filter-icon"/>
              FILTER SPECS
            </button>
          </div>
        </div>
      </div>
      <div className="customized-products-grid">
        {sortedProducts?.map((product, index) => {
          const isIncompatible = product.compatible === false || product.badge === '❌ Incompatible';
          const hasWarning = product.badge === '⚠️ May Work';
          const hasBiosWarning = product.biosWarning;

          return (
            <div
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
              onClick={() => !isIncompatible && handleProductClick(product)}
              style={{ 
                opacity: isIncompatible ? 0.5 : 1,
                cursor: isIncompatible ? 'not-allowed' : 'pointer'
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

              <img
              src={(() => {
                // FIX ISSUE #3: Properly construct image URLs for display
                const imageUrl = product.imageUrl || product.image;
                if (imageUrl) {
                  return api.utils.getFullImageUrl(imageUrl);
                }
                return getFallbackImage(product.category || categoryName);
              })()}
              alt={product.name}
              className="customized-products-image"
              onError={(e) => {
                // Fallback if image fails to load
                e.target.src = getFallbackImage(product.category || categoryName);
              }}
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
                ? `₱${parseFloat(product.price.toString().replace(/[^0-9.,]/g, "").replace(/,/g, ""))
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
          </div>
        );
        })}
      </div>

      {/* Compatibility Modal */}
      {showCompatibilityModal && selectedProductForModal && (
        <div className="incompatibility-modal-overlay" onClick={closeCompatibilityModal}>
          <div className="incompatibility-modal-content" onClick={(e) => e.stopPropagation()}>
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
                  <div 
                    className="score-bar" 
                    style={{ 
                      width: `${selectedProductForModal.compatibilityScore || 0}%`,
                      backgroundColor: 
                        selectedProductForModal.compatibilityScore >= 85 ? '#22c55e' :
                        selectedProductForModal.compatibilityScore >= 60 ? '#f59e0b' : '#ef4444'
                    }}
                  >
                    {selectedProductForModal.compatibilityScore || 0}%
                  </div>
                </div>
                <p className="score-description">{selectedProductForModal.badge}</p>
              </div>

              {/* Issues */}
              {selectedProductForModal.issues && selectedProductForModal.issues.length > 0 && (
                <div className="modal-issues-section">
                  <h4>Issues Detected</h4>
                  <ul className="issues-list">
                    {selectedProductForModal.issues.map((issue, idx) => (
                      <li key={idx} className={`issue-item ${issue.severity || 'warning'}`}>
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
                      <li key={idx} className="recommendation-item">
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
                        <li key={idx} className="rule-item">
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
        </div>
      )}

      {/* Filter & Sort Popup - PC-Parts Style */}
      {showFilterModal && (
        <div className="popup-overlay" onClick={toggleFilterModal}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
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
                          className={`filter-btn ${!currentValue ? 'active' : ''}`}
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