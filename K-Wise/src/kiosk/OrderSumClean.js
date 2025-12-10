import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PCClean from '../assets/PCCleaning.webp'; 
import "./OrderSumBuild.css"; // Reuse the clean layout/styles from OrderSumBuild
import "./PCCustomized.css"; // Use PCCustomized modal styling

function OrderSumClean() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeIndex, setRemoveIndex] = useState(null);
  const [assessmentData, setAssessmentData] = useState(null);

  // Header measurement for scroll area
  const titleRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const measure = useCallback(() => {
    if (titleRef.current) {
      setHeaderHeight(titleRef.current.offsetHeight || 0);
    }
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  useEffect(() => {
    // Migrate any older single-item storage into the list format
    const single = JSON.parse(localStorage.getItem("cleaningOrder"));
    let list = JSON.parse(localStorage.getItem("cleaningOrders")) || [];

    if (single && single.name) {
      const snapshot = {
        id: Date.now(),
        tier: single,
        quantity: 1,
        createdAt: new Date().toISOString(),
      };
      list = [...list, snapshot];
      localStorage.removeItem("cleaningOrder");
      localStorage.setItem("cleaningOrders", JSON.stringify(list));
    }

    if (!Array.isArray(list) || list.length === 0) {
      navigate("/pc-cleaning");
      return;
    }

    setOrders(list);
    
    // Load assessment data (shared across all orders in this session)
    const assessment = JSON.parse(localStorage.getItem('cleaningAssessment') || 'null');
    setAssessmentData(assessment);
    
    console.log('📋 OrderSumClean: Loaded assessment data:', assessment);
    console.log('📦 OrderSumClean: Loaded', list.length, 'cleaning orders');
  }, [navigate]);

  const parsePrice = useCallback((price) => {
    if (typeof price === "number") return price;
    if (typeof price === "string") {
      const n = parseFloat(price.replace(/[^0-9.,]/g, "").replace(/,/g, ""));
      return isNaN(n) ? 0 : n;
    }
    return 0;
  }, []);

  const orderTotal = useCallback((order) => (order.quantity || 1) * parsePrice(order?.tier?.price), [parsePrice]);

  const grandTotal = useMemo(() => orders.reduce((sum, o) => sum + orderTotal(o), 0), [orders, orderTotal]);

  const setQuantity = (index, delta) => {
    setOrders(prev => {
      const next = prev.map((o, i) =>
        i === index ? { ...o, quantity: Math.max(1, (o.quantity || 1) + delta) } : o
      );
      localStorage.setItem("cleaningOrders", JSON.stringify(next));
      return next;
    });
  };

  const confirmRemoveAt = (index) => {
    setOrders(prev => {
      const next = prev.filter((_, i) => i !== index);
      localStorage.setItem("cleaningOrders", JSON.stringify(next));
      return next;
    });
    
    // Check if this was the last order and navigate after state update
    setOrders(current => {
      if (current.length === 0) {
        // Use setTimeout to navigate after render completes
        setTimeout(() => navigate("/pc-cleaning"), 0);
      }
      return current;
    });
    
    setShowRemoveModal(false);
    setRemoveIndex(null);
  };

  return (
    <div className="order-sum-build-container">
      <h1 className="order-sum-build-title" ref={titleRef}>ORDER SUMMARY</h1>

      <div
        className="order-sum-build-content"
        style={{ maxHeight: `calc(100vh - ${headerHeight}px - 200px)` }}
      >
        {orders.map((order, index) => (
          <div className="order-sum-build-orderGroup" key={order.id || index}>
            <div className="order-sum-build-itemContainer">
              <div className="order-sum-build-productWrapper">
                <img src={PCClean} alt="PC Cleaning" className="order-sum-build-productImage" />
              </div>
              <div className="order-sum-build-priceAndControls">
                <div className="order-sum-build-priceContainer">
                  <p className="order-sum-build-productName">{order?.tier?.name || 'PC Cleaning'}</p>
                  <p className="order-sum-build-productPrice">
                    ₱{orderTotal(order).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="order-sum-build-quantityControls">
                  <button
                    className="order-sum-build-quantityBtn"
                    disabled={(order.quantity || 1) <= 1}
                    onClick={() => setQuantity(index, -1)}
                  >−</button>
                  <span className="order-sum-build-quantityDisplay">{order.quantity || 1}</span>
                  <button
                    className="order-sum-build-quantityBtn"
                    onClick={() => setQuantity(index, 1)}
                  >+</button>
                  <button
                    className="order-sum-build-removeBtn"
                    onClick={() => { setRemoveIndex(index); setShowRemoveModal(true); }}
                  >Remove Item</button>
                </div>
              </div>
            </div>

            <div className="order-sum-build-components-summary">
              <h2 className="order-sum-build-components-title">Inclusions</h2>
              <ul className="order-sum-build-components-list">
                {(order?.tier?.details?.inclusion || []).map((inc, idx) => (
                  <li key={idx} className="order-sum-build-component-item-inclusion">
                    <span className="order-sum-build-component-label" style={{ fontSize: '25px'}}>• </span>{" "}
                    <span className="order-sum-build-component-value">{inc}</span>
                  </li>
                ))}
                {order?.tier?.details?.completion && (
                  <li className="order-sum-build-component-completion">
                    <span className="order-sum-build-component-label" style={{ fontSize: '25px', color: '#00E083'}}>Completion:</span>{" "}
                    <span className="order-sum-build-component-value">{order.tier.details.completion}</span>
                  </li>
                )}
                
                {/* Assessment Details - Plain text format */}
                {assessmentData && (
                  <>
                    <li className="order-sum-build-component-item" style={{ marginTop: '32px', marginBottom: '20px', fontSize: '32px', fontWeight: '600' }}>
                      <span className="order-sum-build-component-label">Assessment Details</span>
                    </li>
                    <li className="order-sum-build-component-item">
                      <span className="order-sum-build-component-label"style={{ fontSize: '25px', color: '#00E083'}}>Cleaned Before:</span>{" "}
                      <span className="order-sum-build-component-value">{assessmentData.hasCleaned ? 'Yes' : 'No'}</span>
                    </li>
                    {assessmentData.lastCleaned && (
                      <li className="order-sum-build-component-item">
                        <span className="order-sum-build-component-label"style={{ fontSize: '25px', color: '#00E083'}}>Last Cleaned:</span>{" "}
                        <span className="order-sum-build-component-value">{assessmentData.lastCleaned}</span>
                      </li>
                    )}
                    {assessmentData.cleaningType && (
                      <li className="order-sum-build-component-item">
                        <span className="order-sum-build-component-label"style={{ fontSize: '25px', color: '#00E083'}}>Previous Type:</span>{" "}
                        <span className="order-sum-build-component-value">{assessmentData.cleaningType.charAt(0).toUpperCase() + assessmentData.cleaningType.slice(1)}</span>
                      </li>
                    )}
                    {assessmentData.pcAge && (
                      <li className="order-sum-build-component-item">
                        <span className="order-sum-build-component-label"style={{ fontSize: '25px', color: '#00E083'}}>PC Build/Purchase:</span>{" "}
                        <span className="order-sum-build-component-value">{assessmentData.pcAge}</span>
                      </li>
                    )}
                    {/* Display Selected Issues */}
                    {assessmentData.underlyingIssues && assessmentData.selectedIssues && assessmentData.selectedIssues.length > 0 && (
                      <li className="order-sum-build-component-item" style={{ marginTop: '10px' }}>
                        <span className="order-sum-build-component-label"style={{ fontSize: '25px', color: '#00E083'}}>Selected Issues:</span>{" "}
                        <span className="order-sum-build-component-value">{assessmentData.selectedIssues.join(', ')}</span>
                      </li>
                    )}
                  </>
                )}
                
                {/* PC Re-Case Status - Plain text format */}
                {order.reCaseRequested && (
                  <>
                    <li className="order-sum-build-component-item" style={{ marginTop: '10px' }}>
                      <span className="order-sum-build-component-label"style={{ fontSize: '25px', color: '#00E083'}}>PC Re-Case:</span>{" "}
                      <span className="order-sum-build-component-value">Requested (staff will assist with selection)</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="order-sum-build-bottom-section">
        <div className="order-sum-build-process-container">
          <div className="order-sum-build-total-info">
            <h1 className="order-sum-build-total-label">Total</h1>
            <span className="order-sum-build-price">
              ₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="order-sum-build-action-buttons">
            <button
              className="order-sum-build-order-more"
              onClick={() => navigate("/pc-cleaning", { state: { from: 'ordersum-clean', preserveSelection: true } })}
              disabled={orders.length === 0}
            >
              Order More
            </button>
            <button
              className="order-sum-build-proceed-payment"
              onClick={() => navigate("/payment-window", { state: { from: 'pc-cleaning' } })}
              disabled={orders.length === 0}
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>

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
                onClick={() => confirmRemoveAt(removeIndex)}
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

export default OrderSumClean;
