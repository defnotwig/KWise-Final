import React from "react";
import { useNavigate } from "react-router-dom";
import "./PrebuiltOptions.css";

import BuildPC from "../assets/BuildPC.webp";
import present from '../assets/PrebuiltOptions/present.svg';
import community from '../assets/PrebuiltOptions/community.svg';


const PrebuiltOptions = () => {
  const navigate = useNavigate();

  const handlePresetClick = () => {
    // Navigate to tier selection with preset source
    // 🔥 FIX: Pass clearCart flag to indicate fresh start
    navigate("/tier-selection", { state: { buildSource: "preset", clearCart: true } });
  };

  const handleCommunityClick = () => {
    // Navigate to tier selection with community source
    // 🔥 FIX: Pass clearCart flag to indicate fresh start
    navigate("/tier-selection", { state: { buildSource: "community", clearCart: true } });
  };

  const handleBack = () => {
    navigate("/pcbuild-category");
  };

  return (
    <div className="prebuilt-options-container">
      {/* Logo */}
      <div className="prebuilt-options-logo">
        <img src={BuildPC} alt="Logo" className="tier-selection-logo" />
      </div>

      {/* Title */}
      <h1 className="prebuilt-options-title">PREBUILT OPTIONS</h1>
      <p className="prebuilt-options-subtitle">Select a build option</p>

      {/* Options Grid */}
      <div className="prebuilt-options-grid">
        {/* Preset Option */}
        <button className="prebuilt-option-card" onClick={handlePresetClick}>
          <div className="option-icon-container-prebuilt">
            <img src={present} alt="Preset" className="prebuilt-option-icon" />
          </div>
          <div className="prebuilt-option-text">
            <h2 className="prebuilt-option-title">PRESET</h2>
            <p className="prebuilt-option-subtitle">Crafted by our Experts</p>
          </div>
        </button>

        {/* Community Option */}
        <button className="prebuilt-option-card" onClick={handleCommunityClick}>
          <div className="option-icon-container-prebuilt">
            <img src={community} alt="Community" className="prebuilt-option-icon" />
          </div>
          <div className="prebuilt-option-text">
            <h2 className="prebuilt-option-title">COMMUNITY</h2>
            <p className="prebuilt-option-subtitle">Crafted by our Community</p>
          </div>
        </button>
      </div>

      {/* Back Button */}
      <button className="prebuilt-options-back-button" onClick={handleBack}>
        Back
      </button>
    </div>
  );
};

export default PrebuiltOptions;
