/**
 * Migration script to populate diagnostic_issues table with comprehensive data
 * This ensures the database has all diagnostic issues that were previously hardcoded in PCCheckup.js
 */

const { query } = require('./config/db');

const diagnosticIssues = [
    // PERFORMANCE ISSUES
    { category: 'performance', issue_name: 'Slow startup', description: 'System takes too long to boot', severity: 'medium', display_order: 1 },
    { category: 'performance', issue_name: 'Frequently freezing', description: 'System becomes unresponsive frequently', severity: 'high', display_order: 2 },
    { category: 'performance', issue_name: 'Overheating', description: 'System runs hot and may throttle', severity: 'high', display_order: 3 },
    { category: 'performance', issue_name: 'Fan noise', description: 'Loud or unusual fan sounds', severity: 'low', display_order: 4 },
    { category: 'performance', issue_name: 'Slow performance', description: 'General system slowness', severity: 'medium', display_order: 5 },
    { category: 'performance', issue_name: 'Random shutdowns', description: 'System shuts down unexpectedly', severity: 'high', display_order: 6 },

    // COMPUTER HARDWARE
    { category: 'hardware', issue_name: 'Battery depletion', description: 'Battery drains quickly', severity: 'medium', display_order: 1 },
    { category: 'hardware', issue_name: "Won't turn on", description: 'System does not power on', severity: 'critical', display_order: 2 },
    { category: 'hardware', issue_name: 'Makes weird sounds', description: 'Unusual noises from components', severity: 'medium', display_order: 3 },
    { category: 'hardware', issue_name: 'No sound', description: 'No audio output', severity: 'medium', display_order: 4 },
    { category: 'hardware', issue_name: 'Static noise', description: 'Audio has static or interference', severity: 'low', display_order: 5 },
    { category: 'hardware', issue_name: 'Mic not working', description: 'Microphone not functioning', severity: 'medium', display_order: 6 },
    { category: 'hardware', issue_name: 'Display issues', description: 'Screen problems', severity: 'high', display_order: 7 },
    { category: 'hardware', issue_name: 'USB ports not working', description: 'USB devices not detected', severity: 'medium', display_order: 8 },

    // INTERNET AND NETWORK
    { category: 'connectivity', issue_name: "Can't connect", description: 'Unable to connect to network', severity: 'high', display_order: 1 },
    { category: 'connectivity', issue_name: 'Wi-Fi drops', description: 'WiFi connection unstable', severity: 'medium', display_order: 2 },
    { category: 'connectivity', issue_name: 'Slow speed', description: 'Network speed is slow', severity: 'medium', display_order: 3 },
    { category: 'connectivity', issue_name: 'No internet connection', description: 'No internet access', severity: 'high', display_order: 4 },
    { category: 'connectivity', issue_name: 'WiFi connection drops', description: 'WiFi disconnects frequently', severity: 'medium', display_order: 5 },
    { category: 'connectivity', issue_name: 'Ethernet not working', description: 'Wired connection issues', severity: 'medium', display_order: 6 },

    // DISPLAY ISSUES
    { category: 'display', issue_name: 'Black screen', description: 'Monitor shows no display', severity: 'critical', display_order: 1 },
    { category: 'display', issue_name: 'Flickering screen', description: 'Screen flickers or blinks', severity: 'high', display_order: 2 },
    { category: 'display', issue_name: 'Blurry display', description: 'Screen is not sharp or clear', severity: 'medium', display_order: 3 },

    // SOUND ISSUES (additional to hardware sound issues)
    { category: 'sound', issue_name: 'No sound output', description: 'Speakers produce no sound', severity: 'medium', display_order: 1 },
    { category: 'sound', issue_name: 'Static noise from speakers', description: 'Audio has static interference', severity: 'low', display_order: 2 },
    { category: 'sound', issue_name: 'Microphone not detected', description: 'System cannot detect microphone', severity: 'medium', display_order: 3 },

    // STORAGE AND DRIVE ISSUES
    { category: 'storage', issue_name: 'Full disk', description: 'Storage drive is full', severity: 'medium', display_order: 1 },
    { category: 'storage', issue_name: 'Data corruption', description: 'Files are corrupted or inaccessible', severity: 'high', display_order: 2 },
    { category: 'storage', issue_name: 'Drive not detected', description: 'Storage drive not recognized', severity: 'high', display_order: 3 },

    // SYSTEM ISSUES
    { category: 'software', issue_name: 'Blue screen', description: 'Windows blue screen errors (BSOD)', severity: 'critical', display_order: 1 },
    { category: 'software', issue_name: 'Random restarts', description: 'System restarts without warning', severity: 'high', display_order: 2 },
    { category: 'software', issue_name: 'App errors', description: 'Applications crash or error', severity: 'medium', display_order: 3 },
    { category: 'software', issue_name: "OS won't load", description: 'Operating system fails to boot', severity: 'critical', display_order: 4 },
    { category: 'software', issue_name: "Windows won't start", description: 'Windows cannot start properly', severity: 'critical', display_order: 5 },
    { category: 'software', issue_name: 'Blue screen errors', description: 'BSOD errors', severity: 'critical', display_order: 6 },
    { category: 'software', issue_name: 'Driver conflicts', description: 'Hardware driver issues', severity: 'medium', display_order: 7 },

    // SECURITY ISSUES
    { category: 'security', issue_name: 'Pop-ups', description: 'Unwanted pop-up ads or windows', severity: 'medium', display_order: 1 },
    { category: 'security', issue_name: 'Virus suspected', description: 'System shows signs of malware', severity: 'high', display_order: 2 },
    { category: 'security', issue_name: 'Unknown programs', description: 'Unfamiliar programs installed', severity: 'high', display_order: 3 }
];

async function migrateData() {
    try {
        console.log('🔄 Starting diagnostic issues migration...');
        
        // Check if table exists
        const tableCheck = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'diagnostic_issues'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.log('⚠️ Table diagnostic_issues does not exist. Creating it...');
            
            // Create the table
            await query(`
                CREATE TABLE diagnostic_issues (
                    id SERIAL PRIMARY KEY,
                    category VARCHAR(50) NOT NULL,
                    issue_name VARCHAR(255) NOT NULL,
                    description TEXT,
                    estimated_fix_time VARCHAR(50),
                    estimated_cost DECIMAL(10, 2),
                    severity VARCHAR(20) DEFAULT 'medium',
                    display_order INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(category, issue_name)
                );
                
                CREATE INDEX idx_diagnostic_issues_category ON diagnostic_issues(category);
                CREATE INDEX idx_diagnostic_issues_active ON diagnostic_issues(is_active);
            `);
            
            console.log('✅ Table created successfully');
        }
        
        // Insert or update issues
        let insertedCount = 0;
        let skippedCount = 0;
        
        for (const issue of diagnosticIssues) {
            // Check if issue already exists
            const existing = await query(`
                SELECT id FROM diagnostic_issues 
                WHERE category = $1 AND issue_name = $2
            `, [issue.category, issue.issue_name]);
            
            if (existing.rows.length > 0) {
                skippedCount++;
                continue;
            }
            
            // Insert new issue
            await query(`
                INSERT INTO diagnostic_issues (
                    category, issue_name, description, severity, display_order, is_active
                ) VALUES ($1, $2, $3, $4, $5, true)
            `, [
                issue.category,
                issue.issue_name,
                issue.description,
                issue.severity,
                issue.display_order
            ]);
            
            insertedCount++;
        }
        
        console.log(`✅ Migration completed successfully!`);
        console.log(`   - Inserted: ${insertedCount} new issues`);
        console.log(`   - Skipped: ${skippedCount} existing issues`);
        console.log(`   - Total: ${diagnosticIssues.length} issues`);
        
        // Verify the data
        const countResult = await query('SELECT category, COUNT(*) as count FROM diagnostic_issues WHERE is_active = true GROUP BY category ORDER BY category');
        console.log('\n📊 Issues by category:');
        countResult.rows.forEach(row => {
            console.log(`   - ${row.category}: ${row.count} issues`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
}

migrateData();
