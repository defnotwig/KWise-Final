import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import creditCard from "../assets/PaymentWindow/creditCard.svg";
import visa from "../assets/PaymentWindow/visa.svg";
import mastercard from "../assets/PaymentWindow/mastercard.svg";
import './PaymentMethods.css';

const CreditCardPayment = () => {
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState('');

  const cards = [
    { id: 'mastercard', name: 'Master Card', icon: mastercard},
    { id: 'visa', name: '', icon: visa }
  ];

  const handleBack = () => {
    navigate(-1);
  };

  const handleCardSelect = (cardId) => {
    setSelectedCard(cardId);

    // FIX: Directly navigate to payment window with payment method
    const selectedCardName = cards.find(c => c.id === cardId)?.name;

    localStorage.setItem('selectedPaymentMethod', JSON.stringify({
      method: 'Credit Card',
      cardType: selectedCardName
    }));

    // Navigate back to PaymentWindow which will create the order
    setTimeout(() => {
      navigate('/payment-window', {
        state: {
          autoCreateOrder: true,
          paymentMethod: `Credit Card (${selectedCardName})`
        },
        replace: true
      });
    }, 200);
  };

  return (
    <div className="payment-method-container">


      {/* Credit Card Icon with Glow Effect */}
      <div className="payment-icon-wrapper">
        <img src={creditCard} alt="Credit Card" className="payment-large-icon credit-glow" />
      

      {/* Title */}
      <h1 className="payment-method-title">CREDIT CARD</h1>
      <p className="payment-method-subtitle">Choose you card</p>
      </div>
      {/* Card Selection Buttons */}
      <div className="card-selection-buttons">
        {cards.map((card) => (
          <button
            key={card.id}
            className={`card-option-button ${selectedCard === card.id ? 'selected' : ''}`}
            onClick={() => handleCardSelect(card.id)}
            style={{
              background: selectedCard === card.id ? '#00E083' : 'transparent',
              color: selectedCard === card.id ? '#041f1f' : '#fff',
              border: '4px solid #00E083',
              transition: 'all 0.3s ease'
            }}
          >
            <img src={card.icon} alt={card.name} className="card-icon" />
            <span className="card-name">{card.name}</span>
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

export default CreditCardPayment;


