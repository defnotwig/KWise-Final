/**
 * ============================================================================
 * AI REASONING TOOLTIP COMPONENT - PHASE 2
 * ============================================================================
 * 
 * Displays AI reasoning, evidence, and data sources in an interactive tooltip.
 * 
 * Props:
 * - reasoning: string - AI's explanation text
 * - evidence: array - List of evidence points
 * - dataSources: array - Sources used (database, AI, user_context, etc.)
 * - confidence: number - Confidence score
 * - position: string - Tooltip position (top, bottom, left, right)
 * 
 * ============================================================================
 */

import React, { useState } from 'react';
import './AIReasoningTooltip.css';
import ConfidenceBadge from './ConfidenceBadge';

const AIReasoningTooltip = ({ 
    reasoning, 
    evidence = [], 
    dataSources = [],
    confidence,
    position = 'top',
    children 
}) => {
    const [isVisible, setIsVisible] = useState(false);

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    const getDataSourceIcon = (source) => {
        const icons = {
            'ai': '🤖',
            'database': '🗄️',
            'user_context': '👤',
            'market_data': '📊',
            'metadata': '🏷️',
            'compatibility_logs': '📝',
            'deterministic': '🎯'
        };
        return icons[source] || '📌';
    };

    const getDataSourceLabel = (source) => {
        const labels = {
            'ai': 'AI Analysis',
            'database': 'Database',
            'user_context': 'User Profile',
            'market_data': 'Market Data',
            'metadata': 'Part Metadata',
            'compatibility_logs': 'Community Reports',
            'deterministic': 'Rule-Based'
        };
        return labels[source] || source;
    };

    return (
        <div className="ai-tooltip-wrapper">
            <div 
                className="ai-tooltip-trigger"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {children || (
                    <span className="ai-tooltip-icon" title="View AI Reasoning">
                        🤖 <span className="ai-tooltip-hint">Why?</span>
                    </span>
                )}
            </div>

            {isVisible && (
                <div className={`ai-tooltip ai-tooltip--${position}`}>
                    <div className="ai-tooltip__header">
                        <h4 className="ai-tooltip__title">
                            🤖 AI Reasoning
                        </h4>
                        {confidence !== undefined && (
                            <ConfidenceBadge 
                                confidence={confidence} 
                                size="small" 
                                showLabel={false}
                            />
                        )}
                    </div>

                    {reasoning && (
                        <div className="ai-tooltip__section">
                            <p className="ai-tooltip__reasoning">{reasoning}</p>
                        </div>
                    )}

                    {evidence && evidence.length > 0 && (
                        <div className="ai-tooltip__section">
                            <h5 className="ai-tooltip__section-title">📋 Evidence</h5>
                            <ul className="ai-tooltip__evidence-list">
                                {evidence.map((item, idx) => (
                                    <li key={idx} className="ai-tooltip__evidence-item">
                                        {typeof item === 'string' ? item : item.description || item.text}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {dataSources && dataSources.length > 0 && (
                        <div className="ai-tooltip__section">
                            <h5 className="ai-tooltip__section-title">🔍 Data Sources</h5>
                            <div className="ai-tooltip__sources">
                                {dataSources.map((source, idx) => (
                                    <span key={idx} className="ai-tooltip__source-badge">
                                        <span className="ai-tooltip__source-icon">
                                            {getDataSourceIcon(source)}
                                        </span>
                                        <span className="ai-tooltip__source-label">
                                            {getDataSourceLabel(source)}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="ai-tooltip__arrow"></div>
                </div>
            )}
        </div>
    );
};

export default AIReasoningTooltip;
