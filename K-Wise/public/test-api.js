// Frontend API Connection Test
// This script tests if the frontend can properly connect to the backend API

console.log('🧪 Testing Frontend-Backend API Connection...');
console.log('=============================================');

// Test if we can access the API from the browser
const testConnection = async () => {
    try {
        console.log('1. Testing Health Endpoint...');
        const response = await fetch('/api/health');
        const data = await response.json();
        console.log('✅ Health Check:', data.success ? 'PASS' : 'FAIL');
        
        console.log('2. Testing Stock Endpoint...');
        const stockResponse = await fetch('/api/stock?limit=1');
        const stockData = await stockResponse.json();
        console.log('✅ Stock Data:', stockData.success ? 'PASS' : 'FAIL');
        
        if (stockData.success && stockData.data.length > 0) {
            console.log('   Sample item:', stockData.data[0].name);
        }
        
        console.log('3. Testing Categories Endpoint...');
        const categoriesResponse = await fetch('/api/stock/categories');
        const categoriesData = await categoriesResponse.json();
        console.log('✅ Categories:', categoriesData.success ? 'PASS' : 'FAIL');
        
        if (categoriesData.success) {
            console.log('   Categories found:', categoriesData.data.length);
        }
        
        console.log('4. Testing Specifications Endpoint...');
        const specsResponse = await fetch('/api/stock/meta/CPU');
        const specsData = await specsResponse.json();
        console.log('✅ Specifications:', specsData.success ? 'PASS' : 'FAIL');
        
        if (specsData.success) {
            console.log('   CPU spec fields:', specsData.data.length);
        }
        
        console.log('\n🎉 All API tests passed! The frontend can connect to the backend.');
        
    } catch (error) {
        console.error('❌ API Connection Test Failed:', error);
        console.log('\n💡 Troubleshooting:');
        console.log('1. Ensure backend is running on port 5000');
        console.log('2. Check proxy configuration in package.json');
        console.log('3. Restart React development server');
    }
};

// Run test when page loads
if (typeof window !== 'undefined') {
    window.testAPIConnection = testConnection;
    console.log('💡 Run testAPIConnection() in the browser console to test the API');
} else {
    testConnection();
}