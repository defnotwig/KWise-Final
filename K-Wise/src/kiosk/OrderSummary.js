import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import CompatibilityNotes from "../components/CompatibilityNotes/CompatibilityNotes";
import { buildCompatibilityPayload, resolveProductImage } from "../utils/kioskContracts";
import "./OrderSummary.css";

function OrderSummary() {
  const [cartItems, setCartItems] = useState([]);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [compatibilityData, setCompatibilityData] = useState(null);
  const [loadingCompatibility, setLoadingCompatibility] = useState(false);

  // Stock validation modal state
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalMessage, setStockModalMessage] = useState('');

  const navigate = useNavigate();

  // Check if cart is empty on mount
  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    if (storedCart.length === 0) {
      navigate("/pc-parts");
    }
    setCartItems(storedCart);
  }, [navigate]);

  // PRIORITY 3: Check compatibility when cart changes
  useEffect(() => {
    const checkCompatibility = async () => {
      if (cartItems.length === 0) {
        setCompatibilityData(null);
        return;
      }

      setLoadingCompatibility(true);
      try {
        // 🔧 FIX: Format components to match backend schema (price as number, proper structure)
        const formatComponent = (item) => {
          if (!item) return null;

          // 🚨 CRITICAL FIX: Ensure ID is valid (>= 1) - backend requires this
          const itemId = item.id || item.product_id;
          if (!itemId || itemId < 1) {
            console.warn('⚠️ Component missing valid ID, skipping:', item.name || 'Unknown');
            return null; // Skip items without valid IDs
          }

          // Parse price to number
          const price = typeof item.price === "number"
            ? item.price
            : Number.parseFloat(String(item.price).replaceAll(/[^\d.]/g, "")) || 0;

          // Map to exact category format expected by backend schema validation
          const rawCategory = (item.category || '').toLowerCase();
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
            id: itemId, // Guaranteed to be >= 1
            name: item.name || '',
            category: categoryMap[rawCategory] || item.category || '',
            brand: item.brand || '',
            price: price,
            stock: item.stock || 0,
            specifications: item.specifications || {},
            image_url: item.image || item.image_url || '',
            description: item.description || '',
            performance_index: item.performance_index || 0,
            quantity: item.quantity || 1
          };
        };

        // Build components object from cart
        const components = {};
        cartItems.forEach(item => {
          // 🔥 FIX: Skip null/undefined items entirely
          if (!item) return;

          const category = item.category?.toLowerCase();
          const formatted = formatComponent(item);

          // 🚨 Skip null components (those without valid IDs)
          if (!formatted) return;

          if (category === 'cpu') components.cpu = formatted;
          else if (category === 'gpu' || category === 'graphics card') components.gpu = formatted;
          else if (category === 'motherboard') components.motherboard = formatted;
          else if (category === 'ram' || category === 'memory') components.ram = formatted;
          else if (category === 'storage') components.storage = formatted;
          else if (category === 'psu' || category === 'power supply') components.psu = formatted;
          else if (category === 'case') components.case = formatted;
          else if (category === 'cooling' || category === 'cooler') components.cooling = formatted;
        });

        console.log('🔍 Formatted components for API:', components);
        console.log('📦 Total components being sent:', Object.keys(components).length);

        // Call compatibility API using kiosk module
        const response = await api.kiosk.checkFullBuildCompatibility(components);

        if (response.success) {
          setCompatibilityData(response.data);
        }
      } catch (error) {
        console.error('Compatibility check failed:', error);
        // Don't block user flow if compatibility check fails
      } finally {
        setLoadingCompatibility(false);
      }
    };

    checkCompatibility();
  }, [cartItems]);

  // Ensure price is a number
  const getPrice = (item) => {
    if (!item || !item.price) return 0;
    return typeof item.price === "number"
      ? item.price
      : Number.parseFloat(item.price.replaceAll(/[^\d.]/g, "")) || 0;
  };

  const updateQuantity = (index, amount) => {
    const updatedCart = [...cartItems];
    if (updatedCart[index] && updatedCart[index] !== null) {
      const item = updatedCart[index];
      const newQuantity = (item.quantity || 1) + amount;

      // 🔒 STOCK VALIDATION: Check stock before increasing quantity
      if (amount > 0) {
        const itemStock = item.stock || 0;
        if (newQuantity > itemStock) {
          setStockModalMessage(`Cannot add more. Maximum available stock is ${itemStock}.`);
          setShowStockModal(true);
          console.warn('⚠️ Stock limit reached:', {
            name: item.name,
            stock: itemStock,
            currentQuantity: item.quantity,
            requestedAmount: amount
          });
          return;
        }
      }

      updatedCart[index].quantity = newQuantity;
      if (updatedCart[index].quantity < 1) updatedCart[index].quantity = 1;
      setCartItems(updatedCart);
      localStorage.setItem("cart", JSON.stringify(updatedCart));
    }
  };

  const requestRemoveItem = (index) => {
    setItemToRemove(index);
    setShowRemoveModal(true);
  };

  const confirmRemoveItem = () => {
    if (itemToRemove === null) return;
    const updatedCart = cartItems.filter((_, i) => i !== itemToRemove);
    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    setShowRemoveModal(false);
    setItemToRemove(null);
    if (updatedCart.length === 0) {
      navigate("/pc-parts");
    }
  };

  const cancelRemoveItem = () => {
    setShowRemoveModal(false);
    setItemToRemove(null);
  };

  const handleOrderMore = () => {
    navigate("/pc-parts");
  };

  const handleProceedToCheckout = () => {
    navigate("/future-upgrades", {
      state: {
        from: "pc-parts",
        cartItems: cartItems
      }
    });
  };

  // Compute total price
  const totalPrice = cartItems.filter(item => item !== null).reduce((acc, item) =>
    acc + getPrice(item) * (item.quantity || 1), 0
  );
  const compatibilityCartItems = cartItems.filter((item) => (
    item && Object.keys(buildCompatibilityPayload([item], { arrayCategories: true })).length > 0
  ));

  return (
    <div className="order-summary-container">
      <div className="order-summary-title-container">
        <h1 className="order-summary-title">ORDER SUMMARY</h1>
      </div>


      {cartItems.length === 0 ? (
        <div className="empty-cart-container">
          <p className="emptyCart">Your cart is empty</p>
          <button
            className="return-button"
            onClick={() => navigate("/pc-parts")}
          >
            Return to Shopping
          </button>
        </div>
      ) : (
        <>
          <div className="order-summary-items-wrapper">
            {cartItems.filter(item => item !== null).map((item, index) => {
              const itemPrice = getPrice(item);
              const subtotal = itemPrice * (item.quantity || 1);

              return (
                <div key={index} className="order-summary-item-card">
                  {/* Product Image Wrapper */}
                  <div className="order-summary-product-wrapper">
                    <img
                      src={resolveProductImage(item)}
                      alt={item.name}
                      className="order-summary-product-image"
                    />
                  </div>

                  {/* Product Info and Controls */}
                  <div className="order-summary-price-and-controls">
                    {/* Product Name and Price */}
                    <div className="order-summary-price-container">
                      <p className="order-summary-product-name">{item.name}</p>
                      <p className="order-summary-product-price">
                        ₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Quantity and Remove Controls */}
                    <div className="order-summary-quantity-controls">
                      <div className="quantity-button">
                        <button
                          onClick={() => updateQuantity(index, -1)}
                          className="order-summary-quantity-btn"
                          disabled={(item.quantity || 1) <= 1}
                        >
                          −
                        </button>
                        <span className="order-summary-quantity-display">{item.quantity || 1}</span>
                        <button
                          onClick={() => updateQuantity(index, 1)}
                          className="order-summary-quantity-btn"
                        >
                          +
                        </button>
                      </div>
                      <div className="quantity-remove-container">
                        <button
                          onClick={() => requestRemoveItem(index)}
                          className="order-summary-remove-btn"
                        >
                          Remove Item
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PRIORITY 3: PCPartPicker-Style Compatibility Display */}
          {loadingCompatibility && (
            <div className="compatibility-loading">
              <div className="loading-spinner"></div>
              <span>Checking compatibility...</span>
            </div>
          )}

          {/* PCPartPicker-style Compatibility Notes - ABOVE FOOTER */}
          <CompatibilityNotes
            buildComponents={compatibilityCartItems}
            buildType="pc-parts"
          />

          <div className="order-summary-footer">
            <div className="order-summary-process-container">
              <div className="order-summary-total-info">
                <h1 className="order-summary-total-label">Total</h1>
                <span className="order-summary-price">
                  ₱{totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="order-summary-action-buttons">
                <button
                  className="order-summary-order-more"
                  onClick={handleOrderMore}
                >
                  Order More
                </button>
                <button
                  className="order-summary-proceed-checkout"
                  onClick={handleProceedToCheckout}
                >
                  Proceed to Payment
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Remove Confirmation Modal - Matches Stock Modal Design */}
      {showRemoveModal && (
        <div className="pc-customized-modal-overlay">
          <div className="pc-customized-modal-background"></div>
          <div className="pc-customized-modal">
            <div className="pc-customized-modal-icon" />
            <h2 className="pc-customized-modal-title">
              <span>Are you sure you want to remove this item from your cart?</span>
            </h2>
            <div className="pc-customized-modal-buttons">
              <button
                onClick={cancelRemoveItem}
                className="pc-customized-modal-btn"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveItem}
                className="pc-customized-modal-btn yes"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Validation Modal - Matches ProductPage.js design */}
      {showStockModal && (
        <div className="pc-customized-modal-overlay">
          <div className="pc-customized-modal-background"></div>
          <div className="pc-customized-modal">
            <div className="pc-customized-modal-icon" />
            <h2 className="pc-customized-modal-title">
              <span>{stockModalMessage}</span>
            </h2>
            <div className="pc-customized-modal-buttons">
              <button
                className="pc-customized-modal-btn yes"
                onClick={() => setShowStockModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderSummary;
