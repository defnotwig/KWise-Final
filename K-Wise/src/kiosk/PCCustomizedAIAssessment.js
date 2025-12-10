import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PCCustomizedAIAssessment.css";
import logo from "../assets/LOGO1.webp";

function PCCustomizedAIAssessment() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [assessment, setAssessment] = useState({
    usage: "",
    budget: "",
    performance: "",
    gaming: "",
    workload: "",
    preferences: ""
  });

  // Step 1: How will you use your PC?
  const handleUsage = (usage) => {
    setAssessment({ ...assessment, usage });
    setCurrentStep(2);
  };

  // Step 2: What's your budget?
  const handleBudget = (budget) => {
    setAssessment({ ...assessment, budget });
    setCurrentStep(3);
  };

  // Step 3: Performance preference
  const handlePerformance = (performance) => {
    const updatedAssessment = { ...assessment, performance };
    setAssessment(updatedAssessment);

    // If Gaming, show gaming preferences (step 4)
    if (assessment.usage === "Gaming") {
      setCurrentStep(4);
    } else {
      // For non-gaming, go directly to generation
      navigate("/pc-customized-ai-suggestions", {
        state: { assessment: updatedAssessment }
      });
    }
  };

  // Step 4: Gaming preference (if applicable)
  const handleGaming = (gaming) => {
    setAssessment({ ...assessment, gaming });
    // After gaming preferences, go directly to generate (skip step 5 & 6)
    navigate("/pc-customized-ai-suggestions", {
      state: { assessment: { ...assessment, gaming } }
    });
  };

  // Step 5: Workload type (if applicable)
  const handleWorkload = (workload) => {
    setAssessment({ ...assessment, workload });
    setCurrentStep(6);
  };

  // Step 6: Additional preferences
  const handlePreferences = () => {
    // Navigate to AI suggestions page with assessment data
    navigate("/pc-customized-ai-suggestions", {
      state: { assessment }
    });
  };

  // Back button handler
  const handleBack = () => {
    if (currentStep === 1) {
      navigate("/pcbuild-category");
    } else if (currentStep === 5 && assessment.usage !== "Gaming" && assessment.usage !== "Work") {
      setCurrentStep(3);
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="ai-assessment-container">
      {/* Logo */}
      <div className="ai-logo-container">
        <img src={logo} alt="K-Wise Logo" className="ai-logo" />
      </div>

      {/* Title */}
      <div className="ai-title-section">
        <div className="ai-icon">🤖</div>
        <h1 className="ai-main-title">PC CUSTOMIZER</h1>
        <p className="ai-subtitle">Tell Us What PC You Want</p>
        <p className="ai-powered">AI-powered build recommendations</p>
      </div>

      {/* Progress Indicator */}
      <div className="ai-progress">
        <div className="ai-progress-bar">
          <div
            className="ai-progress-fill"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          ></div>
        </div>
        <p className="ai-progress-text">Step {currentStep} of 6</p>
      </div>

      {/* Question Container */}
      <div className="ai-question-container">
        {/* Step 1: Usage */}
        {currentStep === 1 && (
          <div className="ai-question-step">
            <h2 className="ai-question-title">How will you use your PC?</h2>
            <div className="ai-options-grid">
              <button
                className="ai-option-button"
                onClick={() => handleUsage("Gaming")}
              >
                <span className="ai-option-icon">🎮</span>
                <span className="ai-option-text">Gaming</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handleUsage("Work")}
              >
                <span className="ai-option-icon">💼</span>
                <span className="ai-option-text">Work</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handleUsage("Content Creation")}
              >
                <span className="ai-option-icon">🎨</span>
                <span className="ai-option-text">Content Creation</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handleUsage("General Use")}
              >
                <span className="ai-option-icon">🏠</span>
                <span className="ai-option-text">General Use</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handleUsage("Programming")}
              >
                <span className="ai-option-icon">💻</span>
                <span className="ai-option-text">Programming</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handleUsage("Video Editing")}
              >
                <span className="ai-option-icon">🎬</span>
                <span className="ai-option-text">Video Editing</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Budget */}
        {currentStep === 2 && (
          <div className="ai-question-step">
            <h2 className="ai-question-title">What's your budget?</h2>
            <div className="ai-options-grid">
              <button
                className="ai-option-button"
                onClick={() => handleBudget("10000-25000")}
              >
                <span className="ai-option-icon">💵</span>
                <span className="ai-option-text">₱10,000 - ₱25,000</span>
                <span className="ai-option-desc">Entry Level</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handleBudget("26000-50000")}
              >
                <span className="ai-option-icon">💵</span>
                <span className="ai-option-text">₱26,000 - ₱50,000</span>
                <span className="ai-option-desc">Mid Range</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handleBudget("51000-75000")}
              >
                <span className="ai-option-icon">💰</span>
                <span className="ai-option-text">₱51,000 - ₱75,000</span>
                <span className="ai-option-desc">High Mid Tier</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handleBudget("76000-100000")}
              >
                <span className="ai-option-icon">💰</span>
                <span className="ai-option-text">₱76,000 - ₱100,000</span>
                <span className="ai-option-desc">High End</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handleBudget("100000+")}
              >
                <span className="ai-option-icon">💎</span>
                <span className="ai-option-text">₱100,000+</span>
                <span className="ai-option-desc">Premium</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Performance Level */}
        {currentStep === 3 && (
          <div className="ai-question-step">
            <h2 className="ai-question-title">Performance preference?</h2>
            <div className="ai-options-grid">
              <button
                className="ai-option-button"
                onClick={() => handlePerformance("Balanced")}
              >
                <span className="ai-option-icon">⚖️</span>
                <span className="ai-option-text">Balanced</span>
                <span className="ai-option-desc">Best value</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handlePerformance("Performance")}
              >
                <span className="ai-option-icon">🚀</span>
                <span className="ai-option-text">Performance</span>
                <span className="ai-option-desc">Max power</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handlePerformance("Budget")}
              >
                <span className="ai-option-icon">💡</span>
                <span className="ai-option-text">Budget</span>
                <span className="ai-option-desc">Cost effective</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Gaming Details (if Gaming selected) */}
        {currentStep === 4 && assessment.usage === "Gaming" && (
          <div className="ai-question-step">
            <h2 className="ai-question-title">Gaming preferences?</h2>
            <div className="ai-options-grid">
              <button
                className="ai-option-button"
                onClick={() => handleGaming("Competitive FPS")}
              >
                <span className="ai-option-icon">🎯</span>
                <span className="ai-option-text">Competitive FPS</span>
                <span className="ai-option-desc">High refresh rate</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handleGaming("AAA Games")}
              >
                <span className="ai-option-icon">🎮</span>
                <span className="ai-option-text">AAA Games</span>
                <span className="ai-option-desc">Max graphics</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handleGaming("Casual Gaming")}
              >
                <span className="ai-option-icon">🕹️</span>
                <span className="ai-option-text">Casual Gaming</span>
                <span className="ai-option-desc">Light gaming</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handleGaming("Streaming & Gaming")}
              >
                <span className="ai-option-icon">📡</span>
                <span className="ai-option-text">Streaming & Gaming</span>
                <span className="ai-option-desc">Multi-tasking</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Skip gaming if not gaming */}
        {currentStep === 4 && assessment.usage !== "Gaming" && (
          <div className="ai-question-step">
            <h2 className="ai-question-title">Any specific requirements?</h2>
            <textarea
              className="ai-textarea"
              placeholder="E.g., Need multiple monitors, specific software, quiet operation, RGB lighting, etc. (Optional)"
              value={assessment.preferences}
              onChange={(e) => setAssessment({ ...assessment, preferences: e.target.value })}
              maxLength={500}
            />
            <p className="ai-char-count">{assessment.preferences.length}/500</p>
            <button
              className="ai-continue-button"
              onClick={() => handlePreferences()}
            >
              Generate My Build with AI →
            </button>
          </div>
        )}

        {/* Step 5: Workload Details (if Work selected) */}
        {currentStep === 5 && assessment.usage === "Work" && (
          <div className="ai-question-step">
            <h2 className="ai-question-title">Type of work?</h2>
            <div className="ai-options-grid">
              <button
                className="ai-option-button"
                onClick={() => handleWorkload("Office Work")}
              >
                <span className="ai-option-icon">📊</span>
                <span className="ai-option-text">Office Work</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handleWorkload("3D Rendering")}
              >
                <span className="ai-option-icon">🎨</span>
                <span className="ai-option-text">3D Rendering</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handleWorkload("Data Analysis")}
              >
                <span className="ai-option-icon">📈</span>
                <span className="ai-option-text">Data Analysis</span>
              </button>
              <button
                className="ai-option-button"
                onClick={() => handleWorkload("Software Development")}
              >
                <span className="ai-option-icon">💻</span>
                <span className="ai-option-text">Software Development</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Additional Preferences */}
        {currentStep === 6 && (
          <div className="ai-question-step">
            <h2 className="ai-question-title">Any additional preferences?</h2>
            <textarea
              className="ai-textarea"
              placeholder="E.g., RGB lighting, quiet operation, specific brand preferences, upgradability, etc. (Optional)"
              value={assessment.preferences}
              onChange={(e) => setAssessment({ ...assessment, preferences: e.target.value })}
              maxLength={500}
            />
            <p className="ai-char-count">{assessment.preferences.length}/500</p>
            <button
              className="ai-continue-button"
              onClick={() => handlePreferences()}
            >
              Generate My Build with AI →
            </button>
          </div>
        )}
      </div>

      {/* Back Button */}
      <button className="ai-back-button" onClick={handleBack}>
        ← Back
      </button>
    </div>
  );
}

export default PCCustomizedAIAssessment;

