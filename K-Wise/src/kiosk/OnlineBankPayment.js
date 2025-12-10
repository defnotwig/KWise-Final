import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PaymentMethods.css';
import onlineBank from "../assets/PaymentWindow/onlineBank.svg";
import gcash from "../assets/PaymentWindow/gcash.svg";
import visa from "../assets/PaymentWindow/visa.svg";
import mastercard from "../assets/PaymentWindow/mastercard.svg";

const OnlineBankPayment = () => {
  const navigate = useNavigate();
  const [selectedBank, setSelectedBank] = useState('');

  const banks = [
    { id: 'mastercard', name: 'Master Card', icon: mastercard },
    { id: 'visa', name: '', icon: visa },
    { id: 'gcash', name: 'GCash', icon: gcash }
  ];

  const handleBack = () => {
    navigate(-1);
  };

  const handleBankSelect = (bankId) => {
    setSelectedBank(bankId);

    // FIX: Directly navigate to payment window with payment method (no autoCreateOrder)
    // This prevents duplicate order creation
    const selectedBankName = banks.find(b => b.id === bankId)?.name;

    // Store for payment creation
    localStorage.setItem('selectedPaymentMethod', JSON.stringify({
      method: 'Online Banking',
      bank: selectedBankName
    }));

    // Navigate back to PaymentWindow which will create the order
    setTimeout(() => {
      navigate('/payment-window', {
        state: {
          autoCreateOrder: true,
          paymentMethod: `Online Banking (${selectedBankName})`
        },
        replace: true // Replace history
      });
    }, 200); // Small delay for visual feedback
  };

  return (
    <div className="payment-method-container">


      {/* Bank Icon with Glow Effect */}
      <div className="payment-icon-wrapper">
        <img src={onlineBank} alt="Online Bank" className="payment-large-icon bank-glow" />
      

      {/* Title */}
      <h1 className="payment-method-title">ONLINE BANK</h1>
      <p className="payment-method-subtitle">Choose your bank</p>
      </div>

      {/* Bank Selection Buttons */}
      <div className="bank-selection-buttons">
        {banks.map((bank) => (
          <button
            key={bank.id}
            className={`bank-option-button ${selectedBank === bank.id ? 'selected' : ''}`}
            onClick={() => handleBankSelect(bank.id)}
            style={{
              background: selectedBank === bank.id ? '#00E083' : 'transparent',
              color: selectedBank === bank.id ? '#041f1f' : '#fff',
              border: '2px solid #00E083',
              transition: 'all 0.3s ease'
            }}
          >
            <img src={bank.icon} alt={bank.name} className="bank-icon" />
            <span className="bank-name">{bank.name}</span>
          </button>
        ))}
      </div>

      {/* Back Button - Match PaymentWindow */}
      <button
        className="back-button-method"
        onClick={handleBack}
        style={{
          fontSize: '24px',
          fontWeight: '600',
          background: 'transparent',
          width: '325px',
          height: '80px',
          padding: '12px 24px',
          border: '2px solid #00E083',
          cursor: 'pointer',
          color: '#fff',
          transition: 'all 0.3s ease'
        }}
      >
        Back
      </button>
    </div>
  );
};

export default OnlineBankPayment;


