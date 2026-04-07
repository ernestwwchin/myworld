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

  // ═══════════════════════════════════════════════════════
  // REMOTE DEBUG BRIDGE
  // Backend → Frontend via SSE, Frontend → Backend via POST
  // Usage:
  //   1. Frontend connects to /_debug/channel (SSE)
  //   2. Backend sends command via POST /_debug/exec
  //   3. Frontend executes, POSTs result to /_debug/response
  //   4. Backend reads result via GET /_debug/result/:id
  // ═══════════════════════════════════════════════════════

  const debugClients = new Set();   // SSE connections
  const pendingResults = new Map(); // cmdId → { resolve, timer, result }
  let cmdSeq = 0;

  // SSE channel — frontend connects here to receive commands
  app.get('/_debug/channel', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write('data: {"type":"connected"}\n\n');
    debugClients.add(res);
    console.log(`[DebugBridge] Client connected (${debugClients.size} total)`);
    req.on('close', () => {
      debugClients.delete(res);
      console.log(`[DebugBridge] Client disconnected (${debugClients.size} total)`);
    });
  });
  registerRoute('GET', '/_debug/channel');

  // Broadcast a command to all connected frontends
  function broadcastCmd(cmd) {
    const data = JSON.stringify(cmd);
    for (const client of debugClients) {
      client.write(`data: ${data}\n\n`);
    }
  }

  // Send a command to frontend and wait for response
  app.post('/_debug/exec', express.json(), (req, res) => {
    const { cmd, args, timeout } = req.body || {};
    if (!cmd) return res.status(400).json({ error: 'Missing cmd' });
    if (debugClients.size === 0) return res.status(503).json({ error: 'No frontend connected' });

    const id = `cmd_${++cmdSeq}`;
    const waitMs = Math.min(Number(timeout) || 10000, 30000);

    // Set up response waiter
    let resolver;
    const promise = new Promise(resolve => { resolver = resolve; });
    const timer = setTimeout(() => {
      pendingResults.delete(id);
      resolver({ error: 'timeout', id });
    }, waitMs);
    pendingResults.set(id, { resolve: resolver, timer });

    // Send command to frontend
    broadcastCmd({ type: 'exec', id, cmd, args: args || {} });
    console.log(`[DebugBridge] → ${cmd}(${JSON.stringify(args || {})}) [${id}]`);

    // Wait for frontend response
    promise.then(result => {
      res.json({ id, ...result });
    });
  });
  registerRoute('POST', '/_debug/exec');

  // Frontend posts command results here
  app.post('/_debug/response', express.json(), (req, res) => {
    const { id, result, error } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const pending = pendingResults.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      pendingResults.delete(id);
      pending.resolve(error ? { error } : { result });
      console.log(`[DebugBridge] ← ${id} ${error ? 'ERROR: ' + error : 'OK'}`);
    }
    res.json({ ok: true });
  });
  registerRoute('POST', '/_debug/response');

  // Quick state snapshot (no frontend needed — reads last posted logs)
  app.get('/_debug/clients', (_req, res) => {
    res.json({ connected: debugClients.size });
  });
  registerRoute('GET', '/_debug/clients');
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
