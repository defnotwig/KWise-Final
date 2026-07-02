/**
 * ============================================================================
 * COMPATIBILITY VALIDATION MODAL (v3.0 - Simple Warning Popup)
 * ============================================================================
 * 
 * Simple pre-checkout warning modal that shows only critical compatibility issues.
 * 
 * Features:
 * - Shows only CRITICAL PROBLEMS (no warnings, notes, or compatible items)
 * - Simple warning message with issues list
 * - PAGE-SPECIFIC blocking: PC-Parts allows "Proceed Anyway", others block completely
 * - Full compatibility details shown in Order Summary via CompatibilityNotes component
 * 
 * Usage:
 * <CompatibilityValidationModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onProceed={handleProceedToCheckout}
 *   cartItems={cartItems}
 *   pageName="PC-Parts"
 * />
 * 
 * ============================================================================
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import './CompatibilityValidationModal.css';
import { getApiBaseUrl } from '../utils/networkConfig';

// 🔥 PHASE 11 PART 3: ULTRA-VERBOSE helper functions for detailed compatibility messages
const formatIssueMessage = (issue) => {
  if (issue.message) return issue.message;
  
  // Generate message from components and rule
  const comp1 = issue.component_a || issue.component1 || 'Component';
  const comp2 = issue.component_b || issue.component2 || 'Component';
  const rule = issue.rule || issue.type || 'compatibility check';
  
  return `${comp1} ↔ ${comp2}: ${rule}`;
};

const appendSection = (details, text) => details ? `${details}\n\n${text}` : text;

const buildComponentSection = (issue) => {
  const comp1 = issue.component_a || issue.component1;
  const comp2 = issue.component_b || issue.component2;
  const comp = issue.component;
  if (!comp1 && !comp2 && !comp) return '';
  let section = '🔧 Components Affected:\n';
  if (comp1) section += `   • ${comp1}\n`;
  if (comp2) section += `   • ${comp2}\n`;
  if (comp && comp !== comp1 && comp !== comp2) section += `   • ${comp}\n`;
  return section;
};

const formatIssueDetails = (issue) => {
  if (issue.details) return issue.details;
  
  let details = issue.message || '';
  
  const compSection = buildComponentSection(issue);
  if (compSection) details = appendSection(details, compSection);
  if (issue.rule) details = appendSection(details, `📋 Rule: ${issue.rule}`);
  if (issue.fix) details = appendSection(details, `💡 Solutions:\n${issue.fix}`);
  if (issue.impact) details = appendSection(details, `⚠️ Impact: ${issue.impact}`);
  if (issue.penalty) details = appendSection(details, `📊 Compatibility Penalty: -${issue.penalty} points`);
  
  return details || 'Compatibility issue detected. Please verify component specifications with manufacturer before purchase.';
};

// Category lookup maps (module-level constants)
const DB_CATEGORY_TO_KEY = {
  'cpu': 'cpu', 'processor': 'cpu', 'central processing unit': 'cpu',
  'gpu': 'gpu', 'graphics card': 'gpu', 'video card': 'gpu', 'graphics processing unit': 'gpu',
  'motherboard': 'motherboard', 'mainboard': 'motherboard',
  'ram': 'ram', 'memory': 'ram', 'memory (ram)': 'ram',
  'storage': 'storage', 'ssd': 'storage', 'hdd': 'storage', 'hard drive': 'storage', 'solid state drive': 'storage',
  'cooling': 'cooling', 'cpu cooler': 'cooling', 'cooler': 'cooling',
  'psu': 'psu', 'power supply': 'psu', 'power supply unit': 'psu',
  'case': 'case', 'pc case': 'case', 'chassis': 'case'
};
const CATEGORY_TO_DISPLAY = {
  'central processing unit': 'CPU', 'central_processing_unit': 'CPU', 'processor': 'CPU', 'cpu': 'CPU',
  'graphics processing unit': 'GPU', 'graphics_processing_unit': 'GPU', 'graphics card': 'GPU', 'video card': 'GPU', 'gpu': 'GPU',
  'cpu cooler': 'Cooling', 'cpu_cooler': 'Cooling', 'cooler': 'Cooling', 'cooling': 'Cooling',
  'memory (ram)': 'RAM', 'memory': 'RAM', 'ram': 'RAM',
  'motherboard': 'Motherboard', 'mainboard': 'Motherboard',
  'storage': 'Storage', 'ssd': 'Storage', 'hdd': 'Storage',
  'power supply unit': 'PSU', 'power_supply_unit': 'PSU', 'power supply': 'PSU', 'psu': 'PSU',
  'pc case': 'Case', 'pc_case': 'Case', 'case': 'Case', 'chassis': 'Case'
};

const refetchCartItems = async (cartItems) => {
  const freshCartItems = [];
  for (const item of cartItems) {
    if (!item.id) { freshCartItems.push(item); continue; }
    try {
      const response = await fetch(`${getApiBaseUrl()}/stock/${item.id}`);
      if (!response.ok) throw new Error(`Failed to fetch component ${item.id}`);
      const data = await response.json();
      freshCartItems.push(data.success && data.data ? data.data : item);
    } catch (fetchError) {
      console.debug('Fetch fallback for item', item.id, fetchError.message);
      freshCartItems.push(item);
    }
  }
  return freshCartItems;
};

const processCartItem = (item) => {
  if (!item?.category || !item?.id) {
    let reason = 'Missing ID field';
    if (!item) reason = 'null item';
    else if (!item.category) reason = 'Missing category field';
    return { skip: true, reason, name: item?.name || 'Unknown' };
  }
  const lowerCategory = item.category.toLowerCase().trim();
  let categoryKey = lowerCategory
    .replaceAll(/\s+/g, '_')
    .replaceAll(/central_processing_unit/ig, 'cpu')
    .replaceAll(/graphics_processing_unit/ig, 'gpu')
    .replaceAll(/memory_\(ram\)/ig, 'ram')
    .replaceAll(/memory/ig, 'ram')
    .replaceAll(/cpu_cooler/ig, 'cooling')
    .replaceAll(/power_supply_unit/ig, 'psu')
    .replaceAll(/pc_case/ig, 'case');
  categoryKey = DB_CATEGORY_TO_KEY[lowerCategory] || categoryKey;
  const normalizedCategory = CATEGORY_TO_DISPLAY[lowerCategory] || item.category;
  const fullProduct = {
    id: item.id, name: item.name, category: normalizedCategory,
    brand: item.brand || null, price: item.price || 0,
    specifications: item.specifications || item.normalized_specs || item.specs || {},
    dimensions: item.dimensions || {}, image_url: item.image_url || null
  };
  return { skip: false, categoryKey, fullProduct };
};

const buildComponentsFromItems = (itemsToValidate) => {
  const components = {};
  const skippedItems = [];
  const multiSlot = { ram: [], storage: [] };
  for (const item of itemsToValidate) {
    const result = processCartItem(item);
    if (result.skip) { skippedItems.push({ name: result.name, reason: result.reason }); continue; }
    if (result.categoryKey === 'ram') multiSlot.ram.push(result.fullProduct);
    else if (result.categoryKey === 'storage') multiSlot.storage.push(result.fullProduct);
    else components[result.categoryKey] = result.fullProduct;
  }
  if (multiSlot.ram.length > 0) components.ram = multiSlot.ram.length === 1 ? multiSlot.ram[0] : multiSlot.ram;
  if (multiSlot.storage.length > 0) components.storage = multiSlot.storage.length === 1 ? multiSlot.storage[0] : multiSlot.storage;
  return { components, skippedItems };
};

const CompatibilityValidationModal = ({
  isOpen,
  onClose,
  onProceed,
  cartItems = [],
  pageName = 'Unknown'
}) => {
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [freshComponents, setFreshComponents] = useState(null); // Store refetched components

  // Memoize validateCompatibility to prevent recreation on every render
  const validateCompatibility = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // ✅ FIX: Validate cart items before processing
      console.log('🔍 Cart items received:', cartItems.length);
      console.log('📦 Cart contents:', JSON.stringify(cartItems.map(i => ({ name: i.name, category: i.category, id: i.id })), null, 2));

      if (!cartItems || cartItems.length === 0) {
        throw new Error('Cart is empty. Add components before validating compatibility.');
      }

      // Refetch fresh component data from API
      const freshCartItems = await refetchCartItems(cartItems);
      const itemsToValidate = freshCartItems.length > 0 ? freshCartItems : cartItems;

      // Convert cart items to components object
      const { components, skippedItems } = buildComponentsFromItems(itemsToValidate);

      // Validate that we actually have components
      if (Object.keys(components).length === 0) {
        console.error('❌ NO COMPONENTS CONVERTED!');
        console.error('Skipped items:', skippedItems);
        console.error('Items to validate (full):', JSON.stringify(itemsToValidate, null, 2));
        console.error('Items to validate (summary):', itemsToValidate.map(i => ({ 
          name: i.name, 
          category: i.category, 
          id: i.id,
          hasCategory: !!i.category,
          hasId: !!i.id,
          allKeys: Object.keys(i)
        })));
        
        // Attempt to get fresh data from localStorage
        const freshCart = JSON.parse(localStorage.getItem('cart') || '[]');
        console.error('Fresh cart from localStorage:', JSON.stringify(freshCart, null, 2));
        
        throw new Error(
          `Unable to validate compatibility: Cart items are missing required fields.\n\n` +
          `Received ${cartItems.length} cart items, but none have valid category and ID fields.\n` +
          (skippedItems.length > 0 ? '\nSkipped ' + skippedItems.length + ' items:\n' + skippedItems.map(s => '- ' + s.name + ': ' + s.reason).join('\n') : '') +
          `\n\nThis is likely a data integrity issue. Try:\n` +
          `1. Refresh the page\n` +
          `2. Clear cart and re-add items\n` +
          `3. Contact support if issue persists`
        );
      }

      // Call backend comprehensive compatibility analysis
      const apiBaseUrl = getApiBaseUrl();
      
      // 🔥 FIX: Filter out null/undefined components to prevent backend errors
      const cleanedComponents = Object.keys(components).reduce((acc, key) => {
        if (components[key] !== null && components[key] !== undefined) {
          acc[key] = components[key];
        }
        return acc;
      }, {});
      
      // Log request payload for debugging
      const requestPayload = {
        components: cleanedComponents,
        pageName: pageName,
        comprehensive: true
      };
      console.log('🔍 Sending validation request:', JSON.stringify(requestPayload, null, 2));
      
      const response = await fetch(`${apiBaseUrl}/compatibility/advanced/full-build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Validation failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          validationDetails: errorData.validationDetails
        });
        
        // 🔥 RATE LIMIT FIX: Handle 429 gracefully without retry storm
        if (response.status === 429) {
          throw new Error(
            'Server is temporarily busy processing requests. Please wait a moment and try again.\n\n' +
            'Tip: If you just made changes, wait 2-3 seconds before checking compatibility.'
          );
        }
        
        // Show detailed validation errors if available
        if (errorData.validationDetails && Array.isArray(errorData.validationDetails)) {
          console.error('🔍 Detailed validation errors:');
          errorData.validationDetails.forEach((err, index) => {
            console.error(`  ${index + 1}. Path: ${err.instancePath || err.dataPath || 'root'}`);
            console.error(`     Message: ${err.message}`);
            console.error(`     Params:`, err.params);
          });
        }
        
        throw new Error(`Validation failed: ${errorData.errors || errorData.message || response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setValidationResult(data.data);
        // Store the fresh components for passing to parent
        setFreshComponents(cleanedComponents);
      } else {
        throw new Error(data.error || 'Validation failed');
      }
    } catch (err) {
      console.error('❌ Compatibility validation error:', err);
      setError(err.message || 'Could not load compatibility analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [cartItems, pageName]);

  // Run compatibility validation when modal opens
  useEffect(() => {
    if (isOpen && cartItems.length > 0) {
      validateCompatibility();
    }
  }, [isOpen, cartItems, validateCompatibility]);

  // Categorize issues by severity (MUST be before early return for React Hooks rules)
  const categorizeIssues = useCallback(() => {
    if (!validationResult) {
      return { problems: [], warnings: [], notes: [], compatible: [], disclaimers: [] };
    }

    const problems = [];
    const warnings = [];
    const notes = [];
    const compatible = []; // NEW: Compatible notes section
    const disclaimers = [];

    // 🔥 NEW: Process all_issues from backend (deduplicated)
    if (validationResult.all_issues && Array.isArray(validationResult.all_issues)) {
      validationResult.all_issues.forEach((issue) => {
        // 🔥 ENHANCEMENT: Extract component names from multiple possible fields
        const comp_a = issue.component_a || issue.component1 || issue.component;
        const comp_b = issue.component_b || issue.component2;
        
        // Format message to include component names
        let enhancedMessage = issue.message || formatIssueMessage(issue);
        
        // If message doesn't already include component names, prepend them
        if (comp_a && !enhancedMessage.includes(comp_a)) {
          if (comp_b && !enhancedMessage.includes(comp_b)) {
            enhancedMessage = `${comp_a} ↔ ${comp_b}: ${enhancedMessage}`;
          } else {
            enhancedMessage = `${comp_a}: ${enhancedMessage}`;
          }
        }
        
        problems.push({
          layer: issue.layer || 'compatibility',
          message: enhancedMessage,
          details: issue.details || formatIssueDetails(issue),
          component_a: comp_a,
          component_b: comp_b,
          component1: comp_a,  // Legacy field
          component2: comp_b,  // Legacy field
          rule: issue.rule || issue.type,
          penalty: issue.penalty
        });
      });
    }

    // 🔥 NEW: Process all_warnings from backend (deduplicated)
    if (validationResult.all_warnings && Array.isArray(validationResult.all_warnings)) {
      validationResult.all_warnings.forEach((warning) => {
        warnings.push({
          layer: warning.layer || 'compatibility',
          message: warning.message || formatIssueMessage(warning),
          details: warning.details || formatIssueDetails(warning),
          component1: warning.component1,
          component2: warning.component2,
          rule: warning.rule,
          penalty: warning.penalty
        });
      });
    }

    // 🔥 NEW: Process compatible_notes from backend (what DOES work)
    // ENHANCED: Handle grouped notes with category headers and multiple items
    if (validationResult.compatible_notes && Array.isArray(validationResult.compatible_notes)) {
      validationResult.compatible_notes.forEach((note) => {
        // Check if this is a grouped note with multiple items
        if (note.count && note.count > 1) {
          // Grouped note - show category header with consolidated details
          compatible.push({
            message: note.message || `✅ ${note.category}`,
            details: note.details || '',
            category: note.category,
            isGrouped: true,
            itemCount: note.count
          });
        } else if (note.items && Array.isArray(note.items)) {
          // Grouped note with items array - show category header
          const categoryName = note.category || 'Compatible';
          compatible.push({
            message: `✅ ${categoryName}`,
            details: note.items.map(i => i.message?.replace(/^✅\s*/, '') || '').join(' • '),
            category: categoryName,
            isGrouped: true,
            itemCount: note.items.length
          });
        } else {
          // Single note
          compatible.push({
            message: note.message || 'Compatible',
            details: note.details || '',
            category: note.category || 'General'
          });
        }
      });
    }

    // 🔥 PHASE 11: Process critical_issues array from backend (FALLBACK for backward compatibility)
    if (!validationResult.all_issues && validationResult.critical_issues && Array.isArray(validationResult.critical_issues)) {
      validationResult.critical_issues.forEach((issue) => {
        problems.push({
          layer: issue.layer || 'compatibility',
          message: issue.message || formatIssueMessage(issue),
          details: formatIssueDetails(issue),
          component1: issue.component1,
          component2: issue.component2,
          rule: issue.rule,
          penalty: issue.penalty
        });
      });
    }

    // 🔥 PHASE 11: Process warnings array from backend (FALLBACK for backward compatibility)
    if (!validationResult.all_warnings && validationResult.warnings && Array.isArray(validationResult.warnings)) {
      validationResult.warnings.forEach((warning) => {
        warnings.push({
          layer: warning.layer || 'compatibility',
          message: warning.message || formatIssueMessage(warning),
          details: formatIssueDetails(warning),
          component1: warning.component1,
          component2: warning.component2,
          rule: warning.rule,
          penalty: warning.penalty
        });
      });
    }

    // Fallback: Process legacy issues array format (for backward compatibility)
    if (validationResult.issues && Array.isArray(validationResult.issues)) {
      validationResult.issues.forEach((issue) => {
        if (issue.severity === 'critical') {
          problems.push({
            layer: issue.layer,
            message: issue.message,
            details: issue.details
          });
        } else if (issue.severity === 'major' || issue.severity === 'warning') {
          warnings.push({
            layer: issue.layer,
            message: issue.message,
            details: issue.details
          });
        } else if (issue.severity === 'info' || issue.severity === 'note') {
          notes.push({
            layer: issue.layer,
            message: issue.message,
            details: issue.details
          });
        }
      });
    }

    // Add general disclaimer
    disclaimers.push({
      message: 'Please verify all specifications with the manufacturer before purchase.',
      details: 'Component compatibility can vary based on specific models, revisions, and firmware versions.'
    });

    // Add score-based note
    const score = validationResult.compatibility_score || 0;
    if (score >= 85) {
      notes.push({
        layer: 'overall',
        message: `✅ Excellent compatibility! Score: ${score}/100`,
        details: 'Your build has passed all major compatibility checks.'
      });
    } else if (score >= 70) {
      notes.push({
        layer: 'overall',
        message: `✓ Good compatibility. Score: ${score}/100`,
        details: 'Minor optimizations possible, but build should work well.'
      });
    }

    return { problems, warnings, notes, compatible, disclaimers };
  }, [validationResult]);

  const { problems = [], warnings: _warnings = [], notes: _notes = [], compatible: _compatible = [], disclaimers: _disclaimers = [] } = useMemo(() => categorizeIssues(), [categorizeIssues]); // eslint-disable-line no-unused-vars

  // Determine if checkout should be blocked based on page type
  const hasBlockingProblems = problems?.length > 0;
  // eslint-disable-next-line no-unused-vars
  const _compatibilityScore = validationResult?.compatibility_score || 0;

  // PAGE-SPECIFIC CHECKOUT BLOCKING LOGIC
  // PC-Parts: Allow checkout with warnings (user choice)
  // PC-Customized: Uses step-by-step filtering - only block for CRITICAL failures
  // PC-Upgrade: BLOCK checkout on critical issues
  const shouldBlockCheckout = useMemo(() => {
    if (!hasBlockingProblems) return false;
    
    // PC-Parts: Allow checkout even with critical issues (show warnings only)
    if (pageName === 'PC-Parts') {
      console.log('🟢 PC-Parts page: Allowing checkout with warnings');
      return false;
    }
    
    // 🔥 FIX: PC-Customized uses STEP-BY-STEP FILTERING - components are pre-validated
    // Only block for TRULY CRITICAL issues that would prevent the build from working
    if (['PC-Customize', 'PC-Customized', 'Customize-AI'].includes(pageName)) {
      // Define keywords for TRULY CRITICAL issues (system won't work at all)
      const criticalFailureKeywords = [
        'no psu selected',
        'psu selected',
        'insufficient wattage',
        'psu cannot handle',
        'socket incompatible',
        'socket mismatch',
        'incompatible memory type',
        'ddr.*incompatible',
        'form factor incompatible',
        'missing required component',
        'cannot fit',
        'exceeds maximum'
      ];
      
      // Check if ANY problem matches critical failure patterns
      const hasCriticalFailure = problems.some(p => {
        const msg = (p.message || '').toLowerCase();
        return criticalFailureKeywords.some(keyword => {
          const regex = new RegExp(keyword, 'i');
          return regex.test(msg);
        });
      });
      
      console.log('🔍 PC-Customized validation:', {
        page: pageName,
        totalProblems: problems.length,
        hasCriticalFailure,
        willBlock: hasCriticalFailure,
        problemSummary: problems.map(p => ({
          msg: (p.message || '').substring(0, 60),
          layer: p.layer
        }))
      });
      
      // 🔥 ONLY BLOCK for critical failures, NOT for ALL issues
      // This trusts the step-by-step filtering that already happened
      return hasCriticalFailure;
    }
    
    // PC-Upgrade: BLOCK checkout on any critical issues
    if (['PC-Upgrade'].includes(pageName)) {
      console.log('🔴', pageName, 'page: Blocking checkout due to critical issues');
      return true;
    }
    
    // Default: Block if critical issues exist
    console.log('⚠️', pageName, 'page: Default blocking behavior');
    return hasBlockingProblems;
  }, [hasBlockingProblems, pageName, problems]);

  if (!isOpen) return null;

  // Generate letter labels (A, B, C, ...)
  // eslint-disable-next-line no-unused-vars
  const _getLetterLabel = (index) => {
    return String.fromCodePoint(65 + index); // 65 = 'A' in ASCII
  };

  const handleProceed = () => {
    if (shouldBlockCheckout) {
      return; // Block based on page-specific rules
    }
    // Pass fresh components to parent so it can update its state
    onProceed(freshComponents);
  };

  // NOSONAR - used in IIFE JSX below
  const renderProblemsView = () => {
    const isCustomizePage = ['PC-Customize', 'PC-Customized'].includes(pageName);
    let heading = 'COMPATIBILITY WARNINGS DETECTED';
    if (shouldBlockCheckout) heading = 'CRITICAL COMPATIBILITY ISSUES';
    else if (isCustomizePage) heading = 'COMPATIBILITY NOTES';

    let subtext = 'Do you want to proceed?\nThe following issues were detected:';
    if (shouldBlockCheckout) subtext = 'You must resolve these critical issues before proceeding. Please review and update your component selection.';
    else if (isCustomizePage) subtext = 'Your build used step-by-step compatibility filtering.\nThe following notes are informational - you may proceed.';

    let issueLabel = '⚠️ Compatibility Warnings:';
    if (shouldBlockCheckout) issueLabel = '⚠️ Critical Issues:';
    else if (isCustomizePage) issueLabel = '📋 Validation Notes:';

    const bgColor = shouldBlockCheckout ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 193, 7, 0.1)';
    const borderColor = shouldBlockCheckout ? '2px solid rgba(255, 59, 48, 0.3)' : '2px solid rgba(255, 193, 7, 0.3)';
    const labelColor = shouldBlockCheckout ? '#FF3B30' : '#FFC107';

    return (<>
      <h2 style={{ color: '#fff', fontSize: '32px', fontWeight: 'bold', marginBottom: '20px', textTransform: 'UPPERCASE' }}>
        {heading}
      </h2>
      <p style={{ color: '#ccc', fontSize: '24px', marginBottom: '30px', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
        {subtext}
      </p>
      <div style={{ background: bgColor, border: borderColor, padding: '20px', marginBottom: '30px', textAlign: 'left' }}>
        <h4 style={{ color: labelColor, fontSize: '14px', fontWeight: 'bold', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {issueLabel}
        </h4>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {problems.map((problem, index) => (
            <li key={`problem-${index}-${problem.message?.slice(0, 20)}`} style={{ color: '#fff', fontSize: '14px', padding: '8px 0', borderBottom: index < problems.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none', display: 'flex', alignItems: 'flex-start' }}>
              <span style={{ marginRight: '8px', color: '#FF3B30', fontWeight: 'bold', fontSize: '20px' }}>•</span>
              <span style={{ flex: 1 }}>{problem.message}</span>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button onClick={onClose} style={{ padding: '12px 32px', background: 'transparent', border: '2px solid #00F5A0', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s ease' }} onMouseOver={(e) => { e.target.style.background = 'rgba(0, 245, 160, 0.1)'; }} onFocus={(e) => { e.target.style.background = 'rgba(0, 245, 160, 0.1)'; }} onMouseOut={(e) => { e.target.style.background = 'transparent'; }} onBlur={(e) => { e.target.style.background = 'transparent'; }}>
          Go Back
        </button>
        {!shouldBlockCheckout && (
          <button onClick={handleProceed} style={{ padding: '12px 32px', background: '#00E083', border: 'none', color: '#002024', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s ease' }} onMouseOver={(e) => { e.target.style.background = '#FFA500'; }} onFocus={(e) => { e.target.style.background = '#FFA500'; }} onMouseOut={(e) => { e.target.style.background = '#FFB800'; }} onBlur={(e) => { e.target.style.background = '#FFB800'; }}>
            Proceed Anyway (Not Recommended)
          </button>
        )}
      </div>
      <p style={{ color: '#888', fontSize: '12px', marginTop: '20px', fontStyle: 'italic' }}>
        {shouldBlockCheckout ? '🔴 You cannot proceed until these issues are resolved.' : '💡 Need help? Click "Go Back" to review and fix compatibility issues.'}
      </p>
    </>);
  };

  return (
    <div className="compatibility-modal-overlay" role="none" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className='pc-customized-modal-background'></div>
      <dialog 
        open
        className="pc-customized-modal" 
        aria-modal="true"
        aria-label="Compatibility Validation"
        style={{
          maxWidth: '727px',
          padding: '40px 32px 32px 32px',
          background: '#07343a',
          textAlign: 'center'
        }}
      >
        {(() => {
          if (loading) {
            return (
              <div style={{ padding: '40px 20px' }}>
                <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
                <p style={{ color: '#fff', fontSize: '16px' }}>Analyzing {cartItems.length} component(s)...</p>
              </div>
            );
          }
          if (error) {
            return (
              <div style={{ padding: '20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
                <h3 style={{ color: '#fff', marginBottom: '10px' }}>Validation Error</h3>
                <p style={{ color: '#ccc', marginBottom: '20px' }}>{error}</p>
                <button 
                  onClick={validateCompatibility}
                  style={{
                    background: '#00F5A0',
                    color: '#000',
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Retry Validation
                </button>
              </div>
            );
          }
          if (validationResult && problems.length > 0) {
            return renderProblemsView();
          }
          return (
          /* No Critical Issues - Allow Proceed */
          <>

            <h2 style={{ color: '#00F5A0', fontSize: '35px', fontWeight: 'bold', marginBottom: '15px' }}>
              All Components Compatible!
            </h2>
            <p style={{ color: '#ccc', fontSize: '25px', marginBottom: '30px' }}>
              Your build has passed all critical compatibility checks. You can proceed to checkout.
            </p>
            <button
              onClick={handleProceed}
              style={{
                padding: '14px 40px',
                background: '#00F5A0',
                border: 'none',
                color: '#000',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#00D890';
              }}
              onFocus={(e) => {
                e.target.style.background = '#00D890';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#00F5A0';
              }}
              onBlur={(e) => {
                e.target.style.background = '#00F5A0';
              }}
            >
              Proceed to Payment
            </button>
          </>);
        })()}
      </dialog>
    </div>
  );
};

CompatibilityValidationModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  onProceed: PropTypes.func,
  cartItems: PropTypes.array,
  pageName: PropTypes.string
};

export default CompatibilityValidationModal;
