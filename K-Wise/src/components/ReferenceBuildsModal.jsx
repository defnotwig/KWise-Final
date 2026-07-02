import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/networkConfig';
import Toast from './Toast';
import './ReferenceBuildsModal.css';

const ReferenceBuildsModal = ({ onClose }) => {
    // Offline kiosk mode keeps only PC Upgrade reference-build administration visible.
    const [activeSystem, setActiveSystem] = useState('pc-upgrade');
    const [activeTab, setActiveTab] = useState('builds'); // 'builds', 'parameters'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // State for PC Upgrade builds
    const [builds, setBuilds] = useState({});
    const [buildsMetadata, setBuildsMetadata] = useState(null);
    const [buildStats, setBuildStats] = useState(null);
    const [selectedBuild, setSelectedBuild] = useState(null);
    
    // Legacy customized-build state is retained for rollback but is not exposed in offline mode.
    const [aiBuilds, setAiBuilds] = useState({});
    const [aiBuildStats, setAiBuildStats] = useState(null);
    
    // State for new products
    const [newProducts, setNewProducts] = useState([]);
    const [hasNewProducts, setHasNewProducts] = useState(false);
    const [productStats, setProductStats] = useState(null);
    
    // State for PC Upgrade parameters
    const [usageTypes, setUsageTypes] = useState([]);
    const [yearRanges, setYearRanges] = useState([]);
    const [budgetRanges, setBudgetRanges] = useState([]);
    const [parametersSummary, setParametersSummary] = useState(null);
    
    // State for PC Customized AI parameters
    const [aiUsageTypes, setAiUsageTypes] = useState([]);
    const [aiBudgetRanges, setAiBudgetRanges] = useState([]);
    const [aiPerformancePrefs, setAiPerformancePrefs] = useState([]);
    const [aiGamingPrefs, setAiGamingPrefs] = useState([]);
    const [aiParametersSummary, setAiParametersSummary] = useState(null);
    
    const [editingParameter, setEditingParameter] = useState(null);
    
    // State for regeneration
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [regenerationStatus, setRegenerationStatus] = useState(null);
    
    // Toast notifications
    const [toasts, setToasts] = useState([]);
    
    // Fetch all data when system changes
    useEffect(() => {
        fetchAllData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSystem]);

    // Toast notification helper
    const showToast = (message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const fetchAllData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            if (activeSystem === 'pc-upgrade') {
                // Fetch PC Upgrade data - Using admin endpoints with proper authentication
                const [buildsRes, newProductsRes, parametersRes, statsRes, statusRes] = await Promise.all([
                    axios.get(`${getApiBaseUrl()}/admin/reference-builds/all`, { 
                        withCredentials: true
                    }),
                    axios.get(`${getApiBaseUrl()}/admin/reference-builds/new-products`, { 
                        withCredentials: true
                    }),
                    axios.get(`${getApiBaseUrl()}/admin/pc-upgrade-parameters/all`, { 
                        withCredentials: true
                    }),
                    axios.get(`${getApiBaseUrl()}/admin/reference-builds/statistics`, { 
                        withCredentials: true
                    }),
                    axios.get(`${getApiBaseUrl()}/admin/reference-builds/status`, { 
                        withCredentials: true
                    })
                ]);

                // Set builds data
                if (buildsRes.data.success) {
                    setBuilds(buildsRes.data.data.builds || {});
                    setBuildsMetadata(buildsRes.data.data.metadata);
                }

                // Set new products
                if (newProductsRes.data.success) {
                    setNewProducts(newProductsRes.data.data.newProducts || []);
                    setHasNewProducts(newProductsRes.data.data.hasNewProducts || false);
                    setProductStats(newProductsRes.data.data.statistics || null);
                }

                // Set parameters
                if (parametersRes.data.success) {
                    setUsageTypes(parametersRes.data.data.usageTypes || []);
                    setYearRanges(parametersRes.data.data.yearRanges || []);
                    setBudgetRanges(parametersRes.data.data.budgetRanges || []);
                    setParametersSummary(parametersRes.data.data.summary);
                }

                // Set statistics
                if (statsRes.data.success) {
                    setBuildStats(statsRes.data.data);
                }

                // Set regeneration status
                if (statusRes.data.success) {
                    setRegenerationStatus(statusRes.data.data);
                }
            } else if (activeSystem === 'pc-customized-ai') {
                // Legacy customized-build data is disabled in offline kiosk mode.
                const [buildsRes, newProductsRes, parametersRes, statsRes, statusRes] = await Promise.all([
                    axios.get(`${getApiBaseUrl()}/admin/pc-customized-ai-builds/all`, { 
                        withCredentials: true
                    }),
                    axios.get(`${getApiBaseUrl()}/admin/pc-customized-ai-builds/new-products`, { 
                        withCredentials: true
                    }),
                    axios.get(`${getApiBaseUrl()}/admin/pc-customized-ai-builds/parameters/all`, { 
                        withCredentials: true
                    }),
                    axios.get(`${getApiBaseUrl()}/admin/pc-customized-ai-builds/statistics`, { 
                        withCredentials: true
                    }),
                    axios.get(`${getApiBaseUrl()}/admin/pc-customized-ai-builds/status`, { 
                        withCredentials: true
                    })
                ]);

                // Set AI builds data
                if (buildsRes.data.success) {
                    setAiBuilds(buildsRes.data.data.builds || {});
                }

                // Set new products
                if (newProductsRes.data.success) {
                    setNewProducts(newProductsRes.data.data.newProducts || []);
                    setHasNewProducts(newProductsRes.data.data.hasNewProducts || false);
                    setProductStats(newProductsRes.data.data.statistics || null);
                }

                // Set AI parameters
                if (parametersRes.data.success) {
                    setAiUsageTypes(parametersRes.data.data.usageTypes || []);
                    setAiBudgetRanges(parametersRes.data.data.budgetRanges || []);
                    setAiPerformancePrefs(parametersRes.data.data.performancePreferences || []);
                    setAiGamingPrefs(parametersRes.data.data.gamingPreferences || []);
                    setAiParametersSummary(parametersRes.data.data.summary);
                }

                // Set statistics
                if (statsRes.data.success) {
                    setAiBuildStats(statsRes.data.data);
                }

                // Set regeneration status
                if (statusRes.data.success) {
                    setRegenerationStatus(statusRes.data.data);
                }
            }

        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = async () => {
        const systemName = 'PC Upgrade';
        if (!window.confirm(`Regenerate all ${systemName} reference builds? This may take a few minutes.`)) {
            return;
        }

        try {
            setIsRegenerating(true);
            // Use admin endpoints with authentication
            const endpoint = `${getApiBaseUrl()}/admin/reference-builds/regenerate`;
            const response = await axios.post(endpoint, {}, { 
                withCredentials: true
            });
            
            if (response.data.success) {
                showToast('Build regeneration started! This will take a few minutes.', 'info', 5000);
                
                // Poll for status
                const pollInterval = setInterval(async () => {
                    try {
                        // Use admin endpoints with authentication
                        const statusEndpoint = `${getApiBaseUrl()}/admin/reference-builds/status`;
                        const statusRes = await axios.get(statusEndpoint, { 
                            withCredentials: true
                        });
                        
                        if (statusRes.data.success) {
                            const status = statusRes.data.data.status;
                            setRegenerationStatus(statusRes.data.data);
                            
                            if (status === 'success') {
                                clearInterval(pollInterval);
                                setIsRegenerating(false);
                                showToast('Build regeneration completed successfully!', 'success', 5000);
                                fetchAllData(); // Refresh all data
                            } else if (status === 'failed') {
                                clearInterval(pollInterval);
                                setIsRegenerating(false);
                                showToast('Build regeneration failed. Please check server logs.', 'error', 5000);
                            }
                        }
                    } catch (err) {
                        console.error('Error polling status:', err);
                    }
                }, 5000); // Poll every 5 seconds

                // Stop polling after 10 minutes
                setTimeout(() => clearInterval(pollInterval), 600000);
            }
        } catch (err) {
            console.error('Error regenerating builds:', err);
            showToast('Failed to start build regeneration: ' + err.message, 'error');
            setIsRegenerating(false);
        }
    };

    const handleAddParameter = async (type) => {
        const name = prompt(`Enter ${type} name (e.g., "gaming", "2026-2030", "101000-150000"):`);
        if (!name) return;

        const displayName = prompt(`Enter display name (e.g., "🎮 Gaming", "📅 2026-2030 (Future)"):`);
        if (!displayName) return;

        try {
            const endpoint = type === 'usage' ? 'usage-types' : type === 'year' ? 'year-ranges' : 'budget-ranges';
            let data = { name, display_name: displayName };

            if (type === 'year') {
                const startYear = prompt('Enter start year:');
                const endYear = prompt('Enter end year:');
                const repYear = prompt('Enter representative year:');
                data = { ...data, start_year: Number.parseInt(startYear, 10), end_year: Number.parseInt(endYear, 10), representative_year: Number.parseInt(repYear, 10) };
            } else if (type === 'budget') {
                const minBudget = prompt('Enter minimum budget:');
                const maxBudget = prompt('Enter maximum budget:');
                const repBudget = prompt('Enter representative budget:');
                data = { ...data, min_budget: Number.parseInt(minBudget, 10), max_budget: Number.parseInt(maxBudget, 10), representative_budget: Number.parseInt(repBudget, 10) };
            }

            const response = await axios.post(`${getApiBaseUrl()}/admin/pc-upgrade-parameters/${endpoint}`, data);
            
            if (response.data.success) {
                showToast('Parameter added successfully!', 'success');
                fetchAllData();
            }
        } catch (err) {
            showToast('Failed to add parameter: ' + err.message, 'error');
        }
    };

    const handleEditParameter = (type, param) => {
        setEditingParameter({ type, ...param });
    };

    const handleSaveParameter = async () => {
        if (!editingParameter) return;

        try {
            const endpoint = editingParameter.type === 'usage' ? 'usage-types' : 
                           editingParameter.type === 'year' ? 'year-ranges' : 'budget-ranges';
            
            const response = await axios.put(
                `${getApiBaseUrl()}/admin/pc-upgrade-parameters/${endpoint}/${editingParameter.id}`,
                editingParameter
            );
            
            if (response.data.success) {
                showToast('Parameter updated successfully!', 'success');
                setEditingParameter(null);
                fetchAllData();
            }
        } catch (err) {
            showToast('Failed to update parameter: ' + err.message, 'error');
        }
    };

    const handleDeleteParameter = async (type, id) => {
        if (!window.confirm('Delete this parameter? This will affect build generation.')) {
            return;
        }

        try {
            const endpoint = type === 'usage' ? 'usage-types' : type === 'year' ? 'year-ranges' : 'budget-ranges';
            const response = await axios.delete(`${getApiBaseUrl()}/admin/pc-upgrade-parameters/${endpoint}/${id}`);
            
            if (response.data.success) {
                showToast('Parameter deleted successfully!', 'success');
                fetchAllData();
            }
        } catch (err) {
            showToast('Failed to delete parameter: ' + err.message, 'error');
        }
    };

    if (loading) {
        return (
            <div className="reference-builds-modal-overlay">
                <div className="reference-builds-modal">
                    <div className="modal-loading">
                        <div className="spinner"></div>
                        <p>Loading reference builds data...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="reference-builds-modal-overlay" onClick={onClose}>
            {/* Toast Notifications */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>

            <div className="reference-builds-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h2>🏗️ Reference Builds Management</h2>
                    <button className="close-button" onClick={onClose}>✕</button>
                </div>

                {/* System Selector */}
                <div className="system-selector">
                    <button 
                        className={`system-button ${activeSystem === 'pc-upgrade' ? 'active' : ''}`}
                        onClick={() => setActiveSystem('pc-upgrade')}
                    >
                        🔧 PC Upgrade (72 Builds)
                    </button>
                    {/*
                      Legacy PC Customized AI reference builds are intentionally hidden for
                      offline kiosk mode. The old branch remains in this file for rollback.
                    */}
                </div>

                {/* Tabs */}
                <div className="modal-tabs">
                    <button 
                        className={activeTab === 'builds' ? 'active' : ''} 
                        onClick={() => setActiveTab('builds')}
                    >
                        📄 Builds ({activeSystem === 'pc-upgrade' ? Object.keys(builds).length : Object.keys(aiBuilds).length})
                    </button>
                    <button 
                        className={activeTab === 'parameters' ? 'active' : ''} 
                        onClick={() => setActiveTab('parameters')}
                    >
                        ⚙️ Parameters
                    </button>
                </div>

                {error && (
                    <div className="error-banner">
                        ❌ Error: {error}
                    </div>
                )}

                {/* Content */}
                <div className="modal-content">
                    {activeTab === 'builds' ? (
                        <div className="builds-view">
                            {/* Top Section: Stats and New Products */}
                            <div className="builds-top-section">
                                {/* Left: Statistics */}
                                <div className="builds-stats">
                                    <h3>📊 Build Statistics</h3>
                                    {(activeSystem === 'pc-upgrade' ? buildStats : aiBuildStats) && (
                                        <div className="stats-grid">
                                            <div className="stat-card">
                                                <label>Total Builds:</label>
                                                <strong>{activeSystem === 'pc-upgrade' ? buildStats?.totalBuilds : aiBuildStats?.totalBuilds}</strong>
                                            </div>
                                            <div className="stat-card">
                                                <label>Expected:</label>
                                                <strong>{activeSystem === 'pc-upgrade' ? buildStats?.expectedBuilds : aiBuildStats?.expectedBuilds}</strong>
                                            </div>
                                            <div className="stat-card">
                                                <label>Status:</label>
                                                <strong className={(activeSystem === 'pc-upgrade' ? buildStats?.isComplete : aiBuildStats?.isComplete) ? 'status-success' : 'status-info'}>
                                                    {(() => {
                                                        const stats = activeSystem === 'pc-upgrade' ? buildStats : aiBuildStats;
                                                        if (!stats) return 'Unknown';
                                                        if (stats.isComplete) return '✅ Complete';
                                                        const hasSome = stats.totalBuilds > 0;
                                                        return hasSome ? '✅ Complete (with constraints)' : '⚠️ Not Generated';
                                                    })()}
                                                </strong>
                                            </div>
                                            <div className="stat-card">
                                                <label>Last Generated:</label>
                                                <strong>{buildsMetadata?.generated_at ? new Date(buildsMetadata.generated_at).toLocaleString() : 'Never'}</strong>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right: New Products */}
                                <div className="new-products">
                                    <h3>🆕 New Products Not in Builds</h3>
                                    
                                    {/* Build Count Info */}
                                    {(() => {
                                        const stats = activeSystem === 'pc-upgrade' ? buildStats : aiBuildStats;
                                        if (!stats) return null;
                                        
                                        const difference = stats.totalBuilds - stats.expectedBuilds;
                                        const hasExtra = difference > 0;
                                        const hasMissing = difference < 0;
                                        
                                        if (hasExtra) {
                                            return (
                                                <div className="info-banner build-info">
                                                    <div className="info-icon">ℹ️</div>
                                                    <div className="info-content">
                                                        <strong>Extra Build Variants Detected</strong>
                                                        <p>
                                                            Expected: <strong>{stats.expectedBuilds}</strong> builds
                                                            {' '}| Actual: <strong>{stats.totalBuilds}</strong> builds
                                                            {' '}(+{difference} variants)
                                                        </p>
                                                        <p className="info-detail">
                                                            Extra builds are variants using different component combinations or new stock items. This is normal when regenerating with new products.
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        } else if (hasMissing) {
                                            return (
                                                <div className="info-banner build-info-warning">
                                                    <div className="info-icon">ℹ️</div>
                                                    <div className="info-content">
                                                        <strong>Some Build Combinations Unavailable</strong>
                                                        <p>
                                                            Expected: <strong>{stats.expectedBuilds}</strong> builds
                                                            {' '}| Actual: <strong>{stats.totalBuilds}</strong> builds
                                                            {' '}({Math.abs(difference)} unavailable)
                                                        </p>
                                                        <p className="info-detail">
                                                            Some tier/usage/performance combinations cannot meet minimum price requirements with current stock. 
                                                            All generated builds are <strong>100% compliant</strong> with their price tiers.
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                    
                                    {productStats && (
                                        <div className="product-stats-summary">
                                            <p className="stat-line">
                                                <span className="stat-label">Total Products in Database:</span>
                                                <strong>{productStats.totalProductsInDatabase}</strong>
                                            </p>
                                            <p className="stat-line">
                                                <span className="stat-label">Used in Reference Builds:</span>
                                                <strong className="text-success">{productStats.totalProductsUsedInBuilds}</strong>
                                            </p>
                                            <p className="stat-line">
                                                <span className="stat-label">Not Yet in Builds:</span>
                                                <strong className={productStats.totalProductsNotInBuilds > 0 ? "text-warning" : "text-success"}>
                                                    {productStats.totalProductsNotInBuilds}
                                                </strong>
                                                {productStats.totalProductsNotInBuilds === 0 && (
                                                    <span className="check-icon"> ✓</span>
                                                )}
                                            </p>
                                        </div>
                                    )}
                                    {hasNewProducts ? (
                                        <div className="new-products-content">
                                            <p className="new-products-count">
                                                <strong>{newProducts.length}</strong> products need to be added to builds
                                            </p>
                                            <button 
                                                className="regenerate-button"
                                                onClick={handleRegenerate}
                                                disabled={isRegenerating}
                                            >
                                                {isRegenerating ? '🔄 Regenerating...' : '🚀 Regenerate Builds'}
                                            </button>
                                            {regenerationStatus?.status === 'in_progress' && (
                                                <p className="regeneration-status">⏳ Regeneration in progress...</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="no-new-products">
                                            <p>✅ All products are in builds!</p>
                                            {buildStats && buildStats.totalBuilds !== buildStats.expectedBuilds ? (
                                                <button 
                                                    className="regenerate-button warning"
                                                    onClick={handleRegenerate}
                                                    disabled={isRegenerating}
                                                >
                                                    {isRegenerating ? '🔄 Regenerating...' : '⚠️ Regenerate to Fix Count'}
                                                </button>
                                            ) : (
                                                <button 
                                                    className="regenerate-button secondary"
                                                    onClick={handleRegenerate}
                                                    disabled={isRegenerating}
                                                >
                                                    🔄 Regenerate Anyway
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bottom Section: Builds Display */}
                            <div className="builds-display">
                                <h3>📄 All Reference Builds</h3>
                                
                                {/* Build Preview Panel */}
                                {selectedBuild && (
                                    <div className="build-preview-panel">
                                        <div className="preview-header">
                                            <h4>📋 Build Preview: {selectedBuild.key}</h4>
                                            <button className="close-preview" onClick={() => setSelectedBuild(null)}>✕</button>
                                        </div>
                                        <div className="preview-content">
                                            <div className="preview-info">
                                                <p><strong>Usage:</strong> {selectedBuild.build.usage}</p>
                                                <p><strong>Year Range:</strong> {selectedBuild.build.yearRange}</p>
                                                <p><strong>Budget Range:</strong> {selectedBuild.build.budgetRange}</p>
                                                <p><strong>Target Budget:</strong> ₱{selectedBuild.build.targetBudget?.toLocaleString()}</p>
                                            </div>
                                            <div className="preview-components">
                                                <h5>Components:</h5>
                                                {Object.entries(selectedBuild.build.components || {})
                                                    .filter(([, comp]) => comp !== null && comp !== undefined)
                                                    .map(([compType, comp]) => {
                                                        const isObject = typeof comp === 'object' && comp !== null;
                                                        const name = isObject && comp.name ? comp.name : `Component ID: ${comp}`;
                                                        const price = isObject && comp.price ? Number.parseFloat(comp.price) : 0;
                                                        
                                                        return (
                                                            <div key={compType} className="component-item">
                                                                <strong>{compType}:</strong>
                                                                <span>{name}</span>
                                                                {price > 0 && <span className="component-price">₱{price.toLocaleString()}</span>}
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                        <div className="preview-footer">
                                            <button className="btn-secondary" onClick={() => setSelectedBuild(null)}>Close Preview</button>
                                        </div>
                                    </div>
                                )}

                                <div className="builds-grid">
                                    {Object.entries(activeSystem === 'pc-upgrade' ? builds : aiBuilds).map(([key, build]) => (
                                        <div key={key} className="build-card">
                                            <div className="build-card-header">
                                                <h4>{key}</h4>
                                                <button 
                                                    className="btn-edit"
                                                    onClick={() => {
                                                        setSelectedBuild({ key, build });
                                                    }}
                                                    title="View build preview"
                                                >
                                                    👁️ View
                                                </button>
                                            </div>
                                            <div className="build-info">
                                                <p><strong>Usage:</strong> {build.usage}</p>
                                                {build.yearRange && <p><strong>Year Range:</strong> {build.yearRange}</p>}
                                                {build.budgetRange && <p><strong>Budget:</strong> {build.budgetRange}</p>}
                                                {build.performance && <p><strong>Performance:</strong> {build.performance}</p>}
                                                <p><strong>Target:</strong> ₱{build.targetBudget?.toLocaleString()}</p>
                                            </div>
                                            <div className="build-components">
                                                <strong>Components:</strong>
                                                <ul>
                                                    {Object.entries(build.components || {})
                                                        .filter(([, comp]) => comp !== null && comp !== undefined)
                                                        .slice(0, 3)
                                                        .map(([compType, comp]) => {
                                                            const name = typeof comp === 'object' && comp.name 
                                                                ? comp.name 
                                                                : (comp ? `ID: ${comp}` : 'Not Set');
                                                            return (
                                                                <li key={compType}>
                                                                    <strong>{compType}:</strong> {name.substring(0, 25)}{name.length > 25 ? '...' : ''}
                                                                </li>
                                                            );
                                                        })}
                                                    {Object.entries(build.components || {}).filter(([, comp]) => comp).length > 3 && (
                                                        <li><em>...and {Object.entries(build.components || {}).filter(([, comp]) => comp).length - 3} more</em></li>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="parameters-view">
                            <div className="parameters-summary">
                                <h3>📊 Parameters Summary</h3>
                                {activeSystem === 'pc-upgrade' ? (
                                    parametersSummary && (
                                        <div className="summary-cards">
                                            <div className="summary-card">
                                                <label>Usage Types:</label>
                                                <strong>{parametersSummary.active_usage_types}</strong>
                                            </div>
                                            <div className="summary-card">
                                                <label>Year Ranges:</label>
                                                <strong>{parametersSummary.active_year_ranges}</strong>
                                            </div>
                                            <div className="summary-card">
                                                <label>Budget Ranges:</label>
                                                <strong>{parametersSummary.active_budget_ranges}</strong>
                                            </div>
                                            <div className="summary-card">
                                                <label>Expected Builds:</label>
                                                <strong>{parametersSummary.expected_total_builds}</strong>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    aiParametersSummary && (
                                        <div className="summary-cards">
                                            <div className="summary-card">
                                                <label>Usage Types:</label>
                                                <strong>{aiParametersSummary.active_usage_types}</strong>
                                            </div>
                                            <div className="summary-card">
                                                <label>Budget Ranges:</label>
                                                <strong>{aiParametersSummary.active_budget_ranges}</strong>
                                            </div>
                                            <div className="summary-card">
                                                <label>Performance Prefs:</label>
                                                <strong>{aiParametersSummary.active_performance_preferences}</strong>
                                            </div>
                                            <div className="summary-card">
                                                <label>Expected Builds:</label>
                                                <strong>{aiParametersSummary.expected_total_builds}</strong>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>

                            {activeSystem === 'pc-upgrade' ? (
                                <>
                                    {/* PC Upgrade Parameters (existing implementation) */}

                            {/* Usage Types */}
                            <div className="parameter-section">
                                <div className="section-header">
                                    <h3>🎮 Usage Types</h3>
                                    <button className="add-button" onClick={() => handleAddParameter('usage')}>
                                        ➕ Add Usage Type
                                    </button>
                                </div>
                                <div className="parameter-list">
                                    {usageTypes.map(type => (
                                        <div key={type.id} className="parameter-item">
                                            {editingParameter && editingParameter.id === type.id ? (
                                                // Edit Mode
                                                <div className="parameter-edit-form">
                                                    <input
                                                        type="text"
                                                        value={editingParameter.display_name}
                                                        onChange={(e) => setEditingParameter({
                                                            ...editingParameter,
                                                            display_name: e.target.value
                                                        })}
                                                        placeholder="Display Name"
                                                    />
                                                    <label>
                                                        <input
                                                            type="checkbox"
                                                            checked={editingParameter.is_active}
                                                            onChange={(e) => setEditingParameter({
                                                                ...editingParameter,
                                                                is_active: e.target.checked
                                                            })}
                                                        />
                                                        Active
                                                    </label>
                                                    <div className="edit-actions">
                                                        <button className="btn-save" onClick={handleSaveParameter}>💾 Save</button>
                                                        <button className="btn-cancel" onClick={() => setEditingParameter(null)}>❌ Cancel</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                // View Mode
                                                <>
                                                    <span>{type.display_name}</span>
                                                    <div className="parameter-actions">
                                                        <span className="parameter-status">{type.is_active ? '✅' : '❌'}</span>
                                                        <button className="edit-button" onClick={() => handleEditParameter('usage', type)} title="Edit parameter">
                                                            ✏️
                                                        </button>
                                                        <button className="delete-button" onClick={() => handleDeleteParameter('usage', type.id)} title="Delete parameter">
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Year Ranges */}
                            <div className="parameter-section">
                                <div className="section-header">
                                    <h3>📅 Year Ranges</h3>
                                    <button className="add-button" onClick={() => handleAddParameter('year')}>
                                        ➕ Add Year Range
                                    </button>
                                </div>
                                <div className="parameter-list">
                                    {yearRanges.map(range => (
                                        <div key={range.id} className="parameter-item">
                                            {editingParameter && editingParameter.id === range.id ? (
                                                // Edit Mode
                                                <div className="parameter-edit-form">
                                                    <input
                                                        type="text"
                                                        value={editingParameter.display_name}
                                                        onChange={(e) => setEditingParameter({
                                                            ...editingParameter,
                                                            display_name: e.target.value
                                                        })}
                                                        placeholder="Display Name"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={editingParameter.start_year}
                                                        onChange={(e) => setEditingParameter({
                                                            ...editingParameter,
                                                            start_year: Number.parseInt(e.target.value, 10)
                                                        })}
                                                        placeholder="Start Year"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={editingParameter.end_year}
                                                        onChange={(e) => setEditingParameter({
                                                            ...editingParameter,
                                                            end_year: Number.parseInt(e.target.value, 10)
                                                        })}
                                                        placeholder="End Year"
                                                    />
                                                    <label>
                                                        <input
                                                            type="checkbox"
                                                            checked={editingParameter.is_active}
                                                            onChange={(e) => setEditingParameter({
                                                                ...editingParameter,
                                                                is_active: e.target.checked
                                                            })}
                                                        />
                                                        Active
                                                    </label>
                                                    <div className="edit-actions">
                                                        <button className="btn-save" onClick={handleSaveParameter}>💾 Save</button>
                                                        <button className="btn-cancel" onClick={() => setEditingParameter(null)}>❌ Cancel</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                // View Mode
                                                <>
                                                    <span>{range.display_name}</span>
                                                    <div className="parameter-actions">
                                                        <span className="parameter-info">{range.start_year}-{range.end_year}</span>
                                                        <span className="parameter-status">{range.is_active ? '✅' : '❌'}</span>
                                                        <button className="edit-button" onClick={() => handleEditParameter('year', range)} title="Edit parameter">
                                                            ✏️
                                                        </button>
                                                        <button className="delete-button" onClick={() => handleDeleteParameter('year', range.id)} title="Delete parameter">
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Budget Ranges */}
                            <div className="parameter-section">
                                <div className="section-header">
                                    <h3>💵 Budget Ranges</h3>
                                    <button className="add-button" onClick={() => handleAddParameter('budget')}>
                                        ➕ Add Budget Range
                                    </button>
                                </div>
                                <div className="parameter-list">
                                    {budgetRanges.map(range => (
                                        <div key={range.id} className="parameter-item">
                                            {editingParameter && editingParameter.id === range.id ? (
                                                // Edit Mode
                                                <div className="parameter-edit-form">
                                                    <input
                                                        type="text"
                                                        value={editingParameter.display_name}
                                                        onChange={(e) => setEditingParameter({
                                                            ...editingParameter,
                                                            display_name: e.target.value
                                                        })}
                                                        placeholder="Display Name"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={editingParameter.min_budget}
                                                        onChange={(e) => setEditingParameter({
                                                            ...editingParameter,
                                                            min_budget: Number.parseFloat(e.target.value)
                                                        })}
                                                        placeholder="Min Budget"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={editingParameter.max_budget}
                                                        onChange={(e) => setEditingParameter({
                                                            ...editingParameter,
                                                            max_budget: Number.parseFloat(e.target.value)
                                                        })}
                                                        placeholder="Max Budget"
                                                    />
                                                    <label>
                                                        <input
                                                            type="checkbox"
                                                            checked={editingParameter.is_active}
                                                            onChange={(e) => setEditingParameter({
                                                                ...editingParameter,
                                                                is_active: e.target.checked
                                                            })}
                                                        />
                                                        Active
                                                    </label>
                                                    <div className="edit-actions">
                                                        <button className="btn-save" onClick={handleSaveParameter}>💾 Save</button>
                                                        <button className="btn-cancel" onClick={() => setEditingParameter(null)}>❌ Cancel</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                // View Mode
                                                <>
                                                    <span>{range.display_name}</span>
                                                    <div className="parameter-actions">
                                                        <span className="parameter-info">₱{range.min_budget.toLocaleString()}-₱{range.max_budget.toLocaleString()}</span>
                                                        <span className="parameter-status">{range.is_active ? '✅' : '❌'}</span>
                                                        <button className="edit-button" onClick={() => handleEditParameter('budget', range)} title="Edit parameter">
                                                            ✏️
                                                        </button>
                                                        <button className="delete-button" onClick={() => handleDeleteParameter('budget', range.id)} title="Delete parameter">
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                                </>
                            ) : (
                                <>
                                    {/* PC Customized AI Parameters (Read-only display) */}
                                    <div className="ai-parameters-info">
                                        <p className="info-message">
                                            ℹ️ PC Customized AI uses different parameters than PC Upgrade. 
                                            Parameters include: Usage Types (6), Budget Ranges (5), Performance Preferences (3), and Gaming Preferences (4).
                                        </p>
                                        
                                        <div className="parameter-section">
                                            <h3>🎮 Usage Types ({aiUsageTypes.length})</h3>
                                            <div className="parameter-list read-only">
                                                {aiUsageTypes.map(type => (
                                                    <div key={type.id} className="parameter-item">
                                                        <span>{type.display_name}</span>
                                                        <span className="parameter-status">{type.is_active ? '✅' : '❌'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="parameter-section">
                                            <h3>💵 Budget Ranges ({aiBudgetRanges.length})</h3>
                                            <div className="parameter-list read-only">
                                                {aiBudgetRanges.map(range => (
                                                    <div key={range.id} className="parameter-item">
                                                        <span>{range.display_name}</span>
                                                        <div className="parameter-actions">
                                                            <span className="parameter-info">₱{range.min_budget.toLocaleString()}-{range.max_budget ? '₱' + range.max_budget.toLocaleString() : '+'}</span>
                                                            <span className="parameter-status">{range.is_active ? '✅' : '❌'}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="parameter-section">
                                            <h3>🚀 Performance Preferences ({aiPerformancePrefs.length})</h3>
                                            <div className="parameter-list read-only">
                                                {aiPerformancePrefs.map(pref => (
                                                    <div key={pref.id} className="parameter-item">
                                                        <span>{pref.display_name}</span>
                                                        <span className="parameter-status">{pref.is_active ? '✅' : '❌'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="parameter-section">
                                            <h3>🎯 Gaming Preferences ({aiGamingPrefs.length})</h3>
                                            <div className="parameter-list read-only">
                                                {aiGamingPrefs.map(pref => (
                                                    <div key={pref.id} className="parameter-item">
                                                        <span>{pref.display_name}</span>
                                                        <span className="parameter-status">{pref.is_active ? '✅' : '❌'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReferenceBuildsModal;
