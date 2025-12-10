import React, { useState } from 'react';
import WizardHeader from './WizardHeader';
import OptionCard from './OptionCard';
import '../../styles/CustomizeAI.css';
import balance from '../../assets/PerformanceSelection/balance.svg';
import budget from '../../assets/PerformanceSelection/budget.svg';
import performance from '../../assets/PerformanceSelection/performance.svg';

/**
 * PerformanceSelection - Step 3 of CustomizeAI wizard
 * Asks user about their performance preference
 * 3 options: Budget, Balance, Performance
 */
const PerformanceSelection = ({ onNext, onBack, selectedUsage, totalSteps = 3 }) => {
  const [selectedPerformance, setSelectedPerformance] = useState(null);

  const performanceOptions = [
    { 
      id: 'budget', 
      title: 'Budget', 
      subtitle: 'Cost Effective',
      icon: budget,
      iconHeight: '142px'
    },
    { 
      id: 'balanced', 
      title: 'Balanced', 
      subtitle: 'Sweet Spot',
      icon: balance
    },
    { 
      id: 'performance', 
      title: 'Performance', 
      subtitle: 'Max Power',
      icon: performance
    }
  ];

  const handleSelect = (performanceId) => {
    setSelectedPerformance(performanceId);
    // Auto-advance to next step immediately after selection
    onNext({ performance: performanceId });
  };

  return (
    <div className="wizard-page">
      <WizardHeader currentStep={3} totalSteps={totalSteps} />
      
      <div className="wizard-content">
        <h2 className="wizard-question">Performance preference?</h2>
        
        <div className="options-grid performance-grid">
          {performanceOptions.map((option) => (
            <OptionCard
              key={option.id}
              icon={option.icon}
              title={option.title}
              subtitle={option.subtitle}
              onClick={() => handleSelect(option.id)}
              isSelected={selectedPerformance === option.id}
            />
          ))}
        </div>
      </div>
      
      <div className="wizard-actions">
        <button 
          className="wizard-btn wizard-btn-back" 
          onClick={onBack}
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default PerformanceSelection;
