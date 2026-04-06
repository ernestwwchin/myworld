const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DEBUG_TOOLS = ['1', 'true', 'yes', 'on'].includes(String(process.env.DEBUG_TOOLS || '').toLowerCase());
const DEBUG_LOG_REQUESTS = ['1', 'true', 'yes', 'on'].includes(String(process.env.DEBUG_LOG_REQUESTS || '').toLowerCase());
const DEBUG_TOKEN = process.env.DEBUG_TOKEN || '';

const routeRegistry = [];
const registerRoute = (method, routePath) => {
  routeRegistry.push({ method, path: routePath });
};

const isLocalRequest = (req) => {
  const ip = String(req.ip || req.socket?.remoteAddress || '').toLowerCase();
  return ip === '127.0.0.1' || ip === '::1' || ip.endsWith('127.0.0.1');
};

if (DEBUG_LOG_REQUESTS) {
  app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - started;
      console.log(`[REQ] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    });
    next();
  });
}

if (DEBUG_TOOLS) {
  app.use('/_debug', (req, res, next) => {
    const hasValidToken = !DEBUG_TOKEN || req.get('x-debug-token') === DEBUG_TOKEN || req.query.token === DEBUG_TOKEN;
    if (!isLocalRequest(req) && !hasValidToken) {
      return res.status(403).json({ error: 'Debug tools disabled for non-local requests' });
    }
    return next();
  });
}

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
registerRoute('GET', '/');

app.get('/test', (_req, res) => {
  res.sendFile(path.join(__dirname, 'test.html'));
});
registerRoute('GET', '/test');

app.get('/health', (_req, res) => {
  res.json({ ok: true, uptimeSec: Math.round(process.uptime()) });
});
registerRoute('GET', '/health');

if (DEBUG_TOOLS) {
  app.get('/_debug/health', (_req, res) => {
    res.json({
      ok: true,
      node: process.version,
      platform: process.platform,
      uptimeSec: Math.round(process.uptime()),
      memoryMB: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    });
  });
  registerRoute('GET', '/_debug/health');

  app.get('/_debug/config', (_req, res) => {
    res.json({
      debugTools: DEBUG_TOOLS,
      debugLogRequests: DEBUG_LOG_REQUESTS,
      port: PORT,
      cwd: process.cwd()
    });
  });
  registerRoute('GET', '/_debug/config');

  const debugLogs = [];
  const MAX_DEBUG_LOGS = 5000;

  app.post('/_debug/logs', express.json(), (_req, res) => {
    const payload = _req.body || {};
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...payload
    };
    debugLogs.push(logEntry);
    if (debugLogs.length > MAX_DEBUG_LOGS) debugLogs.shift();
    res.json({ ok: true, totalLogs: debugLogs.length });
  });
  registerRoute('POST', '/_debug/logs');

  app.get('/_debug/logs', (_req, res) => {
    const limit = Math.min(Number(_req.query.limit || 100), MAX_DEBUG_LOGS);
    const offset = Math.max(0, debugLogs.length - limit);
    res.json({
      total: debugLogs.length,
      logs: debugLogs.slice(offset)
    });
  });
  registerRoute('GET', '/_debug/logs');

  app.delete('/_debug/logs', (_req, res) => {
    debugLogs.length = 0;
    res.json({ ok: true, cleared: true });
  });
  registerRoute('DELETE', '/_debug/logs');

  app.get('/_debug/routes', (_req, res) => {
    res.json({ routes: routeRegistry });
  });
  registerRoute('GET', '/_debug/routes');
}

app.use(express.static(path.join(__dirname)));
registerRoute('STATIC', '/');

app.listen(PORT, () => {
  console.log(`RPG server running at http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  if (DEBUG_TOOLS) {
    console.log('Debug tools enabled.');
    console.log(`Debug health: http://localhost:${PORT}/_debug/health`);
    console.log(`Debug config: http://localhost:${PORT}/_debug/config`);
    console.log(`Debug routes: http://localhost:${PORT}/_debug/routes`);
  }
});
