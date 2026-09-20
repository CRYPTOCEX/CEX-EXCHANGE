/**
 * Maintenance Mode Server
 * A lightweight standalone HTTP server that displays a maintenance page
 * when the main application is stopped.
 *
 * No external dependencies required - uses only Node.js built-in modules.
 *
 * WHICH PORTS IT COVERS, AND WHY NOT 4001.
 * A deployment is three PM2 apps: `frontend` (3000), `backend` (the API port),
 * and `cron` (4001). This server answers on the first two, which are the two
 * that something outside the box connects to — a browser, a load balancer, a
 * webhook, the frontend calling the API.
 *
 * 4001 is deliberately left alone. The `cron` app binds it for one reason only:
 * to avoid EADDRINUSE against the web backend, because both run the same entry
 * point and it has to bind something. Nothing connects to it — not the
 * frontend, not a health check, not a load balancer (production.config.js says
 * so in as many words) — so a 503 there would be a 503 nobody asks for. Binding
 * it would cost something real, too: an operator who found a listener on 4001
 * during maintenance would reasonably conclude it was a supported endpoint, and
 * it would be one more socket to release in the moment `pnpm start` needs the
 * cron process to take that port back.
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

/**
 * A port this server cannot bind is a FAILED STOP, not a cosmetic problem.
 *
 * Without this handler an EADDRINUSE arrived as an unhandled 'error' event: the
 * process died, PM2's autorestart brought it straight back, and it crash-looped
 * silently — while `pnpm stop` printed "Maintenance mode activated!", because
 * all it checked was that the `pm2 start` command exited 0. The state that
 * hides behind that is the dangerous one: something IS still serving on the
 * port, so the app the operator believes they just stopped is still up, still
 * writing to a database that `pnpm updator` is about to migrate and seed.
 *
 * Exit 78 (EX_CONFIG), which maintenance.config.js lists in `stop_exit_codes`,
 * so PM2 stops the app with this message on screen instead of scrolling it away
 * behind sixteen restarts. It is the same convention the backend uses for the
 * misconfigurations a restart cannot fix.
 */
const onBindError = (label, port) => (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(
      `\n  MAINTENANCE MODE DID NOT START: port ${port} (${label}) is already in use.\n` +
        `\n  Something is still serving on it, which means the process this port belongs to was` +
        `\n  NOT stopped. Do not proceed with an update: a live backend against a database being` +
        `\n  migrated and seeded is how data gets damaged.` +
        `\n\n    pm2 list                     what PM2 still has running` +
        `\n    pm2 delete backend frontend cron` +
        (process.platform === 'win32'
          ? `\n    netstat -ano | findstr :${port}   what owns the port`
          : `\n    lsof -i :${port}                  what owns the port`) +
        `\n`
    );
  } else {
    console.error(`\n  MAINTENANCE MODE DID NOT START: could not bind ${label} port ${port}:`, err);
  }
  process.exit(78);
};

server.on('error', onBindError('frontend', PORT));
backendServer.on('error', onBindError('backend', BACKEND_PORT));

// Start servers
server.listen(PORT, HOST, () => {
  // Padded rather than hand-spaced: the ports are read from the environment
  // now, so a 5-digit port used to push the right-hand border off the box.
  const WIDTH = 60;
  const row = (text) => `║${text.padEnd(WIDTH).slice(0, WIDTH)}║`;
  console.log(
    [
      '',
      `╔${'═'.repeat(WIDTH)}╗`,
      row('                    MAINTENANCE MODE'),
      `╠${'═'.repeat(WIDTH)}╣`,
      row(`  Frontend maintenance page on port ${PORT}`),
      row(`  Backend maintenance API on port ${BACKEND_PORT}`),
      row(''),
      row('  All requests will receive a maintenance response.'),
      row('  The scheduler (the `cron` app) is stopped too, so'),
      row('  nothing scheduled runs while this page is up.'),
      row("  Run 'pnpm start' to exit maintenance mode."),
      `╚${'═'.repeat(WIDTH)}╝`,
      '',
    ].join('\n')
  );
});

backendServer.listen(BACKEND_PORT, HOST, () => {
  console.log(`Backend maintenance server listening on port ${BACKEND_PORT}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('\nShutting down maintenance servers...');

  // close() alone only stops NEW connections: a browser parked on the
  // maintenance page holds a keep-alive socket, and the callback would not fire
  // until it went away. That matters here because the very next thing to happen
  // is `pnpm start` binding these same ports — a maintenance server still
  // holding 3000 is a frontend that cannot start. Drop the sockets explicitly.
  server.closeAllConnections?.();
  backendServer.closeAllConnections?.();

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
