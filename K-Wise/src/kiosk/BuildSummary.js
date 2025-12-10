import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './BuildSummary.css';

const BuildSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { selectedParts = {}, compatibilityResults } = location.state || {};

  const getTotalPrice = () => {
    return Object.values(selectedParts).reduce((sum, part) => {
      return sum + (parseFloat(part.price) || 0);
    }, 0);
  };

  const handleAddToCart = () => {
    // TODO: Implement cart integration
    console.log('Adding build to cart:', selectedParts);
    alert('Build added to cart! (Not yet implemented)');
  };

  const handleStartOver = () => {
    navigate('/pc-builder');
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#F44336';
      case 'major': return '#FF9800';
      case 'minor': return '#FFC107';
      default: return '#2196F3';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'major': return '⚠️';
      case 'minor': return '💡';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="build-summary-container">
      <div className="summary-header">
        <h1>🎉 Build Complete!</h1>
        <p>Review your custom PC build below</p>
      </div>

      {/* Compatibility Score Card */}
      {compatibilityResults && (
        <div className="compatibility-card">
          <div className="score-section">
            <div className="score-circle" style={{ 
              background: `conic-gradient(
                #4CAF50 0deg ${compatibilityResults.score * 3.6}deg,
                #e0e0e0 ${compatibilityResults.score * 3.6}deg 360deg
              )`
            }}>
              <div className="score-inner">
                <div className="score-number">{compatibilityResults.score}</div>
                <div className="score-label">/ 100</div>
              </div>
            </div>
            <div className="score-details">
              <h3>Compatibility Score</h3>
              <p className={`score-status ${compatibilityResults.score >= 80 ? 'excellent' : compatibilityResults.score >= 60 ? 'good' : 'warning'}`}>
                {compatibilityResults.score >= 80 && '✅ Excellent compatibility!'}
                {compatibilityResults.score >= 60 && compatibilityResults.score < 80 && '👍 Good compatibility with minor issues'}
                {compatibilityResults.score < 60 && '⚠️ Some compatibility concerns'}
              </p>
            </div>
          </div>

          {/* Warnings Section */}
          {compatibilityResults.warnings && compatibilityResults.warnings.length > 0 && (
            <div className="warnings-section">
              <h4>⚠️ Compatibility Warnings ({compatibilityResults.warnings.length})</h4>
              <div className="warnings-list">
                {compatibilityResults.warnings.map((warning, index) => (
                  <div 
                    key={index} 
                    className="warning-item"
                    style={{ borderLeftColor: getSeverityColor(warning.severity) }}
                  >
                    <span className="warning-icon">{getSeverityIcon(warning.severity)}</span>
                    <div className="warning-content">
                      <div className="warning-severity">{warning.severity.toUpperCase()}</div>
                      <div className="warning-message">{warning.message}</div>
                      {warning.affected && (
                        <div className="warning-affected">
                          Affects: {warning.affected.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations Section */}
          {compatibilityResults.recommendations && compatibilityResults.recommendations.length > 0 && (
            <div className="recommendations-section">
              <h4>💡 Recommendations ({compatibilityResults.recommendations.length})</h4>
              <ul className="recommendations-list">
                {compatibilityResults.recommendations.map((rec, index) => (
                  <li key={index} className="recommendation-item">{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary Section */}
          {compatibilityResults.summary && (
            <div className="summary-section">
              <h4>📋 Build Summary</h4>
              <p className="summary-text">{compatibilityResults.summary}</p>
            </div>
          )}
        </div>
      )}

      {/* Parts List */}
      <div className="parts-list-card">
        <h2>Selected Components</h2>
        <div className="parts-table">
          <div className="parts-table-header">
            <div>Component</div>
            <div>Product</div>
            <div>Price</div>
          </div>
          {Object.entries(selectedParts).map(([category, part]) => (
            <div key={category} className="parts-table-row">
              <div className="part-category">{category}</div>
              <div className="part-name">{part.name}</div>
              <div className="part-price">₱{parseFloat(part.price).toFixed(2)}</div>
            </div>
          ))}
          <div className="parts-table-footer">
            <div>Total</div>
            <div></div>
            <div className="total-price">₱{getTotalPrice().toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="btn-secondary" onClick={handleStartOver}>
          🔄 Start Over
        </button>
        <button className="btn-primary" onClick={handleAddToCart}>
          🛒 Add to Cart
        </button>
      </div>
    </div>
  );
};

export default BuildSummary;
