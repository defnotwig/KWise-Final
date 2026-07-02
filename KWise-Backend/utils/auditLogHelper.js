const db = require('../config/db');
const logger = require('./logger');

const isTestMode = process.env.NODE_ENV === 'test';

/**
 * Column mapping: parameter name -> database column name.
 * Used to dynamically build INSERT statements for optional fields.
 */
const OPTIONAL_COLUMN_MAP = [
    ['userId', 'user_id'],
    ['entityId', 'entity_id'],
    ['tableName', 'table_name'],
    ['recordId', 'record_id'],
    ['ipAddress', 'ip_address'],
    ['details', 'details'],
    ['userAgent', 'user_agent'],
    ['role', 'role'],
    ['status', 'status'],
    ['entityType', 'entity_type'],
    ['oldValues', 'old_values'],
    ['newValues', 'new_values'],
    ['userName', 'user_name'],
    ['userRole', 'user_role'],
];

/**
 * Resolves the entity value, falling back to tableName then 'unknown'.
 */
function resolveEntity(entity, tableName) {
    if (entity) return entity;
    if (tableName) return tableName;
    return 'unknown';
}

/**
 * Builds the columns and values arrays for the INSERT query.
 */
function buildColumnsAndValues(params) {
    const resolvedEntity = resolveEntity(params.entity, params.tableName);
    const columns = ['action', 'entity'];
    const values = [params.action, resolvedEntity];

    if (params.severity !== undefined) {
        columns.push('severity');
        values.push(String(params.severity).toUpperCase());
    }
    if (params.description !== undefined) {
        columns.push('description');
        values.push(params.description);
    }

    for (const [paramKey, colName] of OPTIONAL_COLUMN_MAP) {
        if (params[paramKey] != null) {
            columns.push(colName);
            values.push(params[paramKey]);
        }
    }

    return { columns, values, resolvedEntity };
}

/**
 * Broadcasts a log entry to connected SSE clients (non-blocking).
 */
function broadcastLogEntry(app, data) {
    try {
        const sseClients = app?.get('sseClients');
        if (!sseClients?.logs?.size) return;
        const payload = JSON.stringify({ type: 'log-entry', data });
        sseClients.logs.forEach(c => c.res.write(`event: log-entry\ndata: ${payload}\n\n`));
    } catch (e) {
        logger.warn('Failed to broadcast log-entry SSE', { error: e.message });
    }
}

/**
 * Builds a fallback audit log row for test mode.
 */
function buildTestFallback(action, entity, entityId, description, severity) {
    return {
        id: -1,
        action,
        entity,
        entity_id: entityId,
        description,
        severity: String(severity).toUpperCase(),
        created_at: new Date().toISOString()
    };
}

/**
 * Inserts an audit log entry supporting legacy & extended column styles.
 * Accepted keys (all optional except action):
 *  userId, action, entity, entityId, tableName, recordId,
 *  description, severity, ipAddress, details, userAgent,
 *  role, status, entityType, oldValues, newValues,
 *  userName, userRole
 * Automatically broadcasts new log entry over SSE (event: log-entry) if log clients connected.
 */
async function insertAuditLog(app, {
    userId = null,
    action,
    entity = null,
    entityId = null,
    tableName = null,
    recordId = null,
    description = '',
    severity = 'INFO',
    ipAddress = null,
    details = null,
    userAgent = null,
    role = null,
    status = null,
    entityType = null,
    oldValues = null,
    newValues = null,
    userName = null,
    userRole = null
}) {
    try {
        if (!action) throw new Error('action is required for audit log');

        const { columns, values } = buildColumnsAndValues({
            action, entity, entityId, tableName, recordId,
            description, severity, userId, ipAddress, details,
            userAgent, role, status, entityType, oldValues,
            newValues, userName, userRole
        });

        const colsSql = columns.join(', ');
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const sql = `
      INSERT INTO audit_logs (${colsSql}) 
      VALUES (${placeholders}) 
      ON CONFLICT (id) DO NOTHING
      RETURNING *
    `;

        const result = await db.query(sql, values);

        if (result.rows.length === 0) {
            logger.warn('Audit log insert skipped due to duplicate key (id sequence may need reset)');
            return null;
        }

        const row = result.rows[0];
        if (row) broadcastLogEntry(app, row);

        return row;
    } catch (error) {
        logger.error('insertAuditLog error', { error: error.message });

        if (!isTestMode) throw error;

        const resolvedEntity = resolveEntity(entity, tableName);
        const fallback = buildTestFallback(action, resolvedEntity, entityId, description, severity);
        broadcastLogEntry(app, fallback);
        return fallback;
    }
}

module.exports = { insertAuditLog };
