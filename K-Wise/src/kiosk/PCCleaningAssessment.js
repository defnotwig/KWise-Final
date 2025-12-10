import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PCCleaningIcon from '../assets/PCCleaning.webp';
import './PCCleaningAssessment.css';

const PCCleaningAssessment = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState({
    hasCleaned: null,
    lastCleaned: null,
    cleaningType: null,
    pcAge: null,
    underlyingIssues: null,
    selectedIssues: [] // Array of selected issue tags
  });

  // Question 1: Have you ever cleaned your PC before?
  const handleCleaningHistory = (hasCleanedBefore) => {
    setAnswers(prev => ({ ...prev, hasCleaned: hasCleanedBefore }));

    if (hasCleanedBefore) {
      setCurrentStep(2); // Go to question 2 about timeframe
    } else {
      // If never cleaned, ask about PC age
      setCurrentStep(4); // Go to PC age question
    }
  };

  // Question 2: When was the last time your PC was cleaned?
  const handleLastCleanedTime = (timeframe) => {
    setAnswers(prev => ({ ...prev, lastCleaned: timeframe }));
    setCurrentStep(3); // Go to question 3 about cleaning type
  };

  // Question 3: What type of cleaning did you get?
  const handleCleaningType = (cleaningType) => {
    setAnswers(prev => ({ ...prev, cleaningType }));
    // Navigate to underlying issues question (Step 5)
    setCurrentStep(5);
  };

  // Question 4: How old is your PC? (for users who never cleaned)
  const handlePCAge = (pcAge) => {
    setAnswers(prev => ({ ...prev, pcAge, hasCleaned: false }));
    // Navigate to underlying issues question (Step 5)
    setCurrentStep(5);
  };

  // Question 5: Underlying Issues (NEW - Last page of assessment)
  const handleUnderlyingIssues = (hasIssues) => {
    if (!hasIssues) {
      // No issues, navigate directly to tier selection
      const finalAnswers = { ...answers, underlyingIssues: false, selectedIssues: [] };
      setAnswers(finalAnswers);
      navigateToTierSelection(finalAnswers);
    } else {
      // Has issues, show issue selection categories
      setAnswers(prev => ({ ...prev, underlyingIssues: true }));
      setCurrentStep(6); // Go to issue selection step
    }
  };

  // Question 6: Issue Selection (NEW - Select specific issues)
  const handleIssueToggle = (issue) => {
    setAnswers(prev => ({
      ...prev,
      selectedIssues: prev.selectedIssues.includes(issue)
        ? prev.selectedIssues.filter(item => item !== issue)
        : [...prev.selectedIssues, issue]
    }));
  };

  const handleIssueSelectionContinue = () => {
    const finalAnswers = { ...answers };
    navigateToTierSelection(finalAnswers);
  };

  // Navigate to tier selection with answers for AI recommendation
  const navigateToTierSelection = (assessmentAnswers) => {
    // Store answers in localStorage for AI recommendation
    localStorage.setItem('cleaningAssessment', JSON.stringify(assessmentAnswers));
    navigate('/pc-cleaning', { state: { from: 'assessment', assessmentAnswers } });
  };

  const handleBack = () => {
    if (currentStep === 1) {
      // Clear any previous assessment
      localStorage.removeItem('cleaningAssessment');
      navigate('/pc-services');
    } else if (currentStep === 2) {
      setCurrentStep(1);
      setAnswers(prev => ({ ...prev, lastCleaned: null, cleaningType: null }));
    } else if (currentStep === 3) {
      setCurrentStep(2);
      setAnswers(prev => ({ ...prev, cleaningType: null }));
    } else if (currentStep === 4) {
      // Back from PC age question to cleaning history
      setCurrentStep(1);
      setAnswers(prev => ({ ...prev, pcAge: null, hasCleaned: null }));
    } else if (currentStep === 5) {
      // Back from underlying issues to either Step 3 or Step 4
      if (answers.hasCleaned) {
        setCurrentStep(3); // Back to cleaning type question
      } else {
        setCurrentStep(4); // Back to PC age question
      }
      setAnswers(prev => ({ ...prev, underlyingIssues: null, issueDescription: '' }));
    } else if (currentStep === 6) {
      // Back from issue selection to underlying issues
      setCurrentStep(5);
      setAnswers(prev => ({ ...prev, selectedIssues: [] }));
    }
  };

  return (
    <div className="pca-container">
      <div className="pca-content">
        <div className="pca-content-header">
          <img src={PCCleaningIcon} alt="PC Cleaning" className="pca-icon" />
          <div className="pca-spacer">
          <h1 className="pca-title">PC CLEANING</h1>
          <p className="pca-description">Dust of the Lag</p>
          </div>
          {currentStep !== 6 && (
            <div className="pca-step-indicator">
              <div className="pca-step-progress-bar">
                <div className="pca-step-progress-fill" style={{ width: `${(currentStep / 6) * 100}%` }}></div>
              </div>
              <p className="pca-step-text">Step {currentStep} out of 6</p>
            </div>
          )}
        </div>

        {/* Step 1: Cleaning History */}
        {currentStep === 1 && (
          <div className="pca-question-container">
          <div className="pca-spacer">
            <h3 className="pca-question">
              Have you ever had your PC cleaned before?
            </h3>
            <p className="pca-question-sub">Self-cleaning or professionally cleaned</p>
            </div>
            <div className="pca-options">
              <button
                className={`pca-option-btn ${answers.hasCleaned === true ? 'active' : ''}`}
                onClick={() => handleCleaningHistory(true)}
              >
                YES
              </button>
              <button
                className={`pca-option-btn ${answers.hasCleaned === false ? 'active' : ''}`}
                onClick={() => handleCleaningHistory(false)}
              >
                NO
              </button>
            </div>
            <button className="pca-back-btn" onClick={handleBack}>
              Back
            </button>
          </div>
        )}

        {/* Step 2: Last Cleaned Timeframe */}
        {currentStep === 2 && (
          <div className="pca-question-container">
            <h3 className="pca-question">
              When was the last time your PC was cleaned?
            </h3>
            <div className="pca-options pca-options-grid">
              <button
                className={`pca-option-btn ${answers.lastCleaned === '1-3 Months' ? 'active' : ''}`}
                onClick={() => handleLastCleanedTime('1-3 Months')}
              >
                1-3 MONTHS
              </button>
              <button
                className={`pca-option-btn ${answers.lastCleaned === '4-6 Months' ? 'active' : ''}`}
                onClick={() => handleLastCleanedTime('4-6 Months')}
              >
                4-6 MONTHS
              </button>
              <button
                className={`pca-option-btn ${answers.lastCleaned === '7-12 Months' ? 'active' : ''}`}
                onClick={() => handleLastCleanedTime('7-12 Months')}
              >
                7-12 MONTHS
              </button>
              <button
                className={`pca-option-btn ${answers.lastCleaned === '13+ Months' ? 'active' : ''}`}
                onClick={() => handleLastCleanedTime('13+ Months')}
              >
                13+ MONTHS
              </button>
            </div>
            <button className="pca-back-btn" onClick={handleBack}>
              Back
            </button>
          </div>
        )}

        {/* Step 3: Previous Cleaning Type */}
        {currentStep === 3 && (
          <div className="pca-question-container">
            <h3 className="pca-question">
              What type of cleaning did you get previously?
            </h3>
            <div className="pca-options pca-options-vertical">
              <button
                className={`pca-option-btn pca-option-btn-detailed ${answers.cleaningType === 'basic' ? 'active' : ''}`}
                onClick={() => handleCleaningType('basic')}
              >
                <div className="pca-option-title">Basic Tier: External and Internal cleaning</div>
                <div className="pca-option-description">
                  No major disassembly, external wipe-down, dust blow-out with compressed air
                </div>
              </button>
              <button
                className={`pca-option-btn pca-option-btn-detailed ${answers.cleaningType === 'pro' ? 'active' : ''}`}
                onClick={() => handleCleaningType('pro')}
              >
                <div className="pca-option-title">Pro Tier: component-level cleaning</div>
                <div className="pca-option-description">
                  Full disassembly • Individual component cleaning • New thermal paste • Cable management
                </div>
              </button>
              <button
                className={`pca-option-btn pca-option-btn-detailed ${answers.cleaningType === 'premium' ? 'active' : ''}`}
                onClick={() => handleCleaningType('premium')}
              >
                <div className="pca-option-title">Premium Tier: ultimate deep cleaning</div>
                <div className="pca-option-description">
                  All pro services • New screws • Thermal pad replacement • Performance validation
                </div>
              </button>
            </div>
            <button className="pca-back-btn" onClick={handleBack}>
              Back
            </button>
          </div>
        )}

        {/* Step 4: PC Age (for users who never cleaned) */}
        {currentStep === 4 && (
          <div className="pca-question-container">
            <h3 className="pca-question">
              When was your PC built/purchased?
            </h3>
            <div className="pca-options pca-options-grid-two">
              <button
                className={`pca-option-btn ${answers.pcAge === 'Less than a year' ? 'active' : ''}`}
                onClick={() => handlePCAge('Less than a year')}
              >
                LESS THAN A YEAR
              </button>
              <button
                className={`pca-option-btn ${answers.pcAge === 'More than a year' ? 'active' : ''}`}
                onClick={() => handlePCAge('More than a year')}
              >
                MORE THAN A YEAR
              </button>
            </div>
            <button className="pca-back-btn" onClick={handleBack}>
              Back
            </button>
          </div>
        )}

        {/* Step 5: Underlying Issues (NEW - Client Requirement 7) */}
        {currentStep === 5 && (
          <div className="pca-question-container">
            <h3 className="pca-question">
              Is there an underlying issue with your PC?
            </h3>
            <p className="pca-question-sub">e.g., overheating, crashes, slow performance</p>
            <div className="pca-options">
              <button
                className={`pca-option-btn ${answers.underlyingIssues === true ? 'active' : ''}`}
                onClick={() => handleUnderlyingIssues(true)}
              >
                YES, I HAVE ISSUES
              </button>
              <button
                className={`pca-option-btn ${answers.underlyingIssues === false ? 'active' : ''}`}
                onClick={() => handleUnderlyingIssues(false)}
              >
                NO ISSUES
              </button>
            </div>
            <button className="pca-back-btn" onClick={handleBack}>
              Back
            </button>
          </div>
        )}

        {/* Step 6: Issue Selection (NEW - Similar to PC Checkup) */}
        {currentStep === 6 && (
          <div className="pca-question-container pca-issue-selection-container">
            <div className="pca-spacer">
            <h3 className="pca-question pca-large-title">Describe the Issues</h3>
            <p className="pca-question-sub pca-large-subtitle">Select all the counts</p>
            </div>
            <div className="pca-issue-categories">
              {/* Hardware Issues */}
              <div className="pca-issue-category">
                <h4 className="pca-issue-category-title">HARDWARE ISSUE</h4>
                <div className="pca-issue-options">
                  {['Overheating', 'Fan Noise', 'Performance Drops', 'Unexpected Shutdowns', 'Peripheral Malfunctions', 'Aesthetic Dirtiness', 'Static Buildup'].map((issue) => (
                    <button
                      key={issue}
                      type="button"
                      className={`pca-issue-btn ${answers.selectedIssues.includes(issue) ? 'selected' : ''}`}
                      onClick={() => handleIssueToggle(issue)}
                    >
                      {issue}
                    </button>
                  ))}
                </div>
              </div>

              {/* Software Issues */}
              <div className="pca-issue-category">
                <h4 className="pca-issue-category-title">SOFTWARE ISSUE</h4>
                <div className="pca-issue-options">
                  {['Slow Boot', 'Frequent Crashes', 'Memory Usage', 'Browser Lag'].map((issue) => (
                    <button
                      key={issue}
                      type="button"
                      className={`pca-issue-btn ${answers.selectedIssues.includes(issue) ? 'selected' : ''}`}
                      onClick={() => handleIssueToggle(issue)}
                    >
                      {issue}
                    </button>
                  ))}
                </div>
              </div>

              {/* User-Related Causes */}
              <div className="pca-issue-category">
                <h4 className="pca-issue-category-title">USER-RELATED CAUSES</h4>
                <div className="pca-issue-options">
                  {['Regular Maintenance', 'Dusty Environments', 'Poor Ventilation or Placement', 'Installing Unverified Programs', 'No Use of Cooling Pads or Air Filters'].map((issue) => (
                    <button
                      key={issue}
                      type="button"
                      className={`pca-issue-btn ${answers.selectedIssues.includes(issue) ? 'selected' : ''}`}
                      onClick={() => handleIssueToggle(issue)}
                    >
                      {issue}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pca-button-footer">
              <button className="pca-back-btn" onClick={handleBack}>
                Back
              </button>
              <button
                className="pca-continue-btn"
                onClick={handleIssueSelectionContinue}
                disabled={answers.selectedIssues.length === 0}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PCCleaningAssessment;
