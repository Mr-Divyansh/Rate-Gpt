/**
 * Rate GPT — Development Server
 *
 * API app + Vite middleware for HMR. Vite is imported here only.
 * Run with: npm run dev
 */
import { createApiApp } from './server.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

const app = createApiApp();

// Dev-only: serve the React app at /market-price, redirect legacy /app
app.use((req, res, next) => {
  if (req.url === '/app' || req.url.startsWith('/app?') || req.url.startsWith('/app/')) {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(302, '/market-price' + qs);
    return;
  }
  if (req.url === '/market-price' || req.url.startsWith('/market-price?') || req.url.startsWith('/market-price/')) {
    req.url = '/app.html';
  }
  next();
});

console.log('[Server] Initializing Vite middleware in development mode...');
const { createServer: createViteServer } = await import('vite');
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'mpa',
});
app.use(vite.middlewares);

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Attempts to listen on the given port, and retries with incremented port
 * if EADDRINUSE is encountered. Returns the actual port the server is listening on.
 */
async function startServerWithRetry(app: any, basePort: number, maxRetries: number = 10) {
  let attempts = 0;
  let currentPort = basePort;

  while (attempts < maxRetries) {
    attempts++;
    try {
      await new Promise<void>((resolve, reject) => {
        const server = app.listen(currentPort, '0.0.0.0', () => {
          resolve();
        });
        server.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            reject(err);
          } else {
            reject(err);
          }
        });
      });
      // If we get here, the server started successfully
      return currentPort;
    } catch (err: any) {
      if (err.code === 'EADDRINUSE' && attempts < maxRetries) {
        console.log('[Server] Port ' + currentPort + ' is in use, trying port ' + (currentPort + 1));
        currentPort++;
        await wait(100); // Brief delay before retry
      } else {
        console.log('[Server] Error starting server:', err.code || err.message);
        throw err;
      }
    }
  }
  throw new Error('Failed to start server after ' + maxRetries + ' attempts');
}

startServerWithRetry(app, PORT).then((actualPort) => {
  console.log('=========================================');
  console.log(`🌾 Rate GPT Server running on http://localhost:${actualPort}`);
  console.log(`📡 API Endpoints available at http://localhost:${actualPort}/api/v1`);
  console.log(`🏛️ OGD Endpoint: ${process.env.DATA_GOV_API_BASE_URL || 'https://api.data.gov.in/resource'}`);
  console.log(`=========================================`);
}).catch((err) => {
  console.log('[Server] Fatal error starting server:', err);
  process.exit(1);
});
