import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PCUpgradePreview.css';
import PcUpgrade from "../assets/PCUpgrade.webp";
import api from '../api/api'; // 🔥 FIX #2: Import API utilities for image URL handling

// Import component icons
import CPU1 from "../assets/CPU1.webp";
import Motherboard2 from "../assets/Motherboard2.webp";
import GPU2 from "../assets/GPU1.webp";
import RAM1 from "../assets/RAM1.webp";
import Storage2 from "../assets/Storage2.webp";
import PSU2 from "../assets/PSU2.webp";
import CPUCooler from "../assets/CPUCooler.webp";
import SystemUnit1 from "../assets/SystemUnit1.webp";
import matched from "../assets/PCUpgradePreview/matched.svg";

const PCUpgradePreview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get estimated build data from location state
  const {
    estimatedBuild = {},
    buildConfidence = 0,
    estimateData = {},
    aiSuggestedCategories = [],
    selectedUpgrades = [],
    currentParts = {}
  } = location.state || {};

  // Category display order (standard PC build order)
  const categoryOrder = ['CPU', 'Cooling', 'Motherboard', 'RAM', 'Storage', 'GPU', 'Case', 'PSU'];

  // Map category names to icons
  const categoryIcons = {
    'CPU': CPU1,
    'Cooling': CPUCooler,
    'Motherboard': Motherboard2,
    'RAM': RAM1,
    'Storage': Storage2,
    'GPU': GPU2,
    'Case': SystemUnit1,
    'PSU': PSU2
  };

  // Format estimated build for display
  const buildComponents = categoryOrder
    .map(category => {
      const product = currentParts[category];
      const estimation = estimatedBuild[category];
      
      // 🔥 FIX #2: Get proper image URL using API utility (like other pages)
      let imageUrl = null;
      if (product?.image_url) {
        // Use getFullImageUrl to convert relative path to full URL
        imageUrl = api.utils.getFullImageUrl(product.image_url);
      } else if (product?.imageUrl) {
        imageUrl = api.utils.getFullImageUrl(product.imageUrl);
      } else if (product?.image) {
        imageUrl = api.utils.getFullImageUrl(product.image);
      }
      
      return {
        category,
        // Priority: Real DB image → Category fallback icon
        icon: imageUrl || categoryIcons[category] || CPU1,
        name: product?.name || estimation || `Unknown ${category}`,
        price: product?.price || 0,
        hasProduct: !!product,
        estimation: estimation,
        productData: product // Store full product data
      };
    })
    .filter(item => item.estimation || item.hasProduct); // Only show estimated or matched items

  const handleBack = () => {
    navigate('/pc-upgrade', {
      state: {
        step: 'estimate-build',
        preserveData: true
      }
    });
  };

  const handleNext = () => {
    navigate('/pc-upgrade', {
      state: {
        step: 'select-upgrades',
        estimatedBuild,
        buildConfidence,
        estimateData,
        aiSuggestedCategories,
        selectedUpgrades,
        currentParts
      }
    });
  };

  // Calculate total estimated price (only for matched products)
  const totalPrice = buildComponents
    .filter(item => item.hasProduct)
    .reduce((sum, item) => sum + (item.price || 0), 0);

  return (
    <div className="pc-upgrade-preview-container">
      {/* Content Section */}
      <div className="preview-content">
        <img src={PcUpgrade} alt="Logo" className="pcu-estimate-logo-image" />
        <div className="preview-intro">
          <h2 className="preview-title">YOUR ESTIMATED PC BUILD</h2>
          <p className="preview-desc">
            Based on your input, here's what we estimate your PC has
          </p>
          
          {/* Confidence Badge */}
          {buildConfidence > 0 && (
            <div className="confidence-badge">
              <span className="confidence-label">AI Confidence:</span>
              <span className="confidence-value">{Math.round(buildConfidence * 100)}%</span>
            </div>
          )}
        </div>

        {/* Build Summary Info */}
        <div className="build-summary-info">
          <div className="preview-summary-item">
            <span className="preview-summary-label">Usage:</span>
            <span className="preview-summary-value">{estimateData.usage || 'General'} |</span>
          </div>
          <div className="preview-summary-item">
            <span className="preview-summary-label">Year:</span>
            <span className="preview-summary-value">{estimateData.yearPurchased || 'Unknown'} |</span>
          </div>
          {estimateData.budget && (
            <div className="preview-summary-item">
              <span className="preview-summary-label">Budget:</span>
              <span className="preview-summary-value">₱{parseInt(estimateData.budget).toLocaleString()} |</span>
            </div>
          )}
        </div>

        {/* Components List (PC Customizer Style) - 🔥 FIX #3: Scrollable */}
        <div className="preview-components-scrollable">
          <div className="preview-components-container">
            {buildComponents.map((component, index) => (
              <div key={component.category} className="preview-component-step-container">
                {/* 🔥 FIX #1: Remove subtitle, add category to title in italic */}
                <span className="preview-category-label">{component.category}</span>
                <div className={`preview-component-step ${component.hasProduct ? 'has-product' : 'estimated-only'}`}>
                  <div className="preview-step-icon">
                    {/* 🔥 FIX #2: Use real product image with proper URL handling */}
                    <img src={component.icon} alt={component.category} />
                  </div>
                  <div className="preview-step-details">
                    <p className="preview-step-title">
                      {component.name} 
                    </p>
                    {component.hasProduct && component.price > 0 && (
                      <p className="preview-step-price">
                        ₱{component.price.toLocaleString()}
                      </p>
                    )}
                    {!component.hasProduct && (
                      <p className="preview-step-estimation">
                        Estimated: {component.estimation}
                      </p>
                    )}
                  </div>
                  
                  {/* Status Badge */}
                  <div className="preview-status-badge">
                    <img src={matched} alt="Matched" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 🔥 FIX #3: Fixed bottom section - No scrolling needed */}
        <div className="preview-fixed-bottom">
          {/* Total Price (if matched products exist) */}
          {totalPrice > 0 && (
            <div className="preview-total-container">
              <div className="preview-total-label">Estimated Total Value:</div>
              <div className="preview-total-price">₱{totalPrice.toLocaleString()}</div>
            </div>
          )}

          {/* 🔥 FIX #3: Shorter Important Notice - One sentence */}
          <div className="preview-notice-container">
            <div className="preview-notice-icon">⚠️</div>
            <div className="preview-notice-content">
              <p className="preview-notice-text">
                This build estimate is <strong>not 100% accurate</strong> — please verify components with our staff at the counter before proceeding with your upgrade.
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="preview-navigation-buttons">
            <button className="preview-back-btn" onClick={handleBack}>
              Back
            </button>
            <button className="preview-next-btn" onClick={handleNext}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PCUpgradePreview;
