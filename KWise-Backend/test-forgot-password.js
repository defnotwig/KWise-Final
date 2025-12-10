const fetch = require('node-fetch');

async function testForgotPassword() {
    console.log('🔄 Testing forgot password...');
    
    try {
        const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'ludwig.rivera26@gmail.com'
            })
        });

        const data = await response.json();
        
        console.log('Status:', response.status);
        console.log('Response:', data);
        
        if (response.ok) {
            console.log('✅ Reset email sent successfully!');
        } else {
            console.log('❌ Forgot password failed:', data.message);
        }
        
    } catch (error) {
        console.error('❌ Error testing forgot password:', error.message);
    }
}

testForgotPassword();