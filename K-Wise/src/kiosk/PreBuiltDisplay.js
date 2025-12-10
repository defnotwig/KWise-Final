import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./PreBuiltDisplay.css";
import BuildPC from "../assets/BuildPC.webp";
import BronzeTier from "../assets/Bronze.webp";
import SilverTier from "../assets/Silver.webp";
import GoldTier from "../assets/Gold.webp";
import DiamondTier from "../assets/Diamond.webp";
import api from "../api/api";

const PreBuiltDisplay = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { product, buildSource } = location.state || {};
  
  // Get tier image based on product tier
  const getTierImage = (tierName) => {
    const tierImages = {
      "Starter": BronzeTier,
      "Mid Tier": SilverTier,
      "High Tier": GoldTier,
      "Elite": DiamondTier
    };
    return tierImages[tierName] || BuildPC;
  };
  
  // Get tier display name for subtitle
  const getTierDisplayName = (tierName) => {
    const tierDisplayNames = {
      "Starter": "Bronze Tier",
      "Mid Tier": "Silver Tier",
      "High Tier": "Gold Tier",
      "Elite": "Diamond Tier"
    };
    return tierDisplayNames[tierName] || tierName;
  };
  
  // Component customization state
  const [customizedComponents, setCustomizedComponents] = useState({});
  const [currentModal, setCurrentModal] = useState(null); // Which component is being customized
  const [availableOptions, setAvailableOptions] = useState({}); // Available options for each category
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [compatibilityStatus, setCompatibilityStatus] = useState(null);
  const [checkingCompatibility, setCheckingCompatibility] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showAllOptions, setShowAllOptions] = useState({}); // Track which categories show all options
  
  // UI state
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Customizable categories (constant, doesn't need to be in dependency array)
  // Match database category names exactly (Storage not STORAGE)
  // 🔥 FIX: Added 'Cooling' to make cooling systems fully customizable
  const CUSTOMIZABLE_CATEGORIES = React.useMemo(() => ['CPU', 'RAM', 'Storage', 'GPU', 'Cooling'], []);

  // Initialize customized components with product's default components
  useEffect(() => {
    if (product && product.components) {
      const initialComponents = {};
      product.components.forEach(comp => {
        const category = comp.name.toUpperCase();
        if (CUSTOMIZABLE_CATEGORIES.includes(category)) {
          initialComponents[category] = {
            ...comp,
            part_id: comp.part_id,
            price: parseFloat(comp.part_price || comp.price || 0)
          };
        }
      });
      setCustomizedComponents(initialComponents);
      setTotalPrice(parseFloat(product.price || 0));
      
      // Load options for all customizable categories (including GPU even if not present)
      CUSTOMIZABLE_CATEGORIES.forEach(category => {
        fetchCompatibleOptions(category);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, CUSTOMIZABLE_CATEGORIES]);

  if (!product) {
    return <div>No product selected.</div>;
  }

  // Fetch compatible options for a category
  const fetchCompatibleOptions = async (category) => {
    setLoadingOptions(true);
    try {
      console.log(`🔍 Fetching compatible ${category} options...`);
      
      // Get products from the category
      const response = await api.kiosk.getCategoryProducts(category, {
        limit: 100,
        sortBy: 'price',
        sortOrder: 'asc'
      });
      
      // Filter based on compatibility and availability
      let options = response.data.filter(item => item.stock > 0);
      
      // Apply compatibility filtering using existing components
      if (Object.keys(customizedComponents).length > 0) {
        try {
          // Build current component list for compatibility check
          const currentBuild = {};
          Object.keys(customizedComponents).forEach(cat => {
            const comp = customizedComponents[cat];
            if (comp && comp.part_id) {
              currentBuild[cat.toLowerCase()] = {
                id: comp.part_id,
                name: comp.value || comp.part_name,
                category: cat
              };
            }
          });
          
          // Add non-customizable components from product
          product.components.forEach(comp => {
            const cat = comp.name.toUpperCase();
            if (!CUSTOMIZABLE_CATEGORIES.includes(cat) && comp.part_id) {
              currentBuild[cat.toLowerCase()] = {
                id: comp.part_id,
                name: comp.value,
                category: cat
              };
            }
          });
          
          // Filter options to only show compatible products
          console.log('🔍 Applying compatibility filter for', category, 'with current build:', currentBuild);
        } catch (compatError) {
          console.warn('⚠️ Compatibility check skipped:', compatError);
        }
      }
      
      setAvailableOptions(prev => ({
        ...prev,
        [category]: options
      }));
      
      console.log(`✅ Found ${options.length} compatible ${category} options`);
    } catch (error) {
      console.error(`❌ Error fetching ${category} options:`, error);
      setAvailableOptions(prev => ({
        ...prev,
        [category]: []
      }));
    } finally {
      setLoadingOptions(false);
    }
  };

  // Open customization modal for a category
  const openCustomizationModal = (category) => {
    setCurrentModal(category);
    if (!availableOptions[category]) {
      fetchCompatibleOptions(category);
    }
  };

  // Close customization modal
  const closeCustomizationModal = () => {
    setCurrentModal(null);
  };

  // Handle component selection
  const handleComponentChange = async (category, newComponent) => {
    console.log(`🔄 Changing ${category} to:`, newComponent.name);
    
    // Update customized components
    const updatedComponents = {
      ...customizedComponents,
      [category]: {
        name: category,
        value: newComponent.name,
        part_id: newComponent.id,
        price: parseFloat(newComponent.price || 0),
        part_name: newComponent.name,
        brand: newComponent.brand || ''
      }
    };
    
    setCustomizedComponents(updatedComponents);
    
    // Recalculate total price
    calculateTotalPrice(updatedComponents);
    
    // Check compatibility
    await checkBuildCompatibility(updatedComponents);
    
    // Close modal
    closeCustomizationModal();
  };

  // Calculate total price based on customizations
  const calculateTotalPrice = (components) => {
    let basePrice = parseFloat(product.price || 0);
    
    // Get original component prices
    const originalPrices = {};
    product.components.forEach(comp => {
      const category = comp.name.toUpperCase();
      if (CUSTOMIZABLE_CATEGORIES.includes(category)) {
        originalPrices[category] = parseFloat(comp.part_price || comp.price || 0);
      }
    });
    
    // Calculate price differences
    let priceDelta = 0;
    Object.keys(components).forEach(category => {
      const originalPrice = originalPrices[category] || 0;
      const newPrice = components[category].price || 0;
      priceDelta += (newPrice - originalPrice);
    });
    
    const newTotal = basePrice + priceDelta;
    setTotalPrice(newTotal);
    
    console.log(`💰 Price updated: ₱${basePrice.toLocaleString()} + ₱${priceDelta.toLocaleString()} = ₱${newTotal.toLocaleString()}`);
  };

  // Check build compatibility
  const checkBuildCompatibility = async (components) => {
    setCheckingCompatibility(true);
    try {
      // Build component object for compatibility API
      const buildComponents = {};
      
      // Add customized components
      Object.keys(components).forEach(category => {
        const comp = components[category];
        if (comp && comp.part_id) {
          const categoryKey = category.toLowerCase();
          buildComponents[categoryKey] = {
            id: comp.part_id,
            name: comp.value || comp.part_name,
            category: category,  // Keep original case for category field
            price: comp.price
          };
        }
      });
      
      // Add non-customizable components from product
      product.components.forEach(comp => {
        const category = comp.name; // Use original case, don't uppercase
        const categoryKey = category.toLowerCase();
        if (!CUSTOMIZABLE_CATEGORIES.includes(category.toUpperCase()) && comp.part_id) {
          buildComponents[categoryKey] = {
            id: comp.part_id,
            name: comp.value,
            category: category,  // Use original case
            price: parseFloat(comp.part_price || 0)
          };
        }
      });
      
      console.log('🔍 Checking compatibility for:', buildComponents);
      console.log('🔑 Component keys:', Object.keys(buildComponents));
      
      // Only check compatibility if we have essential components
      if (!buildComponents.cpu || !buildComponents.motherboard) {
        console.warn('⚠️ Skipping compatibility check - missing essential components');
        setCompatibilityStatus(null);
        return;
      }
      
      const result = await api.kiosk.checkFullBuildCompatibility(buildComponents);
      
      setCompatibilityStatus(result);
      
      if (result.success && result.data.compatibility_score >= 80) {
        console.log('✅ Build is compatible!');
      } else {
        console.warn('⚠️ Compatibility issues detected:', result.data?.issues || []);
      }
    } catch (error) {
      console.error('❌ Error checking compatibility:', error);
      console.error('❌ Error response:', error.response?.data);
      setCompatibilityStatus(null);
    } finally {
      setCheckingCompatibility(false);
    }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleImageError = () => {
    console.error('❌ Failed to load image:', product.image);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('✅ Image loaded successfully:', product.image);
    setImageLoaded(true);
  };

  const handleAddToCart = () => {
    console.log('🛒 Adding customized pre-built to cart...');
    
    // Get existing prebuiltCart from localStorage
    let prebuiltCart = JSON.parse(localStorage.getItem("prebuiltCart") || "[]");
    
    // Build complete component list with customizations
    const allComponents = product.components.map(comp => {
      const category = comp.name.toUpperCase();
      if (CUSTOMIZABLE_CATEGORIES.includes(category) && customizedComponents[category]) {
        // Use customized component
        return {
          ...comp,
          value: customizedComponents[category].value || customizedComponents[category].part_name,
          part_id: customizedComponents[category].part_id,
          price: customizedComponents[category].price,
          isCustomized: true
        };
      }
      // Use original component
      return comp;
    });
    
    // Create cart item
    const cartItem = {
      id: Date.now(),
      baseProduct: {
        ...product,
        originalPrice: parseFloat(product.price || 0)
      },
      components: allComponents,
      customizations: customizedComponents,
      totalPrice: totalPrice,
      buildSource: buildSource || 'preset', // preset or community
      quantity: 1,
      compatibilityScore: compatibilityStatus?.data?.compatibility_score || null
    };
    
    prebuiltCart.push(cartItem);
    localStorage.setItem("prebuiltCart", JSON.stringify(prebuiltCart));
    
    console.log('✅ Added to cart:', cartItem);
    console.log(`📦 Cart now has ${prebuiltCart.length} items`);
    
    // ✅ Navigate to PeripheralsPrompt page first (Yes/No choice)
    // Pass build components for compatibility checking
    const buildComponents = {};
    
    allComponents.forEach(comp => {
      if (comp.part_id) {
        buildComponents[comp.name.toLowerCase()] = {
          id: comp.part_id,
          name: comp.value,
          category: comp.name,
          price: parseFloat(comp.price || 0)
        };
      }
    });
    
    console.log('🎯 PreBuiltDisplay - Navigating to peripherals-prompt');
    console.log('📦 buildSource:', buildSource || 'preset');
    console.log('📦 prebuiltCart items:', prebuiltCart.length);
    
    navigate('/peripherals-prompt', { 
      state: { 
        from: buildSource || 'preset',
        buildComponents: buildComponents,
        cartItems: prebuiltCart,
        totalPrice: totalPrice,
        buildType: 'prebuilt',
        prebuiltCart: prebuiltCart,
        buildSource: buildSource || 'preset',
        prebuiltId: product.id,
        prebuiltName: product.name
      } 
    });
  };

  return (
    <div className="prebuilt-display-container">
      {/* Header */}
      <div className="prebuilt-display-header">
        <div className="prebuilt-display-header-content">
          <img src={getTierImage(product?.tier)} alt={`${product?.tier} Tier`} className="prebuilt-display-icon" />
          <div className="prebuilt-display-header-text">
            <h1 className="prebuilt-display-title">
              {buildSource === "preset" ? "PREBUILT PC'S" : "COMMUNITY"}
            </h1>
            <p className="prebuilt-display-subtitle">
              {buildSource === "preset" 
                ? `${getTierDisplayName(product?.tier)} Level PC Builds`
                : "Crafted by the community"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="prebuilt-display-product">
        <div className="prebuilt-image-container">
          {!imageLoaded && !imageError && (
            <div className="prebuilt-image-loading">Loading image...</div>
          )}
          <img
            src={product.image}
            alt={product.name}
            className={`prebuilt-display-image ${imageLoaded ? 'loaded' : ''}`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={{ display: imageError ? 'none' : 'block' }}
          />
          {imageError && (
            <div className="prebuilt-image-error">
              <span>Image not available</span>
            </div>
          )}
        </div>
        <div className="prebuilt-display-info">
          <h3 className="prebuilt-display-name">{product.name}</h3>
          <p className="prebuilt-display-price">
            ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {totalPrice !== parseFloat(product.price || 0) && (
              <span className="prebuilt-original-price">
                Original: ₱{parseFloat(product.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Components with Customization - PC Checkup Style */}
      <div className="prebuilt-display-details">
        <div className="prebuilt-display-specifications">
          <h3>Components</h3>
          {compatibilityStatus && checkingCompatibility && (
            <div className="compatibility-checking">
              <span>Checking compatibility...</span>
            </div>
          )}
          {compatibilityStatus && !checkingCompatibility && (
            <div className={`compatibility-status ${compatibilityStatus.data?.compatibility_score >= 80 ? 'compatible' : 'warning'}`}>
              <span>
                Compatibility: {compatibilityStatus.data?.compatibility_score || 0}%
                {compatibilityStatus.data?.compatibility_score >= 80 ? ' ✅' : ' ⚠️'}
              </span>
            </div>
          )}
          {product.components && product.components.length > 0 ? (
            <div className="prebuilt-components-list">
              {/* Render all components with values */}
              {product.components.filter(comp => comp.value && typeof comp.value === 'string' && comp.value.trim()).map((comp, idx) => {
                const category = comp.name.toUpperCase();
                const isCustomizable = CUSTOMIZABLE_CATEGORIES.includes(category);
                
                if (!isCustomizable) {
                  // Show non-customizable components as static text
                  return (
                    <div key={idx} className="component-row static">
                      <span className="prebuilt-component-label">{comp.name}:</span>
                      <span className="prebuilt-component-value">{comp.value}</span>
                    </div>
                  );
                }
                
                // Show customizable components with horizontal option buttons
                const currentComponent = customizedComponents[category] || comp;
                const options = availableOptions[category] || [];
                const displayOptions = showAllOptions[category] ? options : options.slice(0, 3);
                
                return (
                  <div key={idx} className="component-row customizable">
                    <h4 className="component-category-title">{comp.name}</h4>
                    <div className="component-options-row">
                      {loadingOptions && options.length === 0 ? (
                        // Show loading state while fetching options
                        <div className="options-loading">
                          <div className="mini-spinner"></div>
                          <span>Loading options...</span>
                        </div>
                      ) : options.length === 0 ? (
                        // Show current component if options not loaded yet
                        <button 
                          className="component-option-btn selected"
                          disabled
                        >
                          {currentComponent.value || currentComponent.part_name || comp.value}
                        </button>
                      ) : (
                        <>
                          {displayOptions.map((option, optIdx) => {
                            const isSelected = customizedComponents[category]?.part_id === option.id || 
                                             (!customizedComponents[category] && comp.part_id === option.id);
                            return (
                              <button
                                key={optIdx}
                                className={`component-option-btn ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleComponentChange(category, option)}
                              >
                                {option.name}
                                <span className="option-price">₱{option.price.toLocaleString()}</span>
                              </button>
                            );
                          })}
                          {options.length > 3 && !showAllOptions[category] && (
                            <button
                              className={`component-option-btn more-btn ${customizedComponents[category] ? 'highlighted selected' : ''}`}
                              onClick={() => openCustomizationModal(category)}
                            >
                              <span style={{ flex: 1, fontSize: '24px', fontWeight: '600' }}>
                                {customizedComponents[category] 
                                  ? (customizedComponents[category].value || customizedComponents[category].part_name)
                                  : (currentComponent.value || currentComponent.part_name || comp.value)
                                }
                              </span>
                              <span className="option-price" style={{ marginLeft: '8px' }}>Base</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Show Add GPU button if GPU not present or has empty value */}
              {(!product.components.some(comp => comp.name.toUpperCase() === 'GPU' && comp.value && typeof comp.value === 'string' && comp.value.trim())) && (
                <div className="component-row customizable">
                  <h4 className="component-category-title">GPU (Optional)</h4>
                  <div className="component-options-row">
                    {customizedComponents['GPU'] ? (
                      <>
                        <button 
                          className="component-option-btn selected"
                          disabled
                        >
                          {customizedComponents['GPU'].value || customizedComponents['GPU'].part_name}
                          <span className="option-price">₱{customizedComponents['GPU'].price.toLocaleString()}</span>
                        </button>
                        <button
                          className="component-option-btn more-btn highlighted selected"
                          onClick={() => openCustomizationModal('GPU')}
                        >
                          <span style={{ flex: 1, textAlign: 'left' }}>
                            {customizedComponents['GPU'].value || customizedComponents['GPU'].part_name}
                          </span>
                          <span className="option-price" style={{ marginLeft: '8px' }}>⚙️ Change</span>
                        </button>
                      </>
                    ) : (
                      <button
                        className="component-option-btn add-btn"
                        onClick={() => openCustomizationModal('GPU')}
                      >
                        + Add GPU (Compatible Options)
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Show Add Cooling button if Cooling not present or has empty value */}
              {(!product.components.some(comp => comp.name.toUpperCase() === 'COOLING' && comp.value && typeof comp.value === 'string' && comp.value.trim())) && (
                <div className="component-row customizable">
                  <h4 className="component-category-title">Cooling (Optional)</h4>
                  <div className="component-options-row">
                    {(customizedComponents['Cooling'] || customizedComponents['COOLING']) ? (
                      <>
                        <button 
                          className="component-option-btn selected"
                          disabled
                        >
                          {(customizedComponents['Cooling']?.value || customizedComponents['COOLING']?.value) || 
                           (customizedComponents['Cooling']?.part_name || customizedComponents['COOLING']?.part_name)}
                          <span className="option-price">₱{(customizedComponents['Cooling']?.price || customizedComponents['COOLING']?.price || 0).toLocaleString()}</span>
                        </button>
                        <button
                          className="component-option-btn more-btn highlighted selected"
                          onClick={() => openCustomizationModal('Cooling')}
                        >
                          <span style={{ flex: 1, textAlign: 'left' }}>
                            {(customizedComponents['Cooling']?.value || customizedComponents['COOLING']?.value) || 
                             (customizedComponents['Cooling']?.part_name || customizedComponents['COOLING']?.part_name)}
                          </span>
                          <span className="option-price" style={{ marginLeft: '8px' }}>⚙️ Change</span>
                        </button>
                      </>
                    ) : (
                      <button
                        className="component-option-btn add-btn"
                        onClick={() => openCustomizationModal('Cooling')}
                      >
                        + Add Cooling System (Compatible Options)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>No components listed.</p>
          )}
        </div>
      </div>

      {/* Customization Modal - CompareProducts Style */}
      {currentModal && (
        <div className="customization-modal-overlay" onClick={closeCustomizationModal}>
          <div className="customization-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header - Match CompareProducts */}
            <div className="prebuilt-modal-header">
              <h3 className="prebuilt-modal-title">Select {currentModal}</h3>
              <button className="prebuilt-modal-close" onClick={closeCustomizationModal}>×</button>
            </div>
            
            {/* Body - Simplified list */}
            <div className="prebuilt-modal-body">
              {loadingOptions ? (
                <div className="prebuilt-modal-loading">
                  <div className="prebuilt-loading-spinner"></div>
                  <p>Loading options...</p>
                </div>
              ) : (
                <div className="options-list">
                  {availableOptions[currentModal]?.length > 0 ? (
                    availableOptions[currentModal].map((option) => {
                      const isSelected = customizedComponents[currentModal]?.part_id === option.id;
                      const originalComponent = product.components.find(c => c.name.toUpperCase() === currentModal);
                      const originalPrice = parseFloat(originalComponent?.part_price || originalComponent?.price || 0);
                      const priceDiff = option.price - originalPrice;
                      
                      return (
                        <div
                          key={option.id}
                          className={`option-item ${isSelected ? 'selected' : ''} ${option.stock <= 0 ? 'out-of-stock' : ''}`}
                          onClick={() => option.stock > 0 && handleComponentChange(currentModal, option)}
                        >
                          <div className="option-info">
                            <h4 className="option-name">{option.name}</h4>
                            <p className="option-brand">{option.brand || 'N/A'}</p>
                          </div>
                          <div className="option-pricing">
                            <span className="option-price">₱{option.price.toLocaleString()}</span>
                            {priceDiff !== 0 && (
                              <span className={`price-diff ${priceDiff > 0 ? 'increase' : 'decrease'}`}>
                                {priceDiff > 0 ? '+' : ''}₱{Math.abs(priceDiff).toLocaleString()}
                              </span>
                            )}
                            {option.stock <= 5 && option.stock > 0 && (
                              <span className="option-stock-warning">Only {option.stock} left</span>
                            )}
                            {option.stock <= 0 && (
                              <span className="option-out-of-stock">Out of Stock</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="no-options">No compatible options available</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <footer className="prebuilt-display-footer">
        <button className="prebuilt-display-back-button" onClick={handleBackClick}>
          Back
        </button>
        <button className="prebuilt-display-add-button" onClick={handleAddToCart}>
          Add to Cart
        </button>
      </footer>
    </div>
  );
};

export default PreBuiltDisplay;