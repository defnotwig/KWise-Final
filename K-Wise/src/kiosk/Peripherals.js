import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/networkConfig';
import api from '../api/api';
import '../styles/CustomizeAI.css';
import './Peripherals.css';
import peripheralsIcon from '../assets/PeripheralsPrompt/peripherals.svg';
import headphone from '../assets/PCParts/headphone.svg';
import monitor from '../assets/PCParts/monitor.svg';
import keyboard from '../assets/PCParts/keyboard.svg';
import mouse from '../assets/PCParts/mouse.svg';
import speaker from '../assets/PCParts/speaker.svg';
import webcam from '../assets/PCParts/webcam.svg';

/**
 * Peripherals - Page for selecting peripherals after PC build
 * Displays peripheral categories directly (Yes/No handled by PeripheralsPrompt)
 */
const Peripherals = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [peripheralCategories, setPeripheralCategories] = useState([]);
  const [selectedPeripherals, setSelectedPeripherals] = useState([]);
  const [buildComponents, setBuildComponents] = useState({});
  const [assessment, setAssessment] = useState({});

  useEffect(() => {
    // Load build components from location state or localStorage
    const stateComponents = location.state?.buildComponents;
    const stateAssessment = location.state?.assessment;
    const statePeripherals = location.state?.selectedPeripherals;
    const fromSource = location.state?.from || 'customize-ai';
    const cartItems = location.state?.cartItems || [];
    const totalPrice = location.state?.totalPrice || 0;
    const buildType = location.state?.buildType || 'custom';
    const prebuiltCart = location.state?.prebuiltCart || [];
    const buildSource = location.state?.buildSource || 'preset';
    
    if (stateComponents) {
      setBuildComponents(stateComponents);
      setAssessment(stateAssessment || {});
    } else {
      const stored = localStorage.getItem('aiCustomizedBuild');
      if (stored) {
        try {
          setBuildComponents(JSON.parse(stored));
        } catch (error) {
          console.error('Failed to parse stored build', error);
        }
      }
    }

    // Store flow context in sessionStorage for use in proceedToOrderSummary
    sessionStorage.setItem('peripheralsFlowContext', JSON.stringify({
      from: fromSource,
      cartItems: cartItems,
      totalPrice: totalPrice,
      buildType: buildType,
      prebuiltCart: prebuiltCart,
      buildSource: buildSource
    }));

    // Update selected peripherals if passed from navigation
    if (statePeripherals) {
      setSelectedPeripherals(statePeripherals);
      console.log('✅ Loaded selected peripherals:', statePeripherals.length);
    }

    // Fetch peripheral categories immediately
    fetchPeripheralCategories();
  }, [location.state]);

  const fetchPeripheralCategories = async () => {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/stock/categories`);
      if (response.data.success) {
        // Filter only peripheral categories - use exact names from database
        const peripherals = response.data.data.filter(cat => 
          ['Monitor', 'Keyboard', 'Mouse', 'Headphones', 'Speakers', 'Webcam'].includes(cat.name)
        );
        setPeripheralCategories(peripherals);
        console.log('✅ Loaded peripheral categories:', peripherals.map(c => c.name));
      }
    } catch (error) {
      console.error('Failed to fetch peripheral categories', error);
    }
  };

  const handleCategorySelect = async (categoryName) => {
    try {
      // Fetch products for this peripheral category
      const response = await api.kiosk.getCategoryProducts(categoryName, {
        limit: 100,
        inStock: true
      });

      // Extract products array from response
      const products = response?.data || response || [];
      
      console.log('🔍 Fetched peripheral products for', categoryName, ':', products.length);

      if (products && products.length > 0) {
        // Navigate to customized-products for peripheral selection
        navigate('/customized-products', {
          state: {
            categoryName: categoryName,
            products: products,
            brands: [], // Will be extracted in CustomizedProducts
            fromAI: true,
            fromPeripherals: true,
            buildComponents: buildComponents,
            assessment: assessment,
            selectedPeripherals: selectedPeripherals,
            returnTo: '/peripherals'
          }
        });
      } else {
        alert('No products available for ' + categoryName);
      }
    } catch (error) {
      console.error('Failed to select category', error);
      alert('Failed to load peripheral products. Please try again.');
    }
  };

  const proceedToOrderSummary = () => {
    console.log('🎯 Peripherals - Order Summary clicked');
    
    // Get flow context
    const flowContext = JSON.parse(sessionStorage.getItem('peripheralsFlowContext') || '{}');
    const fromSource = flowContext.from || 'customize-ai';
    const storedCartItems = flowContext.cartItems || [];
    const prebuiltCart = flowContext.prebuiltCart || [];
    const buildSource = flowContext.buildSource || 'preset';
    
    console.log('📍 Flow context:', { fromSource, buildSource, prebuiltCartLength: prebuiltCart.length, selectedPeripheralsLength: selectedPeripherals.length });

    // Combine build components and selected peripherals
    const cartItems = [];

    // Add build components (from PC Customized or AI)
    if (storedCartItems && storedCartItems.length > 0) {
      cartItems.push(...storedCartItems);
    } else {
      // Fallback: convert buildComponents to cart format
      Object.entries(buildComponents)
        .filter(([key, component]) => component && component.id)
        .forEach(([key, component]) => {
          cartItems.push({
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
            description: component.description || '',
            fromAI: true
          });
        });
    }

    // Add selected peripherals to cart
    const peripheralsToAdd = selectedPeripherals.map(peripheral => ({
      id: peripheral.id,
      product_id: peripheral.id,
      name: peripheral.name,
      price: parseFloat(peripheral.price),
      image: peripheral.image_url || peripheral.image,
      image_url: peripheral.image_url || peripheral.image,
      category: peripheral.category,
      brand: peripheral.brand || '',
      stock: peripheral.stock || 0,
      quantity: 1,
      specifications: peripheral.specifications || {},
      description: peripheral.description || '',
      fromAI: true,
      isPeripheral: true
    }));

    console.log('💾 Peripherals to add:', peripheralsToAdd.length);

    // Save to cart/customOrders based on source
    if (fromSource === 'pc-customized') {
      // PC Customized flow → Save to cart (OrderSumCustom will create the order)
      const allItems = [...cartItems, ...peripheralsToAdd];
      localStorage.setItem("cart", JSON.stringify(allItems));
      
      console.log('✅ Navigating to ordersum-custom (PC Customized flow)');
      // Navigate to OrderSummaryCustom
      navigate('/ordersum-custom', {
        state: {
          from: 'pc-customized', // ✅ Preserve source for Order More routing
          peripherals: selectedPeripherals,
          buildType: 'custom'
        }
      });
    } else if (fromSource === 'prebuilt' || fromSource === 'preset' || fromSource === 'community') {
      // Pre-Built flow → add peripherals to prebuiltCart items
      // Get prebuiltCart from localStorage
      const currentPrebuiltCart = JSON.parse(localStorage.getItem('prebuiltCart') || '[]');
      
      // 🔥 FIX: Only add peripherals to the LAST item (most recent order)
      // This prevents overwriting peripherals from previous orders
      const updatedPrebuiltCart = currentPrebuiltCart.map((item, index) => {
        if (index === currentPrebuiltCart.length - 1) {
          // Last item - add the new peripherals
          return {
            ...item,
            peripherals: peripheralsToAdd
          };
        }
        // Previous items - keep their existing peripherals unchanged
        return item;
      });
      
      // Save updated cart back
      localStorage.setItem('prebuiltCart', JSON.stringify(updatedPrebuiltCart));
      
      console.log('✅ Peripherals - Order Summary clicked');
      console.log('   🎯 Correct routing: /order-sum-build (NOT /prebuilt-options)');
      console.log('   - fromSource:', fromSource);
      console.log('   - buildSource:', buildSource);
      console.log('   - updatedCartLength:', updatedPrebuiltCart.length);
      console.log('   - selectedPeripherals:', selectedPeripherals.length);
      console.log('   - prebuiltCart items:', JSON.stringify(updatedPrebuiltCart.map(i => i.baseProduct?.name || 'Unknown')));
      
      navigate('/order-sum-build', {
        state: {
          from: fromSource,
          peripherals: selectedPeripherals,
          buildType: 'prebuilt',
          prebuiltCart: updatedPrebuiltCart,
          buildSource: buildSource
        }
      });
    } else {
      // AI Customized flow → cart format
      const allItems = [...cartItems, ...peripheralsToAdd];
      localStorage.setItem('cart', JSON.stringify(allItems));
      
      console.log('✅ Navigating to ordersum-custom (AI flow)');
      navigate('/ordersum-custom', {
        state: {
          from: 'customize-ai', // 🔥 CRITICAL FIX: Use 'customize-ai' to match OrderSumCustom check
          buildComponents: buildComponents,
          assessment: assessment,
          peripherals: selectedPeripherals
        }
      });
    }
  };

  const handleBack = () => {
    // Go back to PeripheralsPrompt (clear peripherals selection)
    const flowContext = JSON.parse(sessionStorage.getItem('peripheralsFlowContext') || '{}');
    const fromSource = flowContext.from || 'customize-ai';
    const cartItems = flowContext.cartItems || [];
    const totalPrice = flowContext.totalPrice || 0;
    const buildType = flowContext.buildType || 'custom';
    const prebuiltCart = flowContext.prebuiltCart || [];
    const buildSource = flowContext.buildSource || 'preset';

    // Navigate back to PeripheralsPrompt WITHOUT selectedPeripherals (user is backing out)
    navigate('/peripherals-prompt', {
      state: {
        from: fromSource,
        buildComponents: buildComponents,
        assessment: assessment,
        cartItems: cartItems,
        totalPrice: totalPrice,
        buildType: buildType,
        prebuiltCart: prebuiltCart,
        buildSource: buildSource
        // NOTE: selectedPeripherals intentionally NOT passed - user is clearing their selection
      }
    });
  };

  // Map category names to icon components
  const getCategoryIcon = (categoryName) => {
    const iconMap = {
      'Monitor': monitor,
      'Keyboard': keyboard,
      'Mouse': mouse,
      'Headphones': headphone, // Database uses plural
      'Headphone': headphone,  // Fallback for singular
      'Speakers': speaker,     // Database uses plural
      'Speaker': speaker,      // Fallback for singular
      'Webcam': webcam
    };
    return iconMap[categoryName] || '📦';
  };

  // Peripherals Grid Screen
  return (
    <div className="peripherals-page">
      {/* Header */}
      <div className="peripherals-header">
        <div style={{
          width: '120px',
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(0, 224, 131, 0.3) 0%, transparent 70%)',
          filter: 'drop-shadow(0 0 40px rgba(0, 224, 131, 0.6))'
        }}>
          <img src={peripheralsIcon} alt="Peripherals" style={{ width: '173px', height: '176px' }} />
        </div>
        <h1 style={{
          fontSize: '70px',
          fontWeight: 700,
          color: '#ffffff',
          margin: 0,
          letterSpacing: '2px'
        }}>PERIPHERALS</h1>
      </div>

      {/* Categories Grid */}
      <div className="peripherals-content">
        <div className="peripherals-grid">
          {peripheralCategories.length > 0 ? (
            peripheralCategories.map((category) => (
              <div 
                key={category.name}
                className="peripheral-category-card"
                onClick={() => handleCategorySelect(category.name)}
              >
                <div className="peripheral-icon">
                  <img 
                    src={getCategoryIcon(category.name)} 
                    alt={category.name}
                    style={{ width: '123px', height: '126px', objectFit: 'contain' }}
                  />
                </div>
                <h3 className="peripheral-category-name">{category.name.toUpperCase()}</h3>
              </div>
            ))
          ) : (
            // Fallback to hardcoded categories - MUST match exact database category names
            ['Monitor', 'Headphones', 'Keyboard', 'Mouse', 'Speakers', 'Webcam'].map((cat) => (
              <div 
                key={cat}
                className="peripheral-category-card"
                onClick={() => handleCategorySelect(cat)}
              >
                <div className="peripheral-icon">
                  <img 
                    src={getCategoryIcon(cat)} 
                    alt={cat}
                    style={{ width: '123px', height: '126px', objectFit: 'contain' }}
                  />
                </div>
                <h3 className="peripheral-category-name">{cat.toUpperCase()}</h3>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="peripherals-footer">
        <button 
          className="peripherals-wizard-btn peripherals-btn-secondary" 
          onClick={handleBack}
          style={{
            width: '444px',
            height: '71px',
            border: '4px solid #034C3B',
            backgroundColor: 'transparent',
            color: '#fff',
            fontSize: '24px',
            fontWeight: 600
          }}
        >
          Back
        </button>
        <button 
          className="peripherals-wizard-btn peripherals-btn-primary" 
          onClick={proceedToOrderSummary}
          style={{
            width: '444px',
            height: '71px',
            backgroundColor: '#00E083',
            border: 'none',
            color: '#000',
            fontSize: '24px',
            fontWeight: 600
          }}
        >
          Order Summary
        </button>
      </div>
    </div>
  );
};

export default Peripherals;
