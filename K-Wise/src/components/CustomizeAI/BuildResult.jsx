import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/CustomizeAI.css';
import api from '../../api/api';
import aicustom from '../../assets/PCBuildCategory/aicustom.svg';

/**
 * BuildResult - Displays the generated PC build or error message
 * 
 * Success state: Shows all components with gradient borders
 * Error state: Shows error icon and reasons with action buttons
 */
const BuildResult = ({ buildResult, buildError, assessment }) => {
  const navigate = useNavigate();

  /**
   * Navigate to Edit Build page
   */
  const handleEditBuild = () => {
    navigate('/customize-ai/edit-build', {
      state: {
        buildComponents: buildResult,
        assessment: assessment
      }
    });
  };

  /**
   * Navigate directly to checkout (peripherals page)
   */
  const handleCheckout = () => {
    console.log('🎯 BuildResult - Checkout clicked');
    console.log('📦 buildResult:', buildResult);
    console.log('🔑 buildResult keys:', Object.keys(buildResult || {}));
    
    // Store build in localStorage for persistence
    localStorage.setItem('aiCustomizedBuild', JSON.stringify(buildResult));
    
    // Navigate to peripherals prompt page (ask if user wants peripherals)
    navigate('/peripherals-prompt', {
      state: {
        from: 'customize-ai', // ✅ Explicit source for routing
        fromAI: true,
        buildComponents: buildResult,
        assessment: assessment
      }
    });
  };

  /**
   * Try again - go back to step 1 and reset all state
   * Using window.location for full page reload to reset CustomizeAI component state
   */
  const handleTryAgain = () => {
    window.location.href = '/customize-ai';
  };

  /**
   * Build from scratch - go to manual customizer
   */
  const handleBuildFromScratch = () => {
    navigate('/pc-customized');
  };

  // ERROR STATE
  if (buildError) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h1 className="error-title">{buildError.message || 'Unable to Generate Build'}</h1>
        <p className="error-description">
          We couldn't generate a PC build recommendation. This could be because:
        </p>
        <ul className="error-reasons">
          {buildError.reasons && buildError.reasons.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
        <div className="action-buttons-row">
          <button className="wizard-btn btn-secondary" onClick={handleTryAgain}>
            ← Try Again
          </button>
          <button className="wizard-btn btn-primary" onClick={handleBuildFromScratch}>
            Build from Scratch →
          </button>
        </div>
      </div>
    );
  }

  // LOADING STATE
  if (!buildResult) {
    return (
      <div className="loading-page">
        <div className="loading-content">
          <div className="loading-spinner">
            <svg className="spinner-svg" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00E083" />
                  <stop offset="100%" stopColor="#6ECAF1" />
                </linearGradient>
              </defs>
              <circle 
                className="spinner-circle" 
                cx="50" 
                cy="50" 
                r="40"
                stroke="url(#gradient)"
              />
            </svg>
          </div>
          <h2 className="loading-title">Generating Your Perfect PC Build</h2>
          <p className="loading-subtitle">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  // SUCCESS STATE - Show Build Components
  const componentOrder = ['cpu', 'cooling', 'motherboard', 'ram', 'storage', 'gpu', 'case', 'psu'];
  const componentLabels = {
    cpu: 'Processor',
    cooling: 'CPU Cooler',
    motherboard: 'Motherboard',
    ram: 'Memory (RAM)',
    storage: 'Storage',
    gpu: 'Graphics Card',
    case: 'Chassis',
    psu: 'Power Supply'
  };

  const buildComponents = componentOrder
    .map(key => ({
      category: componentLabels[key],
      component: buildResult[key]
    }))
    .filter(item => item.component);

  // Calculate total price
  const totalPrice = buildComponents.reduce((sum, item) => {
    return sum + (parseFloat(item.component?.price) || 0);
  }, 0);

  // Calculate AI confidence (mock calculation based on components found)
  const confidence = Math.min(95, Math.round((buildComponents.length / 8) * 100));

  return (
    <div className="build-result-container">
      {/* Header */}
      <div className="build-result-header">
        <div className="wizard-icon-container">
          <img src={aicustom} alt="AI Customization Icon" className="wizard-icon" />
        </div>
        <h1 className="build-result-title">
          Your Complete PC Build
        </h1>
        <p className="build-result-subtitle">
          Based on your input, here's your generated build
        </p>
        <div className="ai-confidence-badge">
          <span>AI Confidence: {confidence}%</span>
                    <span style={{ 
            marginLeft: '24px', 
            fontSize: '0.9em', 
            fontWeight: '600',
            background: 'linear-gradient(135deg, #00E083 0%, #6ECAF1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Total: ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Components List */}
      <div className="build-components-list">
        {buildComponents.map((item, index) => {
          const imageUrl = item.component.image_url 
            ? api.utils.getFullImageUrl(item.component.image_url)
            : null;

          return (
            <div key={index} className="build-component-wrapper">
              <div className="build-component-category">
                <h1>
                  {item.category}
                </h1>
              </div>
              <div className="build-component-item">
                <div className="build-component-image-container">
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={item.component.name} 
                      className="build-component-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '48px' }}>📦</div>
                  )}
                </div>
                <div className="build-component-details">
                  <p className="build-component-name">{item.component.name}</p>
                  <p className="build-component-price">
                    ₱{parseFloat(item.component.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
          <div className="build-action-buttons-row">
          <button className="build-btn-secondary" onClick={handleEditBuild}>
            Edit Build
          </button>
          <button className="build-btn-primary" onClick={handleCheckout}>
            Checkout
          </button>
        </div>
    </div>
  );
};

export default BuildResult;