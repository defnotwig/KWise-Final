const { query } = require('../config/db');
const logger = require('./logger');

/**
 * Fetch aggregated user statistics.
 * Returns shape: { totals: { all, active, inactive }, roles: { superadmin, admin, developer }, recent: [...], timestamp }
 */
async function getUserStats(limitRecent = 5) {
  try {
    const [totalUsers, activeUsers, inactiveUsers, rolesBreakdown, recentUsers] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query("SELECT COUNT(*) as count FROM users WHERE last_active_at >= NOW() - INTERVAL '5 minutes' AND is_active = true"),
      query("SELECT COUNT(*) as count FROM users WHERE is_active = false"),
      query(`SELECT role, COUNT(*) as count FROM users GROUP BY role`),
      query(`SELECT id, name, email, role, last_login FROM users ORDER BY last_login DESC NULLS LAST LIMIT $1`, [limitRecent])
    ]);

    const roles = { superadmin: 0, admin: 0, developer: 0 };
    rolesBreakdown.rows.forEach(r => { if (roles[r.role] !== undefined) roles[r.role] = Number.parseInt(r.count, 10); });

    return {
      totals: {
        all: Number.parseInt(totalUsers.rows[0]?.count || 0, 10),
        active: Number.parseInt(activeUsers.rows[0]?.count || 0, 10),
        inactive: Number.parseInt(inactiveUsers.rows[0]?.count || 0, 10)
      },
      roles,
      recent: recentUsers.rows,
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    logger.error('statsHelper.getUserStats error', e);
    throw e;
  }
}

/**
 * Fetch log statistics summary.
 * Returns shape: { counts: { total, error, warning, info }, recentActions: [...], timestamp }
 */
async function getLogStats(limitRecent = 10) {
  try {
    const [total, errors, warnings, info, recent] = await Promise.all([
      query('SELECT COUNT(*) as count FROM audit_logs'),
      query("SELECT COUNT(*) as count FROM audit_logs WHERE severity = 'error'"),
      query("SELECT COUNT(*) as count FROM audit_logs WHERE severity = 'warning'"),
      query("SELECT COUNT(*) as count FROM audit_logs WHERE severity = 'info'"),
      query(`SELECT al.action, al.description, al.created_at, u.name as user_name, u.role as user_role
             FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id
             ORDER BY al.created_at DESC LIMIT $1`, [limitRecent])
    ]);

    return {
      counts: {
        total: Number.parseInt(total.rows[0]?.count || 0, 10),
        error: Number.parseInt(errors.rows[0]?.count || 0, 10),
        warning: Number.parseInt(warnings.rows[0]?.count || 0, 10),
        info: Number.parseInt(info.rows[0]?.count || 0, 10)
      },
      recentActions: recent.rows,
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    logger.error('statsHelper.getLogStats error', e);
    throw e;
  }
}

/**
 * Fetch order statistics.
 * Returns shape: { total, pending, processing, completed, cancelled, timestamp }
 */
async function getOrderStats() {
  try {
    const [total, pending, processing, completed, cancelled] = await Promise.all([
      query('SELECT COUNT(*) as count FROM orders'),
      query("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'"),
      query("SELECT COUNT(*) as count FROM orders WHERE status = 'processing'"),
      query("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'"),
      query("SELECT COUNT(*) as count FROM orders WHERE status = 'cancelled'")
    ]);
    return {
      total: Number.parseInt(total.rows[0]?.count || 0, 10),
      pending: Number.parseInt(pending.rows[0]?.count || 0, 10),
      processing: Number.parseInt(processing.rows[0]?.count || 0, 10),
      completed: Number.parseInt(completed.rows[0]?.count || 0, 10),
      cancelled: Number.parseInt(cancelled.rows[0]?.count || 0, 10),
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    logger.error('statsHelper.getOrderStats error', e);
    throw e;
  }
}

module.exports = { getUserStats, getLogStats, getOrderStats };
