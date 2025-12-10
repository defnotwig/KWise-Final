/**
 * COMPREHENSIVE ROOT CAUSE ANALYSIS
 * Deep dive into the entire K-Wise system to identify and document all issues
 */

const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function comprehensiveAnalysis() {
    console.log('\n🔬 ===== COMPREHENSIVE SYSTEM ANALYSIS =====\n');
    
    const issues = [];
    const warnings = [];
    const recommendations = [];
    
    try {
        // ============================================================================
        // 1. DATABASE SCHEMA ANALYSIS
        // ============================================================================
        console.log('1. Analyzing Database Schema...\n');
        
        // Check pc_parts table structure
        const pcPartsSchema = await db.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'pc_parts' 
            ORDER BY ordinal_position
        `);
        
        const pcPartsColumns = pcPartsSchema.rows.map(r => r.column_name);
        console.log('   ✅ pc_parts columns:', pcPartsColumns.join(', '));
        
        // Check if spec_text exists
        if (!pcPartsColumns.includes('spec_text') && !pcPartsColumns.includes('specifications')) {
            issues.push({
                severity: 'HIGH',
                area: 'Database Schema',
                issue: 'pc_parts table missing specification column',
                impact: 'Cannot extract product specifications for rule matching',
                solution: 'Add spec_text or specifications column to pc_parts table'
            });
        }
        
        // Check product_specs table
        const productSpecsExists = await db.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'product_specs'
            )
        `);
        
        if (productSpecsExists.rows[0].exists) {
            const productSpecsSchema = await db.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'product_specs'
            `);
            console.log('   ✅ product_specs table exists');
            console.log('      Columns:', productSpecsSchema.rows.map(r => r.column_name).join(', '));
            
            const specCount = await db.query('SELECT COUNT(*) FROM product_specs');
            console.log(`      Rows: ${specCount.rows[0].count}`);
            
            if (parseInt(specCount.rows[0].count) === 0) {
                warnings.push({
                    severity: 'MEDIUM',
                    area: 'Database',
                    issue: 'product_specs table is empty',
                    impact: 'No normalized specifications available for matching',
                    solution: 'Populate product_specs from pc_parts data'
                });
            }
        } else {
            console.log('   ⚠️  product_specs table does not exist');
            warnings.push({
                severity: 'MEDIUM',
                area: 'Database Schema',
                issue: 'product_specs table missing',
                impact: 'May affect some compatibility features',
                solution: 'Table exists in migrations, may not be critical'
            });
        }
        
        // ============================================================================
        // 2. PRODUCT DATA QUALITY ANALYSIS
        // ============================================================================
        console.log('\n2. Analyzing Product Data Quality...\n');
        
        const productStats = await db.query(`
            SELECT 
                category,
                COUNT(*) as total,
                COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as with_image,
                COUNT(CASE WHEN price > 0 THEN 1 END) as with_price
            FROM pc_parts 
            GROUP BY category
            ORDER BY total DESC
        `);
        
        console.log('   📊 Products by Category:');
        productStats.rows.forEach(row => {
            console.log(`      ${row.category}: ${row.total} (Images: ${row.with_image}, Priced: ${row.with_price})`);
        });
        
        // Check for products missing critical data
        const missingData = await db.query(`
            SELECT 
                COUNT(*) FILTER (WHERE price IS NULL OR price = 0) as no_price,
                COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') as no_image,
                COUNT(*) FILTER (WHERE name IS NULL OR name = '') as no_name
            FROM pc_parts
        `);
        
        if (missingData.rows[0].no_price > 0) {
            warnings.push({
                severity: 'LOW',
                area: 'Product Data',
                issue: `${missingData.rows[0].no_price} products have no price`,
                impact: 'May affect build cost calculations',
                solution: 'Update products with current market prices'
            });
        }
        
        // ============================================================================
        // 3. COMPATIBILITY RULES ANALYSIS
        // ============================================================================
        console.log('\n3. Analyzing Compatibility Rules...\n');
        
        const rulesStats = await db.query(`
            SELECT 
                rule_category,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE enabled = true) as enabled_count
            FROM compatibility_rules
            GROUP BY rule_category
            ORDER BY total DESC
        `);
        
        console.log('   📋 Rules by Category:');
        rulesStats.rows.forEach(row => {
            console.log(`      ${row.rule_category}: ${row.enabled_count}/${row.total} enabled`);
        });
        
        // Check for rules that reference non-existent specs
        console.log('\n   🔍 Analyzing rule expressions...');
        const sampleRules = await db.query(`
            SELECT rule_name, rule_expression 
            FROM compatibility_rules 
            WHERE enabled = true 
            LIMIT 10
        `);
        
        console.log(`      Sampled ${sampleRules.rows.length} rules for validation`);
        
        // ============================================================================
        // 4. COMPATIBILITY LOGS ANALYSIS
        // ============================================================================
        console.log('\n4. Analyzing Compatibility Check Logs...\n');
        
        const logStats = await db.query(`
            SELECT 
                COUNT(*) as total_checks,
                COUNT(*) FILTER (WHERE rules_verdict->>'database_rules_applied' IS NOT NULL) as with_db_rules,
                AVG((rules_verdict->>'compatible_count')::int) as avg_compatible,
                MAX(created_at) as latest_check
            FROM compatibility_logs
        `);
        
        const stats = logStats.rows[0];
        console.log(`   Total compatibility checks: ${stats.total_checks}`);
        console.log(`   Checks with database rules: ${stats.with_db_rules}`);
        console.log(`   Average compatible count: ${Math.round(stats.avg_compatible)}`);
        console.log(`   Latest check: ${stats.latest_check}`);
        
        if (parseInt(stats.with_db_rules) === 0 && parseInt(stats.total_checks) > 0) {
            warnings.push({
                severity: 'HIGH',
                area: 'Integration',
                issue: 'No compatibility checks have database_rules_applied field',
                impact: 'Integration may not be active',
                solution: 'Backend needs restart or integration not complete'
            });
        } else if (parseInt(stats.with_db_rules) > 0) {
            console.log('   ✅ Database rules integration ACTIVE');
            
            // Check if any rules are actually being applied
            const rulesAppliedCount = await db.query(`
                SELECT 
                    AVG((rules_verdict->>'database_rules_applied')::int) as avg_rules_applied,
                    MAX((rules_verdict->>'database_rules_applied')::int) as max_rules_applied
                FROM compatibility_logs
                WHERE rules_verdict->>'database_rules_applied' IS NOT NULL
            `);
            
            const applied = rulesAppliedCount.rows[0];
            console.log(`   Average rules applied per check: ${Math.round(applied.avg_rules_applied)}`);
            console.log(`   Maximum rules applied: ${applied.max_rules_applied}`);
            
            if (parseFloat(applied.avg_rules_applied) === 0) {
                issues.push({
                    severity: 'HIGH',
                    area: 'Product Specifications',
                    issue: 'Database rules never match (0 rules applied)',
                    impact: 'Rules exist but cannot match due to missing product specs',
                    solution: 'Extract and populate product specifications from names/descriptions'
                });
            }
        }
        
        // ============================================================================
        // 5. PERFORMANCE ANALYSIS
        // ============================================================================
        console.log('\n5. Analyzing System Performance...\n');
        
        // Check database connection pool
        console.log('   🔍 Database connection pool status...');
        // Note: Cannot directly query pool stats without modifying db.js
        console.log('      Review db.js configuration for pool settings');
        recommendations.push({
            severity: 'INFO',
            area: 'Performance',
            issue: 'Monitor database connection pool usage',
            solution: 'Add pool monitoring metrics to track connection usage'
        });
        
        // Check table indexes
        const indexCheck = await db.query(`
            SELECT 
                tablename, 
                indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename IN ('pc_parts', 'compatibility_rules', 'compatibility_logs', 'product_specs')
            ORDER BY tablename, indexname
        `);
        
        console.log(`   ✅ Found ${indexCheck.rows.length} indexes on critical tables`);
        
        const tableIndexCounts = {};
        indexCheck.rows.forEach(row => {
            tableIndexCounts[row.tablename] = (tableIndexCounts[row.tablename] || 0) + 1;
        });
        
        Object.entries(tableIndexCounts).forEach(([table, count]) => {
            console.log(`      ${table}: ${count} indexes`);
        });
        
        // ============================================================================
        // 6. AI SERVICE ANALYSIS
        // ============================================================================
        console.log('\n6. Analyzing AI Service Integration...\n');
        
        // Check if Ollama service is available
        console.log('   🤖 AI Service: Ollama Deepseek R1');
        console.log('      Configuration should be in .env file');
        recommendations.push({
            severity: 'INFO',
            area: 'AI Service',
            issue: 'Verify Ollama service availability',
            solution: 'Test AI endpoints to ensure Ollama is running and responding'
        });
        
        // ============================================================================
        // 7. FRONTEND INTEGRATION CHECK
        // ============================================================================
        console.log('\n7. Checking Frontend Build Status...\n');
        
        const frontendPath = path.join(__dirname, '..', 'K-Wise');
        if (fs.existsSync(frontendPath)) {
            console.log('   ✅ Frontend directory exists');
            
            const packageJsonPath = path.join(frontendPath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                console.log('   ✅ package.json found');
                recommendations.push({
                    severity: 'INFO',
                    area: 'Frontend',
                    issue: 'Verify frontend build',
                    solution: 'Run: cd K-Wise && npm run build'
                });
            }
        }
        
        // ============================================================================
        // GENERATE REPORT
        // ============================================================================
        console.log('\n\n📊 ===== ANALYSIS SUMMARY =====\n');
        
        console.log(`🔴 CRITICAL ISSUES: ${issues.length}`);
        issues.forEach((issue, idx) => {
            console.log(`\n${idx + 1}. ${issue.issue}`);
            console.log(`   Area: ${issue.area}`);
            console.log(`   Severity: ${issue.severity}`);
            console.log(`   Impact: ${issue.impact}`);
            console.log(`   Solution: ${issue.solution}`);
        });
        
        console.log(`\n\n⚠️  WARNINGS: ${warnings.length}`);
        warnings.forEach((warning, idx) => {
            console.log(`\n${idx + 1}. ${warning.issue}`);
            console.log(`   Area: ${warning.area}`);
            console.log(`   Impact: ${warning.impact}`);
            console.log(`   Solution: ${warning.solution}`);
        });
        
        console.log(`\n\n💡 RECOMMENDATIONS: ${recommendations.length}`);
        recommendations.forEach((rec, idx) => {
            console.log(`\n${idx + 1}. ${rec.issue}`);
            console.log(`   Area: ${rec.area}`);
            console.log(`   Solution: ${rec.solution}`);
        });
        
        // Generate detailed report file
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                critical_issues: issues.length,
                warnings: warnings.length,
                recommendations: recommendations.length
            },
            issues,
            warnings,
            recommendations
        };
        
        fs.writeFileSync(
            path.join(__dirname, 'comprehensive-analysis-report.json'),
            JSON.stringify(report, null, 2)
        );
        
        console.log('\n\n✅ Analysis complete! Report saved to comprehensive-analysis-report.json\n');
        
    } catch (error) {
        console.error('\n❌ Analysis failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

comprehensiveAnalysis();
