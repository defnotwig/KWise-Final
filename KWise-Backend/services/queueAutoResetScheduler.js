/**
 * ⏰ QUEUE AUTO-RESET SCHEDULER SERVICE
 * 
 * Automatically resets queue numbers 1-99 at exactly 12:00 AM (00:00:00)
 * Timezone: Asia/Manila (GMT+8)
 * 
 * DUAL STRATEGY:
 * 1. Cron Job: Scheduled task runs at midnight
 * 2. Lazy Check: Auto-check on first queue request after midnight
 * 
 * This ensures queue reset even if cron fails or server restarts
 */

const cron = require('node-cron');
const { query } = require('../config/db');
const logger = require('../utils/logger');

class QueueAutoResetScheduler {
    constructor() {
        this.cronJob = null;
        this.isRunning = false;
        this.lastResetDate = null;
    }

    /**
     * Start the auto-reset scheduler
     * Cron expression: '0 0 * * *' = Every day at 00:00:00 (midnight)
     * Timezone: Asia/Manila (GMT+8)
     */
    start() {
        if (this.isRunning) {
            logger.warn('⚠️ Queue auto-reset scheduler is already running');
            return;
        }

        try {
            // Schedule cron job for midnight (00:00:00) Asia/Manila time
            this.cronJob = cron.schedule(
                '0 0 * * *', // Every day at 00:00:00
                async () => {
                    await this.performAutoReset();
                },
                {
                    scheduled: true,
                    timezone: 'Asia/Manila' // GMT+8
                }
            );

            this.isRunning = true;
            
            // Get next scheduled time
            const nextRun = this.getNextMidnight();
            
            logger.info('⏰ Queue Auto-Reset Scheduler STARTED');
            logger.info('📅 Timezone: Asia/Manila (GMT+8)');
            logger.info('🕐 Schedule: Every day at 12:00 AM (00:00:00)');
            logger.info(`⏱️ Next auto-reset: ${nextRun.toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
            
            // Log current queue status
            this.logQueueStatus();

        } catch (error) {
            logger.error('❌ Failed to start queue auto-reset scheduler:', error);
            throw error;
        }
    }

    /**
     * Stop the auto-reset scheduler
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.isRunning = false;
            logger.info('🛑 Queue Auto-Reset Scheduler STOPPED');
        }
    }

    /**
     * Perform the auto-reset operation
     * This is called by:
     * 1. Cron job at midnight
     * 2. Manual trigger if needed
     */
    async performAutoReset() {
        try {
            const now = new Date();
            const manilaTime = now.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
            
            logger.info('');
            logger.info('🔄 ═══════════════════════════════════════════════════');
            logger.info('⏰ QUEUE AUTO-RESET TRIGGERED AT MIDNIGHT');
            logger.info(`📅 Manila Time: ${manilaTime}`);
            logger.info('🔄 ═══════════════════════════════════════════════════');
            logger.info('');

            // Call database function to check and apply auto-reset
            const result = await query(`SELECT check_and_apply_auto_reset() as reset_applied`);
            const resetApplied = result.rows[0].reset_applied;

            if (resetApplied) {
                // Get new queue status
                const statusResult = await query(`SELECT * FROM get_queue_availability()`);
                const status = statusResult.rows[0];

                logger.info('✅ AUTO-RESET COMPLETED SUCCESSFULLY');
                logger.info(`📊 Current Cycle: #${status.current_cycle}`);
                logger.info(`🔢 Available Queues: ${status.available_queues}/99`);
                logger.info(`📅 Last Reset: ${status.last_reset_date}`);
                logger.info(`⏱️ Next Auto-Reset: ${status.next_auto_reset_at}`);
                
                // Update last reset date
                this.lastResetDate = new Date();

                // Broadcast reset notification (if WebSocket implemented)
                await this.broadcastResetNotification(status);
                
            } else {
                logger.info('ℹ️ Auto-reset check performed but no reset needed');
                logger.info('   (Cycle was already reset today)');
            }

            logger.info('');
            logger.info('🔄 ═══════════════════════════════════════════════════');
            logger.info('');

        } catch (error) {
            logger.error('❌ ERROR during auto-reset:', error);
            logger.error('   Queue system may require manual intervention');
            
            // Log error to database for admin notification
            try {
                await query(
                    `INSERT INTO audit_logs (user_id, action, description, ip_address, metadata)
                     VALUES (NULL, 'QUEUE_AUTO_RESET_ERROR', $1, 'system', $2)`,
                    [
                        `Auto-reset failed at midnight: ${error.message}`,
                        JSON.stringify({ error: error.stack })
                    ]
                );
            } catch (logError) {
                logger.error('❌ Failed to log auto-reset error:', logError);
            }
        }
    }

    /**
     * Check if auto-reset is needed (called on queue requests)
     * This provides lazy checking in case cron job fails
     */
    async checkAndApplyAutoReset() {
        try {
            const result = await query(`SELECT check_and_apply_auto_reset() as reset_applied`);
            return result.rows[0].reset_applied;
        } catch (error) {
            logger.error('❌ Error checking auto-reset:', error);
            return false;
        }
    }

    /**
     * Get next midnight timestamp (Asia/Manila)
     */
    getNextMidnight() {
        const now = new Date();
        const manilaDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        
        // Set to next midnight
        const nextMidnight = new Date(manilaDate);
        nextMidnight.setHours(24, 0, 0, 0);
        
        return nextMidnight;
    }

    /**
     * Get time until next midnight (in hours)
     */
    async getTimeUntilReset() {
        try {
            const result = await query(`
                SELECT hours_until_reset 
                FROM get_queue_availability()
            `);
            return result.rows[0].hours_until_reset;
        } catch (error) {
            logger.error('❌ Error getting time until reset:', error);
            return null;
        }
    }

    /**
     * Log current queue status
     */
    async logQueueStatus() {
        try {
            const result = await query(`SELECT * FROM get_queue_availability()`);
            const status = result.rows[0];

            logger.info('');
            logger.info('📊 CURRENT QUEUE STATUS:');
            logger.info(`   Cycle: #${status.current_cycle}`);
            logger.info(`   Available: ${status.available_queues}/99`);
            logger.info(`   Used: ${status.used_queues}/99`);
            logger.info(`   Last Reset: ${status.last_reset_date}`);
            logger.info(`   Hours Until Reset: ${status.hours_until_reset}h`);
            logger.info(`   Needs Manual Reset: ${status.needs_reset ? 'YES ⚠️' : 'NO'}`);
            logger.info('');
        } catch (error) {
            logger.error('❌ Error logging queue status:', error);
        }
    }

    /**
     * Broadcast reset notification to all connected clients
     * (Implement WebSocket broadcasting if needed)
     */
    async broadcastResetNotification(status) {
        // TODO: Implement WebSocket broadcasting if real-time updates needed
        // For now, just log
        logger.info('📢 Broadcasting reset notification to clients...');
        
        // Example WebSocket implementation:
        // if (global.io) {
        //     global.io.emit('queue:reset', {
        //         cycle: status.current_cycle,
        //         availableQueues: status.available_queues,
        //         resetType: 'auto',
        //         timestamp: new Date().toISOString()
        //     });
        // }
    }

    /**
     * Get scheduler status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastResetDate: this.lastResetDate,
            nextResetTime: this.getNextMidnight(),
            timezone: 'Asia/Manila (GMT+8)',
            cronSchedule: '0 0 * * * (Every day at 00:00:00)'
        };
    }

    /**
     * Manual trigger for testing purposes
     * USE WITH CAUTION: This should only be used for testing
     */
    async manualTrigger() {
        logger.warn('⚠️ MANUAL TRIGGER: Auto-reset being triggered manually (for testing)');
        await this.performAutoReset();
    }
}

// Export singleton instance
const queueAutoResetScheduler = new QueueAutoResetScheduler();

module.exports = queueAutoResetScheduler;
