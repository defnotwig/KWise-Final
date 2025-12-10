const axios = require('axios');

const testData = {
  currentProduct: {
    id: 1,
    name: 'Intel Core i5-12400F',
    category: 'CPU',
    brand: 'Intel',
    price: 15000,
    specifications: 'LGA1700 socket, 6 cores, 12 threads'
  }
};

console.log('🔍 Testing Compatibility API...');

axios.post('http://localhost:5000/api/compatibility/analyze', testData)
  .then(response => {
    console.log('✅ Compatibility API Working:');
    console.log('Status:', response.status);
    console.log('Compatible Products Found:', response.data.data?.length || 0);
    if (response.data.data?.length > 0) {
      console.log('Sample Product:', response.data.data[0].name);
      console.log('Sample Score:', response.data.data[0].compatibility_score);
    }
    console.log('Full Response:', JSON.stringify(response.data, null, 2));
  })
  .catch(error => {
    console.log('❌ Compatibility API Error:', error.response?.status || error.message);
    console.log('Error Details:', error.response?.data || error.message);
  });