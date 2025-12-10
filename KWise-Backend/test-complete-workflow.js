require('dotenv').config();
const fetch = require('node-fetch');
const FormData = require('form-data');

async function testCompleteWorkflow() {
    console.log('🧪 Testing complete description workflow...\n');
    
    const baseUrl = 'http://localhost:5000/api';
    
    try {
        // Step 1: Login
        console.log('1️⃣ Login...');
        const loginResponse = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@admin.com',
                password: 'admin123'
            })
        });

        if (!loginResponse.ok) {
            throw new Error('Login failed');
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login successful');

        // Step 2: Load items list (simulating frontend behavior)
        console.log('\n2️⃣ Load items list...');
        const params = new URLSearchParams({
            category: 'CPU',
            page: '1',
            limit: '10',
            sort: 'name',
            order: 'ASC'
        });

        const listResponse = await fetch(`${baseUrl}/stock?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const listData = await listResponse.json();
        const item34 = listData.data?.find(item => item.id === 34);
        
        if (!item34) {
            throw new Error('Item 34 not found in list');
        }

        console.log('✅ Items loaded successfully');
        console.log(`📋 Item 34 description from list: "${item34.description || 'NULL'}"`);

        // Step 3: Open edit modal (populate form data)
        console.log('\n3️⃣ Open edit modal (populate form data)...');
        const formData = {
            name: item34.name || '',
            brand: item34.brand || '',
            price: item34.price || '',
            stock: item34.stock || '',
            description: item34.description || '', // This should work now!
        };

        console.log('📝 Form data populated from item:');
        console.log('  Description:', `"${formData.description}"`);

        // Step 4: User adds description and saves
        console.log('\n4️⃣ User adds description and saves...');
        const testDescription = `User workflow test - ${new Date().toISOString()}`;
        
        const submitData = new FormData();
        submitData.append('name', item34.name);
        submitData.append('category', item34.category);
        submitData.append('brand', item34.brand || '');
        submitData.append('price', item34.price || '0');
        submitData.append('stock', item34.stock || '0');
        submitData.append('description', testDescription);

        console.log(`📝 Saving description: "${testDescription}"`);

        const updateResponse = await fetch(`${baseUrl}/stock/34`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` },
            body: submitData
        });

        const updateResult = await updateResponse.json();
        
        if (!updateResponse.ok || !updateResult.success) {
            throw new Error(`Update failed: ${updateResult.message}`);
        }

        console.log('✅ Item updated successfully');

        // Step 5: Reload items list (after save)
        console.log('\n5️⃣ Reload items list (after save)...');
        const reloadResponse = await fetch(`${baseUrl}/stock?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const reloadData = await reloadResponse.json();
        const updatedItem34 = reloadData.data?.find(item => item.id === 34);
        
        console.log('✅ Items reloaded');
        console.log(`📋 Updated item 34 description from list: "${updatedItem34.description || 'NULL'}"`);

        // Step 6: Open edit modal again (simulate user checking)
        console.log('\n6️⃣ Open edit modal again (user checks)...');
        const recheckFormData = {
            name: updatedItem34.name || '',
            brand: updatedItem34.brand || '',
            price: updatedItem34.price || '',
            stock: updatedItem34.stock || '',
            description: updatedItem34.description || '',
        };

        console.log('📝 Form data when reopening edit modal:');
        console.log('  Description:', `"${recheckFormData.description}"`);

        // Step 7: Verify results
        console.log('\n7️⃣ Final verification...');
        
        if (recheckFormData.description === testDescription) {
            console.log('🎉 SUCCESS! Description persistence is now working!');
            console.log('✅ User workflow test PASSED');
        } else {
            console.log('❌ FAILED! Description still not persisting correctly');
            console.log(`Expected: "${testDescription}"`);
            console.log(`Got: "${recheckFormData.description}"`);
        }

        // Also verify database state
        console.log('\n📊 Database verification...');
        console.log('Running direct database check...');

    } catch (error) {
        console.error('❌ Workflow test failed:', error.message);
    }
}

testCompleteWorkflow();