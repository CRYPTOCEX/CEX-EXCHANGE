/**
 * Maintenance Mode Server
 * A lightweight standalone HTTP server that displays a maintenance page
 * when the main application is stopped.
 *
 * No external dependencies required - uses only Node.js built-in modules.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 3000;
const BACKEND_PORT = process.env.BACKEND_PORT || 4000;
const HOST = '0.0.0.0';

// Read the maintenance HTML page
const htmlPath = path.join(__dirname, 'index.html');
let maintenanceHtml = '';

try {
  maintenanceHtml = fs.readFileSync(htmlPath, 'utf8');
} catch (err) {
  console.error('Failed to read maintenance page:', err.message);
  maintenanceHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>Maintenance</title></head>
    <body style="font-family: sans-serif; text-align: center; padding: 50px;">
      <h1>Under Maintenance</h1>
      <p>We'll be back shortly.</p>
    </body>
    </html>
  `;
}

// Create HTTP server for frontend port
const server = http.createServer((req, res) => {
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Handle health check endpoint
  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'maintenance', message: 'Site is under maintenance' }));
    return;
  }

  // Handle API requests with JSON response
  if (req.url.startsWith('/api/')) {
    res.writeHead(503, {
      'Content-Type': 'application/json',
      'Retry-After': '300'
    });
    res.end(JSON.stringify({
      status: false,
      message: 'Service temporarily unavailable. Maintenance in progress.',
      statusCode: 503
    }));
    return;
  }

  // Serve maintenance page for all other requests
  res.writeHead(503, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Retry-After': '300'
  });
  res.end(maintenanceHtml);
});

// Create HTTP server for backend port (optional - to handle direct backend requests)
const backendServer = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] [BACKEND] ${req.method} ${req.url}`);

  res.writeHead(503, {
    'Content-Type': 'application/json',
    'Retry-After': '300'
  });
  res.end(JSON.stringify({
    status: false,
    message: 'Service temporarily unavailable. Maintenance in progress.',
    statusCode: 503
  }));
});

// Start servers
server.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                    MAINTENANCE MODE                        ║
╠════════════════════════════════════════════════════════════╣
║  Frontend server running on port ${PORT}                      ║
║  Backend server running on port ${BACKEND_PORT}                       ║
║                                                            ║
║  All requests will receive a maintenance response.         ║
║  Run 'pnpm start' to exit maintenance mode.                ║
╚════════════════════════════════════════════════════════════╝
  `);
});

backendServer.listen(BACKEND_PORT, HOST, () => {
  console.log(`Backend maintenance server listening on port ${BACKEND_PORT}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('\nShutting down maintenance servers...');
  server.close(() => {
    console.log('Frontend maintenance server closed');
  });
  backendServer.close(() => {
    console.log('Backend maintenance server closed');
    process.exit(0);
  });

  // Force exit after 5 seconds
  setTimeout(() => {
    console.log('Force exiting...');
    process.exit(0);
  }, 5000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
