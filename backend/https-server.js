/**
 * HTTPS Server for EmoEdu
 * This creates a secure server that allows camera access on mobile devices
 */

const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');
const os = require('os');

// Import original server components
const originalServer = require('./server');

// Create https certificate paths - will generate these
const keyPath = path.join(__dirname, 'server.key');
const certPath = path.join(__dirname, 'server.cert');

// Generate self-signed certificate if it doesn't exist
if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.log('Generating self-signed certificate for HTTPS...');
  
  // Create openssl commands based on OS
  let opensslCommand;
  
  if (os.platform() === 'win32') {
    // Windows command - make sure OpenSSL is installed
    opensslCommand = 'openssl req -nodes -new -x509 -keyout server.key -out server.cert -subj "/CN=localhost" -days 365';
  } else {
    // Unix command
    opensslCommand = 'openssl req -nodes -new -x509 -keyout server.key -out server.cert -subj "/CN=localhost" -days 365';
  }
  
  try {
    // Synchronously execute the OpenSSL command
    require('child_process').execSync(opensslCommand, {
      cwd: __dirname,
      stdio: 'inherit'
    });
    console.log('Self-signed certificate generated successfully');
  } catch (error) {
    console.error('Failed to generate certificate:', error.message);
    console.log('Falling back to fake certificate...');
    
    // Create minimal self-signed certificate
    const fakeCert = `-----BEGIN CERTIFICATE-----
MIIDBzCCAe+gAwIBAgIJALB+ZxnI6IodMA0GCSqGSIb3DQEBCwUAMBoxGDAWBgNV
BAMMD3d3dy5leGFtcGxlLmNvbTAeFw0yMTAxMDEwMDAwMDBaFw0yMjAxMDEwMDAw
MDBaMBoxGDAWBgNVBAMMD3d3dy5leGFtcGxlLmNvbTCCASIwDQYJKoZIhvcNAQEB
BQADggEPADCCAQoCggEBALgrXtAZHxAD8GcDOx7C3p3UrfG6KpCgSOmj3hVghzsR
FFZHEkr6po1twVo+jX3R5BDpdPxs58xCmCM9reHEL4bfcFFdNxuXdn6wGqdCpaBQ
jkRkAj5GGxO+aNbvW7VX1+m8seYNTskhM5EUxcIUOVGzR9sCGGMVkK5NY2DIY9gu
/hy9J1fxNsONzSQcHKr5eSXl1VBKJtTJvSrFPgLOEQgwJhYyb7TNorFGgWAEh3vi
zGayNuQAJXYbO6QYmvMkftpCMg5ONpVSuyOoAEGKJLMBzqImYUV3iMlQZmA0O1h9
J66o5XNlzaAWDKVT7hPXA0ZiLhyHwWA8wDpRYHRKcAsCAwEAAaNQME4wHQYDVR0O
BBYEFE/fAvQ+IRu8jSJ4nCnj/KvnxOLUMB8GA1UdIwQYMBaAFE/fAvQ+IRu8jSJ4
nCnj/KvnxOLUMAwGA1UdEwQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAGCW0Kqv
Dh1V8jq2bOuNLl7CyUwYoGz5kBzLM3BnX1zFrQ85FCJKWwANHLQHQpSEcEt+bQcD
SqfuLPOy0j2n7fiE9RlWAGUkcW5Uyp2bLXG0k6I5S8+DNu7PoUMzpD+GKvbSFjYQ
7u7aaTtJadqI5OkKIQf9b3VvYSfCuwg/JJG79FjOcJAIpRPMW9kB4qlBOWxSocS4
4IltYaMt8I/iAY1UTytC4zvG9Z60KUQFdD5RX5L3lVJJLK8rHjrXt0gDN/JkQHvZ
BbhZQWJ+B+a6k+vosSBXhUOjXLOO8CJxJRE1mUEYkSnCA4/2HsbhxG8vQqtHEL4a
vYFNLG9R6nZY9qo=
-----END CERTIFICATE-----`;

    const fakeKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4K17QGR8QA/Bn
Azsewt6d1K3xuiqQoEjpo94VYIc7ERRWRxJK+qaNbcFaPo190eQQ6XT8bOfMQpgj
Pa3hxC+G33BRXTcbl3Z+sBqnQqWgUI5EZAI+RhsTvmjW71u1V9fpvLHmDU7JITCR
FMXCFDlRs0fbAhhjFZCuTWNgyGPYLv4cvSdX8TbDjc0kHByq+Xkl5dVQSibUiRo
9GVGE79XSJl/Km+S5/MwKcxZe0A4aLn7AAzW5hIzc5Ju3x+4j75pSbxLqJ3Dgx7
n2BRzPyURib0K5OjYJdTYvEnjLtZ4LRx9LRArHqdgiGcuFZzFJzIBu3cRA+V3ZT8
V9CVDGQJDAgMBAAECggEAfOL9c5R6oFYLHWVLLVEwR1QkNHFh7UQ5vvnw7HDxAzVH
cSdKxcM39lJXm5nV7cZWbBD3dkRiRKA1+f/saCRvh2gUV9H5eoOUQMmMrS3+UTsZ
vwlq9tZZM9gM+iL9sWOYX5xJQvHDOBOzXK/Hj5XjpBLclsLExQpdhy+8I6+Xg62C
MnHnYB5IlssY70ZMGXKb/xN3+ZQI7QoJZ/4XvDTWGSvNpy+UoGsZbEZLPJ+o64LX
1+qhvHaAHJ+W4QIDAQABAoIBAHHIPibxOkzmKC1UtIZFy9K5CgFEQf9jQOMqxaE0
Z8Ec9+M8ArQXQk7q4B7fFf8IIgUgFoF0m3n6MgoCLbVrqZ0j9TQ3jI5wYJcYEPpw
1TbJEr23fgf3SbTOUYLY8sJ2T0HJmG5QZpEowRU+BWX0DQcDXXM3B/aKGeCi6qe7
KzbkCfNGGH/zH2P7Sl4vKrU1/GCTsl/XKZQcHCOGXXUUVW8N3gSKrI9YKQH/RoZ2
YxUZHPXHTgYcKtX4/oIOx01Ak06Ar7TKKgUyW0Gfq9i8ZGsHcJYyPUCKBc0+SLrg
3FxIx7yqNfw+h0BkHOUzDMgrxhOaK9oTsrQ/h1FUzHzAAbECgYEA4U+7Sz/aeTQc
vYdA1aFmlvYlfJZDC8QQqiX32YpKk/0IUr1BfnTPV1L8YH2vIyXbTxpnDcaCm0Ya
wLqQ6TYYTkLX3vzTLuLXTHdFCHyuywwi9DQVVlNxGjdQxLZ+8/pGR5YdXpx6pi6N
zUwJfGEkT7qM8WOQzBKbVBGnFy+3pEUCgYEA0RvbXYjBPldP24vnJC0OIxvHRi7a
S35GCuHKYeUMMJ2tvlXSL/rISXX8vUzBuVkBNVOcCBqylZGqM6QoDY8TkKfP4In6
1T5yRSy3TRbIvOkQtIQdL9B9huBwIbyJFPUWSFj5mE1PmOMlUm1v1XE18RsNHPIw
3fTMDXMcScyCwUcCgYARPxucZCZHN2Craop6ART1hYav6jHZ0dHWc1vNFC2C0Knd
xHFRaHzwfzD8gZZ5TcmLJM9QVwUyxYoRsqkRLLBJoLB+tPnJMdGbbn9TG5ctW0Ti
JrVhbYkIJpwxovzK9wqYfzE2SsPfakwiMIUJjv1RSeTmKgxnv07KNnlY7lK6QQKBn
oIB4SvF0RO4KGDQyQhBFChz7rASjRvqb4YR+AVaMuBSRuwU2QkLCN7yJnCUt7e8c
/JWMVj9YDKIFZ6OuJjnXRxDr+8gXTkuXIe2jV2Vl7GXXFoPRlW8WpPmpkdcCgYEA
JlfVXIRxb1lTPrCQNcKVIYNd+UyQxvE+rO2iCe1agLXqHQtJm9OoCkCKo/qFDj0g
Pb0dHf/XgTP7iEgkIAs+HzlFS1iCZRJ4TndHDOxo9SRlV1TsW8mA1x6J8iGjp3I=
-----END PRIVATE KEY-----`;

    fs.writeFileSync(keyPath, fakeKey);
    fs.writeFileSync(certPath, fakeCert);
    console.log('Fallback certificate created');
  }
}

// Create HTTPS server
const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

// Create Express app instance
const app = express();

// Add body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use same cors settings as original server
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Set security headers for camera access
app.use((req, res, next) => {
  // Set security headers
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Allow access to camera/mic from all origins for WebRTC
  res.setHeader('Feature-Policy', "camera *; microphone *");
  res.setHeader('Permissions-Policy', "camera=*, microphone=*");
  
  // Add Cross-Origin headers to support WebRTC
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Create proxy to the main server for API routes
app.all('/api/*', (req, res) => {
  const targetUrl = `http://localhost:5001${req.url}`;
  
  // Forward the request using node-fetch instead of request (which is deprecated)
  const http = require('http');
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: req.url,
    method: req.method,
    headers: {
      'Authorization': req.headers.authorization || '',
      'Content-Type': 'application/json'
    }
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (error) => {
    console.error('Proxy error:', error);
    res.statusCode = 500;
    res.end('Proxy error: ' + error.message);
  });
  
  // If there's a request body, write it to the proxy request
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    proxyReq.write(JSON.stringify(req.body));
  }
  
  proxyReq.end();
});

// For any other routes, serve the main HTML
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start HTTPS server on port 5443
const PORT = 5443;
const httpsServer = https.createServer(httpsOptions, app);

httpsServer.listen(PORT, () => {
  console.log(`\n🔒 Secure EmoEdu server running at:`);
  console.log(`   • HTTPS: https://localhost:${PORT}`);
  console.log(`\n⚠️  Important: When accessing from mobile devices on your network, use your IP address:`);
  
  // Get network IPs
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const k in interfaces) {
    for (const k2 in interfaces[k]) {
      const address = interfaces[k][k2];
      if (address.family === 'IPv4' && !address.internal) {
        addresses.push(address.address);
        console.log(`   • https://${address.address}:${PORT}`);
      }
    }
  }
  
  console.log(`\n⚠️  Note: You'll need to manually accept the self-signed certificate in your browser.`);
  console.log(`   (You will see a security warning - this is normal for development)`);
}); 