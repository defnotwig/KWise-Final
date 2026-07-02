import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./CreditCard.css";
import creditCard from "../assets/PaymentWindow/creditCard.svg";

function CreditCard() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleCardSelection = (cardType) => {
    // Generate queue number
    const lastQueueNumber = Number.parseInt(localStorage.getItem("lastQueueNumber") || "0", 10);
    const newQueueNumber = lastQueueNumber + 1;

    localStorage.setItem("lastQueueNumber", newQueueNumber);
    localStorage.setItem("queueNumber", newQueueNumber);

    // Determine transaction origin (prefer slug passed from PaymentWindow)
    const existingOrigin = localStorage.getItem("orderOrigin");
    let transactionOrigin = location.state?.from || existingOrigin || "pc-parts";
    // Preserve origin set upstream; only set if missing
    if (!existingOrigin) {
      localStorage.setItem("orderOrigin", transactionOrigin);
    }

    // Navigate to queuing display with transaction origin
    navigate("/queuing-display", {
      state: {
        from: transactionOrigin,
        paymentMethod: "credit-card",
        cardType: cardType
      }
    });
  };

  return (
    <div className="credit-card-container">
      <img src={creditCard} alt="Logo" className="logo" />
      <h1 className="title">Select your Bank</h1>

      <div className="card-options">
        <button className="card-button" onClick={() => handleCardSelection("mastercard")}>
          MASTER CARD
        </button>
        <button className="card-button" onClick={() => handleCardSelection("visa")}>
          VISA
        </button>
      </div>

      <button className="back-button-credit" onClick={() => navigate(-1)}>
        Back
      </button>
    </div>
  );
}

export default CreditCard;