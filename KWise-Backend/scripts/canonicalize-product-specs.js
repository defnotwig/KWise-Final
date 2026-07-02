const db = require('../config/db');
const {
    buildCanonicalSpecs,
    syncProductCompatibilitySpecs
} = require('../services/compatibilitySpecService');

const COMPATIBILITY_CATEGORIES = [
    'CPU',
    'Motherboard',
    'RAM',
    'GPU',
    'PSU',
    'Case',
    'Cooling',
    'Storage'
];

function parseArgs(argv) {
    const args = {
        apply: false,
        backup: true,
        category: null,
        limit: null
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--apply') args.apply = true;
        if (arg === '--no-backup') args.backup = false;
        if (arg.startsWith('--category=')) {
            args.category = arg.slice('--category='.length) || null;
        }
        if (arg.startsWith('--limit=')) {
            const limit = Number.parseInt(arg.slice('--limit='.length), 10);
            args.limit = Number.isFinite(limit) && limit > 0 ? limit : null;
        }
        if (arg === '--category') {
            args.category = argv[index + 1] || null;
            index += 1;
        }
        if (arg === '--limit') {
            const limit = Number.parseInt(argv[index + 1], 10);
            args.limit = Number.isFinite(limit) && limit > 0 ? limit : null;
            index += 1;
        }
    }

    return args;
}

function stableStringify(value) {
    if (!value || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

    return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
        .join(',')}}`;
}

function hasSpecChange(before, after) {
    return stableStringify(before || {}) !== stableStringify(after || {});
}

function quoteIdentifier(identifier) {
    return `"${String(identifier).replace(/"/g, '""')}"`;
}

async function loadProducts(args) {
    const params = [];
    const where = [`category = ANY($1)`];
    params.push(COMPATIBILITY_CATEGORIES);

    if (args.category) {
        params.push(args.category);
        where.push(`category = $${params.length}`);
    }

    let limitClause = '';
    if (args.limit) {
        params.push(args.limit);
        limitClause = `LIMIT $${params.length}`;
    }

    const result = await db.query(`
        SELECT id, name, category, brand, price, stock, specifications
        FROM pc_parts
        WHERE ${where.join(' AND ')}
        ORDER BY category, id
        ${limitClause}
    `, params);

    return result.rows;
}

async function createBackup(changedRows) {
    const timestamp = new Date()
        .toISOString()
        .replace(/[-:T.Z]/g, '')
        .slice(0, 14);
    const backupTable = `pc_parts_specs_backup_${timestamp}`;
    const backupIds = changedRows.map((row) => row.id);

    await db.query(`
        CREATE TABLE ${quoteIdentifier(backupTable)} AS
        SELECT id, name, category, specifications, updated_at
        FROM pc_parts
        WHERE id = ANY($1)
    `, [backupIds]);

    return backupTable;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const products = await loadProducts(args);
    const changed = [];
    const missingSpecs = [];

    for (const product of products) {
        const canonical = buildCanonicalSpecs(product);
        if (hasSpecChange(product.specifications, canonical.specs)) {
            changed.push({
                ...product,
                canonical
            });
        }

        if (canonical.missingSpecs.length) {
            missingSpecs.push({
                id: product.id,
                name: product.name,
                category: canonical.category,
                missingSpecs: canonical.missingSpecs
            });
        }
    }

    const summary = {
        mode: args.apply ? 'apply' : 'dry-run',
        scanned: products.length,
        changed: changed.length,
        missingCriticalSpecs: missingSpecs.length,
        category: args.category || 'all',
        limit: args.limit || null
    };

    console.log(JSON.stringify({
        ...summary,
        sampleChanges: changed.slice(0, 20).map((row) => ({
            id: row.id,
            name: row.name,
            category: row.category,
            missingSpecs: row.canonical.missingSpecs
        })),
        sampleMissingSpecs: missingSpecs.slice(0, 20)
    }, null, 2));

    if (!args.apply || changed.length === 0) {
        return;
    }

    await db.query('BEGIN');
    try {
        let backupTable = null;
        if (args.backup) {
            backupTable = await createBackup(changed);
            console.log(`Created backup table: ${backupTable}`);
        }

        for (const row of changed) {
            await db.query(`
                UPDATE pc_parts
                SET specifications = $2::jsonb, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [row.id, JSON.stringify(row.canonical.specs)]);

            await syncProductCompatibilitySpecs({
                ...row,
                specifications: row.canonical.specs
            });
        }

        await db.query('COMMIT');
        console.log(JSON.stringify({
            ...summary,
            backupTable,
            applied: true
        }, null, 2));
    } catch (error) {
        await db.query('ROLLBACK');
        throw error;
    }
}

main()
    .catch((error) => {
        console.error('Failed to canonicalize product specs:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (typeof db.closePool === 'function') {
            await db.closePool();
        } else if (db.pool?.end) {
            await db.pool.end();
        }
        process.exit(process.exitCode || 0);
    });
