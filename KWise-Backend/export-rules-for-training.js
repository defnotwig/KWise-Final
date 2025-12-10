/**
 * Export 2,513 Compatibility Rules for AI Fine-Tuning
 * Converts database rules into training format for DeepSeek R1
 * Outputs: JSONL format compatible with Ollama fine-tuning
 */

const db = require('./config/db');
const fs = require('fs').promises;
const path = require('path');

async function exportRulesForTraining() {
    console.log('\n========== EXPORTING 2,513 COMPATIBILITY RULES FOR AI TRAINING ==========\n');

    try {
        // Step 1: Fetch all enabled rules from database
        console.log('Step 1: Fetching rules from database...');
        
        const rulesResult = await db.query(`
            SELECT 
                id,
                rule_name,
                rule_category,
                component_a_category,
                component_b_category,
                rule_type,
                rule_expression,
                error_message,
                warning_message,
                solution_message,
                severity,
                priority
            FROM compatibility_rules
            WHERE enabled = true
            ORDER BY rule_category, priority DESC, id
        `);

        const rules = rulesResult.rows;
        console.log(`✅ Fetched ${rules.length} rules`);

        // Step 2: Group rules by category
        console.log('\nStep 2: Grouping rules by category...');
        
        const rulesByCategory = {};
        rules.forEach(rule => {
            if (!rulesByCategory[rule.rule_category]) {
                rulesByCategory[rule.rule_category] = [];
            }
            rulesByCategory[rule.rule_category].push(rule);
        });

        console.log('Rule distribution:');
        Object.keys(rulesByCategory).forEach(category => {
            console.log(`   ${category}: ${rulesByCategory[category].length} rules`);
        });

        // Step 3: Convert to AI training format
        console.log('\nStep 3: Converting to training format...');
        
        const trainingExamples = [];

        // Generate training examples for each rule
        for (const rule of rules) {
            // Create instruction-response pairs based on rule
            const example = {
                instruction: generateInstructionFromRule(rule),
                context: generateContextFromRule(rule),
                output: generateOutputFromRule(rule),
                metadata: {
                    rule_id: rule.id,
                    rule_name: rule.rule_name,
                    category: rule.rule_category,
                    severity: rule.severity,
                    components: rule.component_b_category 
                        ? `${rule.component_a_category} + ${rule.component_b_category}`
                        : rule.component_a_category
                }
            };

            trainingExamples.push(example);
        }

        console.log(`✅ Generated ${trainingExamples.length} training examples`);

        // Step 4: Save as JSONL (one JSON per line)
        console.log('\nStep 4: Saving to JSONL format...');
        
        const outputDir = path.join(__dirname, 'ai', 'training', 'datasets');
        await fs.mkdir(outputDir, { recursive: true });

        const jsonlPath = path.join(outputDir, 'compatibility_rules_training.jsonl');
        const jsonLines = trainingExamples.map(ex => JSON.stringify(ex)).join('\n');
        await fs.writeFile(jsonlPath, jsonLines, 'utf8');

        console.log(`✅ Saved to: ${jsonlPath}`);

        // Step 5: Save summary statistics
        const summaryPath = path.join(outputDir, 'rules_training_summary.json');
        const summary = {
            totalRules: rules.length,
            totalExamples: trainingExamples.length,
            rulesByCategory: Object.keys(rulesByCategory).map(cat => ({
                category: cat,
                count: rulesByCategory[cat].length
            })),
            bySeverity: {
                error: rules.filter(r => r.severity === 'error').length,
                warning: rules.filter(r => r.severity === 'warning').length,
                info: rules.filter(r => r.severity === 'info').length
            },
            generatedAt: new Date().toISOString(),
            outputFile: jsonlPath
        };

        await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
        console.log(`✅ Summary saved to: ${summaryPath}`);

        // Step 6: Display statistics
        console.log('\n========== EXPORT COMPLETE ==========\n');
        console.log(`📊 Statistics:`);
        console.log(`   Total Rules Exported: ${rules.length}`);
        console.log(`   Training Examples: ${trainingExamples.length}`);
        console.log(`   Output Format: JSONL`);
        console.log(`   File Size: ${(jsonLines.length / 1024).toFixed(2)} KB`);
        console.log('\n🎯 Ready for AI Fine-Tuning!\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error exporting rules:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

/**
 * Generate instruction from rule
 */
function generateInstructionFromRule(rule) {
    const comp1 = rule.component_a_category;
    const comp2 = rule.component_b_category || 'build';
    
    const instructions = [
        `Check compatibility between ${comp1} and ${comp2}`,
        `Analyze ${comp1} and ${comp2} compatibility`,
        `Verify if ${comp1} works with ${comp2}`,
        `Evaluate compatibility: ${comp1} + ${comp2}`,
        `Determine if ${comp1} and ${comp2} are compatible`
    ];

    // Pick instruction based on rule ID for variety
    return instructions[rule.id % instructions.length];
}

/**
 * Generate context from rule
 */
function generateContextFromRule(rule) {
    let context = `Rule: ${rule.rule_name}\n`;
    context += `Category: ${rule.rule_category}\n`;
    context += `Type: ${rule.rule_type}\n`;
    
    if (rule.component_b_category) {
        context += `Components: ${rule.component_a_category} + ${rule.component_b_category}\n`;
    } else {
        context += `Component: ${rule.component_a_category}\n`;
    }

    // Parse rule expression to extract key criteria
    try {
        const expression = JSON.parse(rule.rule_expression);
        if (Array.isArray(expression) && expression.length > 0) {
            context += `Criteria: `;
            const criteria = expression.map(cond => {
                const field = cond.field || 'unknown';
                const operator = cond.operator || '==';
                const value = cond.value || 'unknown';
                return `${field} ${operator} ${value}`;
            }).join(', ');
            context += criteria;
        }
    } catch (e) {
        // If parsing fails, include raw expression
        context += `Expression: ${rule.rule_expression}`;
    }

    return context;
}

/**
 * Generate expected output from rule
 */
function generateOutputFromRule(rule) {
    let output = '';

    // Severity-based prefix
    const severityPrefix = {
        'error': '❌ INCOMPATIBLE',
        'warning': '⚠️ WARNING',
        'info': 'ℹ️ INFO'
    };

    output += `${severityPrefix[rule.severity] || ''}:\n\n`;

    // Error or warning message
    if (rule.error_message) {
        output += `Issue: ${rule.error_message}\n\n`;
    } else if (rule.warning_message) {
        output += `Warning: ${rule.warning_message}\n\n`;
    }

    // Solution
    if (rule.solution_message) {
        output += `Solution: ${rule.solution_message}\n`;
    }

    return output.trim();
}

// Run the export
exportRulesForTraining();
