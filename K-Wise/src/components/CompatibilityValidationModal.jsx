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

const formatIssueDetails = (issue) => {
  // ENHANCEMENT: Build ultra-verbose detailed explanation with specific measurements and solutions
  if (issue.details) {
    // Backend already provides detailed explanation - use it directly
    return issue.details;
  }
  
  // Build detailed explanation from issue properties
  let details = '';
  
  if (issue.message) {
    details = issue.message;
  }
  
  // Add component names if available
  const comp1 = issue.component_a || issue.component1;
  const comp2 = issue.component_b || issue.component2;
  const comp = issue.component;
  
  if (comp1 || comp2 || comp) {
    details += details ? '\n\n' : '';
    details += `🔧 Components Affected:\n`;
    if (comp1) details += `   • ${comp1}\n`;
    if (comp2) details += `   • ${comp2}\n`;
    if (comp && comp !== comp1 && comp !== comp2) details += `   • ${comp}\n`;
  }
  
  // Add rule information
  if (issue.rule) {
    details += details ? '\n\n' : '';
    details += `📋 Rule: ${issue.rule}`;
  }
  
  // Add fix/solution if available
  if (issue.fix) {
    details += details ? '\n\n' : '';
    details += `💡 Solutions:\n${issue.fix}`;
  }
  
  // Add impact assessment if available
  if (issue.impact) {
    details += details ? '\n\n' : '';
    details += `⚠️ Impact: ${issue.impact}`;
  }
  
  // Add compatibility penalty
  if (issue.penalty) {
    details += details ? '\n\n' : '';
    details += `📊 Compatibility Penalty: -${issue.penalty} points`;
  }
  
  return details || 'Compatibility issue detected. Please verify component specifications with manufacturer before purchase.';
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

      // 🔥 CRITICAL FIX: Refetch fresh component data from API to avoid stale/cached data
      console.log('🔄 Refetching fresh component data from API...');
      const freshCartItems = [];
      for (const item of cartItems) {
        if (!item.id) {
          console.warn(`⚠️ Skipping item without ID: ${item.name}`);
          continue;
        }
        
        try {
          // Fetch fresh data from /api/stock/:id
          const response = await fetch(`${getApiBaseUrl()}/stock/${item.id}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch component ${item.id}`);
          }
          
          const data = await response.json();
          if (data.success && data.data) {
            freshCartItems.push(data.data);
            console.log(`✅ Refetched fresh data for ${data.data.name} (ID: ${item.id})`);
          } else {
            console.warn(`⚠️ No data returned for component ${item.id}, using original`);
            freshCartItems.push(item);
          }
        } catch (fetchError) {
          console.error(`❌ Error fetching component ${item.id}:`, fetchError.message);
          // Fallback to original item if fetch fails
          freshCartItems.push(item);
        }
      }
      
      console.log(`✅ Refetched ${freshCartItems.length} components with fresh data`);
      
      // Use fresh data for validation instead of potentially stale cartItems
      const itemsToValidate = freshCartItems.length > 0 ? freshCartItems : cartItems;

      // 🔥 CRITICAL FIX: Convert cartItems to components object with MULTI-SLOT SUPPORT
      // Problem: Multiple RAM/Storage items were overwriting each other
      // Solution: Use FIRST item for single-slot categories, aggregate info for multi-slot (RAM/Storage)
      const components = {};
      const skippedItems = [];
      const multiSlotComponents = { ram: [], storage: [] }; // Track multi-slot items
      
      itemsToValidate.forEach(item => {
        if (!item) {
          console.warn('⚠️ Skipping null/undefined cart item');
          return;
        }

        if (!item.category) {
          console.warn(`⚠️ Item missing category field: ${item.name || 'Unknown'} (ID: ${item.id})`);
          skippedItems.push({ name: item.name, reason: 'Missing category field' });
          return;
        }

        if (!item.id) {
          console.warn(`⚠️ Item missing ID field: ${item.name || 'Unknown'} (category: ${item.category})`);
          skippedItems.push({ name: item.name, reason: 'Missing ID field' });
          return;
        }

        // Enhanced category key normalization
        let categoryKey = item.category.toLowerCase()
          .trim()
          .replace(/\s+/g, '_')
          .replace(/central_processing_unit/gi, 'cpu')
          .replace(/graphics_processing_unit/gi, 'gpu')
          .replace(/memory_\(ram\)/gi, 'ram')
          .replace(/memory/gi, 'ram')
          .replace(/cpu_cooler/gi, 'cooling')
          .replace(/power_supply_unit/gi, 'psu')
          .replace(/pc_case/gi, 'case');
        
        // Map known database categories to standard keys
        const dbCategoryToKey = {
          'cpu': 'cpu',
          'processor': 'cpu',
          'central processing unit': 'cpu',
          'gpu': 'gpu',
          'graphics card': 'gpu',
          'video card': 'gpu',
          'graphics processing unit': 'gpu',
          'motherboard': 'motherboard',
          'mainboard': 'motherboard',
          'ram': 'ram',
          'memory': 'ram',
          'memory (ram)': 'ram',
          'storage': 'storage',
          'ssd': 'storage',
          'hdd': 'storage',
          'hard drive': 'storage',
          'solid state drive': 'storage',
          'cooling': 'cooling',
          'cpu cooler': 'cooling',
          'cooler': 'cooling',
          'psu': 'psu',
          'power supply': 'psu',
          'power supply unit': 'psu',
          'case': 'case',
          'pc case': 'case',
          'chassis': 'case'
        };

        const lowerCategory = item.category.toLowerCase().trim();
        categoryKey = dbCategoryToKey[lowerCategory] || categoryKey;
        
        console.log(`🔧 Processing item: "${item.name}", DB category: "${item.category}" → key: "${categoryKey}"`);
        
        // Normalize category to match backend expected format
        const categoryMap = {
          'central processing unit': 'CPU',
          'central_processing_unit': 'CPU',
          'processor': 'CPU',
          'cpu': 'CPU',
          'graphics processing unit': 'GPU',
          'graphics_processing_unit': 'GPU',
          'graphics card': 'GPU',
          'video card': 'GPU',
          'gpu': 'GPU',
          'cpu cooler': 'Cooling',
          'cpu_cooler': 'Cooling',
          'cooler': 'Cooling',
          'cooling': 'Cooling',
          'memory (ram)': 'RAM',
          'memory': 'RAM',
          'ram': 'RAM',
          'motherboard': 'Motherboard',
          'mainboard': 'Motherboard',
          'storage': 'Storage',
          'ssd': 'Storage',
          'hdd': 'Storage',
          'power supply unit': 'PSU',
          'power_supply_unit': 'PSU',
          'power supply': 'PSU',
          'psu': 'PSU',
          'pc case': 'Case',
          'pc_case': 'Case',
          'case': 'Case',
          'chassis': 'Case'
        };
        
        const normalizedCategory = categoryMap[lowerCategory] || item.category;
        
        console.log(`📝 Normalized category: "${item.category}" → "${normalizedCategory}"`);
        
        // 🔥 CRITICAL FIX: Include BOTH specifications AND dimensions for backend validation
        const fullProduct = {
          id: item.id,
          name: item.name,
          category: normalizedCategory,
          brand: item.brand || null,
          price: item.price || 0,
          specifications: item.specifications || item.normalized_specs || item.specs || {},
          dimensions: item.dimensions || {},  // ✅ ADDED: Physical measurements for clearance validation
          image_url: item.image_url || null
        };
        
        console.log(`🔍 Product data for "${item.name}":`, {
          hasSpecifications: !!fullProduct.specifications && Object.keys(fullProduct.specifications).length > 0,
          hasDimensions: !!fullProduct.dimensions && Object.keys(fullProduct.dimensions).length > 0,
          specKeys: Object.keys(fullProduct.specifications || {}),
          dimKeys: Object.keys(fullProduct.dimensions || {})
        });
        
        // 🔥 CRITICAL FIX: Handle multi-slot components (RAM, Storage) differently
        // Backend EXPECTS ARRAYS for RAM and Storage to validate ALL drives
        if (categoryKey === 'ram') {
          multiSlotComponents.ram.push(fullProduct);
          console.log(`💾 Added RAM to multi-slot array (${multiSlotComponents.ram.length} total)`);
        } else if (categoryKey === 'storage') {
          multiSlotComponents.storage.push(fullProduct);
          console.log(`💿 Added Storage to multi-slot array (${multiSlotComponents.storage.length} total)`);
        } else {
          // Single-slot component - direct assignment
          components[categoryKey] = fullProduct;
        }
      });
      
      // 🔥 FIX: Send RAM and Storage as ARRAYS (backend supports this!)
      // This ensures ALL RAM kits and storage drives are validated together
      if (multiSlotComponents.ram.length > 0) {
        components.ram = multiSlotComponents.ram.length === 1 
          ? multiSlotComponents.ram[0]  // Single RAM: send object
          : multiSlotComponents.ram;     // Multiple RAM: send array
        console.log(`💾 RAM for validation: ${multiSlotComponents.ram.length === 1 ? '1 kit (object)' : multiSlotComponents.ram.length + ' kits (array)'}`);
      }
      if (multiSlotComponents.storage.length > 0) {
        components.storage = multiSlotComponents.storage.length === 1
          ? multiSlotComponents.storage[0]  // Single drive: send object
          : multiSlotComponents.storage;     // Multiple drives: send array
        console.log(`💿 Storage for validation: ${multiSlotComponents.storage.length === 1 ? '1 drive (object)' : multiSlotComponents.storage.length + ' drives (array)'}`);
      }
      
      // 🔥 LOG MULTI-SLOT AGGREGATION RESULTS
      console.log(`📊 Multi-slot aggregation complete:`, {
        ramCount: multiSlotComponents.ram.length,
        storageCount: multiSlotComponents.storage.length,
        ramSentToBackend: Array.isArray(components.ram) ? `${components.ram.length} kits (array)` : (components.ram ? '1 kit (object)' : 'none'),
        storageSentToBackend: Array.isArray(components.storage) ? `${components.storage.length} drives (array)` : (components.storage ? '1 drive (object)' : 'none')
      });
      
      console.log('📦 Total components converted:', Object.keys(components).length);
      console.log('🔑 Component keys:', Object.keys(components).join(', '));

      // ✅ FIX: Validate that we actually have components to validate
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
          `${skippedItems.length > 0 ? `\nSkipped ${skippedItems.length} items:\n${skippedItems.map(s => `- ${s.name}: ${s.reason}`).join('\n')}` : ''}` +
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

  const { problems = [], warnings = [], notes = [], compatible = [], disclaimers = [] } = useMemo(() => categorizeIssues(), [categorizeIssues]);

  // Determine if checkout should be blocked based on page type
  const hasBlockingProblems = problems?.length > 0;
  const compatibilityScore = validationResult?.compatibility_score || 0;

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
  const getLetterLabel = (index) => {
    return String.fromCharCode(65 + index); // 65 = 'A' in ASCII
  };

  const handleProceed = () => {
    if (shouldBlockCheckout) {
      return; // Block based on page-specific rules
    }
    // Pass fresh components to parent so it can update its state
    onProceed(freshComponents);
  };

  return (
    <div className="compatibility-modal-overlay" onClick={onClose}>
      <div className='pc-customized-modal-background'></div>
      <div 
        className="pc-customized-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '727px',
          padding: '40px 32px 32px 32px',
          background: '#07343a',
          textAlign: 'center'
        }}
      >
        {loading ? (
          <div style={{ padding: '40px 20px' }}>
            <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
            <p style={{ color: '#fff', fontSize: '16px' }}>Analyzing {cartItems.length} component(s)...</p>
          </div>
        ) : error ? (
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
        ) : validationResult && problems.length > 0 ? (
          <>
            {/* Warning Message - Dynamic based on page and blocking status */}
            <h2 style={{ 
              color: '#fff', 
              fontSize: '32px', 
              fontWeight: 'bold', 
              marginBottom: '20px',
              textTransform: 'UPPERCASE'
            }}>
              {shouldBlockCheckout 
                ? 'CRITICAL COMPATIBILITY ISSUES' 
                : (['PC-Customize', 'PC-Customized'].includes(pageName)
                    ? 'COMPATIBILITY NOTES'
                    : 'COMPATIBILITY WARNINGS DETECTED')}
            </h2>
            
            <p style={{ 
              color: '#ccc', 
              fontSize: '24px', 
              marginBottom: '30px',
              lineHeight: '1.6',
              whiteSpace: 'pre-line'
            }}>
              {shouldBlockCheckout
                ? 'You must resolve these critical issues before proceeding. Please review and update your component selection.'
                : (['PC-Customize', 'PC-Customized'].includes(pageName)
                    ? 'Your build used step-by-step compatibility filtering.\nThe following notes are informational - you may proceed.'
                    : 'Do you want to proceed?\nThe following issues were detected:')}
            </p>

            {/* Critical Issues List */}
            <div style={{
              background: shouldBlockCheckout ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 193, 7, 0.1)',
              border: shouldBlockCheckout ? '2px solid rgba(255, 59, 48, 0.3)' : '2px solid rgba(255, 193, 7, 0.3)',
              padding: '20px',
              marginBottom: '30px',
              textAlign: 'left'
            }}>
              <h4 style={{ 
                color: shouldBlockCheckout ? '#FF3B30' : '#FFC107', 
                fontSize: '14px', 
                fontWeight: 'bold', 
                marginBottom: '15px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {shouldBlockCheckout 
                  ? '⚠️ Critical Issues:' 
                  : (['PC-Customize', 'PC-Customized'].includes(pageName)
                      ? '📋 Validation Notes:'
                      : '⚠️ Compatibility Warnings:')}
              </h4>
              <ul style={{ 
                listStyle: 'none', 
                padding: 0, 
                margin: 0 
              }}>
                {problems.map((problem, index) => (
                  <li 
                    key={index} 
                    style={{
                      color: '#fff',
                      fontSize: '14px',
                      padding: '8px 0',
                      borderBottom: index < problems.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                      display: 'flex',
                      alignItems: 'flex-start'
                    }}
                  >
                    <span style={{ 
                      marginRight: '8px',
                      color: '#FF3B30',
                      fontWeight: 'bold',
                      fontSize: '20px',
                    }}>
                      •
                    </span>
                    <span style={{ flex: 1 }}>
                      {problem.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'center' 
            }}>
              <button
                onClick={onClose}
                style={{
                  padding: '12px 32px',
                  background: 'transparent',
                  border: '2px solid #00F5A0',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(0, 245, 160, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                Go Back
              </button>
              
              {!shouldBlockCheckout && (
                <button
                  onClick={handleProceed}
                  style={{
                    padding: '12px 32px',
                    background: '#00E083',
                    border: 'none',
                    color: '#002024',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#FFA500';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = '#FFB800';
                  }}
                >
                Proceed Anyway (Not Recommended)
                </button>
              )}
            </div>

            {/* Helper Text */}
            <p style={{ 
              color: '#888', 
              fontSize: '12px', 
              marginTop: '20px',
              fontStyle: 'italic'
            }}>
              {shouldBlockCheckout
                ? '🔴 You cannot proceed until these issues are resolved.'
                : '💡 Need help? Click "Go Back" to review and fix compatibility issues.'}
            </p>
          </>
        ) : (
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
              onMouseOut={(e) => {
                e.target.style.background = '#00F5A0';
              }}
            >
              Proceed to Payment
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CompatibilityValidationModal;
