import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import WhiteLogo from "../assets/WhiteLogo.webp";
import Cash from "../assets/Cash.webp";
import Bank from "../assets/OnlineBank.webp";
import Credit from "../assets/CreditCard.webp";
import Installment from "../assets/Installment.webp";
import "./PaymentWindow.css";
import { kioskAPI } from "../services/api";

const PaymentWindow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper function to get customer name from localStorage or prompt
  const getCustomerName = () => {
    const storedName = localStorage.getItem('customerName');
    if (storedName) return storedName;
    
    const name = prompt('Please enter your name for the order:');
    if (name && name.trim()) {
      localStorage.setItem('customerName', name.trim());
      return name.trim();
    }
    return null;
  };

  // Helper function to prepare order data from localStorage
  const prepareOrderData = (paymentMethod) => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const customOrders = JSON.parse(localStorage.getItem("customOrders")) || [];
    const cleaningOrders = JSON.parse(localStorage.getItem("cleaningOrders")) || [];
    const upgradeOrders = JSON.parse(localStorage.getItem("upgradeOrders")) || [];
    const diagnosticIssues = JSON.parse(localStorage.getItem("diagnosticIssues")) || [];

    // Determine transaction origin - prioritize location.state for accuracy
    let transactionOrigin = "pc-parts"; // default
    if (location.state?.from) {
      transactionOrigin = location.state.from;
    } else {
      // Fallback detection
      if (customOrders.length > 0) {
        transactionOrigin = "pc-customized";
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

    // Get customer name
    const customerName = getCustomerName();
    if (!customerName) {
      throw new Error('Customer name is required');
    }

    // Prepare items array and calculate total
    let items = [];
    let totalAmount = 0;

    if (transactionOrigin === "pc-customized" && customOrders.length > 0) {
      // For PC Customized, flatten the custom orders into individual items
      items = customOrders.flatMap(order =>
        order.items.filter(Boolean).map(item => ({
          id: item.id || null,
          name: item.name || item.component || 'Custom Component',
          price: parseFloat(item.price || 0),
          quantity: (item.quantity || 1) * (order.quantity || 1),
          totalPrice: parseFloat(item.price || 0) * (item.quantity || 1) * (order.quantity || 1),
          category: item.category || 'custom'
        }))
      );
    } else if (transactionOrigin === "prebuilt-pc" && cart.length > 0) {
      // For PreBuilt PC
      items = cart.map(order => ({
        id: order.product?.id || null,
        name: order.product?.name || 'PreBuilt PC',
        price: parseFloat(order.product?.price || 0),
        quantity: order.quantity || 1,
        totalPrice: (parseFloat(order.product?.price || 0) + (order.addon ? parseFloat(order.addon.price || 0) : 0)) * (order.quantity || 1),
        category: 'prebuilt'
      }));
    } else if (transactionOrigin === "pc-cleaning" && cleaningOrders.length > 0) {
      // For PC Cleaning Service
      items = cleaningOrders.map(service => ({
        id: null,
        name: service.tier?.name || service.name || 'PC Cleaning Service',
        price: parseFloat(service.tier?.price || service.price || 0),
        quantity: service.quantity || 1,
        totalPrice: parseFloat(service.tier?.price || service.price || 0) * (service.quantity || 1),
        category: 'service'
      }));
    } else if (transactionOrigin === "pc-upgrade" && upgradeOrders.length > 0) {
      // For PC Upgrade Service
      items = upgradeOrders.flatMap(order =>
        order.items.map(item => ({
          id: item.id || null,
          name: item.name || item.component || 'Upgrade Component',
          price: parseFloat(item.price || 0),
          quantity: (item.quantity || 1) * (order.quantity || 1),
          totalPrice: parseFloat(item.price || 0) * (item.quantity || 1) * (order.quantity || 1),
          category: item.category || 'upgrade'
        }))
      );
    } else if (transactionOrigin === "pc-diagnostic" && diagnosticIssues.length > 0) {
      // For PC Diagnostic Service
      items = diagnosticIssues.map(issue => ({
        id: null,
        name: issue.category || 'PC Diagnostic Service',
        price: 500, // Default diagnostic fee
        quantity: 1,
        totalPrice: 500,
        category: 'service'
      }));
    } else {
      // For regular PC Parts
      items = cart.map(item => ({
        id: item.id || null,
        name: item.name || 'PC Component',
        price: parseFloat(item.price || 0),
        quantity: item.quantity || 1,
        totalPrice: parseFloat(item.price || 0) * (item.quantity || 1),
        category: item.category || 'component'
      }));
    }

    // Calculate total amount
    totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    return {
      customerName,
      customerEmail: localStorage.getItem('customerEmail') || '',
      items,
      totalAmount,
      paymentMethod,
      serviceType: transactionOrigin,
      transactionOrigin
    };
  };

  // Create order through backend API with queue management
  const createOrderWithQueue = async (paymentMethod) => {
    setLoading(true);
    setError('');
    
    try {
      const orderData = prepareOrderData(paymentMethod);
      console.log('Creating order with queue management:', orderData);

      // Call backend API to create order with queue assignment
      const response = await kioskAPI.createOrder(orderData);
      
      if (response.data.success) {
        const createdOrder = response.data.data;
        console.log('Order created successfully with queue:', createdOrder);

        // Store the actual backend response for receipt generation
        localStorage.setItem("lastOrder", JSON.stringify([{
          orderIdFormatted: createdOrder.orderIdFormatted,
          transactionIdFormatted: createdOrder.transactionIdFormatted,
          queueNumber: createdOrder.queueNumber,
          customerName: orderData.customerName,
          totalAmount: createdOrder.totalAmount,
          items: orderData.items,
          paymentMethod,
          transactionOrigin: orderData.transactionOrigin,
          backendOrder: createdOrder
        }]));
        
        localStorage.setItem("orderOrigin", orderData.transactionOrigin);
        localStorage.setItem("queueNumber", createdOrder.queueNumber);
        localStorage.setItem("orderIdFormatted", createdOrder.orderIdFormatted);
        localStorage.setItem("transactionIdFormatted", createdOrder.transactionIdFormatted);

        // Clear cart and order data after successful creation
        localStorage.removeItem("cart");
        localStorage.removeItem("customOrders");
        localStorage.removeItem("cleaningOrders");
        localStorage.removeItem("upgradeOrders");
        localStorage.removeItem("diagnosticIssues");

        // Navigate to queuing display with real queue information
        navigate("/queuing-display", {
          state: {
            from: orderData.transactionOrigin,
            paymentMethod,
            queueNumber: createdOrder.queueNumber,
            orderIdFormatted: createdOrder.orderIdFormatted,
            transactionIdFormatted: createdOrder.transactionIdFormatted,
            backendOrder: createdOrder
          }
        });
      } else {
        throw new Error(response.data.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setError(error.message || 'Failed to create order. Please try again.');
      setLoading(false);
    }
  };

  const handleCashPayment = () => createOrderWithQueue('Cash');
  const handleOnlineBankPayment = () => createOrderWithQueue('Online Banking');
  const handleCreditCardPayment = () => createOrderWithQueue('Credit Card');
      if (customOrders.length > 0) {
        transactionOrigin = "pc-customized";
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

    if (transactionOrigin === "pc-customized" && customOrders.length > 0) {
      orderData = customOrders.flatMap(order =>
        order.items.filter(Boolean).map(item => ({
          ...item,
          quantity: (item.quantity || 1) * (order.quantity || 1)
        }))
      );
    } else if (transactionOrigin === "prebuilt-pc" && cart.length > 0) {
      orderData = cart;
    } else if (transactionOrigin === "pc-cleaning" && cleaningOrders.length > 0) {
      orderData = cleaningOrders;
    } else if (transactionOrigin === "pc-upgrade" && upgradeOrders.length > 0) {
      orderData = upgradeOrders;
    } else if (transactionOrigin === "pc-diagnostic" && diagnosticIssues.length > 0) {
      orderData = diagnosticIssues;
    } else {
      orderData = cart;
    }

    localStorage.setItem("lastOrder", JSON.stringify(orderData));
    localStorage.setItem("orderOrigin", transactionOrigin);

    navigate("/online-banking", {
      state: {
        from: transactionOrigin
      }
    });
  };

  const handleCreditCardPayment = () => {
    // Store order data before navigating (same logic as cash payment)
    let orderData = [];
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const customOrders = JSON.parse(localStorage.getItem("customOrders")) || [];
    const cleaningOrders = JSON.parse(localStorage.getItem("cleaningOrders")) || [];
    const upgradeOrders = JSON.parse(localStorage.getItem("upgradeOrders")) || [];
    const diagnosticIssues = JSON.parse(localStorage.getItem("diagnosticIssues")) || [];

    let transactionOrigin = location.state?.from || "pc-parts";
    if (!location.state?.from) {
      // Only use localStorage detection as absolute fallback
      if (customOrders.length > 0) {
        transactionOrigin = "pc-customized";
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

    if (transactionOrigin === "pc-customized" && customOrders.length > 0) {
      orderData = customOrders.flatMap(order =>
        order.items.filter(Boolean).map(item => ({
          ...item,
          quantity: (item.quantity || 1) * (order.quantity || 1)
        }))
      );
    } else if (transactionOrigin === "prebuilt-pc" && cart.length > 0) {
      orderData = cart;
    } else if (transactionOrigin === "pc-cleaning" && cleaningOrders.length > 0) {
      orderData = cleaningOrders;
    } else if (transactionOrigin === "pc-upgrade" && upgradeOrders.length > 0) {
      orderData = upgradeOrders;
    } else if (transactionOrigin === "pc-diagnostic" && diagnosticIssues.length > 0) {
      orderData = diagnosticIssues;
    } else {
      orderData = cart;
    }

    localStorage.setItem("lastOrder", JSON.stringify(orderData));
    localStorage.setItem("orderOrigin", transactionOrigin);

    navigate("/credit-card", {
      state: {
        from: transactionOrigin
      }
    });
  };

  return (
    <div className="payment-container">
      <div className="logo-container">
        <img src={WhiteLogo} alt="Logo" className="logo" />
      </div>

      <h1 className="payment-title">How would you like to pay?</h1>

      <div className="payment-grid">
        <button className="payment-card" onClick={handleCashPayment}>
          <img src={Cash} alt="Cash" className="payment-icon" />
          <span>CASH</span>
        </button>

        <button className="payment-card" onClick={handleOnlineBankPayment}>
          <img src={Bank} alt="Online Bank" className="payment-icon" />
          <span>ONLINE BANK</span>
        </button>

        <button className="payment-card" onClick={handleCreditCardPayment}>
          <img src={Credit} alt="Credit Card" className="payment-icon" />
          <span>CREDIT CARD</span>
        </button>

        <button className="payment-card">
          <img src={Installment} alt="Installment" className="payment-icon" />
          <span>INSTALLMENT</span>
        </button>
      </div>

      <button onClick={() => navigate(-1)} className="back-button-payment">
        Back
      </button>
    </div>
  );
};

export default PaymentWindow;
