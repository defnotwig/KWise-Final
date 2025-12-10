import React, { useEffect } from 'react';
import '../../styles/CustomizeAI.css';

/**
 * LoadingScreen - Final step showing AI generation progress
 * Displays animated loading icon and status message
 */
const LoadingScreen = ({ onComplete }) => {
  useEffect(() => {
    // Simulate AI processing time (3-5 seconds)
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="wizard-page loading-page">
      <div className="loading-header">
        <div className="wizard-icon-container">
          <div className="wizard-icon">🔨</div>
        </div>
        <h1 className="wizard-title">CUSTOMIZE WITH AI</h1>
        <p className="wizard-subtitle">Tell Us What PC You Want</p>
      </div>
      
      <div className="loading-content">
        <div className="loading-spinner">
          <svg className="spinner-svg" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00E083" />
                <stop offset="100%" stopColor="#6ECAF1" />
              </linearGradient>
            </defs>
            <circle 
              className="spinner-circle" 
              cx="50" 
              cy="50" 
              r="40"
              stroke="url(#spinnerGradient)"
            />
          </svg>
        </div>
        
        <h2 className="loading-title">Generating Your Perfect PC Build</h2>
        <p className="loading-subtitle">This may take a few seconds</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
