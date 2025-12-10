import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import peripherals from "../../assets/PeripheralsPrompt/peripherals.svg";

/**
 * PeripheralsPrompt - Ask user if they want to add peripherals
 * Shows after AI build generation or after editing build
 * VERSION: 2.0 - Fixed cart saving issue
 */
const PeripheralsPrompt = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log('🚀 PeripheralsPrompt mounted/rendered');
  console.log('📍 location.state:', location.state);
  
  const buildComponents = location.state?.buildComponents || {};
  const assessment = location.state?.assessment || {};
  const fromSource = location.state?.from || 'customize-ai'; // pc-customized, customize-ai, prebuilt, preset, community
  const cartItems = location.state?.cartItems || [];
  const totalPrice = location.state?.totalPrice || 0;
  const buildType = location.state?.buildType || 'custom';
  const prebuiltCart = location.state?.prebuiltCart || []; // For prebuilt flow
  const buildSource = location.state?.buildSource || 'preset'; // preset or community

  console.log('🔑 Extracted state:');
  console.log('  - fromSource:', fromSource);
  console.log('  - buildComponents keys:', Object.keys(buildComponents));
  console.log('  - buildComponents:', buildComponents);
  console.log('  - cartItems length:', cartItems.length);

  const handleYes = () => {
    // Navigate to peripherals selection page with appropriate context
    navigate('/peripherals', {
      state: {
        fromAI: fromSource === 'customize-ai',
        from: fromSource,
        buildComponents: buildComponents,
        assessment: assessment,
        cartItems: cartItems,
        totalPrice: totalPrice,
        buildType: buildType,
        prebuiltCart: prebuiltCart,
        buildSource: buildSource
      }
    });
  };

  const handleNo = () => {
    // Route to appropriate order summary based on source
    if (fromSource === 'pc-customized') {
      // 🔥 CRITICAL FIX: Save cartItems to localStorage before navigating
      // OrderSumCustom loads from localStorage, not from navigation state
      if (cartItems && cartItems.length > 0) {
        // Ensure all items have category field
        const enhancedCartItems = cartItems.map(item => ({
          ...item,
          category: item.category || item.categoryName?.toLowerCase().replace(/\s+/g, '-') || ''
        }));
        localStorage.setItem("cart", JSON.stringify(enhancedCartItems));
        console.log('💾 Saved cart to localStorage before OrderSumCustom:', enhancedCartItems.length, 'items');
      }
      
      // PC Customized flow → Order Summary Custom
      navigate('/ordersum-custom', {
        state: {
          from: 'pc-customized',
          cartItems: cartItems,
          totalPrice: totalPrice,
          buildType: 'custom'
        },
        replace: true // Replace history entry to prevent back navigation loop
      });
    } else if (fromSource === 'prebuilt' || fromSource === 'preset' || fromSource === 'community') {
      // Pre-Built flow → Order Summary Build
      navigate('/order-sum-build', {
        state: {
          from: fromSource,
          buildType: 'prebuilt',
          prebuiltCart: prebuiltCart,
          buildSource: buildSource
        },
        replace: true
      });
    } else {
      // AI Customized flow → Order Summary Custom
      console.log('🔥 PeripheralsPrompt - CustomizeAI NO clicked');
      console.log('📦 buildComponents:', buildComponents);
      console.log('🔑 buildComponents keys:', Object.keys(buildComponents));
      
      const formattedCartItems = Object.entries(buildComponents)
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
          description: component.description || '',
          fromAI: true
        }));

      console.log('🛒 formattedCartItems:', formattedCartItems);
      console.log('📊 formattedCartItems length:', formattedCartItems.length);

      // Check if we have items to save
      if (formattedCartItems.length === 0) {
        console.error('❌ ERROR: No items to save! buildComponents is empty or invalid');
        console.error('🔍 buildComponents:', buildComponents);
        console.error('🔍 buildComponents type:', typeof buildComponents);
        console.error('🔍 buildComponents keys:', Object.keys(buildComponents));
        console.error('🔍 location.state:', location.state);
        
        // EMERGENCY FIX: Try to load from localStorage as fallback
        const stored = localStorage.getItem('aiCustomizedBuild');
        if (stored) {
          console.warn('⚠️ Attempting to load from localStorage backup...');
          try {
            const parsed = JSON.parse(stored);
            const backupItems = Object.entries(parsed)
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
                description: component.description || '',
                fromAI: true
              }));
            
            if (backupItems.length > 0) {
              console.log('✅ Loaded backup items from localStorage:', backupItems);
              localStorage.setItem('cart', JSON.stringify(backupItems));
              navigate('/ordersum-custom', {
                state: {
                  from: 'customize-ai',
                  buildComponents: parsed,
                  assessment: assessment
                },
                replace: true
              });
              return;
            }
          } catch (error) {
            console.error('Failed to parse localStorage backup:', error);
          }
        }
        
        // If all else fails, redirect back to customize-ai
        console.error('❌ CRITICAL: No items available, redirecting to customize-ai');
        navigate('/customize-ai');
        return;
      }

      // Save to cart
      localStorage.setItem('cart', JSON.stringify(formattedCartItems));
      console.log('💾 Saved to localStorage cart:', formattedCartItems);
      
      // Navigate to Order Summary Custom (same as PC Customized)
      navigate('/ordersum-custom', {
        state: {
          from: 'customize-ai',
          buildComponents: buildComponents,
          assessment: assessment
        },
        replace: true
      });
    }
  };

  const handleBack = () => {
    // Navigate back to the source page
    // For prebuilt flow: go back to PreBuiltDisplay (product list)
    // For pc-customized flow: go back to PC Customized page
    // For AI flow: go back to AI Customized page
    
    if (fromSource === 'prebuilt' || fromSource === 'preset' || fromSource === 'community') {
      // Go back to product list or prebuilt display
      console.log('🔙 Returning to product list (Pre-Built flow)');
      navigate(-1); // Go back to PreBuiltDisplay
    } else if (fromSource === 'pc-customized') {
      console.log('🔙 Returning to PC Customized');
      console.log('📦 Cart in localStorage:', localStorage.getItem("cart"));
      console.log('📦 MultiSlotCart in localStorage:', localStorage.getItem("multiSlotCart"));
      
      // 🔥 CRITICAL FIX: Don't clear cart when going back - preserve user selections
      // The cart and multiSlotCart should already be in localStorage (saved by PCCustomized before arriving here)
      navigate('/pc-customized', {
        state: {
          buildComponents: buildComponents,
          fromPeripherals: true, // Flag to indicate returning from peripherals prompt
          timestamp: Date.now() // Force re-render
        }
      });
    } else {
      // AI flow - go back to customize-ai
      console.log('🔙 Returning to Customize AI');
      navigate('/customize-ai', {
        state: {
          buildComponents: buildComponents,
          assessment: assessment
        }
      });
    }
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: '#001a1d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px'
    }}>
      <div style={{
        textAlign: 'center',
      }}>
        {/* Logo/Icon */}
        <div style={{
        }}>
          <div style={{
            fontSize: '64px',
            filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))'
          }}><img src={peripherals} alt="Peripherals Prompt" /></div>
        </div>

        {/* Title */}
        <h1 style={{
          width: '952px',
          height: '87px',
          fontSize: '64px',
          fontWeight: 600,
          color: '#ffffff',
          lineHeight: 'normal',
          letterSpacing: '1px'
        }}>Do you want Peripherals?</h1>
        <p style={{
          fontSize: '24px',
          color: '#fff',
          margin: '0 0 64px',
          fontStyle: 'normal',
          fontWeight: 400,
          lineHeight: 'normal',
          opacity: 0.5
        }}>
          Monitor, Keyboard, Mouse, Headphones, Speaker, & Webcam
        </p>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: '38px',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <button 
            className="peripherals-wizard-btn btn-primary-peripherals"
            onClick={handleYes}
            style={{
              minWidth: '350px',
              height: '80px',
              backgroundColor: '#00E083',
              padding: '12px 24px',
              fontSize: '24px',
              fontWeight: 600
            }}
          >
            Yes
          </button>
          <button 
            className="peripherals-wizard-btn btn-secondary-peripherals"
            onClick={handleNo}
            style={{
              minWidth: '350px',
              height: '80px',
              padding: '12px 24px',
              fontSize: '24px',
              border: '4px solid #00E083',
              backgroundColor: 'transparent',
              color: '#FFFFFF',
              fontWeight: 600
            }}
          >
            No
          </button>
        </div>

        <div style={{
          display: 'flex',
          height: '224px',
          width: '100%',
          padding: '43px 84px',
          alignItems: 'center',
          backgroundColor: '#002024',
          position: 'fixed',
          left: '0',
          bottom:'0'
        }}>
        {/* Back Button - Routes to Order Summary instead of previous page */}
        <button 
          onClick={handleBack}
          style={{
            display: 'flex',
            width: '444px',
            height: '71.346px',
            background: 'transparent',
            border: '4px solid #034C3B',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#fff',
            fontSize: '24px',
            fontStyle:'normal',
            fontWeight: '600',
            lineHeight: 'normal',
            cursor: 'pointer',
            padding: '12px 24px',
          }}
          onMouseEnter={(e) => e.target.style.color = '#ffffff'}
          onMouseLeave={(e) => e.target.style.color = '#b0b0b0'}
        >
         Back
        </button>
        </div>
      </div>
    </div>
  );
};

export default PeripheralsPrompt;
