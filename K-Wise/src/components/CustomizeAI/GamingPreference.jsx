import React, { useState } from 'react';
import WizardHeader from './WizardHeader';
import OptionCard from './OptionCard';
import '../../styles/CustomizeAI.css';
import aaagames from "../../assets/GamingPreference/aaagames.svg";
import casualgaming from "../../assets/GamingPreference/casualgaming.svg";
import competitive from "../../assets/GamingPreference/competitive.svg";
import streamgame from "../../assets/GamingPreference/streamgame.svg";

/**
 * GamingPreference - Conditional Step 4 (only shown if usage is "Gaming")
 * Asks user about their gaming preference
 * 4 options: Competitive FPS, AAA Games, Casual Gaming, Streaming and Gaming
 */
const GamingPreference = ({ onNext, onBack, totalSteps = 4 }) => {
  const [selectedGaming, setSelectedGaming] = useState(null);

  const gamingOptions = [
    { 
      id: 'competitive-fps', 
      title: 'Competitive FPS', 
      subtitle: 'High Refresh',
      icon: competitive,
      fullWidth: false
    },
    { 
      id: 'aaa-games', 
      title: 'AAA Games', 
      subtitle: 'Max Graphics',
      icon: aaagames,
      fullWidth: false
    },
    { 
      id: 'casual-gaming', 
      title: 'Casual Gaming', 
      subtitle: 'Light Gaming',
      icon: casualgaming,
      fullWidth: false
    },
    { 
      id: 'streaming-gaming', 
      title: 'Streaming and Gaming', 
      subtitle: 'Dual Workload',
      icon: streamgame,
      fullWidth: true
    }
  ];

  const handleSelect = (gamingId) => {
    setSelectedGaming(gamingId);
    // Auto-advance to next step immediately after selection
    onNext({ gamingPreference: gamingId });
  };

  return (
    <div className="wizard-page">
      <WizardHeader currentStep={4} totalSteps={totalSteps} />
      
      <div className="wizard-content">
        <h2 className="wizard-question">Gaming preference?</h2>
        
        <div className="gaming-grid">
          <div className="gaming-row-1">
            {gamingOptions.filter(opt => !opt.fullWidth).map((option) => (
              <OptionCard
                key={option.id}
                icon={option.icon}
                title={option.title}
                subtitle={option.subtitle}
                onClick={() => handleSelect(option.id)}
                isSelected={selectedGaming === option.id}
              />
            ))}
          </div>
          <div className="gaming-row-2">
            {gamingOptions.filter(opt => opt.fullWidth).map((option) => (
              <OptionCard
                key={option.id}
                icon={option.icon}
                title={option.title}
                subtitle={option.subtitle}
                onClick={() => handleSelect(option.id)}
                isSelected={selectedGaming === option.id}
                className="option-card-full-width"
              />
            ))}
          </div>
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


export default GamingPreference;
