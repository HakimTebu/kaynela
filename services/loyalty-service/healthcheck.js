#!/usr/bin/env node

/**
 * Health check script for Kaynela Farms Loyalty Service
 * Used by Docker health checks to verify service status
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3004,
  path: '/health',
  method: 'GET',
  timeout: 5000,
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Loyalty service is healthy');
    process.exit(0);
  } else {
    console.error(`❌ Loyalty service returned status: ${res.statusCode}`);
    process.exit(1);
  }
});

req.on('error', (err) => {
  console.error('❌ Health check failed:', err.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('❌ Health check timeout');
  req.destroy();
  process.exit(1);
});

req.end();
