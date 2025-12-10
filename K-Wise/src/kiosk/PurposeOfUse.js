import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PurposeOfUse.css";
import "./PCUpgrade.css";
import logoComponent from "../assets/PCParts/logoComponent.svg";
import purposeofuse from "../assets/PurposeOfUse/purposeofuse.svg"; // Ensure you have the correct image

const PurposeOfUse = () => {
  const navigate = useNavigate();
  const [selectedPurposes, setSelectedPurposes] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);

  // Handle checkbox selection
  const handleSelection = (purpose) => {
    setSelectedPurposes((prev) =>
      prev.includes(purpose)
        ? prev.filter((item) => item !== purpose) // Remove if already selected
        : [...prev, purpose] // Add if not selected
    );
  };

  // Navigate to PCBuildCategory with selected purposes as query params
  const handleNavigation = () => {
    if (selectedPurposes.length === 0) {
      alert("Please select at least one purpose.");
      return;
    }

    // Navigate to PCBuildCategory and pass selected purposes
    navigate(`/priceRange?purposes=${selectedPurposes.join(",").toLowerCase()}`);
  };

  // Back: prompt before discarding changes
  const handleBack = () => {
    setShowConfirm(true);
  };

  // Confirm back: clear any existing build orders and go back to category selection
  const handleConfirmBack = () => {
    try {
      localStorage.removeItem("cart");
    } catch (e) {
      // ignore storage errors
    }
    navigate("/pcbuild-category");
  };

  // Cancel back: close modal and stay on page
  const handleCancelBack = () => {
    setShowConfirm(false);
  };


  // Dynamic background color based on selection
  const getBoxStyle = (purpose) => {
    const colors = {
      Gaming: "#003FE0", // Blue
      Work: "#E0005D", // Pink
      Multimedia: "#E05A00", // Orange
    };
    return {
      backgroundColor: selectedPurposes.includes(purpose)
        ? colors[purpose]
        : "#00E083", // Default green if not selected
    };
  };

  return (
    <div className="purpose-container">
      <div className="logo">
        <img src={logoComponent} alt="Logo" className="logo-image" />
      </div>

      <h1 className="purpose-title">Where will you use the PC</h1>
      <p className="purpose-subtitle">Select all that counts</p>
      <img src={purposeofuse} alt="Purposes" className="purpose-image" />

      {/* Purpose selection options */}

      <div className="purpose-options">
        {/* Gaming */}
        <div
          className="purpose-option"
          style={getBoxStyle("Gaming")}
          onClick={() => handleSelection("Gaming")}
        >
          <input
            type="checkbox"
            id="gaming"
            checked={selectedPurposes.includes("Gaming")}
            onChange={() => handleSelection("Gaming")}
          />
          <label htmlFor="gaming">GAMING</label>
        </div>

        {/* Work */}
        <div
          className="purpose-option"
          style={getBoxStyle("Work")}
          onClick={() => handleSelection("Work")}
        >
          <input
            type="checkbox"
            id="work"
            checked={selectedPurposes.includes("Work")}
            onChange={() => handleSelection("Work")}
          />
          <label htmlFor="work">WORK</label>
        </div>

        {/* Multimedia */}
        <div
          className="purpose-option"
          style={getBoxStyle("Multimedia")}
          onClick={() => handleSelection("Multimedia")}
        >
          <input
            type="checkbox"
            id="multimedia"
            checked={selectedPurposes.includes("Multimedia")}
            onChange={() => handleSelection("Multimedia")}
          />
          <label htmlFor="multimedia">MULTIMEDIA</label>
        </div>
      </div>

      <div className="back-continue">
        <button onClick={handleBack} className="back-button-purpose">
          Back
        </button>
        <button className="continue-button" onClick={handleNavigation}>
          Enter
        </button>
      </div>

      {showConfirm && (
        <div className="pcu-modal-overlay">
          <div className="pcu-modal-background"></div>
          <div className="pcu-modal">
            <h2 className="pcu-modal-title">Going back may discard your changes. Continue?</h2>
            <div className="pcu-modal-actions">
              <button className="pcu-modal-back-btn" onClick={handleCancelBack}>NO</button>
              <button className="pcu-modal-confirm-btn" onClick={handleConfirmBack}>YES</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurposeOfUse;