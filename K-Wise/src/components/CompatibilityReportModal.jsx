/**
 * Comprehensive Compatibility Report Modal
 * PCPartPicker-style detailed compatibility analysis UI
 * Shows layer-by-layer breakdown, visual matrix, power/clearance diagrams
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './CompatibilityReportModal.css';

const getStatusLabel = (status) => {
    switch (status) {
        case 'optimal': return '✅ Optimal';
        case 'minimal': return '⚠️ Minimal';
        case 'insufficient': return '❌ Insufficient';
        case 'oversized': return 'ℹ️ Oversized';
        case 'no_psu': return '⚠️ No PSU';
        default: return 'N/A';
    }
};

const getConfidenceClass = (confidence) => {
    if (confidence >= 70) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
};

const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return '#10b981';
    if (confidence >= 50) return '#f59e0b';
    return '#ef4444';
};

const getSeverityClass = (severity) => {
    if (severity === 'critical') return 'critical';
    if (severity === 'major') return 'major';
    return 'minor';
};

const getSeverityLabel = (severity) => {
    if (severity === 'critical') return '🚫 CRITICAL';
    if (severity === 'major') return '⚠️ MAJOR';
    return 'ℹ️ MINOR';
};

const getIssueIcon = (severity) => {
    switch (severity) {
        case 'critical': return '🚫';
        case 'error': return '❌';
        case 'warning': return '⚠️';
        default: return 'ℹ️';
    }
};

const getIssuesColor = (criticalIssues, majorIssues) => {
    if (criticalIssues > 0) return '#ef4444';
    if (majorIssues > 0) return '#f59e0b';
    return '#10b981';
};

const CompatibilityReportModal = ({ isOpen, onClose, buildConfiguration, analysisData }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [expandedLayers, setExpandedLayers] = useState({
        power: false,
        clearance: false,
        pairwise: false,
        bottleneck: false,
        realWorld: false
    });

    // Close modal on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        globalThis.addEventListener('keydown', handleEscape);
        return () => globalThis.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const {
        compatibility_score = 0,
        advanced_compatibility = {},
        deterministic_issues = [],
        recommendations = [],
        bios_warning = null,
        clearance_checks = {},
        database_rules = {}
    } = analysisData || {};

    // Extract advanced compatibility layers
    const powerAnalysis = advanced_compatibility?.power_analysis || {};
    const clearanceAnalysis = advanced_compatibility?.clearance_analysis || {};
    const pairwiseAnalysis = advanced_compatibility?.pairwise_analysis || {};
    const bottleneckAnalysis = advanced_compatibility?.bottleneck_analysis || {};
    const realWorldData = advanced_compatibility?.real_world_data || {
        confidence: 0,
        known_issues: 0,
        critical_issues: 0,
        major_issues: 0,
        similar_builds: 0,
        avg_build_satisfaction: 0,
        warnings: [],
        recommendations: []
    };

    // Combine all issues from different sources
    const issues = [
        ...deterministic_issues,
        ...(database_rules?.issues || []),
        ...(clearance_checks?.criticalIssues || []).map(issue => ({
            severity: 'critical',
            message: issue.warning,
            solution: issue.solution
        })),
        ...(bios_warning ? [{
            severity: bios_warning.severity,
            message: bios_warning.warning,
            solution: bios_warning.solution
        }] : [])
    ];

    const compatibilityScore = compatibility_score;

    // Calculate severity counts
    const severityCounts = {
        critical: issues.filter(i => i.severity === 'critical').length,
        error: issues.filter(i => i.severity === 'error').length,
        warning: issues.filter(i => i.severity === 'warning').length,
        info: issues.filter(i => i.severity === 'info').length
    };

    // Get score color and label
    const getScoreDisplay = (score) => {
        if (score >= 90) return { color: '#10b981', label: 'Excellent', icon: '✅' };
        if (score >= 75) return { color: '#3b82f6', label: 'Very Good', icon: '👍' };
        if (score >= 60) return { color: '#f59e0b', label: 'Good', icon: '⚠️' };
        if (score >= 40) return { color: '#ef4444', label: 'Poor', icon: '❌' };
        return { color: '#991b1b', label: 'Critical Issues', icon: '🚫' };
    };

    const scoreDisplay = getScoreDisplay(compatibilityScore);

    // Toggle layer expansion
    const toggleLayer = (layer) => {
        setExpandedLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
    };

    // Render build summary
    const renderBuildSummary = () => (
        <div className="build-summary">
            <h3>Build Components</h3>
            <div className="components-grid">
                {Object.entries(buildConfiguration || {}).map(([category, component]) => (
                    component && (
                        <div key={category} className="component-item">
                            <span className="component-category">{category.toUpperCase()}</span>
                            <span className="component-name">{component.name}</span>
                            <span className="component-price">${component.price?.toFixed(2)}</span>
                        </div>
                    )
                ))}
            </div>
        </div>
    );

    // Render compatibility score gauge
    const renderScoreGauge = () => (
        <div className="score-gauge">
            <div className="score-circle" style={{ borderColor: scoreDisplay.color }}>
                <div className="score-inner">
                    <span className="score-icon">{scoreDisplay.icon}</span>
                    <span className="score-value">{compatibilityScore}</span>
                    <span className="score-label">{scoreDisplay.label}</span>
                </div>
            </div>
            <div className="severity-badges">
                {severityCounts.critical > 0 && (
                    <span className="severity-badge critical">
                        {severityCounts.critical} Critical
                    </span>
                )}
                {severityCounts.error > 0 && (
                    <span className="severity-badge error">
                        {severityCounts.error} Errors
                    </span>
                )}
                {severityCounts.warning > 0 && (
                    <span className="severity-badge warning">
                        {severityCounts.warning} Warnings
                    </span>
                )}
                {severityCounts.info > 0 && (
                    <span className="severity-badge info">
                        {severityCounts.info} Suggestions
                    </span>
                )}
            </div>
        </div>
    );

    // Render power analysis layer
    const renderPowerLayer = () => {
        const status = powerAnalysis?.status || 'unknown';
        const message = powerAnalysis?.message || 'No power analysis available';
        const analysis = powerAnalysis?.analysis || {};
        const breakdown = powerAnalysis?.breakdown || {};
        const recommendations = powerAnalysis?.recommendations || [];

        return (
            <div className="analysis-layer">
                <button type="button" className="layer-header" onClick={() => toggleLayer('power')}>
                    <span className="layer-icon">⚡</span>
                    <span className="layer-title">Power Budget Analysis</span>
                    <span className={`layer-status ${status}`}>
                        {getStatusLabel(status)}
                    </span>
                    <span className="layer-toggle">{expandedLayers.power ? '▼' : '▶'}</span>
                </button>
                {expandedLayers.power && (
                    <div className="layer-content">
                        <p className="layer-message">{message}</p>
                        
                        {analysis.total_power && (
                            <div className="power-breakdown">
                                <div className="power-item">
                                    <span>Peak Power Consumption</span>
                                    <span className="power-value">{analysis.total_power.peak || 0}W</span>
                                </div>
                                <div className="power-item">
                                    <span>Typical Power Draw</span>
                                    <span className="power-value">{analysis.total_power.typical || 0}W</span>
                                </div>
                                <div className="power-item">
                                    <span>Idle Power</span>
                                    <span className="power-value">{analysis.total_power.idle || 0}W</span>
                                </div>
                                {analysis.psu_wattage && (
                                    <>
                                        <div className="power-item">
                                            <span>PSU Wattage</span>
                                            <span className="power-value">{analysis.psu_wattage}W</span>
                                        </div>
                                        <div className="power-item">
                                            <span>Load at Peak</span>
                                            <span className={`power-value ${analysis.load_at_peak > 80 ? 'warning' : 'success'}`}>
                                                {analysis.load_at_peak?.toFixed(1) || 0}%
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {breakdown && Object.keys(breakdown).length > 0 && (
                            <div className="component-power-chart">
                                <h4>Component Power Distribution</h4>
                                {Object.entries(breakdown).map(([component, power]) => {
                                    const totalPeak = analysis?.total_power?.peak || 1;
                                    const percentage = ((power?.peak || power || 0) / totalPeak * 100).toFixed(1);
                                    return (
                                        <div key={component} className="power-bar-item">
                                            <span className="power-bar-label">{component.toUpperCase()}</span>
                                            <div className="power-bar-container">
                                                <div 
                                                    className="power-bar-fill"
                                                    style={{ 
                                                        width: `${percentage}%`,
                                                        backgroundColor: '#3b82f6'
                                                    }}
                                                />
                                                <span className="power-bar-value">
                                                    {power?.peak || power || 0}W ({percentage}%)
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {recommendations && recommendations.length > 0 && (
                            <div className="power-recommendations">
                                <h4>💡 Recommendations</h4>
                                {recommendations.map((rec, idx) => (
                                    <div key={`rec-${idx}-${String(rec).slice(0, 20)}`} className="recommendation-item">
                                        {rec}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Render clearance analysis layer
    const renderClearanceLayer = () => {
        const compatible = clearanceAnalysis?.compatible !== false;
        const message = clearanceAnalysis?.message || 'No clearance analysis available';
        const criticalIssues = clearanceAnalysis?.critical_issues || [];
        const warnings = clearanceAnalysis?.warnings || [];
        const checks = clearanceAnalysis?.checks || {};

        return (
            <div className="analysis-layer">
                <button type="button" className="layer-header" onClick={() => toggleLayer('clearance')}>
                    <span className="layer-icon">📏</span>
                    <span className="layer-title">Physical Clearance</span>
                    <span className={`layer-status ${compatible ? 'success' : 'error'}`}>
                        {compatible ? '✅ All Fit' : '❌ Issues Found'}
                    </span>
                    <span className="layer-toggle">{expandedLayers.clearance ? '▼' : '▶'}</span>
                </button>
                {expandedLayers.clearance && (
                    <div className="layer-content">
                        <p className="layer-message">{message}</p>
                        
                        {criticalIssues.length > 0 && (
                            <div className="clearance-issues">
                                <h4>❌ Critical Clearance Issues</h4>
                                {criticalIssues.map((issue, idx) => (
                                    <div key={`clearance-${idx}-${(issue.check || '').slice(0, 15)}`} className="clearance-issue critical">
                                        <div className="issue-header">{issue.check || 'Clearance Check'}</div>
                                        <div className="issue-message">{issue.warning || issue.message}</div>
                                        {issue.measurements && (
                                            <div className="issue-measurements">
                                                {Object.entries(issue.measurements).map(([key, value]) => (
                                                    <span key={key}>{key}: {value}</span>
                                                ))}
                                            </div>
                                        )}
                                        {issue.solution && (
                                            <div className="issue-solution">💡 {issue.solution}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {warnings.length > 0 && (
                            <div className="clearance-warnings">
                                <h4>⚠️ Clearance Warnings</h4>
                                {warnings.map((warning, idx) => (
                                    <div key={`warn-${idx}-${(warning.warning || warning.message || '').slice(0, 15)}`} className="clearance-warning">
                                        <div className="warning-message">{warning.warning || warning.message}</div>
                                        {warning.solution && (
                                            <div className="warning-solution">💡 {warning.solution}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {Object.keys(checks).length > 0 && (
                            <div className="clearance-checks">
                                <h4>Dimension Checks</h4>
                                {Object.entries(checks).map(([checkName, checkData]) => (
                                    <div key={checkName} className={`clearance-check ${checkData.passed ? 'pass' : 'fail'}`}>
                                        <span className="check-icon">
                                            {checkData.passed ? '✅' : '❌'}
                                        </span>
                                        <div className="check-details">
                                            <span className="check-name">{checkName}</span>
                                            <span className="check-value">
                                                {checkData.actual || 'N/A'} / {checkData.max || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {criticalIssues.length === 0 && warnings.length === 0 && (
                            <div className="clearance-success">
                                <span className="success-icon">✅</span>
                                <span>All components fit within physical constraints!</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Render pairwise analysis layer
    const renderPairwiseLayer = () => {
        const compatible = pairwiseAnalysis?.compatible !== false;
        const pairs = pairwiseAnalysis?.pairs || [];
        const criticalIssues = pairwiseAnalysis?.critical_issues || [];
        const warnings = pairwiseAnalysis?.warnings || [];
        const summary = pairwiseAnalysis?.summary || {};

        return (
            <div className="analysis-layer">
                <button type="button" className="layer-header" onClick={() => toggleLayer('pairwise')}>
                    <span className="layer-icon">🔗</span>
                    <span className="layer-title">Component Compatibility</span>
                    <span className={`layer-status ${compatible ? 'success' : 'warning'}`}>
                        {summary.total_pairs_checked || 0} pairs checked
                    </span>
                    <span className="layer-toggle">{expandedLayers.pairwise ? '▼' : '▶'}</span>
                </button>
                {expandedLayers.pairwise && (
                    <div className="layer-content">
                        {criticalIssues.length > 0 && (
                            <div className="pairwise-issues">
                                <h4>❌ Compatibility Issues</h4>
                                {criticalIssues.map((issue, idx) => (
                                    <div key={`pair-issue-${idx}-${(issue.message || String(issue)).slice(0, 15)}`} className="pairwise-issue">
                                        <div className="issue-message">{issue.message || issue}</div>
                                        {issue.solution && (
                                            <div className="issue-solution">💡 {issue.solution}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {warnings.length > 0 && (
                            <div className="pairwise-warnings">
                                <h4>⚠️ Compatibility Warnings</h4>
                                {warnings.map((warning, idx) => (
                                    <div key={`pair-warn-${idx}-${(warning.message || String(warning)).slice(0, 15)}`} className="pairwise-warning">
                                        {warning.message || warning}
                                    </div>
                                ))}
                            </div>
                        )}

                        {pairs.length > 0 && (
                            <div className="compatibility-matrix">
                                <h4>Component Pair Analysis</h4>
                                <table className="matrix-table">
                                    <thead>
                                        <tr>
                                            <th>Component A</th>
                                            <th>Component B</th>
                                            <th>Status</th>
                                            <th>Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pairs.map((pair, idx) => (
                                            <tr key={`pair-${idx}-${pair.componentA || pair.component_a || ''}`} className={pair.compatible ? 'compatible' : 'incompatible'}>
                                                <td>{pair.componentA || pair.component_a || 'N/A'}</td>
                                                <td>{pair.componentB || pair.component_b || 'N/A'}</td>
                                                <td>
                                                    <span className={`compatibility-badge ${pair.compatible ? 'pass' : 'fail'}`}>
                                                        {pair.compatible ? '✅ Compatible' : '❌ Incompatible'}
                                                    </span>
                                                </td>
                                                <td className="pair-details">{pair.reason || pair.checks?.join(', ') || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {criticalIssues.length === 0 && warnings.length === 0 && pairs.length === 0 && (
                            <div className="pairwise-success">
                                <span className="success-icon">✅</span>
                                <span>All component pairs are compatible!</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Render bottleneck analysis layer
    const renderBottleneckLayer = () => {
        const balanced = bottleneckAnalysis?.balanced !== false;
        const message = bottleneckAnalysis?.message || 'No bottleneck analysis available';
        const bottlenecks = bottleneckAnalysis?.bottlenecks || [];
        const warnings = bottleneckAnalysis?.warnings || [];
        const summary = bottleneckAnalysis?.summary || {};

        return (
            <div className="analysis-layer">
                <button type="button" className="layer-header" onClick={() => toggleLayer('bottleneck')}>
                    <span className="layer-icon">🎯</span>
                    <span className="layer-title">Performance Balance</span>
                    <span className={`layer-status ${balanced ? 'success' : 'warning'}`}>
                        {balanced ? '✅ Balanced' : '⚠️ Bottlenecks Found'}
                    </span>
                    <span className="layer-toggle">{expandedLayers.bottleneck ? '▼' : '▶'}</span>
                </button>
                {expandedLayers.bottleneck && (
                    <div className="layer-content">
                        <p className="layer-message">{message}</p>

                        {bottlenecks.length > 0 && (
                            <div className="bottleneck-issues">
                                <h4>🎯 Performance Bottlenecks</h4>
                                {bottlenecks.map((bottleneck, idx) => (
                                    <div key={`bn-${idx}-${bottleneck.type || ''}`} className="bottleneck-item">
                                        <div className="bottleneck-header">
                                            <span className="bottleneck-severity">{bottleneck.severity || 'warning'}</span>
                                            <span className="bottleneck-type">{bottleneck.type || 'Component Mismatch'}</span>
                                        </div>
                                        <div className="bottleneck-message">{bottleneck.message}</div>
                                        {bottleneck.performance_loss && (
                                            <div className="performance-loss">
                                                Expected performance loss: {bottleneck.performance_loss}%
                                            </div>
                                        )}
                                        {bottleneck.suggestion && (
                                            <div className="bottleneck-suggestion">💡 {bottleneck.suggestion}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {warnings.length > 0 && (
                            <div className="bottleneck-warnings">
                                <h4>⚠️ Performance Warnings</h4>
                                {warnings.map((warning, idx) => (
                                    <div key={`bn-warn-${idx}-${(warning.message || String(warning)).slice(0, 15)}`} className="bottleneck-warning">
                                        <div className="warning-message">{warning.message || warning}</div>
                                        {warning.suggestion && (
                                            <div className="warning-suggestion">💡 {warning.suggestion}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {summary.critical_bottlenecks === 0 && bottlenecks.length === 0 && warnings.length === 0 && (
                            <div className="no-bottlenecks">
                                <span className="success-icon">✅</span>
                                <span>No performance bottlenecks detected. Build is well-balanced!</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // PRIORITY 3: Render real-world data layer
    const renderRealWorldLayer = () => (
        <div className="analysis-layer">
            <button type="button" className="layer-header" onClick={() => toggleLayer('realWorld')}>
                <span className="layer-icon">🌍</span>
                <span className="layer-title">Real-World Feedback & Known Issues</span>
                <span className={`layer-status ${realWorldData.status || 'medium_confidence'}`}>
                    {realWorldData.confidence}% confidence ({realWorldData.similar_builds} builds)
                </span>
                <span className="layer-toggle">{expandedLayers.realWorld ? '▼' : '▶'}</span>
            </button>
            {expandedLayers.realWorld && (
                <div className="layer-content">
                    {/* Confidence Score Display */}
                    <div className="real-world-confidence">
                        <div className="confidence-header">
                            <span className="confidence-label">Community Confidence Score</span>
                            <span className={`confidence-value ${getConfidenceClass(realWorldData.confidence)}`}>
                                {realWorldData.confidence}%
                            </span>
                        </div>
                        <div className="confidence-bar-container">
                            <div 
                                className="confidence-bar-fill"
                                style={{ 
                                    width: `${realWorldData.confidence}%`,
                                    background: (() => {
                                        if (realWorldData.confidence >= 70) return '#10b981';
                                        if (realWorldData.confidence >= 50) return '#f59e0b';
                                        return '#ef4444';
                                    })()
                                }}
                            />
                        </div>
                        <div className="confidence-metrics">
                            <div className="confidence-metric">
                                <span className="metric-value">{realWorldData.similar_builds}</span>
                                <span className="metric-label">Similar Builds</span>
                            </div>
                            <div className="confidence-metric">
                                <span className="metric-value">{realWorldData.known_issues}</span>
                                <span className="metric-label">Known Issues</span>
                            </div>
                            <div className="confidence-metric">
                                <span className="metric-value">
                                    {realWorldData.avg_build_satisfaction ? `${realWorldData.avg_build_satisfaction}%` : 'N/A'}
                                </span>
                                <span className="metric-label">Avg Satisfaction</span>
                            </div>
                        </div>
                    </div>

                    {/* Known Issues List */}
                    {realWorldData.warnings && realWorldData.warnings.length > 0 && (
                        <div className="known-issues-list">
                            <h4>⚠️ Known Issues from Community</h4>
                            {realWorldData.warnings.map((warning, idx) => (
                                <div 
                                    key={`ki-${idx}-${(warning.title || warning.message || '').slice(0, 15)}`} 
                                    className={`known-issue-card ${getSeverityClass(warning.severity)}`}
                                >
                                    <div className="issue-severity-badge">
                                        {getSeverityLabel(warning.severity)}
                                    </div>
                                    <div className="issue-title">{warning.title || warning.message}</div>
                                    {warning.workaround && (
                                        <div className="issue-workaround">
                                            <strong>Workaround:</strong> {warning.workaround}
                                        </div>
                                    )}
                                    {warning.requires_bios_update && (
                                        <div className="issue-bios">
                                            <strong>⚡ BIOS Update Required:</strong> {warning.bios_version || 'Latest version'}
                                        </div>
                                    )}
                                    {warning.verification_count > 0 && (
                                        <div className="issue-verification">
                                            ✅ Verified by {warning.verification_count} users
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Community Recommendations */}
                    {realWorldData.recommendations && realWorldData.recommendations.length > 0 && (
                        <div className="community-recommendations">
                            <h4>💡 Community Recommendations</h4>
                            {realWorldData.recommendations.map((rec, idx) => (
                                <div key={`crec-${idx}-${String(rec).slice(0, 20)}`} className="community-rec-card">
                                    <span className="rec-icon">👍</span>
                                    <span className="rec-text">{rec}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No Issues State */}
                    {(!realWorldData.warnings || realWorldData.warnings.length === 0) && (
                        <div className="no-known-issues">
                            <span className="success-icon">✅</span>
                            <div className="no-issues-text">
                                <strong>No known compatibility issues!</strong>
                                <p>This build combination has been tested by {realWorldData.similar_builds} users with an average satisfaction of {realWorldData.avg_build_satisfaction}%</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    // Render recommendations tab
    const renderRecommendations = () => (
        <div className="recommendations-section">
            <h3>Compatibility Recommendations</h3>
            {recommendations.length > 0 ? (
                <div className="recommendations-list">
                    {recommendations.map((rec, idx) => (
                        <div key={`rcard-${idx}-${rec.type || ''}`} className="recommendation-card">
                            <div className="recommendation-header">
                                <span className="recommendation-type">{rec.type}</span>
                                <span className="recommendation-priority">{rec.priority}</span>
                            </div>
                            <p className="recommendation-text">{rec.message}</p>
                            {rec.alternatives && rec.alternatives.length > 0 && (
                                <div className="recommendation-alternatives">
                                    <strong>Suggested Alternatives:</strong>
                                    {rec.alternatives.map((alt, altIdx) => (
                                        <div key={`alt-${altIdx}-${(alt.name || '').slice(0, 15)}`} className="alternative-item">
                                            <span className="alt-name">{alt.name}</span>
                                            <span className="alt-price">${alt.price?.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="no-recommendations">
                    <p>No recommendations at this time. Your build looks good!</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="compatibility-modal-overlay" role="none" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
            <dialog open className="compatibility-modal" aria-label="Compatibility Analysis Report">
                {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                <div className="modal-inner" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h2>Compatibility Analysis Report</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                {/* Tabs */}
                <div className="modal-tabs">
                    <button 
                        className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'layers' ? 'active' : ''}`}
                        onClick={() => setActiveTab('layers')}
                    >
                        Layer Analysis
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'knownIssues' ? 'active' : ''}`}
                        onClick={() => setActiveTab('knownIssues')}
                    >
                        Known Issues ({realWorldData.known_issues || 0})
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'recommendations' ? 'active' : ''}`}
                        onClick={() => setActiveTab('recommendations')}
                    >
                        Recommendations ({recommendations.length})
                    </button>
                </div>

                {/* Content */}
                <div className="modal-content">
                    {activeTab === 'overview' && (
                        <div className="overview-tab">
                            {renderScoreGauge()}
                            {renderBuildSummary()}
                            
                            {issues.length > 0 && (
                                <div className="issues-summary">
                                    <h3>Compatibility Issues</h3>
                                    {issues.map((issue, idx) => (
                                        <div key={`issue-${idx}-${issue.severity || ''}`} className={`issue-item ${issue.severity}`}>
                                            <span className="issue-icon">
                                                {getIssueIcon(issue.severity)}
                                            </span>
                                            <div className="issue-content">
                                                <span className="issue-message">{issue.message}</span>
                                                {issue.solution && (
                                                    <span className="issue-solution">💡 {issue.solution}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'layers' && (
                        <div className="layers-tab">
                            {renderPowerLayer()}
                            {renderClearanceLayer()}
                            {renderPairwiseLayer()}
                            {renderBottleneckLayer()}
                            {renderRealWorldLayer()}
                        </div>
                    )}

                    {activeTab === 'knownIssues' && (
                        <div className="known-issues-tab">
                            <h3>🌍 Real-World Feedback & Known Issues</h3>
                            
                            {/* Confidence Score Summary */}
                            <div className="real-world-summary-card">
                                <div className="summary-stat">
                                    <span className="stat-value" style={{
                                        color: getConfidenceColor(realWorldData.confidence)
                                    }}>
                                        {realWorldData.confidence}%
                                    </span>
                                    <span className="stat-label">Community Confidence</span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-value">{realWorldData.similar_builds}</span>
                                    <span className="stat-label">Similar Builds Tested</span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-value">
                                        {realWorldData.avg_build_satisfaction || 'N/A'}
                                        {realWorldData.avg_build_satisfaction ? '%' : ''}
                                    </span>
                                    <span className="stat-label">Avg Satisfaction</span>
                                </div>
                                <div className="summary-stat">
                                    <span className="stat-value" style={{
                                        color: getIssuesColor(realWorldData.critical_issues, realWorldData.major_issues)
                                    }}>
                                        {realWorldData.known_issues}
                                    </span>
                                    <span className="stat-label">Known Issues</span>
                                </div>
                            </div>

                            {/* Critical Issues Warning */}
                            {realWorldData.critical_issues > 0 && (
                                <div className="critical-warning-banner">
                                    <span className="warning-icon">🚫</span>
                                    <div className="warning-content">
                                        <strong>CRITICAL COMPATIBILITY ISSUES DETECTED!</strong>
                                        <p>{realWorldData.critical_issues} critical issues reported by the community. Please review carefully before proceeding.</p>
                                    </div>
                                </div>
                            )}

                            {/* Known Issues List */}
                            {realWorldData.warnings && realWorldData.warnings.length > 0 ? (
                                <div className="issues-list-container">
                                    {realWorldData.warnings.map((warning, idx) => (
                                        <div 
                                            key={`ki-detail-${idx}-${(warning.title || warning.message || '').slice(0, 15)}`} 
                                            className={`known-issue-detail-card ${warning.severity || 'minor'}`}
                                        >
                                            <div className="issue-header-row">
                                                <span className={`severity-indicator ${warning.severity || 'minor'}`}>
                                                    {getSeverityLabel(warning.severity)}
                                                </span>
                                                {warning.verification_count > 0 && (
                                                    <span className="verification-badge">
                                                        ✅ {warning.verification_count} verifications
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="issue-title-text">
                                                {warning.title || warning.message}
                                            </div>
                                            
                                            {warning.description && (
                                                <div className="issue-description-text">
                                                    {warning.description}
                                                </div>
                                            )}
                                            
                                            {warning.workaround && (
                                                <div className="issue-workaround-box">
                                                    <strong>🔧 Workaround:</strong>
                                                    <p>{warning.workaround}</p>
                                                </div>
                                            )}
                                            
                                            {warning.requires_bios_update && (
                                                <div className="issue-bios-box">
                                                    <strong>⚡ BIOS Update Required</strong>
                                                    <p>Minimum version: {warning.bios_version || 'Latest available'}</p>
                                                </div>
                                            )}
                                            
                                            {warning.source && (
                                                <div className="issue-source">
                                                    Source: {warning.source}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-issues-state">
                                    <span className="success-icon-large">✅</span>
                                    <h4>No Known Compatibility Issues!</h4>
                                    <p>This component combination has been successfully used by {realWorldData.similar_builds} users.</p>
                                    {realWorldData.avg_build_satisfaction > 0 && (
                                        <p className="satisfaction-note">
                                            Average user satisfaction: <strong>{realWorldData.avg_build_satisfaction}%</strong>
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Community Recommendations */}
                            {realWorldData.recommendations && realWorldData.recommendations.length > 0 && (
                                <div className="community-rec-section">
                                    <h4>💡 Community Recommendations</h4>
                                    <div className="rec-cards-grid">
                                        {realWorldData.recommendations.map((rec, idx) => (
                                            <div key={`rcard2-${idx}-${String(rec).slice(0, 20)}`} className="rec-card">
                                                <span className="rec-icon">👍</span>
                                                <span className="rec-text">{rec}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'recommendations' && renderRecommendations()}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="export-button">📄 Export Report</button>
                    <button className="print-button">🖨️ Print</button>
                    <button className="close-footer-button" onClick={onClose}>Close</button>
                </div>
                </div>
            </dialog>
        </div>
    );
};

CompatibilityReportModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    buildConfiguration: PropTypes.object,
    analysisData: PropTypes.object
};

export default CompatibilityReportModal;
