import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../styles/CustomizeAI.css';
import api from '../../api/api';
import Chest from '../../assets/Chest.webp';

// ✅ COMPATIBILITY VALIDATION
import CompatibilityValidationModal from '../CompatibilityValidationModal';

// Import default category images for fallbacks
import CPU1 from '../../assets/CPU1.webp';
import CPUCooler from '../../assets/CPUCooler.webp';
import Motherboard1 from '../../assets/Motherboard1.webp';
import Ram from '../../assets/Ram.webp';
import Storage1 from '../../assets/Storage1.webp';
import GPU1 from '../../assets/GPU1.webp';
import SystemUnit1 from '../../assets/SystemUnit1.webp';
import PSU1 from '../../assets/PSU1.webp';
import customizedai from '../../assets/CustomizedAI/customizedai.svg';

/**
 * EditBuild - Page for editing AI-generated build
 * Layout matches PCCustomized.jsx - All components shown at once
 * Users can click any component to replace it (no step-by-step process)
 * Footer shows cart total and action buttons
 */
const EditBuild = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [buildComponents, setBuildComponents] = useState({});
  const [assessment, setAssessment] = useState({});
  const [selectedItem, setSelectedItem] = useState(null); // Track which component is being edited
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showStartOverModal, setShowStartOverModal] = useState(false);
  const [showCompatibilityValidationModal, setShowCompatibilityValidationModal] = useState(false); // ✅ NEW: Compatibility validation modal

  // Fallback category images
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
  const getFallbackImage = (categoryKey) => {
    return defaultCategoryImages[categoryKey?.toLowerCase()] || SystemUnit1;
  };

  /**
   * Get properly formatted image URL for a component
   * Handles multiple image field variations and constructs full URL
   */
  const getComponentImageUrl = (component, categoryKey) => {
    if (!component) {
      console.warn(`⚠️ No component provided for category: ${categoryKey}`);
      return getFallbackImage(categoryKey);
    }

    // Try all possible image field variations (including image_path)
    const imageField = component.image_url || component.imageUrl || component.image || component.image_path;
    
    if (imageField) {
      // Use api.utils.getFullImageUrl to construct full URL
      const fullUrl = api.utils.getFullImageUrl(imageField);
      console.log(`✅ Image URL found for ${component.name || 'component'} (${categoryKey}):`, fullUrl);
      return fullUrl;
    }

    // Fallback to category default image
    console.warn(`⚠️ No image field found for ${component.name || 'component'} (${categoryKey}) - using fallback`);
    console.log('📋 Component fields:', Object.keys(component));
    return getFallbackImage(categoryKey);
  };

  useEffect(() => {
    // Load from location state or localStorage
    const stateComponents = location.state?.buildComponents;
    const stateAssessment = location.state?.assessment;
    
    if (stateComponents) {
      console.log('✅ Loaded build components from navigation state');
      console.log('📋 Component keys:', Object.keys(stateComponents));
      setBuildComponents(stateComponents);
      setAssessment(stateAssessment || {});
    } else {
      // Try loading from localStorage
      const stored = localStorage.getItem('aiCustomizedBuild');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          console.log('✅ Loaded build components from localStorage');
          console.log('📋 Component keys:', Object.keys(parsed));
          setBuildComponents(parsed);
        } catch (error) {
          console.error('Failed to parse stored build', error);
          navigate('/customize-ai');
        }
      } else {
        console.warn('⚠️ No build data found - redirecting');
        navigate('/customize-ai');
      }
    }

    // Handle returning from product selection with updated component
    const updatedComponent = location.state?.updatedComponent;
    const categoryKey = location.state?.categoryKey;
    
    if (updatedComponent && categoryKey) {
      console.log('🔄 Updating component:', categoryKey, updatedComponent);
      setBuildComponents(prev => ({
        ...prev,
        [categoryKey]: updatedComponent
      }));
      
      // Update localStorage
      const newBuild = { ...buildComponents, [categoryKey]: updatedComponent };
      localStorage.setItem('aiCustomizedBuild', JSON.stringify(newBuild));
    }
  }, [location, navigate, buildComponents]); // Include buildComponents to satisfy ESLint

  const componentOrder = ['cpu', 'cooling', 'motherboard', 'ram', 'storage', 'gpu', 'case', 'psu'];
  const componentLabels = {
    cpu: 'Processor',
    cooling: 'Cooling System',
    motherboard: 'Motherboard',
    ram: 'RAM',
    storage: 'Storage',
    gpu: 'Graphics Processing Unit',
    case: 'Chassis',
    psu: 'Power Supply'
  };

  const steps = componentOrder
    .map((key, index) => ({
      stepNumber: index + 1,
      category: componentLabels[key],
      categoryKey: key,
      component: buildComponents[key]
    }))
    .filter(step => step.component);

  // Calculate total
  const totalPrice = steps.reduce((sum, step) => {
    return sum + (parseFloat(step.component?.price) || 0);
  }, 0);

  const handleReplace = async (categoryKey, categoryIndex) => {
    try {
      setSelectedItem(categoryIndex); // Highlight this component as being edited

      // Fetch products for this category using kiosk API
      const response = await api.kiosk.getCategoryProducts(categoryKey.toUpperCase(), {
        limit: 100,
        inStock: true
      });

      // Extract products array from response
      const products = response?.data || response || [];
      
      console.log('🔍 Fetched products for', categoryKey, ':', products.length);

      if (products && products.length > 0) {
        // Navigate to product selection page with category products
        navigate('/customized-products', {
          state: {
            categoryName: componentLabels[categoryKey],
            categoryKey: categoryKey,
            products: products,
            brands: [], // Will be extracted in CustomizedProducts
            currentBuild: buildComponents,
            assessment: assessment,
            fromAI: true,
            fromEdit: true,
            returnTo: '/customize-ai/edit-build'
          }
        });
      } else {
        alert('No products available for this category');
      }
    } catch (error) {
      console.error('Failed to fetch category products:', error);
      alert('Failed to load products. Please try again.');
    }
  };

  const handleOrderSummary = () => {
    console.log('🎯 EditBuild - Order Summary clicked');
    console.log('📦 buildComponents:', buildComponents);
    console.log('🔑 buildComponents keys:', Object.keys(buildComponents));
    
    // ✅ CRITICAL FIX: Validate all required components BEFORE opening modal
    const componentCount = Object.keys(buildComponents).filter(key => buildComponents[key]).length;
    if (componentCount === 0) {
      console.log('❌ No components in build');
      return; // Button should be disabled, but safety check
    }

    // ✅ Open compatibility validation modal (same as PCCustomized)
    console.log('✅ Opening compatibility validation modal with', componentCount, 'components');
    setShowCompatibilityValidationModal(true);
  };

  /**
   * Navigate to peripherals prompt after validation passes
   * Called by CompatibilityValidationModal when user proceeds
   * @param {Object} freshComponents - Refetched components with latest data from database
   */
  const handleProceedToPeripherals = (freshComponents) => {
    console.log('✅ Validation passed - Proceeding to peripherals prompt');
    console.log('🔄 Fresh components received from validation:', freshComponents ? Object.keys(freshComponents) : 'none');
    
    // Use fresh components if provided, otherwise fallback to existing buildComponents
    const componentsToUse = freshComponents || buildComponents;
    
    // Convert fresh components from API format back to buildComponents format
    // Fresh components have category keys like 'cpu', 'motherboard', etc.
    // BuildComponents expects same format so we can use directly
    const updatedBuildComponents = freshComponents ? {
      ...buildComponents,
      ...freshComponents
    } : buildComponents;
    
    console.log('💾 Saving updated components to localStorage:', Object.keys(updatedBuildComponents));
    
    // Save updated components to localStorage
    localStorage.setItem('aiCustomizedBuild', JSON.stringify(updatedBuildComponents));
    
    // Navigate to peripherals prompt with fresh data
    navigate('/peripherals-prompt', {
      state: {
        from: 'customize-ai', // ✅ Explicit source for routing
        fromAI: true,
        fromEdit: true,
        buildComponents: updatedBuildComponents, // ✅ Pass fresh data
        assessment: assessment
      }
    });
  };

  const handleCancelOrder = () => {
    setShowCancelModal(true);
  };

  const confirmCancelOrder = () => {
    setShowCancelModal(false);
    localStorage.removeItem('aiCustomizedBuild');
    navigate('/pcbuild-category');
  };

  const handleStartOver = () => {
    setShowStartOverModal(true);
  };

  const confirmStartOver = () => {
    setShowStartOverModal(false);
    localStorage.removeItem('aiCustomizedBuild');
    navigate('/customize-ai');
  };

  return (
    <div className="edit-build-customizer-container">
      {/* Header - Matching PCCustomized */}
      <div className="edit-build-customizer-header">
        <div className="edit-build-header-content">
          <img src={customizedai} alt="CustomizedAI Logo" className="edit-build-customizer-logo" />
          <div className="edit-build-title-container">
            <h1 className="edit-build-customizer-title">CUSTOMIZE</h1>
            <p className="edit-build-customizer-subtitle">Generated with AI</p>
          </div>
        </div>
      </div>

      {/* Steps - All Components Shown at Once (Like PCCustomized) */}
      <div className="edit-build-customizer-steps">
        {steps.map((step, index) => {
          // Get properly formatted image URL
          const imageUrl = getComponentImageUrl(step.component, step.categoryKey);
          
          // Check if this component is selected (being edited)
          const isSelected = selectedItem === index;
          
          // Determine step class based on selection state
          const hasComponent = step.component !== null;
          let stepClass = "edit-build-customizer-step ";
          
          if (isSelected) {
            stepClass += "edit-build-selected-step";
          } else if (hasComponent) {
            stepClass += "edit-build-has-component-step";
          } else {
            stepClass += "edit-build-unlocked-step";
          }

          return (
            <div key={step.stepNumber} className="edit-build-step-container">
              <p className="edit-build-step-subtitle">
                Step {step.stepNumber}: Choose a {step.category.toLowerCase()}
              </p>
              
              <div 
                className={stepClass}
                onClick={() => handleReplace(step.categoryKey, index)}
              >
                <div className="edit-build-step-icon">
                  <img 
                    src={imageUrl} 
                    alt={step.component.name || 'Component'}
                    onError={(e) => {
                      console.warn(`⚠️ Image failed to load for ${step.component.name}, using fallback`);
                      e.target.src = getFallbackImage(step.categoryKey);
                    }}
                  />
                </div>
                
                <div className="edit-build-step-details">
                  <p className="edit-build-step-title">{step.component.name}</p>
                  <p className="edit-build-step-price">
                    ₱{parseFloat(step.component.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                
                <div className="edit-build-step-button-container">
                  <div 
                    className="edit-build-step-replace-icon edit-build-minus-active"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReplace(step.categoryKey, index);
                    }}
                  >
                    <div className="edit-build-step-minus-icon">-</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Section - Matching PCCustomized */}
      <div className="edit-build-customized-bottom-section">
        <div className="edit-build-customized-process-container">
          <div className="edit-build-customized-order-info">
            <div className="edit-build-customized-cart-icon">
              <img src={Chest} alt="Cart" />
              {steps.length > 0 && (
                <div className="edit-build-customized-notification">
                  {steps.length}
                </div>
              )}
            </div>
            <div className="edit-build-customized-total-label">
              <div className="edit-build-customized-total">TOTAL</div>
              <div className="edit-build-customized-price">
                ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="edit-build-customized-right-buttons">
            <button
              className="edit-build-customized-order-summary"
              onClick={handleOrderSummary}
            >
              Order Summary
            </button>
            <div className="edit-build-customized-action-buttons">
              <button
                className="edit-build-customized-cancel-order"
                onClick={handleCancelOrder}
              >
                Cancel Order
              </button>
              <button
                className="edit-build-customized-start-over"
                onClick={handleStartOver}
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="pc-customized-modal-overlay">
          <div className="pc-customized-modal-background"></div>
          <div className="pc-customized-modal">
            <div className="pc-customized-modal-icon" />
            <h2 className="pc-customized-modal-title">
              ARE YOU SURE YOU WANT TO<br />
              <span>CANCEL THIS BUILD?</span>
            </h2>
            <div className="pc-customized-modal-buttons">
              <button
                className="pc-customized-modal-btn"
                onClick={() => setShowCancelModal(false)}
              >
                NO
              </button>
              <button className="pc-customized-modal-btn yes" onClick={confirmCancelOrder}>
                YES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Over Modal */}
      {showStartOverModal && (
        <div className="pc-customized-modal-overlay">
          <div className="pc-customized-modal-background"></div>
          <div className="pc-customized-modal">
            <div className="pc-customized-modal-icon" />
            <h2 className="pc-customized-modal-title">
              ARE YOU SURE YOU WANT TO<br />
              <span>START OVER?</span>
            </h2>
            <div className="pc-customized-modal-buttons">
              <button
                className="pc-customized-modal-btn"
                onClick={() => setShowStartOverModal(false)}
              >
                NO
              </button>
              <button className="pc-customized-modal-btn yes" onClick={confirmStartOver}>
                YES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ COMPATIBILITY VALIDATION MODAL - Shows issues before proceeding to order summary */}
      {showCompatibilityValidationModal && (
        <CompatibilityValidationModal
          isOpen={showCompatibilityValidationModal}
          onClose={() => setShowCompatibilityValidationModal(false)}
          onProceed={handleProceedToPeripherals}
          cartItems={Object.entries(buildComponents)
            .filter(([key, component]) => component && component.id)
            .map(([key, component]) => ({
              id: component.id,
              product_id: component.id,
              name: component.name,
              price: parseFloat(component.price),
              image: component.image_url || component.image,
              image_url: component.image_url || component.image,
              category: component.category || key.toUpperCase(),
              brand: component.brand || '',
              stock: component.stock || 0,
              quantity: 1,
              specifications: component.specifications || {},
              description: component.description || ''
            }))}
          pageName="Customize-AI"
        />
      )}
    </div>
  );
};

export default EditBuild;