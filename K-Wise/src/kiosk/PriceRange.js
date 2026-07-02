import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./PriceRange.css";// Ensure you have the correct CSS file
import BuildPC from "../assets/BuildPC.webp";
import BronzeTier from "../assets/Bronze.webp";
import SilverTier from "../assets/Silver.webp";
import GoldTier from "../assets/Gold.webp";
import DiamondTier from "../assets/Diamond.webp";

const PriceRange = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Function to navigate to prebuilt PC pages
  const handleNavigation = (selectedCategory) => {
    // Retrieve selected purposes from URL params
    const searchParams = new URLSearchParams(window.location.search);
    const selectedPurposes = searchParams.get("purposes");
    const buildSource = location.state?.buildSource || searchParams.get("buildSource") || "preset";

    if (!selectedPurposes) {
      alert("No purposes selected. Please go back and select a purpose.");
      return;
    }

    // Navigate to ProductList with selected purposes and category
    navigate(`/product-list?purposes=${selectedPurposes}&category=${selectedCategory}&buildSource=${buildSource}`, {
      state: { buildSource }
    });
  };


  return (
    <div className="price-range-container">
      <div className="price-range-header">
        <img src={BuildPC} alt="Logo" className="price-range-built-logo" />
        <div className="price-range-title-container">
          <h1 className="price-title">PREBUILT PC'S</h1>
          <p className="price-range-subtitle">Tailored peak performance</p>
        </div>
      </div>

      <h3 className="select-tier">Select a tier</h3>

      <div className="price-grid">
        <div className="price-option" onClick={() => handleNavigation("Starter")}>
          <img src={BronzeTier} alt="Bronze Tier" className="tier-image" />
          <h1>Bronze Tier</h1>
          <h2>₱15,000 - ₱20,000</h2>
        </div>

        <div className="price-option" onClick={() => handleNavigation("Mid Tier")}>
          <img src={SilverTier} alt="Silver Tier" style={{ marginLeft: "30px" }} className="tier-image" />
          <h1>Silver Tier</h1>
          <h2>₱21,000 - ₱30,000</h2>
        </div>

        <div className="price-option" onClick={() => handleNavigation("High Tier")}>
          <img src={GoldTier} alt="Gold Tier" className="tier-image" />
          <h1>Gold Tier</h1>
          <h2>₱31,000 - ₱50,000</h2>
        </div>

        <div className="price-option" onClick={() => handleNavigation("Elite")}>
          <img src={DiamondTier} alt="Diamond Tier" className="tier-image" />
          <h1>Diamond Tier</h1>
          <h2>₱51,000 - ₱85,000</h2>
        </div>
      </div>
      <footer className="price-range-footer">
        <div className="price-range-action-buttons">
          <button className="price-range-cancel-order" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </footer>
    </div>
  );
};

export default PriceRange;
