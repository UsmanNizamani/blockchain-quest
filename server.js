import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

const server = http.createServer((req, res) => {
  // Normalize and parse URL
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') {
    reqPath = '/index.html';
  }

  // Safe file path resolution within project directory
  const safePath = path.normalize(path.join(__dirname, reqPath));
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${reqPath}`);
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  });
});

function startServer(port) {
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[ERROR] Port ${port} is already in use.`);
      console.error('Another instance of Blockchain Quest may already be running.');
      console.error('To fix this:');
      console.error('  Close any open Blockchain Quest windows');
      console.error(`  Or change PORT in this file to 3001`);
      console.error(`  Or (Windows): netstat -ano | findstr :${port}`);
      console.error('     then:      taskkill /PID <pid> /F');
      console.error(`  Or (Mac/Linux): lsof -ti:${port} | xargs kill -9\n`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log('\n===============================================');
    console.log(' Blockchain Quest | Server running');
    console.log(` Open: http://localhost:${port}`);
    console.log(' Stop: Press Ctrl+C');
    console.log('===============================================\n');

    if (process.argv.includes('--test')) {
      console.log('Test flag detected. Server successfully verified. Shutting down.');
      server.close(() => process.exit(0));
    }
  });

  process.on('SIGINT', () => {
    console.log('\nStopping Blockchain Quest server...');
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });
  });
}

startServer(PORT);
