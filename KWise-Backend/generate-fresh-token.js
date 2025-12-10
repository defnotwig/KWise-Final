const axios = require('axios');

async function generateFreshToken() {
  try {
    console.log('Generating fresh reset token...');
    
    const response = await axios.post('http://localhost:5000/api/auth/forgot-password', {
      email: 'ludwig.rivera26@gmail.com'
    });
    
    console.log('✅ Fresh token generated:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error generating token:', error.response?.data || error.message);
  }
}

generateFreshToken();