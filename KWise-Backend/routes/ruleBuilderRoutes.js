const express = require('express');
const router = express.Router();
const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Rule Builder API Routes
 * Comprehensive CRUD operations for compatibility rules
 * Supports: Create, Read, Update, Delete, Test, Validate, Import/Export
 */

// ==========================================
// GET /api/rules - Get all rules
// ==========================================
router.get('/', async (req, res) => {
  try {
    // Use actual column names from compatibility_rules table:
    // component_a_category, component_b_category, rule_name, rule_type, etc.
    const query = `
      SELECT 
        r.id,
        r.rule_name as name,
        r.error_message as description,
        r.component_a_category,
        r.component_b_category,
        r.rule_type as action,
        r.priority,
        r.enabled,
        r.created_at,
        r.updated_at,
        r.rule_expression as conditions,
        r.rule_category,
        r.severity
      FROM compatibility_rules r
      ORDER BY r.priority DESC, r.created_at DESC
    `;

    const result = await db.query(query);
    
    // Format rules for frontend
    const rules = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      category: row.rule_category,
      component1_category: row.component_a_category,
      component2_category: row.component_b_category,
      action: row.action,
      priority: row.priority || 5,
      enabled: row.enabled !== false,
      conditions: row.conditions || {},
      severity: row.severity,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    logger.info(`Retrieved ${rules.length} compatibility rules`);
    
    res.json({
      success: true,
      data: rules,
      count: rules.length
    });
  } catch (error) {
    logger.error('Error fetching rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rules',
      error: error.message
    });
  }
});

// ==========================================
// POST /api/rules/create - Create new rule
// ==========================================
router.post('/create', async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      component1_id,
      component2_id,
      conditions,
      action,
      priority,
      enabled
    } = req.body;

    // Validation
    if (!name || !component1_id || !component2_id || !conditions || !action) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, component1_id, component2_id, conditions, action'
      });
    }

    // Get component categories
    const comp1 = await db.query('SELECT category FROM pc_parts WHERE id = $1', [component1_id]);
    const comp2 = await db.query('SELECT category FROM pc_parts WHERE id = $1', [component2_id]);

    if (comp1.rows.length === 0 || comp2.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid component IDs'
      });
    }

    const query = `
      INSERT INTO compatibility_rules (
        name,
        description,
        component1_category,
        component2_category,
        component1_id,
        component2_id,
        rule_type,
        priority,
        enabled,
        conditions,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      name,
      description || null,
      comp1.rows[0].category,
      comp2.rows[0].category,
      component1_id,
      component2_id,
      action,
      priority || 5,
      enabled !== false,
      JSON.stringify(conditions)
    ];

    const result = await db.query(query, values);
    
    logger.info(`Created new compatibility rule: ${name} (ID: ${result.rows[0].id})`);
    
    res.status(201).json({
      success: true,
      message: 'Rule created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error creating rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create rule',
      error: error.message
    });
  }
});

// ==========================================
// PUT /api/rules/:id/update - Update rule
// ==========================================
router.put('/:id/update', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      component1_id,
      component2_id,
      conditions,
      action,
      priority,
      enabled
    } = req.body;

    // Check if rule exists
    const existing = await db.query('SELECT * FROM compatibility_rules WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rule not found'
      });
    }

    // Get component categories
    const comp1 = await db.query('SELECT category FROM pc_parts WHERE id = $1', [component1_id]);
    const comp2 = await db.query('SELECT category FROM pc_parts WHERE id = $1', [component2_id]);

    if (comp1.rows.length === 0 || comp2.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid component IDs'
      });
    }

    const query = `
      UPDATE compatibility_rules SET
        name = $1,
        description = $2,
        component1_category = $3,
        component2_category = $4,
        component1_id = $5,
        component2_id = $6,
        rule_type = $7,
        priority = $8,
        enabled = $9,
        conditions = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `;

    const values = [
      name,
      description || null,
      comp1.rows[0].category,
      comp2.rows[0].category,
      component1_id,
      component2_id,
      action,
      priority || 5,
      enabled !== false,
      JSON.stringify(conditions),
      id
    ];

    const result = await db.query(query, values);
    
    logger.info(`Updated compatibility rule: ${name} (ID: ${id})`);
    
    res.json({
      success: true,
      message: 'Rule updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update rule',
      error: error.message
    });
  }
});

// ==========================================
// DELETE /api/rules/:id - Delete rule
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM compatibility_rules WHERE id = $1 RETURNING name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rule not found'
      });
    }

    logger.info(`Deleted compatibility rule: ${result.rows[0].name} (ID: ${id})`);
    
    res.json({
      success: true,
      message: 'Rule deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete rule',
      error: error.message
    });
  }
});

// ==========================================
// POST /api/rules/test - Test rule logic
// ==========================================
router.post('/test', async (req, res) => {
  try {
    const { component1_id, component2_id, conditions, test_data } = req.body;

    // Get component data
    const comp1 = await db.query('SELECT * FROM pc_parts WHERE id = $1', [component1_id]);
    const comp2 = await db.query('SELECT * FROM pc_parts WHERE id = $1', [component2_id]);

    if (comp1.rows.length === 0 || comp2.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid component IDs'
      });
    }

    // Merge test data with actual component data
    const testComponent1 = { ...comp1.rows[0], ...(test_data?.component1_specs || {}) };
    const testComponent2 = { ...comp2.rows[0], ...(test_data?.component2_specs || {}) };

    // Evaluate conditions
    const results = [];
    let allPassed = true;

    for (const condition of conditions) {
      const [component, field] = condition.field.split('.');
      const testComp = component === 'component1' ? testComponent1 : testComponent2;
      const value = testComp[field] || testComp.specifications?.[field];

      let passed = false;
      let result = '';

      switch (condition.operator) {
        case '==':
          passed = String(value) === String(condition.value);
          result = `${value} == ${condition.value}`;
          break;
        case '!=':
          passed = String(value) !== String(condition.value);
          result = `${value} != ${condition.value}`;
          break;
        case '>':
          passed = parseFloat(value) > parseFloat(condition.value);
          result = `${value} > ${condition.value}`;
          break;
        case '<':
          passed = parseFloat(value) < parseFloat(condition.value);
          result = `${value} < ${condition.value}`;
          break;
        case '>=':
          passed = parseFloat(value) >= parseFloat(condition.value);
          result = `${value} >= ${condition.value}`;
          break;
        case '<=':
          passed = parseFloat(value) <= parseFloat(condition.value);
          result = `${value} <= ${condition.value}`;
          break;
        case 'contains':
          passed = String(value).toLowerCase().includes(String(condition.value).toLowerCase());
          result = `${value} contains ${condition.value}`;
          break;
        case 'not_contains':
          passed = !String(value).toLowerCase().includes(String(condition.value).toLowerCase());
          result = `${value} not contains ${condition.value}`;
          break;
        case 'starts_with':
          passed = String(value).toLowerCase().startsWith(String(condition.value).toLowerCase());
          result = `${value} starts with ${condition.value}`;
          break;
        case 'ends_with':
          passed = String(value).toLowerCase().endsWith(String(condition.value).toLowerCase());
          result = `${value} ends with ${condition.value}`;
          break;
        case 'in':
          const list = condition.value.split(',').map(v => v.trim().toLowerCase());
          passed = list.includes(String(value).toLowerCase());
          result = `${value} in [${condition.value}]`;
          break;
        case 'not_in':
          const notList = condition.value.split(',').map(v => v.trim().toLowerCase());
          passed = !notList.includes(String(value).toLowerCase());
          result = `${value} not in [${condition.value}]`;
          break;
      }

      results.push({
        condition: `${condition.field} ${condition.operator} ${condition.value}`,
        passed,
        result
      });

      // Apply logic (AND/OR)
      if (condition.logic === 'AND') {
        allPassed = allPassed && passed;
      } else if (condition.logic === 'OR') {
        allPassed = allPassed || passed;
      } else {
        allPassed = passed; // First condition
      }
    }

    res.json({
      success: true,
      data: {
        passed: allPassed,
        message: allPassed ? 'All conditions passed' : 'Some conditions failed',
        details: results
      }
    });
  } catch (error) {
    logger.error('Error testing rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test rule',
      error: error.message
    });
  }
});

// ==========================================
// POST /api/rules/conflicts - Check conflicts
// ==========================================
router.post('/conflicts', async (req, res) => {
  try {
    const { component1_id, component2_id, conditions, exclude_rule_id } = req.body;

    // Find potentially conflicting rules
    const query = `
      SELECT 
        id,
        name,
        rule_type,
        priority,
        conditions
      FROM compatibility_rules
      WHERE 
        (component1_id = $1 OR component1_id IS NULL)
        AND (component2_id = $2 OR component2_id IS NULL)
        AND enabled = true
        ${exclude_rule_id ? 'AND id != $3' : ''}
    `;

    const values = exclude_rule_id 
      ? [component1_id, component2_id, exclude_rule_id]
      : [component1_id, component2_id];

    const result = await db.query(query, values);
    
    const conflicts = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      reason: `Similar rule targeting same components (Priority: ${row.priority})`
    }));

    res.json({
      success: true,
      data: conflicts
    });
  } catch (error) {
    logger.error('Error checking conflicts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check conflicts',
      error: error.message
    });
  }
});

// ==========================================
// POST /api/rules/validate - Validate rule
// ==========================================
router.post('/validate', async (req, res) => {
  try {
    const { name, component1_id, component2_id, conditions } = req.body;

    const errors = [];

    // Check if name is unique
    const nameCheck = await db.query(
      'SELECT id FROM compatibility_rules WHERE name = $1',
      [name]
    );
    if (nameCheck.rows.length > 0) {
      errors.push('Rule name already exists');
    }

    // Validate component IDs
    if (component1_id) {
      const comp1 = await db.query('SELECT id FROM pc_parts WHERE id = $1', [component1_id]);
      if (comp1.rows.length === 0) {
        errors.push('Invalid component1_id');
      }
    }

    if (component2_id) {
      const comp2 = await db.query('SELECT id FROM pc_parts WHERE id = $1', [component2_id]);
      if (comp2.rows.length === 0) {
        errors.push('Invalid component2_id');
      }
    }

    // Validate conditions
    if (!Array.isArray(conditions) || conditions.length === 0) {
      errors.push('At least one condition is required');
    }

    res.json({
      success: errors.length === 0,
      valid: errors.length === 0,
      errors: errors
    });
  } catch (error) {
    logger.error('Error validating rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate rule',
      error: error.message
    });
  }
});

// ==========================================
// GET /api/rules/templates - Get rule templates
// ==========================================
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 1,
        name: 'CPU-Motherboard Socket Compatibility',
        description: 'Checks if CPU socket matches motherboard socket',
        conditions: [
          { field: 'component1.socket', operator: '==', value: 'component2.socket' }
        ],
        action: 'block'
      },
      {
        id: 2,
        name: 'RAM Speed Compatibility',
        description: 'Warns if RAM speed exceeds motherboard max',
        conditions: [
          { field: 'component1.speed', operator: '>', value: 'component2.max_ram_speed' }
        ],
        action: 'warn'
      },
      {
        id: 3,
        name: 'PSU Wattage Check',
        description: 'Blocks if PSU wattage is insufficient',
        conditions: [
          { field: 'component1.wattage', operator: '<', value: 'component2.required_watts' }
        ],
        action: 'block'
      },
      {
        id: 4,
        name: 'GPU Clearance Check',
        description: 'Warns if GPU length exceeds case clearance',
        conditions: [
          { field: 'component1.length', operator: '>', value: 'component2.max_gpu_length' }
        ],
        action: 'warn'
      }
    ];

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
});

// ==========================================
// POST /api/rules/import - Import rules
// ==========================================
router.post('/import', async (req, res) => {
  try {
    const { rules } = req.body;

    if (!Array.isArray(rules)) {
      return res.status(400).json({
        success: false,
        message: 'Rules must be an array'
      });
    }

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const rule of rules) {
      try {
        // Check if rule already exists by name
        const existing = await db.query(
          'SELECT id FROM compatibility_rules WHERE name = $1',
          [rule.name]
        );

        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }

        // Get component categories
        const comp1 = await db.query('SELECT category FROM pc_parts WHERE id = $1', [rule.component1_id]);
        const comp2 = await db.query('SELECT category FROM pc_parts WHERE id = $1', [rule.component2_id]);

        if (comp1.rows.length === 0 || comp2.rows.length === 0) {
          errors++;
          continue;
        }

        // Insert rule
        await db.query(
          `INSERT INTO compatibility_rules (
            name, description, component1_category, component2_category,
            component1_id, component2_id, rule_type, priority, enabled, conditions,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
          [
            rule.name,
            rule.description || null,
            comp1.rows[0].category,
            comp2.rows[0].category,
            rule.component1_id,
            rule.component2_id,
            rule.action,
            rule.priority || 5,
            rule.enabled !== false,
            JSON.stringify(rule.conditions)
          ]
        );

        imported++;
      } catch (err) {
        logger.error(`Error importing rule ${rule.name}:`, err);
        errors++;
      }
    }

    logger.info(`Import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);

    res.json({
      success: true,
      message: `Import complete: ${imported} rules imported`,
      data: {
        imported,
        skipped,
        errors,
        total: rules.length
      }
    });
  } catch (error) {
    logger.error('Error importing rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import rules',
      error: error.message
    });
  }
});

// ==========================================
// GET /api/rules/export - Export rules
// ==========================================
router.get('/export', async (req, res) => {
  try {
    const query = `
      SELECT 
        id, name, description, component1_category, component2_category,
        component1_id, component2_id, rule_type as action, priority, 
        enabled, conditions, created_at, updated_at
      FROM compatibility_rules
      ORDER BY priority DESC, created_at DESC
    `;

    const result = await db.query(query);
    
    logger.info(`Exported ${result.rows.length} compatibility rules`);
    
    res.json({
      success: true,
      data: result.rows,
      exported_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error exporting rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export rules',
      error: error.message
    });
  }
});

module.exports = router;
