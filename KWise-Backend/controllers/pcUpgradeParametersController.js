/**
 * PC UPGRADE PARAMETERS CONTROLLER
 * 
 * Manages dynamic parameters for the "Tell Us About Your PC" form:
 * - Usage Types (Gaming, Office, etc.)
 * - Year Ranges (2010-2015, 2016-2020, etc.)
 * - Budget Ranges (₱10k-25k, ₱26k-50k, etc.)
 * 
 * This makes the system future-proof - admins can add/update parameters
 * without code changes as technology evolves.
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');

class PCUpgradeParametersController {
  
  // ============================================================
  // USAGE TYPES MANAGEMENT
  // ============================================================

  /**
   * Get all usage types (active only by default)
   */
  static async getUsageTypes(req, res) {
    try {
      const { include_inactive } = req.query;
      

      let sql = `
        SELECT * FROM pc_upgrade_usage_types
        WHERE 1=1
      `;

      if (!include_inactive) {
        sql += ` AND is_active = true`;
      }

      sql += ` ORDER BY sort_order ASC, name ASC`;

      const result = await query(sql);

      logger.info('Fetched usage types', { count: result.rows.length });
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error fetching usage types', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch usage types'
      });
    }
  }

  /**
   * Create new usage type
   */
  static async createUsageType(req, res) {
    try {
      const { name, display_name, icon, sort_order } = req.body;
      

      // Validation
      if (!name || !display_name) {
        return res.status(400).json({
          success: false,
          message: 'Name and display_name are required'
        });
      }

      const result = await query(`
        INSERT INTO pc_upgrade_usage_types (name, display_name, icon, sort_order)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [name, display_name, icon || null, sort_order || 999]);

      logger.info('Created usage type', { id: result.rows[0].id, name });

      res.json({
        success: true,
        message: 'Usage type created successfully',
        data: result.rows[0]
      });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'Usage type with this name already exists'
        });
      }
      logger.error('Error creating usage type', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to create usage type'
      });
    }
  }

  /**
   * Update usage type
   */
  static async updateUsageType(req, res) {
    try {
      const { id } = req.params;
      const { name, display_name, icon, sort_order, is_active } = req.body;
      

      const result = await query(`
        UPDATE pc_upgrade_usage_types
        SET 
          name = COALESCE($1, name),
          display_name = COALESCE($2, display_name),
          icon = COALESCE($3, icon),
          sort_order = COALESCE($4, sort_order),
          is_active = COALESCE($5, is_active)
        WHERE id = $6
        RETURNING *
      `, [name, display_name, icon, sort_order, is_active, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usage type not found'
        });
      }

      logger.info('Updated usage type', { id, name: result.rows[0].name });

      res.json({
        success: true,
        message: 'Usage type updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error updating usage type', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to update usage type'
      });
    }
  }

  /**
   * Delete usage type
   */
  static async deleteUsageType(req, res) {
    try {
      const { id } = req.params;
      

      const result = await query(`
        DELETE FROM pc_upgrade_usage_types
        WHERE id = $1
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usage type not found'
        });
      }

      logger.info('Deleted usage type', { id, name: result.rows[0].name });

      res.json({
        success: true,
        message: 'Usage type deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting usage type', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to delete usage type'
      });
    }
  }

  // ============================================================
  // YEAR RANGES MANAGEMENT
  // ============================================================

  /**
   * Get all year ranges (active only by default)
   */
  static async getYearRanges(req, res) {
    try {
      const { include_inactive } = req.query;
      

      let sql = `
        SELECT * FROM pc_upgrade_year_ranges
        WHERE 1=1
      `;

      if (!include_inactive) {
        sql += ` AND is_active = true`;
      }

      sql += ` ORDER BY sort_order ASC, start_year DESC`;

      const result = await query(sql);

      logger.info('Fetched year ranges', { count: result.rows.length });
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error fetching year ranges', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch year ranges'
      });
    }
  }

  /**
   * Create new year range
   */
  static async createYearRange(req, res) {
    try {
      const { name, display_name, start_year, end_year, representative_year, category, icon, sort_order } = req.body;
      

      // Validation
      if (!name || !display_name || !start_year || !end_year || !representative_year) {
        return res.status(400).json({
          success: false,
          message: 'Name, display_name, start_year, end_year, and representative_year are required'
        });
      }

      if (start_year > end_year) {
        return res.status(400).json({
          success: false,
          message: 'start_year must be <= end_year'
        });
      }

      if (representative_year < start_year || representative_year > end_year) {
        return res.status(400).json({
          success: false,
          message: 'representative_year must be between start_year and end_year'
        });
      }

      const result = await query(`
        INSERT INTO pc_upgrade_year_ranges 
        (name, display_name, start_year, end_year, representative_year, category, icon, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [name, display_name, start_year, end_year, representative_year, category, icon, sort_order || 999]);

      logger.info('Created year range', { id: result.rows[0].id, name });

      res.json({
        success: true,
        message: 'Year range created successfully',
        data: result.rows[0]
      });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'Year range with this name already exists'
        });
      }
      logger.error('Error creating year range', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to create year range'
      });
    }
  }

  /**
   * Update year range
   */
  static async updateYearRange(req, res) {
    try {
      const { id } = req.params;
      const { name, display_name, start_year, end_year, representative_year, category, icon, sort_order, is_active } = req.body;
      

      const result = await query(`
        UPDATE pc_upgrade_year_ranges
        SET 
          name = COALESCE($1, name),
          display_name = COALESCE($2, display_name),
          start_year = COALESCE($3, start_year),
          end_year = COALESCE($4, end_year),
          representative_year = COALESCE($5, representative_year),
          category = COALESCE($6, category),
          icon = COALESCE($7, icon),
          sort_order = COALESCE($8, sort_order),
          is_active = COALESCE($9, is_active)
        WHERE id = $10
        RETURNING *
      `, [name, display_name, start_year, end_year, representative_year, category, icon, sort_order, is_active, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Year range not found'
        });
      }

      logger.info('Updated year range', { id, name: result.rows[0].name });

      res.json({
        success: true,
        message: 'Year range updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error updating year range', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to update year range'
      });
    }
  }

  /**
   * Delete year range
   */
  static async deleteYearRange(req, res) {
    try {
      const { id } = req.params;
      

      const result = await query(`
        DELETE FROM pc_upgrade_year_ranges
        WHERE id = $1
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Year range not found'
        });
      }

      logger.info('Deleted year range', { id, name: result.rows[0].name });

      res.json({
        success: true,
        message: 'Year range deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting year range', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to delete year range'
      });
    }
  }

  // ============================================================
  // BUDGET RANGES MANAGEMENT
  // ============================================================

  /**
   * Get all budget ranges (active only by default)
   */
  static async getBudgetRanges(req, res) {
    try {
      const { include_inactive } = req.query;
      

      let sql = `
        SELECT * FROM pc_upgrade_budget_ranges
        WHERE 1=1
      `;

      if (!include_inactive) {
        sql += ` AND is_active = true`;
      }

      sql += ` ORDER BY sort_order ASC, min_budget ASC`;

      const result = await query(sql);

      logger.info('Fetched budget ranges', { count: result.rows.length });
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error fetching budget ranges', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch budget ranges'
      });
    }
  }

  /**
   * Create new budget range
   */
  static async createBudgetRange(req, res) {
    try {
      const { name, display_name, min_budget, max_budget, representative_budget, icon, sort_order } = req.body;
      

      // Validation
      if (!name || !display_name || min_budget === undefined || max_budget === undefined || !representative_budget) {
        return res.status(400).json({
          success: false,
          message: 'Name, display_name, min_budget, max_budget, and representative_budget are required'
        });
      }

      if (min_budget >= max_budget) {
        return res.status(400).json({
          success: false,
          message: 'min_budget must be < max_budget'
        });
      }

      if (representative_budget < min_budget || representative_budget > max_budget) {
        return res.status(400).json({
          success: false,
          message: 'representative_budget must be between min_budget and max_budget'
        });
      }

      const result = await query(`
        INSERT INTO pc_upgrade_budget_ranges 
        (name, display_name, min_budget, max_budget, representative_budget, icon, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [name, display_name, min_budget, max_budget, representative_budget, icon, sort_order || 999]);

      logger.info('Created budget range', { id: result.rows[0].id, name });

      res.json({
        success: true,
        message: 'Budget range created successfully',
        data: result.rows[0]
      });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'Budget range with this name already exists'
        });
      }
      logger.error('Error creating budget range', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to create budget range'
      });
    }
  }

  /**
   * Update budget range
   */
  static async updateBudgetRange(req, res) {
    try {
      const { id } = req.params;
      const { name, display_name, min_budget, max_budget, representative_budget, icon, sort_order, is_active } = req.body;
      

      const result = await query(`
        UPDATE pc_upgrade_budget_ranges
        SET 
          name = COALESCE($1, name),
          display_name = COALESCE($2, display_name),
          min_budget = COALESCE($3, min_budget),
          max_budget = COALESCE($4, max_budget),
          representative_budget = COALESCE($5, representative_budget),
          icon = COALESCE($6, icon),
          sort_order = COALESCE($7, sort_order),
          is_active = COALESCE($8, is_active)
        WHERE id = $9
        RETURNING *
      `, [name, display_name, min_budget, max_budget, representative_budget, icon, sort_order, is_active, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Budget range not found'
        });
      }

      logger.info('Updated budget range', { id, name: result.rows[0].name });

      res.json({
        success: true,
        message: 'Budget range updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error updating budget range', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to update budget range'
      });
    }
  }

  /**
   * Delete budget range
   */
  static async deleteBudgetRange(req, res) {
    try {
      const { id } = req.params;
      

      const result = await query(`
        DELETE FROM pc_upgrade_budget_ranges
        WHERE id = $1
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Budget range not found'
        });
      }

      logger.info('Deleted budget range', { id, name: result.rows[0].name });

      res.json({
        success: true,
        message: 'Budget range deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting budget range', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to delete budget range'
      });
    }
  }

  // ============================================================
  // PARAMETERS SUMMARY
  // ============================================================

  /**
   * Get summary of all parameters
   */
  static async getParametersSummary(req, res) {
    try {
      

      const result = await query(`
        SELECT * FROM v_pc_upgrade_parameters_summary
      `);

      logger.info('Fetched parameters summary');
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error fetching parameters summary', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch parameters summary'
      });
    }
  }

  /**
   * Get all parameters at once (for frontend loading)
   */
  static async getAllParameters(req, res) {
    try {
      

      const [usageTypes, yearRanges, budgetRanges, summary] = await Promise.all([
        query('SELECT * FROM pc_upgrade_usage_types WHERE is_active = true ORDER BY sort_order ASC'),
        query('SELECT * FROM pc_upgrade_year_ranges WHERE is_active = true ORDER BY sort_order ASC'),
        query('SELECT * FROM pc_upgrade_budget_ranges WHERE is_active = true ORDER BY sort_order ASC'),
        query('SELECT * FROM v_pc_upgrade_parameters_summary')
      ]);

      logger.info('Fetched all parameters');
      
      res.json({
        success: true,
        data: {
          usageTypes: usageTypes.rows,
          yearRanges: yearRanges.rows,
          budgetRanges: budgetRanges.rows,
          summary: summary.rows[0]
        }
      });
    } catch (error) {
      logger.error('Error fetching all parameters', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch parameters'
      });
    }
  }
}

module.exports = PCUpgradeParametersController;
