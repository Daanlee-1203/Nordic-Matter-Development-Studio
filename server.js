const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const board = require('./engine/board_engine');
const matter = require('./engine/matter_adapter');
const jlink = require('./engine/jlink_adapter');
const power = require('./engine/power_profiler');
const boardsCatalog = require('./engine/boards_catalog');
const matter16 = require('./engine/matter16_engine');
const samplesCatalog = require('./engine/samples_catalog');
const sessionTracker = require('./engine/session_tracker');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Active Server-Sent Events (SSE) clients
const sseClients = new Set();

// Send SSE event to all connected clients
function broadcastSse(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Forward engine events to SSE
board.on('boardUpdated', (state) => broadcastSse('board', state));
board.on('newLog', (log) => broadcastSse('log', log));
board.on('lineageUpdated', (lineage) => broadcastSse('lineage', lineage));
matter.on('stateChanged', (st) => broadcastSse('matter', st));
matter.on('alertStarted', (alert) => broadcastSse('alert', { type: 'started', alert }));
matter.on('alertEnded', (data) => broadcastSse('alert', { type: 'ended', data }));
matter16.on('matter16Updated', (st) => broadcastSse('matter16', st));
matter16.on('quickStartUpdated', (st) => broadcastSse('quickstart', st));
sessionTracker.on('sessionsUpdated', (data) => broadcastSse('sessions', data));
sessionTracker.on('newAuditLog', (log) => broadcastSse('access_log', log));

// Periodic Power Profiler sample broadcast (10Hz ~ 100ms)
setInterval(() => {
  if (sseClients.size > 0) {
    const sample = power.generateSample(board.getBoardState());
    broadcastSse('power', { sample, summary: power.getSummary() });
  }
}, 100);

// Helper for parsing JSON request body
function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
  });
}

// MIME types table
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS & Cache headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // -------------------------------------------------------------
  // 1. Server-Sent Events (SSE) Stream
  // -------------------------------------------------------------
  if (pathname === '/api/stream' && method === 'GET') {
    const clientSessionId = req.headers['x-session-id'] || parsedUrl.query.sessionId || `sess-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const session = sessionTracker.registerOrUpdateSession(clientSessionId, req);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write(': keepalive\n\n');
    res.sessionId = clientSessionId;
    sseClients.add(res);

    // Initial state push
    res.write(`event: board\ndata: ${JSON.stringify(board.getBoardState())}\n\n`);
    res.write(`event: matter\ndata: ${JSON.stringify(matter.getState())}\n\n`);
    res.write(`event: boards\ndata: ${JSON.stringify({ active: boardsCatalog.getActiveBoard(), all: boardsCatalog.getAllBoards() })}\n\n`);
    res.write(`event: matter16\ndata: ${JSON.stringify(matter16.matter16State)}\n\n`);
    res.write(`event: quickstart\ndata: ${JSON.stringify(matter16.quickStartState)}\n\n`);
    res.write(`event: samples\ndata: ${JSON.stringify(samplesCatalog.getActiveSample())}\n\n`);
    res.write(`event: samples_catalog\ndata: ${JSON.stringify({ active: samplesCatalog.getActiveSample(), all: samplesCatalog.getAllSamples() })}\n\n`);
    res.write(`event: sessions\ndata: ${JSON.stringify(sessionTracker.getActiveSessionsSummary())}\n\n`);
    res.write(`event: access_logs\ndata: ${JSON.stringify(sessionTracker.getAuditLogs('all', 100))}\n\n`);
    res.write(`event: current_session\ndata: ${JSON.stringify(session)}\n\n`);
    res.write(`event: logs\ndata: ${JSON.stringify(board.getLogs())}\n\n`);
    res.write(`event: power_init\ndata: ${JSON.stringify({ summary: power.getSummary(), history: power.getHistory() })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
      sessionTracker.markSessionDisconnected(res.sessionId);
    });
    return;
  }

  // -------------------------------------------------------------
  // 2. REST API Routes
  // -------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // GET /api/status - Complete Board Status
    if (pathname === '/api/status' && method === 'GET') {
      return res.end(JSON.stringify({
        board: board.getBoardState(),
        matter: matter.getState(),
        power: power.getSummary(),
        jlink: jlink.checkInstallation()
      }));
    }

    // GET /api/lineage - Data Lineage Trace History
    if (pathname === '/api/lineage' && method === 'GET') {
      return res.end(JSON.stringify(board.getLineageHistory()));
    }

    // POST /api/board/reset - Reset Board Cores
    if (pathname === '/api/board/reset' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = await board.resetBoard(body.target || 'all');
      return res.end(JSON.stringify(result));
    }

    // POST /api/board/gpio - Control Single LED
    if (pathname === '/api/board/gpio' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = await board.setGpio(body.pin, body.value);
      return res.end(JSON.stringify(result));
    }

    // POST /api/board/leds/all - Turn All LEDs ON or OFF
    if (pathname === '/api/board/leds/all' && method === 'POST') {
      const body = await parseJsonBody(req);
      const isTurnOn = body.turnOn === true || body.turnOn === 'true' || body.turnOn === 1;
      const result = await board.setAllLeds(isTurnOn);
      return res.end(JSON.stringify(result));
    }

    // POST /api/board/button - Press Buttons
    if (pathname === '/api/board/button' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = await board.pressButton(body.button);
      return res.end(JSON.stringify(result));
    }

    // POST /api/board/flash/erase - Erase Flash Memory
    if (pathname === '/api/board/flash/erase' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = await board.eraseFlash(body.area || 'chip');
      return res.end(JSON.stringify(result));
    }

    // POST /api/board/flash/program - Flash Sample Firmware
    if (pathname === '/api/board/flash/program' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = await board.flashSample(body.sample || 'matter_light_bulb');
      return res.end(JSON.stringify(result));
    }

    // POST /api/board/mode - Switch Hardware / Simulation Mode
    if (pathname === '/api/board/mode' && method === 'POST') {
      const body = await parseJsonBody(req);
      board.boardInfo.mode = body.mode === 'hardware' ? 'hardware' : 'simulation';
      board.addLog('INF', 'system', `Operation mode switched to: ${board.boardInfo.mode.toUpperCase()}`);
      board.emit('boardUpdated', board.getBoardState());
      return res.end(JSON.stringify({ success: true, mode: board.boardInfo.mode }));
    }

    // GET /api/jlink/scan - Scan hardware J-Link probe
    if (pathname === '/api/jlink/scan' && method === 'GET') {
      const scanResult = await board.checkHardwareProbe();
      return res.end(JSON.stringify(scanResult));
    }

    // POST /api/terminal/command - Execute CLI Command
    if (pathname === '/api/terminal/command' && method === 'POST') {
      const body = await parseJsonBody(req);
      const response = board.processCommand(body.command);
      return res.end(JSON.stringify({ success: true, response }));
    }

    // GET /api/matter - Matter Light Bulb State
    if (pathname === '/api/matter' && method === 'GET') {
      return res.end(JSON.stringify(matter.getState()));
    }

    // POST /api/matter/control - Control Light (Power, Level, Color, Kelvin)
    if (pathname === '/api/matter/control' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = matter.updateControl(body);
      board.addLog('INF', 'matter', `Matter Command applied: On=${result.state.onOff}, Level=${result.state.level}, Temp=${result.state.colorTemperatureKelvin}K, RGB=${result.state.rgbHex}`);
      return res.end(JSON.stringify(result));
    }

    // POST /api/matter/scene - Activate Preset Scene
    if (pathname === '/api/matter/scene' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = matter.applyScene(body.sceneId);
      board.addLog('INF', 'matter', `Matter Scene triggered: ${result.scene || body.sceneId}`);
      return res.end(JSON.stringify(result));
    }

    // POST /api/matter/event - Trigger Webhook / Event Alert (PRD F-07)
    if (pathname === '/api/matter/event' && method === 'POST') {
      const body = await parseJsonBody(req);
      const eventPayload = {
        eventId: body.eventId || `evt-${Date.now()}`,
        eventType: body.eventType || 'delivery.arrived',
        source: body.source || 'Webhook API',
        label: body.label || '택배 도착 알림',
        alertColorHex: body.alertColorHex || '#00a9ce',
        durationSeconds: body.durationSeconds || 4,
        blinkCount: body.blinkCount || 3
      };
      const result = await matter.triggerAlert(eventPayload);
      return res.end(JSON.stringify(result));
    }

    // GET /api/matter/history - Alert and State History
    if (pathname === '/api/matter/history' && method === 'GET') {
      return res.end(JSON.stringify(matter.getHistory()));
    }

    // GET /api/power - Power Profiler Info
    if (pathname === '/api/power' && method === 'GET') {
      return res.end(JSON.stringify({
        summary: power.getSummary(),
        history: power.getHistory()
      }));
    }

    // -----------------------------------------------------------
    // NORDIC BOARDS CATALOG & SELECTION API
    // -----------------------------------------------------------
    // GET /api/boards - List all Nordic Matter Development Hardware
    if (pathname === '/api/boards' && method === 'GET') {
      return res.end(JSON.stringify({
        active: boardsCatalog.getActiveBoard(),
        boards: boardsCatalog.getAllBoards()
      }));
    }

    // POST /api/boards/select - Select Active Development Board
    if (pathname === '/api/boards/select' && method === 'POST') {
      const body = await parseJsonBody(req);
      const activeBoard = boardsCatalog.setActiveBoard(body.boardId);
      board.syncActiveBoard(body.boardId);
      sessionTracker.recordAction(req.headers['x-session-id'], 'BOARD_SELECT', `개발보드 전환: ${activeBoard.name} (${activeBoard.code})`);
      broadcastSse('boards', { active: activeBoard, all: boardsCatalog.getAllBoards() });
      broadcastSse('board', board.getBoardState());
      return res.end(JSON.stringify({ success: true, active: activeBoard }));
    }

    // -----------------------------------------------------------
    // MATTER 1.6 STANDARD & HANDS-ON LAB API
    // -----------------------------------------------------------
    // GET /api/matter16/state - Complete Matter 1.6 & Lab States
    if (pathname === '/api/matter16/state' && method === 'GET') {
      return res.end(JSON.stringify({
        toolchain: matter16.verifyEnvironment(),
        quickstart: matter16.quickStartState,
        matter16: matter16.matter16State,
        commissioning: matter16.commissioningData
      }));
    }

    // POST /api/matter16/quickstart - Advance Quick Start Step
    if (pathname === '/api/matter16/quickstart' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = matter16.advanceQuickStartStep(body.step, body);
      board.addLog('INF', 'quickstart', `Quick Start Step ${result.currentStep} executed: Sample=${result.selectedSample}`);
      return res.end(JSON.stringify(result));
    }

    // POST /api/matter16/factory-data - Generate Factory Data & QR
    if (pathname === '/api/matter16/factory-data' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = matter16.generateFactoryData(body);
      board.addLog('INF', 'factory', `Factory Data & QR generated: Manual Code=${result.manualCode}`);
      return res.end(JSON.stringify(result));
    }

    // POST /api/matter16/nfc-tap - Simulate 13.56MHz NFC-Only Commissioning
    if (pathname === '/api/matter16/nfc-tap' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = matter16.triggerNfcTap(body.devicePowered !== false);
      board.addLog('INF', 'nfc', `Matter 1.6 Bidirectional NFC Commissioning triggered: Powered=${body.devicePowered !== false}`);
      return res.end(JSON.stringify(result));
    }

    // POST /api/matter16/joint-fabric/controller - Add Controller to Shared Datastore
    if (pathname === '/api/matter16/joint-fabric/controller' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = matter16.addJointFabricController(body.name || 'New Ecosystem Controller', body.role || 'Operator');
      board.addLog('INF', 'joint-fabric', `Joint Fabric Controller added: ${body.name}, Total=${result.totalControllers}, FabricIndex=1`);
      return res.end(JSON.stringify(result));
    }

    // POST /api/matter16/thermostat/suggest - Send Context-Driven Thermostat Suggestion
    if (pathname === '/api/matter16/thermostat/suggest' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = matter16.sendThermostatSuggestion(body);
      board.addLog('INF', 'thermostat', `Thermostat Suggestion received: ${result.suggestedTempC}C (${result.decision})`);
      return res.end(JSON.stringify(result));
    }

    // POST /api/matter16/crl/update - Simulate Product Security 1.1 CRL Chunk Update
    if (pathname === '/api/matter16/crl/update' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = matter16.simulateCrlChunkUpdate(body.chunkIndex);
      board.addLog('INF', 'security', `Product Security 1.1 CRL Chunk ${result.chunkIndex} updated`);
      return res.end(JSON.stringify(result));
    }

    // GET /api/matter16/mcp-config - Get Nordic MCP Server Configuration
    if (pathname === '/api/matter16/mcp-config' && method === 'GET') {
      return res.end(JSON.stringify(matter16.getMcpConfig()));
    }

    // GET /api/matter16/report - Generate Comprehensive Nordic Studio Audit Report
    if (pathname === '/api/matter16/report' && method === 'GET') {
      const activeBoard = boardsCatalog.getActiveBoard();
      const report = matter16.generateComprehensiveReport(activeBoard.id);
      return res.end(JSON.stringify(report));
    }

    // -----------------------------------------------------------
    // NCS OFFICIAL MATTER SAMPLES CATALOG API (12 SAMPLES)
    // -----------------------------------------------------------
    // GET /api/samples - List all 12 NCS Matter Samples & active state
    if (pathname === '/api/samples' && method === 'GET') {
      return res.end(JSON.stringify({
        active: samplesCatalog.getActiveSample(),
        samples: samplesCatalog.getAllSamples()
      }));
    }

    // POST /api/samples/select - Select & Activate Sample Firmware
    if (pathname === '/api/samples/select' && method === 'POST') {
      const body = await parseJsonBody(req);
      const activeSample = samplesCatalog.setActiveSample(body.sampleId);
      if (board.appCore) {
        board.appCore.firmware = `${activeSample.sample.sdkPath} (Matter 1.6)`;
      }
      board.recordLineage('NCS Sample Switch', 'Catalog Selector', 'Application Core', 'Firmware: ' + activeSample.sample.id, 'Loaded ' + activeSample.sample.sdkPath, 'SUCCESS');
      board.addLog('INF', 'samples', `NCS Matter Sample activated: ${activeSample.sample.name} [${activeSample.sample.sdkPath}]`);
      sessionTracker.recordAction(req.headers['x-session-id'], 'SAMPLE_SELECT', `NCS 샘플 전환: ${activeSample.sample.name} (${activeSample.sample.sdkPath})`);
      broadcastSse('samples', activeSample);
      broadcastSse('board', board.getBoardState());
      return res.end(JSON.stringify({ success: true, active: activeSample }));
    }

    // POST /api/samples/control - Interact with Active Sample Clusters
    if (pathname === '/api/samples/control' && method === 'POST') {
      const body = await parseJsonBody(req);
      const sampleId = body.sampleId || samplesCatalog.activeSampleId;
      const updatedState = samplesCatalog.updateSampleState(sampleId, body.patch || {});
      
      // Hardware & adapter synchronizations
      if (sampleId === 'light_bulb') {
        matter.updateControl(body.patch || {});
      } else if (sampleId === 'lock') {
        const isLocked = updatedState.lockState === 'LOCKED';
        board.setGpio('led3', isLocked ? 1 : 0);
      } else if (sampleId === 'smoke_co_alarm') {
        if (updatedState && updatedState.alarmActive) {
          board.setGpio('led4', 1);
        } else {
          board.setGpio('led4', 0);
        }
      }

      board.recordLineage('Matter Cluster Cmd', 'Studio Web Controller', `Endpoint ${samplesCatalog.getSample(sampleId).endpoint} (${sampleId})`, JSON.stringify(body.patch || {}), 'Cluster Attributes Updated', 'SUCCESS');
      board.addLog('INF', 'matter', `Matter Sample [${sampleId}] cluster updated: ${JSON.stringify(body.patch || {})}`);
      sessionTracker.recordAction(req.headers['x-session-id'], 'CLUSTER_CONTROL', `Matter [${sampleId}] 클러스터 속성 변경: ${JSON.stringify(body.patch || {})}`);
      broadcastSse('samples', samplesCatalog.getActiveSample());
      return res.end(JSON.stringify({ success: true, sampleId, liveState: updatedState }));
    }

    // -----------------------------------------------------------
    // USER SESSIONS & ACCESS AUDIT LOG API
    // -----------------------------------------------------------
    // GET /api/sessions - Active Connected Developers & Sessions Summary
    if (pathname === '/api/sessions' && method === 'GET') {
      return res.end(JSON.stringify(sessionTracker.getActiveSessionsSummary()));
    }

    // POST /api/sessions/profile - Update / Switch Developer Profile
    if (pathname === '/api/sessions/profile' && method === 'POST') {
      const body = await parseJsonBody(req);
      const sessionId = body.sessionId || req.headers['x-session-id'] || 'default';
      const updated = sessionTracker.updateProfile(sessionId, {
        name: body.name,
        role: body.role,
        email: body.email,
        avatar: body.avatar
      });
      return res.end(JSON.stringify({ success: true, profile: updated ? updated.profile : body }));
    }

    // GET /api/access-logs - Query Audit Logs
    if (pathname === '/api/access-logs' && method === 'GET') {
      const filter = parsedUrl.query.filter || 'all';
      const limit = parseInt(parsedUrl.query.limit || 100);
      return res.end(JSON.stringify({
        total: sessionTracker.accessLogs.length,
        logs: sessionTracker.getAuditLogs(filter, limit)
      }));
    }

    // GET /api/access-logs/export - Download CSV Audit Logs
    if (pathname === '/api/access-logs/export' && method === 'GET') {
      const csv = sessionTracker.exportCsv();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="nordic_matter_studio_access_logs.csv"');
      return res.end(csv);
    }

    res.writeHead(404);
    return res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }

  // -------------------------------------------------------------
  // 3. Static File Serving (HTML, CSS, JS)
  // -------------------------------------------------------------
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log(`  nRF5340 DK Studio & Matter Controller App Running!`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  J-Link Detected: ${jlink.hasJLink ? 'YES (/usr/local/bin/JLinkExe)' : 'NO (Virtual Emulation)'}`);
  console.log('================================================================');
});
