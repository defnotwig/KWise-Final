/**
 * PC CUSTOMIZED AI PARAMETERS CONTROLLER
 * 
 * Manages parameters for PC Customized AI builds:
 * - Usage Types (Gaming, Work, Content Creation, etc.)
 * - Budget Ranges (10k-25k, 26k-50k, etc.)
 * - Performance Preferences (Balanced, Performance, Budget)
 * - Gaming Preferences (Competitive FPS, AAA Games, etc.)
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');

class PCCustomizedAIParametersController {
  
  /**
   * Get all parameters (usage types, budget ranges, performance prefs, gaming prefs)
   */
  static async getAllParameters(req, res) {
    try {
      const [usageTypes, budgetRanges, performancePrefs, gamingPrefs] = await Promise.all([
        query('SELECT * FROM pc_customized_usage_types ORDER BY sort_order, id'),
        query('SELECT * FROM pc_customized_budget_ranges ORDER BY sort_order, id'),
        query('SELECT * FROM pc_customized_performance_preferences ORDER BY sort_order, id'),
        query('SELECT * FROM pc_customized_gaming_preferences ORDER BY sort_order, id')
      ]);

      // Calculate expected builds
      const activeUsage = usageTypes.rows.filter(t => t.is_active).length;
      const activeBudget = budgetRanges.rows.filter(t => t.is_active).length;
      const activePerf = performancePrefs.rows.filter(t => t.is_active).length;
      const activeGamingPrefs = gamingPrefs.rows.filter(t => t.is_active).length;
      
      // Count gaming usage types (usually just 1: "gaming")
      const gamingUsageCount = usageTypes.rows.filter(t => t.is_active && t.name === 'gaming').length;
      const nonGamingUsageCount = activeUsage - gamingUsageCount;
      
      // Gaming builds: gaming × budgets × perf × gaming_prefs
      const expectedGamingBuilds = gamingUsageCount * activeBudget * activePerf * activeGamingPrefs;
      
      // Non-gaming builds: non-gaming usage types × budgets × perf
      const expectedNonGamingBuilds = nonGamingUsageCount * activeBudget * activePerf;
      
      // Total expected builds
      const expectedTotalBuilds = expectedGamingBuilds + expectedNonGamingBuilds;

      res.json({
        success: true,
        data: {
          usageTypes: usageTypes.rows,
          budgetRanges: budgetRanges.rows,
          performancePreferences: performancePrefs.rows,
          gamingPreferences: gamingPrefs.rows,
          summary: {
            active_usage_types: activeUsage,
            active_budget_ranges: activeBudget,
            active_performance_preferences: activePerf,
            active_gaming_preferences: activeGamingPrefs,
            expected_gaming_builds: expectedGamingBuilds,
            expected_non_gaming_builds: expectedNonGamingBuilds,
            expected_total_builds: expectedTotalBuilds
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching parameters', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch parameters',
        error: error.message
      });
    }
  }

  /**
   * Usage Types CRUD
   */
  static async createUsageType(req, res) {
    try {
      const { name, display_name } = req.body;
      
      const result = await query(
        'INSERT INTO pc_customized_usage_types (name, display_name) VALUES ($1, $2) RETURNING *',
        [name, display_name]
      );

      logger.info('Created usage type', { name });
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      logger.error('Error creating usage type', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateUsageType(req, res) {
    try {
      const { id } = req.params;
      const { display_name, is_active } = req.body;
      
      const result = await query(
        'UPDATE pc_customized_usage_types SET display_name = $1, is_active = $2 WHERE id = $3 RETURNING *',
        [display_name, is_active, id]
      );

      logger.info('Updated usage type', { id });
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      logger.error('Error updating usage type', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteUsageType(req, res) {
    try {
      const { id } = req.params;
      
      await query('DELETE FROM pc_customized_usage_types WHERE id = $1', [id]);

      logger.info('Deleted usage type', { id });
      res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
      logger.error('Error deleting usage type', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Budget Ranges CRUD
   */
  static async createBudgetRange(req, res) {
    try {
      const { name, display_name, min_budget, max_budget, representative_budget } = req.body;
      
      const result = await query(
        `INSERT INTO pc_customized_budget_ranges 
         (name, display_name, min_budget, max_budget, representative_budget) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [name, display_name, min_budget, max_budget, representative_budget]
      );

      logger.info('Created budget range', { name });
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      logger.error('Error creating budget range', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateBudgetRange(req, res) {
    try {
      const { id } = req.params;
      const { display_name, min_budget, max_budget, representative_budget, is_active } = req.body;
      
      const result = await query(
        `UPDATE pc_customized_budget_ranges 
         SET display_name = $1, min_budget = $2, max_budget = $3, 
             representative_budget = $4, is_active = $5 
         WHERE id = $6 RETURNING *`,
        [display_name, min_budget, max_budget, representative_budget, is_active, id]
      );

      logger.info('Updated budget range', { id });
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      logger.error('Error updating budget range', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteBudgetRange(req, res) {
    try {
      const { id } = req.params;
      
      await query('DELETE FROM pc_customized_budget_ranges WHERE id = $1', [id]);

      logger.info('Deleted budget range', { id });
      res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
      logger.error('Error deleting budget range', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Performance Preferences CRUD
   */
  static async createPerformancePref(req, res) {
    try {
      const { name, display_name, performance_weight, budget_weight } = req.body;
      
      const result = await query(
        `INSERT INTO pc_customized_performance_preferences 
         (name, display_name, performance_weight, budget_weight) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, display_name, performance_weight, budget_weight]
      );

      logger.info('Created performance preference', { name });
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      logger.error('Error creating performance preference', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updatePerformancePref(req, res) {
    try {
      const { id } = req.params;
      const { display_name, performance_weight, budget_weight, is_active } = req.body;
      
      const result = await query(
        `UPDATE pc_customized_performance_preferences 
         SET display_name = $1, performance_weight = $2, budget_weight = $3, is_active = $4 
         WHERE id = $5 RETURNING *`,
        [display_name, performance_weight, budget_weight, is_active, id]
      );

      logger.info('Updated performance preference', { id });
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      logger.error('Error updating performance preference', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deletePerformancePref(req, res) {
    try {
      const { id } = req.params;
      
      await query('DELETE FROM pc_customized_performance_preferences WHERE id = $1', [id]);

      logger.info('Deleted performance preference', { id });
      res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
      logger.error('Error deleting performance preference', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Gaming Preferences CRUD
   */
  static async createGamingPref(req, res) {
    try {
      const { name, display_name, gpu_priority_weight, cpu_priority_weight } = req.body;
      
      const result = await query(
        `INSERT INTO pc_customized_gaming_preferences 
         (name, display_name, gpu_priority_weight, cpu_priority_weight) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, display_name, gpu_priority_weight, cpu_priority_weight]
      );

      logger.info('Created gaming preference', { name });
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      logger.error('Error creating gaming preference', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateGamingPref(req, res) {
    try {
      const { id } = req.params;
      const { display_name, gpu_priority_weight, cpu_priority_weight, is_active } = req.body;
      
      const result = await query(
        `UPDATE pc_customized_gaming_preferences 
         SET display_name = $1, gpu_priority_weight = $2, cpu_priority_weight = $3, is_active = $4 
         WHERE id = $5 RETURNING *`,
        [display_name, gpu_priority_weight, cpu_priority_weight, is_active, id]
      );

      logger.info('Updated gaming preference', { id });
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      logger.error('Error updating gaming preference', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteGamingPref(req, res) {
    try {
      const { id } = req.params;
      
      await query('DELETE FROM pc_customized_gaming_preferences WHERE id = $1', [id]);

      logger.info('Deleted gaming preference', { id });
      res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
      logger.error('Error deleting gaming preference', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = PCCustomizedAIParametersController;

