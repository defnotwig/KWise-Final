/**
 * ============================================================================
 * CompatibilityBadge - Reusable Compatibility Indicator
 * ============================================================================
 * 
 * Purpose: Unified compatibility badge for all pages
 * 
 * Features:
 * - Color-coded status (excellent/good/warning/incompatible)
 * - Percentage display
 * - Tooltip with details
 * - White shadow glow for compatible products
 * - Responsive design
 * 
 * Props:
 * - product: Product object
 * - score: Compatibility score (0-100)
 * - issues: Array of compatibility issues
 * - warnings: Array of warnings
 * - onClick: Optional click handler
 * - showPercentage: Show percentage number (default: true)
 * - showLabel: Show "Compatible" label (default: true)
 * - glowEffect: Add white shadow glow (default: true for score >= 70)
 * 
 * Author: GitHub Copilot
 * Created: 2025-11-13
 * ============================================================================
 */

import React, { useState } from 'react';
import './CompatibilityBadge.css';

export function CompatibilityBadge({ 
    product, 
    score, 
    issues = [], 
    warnings = [],
    recommendations = [],
    onClick, 
    showPercentage = true,
    showLabel = true,
    glowEffect = true,
    size = 'medium' // 'small' | 'medium' | 'large'
}) {
    const [showTooltip, setShowTooltip] = useState(false);

    // Determine compatibility status
    const getStatus = () => {
        if (score === null || score === undefined) return 'unknown';
        if (score >= 90) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 50) return 'warning';
        return 'incompatible';
    };

    const status = getStatus();

    // Status labels and icons
    const statusConfig = {
        excellent: {
            label: 'Excellent',
            icon: '✓',
            color: '#10b981',
            bgColor: '#d1fae5',
            glow: true
        },
        good: {
            label: 'Compatible',
            icon: '✓',
            color: '#3b82f6',
            bgColor: '#dbeafe',
            glow: true
        },
        warning: {
            label: 'May Work',
            icon: '⚠',
            color: '#f59e0b',
            bgColor: '#fef3c7',
            glow: false
        },
        incompatible: {
            label: 'Incompatible',
            icon: '✗',
            color: '#ef4444',
            bgColor: '#fee2e2',
            glow: false
        },
        unknown: {
            label: 'Unknown',
            icon: '?',
            color: '#6b7280',
            bgColor: '#f3f4f6',
            glow: false
        }
    };

    const config = statusConfig[status];

    // Should show glow effect?
    const shouldGlow = glowEffect && config.glow && score >= 70;

    // Handle click
    const handleClick = (e) => {
        if (onClick) {
            e.stopPropagation();
            onClick(product, score, status);
        }
    };

    // Render tooltip content
    const renderTooltip = () => {
        if (!showTooltip) return null;

        return (
            <div className="compatibility-tooltip">
                <div className="tooltip-header">
                    <span className="tooltip-icon" style={{ color: config.color }}>
                        {config.icon}
                    </span>
                    <span className="tooltip-title">
                        {score !== null ? `${score}% Compatible` : 'Compatibility Unknown'}
                    </span>
                </div>

                {score !== null && (
                    <div className="tooltip-status">
                        Status: <strong style={{ color: config.color }}>{config.label}</strong>
                    </div>
                )}

                {issues.length > 0 && (
                    <div className="tooltip-section">
                        <div className="tooltip-section-title">❌ Critical Issues:</div>
                        <ul className="tooltip-list">
                            {issues.slice(0, 3).map((issue, idx) => (
                                <li key={idx}>{issue.message || issue}</li>
                            ))}
                            {issues.length > 3 && (
                                <li className="tooltip-more">+{issues.length - 3} more...</li>
                            )}
                        </ul>
                    </div>
                )}

                {warnings.length > 0 && (
                    <div className="tooltip-section">
                        <div className="tooltip-section-title">⚠️ Warnings:</div>
                        <ul className="tooltip-list">
                            {warnings.slice(0, 2).map((warning, idx) => (
                                <li key={idx}>{warning.message || warning}</li>
                            ))}
                            {warnings.length > 2 && (
                                <li className="tooltip-more">+{warnings.length - 2} more...</li>
                            )}
                        </ul>
                    </div>
                )}

                {recommendations.length > 0 && (
                    <div className="tooltip-section">
                        <div className="tooltip-section-title">💡 Recommendations:</div>
                        <ul className="tooltip-list">
                            {recommendations.slice(0, 2).map((rec, idx) => (
                                <li key={idx}>{rec.message || rec}</li>
                            ))}
                            {recommendations.length > 2 && (
                                <li className="tooltip-more">+{recommendations.length - 2} more...</li>
                            )}
                        </ul>
                    </div>
                )}

                {issues.length === 0 && warnings.length === 0 && score >= 90 && (
                    <div className="tooltip-section">
                        <div className="tooltip-perfect">
                            ✨ Perfect compatibility! No issues detected.
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div 
            className={`compatibility-badge ${status} ${size} ${shouldGlow ? 'glow-effect' : ''} ${onClick ? 'clickable' : ''}`}
            onClick={handleClick}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            style={{
                '--badge-color': config.color,
                '--badge-bg': config.bgColor
            }}
        >
            <span className="badge-icon">{config.icon}</span>
            
            {showPercentage && score !== null && (
                <span className="badge-score">{score}%</span>
            )}
            
            {showLabel && (
                <span className="badge-label">{config.label}</span>
            )}

            {renderTooltip()}
        </div>
    );
}

export default CompatibilityBadge;
