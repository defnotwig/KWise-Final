/**
 * Training Routes
 * API endpoints for AI model training, fine-tuning, and dataset generation
 * Admin-only access with rate limiting for resource-intensive operations
 */

const express = require('express');
const router = express.Router();
const path = require('node:path');
const { protect, restrictTo } = require('../../middleware/auth');
const logger = require('../../utils/logger');
const DatasetGenerator = require('../training/datasetGenerator');
const FineTuningManager = require('../training/fineTuningManager');

// Rate limiters
const rateLimit = require('express-rate-limit');

// Training operations are expensive - limit to 10 requests per hour
const trainingRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Too many training requests. Please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Status checks can be more frequent
const statusRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    message: 'Too many status check requests.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

/**
 * @route   POST /api/ai/training/generate-dataset
 * @desc    Generate training dataset from existing database
 * @access  Admin only
 * @rateLimit 10 requests per hour
 */
router.post(
  '/generate-dataset',
  protect,
  restrictTo('superadmin', 'admin'),
  trainingRateLimit,
  async (req, res) => {
    try {
      logger.info('Starting dataset generation', {
        userId: req.user.id,
        username: req.user.username
      });

      const generator = new DatasetGenerator();
      const result = await generator.generateCompleteDataset();

      logger.info('Dataset generation completed', {
        userId: req.user.id,
        totalExamples: result.summary.totalExamples,
        outputPath: result.outputPath
      });

      res.status(200).json({
        success: true,
        message: 'Training dataset generated successfully',
        data: {
          totalExamples: result.summary.totalExamples,
          examplesByType: result.summary.byType,
          outputPath: result.outputPath,
          summaryPath: result.summaryPath,
          generatedAt: result.summary.generatedAt
        }
      });
    } catch (error) {
      logger.error('Dataset generation failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to generate training dataset',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/ai/training/fine-tune
 * @desc    Fine-tune the AI model with generated dataset
 * @access  Admin only
 * @rateLimit 10 requests per hour
 */
router.post(
  '/fine-tune',
  protect,
  restrictTo('superadmin', 'admin'),
  trainingRateLimit,
  async (req, res) => {
    try {
      const { datasetPath } = req.body;

      // Default to standard dataset path if not provided
      const defaultDatasetPath = path.join(
        __dirname,
        '..',
        'training',
        'datasets',
        'pc_hardware_training_dataset.jsonl'
      );
      const finalDatasetPath = datasetPath || defaultDatasetPath;

      logger.info('Starting model fine-tuning', {
        userId: req.user.id,
        username: req.user.username,
        datasetPath: finalDatasetPath
      });

      const manager = new FineTuningManager();
      const result = await manager.runFineTuning(finalDatasetPath);

      logger.info('Model fine-tuning completed', {
        userId: req.user.id,
        success: result.success,
        customModel: result.customModel
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Model fine-tuned successfully',
          data: {
            customModel: result.customModel,
            baseModel: result.baseModel,
            datasetPath: finalDatasetPath,
            modelfilePath: result.modelfilePath,
            message: result.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Model fine-tuning failed',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Model fine-tuning failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fine-tune model',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/ai/training/test-model
 * @desc    Test the fine-tuned model with sample prompt
 * @access  Admin only
 * @rateLimit 10 requests per hour
 */
router.post(
  '/test-model',
  protect,
  restrictTo('superadmin', 'admin'),
  trainingRateLimit,
  async (req, res) => {
    try {
      const { testPrompt } = req.body;

      logger.info('Testing fine-tuned model', {
        userId: req.user.id,
        hasCustomPrompt: !!testPrompt
      });

      const manager = new FineTuningManager();
      const result = await manager.testFineTunedModel(testPrompt);

      logger.info('Model test completed', {
        userId: req.user.id,
        success: result.success
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Model tested successfully',
          data: {
            testPrompt: result.testPrompt,
            response: result.response,
            model: result.model
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Model test failed',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Model test failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to test model',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/ai/training/status
 * @desc    Get training environment status
 * @access  Admin only
 * @rateLimit 30 requests per minute
 */
router.get(
  '/status',
  protect,
  restrictTo('superadmin', 'admin', 'developer'),
  statusRateLimit,
  async (req, res) => {
    try {
      const manager = new FineTuningManager();
      const status = await manager.getStatus();

      res.status(200).json({
        success: true,
        message: 'Training environment status retrieved',
        data: status
      });
    } catch (error) {
      logger.error('Failed to get training status', {
        error: error.message,
        stack: error.stack,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get training status',
        error: error.message
      });
    }
  }
);

/**
 * @route   DELETE /api/ai/training/model
 * @desc    Delete custom fine-tuned model
 * @access  Admin only
 * @rateLimit 10 requests per hour
 */
router.delete(
  '/model',
  protect,
  restrictTo('superadmin', 'admin'),
  trainingRateLimit,
  async (req, res) => {
    try {
      logger.info('Deleting custom model', {
        userId: req.user.id,
        username: req.user.username
      });

      const manager = new FineTuningManager();
      const result = await manager.deleteCustomModel();

      logger.info('Custom model deletion completed', {
        userId: req.user.id,
        success: result.success
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Custom model deleted successfully',
          data: {
            model: result.model,
            message: result.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Model deletion failed',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Model deletion failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete model',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/ai/training/dataset-info
 * @desc    Get information about generated datasets
 * @access  Admin only
 * @rateLimit 30 requests per minute
 */
router.get(
  '/dataset-info',
  protect,
  restrictTo('superadmin', 'admin', 'developer'),
  statusRateLimit,
  async (req, res) => {
    try {
      const fs = require('node:fs').promises;
      const summaryPath = path.join(
        __dirname,
        '..',
        'training',
        'datasets',
        'dataset_summary.json'
      );

      // Check if dataset exists
      const fileExists = await fs.access(summaryPath).then(() => true).catch(() => false);

      if (!fileExists) {
        return res.status(404).json({
          success: false,
          message: 'No dataset found. Please generate a dataset first.',
          data: { exists: false }
        });
      }

      // Read summary file
      const summaryContent = await fs.readFile(summaryPath, 'utf-8');
      const summary = JSON.parse(summaryContent);

      res.status(200).json({
        success: true,
        message: 'Dataset information retrieved',
        data: {
          exists: true,
          ...summary
        }
      });
    } catch (error) {
      logger.error('Failed to get dataset info', {
        error: error.message,
        stack: error.stack,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get dataset information',
        error: error.message
      });
    }
  }
);

module.exports = router;
