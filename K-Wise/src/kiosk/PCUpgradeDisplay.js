/**
 * PCUpgradeDisplay.js - Multi-Product Grid Component
 * UI Pattern: Matches CustomizedProducts.js styling
 * Features: Advanced filtering, AI recommendations, compare mode
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle, AlertTriangle, X } from 'lucide-react';
import './PCUpgradeDisplay.css';
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
import filterspecs from "../assets/CustomProducts/filterspecs.svg";

const PCUpgradeDisplay = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { categoryKey, categoryName } = location.state || {};

  // Product state
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter and sort state
  const [selectedBrand, setSelectedBrand] = useState('');
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [brandCounts, setBrandCounts] = useState({});
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortOrder, setSortOrder] = useState('name-asc');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);

  // Compatibility modal state
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);

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
  const getFallbackImage = (category) => {
    const catLower = (category || categoryKey || '').toLowerCase();
    return defaultCategoryImages[catLower] || SystemUnit1;
  };

  /**
   * Load products with AI compatibility analysis
   */
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Loading products for category:', categoryName, categoryKey);

      // Map category key to API format
      const categoryMapping = {
        'processor': 'cpu',
        'cpu': 'cpu',
        'gpu': 'gpu',
        'graphcard': 'gpu',
        'ram': 'ram',
        'memory': 'ram',
        'storage': 'storage',
        'motherboard': 'motherboard',
        'psu': 'psu',
        'power supply': 'psu',
        'cpu-cooler': 'cpu-cooler',
        'cooling': 'cpu-cooler',
        'case': 'case',
        'chassis': 'case'
      };

      const apiCategory = categoryMapping[categoryKey?.toLowerCase()] || categoryKey;

      if (!apiCategory) {
        throw new Error('Invalid category');
      }

      console.log('📡 Fetching products from API for category:', apiCategory);

      // Fetch products from API
      const apiResponse = await api.kiosk.getCategoryProducts(apiCategory);
      
      // 🔥 FIX: Handle nested response structure {data: {items: [], pagination: {}}}
      const response = apiResponse?.data || apiResponse || [];
      
      console.log('✅ API Response:', apiResponse);
      console.log('✅ Products loaded:', response.length);

      // Get current upgrade parts for compatibility analysis
      const upgradeProgress = JSON.parse(localStorage.getItem('pc-upgrade-progress') || '{}');
      
      // 🔥 CRITICAL FIX: Separate AI estimation from actual selections
      // upgradeParts = User's ACTUAL selections to purchase
      // estimatedBuild = AI estimation from "Tell Us Your PC" (for display/recommendations ONLY)
      const upgradeParts = JSON.parse(localStorage.getItem('pc-upgrade-selections') || '{}');
      const estimatedBuild = upgradeProgress.estimatedBuild || null;
      
      console.log('Actual upgrade selections (pc-upgrade-selections):', upgradeParts);
      console.log('Actual selections count:', Object.keys(upgradeParts).length);
      console.log('Actual selections details:', Object.entries(upgradeParts).map(([key, val]) => ({
        category: key,
        hasName: !!val?.name,
        isProduct: typeof val === 'object' && val !== null,
        productName: val?.name || 'N/A'
      })));
      console.log('AI estimation (estimatedBuild):', estimatedBuild ? Object.keys(estimatedBuild) : 'None');
      
      // 🔥 FIX: Only count ACTUAL upgrade selections
      // AI estimation from "Tell Us About Your PC" are NOT real product selections
      // They're just text inputs like "NVIDIA", "16GB", "Gaming", etc.
      // Only apply compatibility filter if there are ACTUAL PRODUCT selections with IDs
      const currentCategoryLower = categoryKey?.toLowerCase();
      
      // Filter to get only items that were ACTUALLY selected as PRODUCTS to purchase
      // 🔥 CRITICAL FIX: Filter to get ONLY ACTUAL USER-SELECTED PRODUCTS
      // Exclude:
      // 1. Non-object items (primitives, nulls)
      // 2. Text inputs from "Tell Us About Your PC" (no id/name/price)
      // 3. AI-estimated parts (isAIEstimated flag) - these represent what user HAS, not what they want to buy
      const selectedComponents = Object.entries(upgradeParts)
        .filter(([key, item]) => {
          if (!item || typeof item !== 'object') return false;
          
          // Exclude AI-estimated current parts (these are what user currently has, not upgrade selections)
          if (item.isAIEstimated || item.isCurrentPart) {
            console.log('⚠️ Skipping AI-estimated current part:', key, '=', item.name);
            return false;
          }
          
          // Must have product ID and name (actual product, not just text input)
          const hasProductData = item.id && item.name && (item.price !== undefined);
          
          // Log for debugging
          if (!hasProductData && item) {
            console.log('⚠️ Skipping non-product data:', key, '=', item);
          }
          
          return hasProductData;
        })
        .map(([key, item]) => ({ ...item, categoryKey: key }));
      
      const otherComponents = selectedComponents.filter(comp => {
        const compCategoryKey = comp.categoryKey?.toLowerCase();
        // Only filter out components from the CURRENT category
        // Include ALL other categories (GPU, CPU, RAM, etc.)
        return compCategoryKey !== currentCategoryLower;
      });

      console.log('🔍 Category selection check:', {
        category: categoryName,
        currentCategoryKey: currentCategoryLower,
        totalProductSelections: selectedComponents.length,
        otherComponentsCount: otherComponents.length,
        selectedProductNames: selectedComponents.map(c => c.name),
        hasEstimatedBuild: !!estimatedBuild
      });

      // 🔥 CRITICAL FIX: Check if there are products from OTHER categories
      // Compatibility filtering should ONLY happen when:
      // 1. User is viewing a category AND has selected products in OTHER categories
      // 2. otherComponents.length > 0 means: "I have products in other categories to compare against"
      // 3. Example: Viewing GPU category with CPU already selected → filter GPUs compatible with that CPU
      
      if (otherComponents.length > 0) {
        // User has products in OTHER categories - run compatibility filtering
        console.log('🔍 Running hardware compatibility analysis (products in other categories)...');
        console.log('  - Total products selected:', selectedComponents.length);
        console.log('  - Products in OTHER categories:', otherComponents.length);
        console.log('  - Current category:', categoryName);
        console.log('  - AI estimated build available:', !!estimatedBuild);
        
        const compatibleProducts = await getCompatibleProducts(
          response, 
          otherComponents, 
          categoryName,
          estimatedBuild // Pass estimated build for enhanced filtering
        );
        
        if (compatibleProducts && compatibleProducts.length > 0) {
          setProducts(compatibleProducts);
          console.log('✅ Hardware compatibility filtering completed:', compatibleProducts.length, 'compatible products');
        } else {
          // Fallback: show all products as compatible if builder API fails
          const fallbackProducts = response.map(product => ({
            ...product,
            compatible: true,
            badge: '✅ Compatible',
            compatibilityScore: 85,
            aiAnalyzed: false,
            isCompatible: true
          }));
          setProducts(fallbackProducts);
          console.log('⚠️ Using all products with default compatibility (API returned empty)');
        }
      } else {
        // 🔥 CRITICAL: NO ACTUAL PRODUCTS selected yet (only text from "Tell Us Your PC")
        // Show ALL products as clickable - NO compatibility filtering
        // Products are only filtered by database query (category, stock, etc.)
        console.log('💡 No products selected yet - showing ALL products as clickable');
        console.log('   - Only database filtering (category, active, in-stock)');
        console.log('   - Hardware compatibility will apply AFTER first product selection');
        
        const allProductsClickable = response.map(product => ({
          ...product,
          compatible: true,
          badge: '✅ Available',
          compatibilityScore: 100,
          aiAnalyzed: false,
          recommended: false,
          isCompatible: true
        }));
        setProducts(allProductsClickable);
        console.log('✅ Showing all', response.length, 'products as clickable');
      }

      // Extract unique brands
      const uniqueBrands = [...new Set(response.map(p => p.brand).filter(Boolean))];
      setBrands(uniqueBrands);

      // Calculate brand counts
      const counts = {};
      response.forEach(product => {
        if (product.brand) {
          counts[product.brand] = (counts[product.brand] || 0) + 1;
        }
      });
      setBrandCounts(counts);

    } catch (err) {
      console.error('❌ Error loading products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get compatible products using Builder API
   * 🔥 CRITICAL FIX: Only apply hardware compatibility when user has selected items
   * When NO items selected: Show all products (filtered by AI estimation only)
   * When items ARE selected: Apply Builder API hardware compatibility
   */
  const getCompatibleProducts = async (products, selectedComponents, categoryName, estimatedBuild = null) => {
    try {
      console.log('🔍 Hardware compatibility check for:', categoryName);
      console.log('🔍 Selected components count:', selectedComponents.length);

      // Build selectedParts object from actual user selections ONLY
      const selectedParts = {};
      
      selectedComponents.forEach(comp => {
        if (!comp) return;
        
        // 🔥 CRITICAL FIX: Use comp.category (normalized lowercase) BEFORE comp.categoryName (display name)
        // This fixes filtering failure where "Processor" vs "cpu" key mismatch causes filter to skip
        const category = comp.category || comp.categoryName || '';
        const catLower = category.toLowerCase();
        
        if (catLower.includes('cpu') || catLower.includes('processor')) {
          selectedParts.CPU = {
            socket: comp.socket || comp.specifications?.socket,
            tdp: comp.tdp || comp.specifications?.tdp || 65,
            cores: comp.cores || comp.specifications?.cores,
            name: comp.name
          };
        } 
        else if (catLower.includes('cool') || catLower.includes('fan')) {
          selectedParts.Cooling = {
            height: comp.height || comp.specifications?.height,
            name: comp.name
          };
        }
        else if (catLower.includes('mother')) {
          selectedParts.Motherboard = {
            socket: comp.socket || comp.specifications?.socket,
            memory_type: comp.memory_type || comp.specifications?.memory_type,
            form_factor: comp.form_factor || comp.specifications?.form_factor,
            name: comp.name
          };
        }
        else if (catLower.includes('ram') || catLower.includes('memory')) {
          selectedParts.RAM = {
            memory_type: comp.memory_type || comp.specifications?.memory_type,
            speed: comp.speed || comp.specifications?.speed,
            name: comp.name
          };
        }
        else if (catLower.includes('storage')) {
          selectedParts.Storage = {
            type: comp.type || comp.specifications?.type,
            name: comp.name
          };
        }
        else if (catLower.includes('gpu') || catLower.includes('graphics')) {
          selectedParts.GPU = {
            length: comp.length || comp.specifications?.length,
            tdp: comp.tdp || comp.specifications?.tdp,
            name: comp.name
          };
        }
        else if (catLower.includes('case') || catLower.includes('chassis')) {
          selectedParts.Case = {
            max_gpu_length: comp.max_gpu_length || comp.specifications?.max_gpu_length,
            form_factor: comp.form_factor || comp.specifications?.form_factor,
            name: comp.name
          };
        }
        else if (catLower.includes('psu') || catLower.includes('power')) {
          selectedParts.PSU = {
            wattage: comp.wattage || comp.specifications?.wattage,
            name: comp.name
          };
        }
      });

      // 🔥 REMOVED: Estimated build constraint injection
      // We only use Builder API when user has actually selected items
      // When NO items selected, we show ALL products (no compatibility filtering)
      // The AI estimation is used for DISPLAY purposes (recommendations, sorting)
      // NOT for hard filtering (which would prevent users from selecting items)

      console.log('🔧 Building hardware compatibility constraints from selected items...');
      console.log('📊 Selected parts for compatibility check:', Object.keys(selectedParts));

      // Determine builder category
      const categoryKeyLower = categoryKey?.toLowerCase() || '';
      let builderCategory = null;
      
      if (categoryKeyLower.includes('cpu') || categoryKeyLower.includes('processor')) builderCategory = 'CPU';
      else if (categoryKeyLower.includes('cool') || categoryKeyLower.includes('fan')) builderCategory = 'Cooling';
      else if (categoryKeyLower.includes('mother')) builderCategory = 'Motherboard';
      else if (categoryKeyLower.includes('ram') || categoryKeyLower.includes('memory')) builderCategory = 'RAM';
      else if (categoryKeyLower.includes('storage')) builderCategory = 'Storage';
      else if (categoryKeyLower.includes('gpu') || categoryKeyLower.includes('graphics')) builderCategory = 'GPU';
      else if (categoryKeyLower.includes('case') || categoryKeyLower.includes('chassis')) builderCategory = 'Case';
      else if (categoryKeyLower.includes('psu') || categoryKeyLower.includes('power')) builderCategory = 'PSU';

      if (!builderCategory) {
        console.warn('⚠️ Could not determine builder category for:', categoryKey);
        return products.map(product => ({
          ...product,
          compatible: true,
          badge: '✅ Compatible',
          compatibilityScore: 85,
          aiAnalyzed: false,
          isCompatible: true
        }));
      }

      console.log('📡 Calling Builder API:', builderCategory);
      console.log('📡 Constraints:', selectedParts);

      // Use builder API with AI-enhanced constraints
      const compatibleProducts = await api.builder.getAvailableOptions(builderCategory, selectedParts);
      
      console.log(`✅ Builder API returned ${compatibleProducts.length} compatible products`);

      if (compatibleProducts.length > 0) {
        return compatibleProducts.map(product => ({
          ...product,
          badge: '✅ Compatible',
          compatible: true,
          image: api.utils.getFullImageUrl(product.imageUrl || product.image) || getFallbackImage(product.category || categoryName),
          imageUrl: product.imageUrl || product.image,
          aiScore: 90,
          compatibilityScore: 90,
          compatibilityInfo: 'Compatible with current build',
          aiAnalyzed: true,
          recommended: true,
          isCompatible: true
        }));
      } else {
        // Return all products as compatible if no results (prevents empty screen)
        console.warn('⚠️ Builder API returned 0 results - showing all products');
        return products.map(product => ({
          ...product,
          compatible: true,
          badge: '✅ Compatible',
          compatibilityScore: 80,
          aiAnalyzed: false,
          isCompatible: true
        }));
      }
      
    } catch (error) {
      console.error('❌ Builder API compatibility check failed:', error);
      // Return all products as compatible on error
      return products.map(product => ({
        ...product,
        compatible: true,
        badge: '✅ Compatible',
        compatibilityScore: 75,
        aiAnalyzed: false,
        isCompatible: true
      }));
    }
  };

  // Load products on mount
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryKey]);

  /**
   * Handle product click - Navigate to detail view
   */
  const handleProductClick = (product) => {
    // Don't allow clicking incompatible products
    if (product.compatible === false || product.badge === '❌ Incompatible') {
      return;
    }

    navigate('/pc-upgrade-product', {
      state: {
        product: {
          ...product,
          image: api.utils.getFullImageUrl(product.imageUrl || product.image) || getFallbackImage(product.category || categoryName),
          imageUrl: product.imageUrl || product.image,
          specifications: product.specifications || product.spec || {},
          category: product.category || categoryName,
          price: product.price,
          sale_price: product.sale_price,
          name: product.name,
          brand: product.brand,
          description: product.description
        },
        categoryName,
        categoryKey,
        returnTo: '/pc-upgrade-display'
      }
    });
  };

  /**
   * Handle brand selection
   */
  const handleBrandSelect = (brand) => {
    setSelectedBrand(brand);
    setBrandDropdownOpen(false);
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
    setPriceRange({ min: '', max: '' });
    setSortOrder('name-asc');
    setSelectedBrand('');
  };

  /**
   * Sort and filter products
   */
  const sortedProducts = React.useMemo(() => {
    let filtered = [...products];

    // Brand filter
    if (selectedBrand) {
      filtered = filtered.filter(p => p.brand === selectedBrand);
    }

    // Price range filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(p => {
        const price = parseFloat(p.sale_price || p.price || 0);
        const min = priceRange.min ? parseFloat(priceRange.min) : 0;
        const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
        return price >= min && price <= max;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'price-asc':
          return parseFloat(a.sale_price || a.price || 0) - parseFloat(b.sale_price || b.price || 0);
        case 'price-desc':
          return parseFloat(b.sale_price || b.price || 0) - parseFloat(a.sale_price || a.price || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, selectedBrand, priceRange, sortOrder]);

  /**
   * Handle compare mode toggle
   * 🔥 FIX ISSUE #3: Fixed event propagation
   */
  // eslint-disable-next-line no-unused-vars
  const handleCompareToggle = (e) => {
    if (e) e.preventDefault();
    e?.stopPropagation();
    setCompareMode(!compareMode);
    if (!compareMode) {
      setSelectedForCompare([]);
    }
  };

  /**
   * Handle product selection for comparison
   * 🔥 FIX ISSUE #3: Fixed event propagation
   */
  const handleSelectForCompare = (e, product) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (selectedForCompare.find(p => p.id === product.id)) {
      setSelectedForCompare(selectedForCompare.filter(p => p.id !== product.id));
    } else {
      if (selectedForCompare.length >= 3) {
        alert('You can only compare up to 3 products at a time');
        return;
      }
      setSelectedForCompare([...selectedForCompare, product]);
    }
  };

  /**
   * Navigate to comparison view
   * 🔥 FIX ISSUE #3: Fixed navigation
   */
  const handleCompare = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (selectedForCompare.length < 2) {
      alert('Please select at least 2 products to compare');
      return;
    }

    navigate('/pc-upgrade-compare', {
      state: {
        products: selectedForCompare,
        categoryName,
        categoryKey
      }
    });
  };

  /**
   * Render compatibility badge
   */
  const renderCompatibilityBadge = (product) => {
    if (!product.aiAnalyzed && !product.badge) return null;

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

    if (product.recommended) {
      return <div className="ai-badge ai-recommended" title="AI Recommended for your build">🤖 AI Pick</div>;
    }

    return null;
  };

  /**
   * Open compatibility modal
   */
  const openCompatibilityModal = (e, product) => {
    e.stopPropagation();
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
   * Handle back button
   */
  const handleBack = () => {
    navigate('/pc-upgrade', {
      state: { 
        step: 'current-parts',
        fromSelection: true // 🔥 FIX: Preserve state when going back
      }
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="pcu-display-container">
        <div className="pcu-display-loading">
          <div className="pcu-loading-spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="pcu-display-container">
        <div className="pcu-display-error">
          <p>❌ {error}</p>
          <button onClick={handleBack}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="customized-products-container">
      {/* Header - Matches CustomizedProducts.js */}
      <div className="customized-products-header">
        <div className="customized-products-header-content">
          <img src={PCUpgrade} alt="Logo" className="customized-products-icon" />
          <div className="customized-products-header-text">
            <h2 className="customized-products-title">
              {categoryName} <span className="category-count">[{sortedProducts.length}]</span>
            </h2>
          </div>
        </div>
        
        {/* Brands & Filter Section - Matches CustomizedProducts.js */}
        <div className="brands-filter-section">
          <div className="brand-section">
            <div className="brand-dropdown-container">
              <button
                type="button"
                className="brand-dropdown-trigger"
                onClick={() => setBrandDropdownOpen(!brandDropdownOpen)}
              >
                <span>
                  {selectedBrand || 'All Brands'} ({selectedBrand ? (brandCounts[selectedBrand] || 0) : brands.length})
                </span>
                <span className={`dropdown-arrow ${brandDropdownOpen ? 'open' : ''}`}>
                  ▼
                </span>
              </button>
              
              {brandDropdownOpen && (
                <div className="brand-dropdown-menu">
                  <button
                    type="button"
                    className={selectedBrand === '' ? 'active' : ''}
                    onClick={() => handleBrandSelect('')}
                  >
                    All Brands ({brands.length})
                  </button>
                  
                  {brands && brands.length > 0 ? (
                    brands.map((brand) => (
                      <button
                        key={brand}
                        type="button"
                        className={selectedBrand === brand ? 'active' : ''}
                        onClick={() => handleBrandSelect(brand)}
                      >
                        {brand} ({brandCounts[brand] || 0})
                      </button>
                    ))
                  ) : (
                    <button type="button" disabled>No Brands Available</button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="filter-button-container">
            <button className="filter-button" onClick={toggleFilterModal}>
              <img src={filterspecs} alt="Filter Icon" className="filter-icon"/>
              FILTER SPECS
            </button>
          </div>
        </div>
      </div>

      {/* Product Grid - Matches CustomizedProducts.js */}
      <div className="customized-products-grid">
        {sortedProducts.map((product, index) => {
          const isIncompatible = product.compatible === false || product.badge === '❌ Incompatible';
          const hasWarning = product.badge === '⚠️ May Work';
          const hasBiosWarning = product.biosWarning;
          const isSelected = selectedForCompare.find(p => p.id === product.id);

          return (
            <div
              key={product.id || index}
              className={`customized-products-card ${
                product.recommended ? 'ai-recommended-card' : ''
              } ${
                isIncompatible ? 'incompatible-card' : ''
              } ${
                hasWarning ? 'warning-card' : ''
              } ${
                isSelected ? 'selected-for-compare' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (compareMode) {
                  handleSelectForCompare(e, product);
                } else if (!isIncompatible) {
                  handleProductClick(product);
                }
              }}
              style={{ 
                opacity: isIncompatible ? 0.5 : 1,
                cursor: isIncompatible && !compareMode ? 'not-allowed' : 'pointer'
              }}
            >
              <div className="product-card-header">
                {renderCompatibilityBadge(product)}
                {(product.aiAnalyzed || product.compatibilityScore) && (
                  <div className="ai-score" title={product.compatibilityInfo || `Compatibility Score: ${product.compatibilityScore || product.aiScore}/100`}>
                    {product.compatibilityScore || product.aiScore || '?'}
                  </div>
                )}
              </div>

              {/* Compare Checkbox */}
              {compareMode && (
                <div className="compare-checkbox" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={!!isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectForCompare(e, product);
                    }}
                  />
                </div>
              )}

              {/* BIOS Warning Banner */}
              {hasBiosWarning && (
                <div className="bios-warning-banner">
                  <AlertTriangle size={16} />
                  <span>{product.biosWarning}</span>
                </div>
              )}

              <img
                src={(() => {
                  const imageUrl = product.imageUrl || product.image;
                  if (imageUrl) {
                    return api.utils.getFullImageUrl(imageUrl);
                  }
                  return getFallbackImage(product.category || categoryName);
                })()}
                alt={product.name}
                className="customized-products-image"
                onError={(e) => {
                  e.target.src = getFallbackImage(product.category || categoryName);
                }}
              />

              <div className="customized-products-name">{product.name}</div>
              <div className="customized-products-price">
                {product.sale_price || product.price
                  ? `₱${parseFloat((product.sale_price || product.price).toString().replace(/[^0-9.,]/g, "").replace(/,/g, ""))
                    .toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}`
                  : "Price Unavailable"}
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

      {/* Compatibility Modal - Matches CustomizedProducts.js */}
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
            </div>

            <div className="modal-footer">
              <button className="modal-close-button" onClick={closeCompatibilityModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Sort Modal - Matches CustomizedProducts.js */}
      {showFilterModal && (
        <div className="popup-overlay" onClick={toggleFilterModal}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <h2 className="popup-title">FILTER & SORT</h2>
            <button className="popup-close-btn" onClick={toggleFilterModal}>
              <X size={24} />
            </button>

            <div className="popup-body">
              {/* Price Range Filter */}
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

              {/* Sort By */}
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

      {/* Footer - Compare Bar and Back Button */}
      <div className="customized-products-footer">
        <button 
          className="customized-products-back-button" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleBack();
          }}
        >
          Back
        </button>

        {/* Compare Bar - 🔥 FIX ISSUE #3: Fixed handler */}
        {compareMode && selectedForCompare.length > 0 && (
          <div className="pcu-compare-bar">
            <span>{selectedForCompare.length} products selected</span>
            <button 
              onClick={handleCompare}
              disabled={selectedForCompare.length < 2}
            >
              Compare Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PCUpgradeDisplay;
