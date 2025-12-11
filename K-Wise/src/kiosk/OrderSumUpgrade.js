import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./OrderSumBuild.css"; // Reuse the same layout/styles
import PcUpgradeImg from "../assets/PCUpgrade.webp";
import "./PCCustomized.css"; // Reuse styles for consistency
import api from "../api/api";
import CompatibilityNotes from "../components/CompatibilityNotes/CompatibilityNotes";

// Helpers
const parsePrice = (item) => {
  if (!item || item.price === undefined || item.price === null) return 0;
  if (typeof item.price === "number") return item.price;
  if (typeof item.price === "string") {
    const n = parseFloat(item.price.replace(/[^0-9.,]/g, "").replace(/,/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
};

const ORDER = [
  "CPU",
  "Motherboard",
  "RAM",
  "Storage",
  "GPU",
  "PSU",
  "Cooling",
  "Case",
];

const idToCategory = {
  ram: "RAM",
  storage: "Storage",
  gpu: "GPU",
  processor: "CPU",
  cpu: "CPU",  // Added: also map 'cpu' category key
  motherboard: "Motherboard",
  psu: "PSU",
  "power supply": "PSU",  // Added: map category key to display name
  "cpu-cooler": "Cooling",
  chassis: "Case",
  case: "Case",  // Added: also map 'case' category key
};

// Map from category key (as stored in currentParts) to ID (as stored in selectedIds)
// eslint-disable-next-line no-unused-vars
const categoryToId = {
  'ram': 'ram',
  'storage': 'storage',
  'gpu': 'gpu',
  'cpu': 'processor',
  'motherboard': 'motherboard',
  'power supply': 'psu',
  'cpu-cooler': 'cpu-cooler',
  'case': 'chassis'
};

const catLabel = {
  CPU: "Processor",
  Motherboard: "Motherboard",
  RAM: "RAM",
  Storage: "Storage",
  GPU: "Graphics Card",       // Fixed: was 'graphcard'
  PSU: "Power Supply",        // Fixed: was 'power supply'
  Cooling: "CPU Cooler",      // Fixed: was 'cpu-cooler'
  Case: "Case",
};

function OrderSumUpgrade() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [selectedRemoveIndex, setSelectedRemoveIndex] = useState(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalMessage, setStockModalMessage] = useState('');
  const [isManualProcessing, setIsManualProcessing] = useState(false); // NEW: Manual processing mode

  // Measure header height to constrain scroll area similar to OrderSumBuild
  const titleRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // PRIORITY 3: Compatibility checking state
  // eslint-disable-next-line no-unused-vars
  const [compatibilityData, setCompatibilityData] = useState(null);
  const [loadingCompatibility, setLoadingCompatibility] = useState(false);

  const handleEmptyRedirect = useCallback(() => {
    navigate("/pc-upgrade");
  }, [navigate]);

  useEffect(() => {
    const measure = () => {
      if (titleRef.current) setHeaderHeight(titleRef.current.offsetHeight || 0);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // On mount: capture current upgrade selection as a completed order snapshot and clear working selection
  useEffect(() => {
    try {
      console.log('🔄 OrderSumUpgrade: Loading upgrade data from localStorage...');

      // NEW: Check if manual processing mode (skip button clicked)
      const manualMode = localStorage.getItem("pc-upgrade-manual") === 'true';
      setIsManualProcessing(manualMode);

      if (manualMode) {
        console.log('⏭️ Manual processing mode detected - showing order summary first');
        // 🔥 FIX: Show OrderSumUpgrade FIRST with consultation fee, THEN user clicks "Proceed to Payment"
        
        // Create a minimal valid order with 200 peso consultation fee
        const CONSULTATION_FEE = 200;
        const manualOrder = {
          id: Date.now(),
          items: [{
            id: null,
            name: 'PC Upgrade Consultation',
            price: CONSULTATION_FEE,
            category: 'service',
            description: 'Initial consultation fee for PC upgrade service. Actual upgrade parts will be added by staff after assessment.'
          }],
          categories: ['service'],
          quantity: 1,
          createdAt: new Date().toISOString(),
          isManualProcessing: true
        };

        localStorage.setItem("upgradeOrders", JSON.stringify([manualOrder]));
        setOrders([manualOrder]);
        
        // Clear the manual flag and all working data
        localStorage.removeItem("pc-upgrade-manual");
        localStorage.removeItem("pc-upgrade-selections");
        localStorage.removeItem("pc-upgrade-estimated");
        localStorage.removeItem("pc-upgrade-selected");
        
        // Stay on OrderSumUpgrade page - user will click "Proceed to Payment" button
        return;
      }

      // 🔥 CRITICAL FIX: Read from pc-upgrade-selections (ACTUAL parts to purchase)
      // NOT from pc-upgrade-current (which contains AI-estimated build)
      const selectedIds = JSON.parse(localStorage.getItem("pc-upgrade-selected")) || [];
      const upgradeParts = JSON.parse(localStorage.getItem("pc-upgrade-selections")) || {}; // Actual selections to buy
      const estimatedBuild = JSON.parse(localStorage.getItem("pc-upgrade-estimated")) || {}; // AI estimation (NOT ordered)
      let existing = JSON.parse(localStorage.getItem("upgradeOrders")) || [];

      console.log('📦 Selected IDs:', selectedIds);
      console.log('✅ Upgrade Parts (ACTUAL ORDER):', upgradeParts);
      console.log('📋 Estimated Build (display only, NOT ordered):', estimatedBuild);

      // 🔥 FIX: Use upgradeParts (actual selections) NOT currentParts/estimatedBuild
      const categoryKeys = Object.keys(upgradeParts);

      const categories = categoryKeys
        .map((key) => idToCategory[key])
        .filter(Boolean)
        .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

      const items = categoryKeys
        .map((key) => upgradeParts[key]) // Use upgradeParts, not currentParts!
        .filter(Boolean);

      console.log('📋 Categories:', categories);
      console.log('📋 Items to order:', items);
      console.log('💰 Item details:', items.map(item => ({ name: item.name, price: item.price })));

      // If there is a working selection, snapshot it
      if (Array.isArray(items) && items.length > 0) {
        const snapshot = {
          id: Date.now(),
          items, // array of selected products in order of categories
          categories, // parallel array of category keys for display
          quantity: 1,
          createdAt: new Date().toISOString(),
        };
        existing = [...existing, snapshot];
        localStorage.setItem("upgradeOrders", JSON.stringify(existing));
        console.log('✅ Saved upgrade order snapshot:', snapshot);

        // 🔥 CRITICAL FIX: Clear ALL working selections to avoid duplication
        localStorage.removeItem("pc-upgrade-selections"); // Clear actual selections
        localStorage.removeItem("pc-upgrade-estimated"); // Clear AI estimation
        localStorage.removeItem("pc-upgrade-selected"); // Clear selected categories
        localStorage.removeItem("pc-upgrade-manual"); // Clear manual processing flag
        console.log('✅ Cleared all working upgrade data after saving snapshot');
      }

      if (!existing || existing.length === 0) {
        console.log('⚠️ No upgrade orders found, redirecting to pc-upgrade');
        handleEmptyRedirect();
        return;
      }

      setOrders(existing);
      console.log('✅ Loaded', existing.length, 'upgrade orders');
    } catch (e) {
      console.error("❌ Failed to load upgrade orders", e);
      handleEmptyRedirect();
    }
  }, [handleEmptyRedirect]);

  // PRIORITY 3: Check compatibility when orders change
  useEffect(() => {
    const checkCompatibility = async () => {
      // Skip compatibility check for manual processing mode
      if (isManualProcessing || !orders || orders.length === 0) {
        setCompatibilityData(null);
        return;
      }

      setLoadingCompatibility(true);

      try {
        // 🔧 FIX: Format components to match backend schema (object with cpu/gpu/etc, not array)
        const formatComponent = (item, category) => {
          // 🔥 FIX: Ensure category is properly set and ID is valid
          const rawCategory = (category || item.category || item.type || '').toLowerCase();
          const itemId = item.id || 0;

          // Map to exact category format expected by backend schema validation
          const categoryMap = {
            'cpu': 'CPU',
            'processor': 'CPU',
            'gpu': 'GPU',
            'graphics card': 'GPU',
            'motherboard': 'Motherboard',
            'ram': 'RAM',
            'memory': 'RAM',
            'storage': 'Storage',
            'psu': 'PSU',
            'power supply': 'PSU',
            'case': 'Case',
            'cooling': 'Cooling',
            'cooler': 'Cooling',
            'monitor': 'Monitor',
            'keyboard': 'Keyboard',
            'mouse': 'Mouse',
            'headphones': 'Headphones',
            'speakers': 'Speakers',
            'webcam': 'Webcam'
          };

          return {
            id: itemId,
            name: item.name || item.upgradeItem || '',
            category: categoryMap[rawCategory] || category || '',
            brand: item.brand || '',
            price: typeof item.price === "number" ? item.price : parseFloat(String(item.price || '0').replace(/[^\d.]/g, "")) || 0,
            stock: item.stock || 0,
            specifications: item.specifications || {},
            image_url: item.image || item.image_url || '',
            description: item.description || '',
            performance_index: item.performance_index || 0,
            quantity: item.quantity || 1
          };
        };

        // Aggregate all components from all upgrade orders into categorized object
        const components = {};

        orders.forEach(order => {
          if (order?.items && Array.isArray(order.items)) {
            order.items.forEach((item, idx) => {
              if (item && item.name) {
                // Get category from the parallel categories array
                const category = (order.categories?.[idx] || item.category || 'other').toLowerCase();
                const formatted = formatComponent(item, category);

                // 🔥 FIX: Only add component if it has valid ID and category
                if (formatted.id && formatted.id > 0 && formatted.category) {
                  if (category === 'cpu') components.cpu = formatted;
                  else if (category === 'gpu' || category === 'graphics card') components.gpu = formatted;
                  else if (category === 'motherboard') components.motherboard = formatted;
                  else if (category === 'ram' || category === 'memory') components.ram = formatted;
                  else if (category === 'storage') components.storage = formatted;
                  else if (category === 'psu' || category === 'power supply') components.psu = formatted;
                  else if (category === 'case') components.case = formatted;
                  else if (category === 'cooling' || category === 'cooler') components.cooling = formatted;
                } else {
                  console.warn('⚠️ Skipping upgrade component without valid ID or category:', item.name, 'ID:', formatted.id, 'Category:', formatted.category);
                }
              }
            });
          }
        });

        if (Object.keys(components).length === 0) {
          setCompatibilityData(null);
          setLoadingCompatibility(false);
          return;
        }

        console.log('🔍 Formatted components for API:', components);

        // Only call API if we have critical components
        const hasCriticalComponents = components.cpu && components.motherboard;
        if (!hasCriticalComponents) {
          console.log('ℹ️ Skipping compatibility check - missing critical components');
          setCompatibilityData(null);
          setLoadingCompatibility(false);
          return;
        }

        // Call compatibility API using kioskAPI
        const response = await api.kiosk.checkFullBuildCompatibility(components);

        if (response.success) {
          // PHASE 9 FIX: Pass response.data.data (the actual compatibility analysis) not response.data (the wrapper)
          setCompatibilityData(response.data.data);
          console.log('✅ Compatibility data received:', response.data.data);
        }
      } catch (error) {
        console.log('ℹ️ Compatibility check not available:', error.response?.data?.message || error.message);
        // Don't block user flow if compatibility check fails
        setCompatibilityData(null);
      } finally {
        setLoadingCompatibility(false);
      }
    };

    // Debounce compatibility check
    const timeoutId = setTimeout(checkCompatibility, 500);
    return () => clearTimeout(timeoutId);
  }, [orders, isManualProcessing]);

  const orderSubtotal = (order) => {
    if (!order?.items) return 0;
    return order.items.reduce((sum, it) => sum + parsePrice(it), 0);
  };

  // NEW: For manual processing, total is always 0
  const grandTotal = isManualProcessing ? 0 : orders.reduce(
    (acc, order) => acc + orderSubtotal(order) * (order.quantity || 1),
    0
  );

  const updateQuantity = async (index, delta) => {
    // 🔒 STOCK VALIDATION: Check stock before increasing quantity
    if (delta > 0) {
      const order = orders[index];
      if (order?.items && Array.isArray(order.items)) {
        const newQuantity = (order.quantity || 1) + delta;

        // 🔥 CRITICAL FIX: Use PC Parts stock validation (like OrderSumCustom)
        // NOT pre-built validation - upgrade items are individual PC parts
        for (const item of order.items) {
          if (!item) continue;

          // Fetch real-time stock from API
          let itemStock = 0;
          try {
            // Get category from item or from parallel categories array
            const itemIdx = order.items.indexOf(item);
            let category = item.category || order.categories?.[itemIdx] || 'Unknown';
            
            // Normalize category name for API
            // The kiosk API expects standard category names like 'CPU', 'RAM', 'GPU', etc.
            category = category.trim();
            
            const stockResponse = await api.kiosk.getCategoryProducts(category, { limit: 1000 });
            const currentProduct = stockResponse.data.find(p => p.id === item.id || p.name === item.name);
            itemStock = currentProduct ? currentProduct.stock : 0;

            console.log('📦 Real-time stock check (Upgrade):', {
              component: item.name,
              category: category,
              cachedStock: item.stock,
              currentStock: itemStock
            });
          } catch (error) {
            console.error('⚠️ Failed to fetch stock for upgrade item, using cached value:', error);
            itemStock = item.stock || 0;
          }

          const itemName = item.name || '';

          // Calculate cumulative usage across ALL upgrade orders
          let totalUsedAcrossOrders = 0;
          orders.forEach((ord, ordIndex) => {
            if (ord?.items && Array.isArray(ord.items)) {
              ord.items.forEach(ordItem => {
                if (ordItem && ordItem.name === itemName) {
                  const qty = ordIndex === index ? newQuantity : (ord.quantity || 1);
                  totalUsedAcrossOrders += qty;
                }
              });
            }
          });

          if (totalUsedAcrossOrders > itemStock) {
            const componentName = item.name || item.categoryName || 'Unknown Component';
            setStockModalMessage(`Cannot add more. Component "${componentName}" has insufficient stock. Total needed across all upgrade packages: ${totalUsedAcrossOrders}. Available stock: ${itemStock}.`);
            setShowStockModal(true);
            console.warn('⚠️ Insufficient upgrade component stock:', {
              component: componentName,
              stock: itemStock,
              totalNeeded: totalUsedAcrossOrders,
              currentPackageQty: newQuantity
            });
            return;
          }
        }
      }
    }

    setOrders((prev) => {
      const next = prev.map((o, i) =>
        i === index ? { ...o, quantity: Math.max(1, (o.quantity || 1) + delta) } : o
      );
      localStorage.setItem("upgradeOrders", JSON.stringify(next));
      return next;
    });
  };

  const handleRemoveAtIndex = (index) => {
    setOrders((prev) => {
      const next = prev.filter((_, i) => i !== index);
      localStorage.setItem("upgradeOrders", JSON.stringify(next));
      if (next.length === 0) handleEmptyRedirect();
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
        {orders.map((order, index) => {
          const totalForOrder = orderSubtotal(order) * (order.quantity || 1);
          return (
            <div className="order-sum-build-orderGroup" key={order.id || index}>
              <div className="order-sum-build-itemContainer">
                <div className="order-sum-build-productWrapper">
                  <img src={PcUpgradeImg} alt="Upgrade Package" className="order-sum-build-productImage" />
                </div>
                <div className="order-sum-build-priceAndControls">
                  <div className="order-sum-build-priceContainer">
                    <p className="order-sum-build-productName">Your Upgrade Package #{index + 1}</p>
                    <p className="order-sum-build-productPrice">
                      ₱{totalForOrder.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <ul className="order-sum-build-components-list">
                  {(order.categories || []).map((catKey, idx) => {
                    const product = order.items?.[idx];
                    if (!product) return null;
                    return (
                      <li key={`${order.id}-${catKey}-${idx}`} className="order-sum-build-component-item">
                        <span className="order-sum-build-component-label">{catLabel[catKey] || catKey}:</span>{" "}
                        <span className="order-sum-build-component-value">{product.name}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* PRIORITY 3: PCPartPicker-Style Compatibility Report */}
      {!isManualProcessing && loadingCompatibility && (
        <div className="compatibility-loading">
          <div className="loading-spinner"></div>
          <span>Checking compatibility...</span>
        </div>
      )}

      {/* PCPartPicker-style Compatibility Notes */}
      {!isManualProcessing && orders.length > 0 && (
        <CompatibilityNotes
          buildComponents={orders.flatMap(order => order.items || [])}
          buildType="pc-upgrade"
        />
      )}

      <div className="order-sum-build-bottom-section">
        <div className="order-sum-build-process-container">
          <div className="order-sum-build-total-info">
            <h1 className="order-sum-build-total-label">Total</h1>
            <span className="order-sum-build-price">
              ₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {isManualProcessing && (
              <p style={{ fontSize: '14px', color: '#ffa500', fontStyle: 'italic', marginTop: '5px' }}>
                Manual Processing - Parts will be added by staff
              </p>
            )}
          </div>
          <div className="order-sum-build-action-buttons">
            <button
              className="order-sum-build-order-more"
              onClick={() => {
                // 🔥 CRITICAL FIX: Clear working upgrade data when starting new order
                localStorage.removeItem('pc-upgrade-selections'); // Clear actual parts
                localStorage.removeItem('pc-upgrade-selected'); // Clear category selections
                localStorage.removeItem('pc-upgrade-estimated'); // Clear AI estimation
                localStorage.removeItem('pc-upgrade-manual'); // Clear manual flag
                console.log('✅ Cleared upgrade working data, starting new upgrade order');
                navigate("/pc-upgrade", { state: { from: 'order-sum-upgrade' } });
              }}
              disabled={orders.length === 0}
            >
              Order More
            </button>
            <button
              className="order-sum-build-proceed-payment"
              onClick={() => navigate("/payment-window", { state: { from: 'pc-upgrade' } })}
              disabled={orders.length === 0}
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
}

export default OrderSumUpgrade;
