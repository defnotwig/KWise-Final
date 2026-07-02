import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import '../kiosk/PaymentWindow.css';
import { kioskAPI } from "../services/api";
import logoComponent from "../assets/PCParts/logoComponent.svg";
import creditCard from "../assets/PaymentWindow/creditCard.svg";
import onlineBank from "../assets/PaymentWindow/onlineBank.svg";
import installment from "../assets/PaymentWindow/installment.svg";
import cash from "../assets/PaymentWindow/cash.svg";

const createOrderRequestKey = () => {
  if (globalThis.crypto?.randomUUID) {
    return `kiosk-order-${globalThis.crypto.randomUUID()}`;
  }

  return `kiosk-order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const PaymentWindow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if we need to auto-create order (coming back from payment method selection)
  // Track if order creation has been triggered to prevent duplicates
  const orderCreationTriggered = React.useRef(false);
  const orderSubmissionInFlight = React.useRef(false);
  const orderIdempotencyKeyRef = React.useRef(null);

  useEffect(() => {
    if (location.state?.autoCreateOrder && !loading && !orderCreationTriggered.current) {
      const { paymentMethod } = location.state;

      // Mark as triggered to prevent duplicate calls
      orderCreationTriggered.current = true;

      // FIX: Use the full payment method directly from state (already formatted)
      // This prevents duplicate creation and ensures clean payment method string

      console.log('🔥 Auto-creating order with payment method:', paymentMethod);

      // Auto-create order with selected payment method
      // Navigation to QueuingDisplay happens inside createOrderWithQueue
      createOrderWithQueue(paymentMethod);

      // CRITICAL FIX: Don't clear state immediately!
      // The async createOrderWithQueue needs location.state intact until navigation completes
      // State will be cleared naturally when we navigate to QueuingDisplay
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.autoCreateOrder]);

  // Helper function to get customer name - simplified for kiosk flow
  const getCustomerName = () => {
    // For kiosk, return default name that admin can edit later
    return 'Customer';
  };

  // Helper function to prepare order data from localStorage
  const prepareOrderData = (paymentMethod) => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const prebuiltCart = JSON.parse(localStorage.getItem("prebuiltCart")) || [];
    const customOrders = JSON.parse(localStorage.getItem("customOrders")) || [];
    const aiCustomizedBuild = JSON.parse(localStorage.getItem("aiCustomizedBuild")) || null;
    const cleaningOrders = JSON.parse(localStorage.getItem("cleaningOrders")) || [];
    const upgradeOrders = JSON.parse(localStorage.getItem("upgradeOrders")) || [];
    const diagnosticIssues = JSON.parse(localStorage.getItem("diagnosticIssues")) || [];

    // Determine transaction origin - prioritize location.state for accuracy
    let transactionOrigin = "pc-parts"; // default
    if (location.state?.from) {
      transactionOrigin = location.state.from;
    } else {
      // Fallback detection
      if (customOrders.length > 0 || aiCustomizedBuild) {
        transactionOrigin = "pc-customized";
      } else if (prebuiltCart.length > 0) {
        transactionOrigin = "prebuilt-pc";
      } else if (cart.length > 0 && cart[0].product) {
        transactionOrigin = "prebuilt-pc";
      } else if (cleaningOrders.length > 0) {
        transactionOrigin = "pc-cleaning";
      } else if (upgradeOrders.length > 0) {
        transactionOrigin = "pc-upgrade";
      } else if (diagnosticIssues.length > 0) {
        transactionOrigin = "pc-diagnostic";
      }
    }

    // Get customer name (always available for kiosk)
    const customerName = getCustomerName();

    // Prepare items array and calculate total
    let items = [];
    let totalAmount = 0;

    // Handle both "pc-customized" and "customize-ai" flows (same backend service type)
    if (transactionOrigin === "pc-customized" || transactionOrigin === "customize-ai") {
      // Check if we have AI customized build first
      if (aiCustomizedBuild && typeof aiCustomizedBuild === 'object') {
        // Convert AI build object to items array
        items = Object.entries(aiCustomizedBuild)
          .filter(([key, component]) => component && (component.id || component.product_id))
          .map(([key, component]) => ({
            id: component.id || component.product_id || null,
            name: component.name || component.product_name || 'Custom Component',
            price: Number.parseFloat(component.price || 0),
            quantity: 1,
            totalPrice: Number.parseFloat(component.price || 0),
            category: component.category || key
          }));
      } else if (customOrders.length > 0) {
        // For PC Customized, flatten the custom orders into individual items
        items = customOrders.flatMap(order =>
          order.items.filter(Boolean).map(item => ({
            id: item.id || null,
            name: item.name || item.component || 'Custom Component',
            price: Number.parseFloat(item.price || 0),
            quantity: (item.quantity || 1) * (order.quantity || 1),
            totalPrice: Number.parseFloat(item.price || 0) * (item.quantity || 1) * (order.quantity || 1),
            category: item.category || 'custom'
          }))
        );
      }
      
      // Normalize transaction origin to backend service type
      if (transactionOrigin === "customize-ai") {
        transactionOrigin = "pc-customized";
      }
    } else if ((transactionOrigin === "prebuilt-pc" || transactionOrigin === "preset" || transactionOrigin === "community") && (prebuiltCart.length > 0 || cart.length > 0)) {
      // ✅ FIX: For PreBuilt PC - Check prebuiltCart FIRST, then fallback to cart
      const sourceCart = prebuiltCart.length > 0 ? prebuiltCart : cart;
      
      console.log('🔍 PreBuilt PC flow - Using cart source:', prebuiltCart.length > 0 ? 'prebuiltCart' : 'cart');
      console.log('📦 Source cart length:', sourceCart.length);
      console.log('📦 Source cart data:', sourceCart);
      
      // For PreBuilt PC - Include all components and addons
      items = sourceCart.flatMap(order => {
        const orderItems = [];
        
        console.log('  🔍 Processing order:', order);

        // Handle prebuiltCart structure (customized prebuilt)
        if (order.baseProduct && order.components) {
          // This is customized prebuilt structure from PreBuiltDisplay
          console.log('    ✅ Detected customized prebuilt structure');
          
          // ✅ FIX: Check if there are customizations for Community Build auto-save
          const hasCustomizations = order.customizations && Object.keys(order.customizations).length > 0;
          
          // Add main product entry with customization metadata
          orderItems.push({
            id: order.baseProduct.id || null,
            name: order.baseProduct.name || 'Custom PreBuilt PC',
            price: Number.parseFloat(order.totalPrice || 0),
            quantity: order.quantity || 1,
            totalPrice: Number.parseFloat(order.totalPrice || 0) * (order.quantity || 1),
            category: 'prebuilt',
            isMainProduct: true,
            // ✅ NEW: Include metadata for Community Build detection
            isCustomized: hasCustomizations,
            customizations: order.customizations || {},
            buildSource: order.buildSource || 'preset',
            tier: order.tier || 'Mid Tier',
            purposes: order.purposes || ['Gaming'],
            baseProductId: order.baseProduct.id,
            compatibilityScore: order.compatibilityScore
          });
          
          // ✅ FIX: Extract components from BOTH order.components AND order.customizations
          const componentsToProcess = [];
          
          // Method 1: From order.components array (full build customization)
          if (Array.isArray(order.components)) {
            order.components.forEach(comp => {
              const componentEntries = Object.entries(comp);
              componentEntries.forEach(([compType, compData]) => {
                if (compData && (compData.name || compData.value)) {
                  componentsToProcess.push({ type: compType, data: compData });
                }
              });
            });
          }
          
          // Method 2: From order.customizations object (individual component changes)
          if (order.customizations && typeof order.customizations === 'object') {
            Object.entries(order.customizations).forEach(([compType, compData]) => {
              if (compData && typeof compData === 'object' && (compData.name || compData.value || compData.part_name)) {
                componentsToProcess.push({ type: compType, data: compData });
              }
            });
          }
          
          // Add all extracted components as separate items
          componentsToProcess.forEach(({ type: compType, data: compData }) => {
            const componentValue = compData.value || compData.part_name || compData.name || compData;
            
            orderItems.push({
              id: compData.id || compData.part_id || null,
              name: `[${order.baseProduct.name}] ${compType.toUpperCase()}: ${componentValue}`,
              price: Number.parseFloat(compData.price || compData.part_price || 0),
              quantity: order.quantity || 1,
              totalPrice: 0, // Price included in main product
              category: 'prebuilt-component',
              componentType: compType,
              componentValue: componentValue,
              parentProduct: order.baseProduct.name
            });
          });
          
          // Add peripherals if exists
          if (order.peripherals && Array.isArray(order.peripherals)) {
            order.peripherals.forEach(peripheral => {
              orderItems.push({
                id: peripheral.id || null,
                name: peripheral.name,
                price: Number.parseFloat(peripheral.price || 0),
                quantity: peripheral.quantity || 1,
                totalPrice: Number.parseFloat(peripheral.price || 0) * (peripheral.quantity || 1),
                category: peripheral.category || 'peripheral',
                isPeripheral: true
              });
            });
          }
        }
        // Handle standard cart structure (regular prebuilt)
        else if (order.product) {
          // Add main product entry
          orderItems.push({
            id: order.product.id || null,
            name: order.product.name || 'PreBuilt PC',
            price: Number.parseFloat(order.product.price || 0),
            quantity: order.quantity || 1,
            totalPrice: Number.parseFloat(order.product.price || 0) * (order.quantity || 1),
            category: 'prebuilt',
            isMainProduct: true
          });

          // Add each component as separate item for detailed tracking
          if (order.product.components && Array.isArray(order.product.components)) {
            order.product.components.forEach(comp => {
              if (comp && (comp.value || comp.name?.includes(':'))) {
                // Handle both structures: {name: "CPU", value: "AMD..."} or {name: "CPU: AMD..."}
                let componentType = comp.name || 'Component';
                let componentValue = comp.value || '';

                // If value is in name (e.g., "CPU: AMD RYZEN 7")
                if (!componentValue && componentType.includes(':')) {
                  const parts = componentType.split(':');
                  componentType = parts[0].trim();
                  componentValue = parts.slice(1).join(':').trim();
                }

                if (componentValue && componentValue.trim()) {
                  orderItems.push({
                    id: null,
                    name: `[${order.product.name}] ${componentType}: ${componentValue}`, // e.g., "[Elite Build C] CPU: AMD RYZEN 7 9700X"
                    price: 0, // Components don't have individual prices in Pre-Built
                    quantity: order.quantity || 1,
                    totalPrice: 0,
                    category: 'prebuilt-component',
                    componentType: componentType,
                    componentValue: componentValue,
                    parentProduct: order.product.name
                  });
                }
              }
            });
          }
        }

        // Add addon if exists
        if (order.addon) {
          orderItems.push({
            id: order.addon.id || null,
            name: order.addon.name,
            price: Number.parseFloat(order.addon.price || 0),
            quantity: order.quantity || 1,
            totalPrice: Number.parseFloat(order.addon.price || 0) * (order.quantity || 1),
            category: order.addon.category || 'addon',
            isAddon: true
          });
        }

        return orderItems;
      });
    } else if (transactionOrigin === "pc-cleaning" && cleaningOrders.length > 0) {
      // For PC Cleaning Service
      items = cleaningOrders.map(service => {
        // Parse price from formatted string (e.g., "₱1,000.00") or priceNumeric field
        let price = 0;
        if (service.tier?.priceNumeric) {
          price = Number.parseFloat(service.tier.priceNumeric);
        } else if (service.tier?.price) {
          // Remove currency symbol, commas, and parse
          price = Number.parseFloat(String(service.tier.price).replaceAll(/[₱,]/g, ''));
        } else if (service.priceNumeric) {
          price = Number.parseFloat(service.priceNumeric);
        } else if (service.price) {
          price = Number.parseFloat(String(service.price).replaceAll(/[₱,]/g, ''));
        }

        // Get assessment data to include in the order item description
        const assessmentData = JSON.parse(localStorage.getItem('cleaningAssessment') || 'null');

        let assessmentDescription = '';
        if (assessmentData) {
          const parts = [];
          parts.push(`Cleaned Before: ${assessmentData.hasCleaned ? 'Yes' : 'No'}`);
          if (assessmentData.lastCleaned) parts.push(`Last Cleaned: ${assessmentData.lastCleaned}`);
          if (assessmentData.cleaningType) parts.push(`Previous Type: ${assessmentData.cleaningType.charAt(0).toUpperCase() + assessmentData.cleaningType.slice(1)}`);
          if (assessmentData.pcAge) parts.push(`PC Build/Purchase: ${assessmentData.pcAge}`);

          // Add selected issues if they exist
          if (assessmentData.underlyingIssues && assessmentData.selectedIssues && assessmentData.selectedIssues.length > 0) {
            parts.push(`Issues: ${assessmentData.selectedIssues.join(', ')}`);
          }

          // Check if THIS specific order has PC re-case requested
          if (service.reCaseRequested) {
            parts.push('PC Re-Case: Requested (manual addition required)');
          }

          assessmentDescription = parts.join(' | ');
        }

        return {
          id: null,
          name: service.tier?.name || service.name || 'PC Cleaning Service',
          price: price,
          quantity: service.quantity || 1,
          totalPrice: price * (service.quantity || 1),
          category: 'service',
          description: assessmentDescription || undefined // Add assessment as description
        };
      });
    } else if (transactionOrigin === "pc-upgrade" && upgradeOrders.length > 0) {
      // For PC Upgrade Service
      items = upgradeOrders.flatMap(order =>
        order.items.map(item => ({
          id: item.id || null,
          name: item.name || item.component || 'Upgrade Component',
          price: Number.parseFloat(item.price || 0),
          quantity: (item.quantity || 1) * (order.quantity || 1),
          totalPrice: Number.parseFloat(item.price || 0) * (item.quantity || 1) * (order.quantity || 1),
          category: 'upgrade' // Always set to 'upgrade' for proper receipt detection
        }))
      );
    } else if (transactionOrigin === "pc-diagnostic" && diagnosticIssues.length > 0) {
      // For PC Checkup Service - 200php standard service fee
      // Note: Labor and other charges may vary based on PC problems found
      const SERVICE_FEE = 200; // Standard PC Checkup service fee
      
      items = diagnosticIssues.map(issue => ({
        id: null,
        name: typeof issue === 'string' ? issue : (issue.category || 'PC Diagnostic Service'),
        price: SERVICE_FEE,
        quantity: 1,
        totalPrice: SERVICE_FEE,
        category: 'service',
        description: 'PC Checkup - Standard service fee (Labor and other charges may vary)'
      }));
    } else {
      // For regular PC Parts
      items = cart.map(item => ({
        id: item.id || null,
        name: item.name || 'PC Component',
        price: Number.parseFloat(item.price || 0),
        quantity: item.quantity || 1,
        totalPrice: Number.parseFloat(item.price || 0) * (item.quantity || 1),
        category: item.category || 'component'
      }));
    }

    // Calculate total amount
    totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    // For PC Checkup/Diagnostic: Add service fee details
    let serviceFee = 0;
    let laborCharges = 0;
    let otherCharges = 0;
    let serviceNotes = null;

    if (transactionOrigin === "pc-diagnostic") {
      serviceFee = 200; // Standard PC Checkup service fee
      serviceNotes = "PC Checkup - Standard service fee. Labor and other charges will vary based on findings.";
    }

    console.log('💰 Order preparation details:');
    console.log('  - Transaction Origin:', transactionOrigin);
    console.log('  - Items:', items);
    console.log('  - Total Amount:', totalAmount);
    console.log('  - Service Fee:', serviceFee);

    // Ensure we have valid data (customer name can be empty for kiosk orders)
    if (!items || items.length === 0) {
      console.error('❌ Order validation failed: No items');
      throw new Error('No items found in order');
    }

    if (totalAmount <= 0) {
      console.error('❌ Order validation failed: Invalid total amount');
      console.error('  - Items:', JSON.stringify(items, null, 2));
      throw new Error('Invalid order total. Please check your cart.');
    }

    return {
      customerName: customerName || 'Customer', // Default to 'Customer' if empty
      customerEmail: localStorage.getItem('customerEmail') || '',
      items,
      totalAmount,
      paymentMethod,
      serviceType: transactionOrigin,
      transactionOrigin,
      serviceFee, // PC Checkup service fee
      laborCharges, // Will be updated by admin based on actual work
      otherCharges, // Will be updated by admin if needed
      serviceNotes // Description of service fee structure
    };
  };

  // Create order through backend API with queue management
  // TASK 4 ENHANCEMENT: Added duplicate detection, debouncing, and comprehensive loading states
  const createOrderWithQueue = async (paymentMethod) => {
    // TASK 4 FIX: Prevent double-clicks with debouncing
    if (loading || orderSubmissionInFlight.current) {
      console.warn('🚫 Order creation already in progress, ignoring duplicate click');
      return;
    }

    orderSubmissionInFlight.current = true;
    setLoading(true);
    setError('');

    try {
      // Validate and prepare order data
      const orderData = prepareOrderData(paymentMethod);
      if (!orderIdempotencyKeyRef.current) {
        orderIdempotencyKeyRef.current = createOrderRequestKey();
      }
      orderData.clientRequestId = orderIdempotencyKeyRef.current;
      orderData.idempotencyKey = orderIdempotencyKeyRef.current;
      console.log('Creating order with queue management:', {
        itemCount: orderData.items?.length || 0,
        totalAmount: orderData.totalAmount,
        serviceType: orderData.serviceType,
        transactionOrigin: orderData.transactionOrigin,
        idempotencyKey: orderIdempotencyKeyRef.current
      });

      // Additional frontend validation
      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        throw new Error('Your cart is empty. Please add items before proceeding.');
      }

      if (!orderData.totalAmount || orderData.totalAmount <= 0) {
        throw new Error('Invalid order total. Please check your cart.');
      }

      // Call backend API to create order with queue assignment
      const response = await kioskAPI.createOrder(orderData);

      if (response.data.success) {
        const createdOrder = response.data.data;

        // TASK 4: Check if this is a duplicate order
        if (createdOrder.isDuplicate) {
          console.warn('⚠️ Duplicate order detected by backend');
          setError('This order was already created. Redirecting to queue...');

          // Still navigate to queue with the duplicate order data
          // The user should see their queue number, not an error
        } else {
          console.info('✅ New order created successfully:', createdOrder);
        }

        console.log('Order created successfully with queue:', createdOrder);

        // For PC Checkup/Diagnostic, append "(Pay after diagnosis)" to payment method
        let displayPaymentMethod = paymentMethod;
        if (orderData.transactionOrigin === "pc-diagnostic") {
          displayPaymentMethod = `${paymentMethod} (Pay after diagnosis)`;
        }

        // Store the actual backend response for receipt generation
        localStorage.setItem("lastOrder", JSON.stringify([{
          orderIdFormatted: createdOrder.orderIdFormatted,
          transactionIdFormatted: createdOrder.transactionIdFormatted,
          queueNumber: createdOrder.queueNumber,
          customerName: orderData.customerName,
          totalAmount: createdOrder.totalAmount,
          items: orderData.items,
          paymentMethod: displayPaymentMethod,
          transactionOrigin: orderData.transactionOrigin,
          backendOrder: createdOrder,
          isDuplicate: createdOrder.isDuplicate || false
        }]));

        localStorage.setItem("orderOrigin", orderData.transactionOrigin);
        localStorage.setItem("queueNumber", createdOrder.queueNumber);
        localStorage.setItem("orderIdFormatted", createdOrder.orderIdFormatted);
        localStorage.setItem("transactionIdFormatted", createdOrder.transactionIdFormatted);

        // Clear cart and order data after successful creation
        localStorage.removeItem("cart");
        localStorage.removeItem("prebuiltCart");
        localStorage.removeItem("customOrders");
        localStorage.removeItem("aiCustomizedBuild");
        localStorage.removeItem("cleaningOrders");
        localStorage.removeItem("upgradeOrders");
        localStorage.removeItem("diagnosticIssues");

        // Clear PC cleaning session data after successful order
        localStorage.removeItem("cleaningAssessment");
        localStorage.removeItem("pendingCleaningOrder");

        // FIX: Navigate immediately without delay to prevent white screen
        // The loading state will be cleared automatically when component unmounts
        navigate("/queuing-display", {
          state: {
            from: orderData.transactionOrigin,
            paymentMethod: displayPaymentMethod,
            queueNumber: createdOrder.queueNumber,
            orderIdFormatted: createdOrder.orderIdFormatted,
            transactionIdFormatted: createdOrder.transactionIdFormatted,
            backendOrder: createdOrder,
            isDuplicate: createdOrder.isDuplicate || false
          },
          replace: true // Replace history to prevent back button issues
        });
      } else {
        throw new Error(response.data.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);

      // Handle different types of errors
      let errorMessage = 'Failed to create order. Please try again.';

      if (error.response) {
        // Backend returned an error response
        if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again or contact support.';
        } else if (error.response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        // Validation or other errors
        errorMessage = error.message;
      }

      setError(errorMessage);
      orderSubmissionInFlight.current = false;
      setLoading(false);
    }
  };

  // Navigate to payment detail pages (NEW: Per pasted images 3-8)
  const handleCashPayment = () => {
    // For cash, go straight to queue (no additional page needed)
    createOrderWithQueue('Cash');
  };

  const handleOnlineBankPayment = () => {
    // Navigate to online bank selection page
    navigate('/payment/online-bank');
  };

  const handleCreditCardPayment = () => {
    // Navigate to credit card selection page
    navigate('/payment/credit-card');
  };

  const handleInstallmentPayment = () => {
    // Navigate to installment selection page
    navigate('/payment/installment');
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="payment-container">
      <img src={logoComponent} alt="K-Wise Logo" className="logo" />
      <h1 className="payment-title">How would you like to pay?</h1>

      {/* TASK 4: Enhanced error display */}
      {error && (
        <div className="payment-error" style={{
          backgroundColor: '#ff4444',
          color: 'white',
          padding: '15px 20px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontWeight: '500',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(255, 68, 68, 0.3)'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* TASK 4: Comprehensive loading overlay */}
      {loading && (
        <div className="payment-loading-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="loading-spinner" style={{
            width: '60px',
            height: '60px',
            border: '6px solid rgba(255, 255, 255, 0.3)',
            borderTop: '6px solid #ffffff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }}></div>
          <div className="payment-loading" style={{
            color: 'white',
            fontSize: '20px',
            fontWeight: '600',
            textAlign: 'center',
            padding: '0 30px'
          }}>
            Creating your order...
            <br />
            <span style={{ fontSize: '16px', opacity: 0.8, marginTop: '10px', display: 'block' }}>
              Please wait, do not close or refresh this page
            </span>
          </div>
        </div>
      )}

      {/* TASK 4: Payment cards - disable all when loading */}
      <div className="payment-grid">
        <div
          className="payment-card"
          onClick={!loading ? handleCashPayment : undefined}
          style={{
            opacity: loading ? 0.4 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
            pointerEvents: loading ? 'none' : 'auto',
            transition: 'all 0.2s ease'
          }}
        >
          <img src={cash} alt="Cash" className="payment-icon" />
          <span>CASH</span>
        </div>

        <div
          className="payment-card"
          onClick={!loading ? handleOnlineBankPayment : undefined}
          style={{
            opacity: loading ? 0.4 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
            pointerEvents: loading ? 'none' : 'auto',
            transition: 'all 0.2s ease'
          }}
        >
          <img src={onlineBank} alt="Online Banking" className="payment-icon" />
          <span>ONLINE BANK</span>
        </div>

        <div
          className="payment-card"
          onClick={!loading ? handleCreditCardPayment : undefined}
          style={{
            opacity: loading ? 0.4 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
            pointerEvents: loading ? 'none' : 'auto',
            transition: 'all 0.2s ease'
          }}
        >
          <img src={creditCard} alt="Credit Card" className="payment-icon" style={{ width: '234px', height: '300px' }} />
          <span>CREDIT CARD</span>
        </div>

        <div
          className="payment-card"
          onClick={!loading ? handleInstallmentPayment : undefined}
          style={{
            opacity: loading ? 0.4 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
            pointerEvents: loading ? 'none' : 'auto',
            transition: 'all 0.2s ease'
          }}
        >
          <img src={installment} alt="Installment" className="payment-icon" />
          <span>INSTALLMENT</span>
        </div>
      </div>

      {/* Back Button (Pasted Image 3 reference) */}
      <button
        className="back-button"
        onClick={handleBack}
        disabled={loading}
        style={{
          marginTop: '2rem',
          padding: '15px 305px',
          fontSize: '18px',
          fontWeight: '600',
          color: '#FFFFFF',
          backgroundColor: 'transparent',
          border: '4px solid #034C3B',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
          transition: 'all 0.3s ease'
        }}
      >
        Back
      </button>

      {/* TASK 4: Add CSS animation for spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PaymentWindow;
