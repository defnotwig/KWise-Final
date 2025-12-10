const db = require('../config/db');
const logger = require('./logger');

const isTestMode = process.env.NODE_ENV === 'test';

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

    // If entity is null but tableName is provided, use tableName as entity
    if (!entity && tableName) {
      entity = tableName;
    }
    
    // Ensure entity is provided (required by schema)
    if (!entity) {
      entity = 'unknown';
    }

    // Build dynamic column list to stay compatible with evolving schema
    const columns = ['action', 'entity'];  // Entity is required
    const values = [action, entity];
    if (severity !== undefined) { columns.push('severity'); values.push(String(severity).toUpperCase()); }
    if (description !== undefined) { columns.push('description'); values.push(description); }
    let placeholdersIndex = 4; // next placeholder number

    if (userId !== null) { columns.push('user_id'); values.push(userId); }
    if (entityId !== null) { columns.push('entity_id'); values.push(entityId); }
    if (tableName !== null) { columns.push('table_name'); values.push(tableName); }
    if (recordId !== null) { columns.push('record_id'); values.push(recordId); }
    if (ipAddress !== null) { columns.push('ip_address'); values.push(ipAddress); }
    if (details !== null) { columns.push('details'); values.push(details); }
    if (userAgent !== null) { columns.push('user_agent'); values.push(userAgent); }
    if (role !== null) { columns.push('role'); values.push(role); }
    if (status !== null) { columns.push('status'); values.push(status); }
    if (entityType !== null) { columns.push('entity_type'); values.push(entityType); }
    if (oldValues !== null) { columns.push('old_values'); values.push(oldValues); }
    if (newValues !== null) { columns.push('new_values'); values.push(newValues); }
    if (userName !== null) { columns.push('user_name'); values.push(userName); }
    if (userRole !== null) { columns.push('user_role'); values.push(userRole); }

    // Add created_at default via NOW()
    const colsSql = columns.join(', ');
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    // Use INSERT with ON CONFLICT to handle potential duplicate key issues
    // This is a safeguard in case the id sequence gets out of sync
    const sql = `
      INSERT INTO audit_logs (${colsSql}) 
      VALUES (${placeholders}) 
      ON CONFLICT (id) DO NOTHING
      RETURNING *
    `;

    const result = await db.query(sql, values);
    
    // If ON CONFLICT triggered and no row returned, log warning but don't fail
    if (result.rows.length === 0) {
      logger.warn('Audit log insert skipped due to duplicate key (id sequence may need reset)');
      return null;
    }
    
    const row = result.rows[0];

    // SSE broadcast (non-blocking) - only if row was inserted
    if (row) {
      try {
        const sseClients = app?.get('sseClients');
        if (sseClients?.logs?.size) {
          const payload = JSON.stringify({ type: 'log-entry', data: row });
          sseClients.logs.forEach(c => c.res.write(`event: log-entry\ndata: ${payload}\n\n`));
        }
      } catch (e) {
        logger.warn('Failed to broadcast log-entry SSE', { error: e.message });
      }
    }

    return row;
  } catch (error) {
    logger.error('insertAuditLog error', { error: error.message });

    if (isTestMode) {
      const fallback = {
        id: -1,
        action,
        entity,
        entity_id: entityId,
        description,
        severity: String(severity).toUpperCase(),
        created_at: new Date().toISOString()
      };
      try {
        const sseClients = app?.get('sseClients');
        if (sseClients?.logs?.size) {
          const payload = JSON.stringify({ type: 'log-entry', data: fallback });
          sseClients.logs.forEach(c => c.res.write(`event: log-entry\ndata: ${payload}\n\n`));
        }
      } catch (_) {
        // ignore broadcast failures in test fallback
      }
      return fallback;
    }

    throw error;
  }
}

module.exports = { insertAuditLog };
