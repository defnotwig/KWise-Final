import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./OnlineBanking.css";
import onlineBank from "../assets/PaymentWindow/onlineBank.svg";

function OnlineBanking() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBankSelection = (bankType) => {
    // Generate queue number
    const lastQueueNumber = parseInt(localStorage.getItem("lastQueueNumber") || "0", 10);
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
        paymentMethod: "online-banking",
        bankType: bankType
      }
    });
  };

  return (
    <div className="online-banking-container">
      <img src={onlineBank} alt="Logo" className="logo" />
      <h1 className="banking-title">Select your Bank</h1>

      <div className="bank-options">
        <button className="bank-button" onClick={() => handleBankSelection("mastercard")}>
          MASTER CARD
        </button>
        <button className="bank-button" onClick={() => handleBankSelection("visa")}>
          VISA
        </button>
        <button className="bank-button" onClick={() => handleBankSelection("gcash")}>
          GCash
        </button>
      </div>

      <button className="back-button-bank" onClick={() => navigate(-1)}>
        Back
      </button>
    </div>
  );
}

export default OnlineBanking;
