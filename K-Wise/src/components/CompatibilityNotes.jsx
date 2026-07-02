/**
 * PCPartPicker-Style Compatibility Notes Component
 * Displays detailed compatibility issues with lettered sections
 * Problems (A, B, C...) - Red
 * Warnings (continuing letters) - Yellow
 * Notes (continuing letters) - Blue
 * Disclaimers (final letter) - Blue
 * 
 * PHASE 2.4 ENHANCEMENT: Added enhanced compatibility features
 * - Component-level compatibility badges
 * - Detailed analysis grid display
 * - AI verification indicators
 * - Enhanced BIOS warnings
 * 
 * Starts collapsed as notification badge, expands on click
 */

import React, { useState } from 'react';
import './CompatibilityNotes.css';
import '../styles/EnhancedCompatibility.css'; // Phase 2.4: Import enhanced styles
import {
  getCompatibilityBadgeClass
} from '../utils/enhancedCompatibilityHelper'; // Phase 2.4: Import helper functions

const getScoreEmoji = (score) => {\n  if (score >= 90) return '🟢';\n  if (score >= 80) return '🟡';\n  if (score >= 70) return '🟠';\n  return '🔴';\n};\n\nconst CompatibilityNotes = ({ compatibilityData, buildComponents }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!compatibilityData) return null;

  // Extract all issues from different sources
  const extractIssues = () => {
    const problems = [];
    const warnings = [];
    const notes = [];
    const disclaimers = [];

    // From advanced compatibility layers
    const { layers = {} } = compatibilityData;

    // LAYER 1: Power Analysis - Check PSU adequacy
    if (layers.power) {
      const { status, analysis = {}, critical_issues = [] } = layers.power;
      
      if (status === 'insufficient' || status === 'critical') {
        problems.push({
          type: 'power',
          message: `The ${analysis.psu_name || 'selected power supply'} may not provide sufficient wattage. The estimated part list maximum power draw is ${analysis.total_power?.peak || analysis.estimated_wattage || 0}W.`,
          details: `PSU Wattage: ${analysis.psu_wattage || 0}W | Required: ${analysis.estimated_wattage || 0}W | Headroom: ${analysis.headroom_percentage || 0}%`
        });
      }

      if (status === 'minimal') {
        warnings.push({
          type: 'power',
          message: `The ${analysis.psu_name || 'selected power supply'} has minimal headroom. Consider a higher wattage PSU for better efficiency and longevity.`,
          details: `Current headroom: ${analysis.headroom_percentage || 0}%`
        });
      }

      // EPS power connector issues
      critical_issues.forEach(issue => {
        const issueText = typeof issue === 'string' ? issue : (issue.message || JSON.stringify(issue));
        if (issueText.toLowerCase().includes('eps') || issueText.toLowerCase().includes('power connector')) {
          warnings.push({
            type: 'eps_connector',
            message: issueText
          });
        }
      });
    }

    // LAYER 2: Physical Clearance - Check dimensions
    if (layers.clearance) {
      const { compatible, critical_issues = [], warnings: clearanceWarnings = [], checks = {} } = layers.clearance;
      
      if (!compatible) {
        critical_issues.forEach(issue => {
          // Handle both string and object formats
          const message = typeof issue === 'string' ? issue : (issue.message || JSON.stringify(issue));
          problems.push({
            type: 'clearance',
            message: message
          });
        });
      }

      clearanceWarnings.forEach(warning => {
        // Handle both string and object formats
        const message = typeof warning === 'string' ? warning : (warning.message || JSON.stringify(warning));
        warnings.push({
          type: 'clearance',
          message: message
        });
      });

      // Check specific clearance issues
      if (checks.gpu_length && !checks.gpu_length.passes) {
        problems.push({
          type: 'gpu_clearance',
          message: `GPU length exceeds case maximum. GPU: ${checks.gpu_length.actual}mm | Case Max: ${checks.gpu_length.max}mm`
        });
      }

      if (checks.cpu_cooler_height && !checks.cpu_cooler_height.passes) {
        problems.push({
          type: 'cooler_clearance',
          message: `CPU cooler height exceeds case maximum. Cooler: ${checks.cpu_cooler_height.actual}mm | Case Max: ${checks.cpu_cooler_height.max}mm`
        });
      }
    }

    // LAYER 3: Pairwise Component Compatibility
    if (layers.pairwise) {
      const { critical_issues = [], warnings: pairwiseWarnings = [] } = layers.pairwise;
      
      critical_issues.forEach(issue => {
        // Handle both string and object formats
        const message = typeof issue === 'string' ? issue : (issue.message || JSON.stringify(issue));
        problems.push({
          type: 'component_compatibility',
          message: message
        });
      });

      pairwiseWarnings.forEach(warning => {
        // Handle both string and object formats
        const message = typeof warning === 'string' ? warning : (warning.message || JSON.stringify(warning));
        warnings.push({
          type: 'component_compatibility',
          message: message
        });
      });
    }

    // LAYER 4: RAM Slots
    const ramSlots = checkRamSlots(buildComponents);
    if (ramSlots.needed > 0) {
      problems.push({
        type: 'ram_slots',
        message: `Four additional RAM slots are needed.`,
        details: `Current configuration requires ${ramSlots.total} slots, but only ${ramSlots.available} are available.`
      });
    }

    // LAYER 5: BIOS/Firmware
    if (compatibilityData.bios_warning) {
      const { severity, warning, solution } = compatibilityData.bios_warning;
      
      if (severity === 'critical' || severity === 'error') {
        problems.push({
          type: 'bios',
          message: warning,
          solution: solution
        });
      } else {
        notes.push({
          type: 'bios',
          message: warning,
          solution: solution
        });
      }
    }

    // LAYER 6: Real-World Data
    if (layers.real_world) {
      const { warnings: rwWarnings = [] } = layers.real_world;
      
      rwWarnings.forEach(warning => {
        if (warning.severity === 'critical') {
          problems.push({
            type: 'real_world',
            message: warning.title || warning.message,
            details: warning.workaround ? `Workaround: ${warning.workaround}` : null
          });
        } else if (warning.severity === 'major') {
          warnings.push({
            type: 'real_world',
            message: warning.title || warning.message,
            details: warning.workaround ? `Workaround: ${warning.workaround}` : null
          });
        } else {
          notes.push({
            type: 'real_world',
            message: warning.title || warning.message
          });
        }
      });
    }

    // Add generic disclaimers
    disclaimers.push({
      type: 'general',
      message: 'Some physical constraints are not checked, such as RAM clearance with CPU Coolers.'
    });

    return { problems, warnings, notes, disclaimers };
  };

  // Helper: Check RAM slot requirements
  const checkRamSlots = (components) => {
    const motherboard = components?.motherboard;
    const ram = components?.ram;
    
    if (!motherboard || !ram) return { needed: 0, total: 0, available: 0 };

    const ramSticks = ram.specifications?.sticks || ram.quantity || 1;
    const mbSlots = motherboard.specifications?.ram_slots || 4;
    
    return {
      needed: Math.max(0, ramSticks - mbSlots),
      total: ramSticks,
      available: mbSlots
    };
  };

  const { problems, warnings, notes, disclaimers } = extractIssues();

  // Generate lettered labels (A, B, C, ...)
  const getLabel = (index) => String.fromCharCode(65 + index); // 65 = 'A'

  // Determine badge status
  const getBadgeStatus = () => {
    if (problems.length > 0) return 'incompatible';
    if (warnings.length > 0) return 'warning';
    return 'compatible';
  };

  const badgeStatus = getBadgeStatus();

  // Extract compatibility score from response
  // API structure: { success: true, data: { compatibility_score: 55, layers: {...}, ... } }
  const compatibilityScore = compatibilityData?.compatibility_score || 0;
  
  // Debug logging for score extraction
  console.log('🔍 Compatibility Data Structure:', {
    hasCompatibilityScore: !!compatibilityData?.compatibility_score,
    scoreValue: compatibilityData?.compatibility_score,
    dataKeys: Object.keys(compatibilityData || {}),
    fullData: compatibilityData
  });

  let currentIndex = 0;

  return (
    <div className="pcpartpicker-compatibility-container">
      {/* Expanded Details - Shows ABOVE button when clicked (expand upwards) */}
      {isExpanded && (
        <div className="compatibility-details-expanded">
          {/* Compatibility Score Header */}
          <div className="compatibility-score-header">
            <div className="score-badge">
              <span className="score-label">Compatibility Score:</span>
              <span className={`score-value ${compatibilityScore >= 80 ? 'high' : compatibilityScore >= 60 ? 'medium' : 'low'}`}>
                {compatibilityScore}/100
              </span>
            </div>
          </div>

          {/* PHASE 2.4: Component-Level Compatibility Analysis */}
          {buildComponents && Object.keys(buildComponents).length > 0 && (
            <div className="component-compatibility-grid">
              <h3 className="grid-title">Component Analysis</h3>
              <div className="components-grid">
                {Object.entries(buildComponents).map(([category, component]) => {
                  if (!component) return null;
                  
                  // Extract component score from detailed_analysis if available
                  const componentScore = component.compatibility_score || 
                                        compatibilityData?.detailed_analysis?.[category]?.score || 
                                        85;
                  
                  const componentAnalysis = compatibilityData?.detailed_analysis?.[category];
                  
                  return (
                    <div key={category} className="component-card">
                      <div className="component-header">
                        <span className="component-category">{category.toUpperCase()}</span>
                        <span 
                          className={`compatibility-badge ${getCompatibilityBadgeClass(componentScore)}`}
                          title={componentAnalysis ? `Socket: ${componentAnalysis.socket || 'N/A'} | Power: ${componentAnalysis.power || 'N/A'}` : 'Component compatibility score'}
                        >
                          {getScoreEmoji(componentScore)} {componentScore}%
                        </span>
                      </div>
                      <div className="component-name">{component.name}</div>
                      
                      {/* Enhanced badges */}
                      
                      {/* Detailed analysis if available */}
                      {componentAnalysis && (
                        <div className="component-details">
                          {componentAnalysis.socket && (
                            <div className="detail-item">
                              <span className="detail-label">Socket:</span>
                              <span className="detail-value">{componentAnalysis.socket}</span>
                            </div>
                          )}
                          {componentAnalysis.power && (
                            <div className="detail-item">
                              <span className="detail-label">Power:</span>
                              <span className="detail-value">{componentAnalysis.power}</span>
                            </div>
                          )}
                          {componentAnalysis.clearance && (
                            <div className="detail-item">
                              <span className="detail-label">Clearance:</span>
                              <span className="detail-value">{componentAnalysis.clearance}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Problems Section - Red */}
          {problems.length > 0 && (
            <div className="compatibility-section problems-section">
              {problems.map((problem, idx) => {
                const label = getLabel(currentIndex++);
                return (
                  <div key={`problem-${idx}`} className="compatibility-item problem-item">
                    <div className="item-header">
                      <span className="item-label-badge problem-badge">{label}</span>
                      <span className="item-type">Problem:</span>
                    </div>
                    <div className="item-content">
                      <p className="item-message">{problem.message}</p>
                      {problem.details && (
                        <div className="item-details">
                          <strong>Details:</strong> {problem.details}
                        </div>
                      )}
                      {problem.solution && (
                        <div className="item-solution">
                          <strong>Solution:</strong> {problem.solution}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Warnings Section - Yellow */}
          {warnings.length > 0 && (
            <div className="compatibility-section warnings-section">
              {warnings.map((warning, idx) => {
                const label = getLabel(currentIndex++);
                return (
                  <div key={`warning-${idx}`} className="compatibility-item warning-item">
                    <div className="item-header">
                      <span className="item-label-badge warning-badge">{label}</span>
                      <span className="item-type">Warning:</span>
                    </div>
                    <div className="item-content">
                      <p className="item-message">{warning.message}</p>
                      {warning.details && (
                        <div className="item-details">
                          <strong>Details:</strong> {warning.details}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Notes Section - Blue */}
          {notes.length > 0 && (
            <div className="compatibility-section notes-section">
              {notes.map((note, idx) => {
                const label = getLabel(currentIndex++);
                return (
                  <div key={`note-${idx}`} className="compatibility-item note-item">
                    <div className="item-header">
                      <span className="item-label-badge note-badge">{label}</span>
                      <span className="item-type">Note:</span>
                    </div>
                    <div className="item-content">
                      <p className="item-message">{note.message}</p>
                      {note.solution && (
                        <div className="item-solution">
                          <strong>Info:</strong> {note.solution}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Disclaimers Section - Blue */}
          {disclaimers.length > 0 && (
            <div className="compatibility-section disclaimers-section">
              {disclaimers.map((disclaimer, idx) => {
                const label = getLabel(currentIndex++);
                return (
                  <div key={`disclaimer-${idx}`} className="compatibility-item disclaimer-item">
                    <div className="item-header">
                      <span className="item-label-badge disclaimer-badge">{label}</span>
                      <span className="item-type">Disclaimer:</span>
                    </div>
                    <div className="item-content">
                      <p className="item-message">{disclaimer.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* No Issues Message */}
          {problems.length === 0 && warnings.length === 0 && notes.length === 0 && disclaimers.length <= 1 && (
            <div className="no-issues-message">
              <span className="success-icon">✅</span>
              <span className="success-text">No compatibility issues detected! This build looks great.</span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Compatibility Button (Always Visible) */}
      <div 
        className={`compatibility-button ${badgeStatus} ${isExpanded ? 'expanded' : 'collapsed'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="button-content">
          <div className="button-left">
            <span className="button-icon">
              {badgeStatus === 'compatible' && '✅'}
              {badgeStatus === 'warning' && '⚠️'}
              {badgeStatus === 'incompatible' && '🚫'}
            </span>
            <span className="button-title">
              {badgeStatus === 'compatible' && 'Compatible!'}
              {badgeStatus === 'warning' && 'Potential Incompatibilities'}
              {badgeStatus === 'incompatible' && 'Potential Incompatibilities'}
            </span>
          </div>
          <div className="button-right">
            <span className="expand-icon">{isExpanded ? '▼' : '▲'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompatibilityNotes;
