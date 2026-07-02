import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiChevronUp, FiChevronDown, FiCheck, FiAlertTriangle, FiAlertCircle } from 'react-icons/fi';
import { getServerBaseUrl } from '../../utils/networkConfig';
import { buildCompatibilityPayload } from '../../utils/kioskContracts';
import './CompatibilityNotes.css';

/**
 * Extract and validate component ID from a component object
 */
const extractComponentId = (comp) => {
    let itemId = comp.id || comp.product_id;
    if (typeof itemId === 'string') {
        itemId = Number.parseInt(itemId, 10);
    }
    if (!itemId || Number.isNaN(itemId) || itemId === 0) {
        return null;
    }
    return itemId;
};

/**
 * Check if a product name indicates a service/upgrade item
 */
const isServiceOrUpgradeByName = (nameLower) => {
    return nameLower.includes('upgrade') || nameLower.includes('service') ||
           nameLower.includes('manual') || nameLower.includes('processing') ||
           nameLower.includes('labor') || nameLower.includes('installation');
};

/**
 * Infer component category from product name keywords
 */
const inferCategoryFromName = (nameLower) => {
    if (nameLower.includes('ryzen') || nameLower.includes('intel') || nameLower.includes('core i') ||
        nameLower.includes('i5-') || nameLower.includes('i7-') || nameLower.includes('i9-') || nameLower.includes('i3-')) {
        return 'cpu';
    }
    if (nameLower.includes('rtx') || nameLower.includes('gtx') || nameLower.includes('radeon') ||
        nameLower.includes('geforce') || nameLower.includes('rx 7') || nameLower.includes('rx 6')) {
        return 'gpu';
    }
    if (nameLower.includes('motherboard') || nameLower.includes('b550') || nameLower.includes('b650') ||
        nameLower.includes('b660') || nameLower.includes('b760') || nameLower.includes('x570') ||
        nameLower.includes('x670') || nameLower.includes('z690') || nameLower.includes('z790') ||
        nameLower.includes('a620') || nameLower.includes('b450')) {
        return 'motherboard';
    }
    if (nameLower.includes('ddr4') || nameLower.includes('ddr5') ||
        (nameLower.includes('ram') && !nameLower.includes('program')) ||
        nameLower.includes('memory') || nameLower.includes('dimm') ||
        nameLower.includes('vengeance') || nameLower.includes('trident')) {
        return 'ram';
    }
    if (nameLower.includes('ssd') || nameLower.includes('nvme') || nameLower.includes('hdd') ||
        nameLower.includes('hard drive') || nameLower.includes('samsung 99') ||
        nameLower.includes('western digital') || nameLower.includes('seagate') ||
        nameLower.includes('crucial') || nameLower.includes('980 pro') ||
        nameLower.includes('970 evo') || nameLower.includes('adata') || nameLower.includes('legend')) {
        return 'storage';
    }
    if (nameLower.includes('cooler') || nameLower.includes('deepcool') || nameLower.includes('noctua') ||
        nameLower.includes('cooling') || nameLower.includes('aio') || nameLower.includes('liquid') ||
        nameLower.includes('hyper 212') || nameLower.includes('tower cooler')) {
        return 'cooling';
    }
    if (nameLower.includes('psu') || nameLower.includes('power supply') || nameLower.includes(' w ') ||
        nameLower.includes('watt') || nameLower.includes('corsair rm') || nameLower.includes('evga') ||
        nameLower.includes('seasonic') || nameLower.includes('modular')) {
        return 'psu';
    }
    if ((nameLower.includes('case') && !nameLower.includes('showcase')) || nameLower.includes('chassis') ||
        nameLower.includes('darkflash') || nameLower.includes('nzxt') || nameLower.includes('mid tower') ||
        nameLower.includes('full tower') || nameLower.includes('atx case')) {
        return 'case';
    }
    return '';
};

/**
 * Infer component category from specifications fields
 */
const inferCategoryFromSpecs = (specs) => {
    if (specs.socket || specs.cores || specs.threads || specs.base_clock) return 'cpu';
    if (specs.vram || specs.cuda_cores || specs.ray_tracing) return 'gpu';
    if (specs.chipset || specs.form_factor_motherboard || specs.memory_slots) return 'motherboard';
    if (specs.memory_type || specs.speed_mhz || specs.capacity_per_stick) return 'ram';
    if (specs.capacity_gb || specs.interface_type || specs.read_speed) return 'storage';
    if (specs.tdp_w || specs.fan_size || specs.radiator_size) return 'cooling';
    if (specs.wattage || specs.efficiency_rating || specs.modular) return 'psu';
    if (specs.max_gpu_length || specs.max_cooler_height || specs.expansion_slots) return 'case';
    return '';
};

/**
 * Category keyword mappings for component classification
 */
const CATEGORY_KEYWORDS = [
    { key: 'cpu', keywords: ['cpu', 'processor', 'central processing'] },
    { key: 'gpu', keywords: ['gpu', 'graphics', 'video card'] },
    { key: 'motherboard', keywords: ['motherboard', 'mobo', 'mainboard'] },
    { key: 'ram', keywords: ['ram', 'memory'] },
    { key: 'storage', keywords: ['storage', 'ssd', 'hdd', 'nvme', 'hard drive'] },
    { key: 'psu', keywords: ['psu', 'power supply', 'power'] },
    { key: 'case', keywords: ['case', 'chassis', 'pc case', 'enclosure'] },
    { key: 'cooling', keywords: ['cool', 'cooler', 'fan', 'cpu cooler', 'cpu-cooler', 'aio', 'liquid'] }
];

const ARRAY_CATEGORY_KEYS = new Set(['ram', 'storage']);

/**
 * Add component data to an array-type field in the formatted object
 */
const pushToArrayField = (formatted, key, componentData) => {
    if (!formatted[key]) formatted[key] = [];
    if (Array.isArray(formatted[key])) {
        formatted[key].push(componentData);
    } else {
        formatted[key] = [formatted[key], componentData];
    }
};

/**
 * Map a component to the formatted build structure based on its category.
 * Returns true if mapped, false if category unknown.
 */
const addComponentToFormatted = (category, componentData, formatted) => {
    for (const { key, keywords } of CATEGORY_KEYWORDS) {
        if (keywords.some(kw => category.includes(kw))) {
            if (ARRAY_CATEGORY_KEYS.has(key)) {
                pushToArrayField(formatted, key, componentData);
            } else {
                formatted[key] = componentData;
            }
            return true;
        }
    }
    return false;
};

/**
 * PCPartPicker-style Compatibility Notes Component
 * Uses: Compatibility Rules (3200), RuleBuilder, Advanced Compatibility, Builder Compatibility
 * Displays: Compatible, Potential Incompatibilities, Compatibility Problems
 */

const CompatibilityNotes = ({ buildComponents, buildType = 'custom' }) => {
    const [compatibilityData, setCompatibilityData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedSections, setExpandedSections] = useState({
        compatible: false,
        warnings: false,
        problems: false
    });

    useEffect(() => {
        if (buildComponents) {
            analyzeBuildCompatibility();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buildComponents]);

    /**
     * Format components array to object format expected by API
     * 🔥 CRITICAL FIX: Handle more category name variations
     */
    const formatComponentsForAPI = (components) => {
        const formatted = {};
        const skipCategories = ['service', 'upgrade', 'manual', 'processing', 'labor', 'installation', 'warranty', 'accessory', 'peripheral'];
        
        console.log('📦 CompatibilityNotes - formatComponentsForAPI input:', components?.length || 0, 'components');
        
        if (!components || !Array.isArray(components) || components.length === 0) {
            console.warn('⚠️ CompatibilityNotes - No components provided');
            return formatted;
        }
        
        const sharedFormatted = buildCompatibilityPayload(components, { arrayCategories: true });
        if (Object.keys(sharedFormatted).length > 0) {
            return sharedFormatted;
        }

        components.forEach((comp, index) => {
            if (!comp) {
                console.log(`⚠️ Skipping null component at index ${index}`);
                return;
            }
            
            const itemId = extractComponentId(comp);
            if (!itemId) {
                console.log(`⚠️ Skipping component with invalid ID: ${comp.name} (id: ${comp.id})`);
                return;
            }
            
            // 🔥 CRITICAL FIX: Try multiple category field names AND derive from name
            let category = (comp.category || comp.categoryName || comp.type || '').toLowerCase().trim();
            
            // 🔥 SKIP: Filter out service/upgrade/manual categories
            if (skipCategories.some(skip => category.includes(skip))) {
                console.log(`⚠️ Skipping non-component category: ${comp.name} (category: ${category})`);
                return;
            }
            
            if (!category && comp.name) {
                const nameLower = comp.name.toLowerCase();
                
                if (isServiceOrUpgradeByName(nameLower)) {
                    console.log(`⚠️ Skipping service/upgrade item: ${comp.name}`);
                    return;
                }
                
                category = inferCategoryFromName(nameLower);
                if (category) {
                    console.log(`🔮 Inferred category "${category}" from name: ${comp.name}`);
                }
            }
            
            if (!category && comp.specifications) {
                category = inferCategoryFromSpecs(comp.specifications);
                if (category) {
                    console.log(`🔮 Inferred category "${category}" from specifications`);
                }
            }
            
            console.log(`🔍 Processing component: ${comp.name}, category field: "${category}"`);
            
            const componentData = {
                id: itemId,
                name: comp.name || '',
                category: comp.category || comp.categoryName || category || '',
                brand: comp.brand || '',
                price: comp.price || 0,
                specifications: comp.specifications || {},
                dimensions: comp.dimensions || {},
                image_url: comp.image_url || comp.image || ''
            };

            const mapped = addComponentToFormatted(category, componentData, formatted);
            if (mapped) {
                console.log(`✅ Added ${category.toUpperCase()}: ${comp.name}`);
            } else {
                const PERIPHERAL_CATEGORIES = new Set(['mouse', 'keyboard', 'monitor', 'headset', 'webcam', 'speakers', 'printer', 'scanner', 'router', 'cable', 'adapter', 'accessory']);
                if (!PERIPHERAL_CATEGORIES.has(category)) {
                    console.warn(`⚠️ Skipping unknown category for ${comp.name}: "${category}"`);
                }
            }
        });
        
        console.log('📊 formatComponentsForAPI result:', Object.keys(formatted));
        
        // 🔥 CRITICAL: If no components matched, log warning
        if (Object.keys(formatted).length === 0) {
            console.warn('⚠️ No valid PC components found for compatibility analysis');
        }
        
        return formatted;
    };

    /**
     * Transform advanced/full-build response to CompatibilityNotes format
     * ENHANCED: Better handles grouped compatible notes and filters vague messages
     */
    const transformAdvancedResponse = (data) => {
        const compatibleNotes = [];
        const warnings = [];
        const problems = [];

        // ============================================================
        // EXTRACT COMPATIBLE NOTES (What DOES work)
        // ENHANCED: Handle grouped notes with 'items' array and 'details' field
        // ============================================================
        if (data.compatible_notes && Array.isArray(data.compatible_notes)) {
            data.compatible_notes.forEach(note => {
                // Check if this is a grouped note with multiple items
                if (note.count && note.count > 1 && note.details) {
                    // Grouped note: Use category name + details (bullet points)
                    const categoryName = note.category || note.message?.replace(/^✅\s*/, '') || 'Compatible';
                    const details = note.details || '';
                    compatibleNotes.push(`✅ ${categoryName}: ${details}`);
                } else if (note.items && Array.isArray(note.items)) {
                    // Grouped note with items array: expand each item
                    note.items.forEach(item => {
                        const msg = item.message || String(item);
                        compatibleNotes.push(msg);
                    });
                } else {
                    // Single note: use message + optional details
                    const msg = note.message || String(note);
                    const details = note.details && !msg.includes(note.details) ? ` - ${note.details}` : '';
                    compatibleNotes.push(msg + details);
                }
            });
        }

        // Also extract from all_notes if compatible_notes is empty
        if (compatibleNotes.length === 0 && data.all_notes && Array.isArray(data.all_notes)) {
            data.all_notes.forEach(note => {
                const msg = note.message || String(note);
                if (msg.includes('✅') || msg.toLowerCase().includes('compatible')) {
                    compatibleNotes.push(msg);
                }
            });
        }

        // ============================================================
        // EXTRACT PROBLEMS (Critical issues)
        // ENHANCED: Filter out vague "unknown/cannot verify" messages
        // 🔥 CRITICAL FIX: Be aggressive about filtering non-actionable messages
        // ============================================================
        const vaguePatterns = [
            'unknown', 'cannot verify', 'cannot be verified', 
            'specification missing', 'specs missing', 'specifications missing',
            'data unavailable', 'unable to determine', 'unable to verify',
            'information unavailable', 'details unavailable', 'not specified',
            'could not find', 'could not determine', 'not found',
            'missing data', 'no data', 'unavailable',
            'rule:', // Filter out raw rule references
            'chipset info', 'chipset information', // These are non-actionable
            'info needed', 'information needed', 'details needed'
        ];
        
        const isVagueMessage = (msg) => {
            const lowerMsg = msg.toLowerCase();
            return Boolean(globalThis.__KWISE_HIDE_VAGUE_COMPATIBILITY_NOTES__)
                && vaguePatterns.some(pattern => lowerMsg.includes(pattern));
        };
        
        if (data.all_issues && Array.isArray(data.all_issues)) {
            data.all_issues.forEach(issue => {
                // 🔥 ENHANCED: Extract message and component information
                let msg = issue.message || issue.issue || String(issue);
                const component = issue.component || '';
                // eslint-disable-next-line no-unused-vars
                const _layer = issue.layer || '';
                
                // 🔥 NEW: Add component name prefix if not already in message
                if (component && !msg.includes(component)) {
                    msg = `[${component.toUpperCase()}] ${msg}`;
                }
                
                // Skip vague messages that don't provide actionable info
                if (isVagueMessage(msg)) {
                    console.log('🔇 Filtered vague issue:', msg.substring(0, 50));
                    return;
                }
                
                if (issue.severity === 'critical' || issue.severity === 'error') {
                    problems.push(msg);
                } else if (issue.severity === 'warning') {
                    warnings.push(msg);
                }
            });
        }

        // ============================================================
        // EXTRACT WARNINGS (Potential incompatibilities)
        // ENHANCED: Filter out vague messages and optimization notes (they go to Compatible)
        // 🔥 CRITICAL FIX: Only show ACTIONABLE warnings that require user attention
        // ============================================================
        const optimizationPatterns = [
            // Slot/port availability (positive notes, not warnings)
            'motherboard has', 'm.2 slot', 'm2 slot', 'extra storage',
            'storage slots available', 'expansion slot', 'sata port',
            'slot available', 'port available', 'slots available',
            'ram slots', '4 ram', '2 ram', 'memory slots',
            
            // PCIe generation notes (backwards compatible, not a problem)
            'supports newer', 'pcie generation', 'electrically x4',
            'x16 slots are', 'pcie 4.0', 'pcie 5.0', 'pcie 3.0',
            'newer pcie', 'older pcie', 'pcie backward',
            
            // DDR/memory support (informational)
            'supports ddr', 'ddr4', 'ddr5', 'memory type',
            
            // Power sufficiency (positive)
            'enough power', 'sufficient', 'adequate', 'headroom',
            'within spec', 'meets requirements', 'power budget',
            
            // General capability notes
            'can support', 'will support', 'supported', 'compatible with',
            'rule: optimization', 'optimization note',
            
            // 🔥 NEW: Catch vague "info needed" messages that aren't actionable
            'chipset info', 'chipset information', 'info needed',
            'information needed', 'details needed', 'specs needed',
            'specification needed', 'data needed'
        ];
        
        const isOptimizationMessage = (msg) => {
            const lowerMsg = msg.toLowerCase();
            return optimizationPatterns.some(pattern => lowerMsg.includes(pattern));
        };
        
        if (data.all_warnings && Array.isArray(data.all_warnings)) {
            data.all_warnings.forEach(warning => {
                // 🔥 ENHANCED: Extract message and component information
                let msg = warning.message || warning.warning || String(warning);
                const component = warning.component || warning.component_name || '';
                // eslint-disable-next-line no-unused-vars
                const _relatedComponent = warning.related_component_name || '';
                // eslint-disable-next-line no-unused-vars
                const _layer = warning.layer || '';
                
                // 🔥 NEW: Add component name prefix if not already in message
                // Format: [COMPONENT] Message
                if (component && !msg.toLowerCase().includes(component.toLowerCase())) {
                    const componentLabel = component.toUpperCase();
                    msg = `[${componentLabel}] ${msg}`;
                } else if (component) {
                    // Component is in message but may not be clearly identified
                    // Ensure it's highlighted at the start
                    const componentLower = component.toLowerCase();
                    
                    // If message starts with emoji or symbol, insert component after it
                    if (msg.match(/^(?:ℹ️|⚠️|❌|✅)/u)) {
                        const emoji = msg.match(/^(?:ℹ️|⚠️|❌|✅)/u)[0];
                        const rest = msg.substring(emoji.length).trim();
                        if (!rest.toLowerCase().startsWith(componentLower) && !rest.toLowerCase().startsWith(`[${componentLower}`)) {
                            msg = `${emoji} [${component.toUpperCase()}] ${rest}`;
                        }
                    }
                }
                
                // Skip vague "unknown" messages
                if (isVagueMessage(msg)) {
                    console.log('🔇 Filtered vague warning:', msg.substring(0, 50));
                    return;
                }
                
                // Move optimization messages to compatible section
                if (isOptimizationMessage(msg)) {
                    console.log('🔄 Moved optimization to compatible:', msg.substring(0, 50));
                    compatibleNotes.push(`✅ ${msg}`);
                    return;
                }
                
                // 🔥 CRITICAL FIX: Only add ACTIONABLE warnings
                // Skip informational notes that don't require user action
                const informationalPatterns = [
                    'has minimal headroom', // Already working, just tight
                    'ensure excellent', // General advice, not a problem
                    'consider', 'optional', 'recommended',
                    'for better performance', 'for best results',
                    'upgrading', 'upgrade recommended',
                    'will run at', // Speed downgrade info (not a problem, just FYI)
                    'uses sata', // Interface info (not a problem, just slower)
                    'limited to ~550mb/s' // SATA speed limit (informational)
                ];
                
                const isInformational = informationalPatterns.some(pattern => 
                    msg.toLowerCase().includes(pattern)
                );
                
                if (isInformational) {
                    console.log('📝 Filtered informational warning (moved to compatible):', msg.substring(0, 50));
                    compatibleNotes.push(`✅ ${msg.replace(/^(?:ℹ️|⚠️|❌)\s*/u, '')}`);
                } else {
                    warnings.push(msg);
                }
            });
        }

        // Extract from layers structure
        if (data.layers) {
            Object.values(data.layers).forEach(layer => {
                if (layer.issues) layer.issues.forEach(i => {
                    const msg = i.message || String(i);
                    if (i.severity === 'critical') {
                        problems.push(msg);
                    } else if (i.severity === 'warning') {
                        warnings.push(msg);
                    }
                });
                if (layer.warnings) layer.warnings.forEach(w => {
                    const msg = w.message || String(w);
                    if (!msg.toLowerCase().includes('cannot verify')) {
                        warnings.push(msg);
                    }
                });
            });
        }

        return {
            compatible: { 
                notes: [...new Set(compatibleNotes)],
                disclaimers: [] 
            },
            warnings: { 
                warnings: [...new Set(warnings)],
                notes: [],
                disclaimers: [] 
            },
            problems: { 
                problems: [...new Set(problems)],
                notes: [],
                disclaimers: [] 
            }
        };
    };

    /**
     * Analyze build using all compatibility systems
     */
    const analyzeBuildCompatibility = async () => {
        setLoading(true);
        try {
            // Get token (may be null for guest users)
            // Prepare component data for analysis
            const components = Array.isArray(buildComponents)
                ? buildComponents
                : Object.values(buildComponents || {}).filter(c => c?.id);

            console.log('🔍 Analyzing build compatibility for', components.length, 'components');

            // 🔥 CRITICAL FIX: Check for empty components early
            if (!components || components.length === 0) {
                console.log('⚠️ No components to analyze, showing empty state');
                setCompatibilityData({
                    compatible: { notes: ['Add components to your build to see compatibility analysis'], disclaimers: [] },
                    warnings: { warnings: [], notes: [], disclaimers: [] },
                    problems: { problems: [], notes: [], disclaimers: [] }
                });
                setLoading(false);
                return;
            }

            const formattedComponents = formatComponentsForAPI(components);
            
            // 🔥 CRITICAL FIX: If no components could be formatted, don't call API
            if (Object.keys(formattedComponents).length === 0) {
                console.warn('⚠️ No components could be formatted for API, showing fallback');
                setCompatibilityData({
                    compatible: { notes: [], disclaimers: [] },
                    warnings: { warnings: ['Unable to analyze components because required category or ID data is missing. Refresh the cart or re-add the affected items.'], notes: [], disclaimers: [] },
                    problems: { problems: [], notes: [], disclaimers: [] }
                });
                setLoading(false);
                return;
            }

            // Prepare headers
            const headers = {
                'Content-Type': 'application/json'
            };


            // Call advanced full-build compatibility check endpoint (uses ALL services)
            const response = await fetch(`${getServerBaseUrl()}/api/compatibility/advanced/full-build`, {
                method: 'POST',
                headers: headers,
                credentials: 'include',
                body: JSON.stringify({
                    components: formattedComponents
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Compatibility check failed:', response.status, errorText);
                throw new Error(`Compatibility check failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Compatibility analysis complete:', data);

            // Transform advanced/full-build response to CompatibilityNotes format
            const transformedData = transformAdvancedResponse(data.data || data);
            setCompatibilityData(transformedData);
        } catch (error) {
            console.error('❌ Compatibility analysis error:', error);
            // Set fallback empty data
            setCompatibilityData({
                compatible: { notes: [], disclaimers: [] },
                warnings: { warnings: [`Compatibility check failed: ${error.message || 'Unable to contact compatibility service.'}`], notes: [], disclaimers: [] },
                problems: { problems: [], notes: [], disclaimers: [] }
            });
        } finally {
            setLoading(false);
        }
    };

    /**
     * Toggle section with accordion behavior - only one section open at a time
     */
    const toggleSection = (section) => {
        setExpandedSections(prev => {
            // If clicking the currently open section, close it
            if (prev[section]) {
                return {
                    compatible: false,
                    warnings: false,
                    problems: false
                };
            }

            // Otherwise, close all sections and open only the clicked one
            return {
                compatible: section === 'compatible',
                warnings: section === 'warnings',
                problems: section === 'problems'
            };
        });
    };

    if (loading) {
        return (
            <div className="pcpart-compat-notes-container">
                <div className="pcpart-compat-loading">
                    <div className="pcpart-compat-spinner"></div>
                    <span>Analyzing compatibility...</span>
                </div>
            </div>
        );
    }

    if (!compatibilityData) {
        return null;
    }

    const { compatible, warnings, problems } = compatibilityData;
    const hasCompatibleItems = compatible?.notes?.length > 0 || compatible?.disclaimers?.length > 0;
    const hasWarnings = warnings?.warnings?.length > 0 || warnings?.notes?.length > 0 || warnings?.disclaimers?.length > 0;
    const hasProblems = problems?.problems?.length > 0 || problems?.notes?.length > 0 || problems?.disclaimers?.length > 0;

    /**
     * Format compatibility message with enhanced styling
     * Parses emojis and highlights critical keywords and component names
     * 🔥 ENHANCED: Highlight component names in square brackets for easy identification
     */
    const formatMessage = (message) => {
        if (!message) return message;

        // 🔥 NEW: Extract and highlight component names in [COMPONENT] format
        const componentPattern = /\[([A-Z0-9\s\-/]+)\]/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        // Split message by component tags
        while ((match = componentPattern.exec(message)) !== null) {
            // Add text before the component tag
            if (match.index > lastIndex) {
                parts.push({
                    type: 'text',
                    content: message.substring(lastIndex, match.index)
                });
            }
            
            // Add component tag as highlighted element
            parts.push({
                type: 'component',
                content: match[0] // Full match including brackets
            });
            
            lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text after last component tag
        if (lastIndex < message.length) {
            parts.push({
                type: 'text',
                content: message.substring(lastIndex)
            });
        }
        
        // If no component tags found, treat entire message as text
        if (parts.length === 0) {
            parts.push({
                type: 'text',
                content: message
            });
        }

        return (
            <span className="pcpart-compat-message">
                {parts.map((part, partIdx) => {
                    if (part.type === 'component') {
                        // Render component name in bold with distinct color
                        return (
                            <strong key={`comp-${part.content}`} className="pcpart-compat-component-name">
                                {part.content}
                            </strong>
                        );
                    }
                    
                    // Split text by emoji patterns to preserve them
                    const textParts = part.content.split(/((?:🔴|⚠️|✅|📏|🔧|⏱️|💡|🌡️|⚡|🎯|📊))/gu);
                    
                    return textParts.map((textPart, idx) => {
                        // Check if part is an emoji
                        if (/(?:🔴|⚠️|✅|📏|🔧|⏱️|💡|🌡️|⚡|🎯|📊)/u.test(textPart)) {
                            return <span key={`${partIdx}-emoji-${idx}`} className="pcpart-compat-emoji">{textPart}</span>;
                        }
                        
                        // Highlight critical keywords
                        if (textPart.includes('CRITICAL') || textPart.includes('ERROR') || textPart.includes('EXCEEDS') || textPart.includes('CANNOT')) {
                            return <strong key={`${partIdx}-crit-${idx}`} className="pcpart-compat-critical">{textPart}</strong>;
                        }
                        if (textPart.includes('WARNING') || textPart.includes('TIGHT') || textPart.includes('MINIMAL')) {
                            return <strong key={`${partIdx}-warn-${idx}`} className="pcpart-compat-warning-text">{textPart}</strong>;
                        }
                        
                        return <span key={`${partIdx}-text-${idx}`}>{textPart}</span>;
                    });
                })}
            </span>
        );
    };

    return (
        <div className="pcpart-compat-notes-container">
            {/* GREEN: Compatible Section */}
            {hasCompatibleItems && (
                <div className="pcpart-compat-section pcpart-compat-compatible-section">
                    <button
                        className="pcpart-compat-header"
                        onClick={() => toggleSection('compatible')}
                    >
                        <div className="pcpart-compat-header-left">
                            <FiCheck className="pcpart-compat-section-icon" />
                            <span className="pcpart-compat-section-title">Compatible</span>
                            <span className="pcpart-compat-item-count">({(compatible.notes?.length || 0) + (compatible.disclaimers?.length || 0)})</span>
                        </div>
                        {expandedSections.compatible ? <FiChevronDown /> : <FiChevronUp />}
                    </button>

                    {expandedSections.compatible && (
                        <div className="pcpart-compat-content">
                            {compatible.notes?.length > 0 && (
                                <div className="pcpart-compat-notes-section">
                                    <h4 className="pcpart-compat-subsection-title">Note:</h4>
                                    <ul className="pcpart-compat-list">
                                        {compatible.notes.map((note) => (
                                            <li key={note}>{formatMessage(note)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {compatible.disclaimers?.length > 0 && (
                                <div className="pcpart-compat-disclaimers-section">
                                    <h4 className="pcpart-compat-subsection-title">Disclaimer:</h4>
                                    <ul className="pcpart-compat-list">
                                        {compatible.disclaimers.map((disclaimer) => (
                                            <li key={disclaimer}>{formatMessage(disclaimer)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* YELLOW: Things to Consider Section (was "Potential Incompatibilities" - misleading) */}
            {hasWarnings && (
                <div className="pcpart-compat-section pcpart-compat-warnings-section">
                    <button
                        className="pcpart-compat-header"
                        onClick={() => toggleSection('warnings')}
                    >
                        <div className="pcpart-compat-header-left">
                            <FiAlertTriangle className="pcpart-compat-section-icon" />
                            <span className="pcpart-compat-section-title">Things to Consider</span>
                            <span className="pcpart-compat-item-count">
                                ({(warnings.warnings?.length || 0) + (warnings.notes?.length || 0) + (warnings.disclaimers?.length || 0)})
                            </span>
                        </div>
                        {expandedSections.warnings ? <FiChevronDown /> : <FiChevronUp />}
                    </button>

                    {expandedSections.warnings && (
                        <div className="pcpart-compat-content">
                            {warnings.warnings?.length > 0 && (
                                <div className="pcpart-compat-warnings-subsection">
                                    <h4 className="pcpart-compat-subsection-title">Warning/s:</h4>
                                    <ul className="pcpart-compat-list">
                                        {warnings.warnings.map((warning) => (
                                            <li key={warning}>{formatMessage(warning)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {warnings.notes?.length > 0 && (
                                <div className="pcpart-compat-notes-section">
                                    <h4 className="pcpart-compat-subsection-title">Note:</h4>
                                    <ul className="pcpart-compat-list">
                                        {warnings.notes.map((note) => (
                                            <li key={`w-${note}`}>{formatMessage(note)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {warnings.disclaimers?.length > 0 && (
                                <div className="pcpart-compat-disclaimers-section">
                                    <h4 className="pcpart-compat-subsection-title">Disclaimer:</h4>
                                    <ul className="pcpart-compat-list">
                                        {warnings.disclaimers.map((disclaimer) => (
                                            <li key={`w-disc-${disclaimer}`}>{formatMessage(disclaimer)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* RED: Compatibility Problems Section */}
            {hasProblems && (
                <div className="pcpart-compat-section pcpart-compat-problems-section">
                    <button
                        className="pcpart-compat-header"
                        onClick={() => toggleSection('problems')}
                    >
                        <div className="pcpart-compat-header-left">
                            <FiAlertCircle className="pcpart-compat-section-icon" />
                            <span className="pcpart-compat-section-title">Compatibility Problem</span>
                            <span className="pcpart-compat-item-count">
                                ({(problems.problems?.length || 0) + (problems.notes?.length || 0) + (problems.disclaimers?.length || 0)})
                            </span>
                        </div>
                        {expandedSections.problems ? <FiChevronDown /> : <FiChevronUp />}
                    </button>

                    {expandedSections.problems && (
                        <div className="pcpart-compat-content">
                            {problems.problems?.length > 0 && (
                                <div className="pcpart-compat-problems-subsection">
                                    <h4 className="pcpart-compat-subsection-title">Problem/s:</h4>
                                    <ul className="pcpart-compat-list">
                                        {problems.problems.map((problem) => (
                                            <li key={problem}>{formatMessage(problem)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {problems.notes?.length > 0 && (
                                <div className="pcpart-compat-notes-section">
                                    <h4 className="pcpart-compat-subsection-title">Note:</h4>
                                    <ul className="pcpart-compat-list">
                                        {problems.notes.map((note) => (
                                            <li key={`p-${note}`}>{formatMessage(note)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {problems.disclaimers?.length > 0 && (
                                <div className="pcpart-compat-disclaimers-section">
                                    <h4 className="pcpart-compat-subsection-title">Disclaimer:</h4>
                                    <ul className="pcpart-compat-list">
                                        {problems.disclaimers.map((disclaimer) => (
                                            <li key={`p-disc-${disclaimer}`}>{formatMessage(disclaimer)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {!hasCompatibleItems && !hasWarnings && !hasProblems && (
                <div className="pcpart-compat-no-data">
                    <FiCheck className="pcpart-compat-no-data-icon" />
                    <p>No compatibility issues detected</p>
                </div>
            )}
        </div>
    );
};

CompatibilityNotes.propTypes = {
    buildComponents: PropTypes.oneOfType([
        PropTypes.array,
        PropTypes.object
    ]),
    buildType: PropTypes.string
};

export default CompatibilityNotes;

