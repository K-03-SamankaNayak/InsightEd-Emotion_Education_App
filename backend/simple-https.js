/**
 * Simple HTTPS Server for EmoEdu
 * A basic implementation for mobile camera access
 */

const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const os = require('os');
const crypto = require('crypto');
const selfsigned = require('selfsigned');

// Certificate path
const keyPath = path.join(__dirname, 'server.key');
const certPath = path.join(__dirname, 'server.cert');

// Generate SSL Certificate
try {
  // Generate a self-signed certificate
  console.log('Generating SSL certificate...');
  
  // Create a simple self-signed certificate with pure Node.js
  const pems = selfsigned.generate([{ name: 'commonName', value: 'localhost' }], {
    days: 365,
    algorithm: 'sha256',
    keySize: 2048,
    extensions: [
      { name: 'basicConstraints', cA: true },
      { name: 'keyUsage', keyCertSign: true, digitalSignature: true, nonRepudiation: true, keyEncipherment: true, dataEncipherment: true },
      { name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }] }
    ]
  });
  
  // Write certificate files
  fs.writeFileSync(keyPath, pems.private);
  fs.writeFileSync(certPath, pems.cert);
  
  console.log('Certificate files created successfully');
} catch (error) {
  console.error('Error generating certificates:', error);
  console.log('Trying backup method...');
  
  try {
    // Create a simple key pair
    // Write key files directly with hard-coded content
    fs.writeFileSync(keyPath, 
`-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEAx6fiI1LvWQHzwDRZoEGn9m4EslWb/A3R7fYMh6Rn7WycC7v+
sFOFUHZiJBd8QqUQZUEYx/bZ6z9JyNVjXr8CdZ/c6V1nL5Ke4RUdDZlmVclv/LqL
lXdZOLH4nHhzYL85HZHTt+1n6K8cTLpRp2URwOcvVKXQULbwXZ04rIZP+NGQavIV
4mlP/Jvc9yg54QDY8xpg+lGnEgCyLmo0YMXXsMa/JGGKfAkCEh9nDkMatFeOKVQA
acbvB8FhSDlz/9I9Yzppm5FVG1+bfwAokTlkEXd5n7wIYcfCS/QJJfYj6yOgXQSZ
jbN6oNHxduu+8MxVlP3JNsDyELjHYVrW/qC0EQIDAQABAoIBAAwCLHOa/cQXJ+9h
Hxqu9w4sK5ZRymJ/EWBfisHVBPV/RL8/mVYHXEH1fEcWP2b46a/2QMg02bSCxsDI
jEHKYMdlq6Za/sLlY6dGQhQV9D+4EwOCNkMlMjzVkqfR3hKKOLO5zVdOJkX3Cwfm
kBkb8SSm6WcPp0lTYTCmdpxvVyTwzGHDDJGpW8NLb0MJvU1M/Ty2tL9w3IXrQQcY
iQ4rOfZCp8dPVKmrJiNscr92SjbeXwwaVq5RXwMRlQ8QQlSCKYmBV1LL2uPdMNsM
x5c6aa5Wl4/O5y56Rj4bqAsjLYStpbLZE+tWfVFfSUnUlSsN/R+fvF9OtzW9t0cC
ByVmhkECgYEA+YYxR1PLtKw/jMHQlX3XynWbpqcwCpXQK0Z68lsD1IkBzKaZcNLW
TNUrGP0LkPDkZx0zNQUGyu9CgtgOZpJEQnR6Q3CI/YMBQhRxbBmNVm2ItaD7JDS4
V7PCDSPkJ4SsRBPskCU61/+suC6J8XsEWyQOKOKdnSrAm9OMnCLp/X0CgYEAzMKI
bsm5mJLQyfFZOzVt3jXm1qsF5nMp7KQX2B9hFRrhVC4JVpchJzQMyBwvHtQrC3r9
/Vv/xkHMhyFOVYDH9bmILMIXXVj8Sd1O7mTkKLOjnMCHcBcKnhsLQ9bnhtGz2lvP
jSQFpJ/EzdOCXLzT4krN6OLxzrVFS7uKcPNyoVUCgYEAuiJOzTLUdA2GGV9yqXbZ
cS8lsJQH5DvOAgWiS2UBFyBroesRYa3pU2LX/IHKCb+8LUQ5fKx5XOJ56NJzOhgd
6AY9ZtKL9oHIgEpP28lyUMY4FlPg6P9dYYrUKbQJ8HNTYfss9nYn0zQzPxgQ3Brb
mVUVXwOW0mjm6UJ0OE6O8BkCgYEAvCDbFwh+uXHcnImpOTLKO95c8XCY0oO/YQ0d
SrNvwSVPOeKbXpwXXc2lbOZ8BdXLRToUfQQ9I6/1XPe5UM85TXhcmfDsDnVmUpPT
Q8H5Sp1uVbMIRbklVYCsYdnHxaZNIQ9ByFCLgcVKwB+9TU5Ew8cnSxStaWKXVrjn
iQAx2YUCgYEAxYgOqDl0FSYEA5hOJGRoPmktRbR9G1K8h8rSQH2AB/YmMZFDP8FR
hc5cXdFsoChyxlBXZLR76J6NKaqj+3fhEqW3zKyiFRfkzSlsDBEqQQ3WgxdvP5RQ
ZOvXR8+GQQvjdvYNYZIKqNpCw65sUCu8C6JuVVhWceSFMxuGzTc4XmQ=
-----END RSA PRIVATE KEY-----`);

    fs.writeFileSync(certPath, 
`-----BEGIN CERTIFICATE-----
MIIDBjCCAe4CCQDmPu2QAJ3fMDANBgkqhkiG9w0BAQsFADBFMQswCQYDVQQGEwJV
UzETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50ZXJuZXQgV2lkZ2l0
cyBQdHkgTHRkMB4XDTIyMDIyMzE5MjMxN1oXDTMyMDIyMTE5MjMxN1owRTELMAkG
A1UEBhMCVVMxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoMGEludGVybmV0
IFdpZGdpdHMgUHR5IEx0ZDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB
AMen4iNS71kB88A0WaBBp/ZuBLJVm/wN0e32DIekZ+1snAu7/rBThVB2YiQXfEKl
EGVBGMf22es/ScjVY16/AnWf3OldZy+SnuEVHQ2ZZlXJb/y6i5V3WTix+Jx4c2C/
OR2R07ftZ+ivHEy6UadlEcDnL1Sl0FC28F2dOKyGT/jRkGryFeJpT/yb3PcoOeEA
2PMaYPpRpxIAsi5qNGDF17DGvyRhinwJAhIfZw5DGrRXjilUAGnG7wfBYUg5c//S
PWM6aZuRVRtfm38AKJE5ZBF3eZ+8CGHHwkv0CSX2I+sjoF0EmY2zeqDR8XbrvvDM
VZT9yTbA8hC4x2Fa1v6gtBECAwEAATANBgkqhkiG9w0BAQsFAAOCAQEASeQvOxrE
QMyZ+KTKXPyT0kHD0YWFrfNK4S8C9jvqNgLYCy1GRDEyKQ2JrZe33hD3zi+FPQwH
dXQoMeWn7H1ql9KPKYdpBernvG+47gX08dNEfFJbwT5FyAm2WNKM/7F5iqdJFVbt
Yv/HJunCLdKmFpZ83kCHjWVF9D8bslTL/LFmvQR2Qj5q1dVECgVjWrqr5HJfGG4v
iDsGEdQ1/2YGgp7mrRXd7xbH+eMI4GHfvSIUYmYKCKHkz/N/J9kKxsgxcz5yLMHF
RLNqmJDIq5rv772unv4iV1/1rFvAYDk5Rn3AsiLNOSaLZN2y7YFxygHkXYQFaCKc
oqy93S4h9Fqecw==
-----END CERTIFICATE-----`);
    
    console.log('Certificate files created with backup method');
  } catch (backupError) {
    console.error('Even backup certificate method failed:', backupError);
    process.exit(1);
  }
}

// Create Express app
const app = express();

// Use middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Set headers for camera access
app.use((req, res, next) => {
  res.setHeader('Feature-Policy', "camera *; microphone *");
  res.setHeader('Permissions-Policy', "camera=*, microphone=*");
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Proxy API requests to main server
app.all('/api/*', (req, res) => {
  console.log(`Forwarding API request to: ${req.url}`);
  
  // Create a very simple HTTP proxy
  const http = require('http');
  
  // Clone the headers but make sure we send the right content type
  const headers = { ...req.headers };
  headers['Content-Type'] = 'application/json';
  
  // Debug request info
  console.log(`Proxy Request: ${req.method} ${req.url}`);
  console.log(`Authorization: ${headers.authorization ? 'Bearer token present' : 'No auth token'}`);
  
  // Setup the request options
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: req.url,
    method: req.method,
    headers: headers
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    // Log response info
    console.log(`Proxy Response: ${proxyRes.statusCode} for ${req.url}`);
    
    // Set status and headers from the proxied response
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    
    // Pipe the response from the target server back to the client
    proxyRes.pipe(res);
  });
  
  // Handle errors
  proxyReq.on('error', (e) => {
    console.error('Proxy error:', e.message);
    console.error('Error details:', e);
    res.status(502).json({
      error: 'Bad Gateway',
      message: 'Error connecting to the API server',
      details: e.message
    });
  });
  
  // If there's a body with the request, send it along
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyData = JSON.stringify(req.body);
    console.log(`Request body: ${bodyData}`);
    proxyReq.write(bodyData);
  }
  
  // End the request
  proxyReq.end();
});

// Default route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Create HTTPS server
const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

// Start HTTPS server
const PORT = 5443;
const server = https.createServer(httpsOptions, app);

server.listen(PORT, () => {
  console.log(`\n🔒 HTTPS Server running on port ${PORT}`);
  console.log(`\n📱 Access URLs:`);
  console.log(`   • Local: https://localhost:${PORT}`);
  
  // Get network IPs for mobile access
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`   • Mobile: https://${iface.address}:${PORT}`);
      }
    }
  }
  
  console.log(`\n⚠️  You will need to accept the self-signed certificate warning in your browser`);
  console.log(`   This is normal for development environments`);
}); 