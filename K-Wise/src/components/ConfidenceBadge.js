/**
 * ============================================================================
 * CONFIDENCE BADGE COMPONENT - PHASE 2
 * ============================================================================
 * 
 * Visual indicator showing AI confidence levels for recommendations.
 * 
 * Confidence Levels:
 * - 95-100: Excellent (Green) - Very High Confidence
 * - 80-94: Good (Blue) - High Confidence
 * - 65-79: Fair (Yellow) - Moderate Confidence
 * - 50-64: Low (Orange) - Low Confidence
 * - 0-49: Very Low (Red) - AI Uncertain
 * 
 * ============================================================================
 */

import React from 'react';
import './ConfidenceBadge.css';

const ConfidenceBadge = ({ 
    confidence, 
    showLabel = true, 
    showPercentage = true,
    size = 'medium',
    inline = false 
}) => {
    // Determine confidence level and styling
    const getConfidenceLevel = (score) => {
        if (score >= 95) return { level: 'excellent', color: '#22c55e', label: 'Very High', icon: '✓' };
        if (score >= 80) return { level: 'good', color: '#3b82f6', label: 'High', icon: '✓' };
        if (score >= 65) return { level: 'fair', color: '#eab308', label: 'Moderate', icon: '⚠' };
        if (score >= 50) return { level: 'low', color: '#f97316', label: 'Low', icon: '⚠' };
        return { level: 'very-low', color: '#ef4444', label: 'Very Low', icon: '!' };
    };

    const confidenceScore = Math.max(0, Math.min(100, confidence || 0));
    const { level, color, label, icon } = getConfidenceLevel(confidenceScore);

    const badgeClass = `confidence-badge confidence-badge--${level} confidence-badge--${size} ${inline ? 'confidence-badge--inline' : ''}`;

    return (
        <div className={badgeClass} title={`AI Confidence: ${confidenceScore}% (${label})`}>
            <span className="confidence-badge__icon" style={{ color }}>
                {icon}
            </span>
            {showPercentage && (
                <span className="confidence-badge__percentage" style={{ color }}>
                    {confidenceScore}%
                </span>
            )}
            {showLabel && (
                <span className="confidence-badge__label">
                    {label} Confidence
                </span>
            )}
        </div>
    );
};

export default ConfidenceBadge;
