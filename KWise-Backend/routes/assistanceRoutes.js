/**
 * Assistance Request Routes
 * Handles kiosk assistance requests with real-time admin notifications
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const logger = require('../utils/logger');

// Create assistance request
router.post('/request', async (req, res) => {
  try {
    const { kiosk_id, request_type = 'assisted_service' } = req.body;

    const result = await query(`
      INSERT INTO assistance_requests (
        kiosk_id,
        request_type,
        status,
        requested_at
      ) VALUES ($1, $2, $3, NOW())
      RETURNING *
    `, [kiosk_id || 'KIOSK-001', request_type, 'pending']);

    const request = result.rows[0];

    // Broadcast to admin via WebSocket
    if (global.io) {
      global.io.emit('assistance:request', {
        id: request.id,
        kiosk_id: request.kiosk_id,
        request_type: request.request_type,
        status: request.status,
        requested_at: request.requested_at
      });
      logger.info(`🔔 Assistance request broadcasted: ${request.id}`);
    }

    logger.info(`✅ Assistance request created: ${request.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Assistance request created',
      data: request
    });

  } catch (error) {
    logger.error('Error creating assistance request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create assistance request',
      error: error.message
    });
  }
});

// Get pending assistance requests (for admin)
router.get('/pending', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM assistance_requests
      WHERE status = 'pending'
      ORDER BY requested_at DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching pending requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending requests',
      error: error.message
    });
  }
});

// Acknowledge assistance request
router.patch('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id, admin_name } = req.body;

    const result = await query(`
      UPDATE assistance_requests
      SET status = 'acknowledged',
          acknowledged_at = NOW(),
          acknowledged_by = $1,
          admin_name = $2
      WHERE id = $3
      RETURNING *
    `, [admin_id, admin_name, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assistance request not found'
      });
    }

    const request = result.rows[0];

    // Broadcast to kiosk via WebSocket
    if (global.io) {
      global.io.emit('assistance:acknowledged', {
        id: request.id,
        kiosk_id: request.kiosk_id,
        status: request.status,
        admin_name: request.admin_name
      });
      logger.info(`✅ Assistance acknowledged broadcasted: ${request.id}`);
    }

    res.json({
      success: true,
      message: 'Assistance request acknowledged',
      data: request
    });

  } catch (error) {
    logger.error('Error acknowledging assistance request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge assistance request',
      error: error.message
    });
  }
});

// Complete assistance request
router.patch('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      UPDATE assistance_requests
      SET status = 'completed',
          completed_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assistance request not found'
      });
    }

    res.json({
      success: true,
      message: 'Assistance request completed',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error completing assistance request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete assistance request',
      error: error.message
    });
  }
});

// Get assistance request status (for kiosk)
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT * FROM assistance_requests
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assistance request not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error fetching assistance status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assistance status',
      error: error.message
    });
  }
});

module.exports = router;
