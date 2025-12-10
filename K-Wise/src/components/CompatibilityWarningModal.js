/**
 * ============================================================================
 * CompatibilityWarningModal - OrderSummary Final Validation
 * ============================================================================
 * 
 * Purpose: Final compatibility check before checkout
 * 
 * Features:
 * - Red banner for critical issues
 * - Warning modal for low compatibility scores
 * - "Proceed anyway" option for warnings
 * - "Fix issues" button to return to customizer
 * - Block checkout if critical errors exist
 * 
 * Props:
 * - show: Boolean to show/hide modal
 * - compatibility: Compatibility object from useCompatibility hook
 * - onProceed: Callback when user proceeds anyway
 * - onFixIssues: Callback to navigate back to fix issues
 * - onClose: Callback to close modal
 * 
 * Author: GitHub Copilot
 * Created: 2025-11-13
 * ============================================================================
 */

import React from 'react';
import './CompatibilityWarningModal.css';

export function CompatibilityWarningModal({ 
    show, 
    compatibility, 
    onProceed, 
    onFixIssues, 
    onClose 
}) {
    if (!show || !compatibility) return null;

    const { score, issues = [], warnings = [], recommendations = [] } = compatibility;

    // Determine severity
    const hasCriticalIssues = issues.length > 0;
    const isLowScore = score < 70;

    // Modal type
    const modalType = hasCriticalIssues ? 'critical' : isLowScore ? 'warning' : 'info';

    // Config by type
    const config = {
        critical: {
            title: '❌ Critical Compatibility Issues',
            subtitle: 'This build has critical issues that may prevent it from working.',
            color: '#ef4444',
            bgColor: '#fee2e2',
            allowProceed: false,
            proceedText: 'Cannot Proceed',
            fixText: 'Fix Issues'
        },
        warning: {
            title: '⚠️ Compatibility Warnings',
            subtitle: 'This build has some compatibility concerns.',
            color: '#f59e0b',
            bgColor: '#fef3c7',
            allowProceed: true,
            proceedText: 'Proceed Anyway',
            fixText: 'Review Build'
        },
        info: {
            title: '💡 Compatibility Notes',
            subtitle: 'Some recommendations for your build.',
            color: '#3b82f6',
            bgColor: '#dbeafe',
            allowProceed: true,
            proceedText: 'Continue',
            fixText: 'Review'
        }
    };

    const modalConfig = config[modalType];

    const handleProceed = () => {
        if (modalConfig.allowProceed && onProceed) {
            onProceed();
        }
    };

    const handleFix = () => {
        if (onFixIssues) {
            onFixIssues();
        }
    };

    return (
        <div className="compatibility-warning-modal-overlay" onClick={onClose}>
            <div 
                className={`compatibility-warning-modal ${modalType}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                    '--modal-color': modalConfig.color,
                    '--modal-bg': modalConfig.bgColor
                }}
            >
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title-row">
                        <h2 className="modal-title">{modalConfig.title}</h2>
                        <button className="modal-close" onClick={onClose}>✕</button>
                    </div>
                    <p className="modal-subtitle">{modalConfig.subtitle}</p>
                    
                    {score !== null && (
                        <div className="modal-score-container">
                            <div className="modal-score-circle" style={{
                                background: `conic-gradient(${modalConfig.color} ${score * 3.6}deg, #e5e7eb 0deg)`
                            }}>
                                <div className="modal-score-inner">
                                    <span className="modal-score-value">{score}%</span>
                                    <span className="modal-score-label">Compatible</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="modal-content">
                    {/* Critical Issues */}
                    {issues.length > 0 && (
                        <div className="modal-section critical">
                            <h3 className="section-title">
                                ❌ Critical Issues ({issues.length})
                            </h3>
                            <ul className="issue-list">
                                {issues.map((issue, idx) => (
                                    <li key={idx} className="issue-item">
                                        <div className="issue-message">
                                            {issue.message || issue}
                                        </div>
                                        {issue.solution && (
                                            <div className="issue-solution">
                                                💡 {issue.solution}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Warnings */}
                    {warnings.length > 0 && (
                        <div className="modal-section warning">
                            <h3 className="section-title">
                                ⚠️ Warnings ({warnings.length})
                            </h3>
                            <ul className="issue-list">
                                {warnings.map((warning, idx) => (
                                    <li key={idx} className="issue-item">
                                        <div className="issue-message">
                                            {warning.message || warning}
                                        </div>
                                        {warning.solution && (
                                            <div className="issue-solution">
                                                💡 {warning.solution}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Recommendations */}
                    {recommendations.length > 0 && (
                        <div className="modal-section info">
                            <h3 className="section-title">
                                💡 Recommendations ({recommendations.length})
                            </h3>
                            <ul className="issue-list">
                                {recommendations.slice(0, 3).map((rec, idx) => (
                                    <li key={idx} className="issue-item">
                                        <div className="issue-message">
                                            {rec.message || rec}
                                        </div>
                                    </li>
                                ))}
                                {recommendations.length > 3 && (
                                    <li className="issue-item more">
                                        +{recommendations.length - 3} more recommendations
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}

                    {/* No issues but low score */}
                    {issues.length === 0 && warnings.length === 0 && recommendations.length === 0 && isLowScore && (
                        <div className="modal-section info">
                            <p className="no-details">
                                The compatibility score is lower than recommended. 
                                Please review your component selections.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button 
                        className="modal-button fix-button"
                        onClick={handleFix}
                    >
                        {modalConfig.fixText}
                    </button>
                    
                    <button 
                        className={`modal-button proceed-button ${modalConfig.allowProceed ? '' : 'disabled'}`}
                        onClick={handleProceed}
                        disabled={!modalConfig.allowProceed}
                    >
                        {modalConfig.proceedText}
                    </button>
                </div>

                {/* Warning message for critical issues */}
                {hasCriticalIssues && (
                    <div className="modal-critical-notice">
                        ⚠️ You must resolve critical issues before proceeding with checkout.
                    </div>
                )}
            </div>
        </div>
    );
}

export default CompatibilityWarningModal;
