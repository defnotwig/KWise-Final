import React from "react";
import { useNavigate } from "react-router-dom"; // Navigation hook
import logoComponent from '../assets/PCParts/logoComponent.svg';
import Customized from "../assets/Customized.webp";
import PreBuilt from "../assets/PreBuilt.webp";
import "./PCBuildCategory.css";

const PCBuildCategory = () => {
  const navigate = useNavigate();

  const handleNavigation = (category) => {
    // Navigate based on category selection
    if (category === "customized-manual") {
      // Manual customization - existing flow, navigate to PC Customizer
      navigate("/pc-customized");
    } else if (category === "prebuilt") {
      // Pre-built PC selection - navigate to preset/community options
      navigate("/prebuilt-options");
    }
  };

  return (
    <div className="pc-build-container">
      <div className="build-logo">
        <img src={logoComponent} alt="Logo" className="logo" />
      </div>

      <h1 className="build-title">CUSTOMIZED OR PREBUILT?</h1>

      <div className="build-options three-options">
        {/* Option 1: Manual Customization (top-left) */}
        <button
          className="build-option top-card"
          onClick={() => handleNavigation("customized-manual")}
        >
          <img src={Customized} alt="Customized Manually" className="customized-category" />
          <h1 className="category-title-build">CUSTOMIZE</h1>
          <h1 className="sub-title">YOUR OWN PC</h1>
        </button>

        {/* Option 2: Pre-Built (top-right) */}
        <button
          className="build-option top-card"
          onClick={() => handleNavigation("prebuilt")}
        >
          <img src={PreBuilt} alt="PreBuilt" className="prebuilt-category" />
          <h1 className="category-title-build">PREBUILT</h1>
          <h1 className="sub-title">PEAK PERFORMANCE</h1>
        </button>
      </div>

      <button onClick={() => navigate("/transaction")} className="back-button-category">
        Back
      </button>

    </div>
  );
};

export default PCBuildCategory;
