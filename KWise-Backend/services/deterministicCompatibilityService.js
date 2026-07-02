const crypto = require('node:crypto');
const logger = require('../utils/logger');

const CATEGORY_ALIASES = {
    cpu: 'CPU',
    processor: 'CPU',
    motherboard: 'Motherboard',
    mainboard: 'Motherboard',
    ram: 'RAM',
    memory: 'RAM',
    gpu: 'GPU',
    graphics: 'GPU',
    'graphics card': 'GPU',
    vga: 'GPU',
    psu: 'PSU',
    'power supply': 'PSU',
    storage: 'Storage',
    ssd: 'Storage',
    hdd: 'Storage',
    cooling: 'Cooling',
    cooler: 'Cooling',
    'cpu cooler': 'Cooling',
    case: 'Case',
    chassis: 'Case'
};
const RELEVANT_CONTEXT_CATEGORIES = {
    CPU: new Set(['Motherboard', 'Cooling', 'PSU']),
    Motherboard: new Set(['CPU', 'RAM', 'Case', 'Storage', 'GPU']),
    RAM: new Set(['Motherboard', 'Cooling']),
    GPU: new Set(['Case', 'PSU', 'Motherboard']),
    PSU: new Set(['Case', 'GPU', 'CPU']),
    Case: new Set(['Motherboard', 'GPU', 'PSU', 'Cooling', 'Storage']),
    Cooling: new Set(['CPU', 'Case', 'RAM']),
    Storage: new Set(['Motherboard', 'Case'])
};

function sanitizeKey(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseJsonish(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return {};

    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return { raw: value };
    }
}

function flattenSpecs(value, output = {}) {
    if (!value || typeof value !== 'object') return output;

    for (const [key, rawValue] of Object.entries(value)) {
        const cleanKey = sanitizeKey(key);
        if (!cleanKey) continue;

        if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
            flattenSpecs(rawValue, output);
        } else {
            output[cleanKey] = rawValue;
        }
    }

    return output;
}

function findValue(flatSpecs, aliases) {
    for (const alias of aliases) {
        const cleanAlias = sanitizeKey(alias);
        if (Object.prototype.hasOwnProperty.call(flatSpecs, cleanAlias)) {
            return flatSpecs[cleanAlias];
        }
    }

    for (const alias of aliases) {
        const cleanAlias = sanitizeKey(alias);
        const entry = Object.entries(flatSpecs).find(([key]) => key.includes(cleanAlias));
        if (entry) return entry[1];
    }

    return null;
}

function numberFrom(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const match = String(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number.parseFloat(match[0]) : null;
}

function numericValuesFrom(value) {
    if (value === null || value === undefined) return [];
    if (typeof value === 'number' && Number.isFinite(value)) return [value];
    return (String(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/g) || [])
        .map((entry) => Number.parseFloat(entry))
        .filter((entry) => Number.isFinite(entry));
}

function maxNumericValueFrom(value) {
    const values = numericValuesFrom(value);
    return values.length ? Math.max(...values) : null;
}

function explicitMmValueFrom(value) {
    const values = [...String(value || '').matchAll(/\b(\d+(?:\.\d+)?)\s*mm\b/gi)]
        .map((match) => Number.parseFloat(match[1]))
        .filter((entry) => Number.isFinite(entry));
    return values.length ? Math.max(...values) : null;
}

function contextualMmValueFrom(text, labels = []) {
    const source = String(text || '');
    const values = [];

    for (const label of labels) {
        const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const afterLabel = new RegExp(`\\b${escapedLabel}\\b[^\\d]{0,32}(\\d+(?:\\.\\d+)?)\\s*mm\\b`, 'gi');
        const beforeLabel = new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*mm\\b[^a-z0-9]{0,32}\\b${escapedLabel}\\b`, 'gi');

        for (const match of source.matchAll(afterLabel)) {
            values.push(Number.parseFloat(match[1]));
        }

        for (const match of source.matchAll(beforeLabel)) {
            values.push(Number.parseFloat(match[1]));
        }
    }

    const validValues = values.filter((entry) => Number.isFinite(entry));
    return validValues.length ? Math.max(...validValues) : null;
}

function dimensionMmFrom(explicitValue, rawText, labels = [], allowGenericMm = false) {
    const explicit = explicitMmValueFrom(explicitValue) ?? maxNumericValueFrom(explicitValue);
    if (explicit) return explicit;

    const contextual = contextualMmValueFrom(rawText, labels);
    if (contextual) return contextual;

    return allowGenericMm ? explicitMmValueFrom(rawText) : null;
}

function memoryCapacityGbFrom(value) {
    const text = String(value || '');
    const kitMatch = text.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*gb/i);
    if (kitMatch) {
        return Number.parseInt(kitMatch[1], 10) * Number.parseFloat(kitMatch[2]);
    }

    const gbValues = [...text.matchAll(/(\d+(?:\.\d+)?)\s*gb/gi)]
        .map((match) => Number.parseFloat(match[1]))
        .filter((entry) => Number.isFinite(entry));
    if (gbValues.length > 0) return Math.max(...gbValues);

    return numberFrom(value);
}

function stickCountFrom(value, rawText) {
    const candidates = [value, rawText].filter(Boolean).map(String);
    for (const candidate of candidates) {
        const kitMatch = candidate.match(/\b(\d+)\s*x\s*\d+(?:\.\d+)?\s*gb\b/i);
        if (kitMatch) return Number.parseInt(kitMatch[1], 10);

        const moduleMatch = candidate.match(/\b(\d+)\s*(?:sticks?|modules?|dimms?)\b/i);
        if (moduleMatch) return Number.parseInt(moduleMatch[1], 10);
    }

    return null;
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

function normalizeCategory(category) {
    const raw = String(category || '').trim();
    const lower = raw.toLowerCase();
    if (CATEGORY_ALIASES[lower]) return CATEGORY_ALIASES[lower];

    const match = Object.entries(CATEGORY_ALIASES).find(([alias]) => lower.includes(alias));
    return match ? match[1] : raw || 'Unknown';
}

function normalizeSocket(value) {
    if (!value) return null;
    return String(value).replace(/\s+/g, '').toUpperCase();
}

function normalizeMemoryType(value) {
    if (!value) return null;
    const text = String(value);
    const match = text.match(/\bDDR\s*[- ]?([45])\b/i);
    return match ? `DDR${match[1]}` : null;
}

function normalizeFormFactor(value) {
    if (!value) return null;
    const text = String(value).toLowerCase();
    if (text.includes('e-atx') || text.includes('extended atx')) return 'E-ATX';
    if (text.includes('micro-atx') || text.includes('micro atx') || text.includes('matx')) return 'Micro-ATX';
    if (text.includes('mini-itx') || text.includes('mini itx') || text.includes('mitx')) return 'Mini-ITX';
    if (/\batx\b/i.test(text)) return 'ATX';
    return null;
}

function normalizePsuFormFactor(value) {
    if (!value) return null;
    const text = String(value).toLowerCase();
    if (/sfx[-\s]?l/.test(text)) return 'SFX-L';
    if (/\bsfx\b/.test(text)) return 'SFX';
    if (/\batx\b/.test(text)) return 'ATX';
    if (/flex[-\s]?atx/.test(text)) return 'Flex-ATX';
    return null;
}

function parseAllPsuFormFactors(value) {
    const text = String(value || '').toLowerCase();
    const found = [];
    if (/sfx[-\s]?l/.test(text)) found.push('SFX-L');
    if (/\bsfx\b/.test(text)) found.push('SFX');
    if (/\batx\b/.test(text)) found.push('ATX');
    if (/flex[-\s]?atx/.test(text)) found.push('Flex-ATX');
    return unique(found);
}

function parseSocket(text) {
    const socketMatches = String(text || '').match(/\b(?:LGA\s*\d{4}|AM[45]|sTRX4|sWRX8|TR4)\b/gi);
    return socketMatches?.length ? normalizeSocket(socketMatches[0]) : null;
}

function parseChipset(text) {
    const match = String(text || '').match(/\b(?:Z|B|H|X|A)\d{3}[A-Z]*\b/i);
    return match ? match[0].toUpperCase() : null;
}

function parseAllFormFactors(text) {
    const source = String(text || '');
    const found = [];
    if (/e-atx|extended atx/i.test(source)) found.push('E-ATX');
    if (/micro[-\s]?atx|\bmatx\b/i.test(source)) found.push('Micro-ATX');
    if (/mini[-\s]?itx|\bmitx\b/i.test(source)) found.push('Mini-ITX');
    if (/\batx\b/i.test(source)) found.push('ATX');

    if (/mid[-\s]?tower|full[-\s]?tower/i.test(source) && !found.length) {
        found.push('ATX', 'Micro-ATX', 'Mini-ITX');
    }

    return unique(found);
}

function parseConnectors(value) {
    const text = Array.isArray(value) ? value.join(' ') : String(value || '');
    const counts = { sixPin: 0, eightPin: 0, twelveVhpwr: 0 };

    if (/12vhpwr|12v-?2x6|16[-\s]?pin|12\+4/i.test(text)) {
        counts.twelveVhpwr += 1;
    }

    const withCountRegex = /(\d+)\s*(?:x)?\s*(?:pcie\s*)?(6\+2|8|6)\s*[-\s]?pin/gi;
    let match;
    while ((match = withCountRegex.exec(text)) !== null) {
        const count = Number.parseInt(match[1], 10) || 1;
        const pinType = match[2];
        if (pinType === '6') counts.sixPin += count;
        else counts.eightPin += count;
    }

    if (counts.sixPin === 0 && counts.eightPin === 0) {
        const eightPins = text.match(/\b(?:6\+2|8)\s*[-\s]?pin/gi) || [];
        const sixPins = text.match(/\b6\s*[-\s]?pin/gi) || [];
        counts.eightPin += eightPins.length;
        counts.sixPin += sixPins.length;
    }

    return counts;
}

function hasConnectorData(connectors) {
    return connectors.sixPin > 0 || connectors.eightPin > 0 || connectors.twelveVhpwr > 0;
}

function compareConnectorCounts(required, available) {
    if (!hasConnectorData(required)) return { status: 'unknown' };
    if (!hasConnectorData(available)) return { status: 'missing_available' };

    if (required.twelveVhpwr > 0 && available.twelveVhpwr < required.twelveVhpwr) {
        return { status: 'fail', reason: 'Required 12VHPWR/16-pin GPU connector is not available on the PSU.' };
    }

    if (required.eightPin > available.eightPin) {
        return { status: 'fail', reason: `GPU requires ${required.eightPin} PCIe 8-pin connector(s), PSU lists ${available.eightPin}.` };
    }

    if (required.sixPin > available.sixPin + Math.max(0, available.eightPin - required.eightPin)) {
        return { status: 'fail', reason: `GPU requires ${required.sixPin} PCIe 6-pin connector(s), PSU connector count is insufficient.` };
    }

    return { status: 'pass' };
}

function detectIntelGeneration(name) {
    const match = String(name || '').match(/\bi[3579][-\s]?(\d{2})\d{3}[A-Z]*\b/i);
    return match ? Number.parseInt(match[1], 10) : null;
}

function isHighPowerCpu(component) {
    const name = String(component.name || '').toLowerCase();
    return (component.tdpW && component.tdpW >= 125) ||
        /\bi[79][-\s]?\d{5}k\b/i.test(name) ||
        /ryzen\s+[79]\s+\d{4}x/i.test(name);
}

function buildCacheKey(scope, value) {
    const sortValue = (input) => {
        if (Array.isArray(input)) return input.map(sortValue);
        if (input && typeof input === 'object') {
            return Object.keys(input).sort().reduce((accumulator, key) => {
                accumulator[key] = sortValue(input[key]);
                return accumulator;
            }, {});
        }
        return input;
    };
    const json = JSON.stringify(sortValue(value));
    return crypto.createHash('sha1').update(`${scope}:${json}`).digest('hex');
}

class DeterministicCompatibilityService {
    constructor() {
        this.cache = new Map();
        this.componentCache = new Map();
        this.cacheTtlMs = 5 * 60 * 1000;
        this.maxCacheEntries = 2000;
        this.initialized = false;
    }

    async initialize() {
        this.initialized = true;
        logger.info('[Compatibility] Deterministic compatibility service initialized');
    }

    invalidateCache() {
        this.cache.clear();
        this.componentCache.clear();
    }

    getStatus() {
        return {
            available: true,
            initialized: this.initialized,
            source: 'deterministic',
            aiEnabled: false,
            model: null,
            cacheEntries: this.cache.size,
            componentCacheEntries: this.componentCache.size,
            rules: [
                'socket',
                'chipset_bios',
                'ram_type_capacity_speed',
                'ram_stick_count',
                'form_factor',
                'gpu_clearance',
                'cooler_socket_tdp_clearance',
                'ram_cooler_clearance',
                'psu_wattage_headroom_connectors',
                'storage_slots',
                'drive_bays',
                'pcie_warning',
                'manual_missing_specs'
            ]
        };
    }

    normalizeComponent(component = {}) {
        const rawSpecifications = parseJsonish(component.specifications);
        const normalizedSpecsPayload = parseJsonish(component.normalized_specs);
        const canonicalSpecs = parseJsonish(normalizedSpecsPayload.specs || normalizedSpecsPayload);
        const specifications = { ...rawSpecifications, ...canonicalSpecs };
        const dimensions = parseJsonish(component.dimensions);
        const componentCacheKey = buildCacheKey('component', {
            id: component.id,
            name: component.name,
            category: component.category,
            specifications,
            dimensions
        });
        const cachedComponent = this.componentCache.get(componentCacheKey);
        if (cachedComponent) {
            return JSON.parse(JSON.stringify(cachedComponent));
        }

        const flatSpecs = flattenSpecs({ ...specifications, ...dimensions });
        const rawText = [
            component.name,
            component.category,
            component.brand,
            component.description,
            JSON.stringify(specifications),
            JSON.stringify(dimensions)
        ].filter(Boolean).join(' ');

        const category = normalizeCategory(component.category);
        const socketValue = findValue(flatSpecs, ['socket', 'cpu socket', 'processor socket']);
        const memoryValue = findValue(flatSpecs, ['memory type', 'ram type', 'supported memory', 'type']);
        const formFactorValue = findValue(flatSpecs, ['form factor', 'motherboard form factor', 'size']);
        const supportedFormFactorsValue = findValue(flatSpecs, [
            'supported form factors',
            'motherboard support',
            'motherboard compatibility',
            'mobo support'
        ]);
        const psuFormFactorValue = findValue(flatSpecs, [
            'psu form factor',
            'power supply form factor',
            'psu size',
            'form factor'
        ]);
        const supportedPsuFormFactorsValue = findValue(flatSpecs, [
            'supported psu form factors',
            'psu support',
            'power supply support',
            'psu compatibility'
        ]);
        const gpuPowerValue = findValue(flatSpecs, [
            'power connectors',
            'pcie power connectors',
            'external power',
            'gpu power connector'
        ]);
        const psuConnectorValue = findValue(flatSpecs, [
            'pcie connectors',
            'pci-e connectors',
            'gpu connectors',
            'connectors'
        ]);

        const supportText = `${supportedFormFactorsValue || ''} ${rawText}`;
        const formFactors = category === 'Case'
            ? parseAllFormFactors(supportText)
            : [];

        const wattage = numberFrom(findValue(flatSpecs, ['wattage', 'power', 'rated power'])) ||
            (category === 'PSU' ? numberFrom(String(component.name || '').match(/\b\d{3,4}\s*w\b/i)?.[0]) : null);
        const tdp = numberFrom(findValue(flatSpecs, ['tdp', 'thermal design power', 'power consumption', 'board power', 'tgp', 'tbp'])) ||
            numberFrom(String(rawText).match(/\b\d{2,4}\s*w\b/i)?.[0]);

        const memorySlots = numberFrom(findValue(flatSpecs, ['memory slots', 'ram slots', 'dimm slots']));
        const maxMemory = numberFrom(findValue(flatSpecs, ['max memory', 'maximum memory', 'memory capacity']));
        const capacityValue = findValue(flatSpecs, ['capacity', 'memory size', 'storage capacity', 'total capacity', 'kit capacity']);
        const capacity = category === 'RAM' ? memoryCapacityGbFrom(capacityValue || rawText) : numberFrom(capacityValue);
        const memorySpeed = numberFrom(findValue(flatSpecs, ['memory speed', 'ram speed', 'speed', 'max memory speed']));
        const ramStickValue = findValue(flatSpecs, ['sticks count', 'stick count', 'modules', 'module count', 'dimm count', 'configuration']);
        const gpuLengthValue = findValue(flatSpecs, ['length', 'gpu length', 'length mm', 'card length']);
        const coolerHeightValue = findValue(flatSpecs, ['height', 'cooler height', 'height mm']);

        const normalized = {
            ...component,
            category,
            specifications,
            dimensions,
            socket: normalizeSocket(socketValue) || parseSocket(rawText),
            chipset: parseChipset(findValue(flatSpecs, ['chipset']) || rawText),
            memoryType: normalizeMemoryType(memoryValue) || normalizeMemoryType(rawText),
            memorySlots,
            maxMemoryGb: maxMemory,
            capacityGb: capacity,
            stickCount: category === 'RAM' ? stickCountFrom(ramStickValue, rawText) : null,
            memorySpeedMhz: memorySpeed,
            formFactor: category === 'PSU'
                ? normalizePsuFormFactor(psuFormFactorValue) || normalizePsuFormFactor(rawText)
                : normalizeFormFactor(formFactorValue) || normalizeFormFactor(rawText),
            supportedFormFactors: formFactors,
            supportedPsuFormFactors: category === 'Case'
                ? parseAllPsuFormFactors(supportedPsuFormFactorsValue)
                : [],
            tdpW: category === 'PSU' ? null : tdp,
            wattageW: wattage,
            powerConsumptionW: tdp,
            lengthMm: category === 'GPU'
                ? dimensionMmFrom(gpuLengthValue, rawText, ['gpu length', 'card length', 'graphics card length', 'length'], true)
                : numberFrom(gpuLengthValue),
            maxGpuLengthMm: numberFrom(findValue(flatSpecs, ['max gpu length', 'gpu clearance', 'max graphics card length'])),
            coolerHeightMm: category === 'Cooling'
                ? dimensionMmFrom(coolerHeightValue, rawText, ['cooler height', 'height'], false)
                : numberFrom(coolerHeightValue),
            maxCoolerHeightMm: numberFrom(findValue(flatSpecs, ['max cpu cooler height', 'cpu cooler clearance', 'max cooler height'])),
            radiatorSizeMm: numberFrom(String(rawText).match(/\b(?:120|140|240|280|360|420)\s*mm\b/i)?.[0]),
            supportedRadiators: unique((String(rawText).match(/\b(?:120|140|240|280|360|420)\s*mm\b/gi) || []).map(numberFrom)),
            socketSupport: unique(String(rawText).match(/\b(?:LGA\s*\d{4}|AM[45]|sTRX4|sWRX8|TR4)\b/gi)?.map(normalizeSocket) || []),
            coolerTdpW: numberFrom(findValue(flatSpecs, ['tdp rating', 'cooling capacity', 'max tdp', 'tdp'])),
            ramClearanceMm: numberFrom(findValue(flatSpecs, ['ram clearance', 'memory clearance', 'dimm clearance'])),
            storageInterface: this.extractStorageInterface(findValue(flatSpecs, ['interface', 'storage interface', 'interface type']) || rawText),
            storageFormFactor: this.extractStorageFormFactor(findValue(flatSpecs, ['form factor', 'storage form factor']) || rawText),
            m2Slots: numberFrom(findValue(flatSpecs, ['m2 slots', 'm.2 slots', 'm2 slot', 'm.2 slot'])),
            sataPorts: numberFrom(findValue(flatSpecs, ['sata ports', 'sata connectors', 'sata'])),
            driveBays: numberFrom(findValue(flatSpecs, ['drive bays', '2.5 bays', '3.5 bays'])),
            driveBays25: numberFrom(findValue(flatSpecs, ['2.5 bays', '2.5 drive bays', '2.5-inch bays', '2.5" bays'])),
            driveBays35: numberFrom(findValue(flatSpecs, ['3.5 bays', '3.5 drive bays', '3.5-inch bays', '3.5" bays'])),
            pcieVersion: numberFrom(String(rawText).match(/pcie\s*(?:gen\s*)?(\d(?:\.\d)?)/i)?.[1]),
            slotsRequired: numberFrom(findValue(flatSpecs, ['slots required', 'slot width', 'expansion slots'])),
            expansionSlots: numberFrom(findValue(flatSpecs, ['expansion slots', 'pci slots', 'case slots'])),
            ramHeightMm: numberFrom(findValue(flatSpecs, ['ram height', 'module height', 'height'])),
            gpuPowerConnectors: parseConnectors(gpuPowerValue || rawText),
            psuPcieConnectors: parseConnectors(psuConnectorValue || rawText),
            rawText
        };

        this.componentCache.set(componentCacheKey, JSON.parse(JSON.stringify(normalized)));
        this.trimCaches();
        return normalized;
    }

    extractStorageInterface(value) {
        const text = String(value || '').toLowerCase();
        if (text.includes('nvme')) return 'NVMe';
        if (text.includes('m.2') || text.includes('m2')) return 'M.2';
        if (text.includes('sata')) return 'SATA';
        if (text.includes('pcie')) return 'PCIe';
        return null;
    }

    extractStorageFormFactor(value) {
        const text = String(value || '').toLowerCase();
        if (text.includes('m.2') || text.includes('m2') || /\b22(30|42|60|80|110)\b/.test(text)) return 'M.2';
        if (text.includes('2.5')) return '2.5';
        if (text.includes('3.5')) return '3.5';
        return null;
    }

    createResult(startedAt, cacheKey, parts, rulesApplied, problems, warnings, notes, manualChecks) {
        const hasProblems = problems.length > 0;
        const warningPenalty = warnings.reduce((sum, warning) => sum + (warning.penalty || 8), 0);
        const manualPenalty = manualChecks.length * 5;
        const score = hasProblems ? 0 : Math.max(0, Math.min(100, 100 - warningPenalty - manualPenalty));
        const verdict = hasProblems
            ? 'fail'
            : warnings.length > 0
                ? 'warning'
                : manualChecks.length > 0
                    ? 'manual_check'
                    : 'pass';

        const missingSpecs = manualChecks.map((check) => ({
            rule: check.rule,
            message: check.message,
            details: check.details,
            components: check.components || []
        }));

        return {
            success: true,
            source: 'deterministic',
            engine: 'deterministic',
            aiEnabled: false,
            compatible: !hasProblems,
            status: verdict,
            score,
            verdict,
            problems,
            warnings,
            notes,
            manualChecks,
            missingSpecs,
            rulesApplied,
            latencyMs: Date.now() - startedAt,
            cache: { hit: false, key: cacheKey },
            parts
        };
    }

    getCached(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (!cached || Date.now() - cached.createdAt > this.cacheTtlMs) {
            this.cache.delete(cacheKey);
            return null;
        }

        const cloned = JSON.parse(JSON.stringify(cached.value));
        cloned.cache = { hit: true, key: cacheKey };
        cloned.latencyMs = 0;
        return cloned;
    }

    setCached(cacheKey, value) {
        this.cache.set(cacheKey, {
            createdAt: Date.now(),
            value: JSON.parse(JSON.stringify(value))
        });
        this.trimCaches();
    }

    trimCaches() {
        while (this.cache.size > this.maxCacheEntries) {
            this.cache.delete(this.cache.keys().next().value);
        }

        while (this.componentCache.size > this.maxCacheEntries) {
            this.componentCache.delete(this.componentCache.keys().next().value);
        }
    }

    analyzePair(componentA, componentB) {
        const startedAt = Date.now();
        const first = this.normalizeComponent(componentA);
        const second = this.normalizeComponent(componentB);
        const cacheKey = buildCacheKey('pair', {
            a: first.id || first.name,
            b: second.id || second.name,
            ac: first.category,
            bc: second.category,
            as: first.specifications,
            bs: second.specifications
        });
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const problems = [];
        const warnings = [];
        const notes = [];
        const manualChecks = [];
        const rulesApplied = [];
        const addProblem = (rule, message, details) => {
            rulesApplied.push(rule);
            problems.push({ severity: 'critical', rule, message, details, components: [first.name, second.name] });
        };
        const addWarning = (rule, message, details, penalty = 8) => {
            rulesApplied.push(rule);
            warnings.push({ severity: 'warning', rule, message, details, penalty, components: [first.name, second.name] });
        };
        const addManual = (rule, message, details) => {
            rulesApplied.push(rule);
            manualChecks.push({ severity: 'manual_check', rule, message, details, components: [first.name, second.name] });
        };
        const addNote = (rule, message, details) => {
            rulesApplied.push(rule);
            notes.push({ severity: 'info', rule, message, details, components: [first.name, second.name] });
        };

        this.evaluatePair(first, second, { addProblem, addWarning, addManual, addNote });

        if (!rulesApplied.length) {
            addNote('category_scope', `${first.category} and ${second.category} have no direct hard compatibility rule.`, 'No deterministic incompatibility was found for this category pair.');
        }

        const result = this.createResult(startedAt, cacheKey, [first, second], unique(rulesApplied), problems, warnings, notes, manualChecks);
        this.setCached(cacheKey, result);
        return result;
    }

    evaluatePair(first, second, actions) {
        const pair = [first.category, second.category].sort().join(':');

        if (pair === 'CPU:Motherboard') {
            this.checkCpuMotherboard(first.category === 'CPU' ? first : second, first.category === 'Motherboard' ? first : second, actions);
        } else if (pair === 'Motherboard:RAM') {
            this.checkRamMotherboard(first.category === 'RAM' ? first : second, first.category === 'Motherboard' ? first : second, actions);
        } else if (pair === 'Case:Motherboard') {
            this.checkMotherboardCase(first.category === 'Motherboard' ? first : second, first.category === 'Case' ? first : second, actions);
        } else if (pair === 'Case:GPU') {
            this.checkGpuCase(first.category === 'GPU' ? first : second, first.category === 'Case' ? first : second, actions);
        } else if (pair === 'Case:PSU') {
            this.checkPsuCase(first.category === 'PSU' ? first : second, first.category === 'Case' ? first : second, actions);
        } else if (pair === 'CPU:Cooling') {
            this.checkCpuCooler(first.category === 'CPU' ? first : second, first.category === 'Cooling' ? first : second, actions);
        } else if (pair === 'Case:Cooling') {
            this.checkCoolerCase(first.category === 'Cooling' ? first : second, first.category === 'Case' ? first : second, actions);
        } else if (pair === 'GPU:PSU') {
            this.checkGpuPsu(first.category === 'GPU' ? first : second, first.category === 'PSU' ? first : second, actions);
        } else if (pair === 'CPU:PSU') {
            this.checkCpuPsu(first.category === 'CPU' ? first : second, first.category === 'PSU' ? first : second, actions);
        } else if (pair === 'Motherboard:Storage') {
            this.checkStorageMotherboard(first.category === 'Storage' ? first : second, first.category === 'Motherboard' ? first : second, actions);
        } else if (pair === 'GPU:Motherboard') {
            this.checkGpuMotherboard(first.category === 'GPU' ? first : second, first.category === 'Motherboard' ? first : second, actions);
        } else if (pair === 'Cooling:RAM') {
            this.checkRamCooler(first.category === 'RAM' ? first : second, first.category === 'Cooling' ? first : second, actions);
        } else if (pair === 'Case:Storage') {
            this.checkStorageCase(first.category === 'Storage' ? first : second, first.category === 'Case' ? first : second, actions);
        }
    }

    checkCpuMotherboard(cpu, motherboard, { addProblem, addWarning, addManual, addNote }) {
        if (cpu.socket && motherboard.socket) {
            if (cpu.socket !== motherboard.socket) {
                addProblem('socket_match', `Socket mismatch: ${cpu.socket} CPU cannot use ${motherboard.socket} motherboard.`, 'CPU and motherboard sockets must match physically.');
            } else {
                addNote('socket_match', `Socket match confirmed: ${cpu.socket}.`);
            }
        } else {
            addManual('socket_match', 'CPU or motherboard socket is missing.', 'Verify manufacturer socket specifications before checkout.');
        }

        const generation = detectIntelGeneration(cpu.name);
        if (generation && motherboard.chipset) {
            if (generation >= 13 && /^[BHZ]6/.test(motherboard.chipset)) {
                addWarning('bios_generation', `${motherboard.chipset} motherboard may need a BIOS update for ${generation}th gen Intel CPU.`, 'Confirm BIOS version with the motherboard manufacturer.');
            }
            if (motherboard.chipset.startsWith('H610') && isHighPowerCpu(cpu)) {
                addWarning('chipset_vrm_headroom', 'H610 boards are not recommended for high-power i7/i9 K-series CPUs.', 'Use a stronger B/Z chipset board for sustained boost behavior and VRM thermals.', 25);
            }
        }
    }

    checkRamMotherboard(ram, motherboard, { addProblem, addWarning, addManual, addNote }) {
        if (ram.memoryType && motherboard.memoryType) {
            if (ram.memoryType !== motherboard.memoryType) {
                addProblem('ram_type', `Memory type mismatch: ${ram.memoryType} RAM cannot fit ${motherboard.memoryType} motherboard slots.`, 'DDR generations are physically keyed differently.');
            } else {
                addNote('ram_type', `Memory type match confirmed: ${ram.memoryType}.`);
            }
        } else {
            addManual('ram_type', 'RAM or motherboard memory type is missing.', 'Verify DDR generation locally before checkout.');
        }

        if (ram.capacityGb && motherboard.maxMemoryGb && ram.capacityGb > motherboard.maxMemoryGb) {
            addProblem('ram_capacity', `RAM capacity ${ram.capacityGb}GB exceeds motherboard max ${motherboard.maxMemoryGb}GB.`, 'Select a kit within the motherboard capacity limit.');
        }

        if (ram.memorySpeedMhz && motherboard.memorySpeedMhz && ram.memorySpeedMhz > motherboard.memorySpeedMhz) {
            addWarning('ram_speed', `RAM speed ${ram.memorySpeedMhz}MHz may run at motherboard limit ${motherboard.memorySpeedMhz}MHz.`, 'This is usable but may downclock.');
        }

        if (!motherboard.memorySlots) {
            addManual('ram_slots', 'Motherboard RAM slot count is missing.', 'Confirm kit stick count against available DIMM slots.');
        } else if (ram.stickCount && ram.stickCount > motherboard.memorySlots) {
            addProblem('ram_stick_count', `RAM kit uses ${ram.stickCount} stick(s), but motherboard lists ${motherboard.memorySlots} slot(s).`, 'Choose a kit that fits the available DIMM slots.');
        }
    }

    checkMotherboardCase(motherboard, pcCase, { addProblem, addManual, addNote }) {
        if (motherboard.formFactor && pcCase.supportedFormFactors.length) {
            if (!pcCase.supportedFormFactors.includes(motherboard.formFactor)) {
                addProblem('form_factor', `${motherboard.formFactor} motherboard is not listed as supported by the case.`, `Case supports: ${pcCase.supportedFormFactors.join(', ')}.`);
            } else {
                addNote('form_factor', `${motherboard.formFactor} motherboard fits the case.`);
            }
        } else {
            addManual('form_factor', 'Motherboard or case form factor support is missing.', 'Verify case motherboard support before checkout.');
        }
    }

    checkGpuCase(gpu, pcCase, { addProblem, addManual, addNote }) {
        if (gpu.lengthMm && pcCase.maxGpuLengthMm) {
            if (gpu.lengthMm > pcCase.maxGpuLengthMm) {
                addProblem('gpu_length', `GPU length ${gpu.lengthMm}mm exceeds case clearance ${pcCase.maxGpuLengthMm}mm.`, 'The graphics card will not physically fit.');
            } else {
                addNote('gpu_length', `GPU length ${gpu.lengthMm}mm is within case clearance ${pcCase.maxGpuLengthMm}mm.`);
            }
        } else {
            addManual('gpu_length', 'GPU length or case GPU clearance is missing.', 'Measure physical clearance before checkout.');
        }

        if (gpu.slotsRequired && pcCase.expansionSlots) {
            if (gpu.slotsRequired > pcCase.expansionSlots) {
                addProblem('gpu_slot_width', `GPU requires ${gpu.slotsRequired} expansion slot(s), but case lists ${pcCase.expansionSlots}.`, 'Choose a case with enough expansion slots for the graphics card.');
            } else {
                addNote('gpu_slot_width', `Case has enough expansion slots for the GPU.`);
            }
        } else if (gpu.slotsRequired && String(gpu.rawText || '').toLowerCase().includes('triple')) {
            addManual('gpu_slot_width', 'Case expansion slot count is missing for a large GPU.', 'Verify GPU thickness and case expansion slots.');
        }
    }

    checkPsuCase(psu, pcCase, { addProblem, addManual, addNote }) {
        if (psu.formFactor && pcCase.supportedPsuFormFactors.length) {
            if (!pcCase.supportedPsuFormFactors.includes(psu.formFactor)) {
                addProblem('psu_form_factor', `${psu.formFactor} PSU is not listed as supported by this case.`, `Case PSU support: ${pcCase.supportedPsuFormFactors.join(', ')}.`);
            } else {
                addNote('psu_form_factor', `${psu.formFactor} PSU form factor is supported by the case.`);
            }
        } else if (psu.formFactor || pcCase.supportedPsuFormFactors.length) {
            addManual('psu_form_factor', 'PSU form factor or case PSU support is incomplete.', 'Verify PSU physical fit before checkout.');
        }
    }

    checkCpuCooler(cpu, cooler, { addProblem, addWarning, addManual, addNote }) {
        if (cpu.socket && cooler.socketSupport.length) {
            if (!cooler.socketSupport.includes(cpu.socket)) {
                addProblem('cooler_socket', `CPU cooler does not list support for ${cpu.socket}.`, 'Select a cooler with matching mounting hardware.');
            } else {
                addNote('cooler_socket', `Cooler socket support includes ${cpu.socket}.`);
            }
        } else {
            addManual('cooler_socket', 'Cooler socket support or CPU socket is missing.', 'Verify cooler mounting kit compatibility.');
        }

        const coolerCapacity = cooler.coolerTdpW || (cooler.radiatorSizeMm === 120 ? 150 : null);
        if (cpu.tdpW && coolerCapacity) {
            if (coolerCapacity < cpu.tdpW) {
                addProblem('cooler_tdp', `Cooler capacity ${coolerCapacity}W is below CPU TDP ${cpu.tdpW}W.`, 'Choose a higher-capacity cooler.');
            } else if (coolerCapacity < cpu.tdpW * 1.2) {
                addWarning('cooler_tdp_headroom', 'CPU cooler has limited thermal headroom.', 'A higher-capacity cooler is recommended for sustained load.');
            }
        } else if (cpu.tdpW && cooler.radiatorSizeMm === 120 && cpu.tdpW >= 180) {
            addProblem('cooler_120mm_high_tdp', '120mm AIO is not enough for a high-TDP CPU.', 'Use a larger radiator or high-end air cooler.');
        } else {
            addManual('cooler_tdp', 'CPU TDP or cooler capacity is missing.', 'Verify cooler thermal rating before checkout.');
        }
    }

    checkRamCooler(ram, cooler, { addWarning, addManual, addNote }) {
        if (ram.ramHeightMm && cooler.ramClearanceMm) {
            if (ram.ramHeightMm > cooler.ramClearanceMm) {
                addWarning('ram_cooler_clearance', `RAM height ${ram.ramHeightMm}mm exceeds cooler RAM clearance ${cooler.ramClearanceMm}mm.`, 'Tall memory heat spreaders may interfere with large air coolers.', 18);
            } else {
                addNote('ram_cooler_clearance', 'RAM height is within listed cooler clearance.');
            }
        } else if (String(cooler.rawText || '').toLowerCase().includes('dual tower')) {
            addManual('ram_cooler_clearance', 'Large air cooler RAM clearance data is missing.', 'Verify memory module height against cooler clearance.');
        }
    }

    checkCoolerCase(cooler, pcCase, { addProblem, addManual, addNote }) {
        if (cooler.coolerHeightMm && pcCase.maxCoolerHeightMm) {
            if (cooler.coolerHeightMm > pcCase.maxCoolerHeightMm) {
                addProblem('cooler_height', `Cooler height ${cooler.coolerHeightMm}mm exceeds case clearance ${pcCase.maxCoolerHeightMm}mm.`, 'The cooler will not fit inside the case.');
            } else {
                addNote('cooler_height', 'CPU cooler height fits the case.');
            }
        }

        if (cooler.radiatorSizeMm) {
            if (pcCase.supportedRadiators.length && !pcCase.supportedRadiators.includes(cooler.radiatorSizeMm)) {
                addProblem('radiator_support', `${cooler.radiatorSizeMm}mm radiator is not listed as supported by the case.`, 'Select a supported radiator size or another case.');
            } else if (!pcCase.supportedRadiators.length) {
                addManual('radiator_support', 'Case radiator support is missing.', 'Verify radiator mounting positions and RAM clearance.');
            } else {
                addNote('radiator_support', `${cooler.radiatorSizeMm}mm radiator support found.`);
            }
        } else if (!cooler.coolerHeightMm) {
            addManual('cooler_clearance', 'Cooler height/radiator size is missing.', 'Verify cooler and case clearance.');
        }
    }

    checkGpuPsu(gpu, psu, { addProblem, addWarning, addManual, addNote }) {
        const connectorCheck = compareConnectorCounts(gpu.gpuPowerConnectors, psu.psuPcieConnectors);
        if (connectorCheck.status === 'fail') {
            addProblem('gpu_power_connectors', connectorCheck.reason, 'PSU must provide the required GPU power connector count.');
        } else if (connectorCheck.status === 'missing_available') {
            addManual('gpu_power_connectors', 'PSU PCIe connector data is missing.', 'Verify the PSU has the GPU power connectors required.');
        } else if (connectorCheck.status === 'unknown' && gpu.tdpW && gpu.tdpW >= 180) {
            addManual('gpu_power_connectors', 'GPU power connector requirement is missing.', 'Verify GPU PCIe power cable requirements.');
        } else {
            addNote('gpu_power_connectors', 'GPU power connector requirement is satisfied by listed PSU connectors.');
        }

        if (psu.wattageW && gpu.tdpW) {
            const pairEstimate = gpu.tdpW + 150;
            if (psu.wattageW < pairEstimate) {
                addProblem('psu_gpu_budget', `${psu.wattageW}W PSU is too low for a GPU drawing about ${gpu.tdpW}W plus system load.`, `Recommended minimum for this pair is at least ${pairEstimate}W.`);
            } else if (psu.wattageW < pairEstimate * 1.25) {
                addWarning('psu_gpu_headroom', 'PSU wattage has limited GPU headroom.', 'A 20-30% headroom target is recommended.');
            }
        }
    }

    checkCpuPsu(cpu, psu, { addWarning, addManual }) {
        if (!psu.wattageW) {
            addManual('psu_wattage', 'PSU wattage is missing.', 'Verify PSU wattage against CPU and GPU requirements.');
        } else if (cpu.tdpW && psu.wattageW < cpu.tdpW + 150) {
            addWarning('psu_cpu_headroom', 'PSU wattage may be low for this CPU once the rest of the system is included.', 'Validate complete build wattage before checkout.');
        }
    }

    checkStorageMotherboard(storage, motherboard, { addProblem, addManual, addNote }) {
        if (!storage.storageInterface && !storage.storageFormFactor) {
            addManual('storage_interface', 'Storage interface is missing.', 'Verify SATA/M.2/NVMe interface support.');
            return;
        }

        const needsM2 = storage.storageInterface === 'NVMe' || storage.storageInterface === 'M.2' || storage.storageFormFactor === 'M.2';
        if (needsM2) {
            if (motherboard.m2Slots === 0) {
                addProblem('storage_m2_slots', 'M.2/NVMe drive selected but motherboard lists no M.2 slots.', 'Choose a motherboard with M.2 support or a SATA drive.');
            } else if (!motherboard.m2Slots) {
                addManual('storage_m2_slots', 'Motherboard M.2 slot count is missing.', 'Verify M.2/NVMe slot availability.');
            } else {
                addNote('storage_m2_slots', 'Motherboard lists M.2 slot support.');
            }
        }

        if (storage.storageInterface === 'SATA' || storage.storageFormFactor === '2.5' || storage.storageFormFactor === '3.5') {
            if (motherboard.sataPorts === 0) {
                addProblem('storage_sata_ports', 'SATA drive selected but motherboard lists no SATA ports.', 'Choose a motherboard with SATA support or an M.2 drive.');
            } else if (!motherboard.sataPorts) {
                addManual('storage_sata_ports', 'Motherboard SATA port count is missing.', 'Verify SATA port availability.');
            } else {
                addNote('storage_sata_ports', 'Motherboard lists SATA port support.');
            }
        }
    }

    checkStorageCase(storage, pcCase, { addManual, addProblem, addNote }) {
        if (storage.storageFormFactor !== '2.5' && storage.storageFormFactor !== '3.5') return;

        const specificBayCount = storage.storageFormFactor === '2.5'
            ? pcCase.driveBays25
            : pcCase.driveBays35;
        const bayCount = specificBayCount ?? pcCase.driveBays;

        if (bayCount === 0) {
            addProblem('drive_bays', `${storage.storageFormFactor}-inch drive selected but case lists no drive bays.`, 'Choose an M.2 drive or a case with drive bay support.');
        } else if (!bayCount) {
            addManual('drive_bays', 'Case drive bay count is missing.', 'Verify 2.5/3.5-inch drive mounting support.');
        } else {
            addNote('drive_bays', `Case lists ${bayCount} compatible drive bay(s).`);
        }
    }

    checkGpuMotherboard(gpu, motherboard, { addWarning, addManual, addNote }) {
        if (gpu.pcieVersion && motherboard.pcieVersion && gpu.pcieVersion > motherboard.pcieVersion) {
            addWarning('pcie_version', `GPU PCIe ${gpu.pcieVersion} will run at motherboard PCIe ${motherboard.pcieVersion} capability.`, 'This is usually backward-compatible but may reduce peak bandwidth.');
        } else if (!motherboard.pcieVersion) {
            addManual('pcie_slot', 'Motherboard PCIe slot generation is missing.', 'Verify the motherboard has a suitable x16 slot.');
        } else {
            addNote('pcie_slot', 'PCIe compatibility has no deterministic issue.');
        }
    }

    componentsFromBuild(components = {}) {
        if (Array.isArray(components)) {
            return components.filter(Boolean).map((component) => this.normalizeComponent(component));
        }

        return Object.entries(components)
            .filter(([, component]) => component)
            .map(([key, component]) => this.normalizeComponent({
                ...component,
                category: component.category || key
            }));
    }

    analyzeBuild(components = {}) {
        const startedAt = Date.now();
        const normalized = this.componentsFromBuild(components);
        const cacheKey = buildCacheKey('build', normalized.map((component) => ({
            id: component.id,
            name: component.name,
            category: component.category,
            specifications: component.specifications
        })));
        const cached = this.getCached(cacheKey);
        if (cached) return this.withLegacyBuildFields(cached);

        const problems = [];
        const warnings = [];
        const notes = [];
        const manualChecks = [];
        const rulesApplied = [];

        const byCategory = new Map(normalized.map((component) => [component.category, component]));
        const pushFromResult = (result) => {
            problems.push(...result.problems);
            warnings.push(...result.warnings);
            notes.push(...result.notes);
            manualChecks.push(...result.manualChecks);
            rulesApplied.push(...result.rulesApplied);
        };

        for (let i = 0; i < normalized.length; i += 1) {
            for (let j = i + 1; j < normalized.length; j += 1) {
                pushFromResult(this.analyzePair(normalized[i], normalized[j]));
            }
        }

        this.checkRequiredBuildCategories(byCategory, manualChecks, rulesApplied);
        this.checkBuildPower(byCategory, problems, warnings, notes, manualChecks, rulesApplied);

        const result = this.createResult(startedAt, cacheKey, normalized, unique(rulesApplied), problems, warnings, notes, manualChecks);
        const withLegacy = this.withLegacyBuildFields(result);
        this.setCached(cacheKey, withLegacy);
        return withLegacy;
    }

    checkRequiredBuildCategories(byCategory, manualChecks, rulesApplied) {
        for (const category of ['CPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case']) {
            if (!byCategory.has(category)) {
                rulesApplied.push('required_categories');
                manualChecks.push({
                    severity: 'manual_check',
                    rule: 'required_categories',
                    message: `Missing ${category} for complete build validation.`,
                    details: 'Incomplete builds can be saved, but checkout should verify all required categories.'
                });
            }
        }
    }

    checkBuildPower(byCategory, problems, warnings, notes, manualChecks, rulesApplied) {
        const psu = byCategory.get('PSU');
        const cpu = byCategory.get('CPU');
        const gpu = byCategory.get('GPU');
        const storage = byCategory.get('Storage');
        const cooling = byCategory.get('Cooling');
        const ram = byCategory.get('RAM');
        const estimatedWattage = (cpu?.tdpW || 65) +
            (gpu?.tdpW || 0) +
            (byCategory.has('Motherboard') ? 50 : 0) +
            (ram ? 10 : 0) +
            (storage ? 10 : 0) +
            (cooling ? 15 : 0) +
            30;
        const recommendedWattage = Math.ceil(estimatedWattage * 1.25 / 50) * 50;

        rulesApplied.push('build_power_budget');
        notes.push({
            severity: 'info',
            rule: 'build_power_budget',
            message: `Estimated wattage is ${estimatedWattage}W; recommended PSU target is ${recommendedWattage}W.`,
            details: 'Estimate uses local component TDP/spec data plus base system allowance.'
        });

        if (!psu) {
            manualChecks.push({
                severity: 'manual_check',
                rule: 'build_power_budget',
                message: 'PSU is missing from build.',
                details: 'Select a PSU before final checkout.'
            });
            return;
        }

        if (!psu.wattageW) {
            manualChecks.push({
                severity: 'manual_check',
                rule: 'build_power_budget',
                message: 'PSU wattage is missing.',
                details: 'Verify PSU wattage manually.'
            });
            return;
        }

        if (psu.wattageW < estimatedWattage) {
            problems.push({
                severity: 'critical',
                rule: 'build_power_budget',
                message: `${psu.wattageW}W PSU cannot cover estimated ${estimatedWattage}W load.`,
                details: `Use at least ${recommendedWattage}W for this build.`
            });
        } else if (psu.wattageW < recommendedWattage) {
            warnings.push({
                severity: 'warning',
                rule: 'build_power_headroom',
                message: `${psu.wattageW}W PSU has limited headroom for estimated ${estimatedWattage}W load.`,
                details: `Recommended target is ${recommendedWattage}W.`,
                penalty: 15
            });
        }
    }

    withLegacyBuildFields(result) {
        const criticalIssues = result.problems.map((issue) => ({
            ...issue,
            issue: issue.message
        }));
        const warnings = result.warnings.map((warning) => ({
            ...warning,
            issue: warning.message
        }));

        return {
            ...result,
            engine: 'deterministic',
            aiEnabled: false,
            status: result.verdict,
            missingSpecs: result.missingSpecs || result.manualChecks,
            compatibility_score: result.score,
            overall_status: result.verdict === 'fail'
                ? 'incompatible'
                : result.verdict === 'pass'
                    ? 'compatible'
                    : result.verdict,
            overall_compatible: result.compatible,
            criticalIssues,
            warnings,
            notes: result.notes,
            all_issues: criticalIssues,
            all_warnings: warnings,
            all_notes: result.notes,
            manual_checks: result.manualChecks,
            powerAnalysis: {
                estimated_wattage: result.notes.find((note) => note.rule === 'build_power_budget')?.message || null
            }
        };
    }

    analyzeCandidateAgainstContext(contextParts = [], candidateProduct = {}) {
        const normalizedContext = Array.isArray(contextParts)
            ? contextParts.filter(Boolean).map((part) => this.normalizeComponent(part))
            : Object.values(contextParts || {}).filter(Boolean).map((part) => this.normalizeComponent(part));
        return this.analyzeCandidateAgainstNormalizedContext(normalizedContext, candidateProduct);
    }

    analyzeCandidateAgainstNormalizedContext(normalizedContext = [], candidateProduct = {}, contextFingerprint = null) {
        const startedAt = Date.now();
        const candidate = this.normalizeComponent(candidateProduct);
        const components = [
            ...normalizedContext.filter((part) => String(part.id) !== String(candidate.id)),
            candidate
        ];
        const cacheKey = buildCacheKey('candidate-context', {
            context: contextFingerprint || normalizedContext.map((component) => ({
                id: component.id,
                name: component.name,
                category: component.category,
                specifications: component.specifications
            })),
            candidate: {
                id: candidate.id,
                name: candidate.name,
                category: candidate.category,
                specifications: candidate.specifications
            }
        });
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const problems = [];
        const warnings = [];
        const notes = [];
        const manualChecks = [];
        const rulesApplied = [];
        const byCategory = new Map(components.map((component) => [component.category, component]));
        const pushFromResult = (result) => {
            problems.push(...result.problems);
            warnings.push(...result.warnings);
            notes.push(...result.notes);
            manualChecks.push(...result.manualChecks);
            rulesApplied.push(...result.rulesApplied);
        };

        const relevantCategories = RELEVANT_CONTEXT_CATEGORIES[candidate.category] || null;
        for (const contextPart of normalizedContext) {
            if (String(contextPart.id) === String(candidate.id)) continue;
            if (relevantCategories && !relevantCategories.has(contextPart.category)) continue;
            pushFromResult(this.analyzePair(contextPart, candidate));
        }

        this.checkRequiredBuildCategories(byCategory, manualChecks, rulesApplied);
        this.checkBuildPower(byCategory, problems, warnings, notes, manualChecks, rulesApplied);

        const result = this.createResult(startedAt, cacheKey, components, unique(rulesApplied), problems, warnings, notes, manualChecks);
        this.setCached(cacheKey, result);
        return result;
    }

    rankCandidates(referenceProduct, candidateProducts = [], options = {}) {
        const buildParts = Array.isArray(options.buildParts) ? options.buildParts.filter(Boolean) : [];
        const reference = this.normalizeComponent(referenceProduct || {});

        return candidateProducts.map((candidate) => {
            const normalizedCandidate = this.normalizeComponent(candidate);
            const contextParts = buildParts
                .filter((part) => String(part.id) !== String(normalizedCandidate.id))
                .filter((part) => normalizeCategory(part.category) !== normalizedCandidate.category)
                .map((part) => ({ ...part, category: part.category }));
            const result = contextParts.length > 0
                ? this.analyzeCandidateAgainstContext(contextParts, normalizedCandidate)
                : this.analyzePair(reference, normalizedCandidate);

            return this.toLegacyProduct(candidate, result);
        }).sort((left, right) => {
            if (left.compatible !== right.compatible) return left.compatible ? -1 : 1;
            return (right.compatibility_score || 0) - (left.compatibility_score || 0);
        });
    }

    analyzeBatch(contextParts = [], candidates = [], options = {}) {
        const normalizedContext = Array.isArray(contextParts)
            ? contextParts.filter(Boolean).map((part) => this.normalizeComponent(part))
            : Object.values(contextParts || {}).filter(Boolean).map((part) => this.normalizeComponent(part));

        if (normalizedContext.length === 0) {
            const reference = options.referenceProduct || {};
            return this.rankCandidates(reference, candidates, options);
        }

        const contextFingerprint = buildCacheKey('context', normalizedContext.map((component) => ({
            id: component.id,
            name: component.name,
            category: component.category,
            specifications: component.specifications
        })));

        return candidates.map((candidate) => {
            const result = this.analyzeCandidateAgainstNormalizedContext(normalizedContext, candidate, contextFingerprint);
            return this.toLegacyProduct(candidate, result);
        }).sort((left, right) => {
            if (left.compatible !== right.compatible) return left.compatible ? -1 : 1;
            return (right.compatibility_score || 0) - (left.compatibility_score || 0);
        });
    }

    toLegacyProduct(product, result) {
        const firstProblem = result.problems[0]?.message;
        const firstWarning = result.warnings[0]?.message;
        const firstManual = result.manualChecks[0]?.message;
        const firstNote = result.notes[0]?.message;
        const status = !result.compatible
            ? 'incompatible'
            : result.verdict === 'pass' && result.score >= 90
                ? 'excellent'
                : result.verdict === 'pass'
                    ? 'good'
                    : result.verdict;

        return {
            ...product,
            compatible: result.compatible,
            source: 'deterministic',
            engine: 'deterministic',
            aiEnabled: false,
            status,
            score: result.score,
            compatibility_score: result.score,
            compatibility_status: status,
            compatibility_notes: [
                ...result.problems,
                ...result.warnings,
                ...result.manualChecks,
                ...result.notes
            ],
            compatibility_reason: firstProblem || firstWarning || firstManual || firstNote || 'Deterministic compatibility check completed.',
            compatibility_issues: result.problems,
            deterministic_issues: result.problems,
            warnings: result.warnings,
            manualChecks: result.manualChecks,
            missingSpecs: result.missingSpecs || result.manualChecks,
            rulesApplied: result.rulesApplied,
            verdict: result.verdict,
            latencyMs: result.latencyMs,
            cache: result.cache,
            detailed_analysis: {
                source: 'deterministic',
                physical_clearance: !result.problems.some((problem) => /length|height|radiator|form_factor/.test(problem.rule)),
                socket_match: !result.problems.some((problem) => /socket/.test(problem.rule)),
                power_adequate: !result.problems.some((problem) => /psu|power/.test(problem.rule))
            }
        };
    }
}

const deterministicCompatibilityService = new DeterministicCompatibilityService();

module.exports = {
    DeterministicCompatibilityService,
    deterministicCompatibilityService
};
