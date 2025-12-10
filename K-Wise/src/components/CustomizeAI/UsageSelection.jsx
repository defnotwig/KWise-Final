import React, { useState } from 'react';
import WizardHeader from './WizardHeader';
import OptionCard from './OptionCard';
import '../../styles/CustomizeAI.css';
import gaming from '../../assets/UsageSelection/gaming.svg';
import work from '../../assets/UsageSelection/work.svg';
import contentCreation from '../../assets/UsageSelection/contentcreation.svg';
import generalUse from '../../assets/UsageSelection/generaluse.svg';
import programming from '../../assets/UsageSelection/programming.svg';
import videoEditing from '../../assets/UsageSelection/videoediting.svg';

/**
 * UsageSelection - Step 1 of CustomizeAI wizard
 * Asks user how they will use their PC
 * 6 options: Gaming, Work, Content Creation, General Use, Programming, Video Editing
 */
const UsageSelection = ({ onNext, onBack, totalSteps = 3 }) => {
  const [selectedUsage, setSelectedUsage] = useState(null);

  const usageOptions = [
    { 
      id: 'Gaming', 
      title: 'Gaming', 
      icon: gaming
    },
    { 
      id: 'Work', 
      title: 'Work', 
      icon: work
    },
    { 
      id: 'Content Creation', 
      title: 'Content Creation', 
      icon: contentCreation
    },
    { 
      id: 'General Use', 
      title: 'General Use', 
      icon: generalUse
    },
    { 
      id: 'Programming', 
      title: 'Programming', 
      icon: programming
    },
    { 
      id: 'Video Editing', 
      title: 'Video Editing', 
      icon: videoEditing
    }
  ];

  const handleSelect = (usageId) => {
    setSelectedUsage(usageId);
    // Auto-advance to next step immediately after selection
    onNext({ usage: usageId });
  };

  return (
    <div className="wizard-page">
      <WizardHeader currentStep={1} totalSteps={totalSteps} />
      
      <div className="wizard-content">
        <h2 className="wizard-question">How will you use your PC?</h2>
        
        <div className="options-grid">
          {usageOptions.map((option) => (
            <OptionCard
              key={option.id}
              icon={option.icon}
              title={option.title}
              onClick={() => handleSelect(option.id)}
              isSelected={selectedUsage === option.id}
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

export default UsageSelection;