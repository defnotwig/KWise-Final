import React from 'react';
import '../../styles/CustomizeAI.css';

/**
 * OptionCard - Reusable card component for displaying selection options
 * Supports both regular and full-width variants
 */
const OptionCard = ({ 
  icon, 
  title, 
  subtitle, 
  price, 
  onClick, 
  isSelected, 
  className = '',
  variant = 'default' // 'default', 'budget'
}) => {
  const cardClass = variant === 'budget' ? 'budget-card' : 'option-card';
  
  return (
    <div 
      className={`${cardClass} ${isSelected ? 'selected' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Icon Container */}
      <div className="option-icon-container">
        {typeof icon === 'string' && icon.length <= 4 ? (
          <span>{icon}</span>
        ) : (
          <img src={icon} alt={title}/>
        )}
      </div>

      {/* Text Content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'}}>
        <h3 className="option-title">{title}</h3>
        {subtitle && <p className="option-subtitle">{subtitle}</p>}
        {price && <p className="option-subtitle">{price}</p>}
      </div>
    </div>
  );
};

export default OptionCard;