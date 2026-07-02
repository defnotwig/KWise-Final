const pool = require('../config/db');

async function debugSatisfaction() {
  try {
    // Get a real component ID
    const compResult = await pool.query('SELECT id FROM pc_parts WHERE category = $1 LIMIT 1', ['CPU']);
    const componentId = compResult.rows[0].id;
    const userId = 3;
    
    console.log(`Testing with component ID: ${componentId}, user ID: ${userId}`);
    
    // Insert a 5-star feedback
    await pool.query(
      `INSERT INTO feedback_submissions 
       (user_id, component_id, issue_type, severity, title, description, rating, build_context, status)
       VALUES ($1, $2, 'general', 'minor', 'Great!', 'Works perfectly', 5, '{}', 'verified')`,
      [userId, componentId]
    );
    
    console.log('✅ Inserted 5-star feedback');
    
    // Check the calculated score
    const result = await pool.query('SELECT * FROM get_component_satisfaction_score($1)', [componentId]);
    console.log('📊 Satisfaction score result:', result.rows[0]);
    
    const score = Number.parseFloat(result.rows[0].satisfaction_score);
    console.log(`\n🎯 Final score: ${score}`);
    console.log(`   Expected: >= 75`);
    console.log(`   Test passes: ${score >= 75 ? '✅ YES' : '❌ NO'}`);
    
    // Clean up
    await pool.query('DELETE FROM feedback_submissions WHERE user_id = $1 AND component_id = $2', [userId, componentId]);
    console.log('\n🧹 Cleanup done');
    
    process.exit(score >= 75 ? 0 : 1);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugSatisfaction();
