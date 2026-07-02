const { query, closePool } = require('../config/db');

const CATEGORY_CHECKS = [
    {
        name: 'PSU wattage',
        sql: `
            SELECT COUNT(*)::int AS missing
            FROM pc_parts
            WHERE category = 'PSU'
              AND is_active = true
              AND (kiosk_visible IS NULL OR kiosk_visible = true)
              AND COALESCE(specifications->>'wattage', specifications->>'power', specifications->>'capacity', '') = ''
        `
    },
    {
        name: 'GPU power and length',
        sql: `
            SELECT COUNT(*)::int AS missing
            FROM pc_parts
            WHERE category = 'GPU'
              AND is_active = true
              AND (kiosk_visible IS NULL OR kiosk_visible = true)
              AND (
                COALESCE(specifications->>'tdp', specifications->>'power_draw', specifications->>'recommended_psu', '') = ''
                OR COALESCE(dimensions->>'length_mm', specifications->>'length_mm', specifications->>'gpu_length_mm', '') = ''
              )
        `
    },
    {
        name: 'Case clearance and form factor',
        sql: `
            SELECT COUNT(*)::int AS missing
            FROM pc_parts
            WHERE category = 'Case'
              AND is_active = true
              AND (kiosk_visible IS NULL OR kiosk_visible = true)
              AND (
                COALESCE(dimensions->>'max_gpu_length_mm', specifications->>'max_gpu_length_mm', specifications->>'max_gpu_length', '') = ''
                OR COALESCE(dimensions->>'max_cooler_height_mm', specifications->>'max_cooler_height_mm', specifications->>'max_cooler_height', '') = ''
                OR COALESCE(specifications->>'form_factor', specifications->>'supported_form_factors', '') = ''
              )
        `
    },
    {
        name: 'Motherboard socket, memory, and slots',
        sql: `
            SELECT COUNT(*)::int AS missing
            FROM pc_parts
            WHERE category = 'Motherboard'
              AND is_active = true
              AND (kiosk_visible IS NULL OR kiosk_visible = true)
              AND (
                COALESCE(specifications->>'socket', specifications->>'cpu_socket', '') = ''
                OR COALESCE(specifications->>'memory_type', specifications->>'ram_type', '') = ''
                OR COALESCE(specifications->>'form_factor', '') = ''
                OR COALESCE(specifications->>'m2_slots', '') = ''
                OR COALESCE(specifications->>'sata_ports', '') = ''
              )
        `
    },
    {
        name: 'RAM memory type',
        sql: `
            SELECT COUNT(*)::int AS missing
            FROM pc_parts
            WHERE category = 'RAM'
              AND is_active = true
              AND (kiosk_visible IS NULL OR kiosk_visible = true)
              AND COALESCE(specifications->>'memory_type', specifications->>'type', '') = ''
        `
    }
];

async function runAudit() {
    const checks = [];
    for (const check of CATEGORY_CHECKS) {
        const result = await query(check.sql);
        checks.push({ name: check.name, missing: result.rows[0]?.missing || 0 });
    }

    const connectorResult = await query(`
        SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (
                WHERE COALESCE(specifications->>'pcie_connectors', '') <> ''
            )::int AS connector_rows,
            COUNT(*) FILTER (
                WHERE COALESCE(specifications->>'pcie_connectors', '') LIKE '%"sixPin": 0%'
                  AND COALESCE(specifications->>'pcie_connectors', '') LIKE '%"eightPin": 0%'
                  AND COALESCE(specifications->>'pcie_connectors', '') LIKE '%"twelveVhpwr": 0%'
            )::int AS untrusted_zero_connector_rows
        FROM pc_parts
        WHERE category = 'PSU'
          AND is_active = true
          AND (kiosk_visible IS NULL OR kiosk_visible = true)
    `);

    const report = {
        generatedAt: new Date().toISOString(),
        checks,
        psuConnectorData: connectorResult.rows[0] || {},
        warnings: []
    };

    if ((report.psuConnectorData.untrusted_zero_connector_rows || 0) > 0) {
        report.warnings.push('PSU connector counts include zero-value rows; runtime must treat these as manual-check data, not hard failures.');
    }

    console.log(JSON.stringify(report, null, 2));

    const failed = checks.filter((check) => check.missing > 0);
    if (failed.length > 0) {
        process.exitCode = 1;
    }

    return report;
}

if (require.main === module) {
    runAudit()
        .catch((error) => {
            console.error('Compatibility data audit failed:', error);
            process.exitCode = 1;
        })
        .finally(async () => {
            await closePool();
        });
}

module.exports = { runAudit };
