/**
 * Simple script to serve the test HTML page
 */

const express = require('express');
const path = require('path');

const app = express();

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve the test login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-login.html'));
});

// Start server
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Test page available at: http://localhost:${PORT}`);
}); 