// Test environment variables in development
console.log('=== Environment Test ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('All REACT_APP_ vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));

// Test API call
const testAPI = async () => {
    console.log('=== API Test ===');
    try {
        const response = await fetch('http://localhost:5000/api/stock/categories');
        const data = await response.json();
        console.log('API Response:', data);
        console.log('Categories count:', data.data ? data.data.length : 0);
    } catch (error) {
        console.error('API Error:', error);
    }
};

// Run test after page loads
if (globalThis.window !== undefined) {
    globalThis.addEventListener('load', () => {
        console.log('Page loaded, running tests...');
        testAPI();
    });
}

export { testAPI };
