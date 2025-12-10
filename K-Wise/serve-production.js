// Simple static server for testing production build
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static files from build directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle React routing - send all requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Frontend serving on:`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  console.log(`   - Network: http://192.168.100.7:${PORT}`);
  console.log(`✅ Backend running on: http://localhost:5000`);
  console.log(`✅ Ready for testing!`);
});
