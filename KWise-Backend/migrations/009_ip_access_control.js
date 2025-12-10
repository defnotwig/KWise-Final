/**
 * =====================================================
 * MIGRATION: IP Access Control System
 * =====================================================
 * Version: 009
 * Purpose: Initialize IP-based access control and logging
 * Author: K-Wise Security Team
 * Date: November 18, 2025
 * =====================================================
 */

const fs = require('fs');
const path = require('path');

module.exports = {
    up: async (pool) => {
        console.log('🔒 Running migration 009: IP Access Control System...');

        try {
            // Read and execute SQL file
            const sqlPath = path.join(__dirname, '../sql/ip-access-control-schema.sql');
            const sql = fs.readFileSync(sqlPath, 'utf8');

            await pool.query(sql);

            console.log('✅ Migration 009 completed successfully');
            console.log('  → ip_access_control table created');
            console.log('  → ip_logs table created');
            console.log('  → Triggers and functions installed');
            console.log('  → Default localhost entries added');

            return { success: true, message: 'IP Access Control system initialized' };
        } catch (error) {
            console.error('❌ Migration 009 failed:', error.message);
            throw error;
        }
    },

    down: async (pool) => {
        console.log('🔄 Rolling back migration 009: IP Access Control System...');

        try {
            await pool.query(`
                DROP TABLE IF EXISTS ip_logs CASCADE;
                DROP TABLE IF EXISTS ip_access_control CASCADE;
                DROP TYPE IF EXISTS ip_status_enum CASCADE;
                DROP FUNCTION IF EXISTS update_ip_access_control_timestamp() CASCADE;
                DROP FUNCTION IF EXISTS auto_block_suspicious_ip() CASCADE;
                DROP FUNCTION IF EXISTS cleanup_old_ip_logs() CASCADE;
            `);

            console.log('✅ Migration 009 rolled back successfully');
            return { success: true, message: 'IP Access Control system removed' };
        } catch (error) {
            console.error('❌ Rollback failed:', error.message);
            throw error;
        }
    }
};
