import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./OrderSumBuild.css";
import "./PCCustomized.css";
import PreBuilt from "../assets/PreBuilt.webp";
import api from "../api/api";
import CompatibilityNotes from "../components/CompatibilityNotes/CompatibilityNotes";

const OrderSumBuild = () => {
  const [cartItems, setCartItems] = useState([]);
  const [selectedRemoveIndex, setSelectedRemoveIndex] = useState(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalMessage, setStockModalMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Measure header (title) height to size scroll area precisely
  const titleRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // PRIORITY 3: Compatibility checking state
  // eslint-disable-next-line no-unused-vars
  const [compatibilityData, setCompatibilityData] = useState(null); // NOSONAR - state setter used in effects
  const [loadingCompatibility, setLoadingCompatibility] = useState(false);

  // ✅ FIX: Redirect based on build source
  const handleEmptyCartRedirect = useCallback(() => {
    // Check location state for build source
    const buildType = location.state?.buildType;
    const buildSource = location.state?.buildSource || location.state?.from;
    
    console.log('🔍 Empty cart redirect - buildType:', buildType, 'buildSource:', buildSource);
    
    // If from prebuilt flow, go back to prebuilt options
    if (buildType === 'prebuilt' || buildSource === 'preset' || buildSource === 'community') {
      navigate("/prebuilt-options");
    } else {
      // Otherwise go to pc build purpose
      navigate("/pcbuild-purpose");
    }
  }, [navigate, location.state]);

  useEffect(() => {
    // Measure header height on mount and on resize
    const measure = () => {
      if (titleRef.current) {
        setHeaderHeight(titleRef.current.offsetHeight || 0);
      }
    };
    measure();
    globalThis.addEventListener('resize', measure);
    return () => globalThis.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    // ✅ FIX: Load from prebuiltCart if coming from prebuilt flow
    const buildType = location.state?.buildType;
    const buildSource = location.state?.buildSource || location.state?.from;
    const isPrebuiltFlow = buildType === 'prebuilt' || buildSource === 'preset' || buildSource === 'community';
    
    console.log('🔍 OrderSumBuild loading cart - buildType:', buildType, 'buildSource:', buildSource, 'isPrebuiltFlow:', isPrebuiltFlow);
    console.log('📦 location.state:', location.state);
    
    let raw;
    if (isPrebuiltFlow) {
      // Load from prebuiltCart for prebuilt flow
      const prebuiltCart = JSON.parse(localStorage.getItem("prebuiltCart") || "[]");
      console.log('📦 Loading prebuiltCart:', prebuiltCart.length, 'items');
      console.log('📦 prebuiltCart data:', prebuiltCart);
      
      if (!Array.isArray(prebuiltCart) || prebuiltCart.length === 0) {
        console.warn('⚠️ Empty prebuiltCart, redirecting...');
        // Use setTimeout to avoid setState during render
        setTimeout(() => handleEmptyCartRedirect(), 0);
        return;
      }
      
      // Transform prebuilt cart format to match expected structure
      const transformedItems = prebuiltCart.map(item => ({
        id: item.id || Date.now(),
        product: {
          name: item.baseProduct?.name || 'Custom Build',
          price: item.totalPrice || 0,
          image: item.baseProduct?.image || '',
          components: item.components || [],
          buildSource: item.buildSource || 'preset',
          customizations: item.customizations || {}
        },
        addon: null,
        quantity: item.quantity || 1,
        peripherals: item.peripherals || [],
        compatibilityScore: item.compatibilityScore
      }));
      
      setCartItems(transformedItems);
      return;
    }
    
    // Standard cart flow for custom/AI builds
    raw = JSON.parse(localStorage.getItem("cart")) || [];
    if (!Array.isArray(raw) || raw.length === 0) {
      console.warn('⚠️ Empty cart, redirecting...');
      // Use setTimeout to avoid setState during render
      setTimeout(() => handleEmptyCartRedirect(), 0);
      return;
    }

    let groups;
    if (raw.every(item => item && typeof item === 'object' && 'product' in item)) {
      groups = raw;
    } else {
      const main = raw.find(it => !it.isAddon) || null;
      const add = raw.find(it => it.isAddon) || null;
      if (!main) {
        handleEmptyCartRedirect();
        return;
      }
      groups = [{ id: Date.now(), product: main, addon: add || null, quantity: 1 }];
    }

    setCartItems(groups);
    localStorage.setItem("cart", JSON.stringify(groups));
  }, [handleEmptyCartRedirect, location.state]);

  // Category map for component key assignment
  const CATEGORY_MAP = {
    'cpu': 'CPU', 'processor': 'CPU',
    'gpu': 'GPU', 'graphics card': 'GPU',
    'motherboard': 'Motherboard',
    'ram': 'RAM', 'memory': 'RAM',
    'storage': 'Storage',
    'psu': 'PSU', 'power supply': 'PSU',
    'case': 'Case',
    'cooling': 'Cooling', 'cooler': 'Cooling',
    'monitor': 'Monitor', 'keyboard': 'Keyboard',
    'mouse': 'Mouse', 'headphones': 'Headphones',
    'speakers': 'Speakers', 'webcam': 'Webcam'
  };
  const CATEGORY_TO_KEY = {
    'cpu': 'cpu', 'processor': 'cpu',
    'gpu': 'gpu', 'graphics card': 'gpu',
    'motherboard': 'motherboard',
    'ram': 'ram', 'memory': 'ram',
    'storage': 'storage',
    'psu': 'psu', 'power supply': 'psu',
    'case': 'case',
    'cooling': 'cooling', 'cooler': 'cooling'
  };

  // Format a single component for the compatibility API
  const formatComponent = (comp) => {
    const rawCategory = (comp.name || '').toLowerCase();
    const componentType = CATEGORY_MAP[rawCategory] || CATEGORY_MAP[rawCategory.trim()] || 'CPU';
    return {
      id: comp.part_id || comp.id || 0,
      name: comp.value || comp.part_name || comp.name || '',
      category: componentType,
      brand: comp.brand || comp.part_brand || '',
      price: typeof comp.price === "number" ? comp.price : Number.parseFloat(String(comp.price || '0').replaceAll(/[^\d.]/g, "")) || 0,
      stock: comp.part_stock || comp.stock || 0,
      specifications: comp.specifications || {},
      image_url: comp.image || comp.image_url || '',
      description: comp.description || '',
      performance_index: comp.performance_index || 0,
      quantity: comp.quantity || 1
    };
  };

  // Assign a single component to the components map by category
  const assignComponent = (comp, components, formatter) => {
    if (!comp || (!comp.value && !comp.part_name)) return;
    const category = (comp.name || '').toLowerCase();
    const formatted = formatter(comp);
    if (!formatted.id || formatted.id <= 0) return;
    const key = CATEGORY_TO_KEY[category];
    if (key) components[key] = formatted;
  };

  // Aggregate all components from cart items into a categorized object
  const aggregateComponents = useCallback((items) => {
    const components = {};
    for (const order of items) {
      const orderComponents = order?.product?.components;
      if (!Array.isArray(orderComponents)) continue;
      for (const comp of orderComponents) {
        assignComponent(comp, components, formatComponent);
      }
    }
    return components;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PRIORITY 3: Check compatibility when cart changes
  useEffect(() => {
    const checkCompatibility = async () => {
      if (!cartItems || cartItems.length === 0) {
        setCompatibilityData(null);
        return;
      }

      setLoadingCompatibility(true);

      const components = aggregateComponents(cartItems);

      if (Object.keys(components).length === 0) {
        setCompatibilityData(null);
        setLoadingCompatibility(false);
        return;
      }

      console.log('🔍 Formatted components for API:', components);

      try {

        // Call compatibility API using kioskAPI
        const response = await api.kiosk.checkFullBuildCompatibility(components);

        if (response.success) {
          // PHASE 9 FIX: Pass response.data.data (the actual compatibility analysis) not response.data (the wrapper)
          // API returns: { success: true, data: { compatibility_score: 55, layers: {...}, ... } }
          // Component expects: { compatibility_score: 55, layers: {...}, ... }
          setCompatibilityData(response.data.data);
        }
      } catch (error) {
        console.log('ℹ️ Compatibility check not available:', error.response?.data?.message || error.message);
        // Don't block user flow if compatibility check fails
        setCompatibilityData(null);
      } finally {
        setLoadingCompatibility(false);
      }
    };

    checkCompatibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems, aggregateComponents]);

  // Helpers and totals
  const getPrice = (item) => {
    if (!item?.price && item?.price !== 0) return 0;
    return typeof item.price === "string"
      ? Number.parseFloat(item.price.replaceAll(/[^0-9.,]/g, "").replaceAll(',', ""))
      : item.price || 0;
  };

  const orderTotal = (order) => {
    const productPrice = getPrice(order?.product);
    const addonPrice = getPrice(order?.addon);
    // 🔥 FIX: Include peripherals in total calculation
    const peripheralsPrice = (order?.peripherals || []).reduce((sum, p) => sum + (Number.parseFloat(p.price || 0)), 0);
    return (productPrice + addonPrice + peripheralsPrice) * (order?.quantity || 1);
  };

  // eslint-disable-next-line no-unused-vars
  const grandTotal = cartItems.reduce((sum, order) => sum + orderTotal(order), 0); // NOSONAR - used by child components

  // Helper: determine if this is a prebuilt flow
  const isPrebuiltFlow = () => {
    const buildType = location.state?.buildType;
    const buildSource = location.state?.buildSource || location.state?.from;
    return buildType === 'prebuilt' || buildSource === 'preset' || buildSource === 'community';
  };

  // Helper: transform cart to prebuilt format for localStorage
  const toPrebuiltFormat = (items) => items.map(item => ({
    id: item.id,
    baseProduct: {
      name: item.product?.name || 'Custom Build',
      originalPrice: item.product?.price || 0,
      image: item.product?.image || ''
    },
    components: item.product?.components || [],
    customizations: item.product?.customizations || {},
    totalPrice: item.product?.price || 0,
    buildSource: item.product?.buildSource || 'preset',
    quantity: item.quantity || 1,
    peripherals: item.peripherals || [],
    compatibilityScore: item.compatibilityScore
  }));

  // Helper: save cart items to correct localStorage key
  const saveCartToStorage = (items) => {
    if (isPrebuiltFlow()) {
      localStorage.setItem("prebuiltCart", JSON.stringify(toPrebuiltFormat(items)));
    } else {
      localStorage.setItem("cart", JSON.stringify(items));
    }
  };

  // Helper: calculate effective stock from all components
  const calculateEffectiveStock = (components) => {
    let effectiveStock = Infinity;
    const componentStocks = [];
    for (const comp of components) {
      if (!comp.part_id) continue;
      const compStock = comp.part_stock || comp.stock || 0;
      const compQuantity = comp.quantity || 1;
      const maxBuilds = Math.floor(compStock / compQuantity);
      componentStocks.push({ name: comp.value || comp.name, stock: compStock, quantity: compQuantity, maxBuilds });
      if (maxBuilds < effectiveStock) effectiveStock = maxBuilds;
    }
    return { effectiveStock, componentStocks };
  };

  // Helper: check prebuilt system-level stock limit
  const checkPrebuiltStockLimit = (order, index, newQuantity, finalStockLimit, effectiveStock, adminStockLimit) => {
    let totalPrebuiltUsed = 0;
    cartItems.forEach((ord, ordIndex) => {
      if (ord?.product?.id === order.product.id) {
        totalPrebuiltUsed += ordIndex === index ? newQuantity : (ord.quantity || 1);
      }
    });
    if (totalPrebuiltUsed > finalStockLimit) {
      const limitingFactor = effectiveStock < adminStockLimit ? 'component availability' : 'admin stock limit';
      setStockModalMessage(`Cannot add more. Pre-built system stock limit reached. Total needed: ${totalPrebuiltUsed}. Available: ${finalStockLimit} (limited by ${limitingFactor}).`);
      setShowStockModal(true);
      return true; // blocked
    }
    return false;
  };

  // Helper: check individual component stock across all orders
  const checkComponentStock = (order, index, newQuantity) => {
    for (const comp of order.product.components) {
      if (!comp.part_id) continue;
      const compStock = comp.part_stock || comp.stock || 0;
      const compQuantity = comp.quantity || 1;
      let totalUsed = 0;
      cartItems.forEach((ord, ordIndex) => {
        const ordComps = ord?.product?.components;
        if (!Array.isArray(ordComps)) return;
        ordComps.forEach(ordComp => {
          if (ordComp?.part_id === comp.part_id) {
            totalUsed += (ordComp.quantity || 1) * (ordIndex === index ? newQuantity : (ord.quantity || 1));
          }
        });
      });
      if (totalUsed > compStock) {
        setStockModalMessage(`Cannot add more. Component "${comp.value || comp.name}" has insufficient stock. Total needed across all builds: ${totalUsed}. Available: ${compStock}. Maximum builds possible: ${Math.floor(compStock / compQuantity)}.`);
        setShowStockModal(true);
        return true; // blocked
      }
    }
    return false;
  };

  const updateQuantity = (index, delta) => {
    if (delta > 0) {
      const order = cartItems[index];
      if (Array.isArray(order?.product?.components)) {
        const newQuantity = (order.quantity || 1) + delta;
        const { effectiveStock, componentStocks } = calculateEffectiveStock(order.product.components);

        console.log('📦 Pre-built stock calculation:', {
          system: order.product.name,
          manualStockQuantity: order.product.stock_quantity,
          calculatedMinimumStock: effectiveStock,
          componentBreakdown: componentStocks
        });

        const adminStockLimit = order.product.stock_quantity || order.product.stockQuantity || Infinity;
        const finalStockLimit = Math.min(effectiveStock, adminStockLimit);

        if (checkPrebuiltStockLimit(order, index, newQuantity, finalStockLimit, effectiveStock, adminStockLimit)) return;
        if (checkComponentStock(order, index, newQuantity)) return;
      }
    }

    setCartItems(prev => {
      const next = prev.map((o, i) =>
        i === index ? { ...o, quantity: Math.max(1, (o.quantity || 1) + delta) } : o
      );
      saveCartToStorage(next);
      return next;
    });
  };

  const handleRemoveAtIndex = (index) => {
    setCartItems(prev => {
      const next = prev.filter((_, i) => i !== index);
      saveCartToStorage(next);
      if (next.length === 0) {
        setTimeout(() => handleEmptyCartRedirect(), 0);
      }
      return next;
    });
    setShowRemoveModal(false);
    setSelectedRemoveIndex(null);
  };

  return (
    <div className="order-sum-build-container">
      <h1 className="order-sum-build-title" ref={titleRef}>ORDER SUMMARY</h1>

      <div
        className="order-sum-build-content"
        style={{ maxHeight: `calc(100vh - ${headerHeight}px - 200px)` }}
      >
        {cartItems.map((order, index) => (
          <div className="order-sum-build-orderGroup" key={order.id || index}>
            <div className="order-sum-build-itemContainer">
              <div className="order-sum-build-productWrapper">
                <img src={PreBuilt} alt="PreBuilt PC" className="order-sum-build-productImage" />
              </div>
              <div className="order-sum-build-priceAndControls">
                <div className="order-sum-build-priceContainer">
                  <p className="order-sum-build-productName">
                    {order?.product?.name || "PreBuilt PC"}
                  </p>
                  <p className="order-sum-build-productPrice">
                    ₱{orderTotal(order).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div className="order-sum-build-quantityControls">
                  <button
                    className="order-sum-build-quantityBtn"
                    disabled={(order.quantity || 1) <= 1}
                    onClick={() => updateQuantity(index, -1)}
                  >−</button>
                  <span className="order-sum-build-quantityDisplay">{order.quantity || 1}</span>
                  <button
                    className="order-sum-build-quantityBtn"
                    onClick={() => updateQuantity(index, 1)}
                  >+</button>
                  <button
                    className="order-sum-build-removeBtn"
                    onClick={() => { setSelectedRemoveIndex(index); setShowRemoveModal(true); }}
                  >Remove Item</button>
                </div>
              </div>
            </div>

            <div className="order-sum-build-components-summary">
              <h2 className="order-sum-build-components-title">Components</h2>
              <div className="order-sum-build-components-table">
                {order?.product?.components?.map((comp, idx) => (
                  <div key={comp.name || idx} className="order-sum-build-component-row">
                    <span className="order-sum-build-component-label">{comp.name}</span>
                    <span className="order-sum-build-component-value">{comp.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {order?.addon && (
              <div className="order-sum-build-addons-summary">
                <h2 className="order-sum-build-addons-title">Addons:</h2>
                <ul className="order-sum-build-addons-list">
                  <li className="order-sum-build-addon-item">
                    <span className="order-sum-build-addon-name">{order.addon.name}</span>{" "}
                    <span className="order-sum-build-addon-price">({typeof order.addon.price === "number" ? `₱${order.addon.price.toLocaleString()}` : order.addon.price})</span>
                  </li>
                </ul>
              </div>
            )}

            {/* 🔥 FIX: Display peripherals if present */}
            {order?.peripherals && Array.isArray(order.peripherals) && order.peripherals.length > 0 && (
              <div className="order-sum-build-peripherals-summary">
                <h2 className="order-sum-build-peripherals-title">Peripherals</h2>
                <div className="order-sum-build-peripherals-table">
                  {order.peripherals.map((peripheral, pIdx) => (
                    <div key={peripheral.name || pIdx} className="order-sum-build-peripheral-row">
                      <span className="order-sum-build-peripheral-category">{peripheral.category || 'Peripheral'}</span>
                      <span className="order-sum-build-peripheral-value">{peripheral.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* PRIORITY 3: PCPartPicker-Style Compatibility Report */}
      {loadingCompatibility && (
        <div className="compatibility-loading">
          <div className="loading-spinner"></div>
          <span>Checking compatibility...</span>
        </div>
      )}

      {/* PCPartPicker-style Compatibility Notes */}
      <CompatibilityNotes
        buildComponents={cartItems}
        buildType={location.state?.buildSource || "prebuilt"}
      />

      {/* Bottom section with total and action buttons */}
      <div className="order-sum-build-bottom-section">
        <div className="order-sum-build-process-container">
          <div className="order-sum-build-total-info">
            <span className="order-sum-build-total-label">Total:</span>
            <span className="order-sum-build-price">
              ₱{cartItems.reduce((sum, order) => sum + orderTotal(order), 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>
          <div className="order-sum-build-action-buttons">
            <button
              className="order-sum-build-order-more"
              onClick={() => {
                // 🔥 FIX: Navigate back to prebuilt-options WITHOUT clearing cart
                // The existing prebuiltCart will be preserved, and new selections will be added to it
                console.log('📦 Order More clicked - preserving', cartItems.length, 'existing items');
                navigate("/prebuilt-options", {
                  state: {
                    from: 'order-more',
                    preserveCart: true // Signal to not clear the cart
                  }
                });
              }}
            >
              Order More
            </button>
            <button
              className="order-sum-build-proceed-payment"
              onClick={() => {
                // Determine the correct origin based on build type
                const buildType = location.state?.buildType;
                const buildSource = location.state?.buildSource || location.state?.from;
                const isPrebuiltFlow = buildType === 'prebuilt' || buildSource === 'preset' || buildSource === 'community';
                
                // Set correct serviceType for Community Builds auto-save
                const originType = isPrebuiltFlow ? 'prebuilt-pc' : 'pc-customized';
                
                navigate("/future-upgrades", {
                  state: {
                    from: originType,
                    cartItems: cartItems
                  }
                });
              }}
              disabled={cartItems.length === 0}
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>

      {showStockModal && (
        <div className="pc-customized-modal-overlay">
          <div className="pc-customized-modal-background"></div>
          <div className="pc-customized-modal">
            <div className="pc-customized-modal-icon" />
            <h2 className="pc-customized-modal-title">
              <span>{stockModalMessage}</span>
            </h2>
            <div className="pc-customized-modal-buttons">
              <button className="pc-customized-modal-btn yes" onClick={() => setShowStockModal(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showRemoveModal && (
        <div className="pc-customized-modal-overlay">
          <div className="pc-customized-modal-background"></div>
          <div className="pc-customized-modal">
            <h2 className="pc-customized-modal-title">
              ARE YOU SURE YOU WANT TO<br /><span>REMOVE ITEM?</span>
            </h2>
            <div className="pc-customized-modal-buttons">
              <button
                className="pc-customized-modal-btn"
                onClick={() => setShowRemoveModal(false)}
              >
                NO
              </button>
              <button
                className="pc-customized-modal-btn yes"
                onClick={() => handleRemoveAtIndex(selectedRemoveIndex)}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderSumBuild;
