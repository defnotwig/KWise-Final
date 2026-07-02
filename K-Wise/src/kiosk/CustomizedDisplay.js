import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./CustomizedDisplay.css";
import Customized from "../assets/Customized.webp"; // Ensure the path is correct
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

const CustomizedDisplay = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    product, 
    categoryName, 
    products,
    slotKey,
    multiSlotCart: _multiSlotCart // eslint-disable-line no-unused-vars
  } = location.state || {};

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
   * Get fallback image based on category
   */
  const getFallbackImage = (category) => {
    const catLower = (category || '').toLowerCase();
    return defaultCategoryImages[catLower] || SystemUnit1;
  };

  const handleBackClick = () => {
    // 🔥 FIX ISSUE #2: Set flag to indicate returning from navigation
    sessionStorage.setItem('pcCustomizedLoaded', 'true');
    
    // If coming from AI Edit Build flow, navigate back to CustomizedProducts with proper state
    if (location.state?.fromAI && location.state?.fromEdit) {
      navigate('/customized-products', {
        state: {
          categoryName: categoryName,
          categoryKey: location.state?.categoryKey,
          products: products,
          brands: location.state?.brands || [],
          currentBuild: location.state?.currentBuild,
          assessment: location.state?.assessment,
          fromAI: true,
          fromEdit: true,
          returnTo: '/customize-ai/edit-build'
        }
      });
      return;
    }
    
    navigate(-1); // Navigate back to the previous page
  };

  const handleAddClick = () => {
    // Add product to cart directly
    // Compatibility validation will happen at checkout
    addProductToCart();
  };

  // ✅ Direct add to cart (called after validation passes or user confirms)
  const addProductToCart = () => {
    const from = location.state?.from;
    const fromAI = location.state?.fromAI;
    const fromPeripherals = location.state?.fromPeripherals;

    // If coming from Peripherals (AI build), add to selected peripherals
    if (fromAI && fromPeripherals) {
      const selectedPeripherals = location.state?.selectedPeripherals || [];
      selectedPeripherals.push({
        ...product,
        category: categoryName,
        isPeripheral: true
      });

      console.log('✅ Added peripheral:', product.name);
      
      // Get flow context from sessionStorage
      const flowContext = JSON.parse(sessionStorage.getItem('peripheralsFlowContext') || '{}');
      
      // Navigate back to Peripherals page with updated selection AND flow context
      navigate('/peripherals', {
        state: {
          from: flowContext.from || 'customize-ai', // ✅ Preserve source
          fromAI: true,
          buildComponents: location.state?.buildComponents,
          assessment: location.state?.assessment,
          selectedPeripherals: selectedPeripherals,
          cartItems: flowContext.cartItems || [],
          totalPrice: flowContext.totalPrice || 0,
          buildType: flowContext.buildType || 'custom',
          prebuiltCart: flowContext.prebuiltCart || [],
          buildSource: flowContext.buildSource || 'preset'
        }
      });
      return;
    }

    // If coming from AI CustomizeAI Edit Build, update the AI build and go back
    if (fromAI && location.state?.currentBuild) {
      const categoryKey = location.state?.categoryKey;
      if (categoryKey) {
        const currentBuild = location.state.currentBuild;
        
        // 🔥 FIX: Normalize image field to ensure EditBuild can display it
        const normalizedProduct = {
          ...product,
          // Ensure imageUrl field exists (EditBuild checks for this)
          imageUrl: product.imageUrl || product.image_url || product.image || product.image_path,
          // Also keep image_url for backward compatibility
          image_url: product.image_url || product.imageUrl || product.image || product.image_path
        };
        
        currentBuild[categoryKey] = normalizedProduct; // Replace component in AI build
        localStorage.setItem('aiCustomizedBuild', JSON.stringify(currentBuild));
        
        console.log('✅ Updated AI build component:', categoryKey, normalizedProduct.name);
        console.log('📋 Image fields preserved:', {
          imageUrl: normalizedProduct.imageUrl,
          image_url: normalizedProduct.image_url
        });
        
        // Navigate back to EditBuild with updated build
        navigate('/customize-ai/edit-build', {
          state: {
            buildComponents: currentBuild,
            assessment: location.state?.assessment
          }
        });
        return;
      }
    }

    // If coming from PC Upgrade flow, save to pc-upgrade-current and go back
    if (from === 'pc-upgrade') {
      const categoryKey = location.state?.categoryKey;
      if (categoryKey) {
        const current = JSON.parse(localStorage.getItem('pc-upgrade-current') || '{}');
        current[categoryKey] = product; // save selected product as current part
        localStorage.setItem('pc-upgrade-current', JSON.stringify(current));
      }

      const returnTo = location.state?.returnTo || '/pc-upgrade';
      navigate(returnTo, { state: { step: 'current-parts' } });
      return;
    }

    // Default behavior: add/replace item in PCCustomized cart
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const currentMultiSlotCart = JSON.parse(localStorage.getItem("multiSlotCart")) || {};
    const categoryIndex = location.state?.categoryIndex;

    console.log('🛒 Adding to cart - categoryIndex:', categoryIndex, 'slotKey:', slotKey);
    console.log('🛒 Current cart before add:', cart);
    console.log('🛒 Current multiSlotCart before add:', currentMultiSlotCart);
    console.log('🛒 Product to add:', product);
    console.log('🛒 Product category:', product?.category, 'categoryName:', categoryName);

    // 🔥 CRITICAL FIX: Normalize category to lowercase API format
    const normalizeCategory = (cat) => {
      if (!cat) return '';
      const catLower = cat.toLowerCase();
      
      // Map formatted names to API format
      if (catLower.includes('processor') || catLower.includes('cpu')) return 'cpu';
      if (catLower.includes('graphics') || catLower.includes('gpu')) return 'gpu';
      if (catLower.includes('motherboard') || catLower.includes('mobo')) return 'motherboard';
      if (catLower.includes('memory') || catLower.includes('ram')) return 'ram';
      if (catLower.includes('storage') || catLower.includes('ssd') || catLower.includes('nvme')) return 'storage';
      if (catLower.includes('cooler') || catLower.includes('cooling') || catLower.includes('fan')) return 'cooling';
      if (catLower.includes('power') || catLower.includes('psu')) return 'psu';
      if (catLower.includes('case') || catLower.includes('chassis')) return 'case';
      
      return catLower; // Return as-is if no match
    };

    const normalizedCategory = normalizeCategory(product.category) || normalizeCategory(categoryName);
    console.log('🛒 Normalized category:', normalizedCategory);

    // Check if this is a multi-slot item (has slotKey)
    if (slotKey) {
      // Add to multiSlotCart - CRITICAL: Preserve all specifications AND dimensions
      currentMultiSlotCart[slotKey] = { 
        ...product,
        specifications: product.specifications || {},  // Explicitly preserve specifications
        dimensions: product.dimensions || {},  // 🔥 CRITICAL: Preserve dimensions for compatibility validation
        quantity: 1,
        category: normalizedCategory,  // 🔥 Use normalized category
        categoryName: categoryName  // Keep formatted name for display
      };
      localStorage.setItem("multiSlotCart", JSON.stringify(currentMultiSlotCart));
      console.log('💾 MultiSlotCart saved to localStorage:', currentMultiSlotCart);
      console.log('🔍 Saved category:', currentMultiSlotCart[slotKey].category);
      console.log('🔍 Saved specifications:', currentMultiSlotCart[slotKey].specifications);
      console.log('🔍 Saved dimensions:', currentMultiSlotCart[slotKey].dimensions);
    } else if (typeof categoryIndex === "number") {
      // Add to base cart array - CRITICAL: Preserve specifications AND dimensions
      cart[categoryIndex] = { 
        ...product,
        specifications: product.specifications || {},  // Explicitly preserve specifications
        dimensions: product.dimensions || {},  // 🔥 CRITICAL: Preserve dimensions for compatibility validation
        quantity: 1,
        category: normalizedCategory,  // 🔥 Use normalized category
        categoryName: categoryName  // Keep formatted name for display
      };
      localStorage.setItem("cart", JSON.stringify(cart));
      console.log('💾 Cart saved to localStorage');
      console.log('🔍 Saved category:', cart[categoryIndex].category);
      console.log('🔍 Saved specifications:', cart[categoryIndex].specifications);
      console.log('🔍 Saved dimensions:', cart[categoryIndex].dimensions);
    }
      
    // 🔥 FIX ISSUE #1: Dispatch custom event to notify PCCustomized of cart change
    globalThis.dispatchEvent(new Event('cartUpdated'));
    console.log('📢 cartUpdated event dispatched');

    // 🔥 FIX ISSUE #2: Set flag to indicate returning from navigation
    sessionStorage.setItem('pcCustomizedLoaded', 'true');

    // Navigate back to PCCustomized.js with an 'added' flag to drive focus behavior
    navigate("/pc-customized", {
      state: {
        selectedCategory: categoryIndex,
        added: true,
      },
    });
  };

  return (
    <div className="customized-display-container">
      {/* Header */}
      <div className="customized-display-header">
        <div className="customized-display-header-content">
          <img src={Customized} alt="Logo" className="customized-display-icon" />
          <div className="customized-display-header-text">
            <h2 className="customized-display-title">
              {categoryName} <span className="category-count">[{products.length}]</span>
            </h2>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="customized-display-product">
        <KioskProductImage
          product={product}
          alt={product?.name}
          className="customized-display-image"
          variant="detail"
          fallbackSrc={getFallbackImage(product?.category || categoryName)}
          sizes="(max-width: 768px) 90vw, 420px"
          width="420"
          height="420"
        />
        <div className="customized-display-info">
          <p className="customized-display-price">
            ₱{(() => {
              const price = product?.price;
              // If already a number, format it
              if (typeof price === 'number') {
                return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              }
              // If string, extract number and format
              const numericPrice = Number.parseFloat(String(price || '').replaceAll(/[^\d.]/g, '')) || 0;
              return numericPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            })()}
          </p>
          <h3 className="customized-display-name">{product?.name}</h3>
        </div>
      </div>


      {/* 🔥 FIX ISSUE #3: Vertical list layout without table */}
      <div className="customized-display-specifications">
        <h3>Specifications</h3>
        {(() => {
          // Extract specifications from multiple possible locations
          const specs = product?.specifications || product?.spec || {};
          
          // Handle different spec formats
          let specEntries = [];
          
          if (typeof specs === "object" && specs !== null && Object.keys(specs).length > 0) {
            specEntries = Object.entries(specs);
          } 
          // Also check top-level product fields for common specs
          else {
            const commonSpecFields = [
              'socket', 'cores', 'threads', 'base_clock', 'boost_clock', 'tdp', 'cache',
              'memory_type', 'speed', 'capacity', 'form_factor', 'chipset',
              'wattage', 'efficiency_rating', 'modular',
              'type', 'interface', 'read_speed', 'write_speed',
              'length', 'width', 'height', 'weight',
              'compatible_sockets', 'max_gpu_length', 'max_cpu_cooler_height',
              'fan_size', 'rpm', 'noise_level', 'airflow'
            ];
            
            specEntries = commonSpecFields
              .filter(field => product?.[field] != null && product[field] !== '')
              .map(field => [field, product[field]]);
          }
          
          if (specEntries.length > 0) {
            return (
              <div className="specifications-content">
                {/* 🔥 FIX ISSUE #3: Use vertical list instead of table */}
                <div className="specifications-list">
                  {specEntries.map(([key, value]) => {
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
            );
          } else {
            return <p className="no-specifications">No specifications available</p>;
          }
        })()}
      </div>

      {/* Actions */}
      <div className="customized-display-actions">
        <button className="customized-display-back-button" onClick={handleBackClick}>
          Back
        </button>
        <button className="customized-display-add-button" onClick={handleAddClick}>
          Add
        </button>
      </div>
    </div>
  );
};

export default CustomizedDisplay;
