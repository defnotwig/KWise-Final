import React from 'react';
import '../../styles/CustomizeAI.css';
import aicustom from "../../assets/PCBuildCategory/aicustom.svg";

/**
 * WizardHeader - Reusable header component for all CustomizeAI wizard steps
 * Shows logo, title, progress bar, and step indicator
 */
const WizardHeader = ({ currentStep, totalSteps }) => {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="wizard-header-container">

      {/* Icon */}
      <div className="wizard-icon-container">
        <img src={aicustom} alt="AI Customized" className="wizard-icon" />
      </div>

      {/* Title */}
      <h1 className="wizard-title">CUSTOMIZE WITH AI</h1>
      <p className="wizard-subtitle">Tell Us What PC You Want</p>

      {/* Progress Bar */}
      <div className="wizard-progress-container">
        <div className="wizard-progress-bar">
          <div 
            className="wizard-progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <p className="wizard-step-text">
          Step {currentStep} out of {totalSteps}
        </p>
      </div>
    </div>
  );
};

export default WizardHeader;