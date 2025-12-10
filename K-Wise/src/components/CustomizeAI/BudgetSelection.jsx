import React, { useState } from 'react';
import WizardHeader from './WizardHeader';
import OptionCard from './OptionCard';
import '../../styles/CustomizeAI.css';

import bronzetier from '../../assets/BudgetSelection/bronzetier.svg';
import silvertier from '../../assets/BudgetSelection/silvertier.svg';
import goldtier from '../../assets/BudgetSelection/goldtier.svg';
import platinumtier from '../../assets/BudgetSelection/platinumtier.svg';
import diamondtier from '../../assets/BudgetSelection/diamondtier.svg';

/**
 * BudgetSelection - Step 2 of CustomizeAI wizard
 * Asks user about their budget range
 * 4 tiers: Bronze, Silver, Gold, Diamond
 */
const BudgetSelection = ({ onNext, onBack, totalSteps = 3 }) => {
  const [selectedBudget, setSelectedBudget] = useState(null);

  const budgetOptions = [
    { 
      id: '10000-25000', 
      title: 'Bronze Tier', 
      price: '₱10,000.00 - ₱25,000.00',
      icon: bronzetier
    },
    { 
      id: '26000-50000', 
      title: 'Silver Tier', 
      price: '₱26,000.00 - ₱50,000.00',
      icon: silvertier
    },
    { 
      id: '51000-75000', 
      title: 'Gold Tier', 
      price: '₱51,000.00 - ₱75,000.00',
      icon: goldtier
    },
    { 
      id: '76000-100000', 
      title: 'Platinum Tier', 
      price: '₱76,000.00 - ₱100,000.00',
      icon: platinumtier
    },
    { 
      id: '100000+', 
      title: 'Diamond Tier', 
      price: '₱100,000.00 +',
      icon: diamondtier
    }
  ];

  const handleSelect = (budgetId) => {
    setSelectedBudget(budgetId);
    // Auto-advance to next step immediately after selection
    onNext({ budget: budgetId });
  };

  return (
    <div className="wizard-page">
      <WizardHeader currentStep={2} totalSteps={totalSteps} />
      
      <div className="wizard-content">
        <h2 className="wizard-question">What is your budget?</h2>
        
        <div className="budget-grid-container">
          {/* First row: Bronze, Silver, Gold */}
          <div className="budget-grid-row">
            {budgetOptions.slice(0, 3).map((option) => (
              <OptionCard
                key={option.id}
                icon={option.icon}
                title={option.title}
                price={option.price}
                onClick={() => handleSelect(option.id)}
                isSelected={selectedBudget === option.id}
                variant="budget"
              />
            ))}
          </div>
          
          {/* Second row: Platinum, Diamond (centered) */}
          <div className="budget-grid-row-two">
            {budgetOptions.slice(3, 5).map((option) => (
              <OptionCard
                key={option.id}
                icon={option.icon}
                title={option.title}
                price={option.price}
                onClick={() => handleSelect(option.id)}
                isSelected={selectedBudget === option.id}
                variant="budget"
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

export default BudgetSelection;