import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/networkConfig';
import './PCBuilder.css';

const API_BASE = `${getApiBaseUrl()}/builder`;

// Build steps in order
const BUILD_STEPS = [
  { key: 'CPU', label: 'Processor', icon: '🖥️', optional: false },
  { key: 'Cooling', label: 'CPU Cooler', icon: '❄️', optional: false },
  { key: 'Motherboard', label: 'Motherboard', icon: '📟', optional: false },
  { key: 'RAM', label: 'Memory (RAM)', icon: '💾', optional: false },
  { key: 'Storage', label: 'Storage Drive', icon: '💿', optional: false },
  { key: 'GPU', label: 'Graphics Card', icon: '🎮', optional: true },
  { key: 'Case', label: 'PC Case', icon: '📦', optional: false },
  { key: 'PSU', label: 'Power Supply', icon: '⚡', optional: false }
];

const PCBuilder = () => {
  const navigate = useNavigate();

  // Core builder state
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedParts, setSelectedParts] = useState({});
  const [availableOptions, setAvailableOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // AI compatibility state
  const [aiEnabled, setAiEnabled] = useState(true);
  const [compatibilityResults, setCompatibilityResults] = useState(null);
  const [buildScore, setBuildScore] = useState(100);

  // Fetch available options for current step
  useEffect(() => {
    fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, selectedParts]);

  const fetchOptions = async () => {
    setLoading(true);
    setError(null);

    try {
      const currentStepKey = BUILD_STEPS[currentStep].key;
      console.log(`🔍 Fetching options for ${currentStepKey}...`);

      const response = await axios.get(`${API_BASE}/available/${currentStepKey}`, {
        params: {
          selectedParts: JSON.stringify(selectedParts)
        }
      });

      const options = response.data.data || response.data;
      console.log(`✅ Found ${options.length} compatible ${currentStepKey} options`);

      setAvailableOptions(options);
    } catch (err) {
      console.error('❌ Error fetching options:', err);
      setError(`Failed to load options: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPart = async (part) => {
    const currentStepKey = BUILD_STEPS[currentStep].key;
    
    console.log(`✅ Selected ${currentStepKey}:`, part.name);

    // Update selected parts
    const newSelectedParts = {
      ...selectedParts,
      [currentStepKey]: part
    };
    setSelectedParts(newSelectedParts);

    // Run compatibility check after each selection
    if (aiEnabled) {
      await runCompatibilityCheck(newSelectedParts);
    }

    // Move to next step (skip GPU if CPU has integrated graphics and user wants to skip)
    goToNextStep(newSelectedParts);
  };

  const handleSkipGPU = () => {
    const cpu = selectedParts.CPU;
    if (cpu?.integrated_gpu && BUILD_STEPS[currentStep].key === 'GPU') {
      console.log('⏭️ Skipping GPU (CPU has integrated graphics)');
      goToNextStep(selectedParts, true);
    }
  };

  const goToNextStep = (parts = selectedParts, skipGPU = false) => {
    let nextStep = currentStep + 1;

    // Skip GPU step if CPU has integrated graphics and we're skipping
    if (skipGPU && nextStep < BUILD_STEPS.length && BUILD_STEPS[nextStep].key === 'GPU') {
      nextStep++;
    }

    if (nextStep < BUILD_STEPS.length) {
      setCurrentStep(nextStep);
    } else {
      // Build complete - show summary
      showBuildSummary(parts);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const runCompatibilityCheck = async (parts) => {
    try {
      console.log('🤖 Running AI compatibility check...');

      const response = await axios.post(`${API_BASE}/check-compatibility`, {
        build: parts
      });

      const result = response.data.data || response.data;
      setCompatibilityResults(result);
      setBuildScore(result.score);

      console.log(`✅ Compatibility Score: ${result.score}/100`);
      console.log(`⚠️ Warnings: ${result.warnings.length}`);

      if (result.warnings.length > 0) {
        result.warnings.forEach(w => {
          console.warn(`[${w.severity.toUpperCase()}] ${w.message}`);
        });
      }
    } catch (err) {
      console.error('❌ Compatibility check failed:', err);
    }
  };

  const showBuildSummary = (parts) => {
    navigate('/build-summary', { state: { selectedParts: parts, compatibilityResults } });
  };

  const handleRemovePart = (stepKey) => {
    const newSelectedParts = { ...selectedParts };
    delete newSelectedParts[stepKey];
    setSelectedParts(newSelectedParts);

    // Re-run compatibility check
    if (aiEnabled) {
      runCompatibilityCheck(newSelectedParts);
    }
  };

  const getTotalPrice = () => {
    return Object.values(selectedParts).reduce((sum, part) => {
      return sum + (Number.parseFloat(part.price) || 0);
    }, 0);
  };

  const currentStepInfo = BUILD_STEPS[currentStep];
  const isGPUOptional = currentStepInfo.key === 'GPU' && selectedParts.CPU?.integrated_gpu;

  return (
    <div className="pc-builder-container">
      {/* Header */}
      <div className="builder-header">
        <h1>🔧 Guided PC Builder</h1>
        <p>Build your perfect PC step-by-step with offline compatibility checking</p>
      </div>

      {/* Progress Bar */}
      <div className="progress-tracker">
        {BUILD_STEPS.map((step, index) => (
          <div 
            key={step.key}
            className={`progress-step ${index === currentStep ? 'active' : ''} ${selectedParts[step.key] ? 'completed' : ''}`}
          >
            <div className="step-icon">{step.icon}</div>
            <div className="step-label">{step.label}</div>
            {step.optional && <span className="optional-badge">Optional</span>}
          </div>
        ))}
      </div>

      {/* Build Score & Warnings */}
      {compatibilityResults && (
        <div className={`compatibility-banner score-${Math.floor(buildScore / 25)}`}>
          <div className="score-display">
            <span className="score-label">Build Score:</span>
            <span className="score-value">{buildScore}/100</span>
          </div>
          {compatibilityResults.warnings.length > 0 && (
            <div className="warnings-summary">
              ⚠️ {compatibilityResults.warnings.length} warning(s) detected
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="builder-content">
        {/* Sidebar - Selected Parts */}
        <div className="selected-parts-sidebar">
          <h3>Your Build</h3>
          <div className="selected-parts-list">
            {BUILD_STEPS.map(step => (
              <div key={step.key} className={`selected-part-item ${selectedParts[step.key] ? 'filled' : 'empty'}`}>
                <div className="part-icon">{step.icon}</div>
                <div className="part-details">
                  <div className="part-category">{step.label}</div>
                  {selectedParts[step.key] ? (
                    <>
                      <div className="part-name">{selectedParts[step.key].name}</div>
                      <div className="part-price">₱{Number.parseFloat(selectedParts[step.key].price).toFixed(2)}</div>
                      <button 
                        className="remove-part-btn"
                        onClick={() => handleRemovePart(step.key)}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="part-placeholder">
                      {step.optional ? 'Optional' : 'Not selected'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="build-total">
            <div className="total-label">Total Price:</div>
            <div className="total-price">₱{getTotalPrice().toFixed(2)}</div>
          </div>
        </div>

        {/* Main Area - Component Selection */}
        <div className="component-selection-area">
          <div className="step-header">
            <h2>{currentStepInfo.icon} Step {currentStep + 1}: Choose {currentStepInfo.label}</h2>
            {isGPUOptional && (
              <div className="gpu-optional-notice">
                <p>✅ Your CPU has integrated graphics. You can skip this step if you don't need a dedicated GPU.</p>
                <button className="skip-gpu-btn" onClick={handleSkipGPU}>
                  Skip GPU →
                </button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="step-navigation">
            <button 
              className="nav-btn prev-btn"
              onClick={goToPreviousStep}
              disabled={currentStep === 0}
            >
              ← Previous
            </button>
            <span className="step-indicator">
              Step {currentStep + 1} of {BUILD_STEPS.length}
            </span>
            <button 
              className="nav-btn next-btn"
              onClick={() => goToNextStep()}
              disabled={!selectedParts[currentStepInfo.key] && !isGPUOptional}
            >
              Next →
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading compatible options...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="error-state">
              <p>❌ {error}</p>
              <button onClick={fetchOptions}>Retry</button>
            </div>
          )}

          {/* Product Grid */}
          {!loading && !error && (
            <div className="product-grid">
              {availableOptions.length === 0 ? (
                <div className="no-options">
                  <p>No compatible options found for your current build.</p>
                  <button onClick={goToPreviousStep}>Go Back</button>
                </div>
              ) : (
                availableOptions.map(product => (
                  <div // NOSONAR - product card with complex children
                    key={product.id} 
                    className={`product-card ${selectedParts[currentStepInfo.key]?.id === product.id ? 'selected' : ''}`}
                    onClick={() => handleSelectPart(product)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectPart(product); }}
                  >
                    <div className="product-image-placeholder">
                      {currentStepInfo.icon}
                    </div>
                    <h4 className="product-name">{product.name}</h4>
                    
                    {/* Key Specs */}
                    <div className="product-specs">
                      {product.socket && <span>Socket: {product.socket}</span>}
                      {product.memory_type && <span>Memory: {product.memory_type}</span>}
                      {product.tdp && <span>TDP: {product.tdp}W</span>}
                      {product.wattage && <span>Wattage: {product.wattage}W</span>}
                      {product.integrated_gpu !== undefined && (
                        <span>iGPU: {product.integrated_gpu ? '✅' : '❌'}</span>
                      )}
                    </div>

                    <div className="product-price">₱{Number.parseFloat(product.price).toFixed(2)}</div>
                    
                    <button className="select-btn">
                      {selectedParts[currentStepInfo.key]?.id === product.id ? 'Selected ✓' : 'Select'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Toggle */}
      <div className="ai-toggle">
        <label>
          <input 
            type="checkbox" 
            checked={aiEnabled} 
            onChange={(e) => setAiEnabled(e.target.checked)}
          />
          {' '}Enable AI Compatibility Checking
        </label>
      </div>
    </div>
  );
};

export default PCBuilder;
