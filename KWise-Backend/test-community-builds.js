const { query } = require('./config/db');

async function checkCommunityBuilds() {
    try {
        console.log('🔍 Checking for Community Builds in database...\n');
        
        const result = await query(`
            SELECT 
                id,
                name,
                brand,
                price,
                tier,
                is_active,
                kiosk_visible,
                specifications->>'buildSource' as build_source,
                specifications->>'approvalStatus' as approval_status,
                created_at
            FROM pc_parts
            WHERE category = 'Pre-Built'
              AND specifications->>'buildSource' = 'community'
            ORDER BY created_at DESC
        `);

        if (result.rows.length === 0) {
            console.log('❌ NO COMMUNITY BUILDS FOUND IN DATABASE');
            console.log('This means auto-save is NOT working or no orders have been placed yet.\n');
        } else {
            console.log(`✅ FOUND ${result.rows.length} COMMUNITY BUILD(S):\n`);
            result.rows.forEach((build, index) => {
                console.log(`[${index + 1}] ${build.name}`);
                console.log(`    ID: ${build.id}`);
                console.log(`    Brand: ${build.brand}`);
                console.log(`    Price: ₱${build.price}`);
                console.log(`    Tier: ${build.tier}`);
                console.log(`    Status: ${build.approval_status}`);
                console.log(`    is_active: ${build.is_active}`);
                console.log(`    kiosk_visible: ${build.kiosk_visible}`);
                console.log(`    Created: ${build.created_at}`);
                console.log('');
            });
        }

        // Check recent orders
        console.log('\n📋 Checking recent PC Customized orders...\n');
        const orders = await query(`
            SELECT 
                order_id_formatted,
                transaction_id_formatted,
                service_type,
                total_amount,
                created_at
            FROM orders
            WHERE service_type IN ('pc-customized', 'pc-customized-ai', 'prebuilt-pc')
            ORDER BY created_at DESC
            LIMIT 10
        `);

        if (orders.rows.length === 0) {
            console.log('No recent PC Customized orders found.');
        } else {
            console.log(`Found ${orders.rows.length} recent PC Customized order(s):\n`);
            orders.rows.forEach((order, index) => {
                console.log(`[${index + 1}] ${order.order_id_formatted} | ${order.service_type} | ₱${order.total_amount} | ${order.created_at}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkCommunityBuilds();
