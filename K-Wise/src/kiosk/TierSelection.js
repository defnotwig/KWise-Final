import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./TierSelection.css";
import BuildPC from "../assets/BuildPC.webp";
import BronzeTier from "../assets/Bronze.webp";
import SilverTier from "../assets/Silver.webp";
import GoldTier from "../assets/Gold.webp";
import DiamondTier from "../assets/Diamond.webp";

const TierSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get buildSource from navigation state (preset or community)
  const buildSource = location.state?.buildSource || "preset";
  
  // 🔥 FIX: Only clear prebuiltCart if explicitly requested (fresh start from PCBuildCategory)
  // Do NOT clear when user clicks "Order More" from OrderSumBuild
  React.useEffect(() => {
    const clearCart = location.state?.clearCart;
    if (clearCart === true) {
      console.log('🧹 TierSelection: Clearing prebuiltCart for fresh start');
      localStorage.removeItem('prebuiltCart');
    } else {
      console.log('📦 TierSelection: Preserving existing prebuiltCart for Order More');
    }
  }, [location.state]);

  const handleTierSelection = (tier) => {
    // Navigate to product list with tier and buildSource
    navigate("/product-list", { 
      state: { 
        tier: tier,
        buildSource: buildSource 
      } 
    });
  };

  const handleBack = () => {
    navigate("/prebuilt-options");
  };

  return (
    <div className="tier-selection-container">
      <div className="tier-selection-header">
        <img src={BuildPC} alt="Logo" className="tier-selection-logo" />
        <div className="tier-selection-title-container">
          <h1 className="tier-selection-title">What is your budget?</h1>
        </div>
      </div>

      <h3 className="tier-selection-prompt">Select a tier</h3>

      <div className="tier-selection-grid">
        <div className="tier-selection-option" onClick={() => handleTierSelection("Starter")}>
          <img src={BronzeTier} alt="Bronze Tier" className="tier-selection-image" />
          <div className="tier-selection-overlay">
          <h1 className="tier-selection-name">BRONZE TIER</h1>
          <h2 className="tier-selection-price">₱15,000 - ₱20,000</h2>
          </div> 
        </div>

        <div className="tier-selection-option" onClick={() => handleTierSelection("Mid Tier")}>
          <img src={SilverTier} alt="Silver Tier" className="tier-selection-image" />
          <div className="tier-selection-overlay">
          <h1 className="tier-selection-name">SILVER TIER</h1>
          <h2 className="tier-selection-price">₱21,000 - ₱30,000</h2>
          </div>
        </div>

        <div className="tier-selection-option" onClick={() => handleTierSelection("High Tier")}>
          <img src={GoldTier} alt="Gold Tier" className="tier-selection-image" />
          <div className="tier-selection-overlay">
          <h1 className="tier-selection-name">GOLD TIER</h1>
          <h2 className="tier-selection-price">₱31,000 - ₱50,000</h2>
          </div>
        </div>

        <div className="tier-selection-option" onClick={() => handleTierSelection("Elite")}>
          <img src={DiamondTier} alt="Diamond Tier" className="tier-selection-image" />
          <div className="tier-selection-overlay">
          <h1 className="tier-selection-name">DIAMOND TIER</h1>
          <h2 className="tier-selection-price">₱51,000 - ₱85,000</h2>
          </div>
        </div>

        <footer className="tier-selection-footer">
        <button className="tier-selection-back-button" onClick={handleBack}>
          Back
        </button>
      </footer>
      </div>
    </div>
  );
};

export default TierSelection;
