import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import installment from '../assets/PaymentWindow/installment.svg';
import './PaymentMethods.css';
import chinabank from "../assets/PaymentWindow/chinabank.svg";
import hsbc from "../assets/PaymentWindow/hsbc.svg";
import bpi from "../assets/PaymentWindow/bpi.svg";
import homecredit from "../assets/PaymentWindow/homecredit.svg";
import metrobank from "../assets/PaymentWindow/metrobank.svg";
import psbank from "../assets/PaymentWindow/psbank.svg";

const InstallmentPayment = () => {
  const navigate = useNavigate();
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [showPlanSelection, setShowPlanSelection] = useState(false);

  const banks = [
    { id: 'chinabank', name: 'China Bank', icon: chinabank },
    { id: 'hsbc', name: 'HSBC', icon: hsbc },
    { id: 'bpi', name: 'BPI', icon: bpi },
    { id: 'homecredit', name: 'Home Credit', icon: homecredit },
    { id: 'metrobank', name: 'Metrobank', icon: metrobank },
    { id: 'psbank', name: 'PSBank', icon: psbank },
    { id: 'other', name: 'Other banks' }
  ];

  const installmentPlans = [
    { id: '12', label: '12/0 installment' },
    { id: '24', label: '24/0 installment' },
    { id: '36', label: '36/0 installment' }
  ];

  const handleBack = () => {
    if (showPlanSelection) {
      // Go back to bank selection
      setShowPlanSelection(false);
      setSelectedPlan('');
    } else {
      // Go back to payment window
      navigate(-1);
    }
  };

  const handleBankSelect = (bankId) => {
    setSelectedBank(bankId);
    // Automatically show plan selection after bank is chosen
    setTimeout(() => {
      setShowPlanSelection(true);
    }, 300);
  };

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);

    // FIX: Directly navigate when plan is selected
    const planLabel = installmentPlans.find(p => p.id === planId)?.label;
    const selectedBankName = banks.find(b => b.id === selectedBank)?.name;

    localStorage.setItem('selectedPaymentMethod', JSON.stringify({
      method: 'Installment',
      bank: selectedBankName,
      plan: planLabel
    }));

    // Navigate back to PaymentWindow which will create the order
    setTimeout(() => {
      navigate('/payment-window', {
        state: {
          autoCreateOrder: true,
          paymentMethod: `Installment (${selectedBankName} - ${planLabel})`
        },
        replace: true
      });
    }, 200);
  };

  return (
    <div className="payment-method-container">

      {/* Installment Icon with Glow Effect */}
      <div className="payment-icon-wrapper">
        <img src={installment} alt="Installment" className="payment-large-icon installment-glow" />
      

      {/* Title */}
      <h1 className="payment-method-title">INSTALLMENT</h1>
      <p className="payment-method-subtitle">
        {!showPlanSelection ? 'Choose you bank' : 'Choose installment plan'}
      </p>
      </div>

      {/* Bank Selection OR Plan Selection */}
      {!showPlanSelection ? (
        <div className="installment-selection-buttons">
          {banks.map((bank) => (
            <button
              key={bank.id}
              className={`installment-option-button ${selectedBank === bank.id ? 'selected' : ''}`}
              onClick={() => handleBankSelect(bank.id)}
            >
              <img src={bank.icon} className="bank-icon" />
              <span className="bank-name">{bank.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="plan-selection-buttons">
          {installmentPlans.map((plan) => (
            <button
              key={plan.id}
              className={`plan-option-button ${selectedPlan === plan.id ? 'selected' : ''}`}
              onClick={() => handlePlanSelect(plan.id)}
              style={{
                color: selectedPlan === plan.id ? '#041f1f' : '#fff',
                border: '4px solid #00E083',
              }}
            >
              {plan.label}
            </button>
          ))}
        </div>
      )}

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
          border: '4px solid #034C3B',
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

export default InstallmentPayment;


