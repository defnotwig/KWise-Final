const db = require('../config/db');
const logger = require('../utils/logger');
const { deterministicCompatibilityService } = require('./deterministicCompatibilityService');

const COMPATIBILITY_CATEGORIES = new Set([
    'CPU',
    'Motherboard',
    'RAM',
    'GPU',
    'PSU',
    'Case',
    'Cooling',
    'Storage'
]);

const REQUIRED_SPECS = {
    CPU: ['socket'],
    Motherboard: ['socket', 'memory_type', 'form_factor'],
    RAM: ['memory_type', 'capacity_gb'],
    GPU: ['length_mm', 'tdp_w'],
    PSU: ['wattage_w'],
    Case: ['supported_form_factors', 'max_gpu_length_mm'],
    Cooling: ['socket_support'],
    Storage: ['interface', 'form_factor']
};
const LEGACY_SPEC_KEYS_TO_REMOVE = new Set([
    'M2 Slots',
    'Ram Slots',
    'PCIE Slots',
    'Power Connectors',
    'Length',
    'Form Factor',
    'Max Cpu Cooler Height',
    'max_cpu_cooler_height',
    'power_connector_required'
]);

function parseJsonish(value) {
    if (!value) return {};
    if (typeof value === 'object') return Array.isArray(value) ? {} : value;
    if (typeof value !== 'string') return {};

    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function hasMeaningfulValue(value) {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
}

function setIfPresent(target, key, value) {
    if (hasMeaningfulValue(value)) {
        target[key] = value;
    }
}

function normalizeCategory(category) {
    const text = String(category || '').trim().toLowerCase();
    const aliases = {
        cpu: 'CPU',
        processor: 'CPU',
        motherboard: 'Motherboard',
        mainboard: 'Motherboard',
        ram: 'RAM',
        memory: 'RAM',
        gpu: 'GPU',
        graphics: 'GPU',
        'graphics card': 'GPU',
        psu: 'PSU',
        'power supply': 'PSU',
        case: 'Case',
        chassis: 'Case',
        cooling: 'Cooling',
        cooler: 'Cooling',
        'cpu cooler': 'Cooling',
        storage: 'Storage',
        ssd: 'Storage',
        hdd: 'Storage'
    };

    return aliases[text] || category;
}

function getMissingSpecs(category, specs) {
    const required = REQUIRED_SPECS[category] || [];
    return required.filter((key) => !hasMeaningfulValue(specs[key]));
}

function toKeyValueString(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function toNumericValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const match = String(value || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number.parseFloat(match[0]) : null;
}

function inferUnit(key) {
    if (key.endsWith('_mm')) return 'mm';
    if (key.endsWith('_w')) return 'W';
    if (key.endsWith('_mhz')) return 'MHz';
    if (key.endsWith('_gb')) return 'GB';
    return null;
}

function buildCanonicalSpecs(product = {}) {
    const category = normalizeCategory(product.category);
    const rawSpecs = parseJsonish(product.specifications);
    const normalized = deterministicCompatibilityService.normalizeComponent({
        ...product,
        category,
        specifications: rawSpecs
    });
    const specs = { ...rawSpecs };

    if (category === 'CPU') {
        setIfPresent(specs, 'socket', normalized.socket);
        setIfPresent(specs, 'chipset', normalized.chipset);
        setIfPresent(specs, 'memory_type', normalized.memoryType);
        setIfPresent(specs, 'tdp_w', normalized.tdpW);
    } else if (category === 'Motherboard') {
        setIfPresent(specs, 'socket', normalized.socket);
        setIfPresent(specs, 'chipset', normalized.chipset);
        setIfPresent(specs, 'memory_type', normalized.memoryType);
        setIfPresent(specs, 'memory_slots', normalized.memorySlots);
        setIfPresent(specs, 'max_memory_gb', normalized.maxMemoryGb);
        setIfPresent(specs, 'speed_mhz', normalized.memorySpeedMhz);
        setIfPresent(specs, 'form_factor', normalized.formFactor);
        setIfPresent(specs, 'm2_slots', normalized.m2Slots);
        setIfPresent(specs, 'sata_ports', normalized.sataPorts);
        setIfPresent(specs, 'pcie_version', normalized.pcieVersion);
    } else if (category === 'RAM') {
        setIfPresent(specs, 'memory_type', normalized.memoryType);
        setIfPresent(specs, 'capacity_gb', normalized.capacityGb);
        setIfPresent(specs, 'stick_count', normalized.stickCount);
        setIfPresent(specs, 'speed_mhz', normalized.memorySpeedMhz);
        setIfPresent(specs, 'ram_height_mm', normalized.ramHeightMm);
    } else if (category === 'GPU') {
        setIfPresent(specs, 'tdp_w', normalized.tdpW);
        setIfPresent(specs, 'length_mm', normalized.lengthMm);
        setIfPresent(specs, 'pcie_version', normalized.pcieVersion);
        setIfPresent(specs, 'slots_required', normalized.slotsRequired);
        setIfPresent(specs, 'power_connectors', normalized.gpuPowerConnectors);
    } else if (category === 'PSU') {
        setIfPresent(specs, 'wattage_w', normalized.wattageW);
        setIfPresent(specs, 'form_factor', normalized.formFactor);
        setIfPresent(specs, 'pcie_connectors', normalized.psuPcieConnectors);
    } else if (category === 'Case') {
        setIfPresent(specs, 'supported_form_factors', normalized.supportedFormFactors);
        setIfPresent(specs, 'max_gpu_length_mm', normalized.maxGpuLengthMm);
        setIfPresent(specs, 'max_cooler_height_mm', normalized.maxCoolerHeightMm);
        setIfPresent(specs, 'supported_radiators_mm', normalized.supportedRadiators);
        setIfPresent(specs, 'drive_bays', normalized.driveBays);
        setIfPresent(specs, 'drive_bays_25', normalized.driveBays25);
        setIfPresent(specs, 'drive_bays_35', normalized.driveBays35);
    } else if (category === 'Cooling') {
        setIfPresent(specs, 'height_mm', normalized.coolerHeightMm);
        setIfPresent(specs, 'radiator_size_mm', normalized.radiatorSizeMm);
        setIfPresent(specs, 'socket_support', normalized.socketSupport);
        setIfPresent(specs, 'tdp_rating_w', normalized.coolerTdpW);
        setIfPresent(specs, 'ram_clearance_mm', normalized.ramClearanceMm);
    } else if (category === 'Storage') {
        setIfPresent(specs, 'interface', normalized.storageInterface);
        setIfPresent(specs, 'form_factor', normalized.formFactor);
        setIfPresent(specs, 'storage_form_factor', normalized.storageFormFactor);
        setIfPresent(specs, 'capacity_gb', normalized.capacityGb);
    }

    for (const key of LEGACY_SPEC_KEYS_TO_REMOVE) {
        delete specs[key];
    }

    const missingSpecs = getMissingSpecs(category, specs);
    const warnings = missingSpecs.map((specKey) => ({
        severity: 'warning',
        code: 'MISSING_COMPATIBILITY_SPEC',
        field: specKey,
        message: `${category} is missing ${specKey}; compatibility will require manual verification.`
    }));

    return {
        category,
        specs,
        warnings,
        missingSpecs
    };
}

async function getProductSpecsColumns() {
    try {
        const result = await db.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'product_specs'
        `);
        return new Set(result.rows.map((row) => row.column_name));
    } catch (error) {
        logger.debug('[CompatibilitySpecs] product_specs column lookup skipped:', error.message);
        return new Set();
    }
}

async function upsertJsonNormalizedSpecs(product, normalizedPayload, columns) {
    const updates = ['normalized_specs = $2::jsonb'];
    const values = [product.id, JSON.stringify(normalizedPayload)];
    let index = 3;

    if (columns.has('category')) {
        updates.push(`category = $${index}`);
        values.push(product.category);
        index += 1;
    }
    if (columns.has('updated_at')) {
        updates.push('updated_at = NOW()');
    }

    const updateResult = await db.query(`
        UPDATE product_specs
        SET ${updates.join(', ')}
        WHERE product_id = $1
    `, values);

    if (updateResult.rowCount > 0) return;

    const insertColumns = ['product_id', 'normalized_specs'];
    const insertValues = ['$1', '$2::jsonb'];
    const insertParams = [product.id, JSON.stringify(normalizedPayload)];
    let insertIndex = 3;

    if (columns.has('category')) {
        insertColumns.push('category');
        insertValues.push(`$${insertIndex}`);
        insertParams.push(product.category);
        insertIndex += 1;
    }
    if (columns.has('created_at')) {
        insertColumns.push('created_at');
        insertValues.push('NOW()');
    }
    if (columns.has('updated_at')) {
        insertColumns.push('updated_at');
        insertValues.push('NOW()');
    }

    await db.query(`
        INSERT INTO product_specs (${insertColumns.join(', ')})
        VALUES (${insertValues.join(', ')})
    `, insertParams);
}

async function replaceKeyValueSpecs(productId, specs) {
    await db.query('DELETE FROM product_specs WHERE product_id = $1', [productId]);

    for (const [key, value] of Object.entries(specs)) {
        if (!hasMeaningfulValue(value)) continue;
        await db.query(`
            INSERT INTO product_specs (
                product_id, spec_key, spec_value, spec_value_num, spec_unit, is_inferred, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW())
        `, [productId, key, toKeyValueString(value), toNumericValue(value), inferUnit(key)]);
    }
}

async function storeNormalizedSpecs(product, canonical) {
    const columns = await getProductSpecsColumns();
    if (!columns.size || !columns.has('product_id')) return false;

    const normalizedPayload = {
        source: 'offline_deterministic',
        generated_at: new Date().toISOString(),
        id: product.id,
        name: product.name,
        category: canonical.category,
        brand: product.brand || null,
        price: product.price || null,
        stock: product.stock || null,
        specs: canonical.specs,
        missingSpecs: canonical.missingSpecs,
        warnings: canonical.warnings
    };

    if (columns.has('normalized_specs')) {
        await upsertJsonNormalizedSpecs(
            { ...product, category: canonical.category },
            normalizedPayload,
            columns
        );
        return true;
    }

    if (columns.has('spec_key') && columns.has('spec_value')) {
        await replaceKeyValueSpecs(product.id, canonical.specs);
        return true;
    }

    return false;
}

async function invalidateCompatibilityCaches(productId) {
    deterministicCompatibilityService.invalidateCache();

    try {
        await db.query('DELETE FROM compatibility_cache');
    } catch (error) {
        logger.debug('[CompatibilitySpecs] compatibility_cache invalidation skipped:', error.message);
    }

    try {
        await db.query(`
            DELETE FROM compatibility_matrix
            WHERE component_a_id = $1 OR component_b_id = $1
        `, [productId]);
    } catch (error) {
        logger.debug('[CompatibilitySpecs] compatibility_matrix invalidation skipped:', error.message);
    }
}

async function syncProductCompatibilitySpecs(product = {}) {
    const canonical = buildCanonicalSpecs(product);

    if (!COMPATIBILITY_CATEGORIES.has(canonical.category) || !product.id) {
        return {
            ...canonical,
            stored: false,
            skipped: true
        };
    }

    try {
        const stored = await storeNormalizedSpecs(product, canonical);
        await invalidateCompatibilityCaches(product.id);
        return {
            ...canonical,
            stored,
            skipped: false
        };
    } catch (error) {
        logger.warn('[CompatibilitySpecs] Failed to sync normalized specs:', {
            productId: product.id,
            error: error.message
        });
        return {
            ...canonical,
            stored: false,
            skipped: false,
            error: error.message,
            warnings: [
                ...canonical.warnings,
                {
                    severity: 'warning',
                    code: 'COMPATIBILITY_SPEC_SYNC_FAILED',
                    message: 'Compatibility specs were normalized in pc_parts but product_specs/cache sync failed.'
                }
            ]
        };
    }
}

module.exports = {
    buildCanonicalSpecs,
    syncProductCompatibilitySpecs
};
