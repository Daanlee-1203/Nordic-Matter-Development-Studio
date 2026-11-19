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
const authManager = require('./engine/auth_manager');
const auditDb = require('./engine/audit_db');

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
auditDb.on('newLog', (log) => broadcastSse('audit_log', log));

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

// Helper to extract authenticated user & context
function getAuthContext(req) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/nm_token=([^;]+)/);
    if (match) token = match[1];
  }
  const session = authManager.getSession(token);
  const activeBoard = boardsCatalog.getActiveBoard() || { id: 'nrf5340dk', name: 'nRF5340 DK' };
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  return {
    token,
    user: session ? {
      id: session.userId,
      username: session.username,
      name: session.name,
      role: session.role,
      avatar: session.avatar,
      email: session.email
    } : null,
    boardId: activeBoard.id,
    boardName: activeBoard.name,
    ip: typeof clientIp === 'string' ? clientIp.split(',')[0].trim() : '127.0.0.1'
  };
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-id');
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
    res.write(`event: audit_stats\ndata: ${JSON.stringify(auditDb.getStats())}\n\n`);
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

    // -----------------------------------------------------------
    // AUTHENTICATION & USER SESSION API
    // -----------------------------------------------------------
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseJsonBody(req);
      const ctx = getAuthContext(req);
      const result = authManager.login(body.username, body.password, {
        ip: ctx.ip,
        userAgent: req.headers['user-agent']
      });

      if (result.success) {
        auditDb.recordLog({
          userId: result.user.id,
          userName: result.user.name,
          userRole: result.user.role,
          boardId: ctx.boardId,
          boardName: ctx.boardName,
          category: 'AUTH',
          action: 'LOGIN_SUCCESS',
          details: `사용자 [${result.user.name}] 로그인 성공 (ID: ${result.user.username}, 권한: ${result.user.role})`,
          status: 'SUCCESS',
          ip: ctx.ip
        });
      } else {
        auditDb.recordLog({
          userId: body.username || 'unknown',
          userName: body.username || '알 수 없음',
          userRole: 'guest',
          boardId: ctx.boardId,
          boardName: ctx.boardName,
          category: 'AUTH',
          action: 'LOGIN_FAILED',
          details: `로그인 실패 시도 (ID: ${body.username || '빈값'}): ${result.message}`,
          status: 'WARNING',
          ip: ctx.ip
        });
      }
      return res.end(JSON.stringify(result));
    }

    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await parseJsonBody(req);
      const ctx = getAuthContext(req);
      const result = authManager.register(body);

      if (result.success) {
        auditDb.recordLog({
          userId: result.user.id,
          userName: result.user.name,
          userRole: result.user.role,
          boardId: ctx.boardId,
          boardName: ctx.boardName,
          category: 'AUTH',
          action: 'REGISTER_SUCCESS',
          details: `신규 사용자 가입 완료: ${result.user.username} (${result.user.name})`,
          status: 'SUCCESS',
          ip: ctx.ip
        });
      }
      return res.end(JSON.stringify(result));
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      const ctx = getAuthContext(req);
      if (ctx.user) {
        auditDb.recordLog({
          userId: ctx.user.id,
          userName: ctx.user.name,
          userRole: ctx.user.role,
          boardId: ctx.boardId,
          boardName: ctx.boardName,
          category: 'AUTH',
          action: 'LOGOUT',
          details: `사용자 [${ctx.user.name}] 안전 로그아웃`,
          status: 'INFO',
          ip: ctx.ip
        });
      }
      authManager.logout(ctx.token);
      return res.end(JSON.stringify({ success: true, message: '로그아웃되었습니다.' }));
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const ctx = getAuthContext(req);
      return res.end(JSON.stringify({
        authenticated: !!ctx.user,
        user: ctx.user
      }));
    }

    // -----------------------------------------------------------
    // ADMIN DASHBOARD & AUDIT LOG API
    // -----------------------------------------------------------
    if (pathname === '/api/admin/logs' && method === 'GET') {
      const q = parsedUrl.query;
      const logsResult = auditDb.queryLogs({
        userId: q.userId || 'all',
        boardId: q.boardId || 'all',
        category: q.category || 'all',
        status: q.status || 'all',
        search: q.search || '',
        limit: parseInt(q.limit || 100),
        offset: parseInt(q.offset || 0)
      });
      return res.end(JSON.stringify(logsResult));
    }

    if (pathname === '/api/admin/stats' && method === 'GET') {
      return res.end(JSON.stringify(auditDb.getStats()));
    }

    if (pathname === '/api/admin/users' && method === 'GET') {
      return res.end(JSON.stringify({ users: authManager.getAllUsers() }));
    }

    if (pathname === '/api/admin/users/status' && method === 'POST') {
      const ctx = getAuthContext(req);
      const body = await parseJsonBody(req);
      const result = authManager.updateUserStatus(body.username, body.status);
      if (result.success) {
        auditDb.recordLog({
          userId: ctx.user ? ctx.user.id : 'admin',
          userName: ctx.user ? ctx.user.name : '시스템 관리자',
          userRole: 'admin',
          boardId: ctx.boardId,
          boardName: ctx.boardName,
          category: 'SECURITY_AUDIT',
          action: 'USER_STATUS_CHANGE',
          details: `사용자 [${body.username}] 상태 -> ${body.status}`,
          status: 'WARNING',
          ip: ctx.ip
        });
      }
      return res.end(JSON.stringify(result));
    }

    if (pathname === '/api/admin/users/role' && method === 'POST') {
      const ctx = getAuthContext(req);
      const body = await parseJsonBody(req);
      const result = authManager.updateUserRole(body.username, body.role);
      if (result.success) {
        auditDb.recordLog({
          userId: ctx.user ? ctx.user.id : 'admin',
          userName: ctx.user ? ctx.user.name : '시스템 관리자',
          userRole: 'admin',
          boardId: ctx.boardId,
          boardName: ctx.boardName,
          category: 'SECURITY_AUDIT',
          action: 'USER_ROLE_CHANGE',
          details: `사용자 [${body.username}] 권한 역할 -> ${body.role}`,
          status: 'WARNING',
          ip: ctx.ip
        });
      }
      return res.end(JSON.stringify(result));
    }

    if (pathname === '/api/admin/logs/clear' && method === 'POST') {
      const ctx = getAuthContext(req);
      const result = auditDb.clearLogs(ctx.user);
      return res.end(JSON.stringify(result));
    }

    if (pathname === '/api/admin/logs/export' && method === 'GET') {
      const csv = auditDb.exportCsv(parsedUrl.query);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="nordic_matter_studio_audit_logs.csv"');
      return res.end(csv);
    }

    // -----------------------------------------------------------
    // HARDWARE BOARD CONTROL & SYSTEM API
    // -----------------------------------------------------------
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
      const ctx = getAuthContext(req);
      const body = await parseJsonBody(req);
      const result = await board.resetBoard(body.target || 'all');
      auditDb.recordLog({
        userId: ctx.user ? ctx.user.id : 'anonymous',
        userName: ctx.user ? ctx.user.name : '미등록 엔지니어',
        userRole: ctx.user ? ctx.user.role : 'guest',
        boardId: ctx.boardId,
        boardName: ctx.boardName,
        category: 'BOARD_CONTROL',
        action: 'BOARD_RESET',
        details: `보드 리셋 수행 (Core Target: ${body.target || 'all'})`,
        status: 'INFO',
        ip: ctx.ip
      });
      return res.end(JSON.stringify(result));
    }

    // POST /api/board/gpio - Control Single LED
    if (pathname === '/api/board/gpio' && method === 'POST') {
      const ctx = getAuthContext(req);
      const body = await parseJsonBody(req);
      const result = await board.setGpio(body.pin, body.value);
      auditDb.recordLog({
        userId: ctx.user ? ctx.user.id : 'anonymous',
        userName: ctx.user ? ctx.user.name : '미등록 엔지니어',
        userRole: ctx.user ? ctx.user.role : 'guest',
        boardId: ctx.boardId,
        boardName: ctx.boardName,
        category: 'BOARD_CONTROL',
        action: 'GPIO_SET',
        details: `${body.pin.toUpperCase()} 제어 -> ${body.value ? 'ON (HIGH)' : 'OFF (LOW)'}`,
        status: 'SUCCESS',
        ip: ctx.ip
      });
      return res.end(JSON.stringify(result));
    }

    // POST /api/board/leds/all - Turn All LEDs ON or OFF
    if (pathname === '/api/board/leds/all' && method === 'POST') {
      const ctx = getAuthContext(req);
      const body = await parseJsonBody(req);
      const isTurnOn = body.turnOn === true || body.turnOn === 'true' || body.turnOn === 1;
      const result = await board.setAllLeds(isTurnOn);
      auditDb.recordLog({
        userId: ctx.user ? ctx.user.id : 'anonymous',
        userName: ctx.user ? ctx.user.name : '미등록 엔지니어',
        userRole: ctx.user ? ctx.user.role : 'guest',
        boardId: ctx.boardId,
        boardName: ctx.boardName,
        category: 'BOARD_CONTROL',
        action: 'LEDS_ALL',
        details: `전체 LED ${isTurnOn ? '동시 점등 (ALL ON)' : '동시 소등 (ALL OFF)'}`,
        status: 'SUCCESS',
        ip: ctx.ip
      });
      return res.end(JSON.stringify(result));
    }

    // POST /api/board/button - Press Buttons
    if (pathname === '/api/board/button' && method === 'POST') {
      const ctx = getAuthContext(req);
      const body = await parseJsonBody(req);
      const result = await board.pressButton(body.button);
      auditDb.recordLog({
        userId: ctx.user ? ctx.user.id : 'anonymous',
        userName: ctx.user ? ctx.user.name : '미등록 엔지니어',
        userRole: ctx.user ? ctx.user.role : 'guest',
        boardId: ctx.boardId,
        boardName: ctx.boardName,
        category: 'BOARD_CONTROL',
        action: 'BUTTON_PRESS',
        details: `하드웨어 버튼 입력 감지: ${body.button.toUpperCase()} 클릭 이벤트`,
        status: 'SUCCESS',
        ip: ctx.ip
      });
      return res.end(JSON.stringify(result));
    }

    // POST /api/board/flash/erase - Erase Flash Memory
    if (pathname === '/api/board/flash/erase' && method === 'POST') {
      const ctx = getAuthContext(req);
      const body = await parseJsonBody(req);
      const result = await board.eraseFlash(body.area || 'chip');
      auditDb.recordLog({
        userId: ctx.user ? ctx.user.id : 'anonymous',
        userName: ctx.user ? ctx.user.name : '미등록 엔지니어',
        userRole: ctx.user ? ctx.user.role : 'guest',
        boardId: ctx.boardId,
        boardName: ctx.boardName,
        category: 'FIRMWARE_FLASH',
        action: 'FLASH_ERASE',
        details: `플래시 메모리 영역 소거 (Target: ${body.area || 'chip'})`,
        status: result.success ? 'SUCCESS' : 'ERROR',
        ip: ctx.ip
      });
      return res.end(JSON.stringify(result));
    }

    // POST /api/board/flash/program - Flash Sample Firmware
    if (pathname === '/api/board/flash/program' && method === 'POST') {
      const ctx = getAuthContext(req);
      const body = await parseJsonBody(req);
      const result = await board.flashSample(body.sample || 'matter_light_bulb');
      auditDb.recordLog({
        userId: ctx.user ? ctx.user.id : 'anonymous',
        userName: ctx.user ? ctx.user.name : '미등록 엔지니어',
        userRole: ctx.user ? ctx.user.role : 'guest',
        boardId: ctx.boardId,
        boardName: ctx.boardName,
        category: 'FIRMWARE_FLASH',
        action: 'FLASH_PROGRAM',
        details: `펌웨어 바이너리 프로그래밍 [${body.sample}]: ${result.message}`,
        status: result.success ? 'SUCCESS' : 'ERROR',
        ip: ctx.ip
      });
      return res.end(JSON.stringify(result));
    }

    // POST /api/board/mode - Switch Hardware / Simulation Mode
    if (pathname === '/api/board/mode' && method === 'POST') {
      const ctx = getAuthContext(req);
      const body = await parseJsonBody(req);
      board.boardInfo.mode = body.mode === 'hardware' ? 'hardware' : 'simulation';
      board.addLog('INF', 'system', `Operation mode switched to: ${board.boardInfo.mode.toUpperCase()}`);
      board.emit('boardUpdated', board.getBoardState());
      auditDb.recordLog({
        userId: ctx.user ? ctx.user.id : 'anonymous',
        userName: ctx.user ? ctx.user.name : '미등록 엔지니어',
        userRole: ctx.user ? ctx.user.role : 'guest',
        boardId: ctx.boardId,
        boardName: ctx.boardName,
        category: 'SYSTEM',
        action: 'MODE_SWITCH',
        details: `운영 모드 전환 -> ${board.boardInfo.mode.toUpperCase()}`,
        status: 'INFO',
        ip: ctx.ip
      });
      return res.end(JSON.stringify({ success: true, mode: board.boardInfo.mode }));
    }

    // GET /api/jlink/scan - Scan hardware J-Link probe
    if (pathname === '/api/jlink/scan' && method === 'GET') {
      const scanResult = await board.checkHardwareProbe();
      return res.end(JSON.stringify(scanResult));
    }

    // POST /api/terminal/command - Execute CLI Command
    if (pathname === '/api/terminal/command' && method === 'POST') {
      const ctx = getAuthContext(req);
      const body = await parseJsonBody(req);
      const response = board.processCommand(body.command);
      auditDb.recordLog({
        userId: ctx.user ? ctx.user.id : 'anonymous',
        userName: ctx.user ? ctx.user.name : '미등록 엔지니어',
        userRole: ctx.user ? ctx.user.role : 'guest',
        boardId: ctx.boardId,
        boardName: ctx.boardName,
        category: 'CLI_TOOL',
        action: 'CLI_EXEC',
        details: `터미널 명령 실행: ${body.command}`,
        status: 'INFO',
        ip: ctx.ip
      });
      return res.end(JSON.stringify({ success: true, response }));
    }

    // GET /api/matter - Matter Light Bulb State
    if (pathname === '/api/matter' && method === 'GET') {
      return res.end(JSON.stringify(matter.getState()));
    }

    // POST /api/matter/control - Control Light (Power, Level, Color, Kelvin)
    if (pathname === '/api/matter/control' && method === 'POST') {
      const ctx = getAuthContext(req);
      const body = await parseJsonBody(req);
      const result = matter.updateControl(body);
      board.addLog('INF', 'matter', `Matter Command applied: On=${result.state.onOff}, Level=${result.state.level}, Temp=${result.state.colorTemperatureKelvin}K, RGB=${result.state.rgbHex}`);
      auditDb.recordLog({
        userId: ctx.user ? ctx.user.id : 'anonymous',
        userName: ctx.user ? ctx.user.name : '미등록 엔지니어',
        userRole: ctx.user ? ctx.user.role : 'guest',
        boardId: ctx.boardId,
        boardName: ctx.boardName,
        category: 'MATTER_CLUSTER',
        action: 'LIGHT_CONTROL',
        details: `조명 제어: Power=${result.state.onOff}, Level=${result.state.level}%, RGB=${result.state.rgbHex}`,
        status: 'SUCCESS',
        ip: ctx.ip
      });
      return res.end(JSON.stringify(result));
    }

    // POST /api/matter/scene - Activate Preset Scene
    if (pathname === '/api/matter/scene' && method === 'POST') {
      const ctx = getAuthContext(req);
      const body = await parseJsonBody(req);
      const result = matter.applyScene(body.sceneId);
      board.addLog('INF', 'matter', `Matter Scene triggered: ${result.scene || body.sceneId}`);
      auditDb.recordLog({
        userId: ctx.user ? ctx.user.id : 'anonymous',
        userName: ctx.user ? ctx.user.name : '미등록 엔지니어',
        userRole: ctx.user ? ctx.user.role : 'guest',
        boardId: ctx.boardId,
        boardName: ctx.boardName,
        category: 'MATTER_CLUSTER',
        action: 'SCENE_APPLY',
        details: `씬(Scene) 모드 활성화: ${result.scene || body.sceneId}`,
        status: 'SUCCESS',
        ip: ctx.ip
      });
      return res.end(JSON.stringify(result));
    }

    // POST /api/matter/event - Trigger Webhook / Event Alert
    if (pathname === '/api/matter/event' && method === 'POST') {
      const ctx = getAuthContext(req);
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
      auditDb.recordLog({
        userId: ctx.user ? ctx.user.id : 'anonymous',
        userName: ctx.user ? ctx.user.name : '미등록 엔지니어',
        userRole: ctx.user ? ctx.user.role : 'guest',
        boardId: ctx.boardId,
        boardName: ctx.boardName,
        category: 'MATTER_CLUSTER',
        action: 'ALERT_TRIGGER',
        details: `이벤트 웹훅 알림 발동: [${eventPayload.label}] (${eventPayload.eventType})`,
        status: 'SUCCESS',
        ip: ctx.ip
      });
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
      const ctx = getAuthContext(req);
      const body = await parseJsonBody(req);
      const activeBoard = boardsCatalog.setActiveBoard(body.boardId);
      board.syncActiveBoard(body.boardId);
      sessionTracker.recordAction(req.headers['x-session-id'], 'BOARD_SELECT', `개발보드 전환: ${activeBoard.name} (${activeBoard.code})`);
      auditDb.recordLog({
        userId: ctx.user ? ctx.user.id : 'anonymous',
        userName: ctx.user ? ctx.user.name : '미등록 엔지니어',
        userRole: ctx.user ? ctx.user.role : 'guest',
        boardId: activeBoard.id,
        boardName: activeBoard.name,
        category: 'BOARD_CONTROL',
        action: 'BOARD_SELECT',
        details: `타겟 개발보드 전환: ${activeBoard.name} [${activeBoard.code}]`,
        status: 'INFO',
        ip: ctx.ip
      });
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
        features: matter16.matter16State.features,
        deviceTypes: matter16.matter16State.deviceTypes,
        productSecurity: matter16.matter16State.productSecurity
      }));
    }

    // POST /api/matter16/quickstart/step - Execute QuickStart Step
    if (pathname === '/api/matter16/quickstart/step' && method === 'POST') {
      const ctx = getAuthContext(req);
      const body = await parseJsonBody(req);
      const stepIndex = parseInt(body.stepIndex, 10);
      const result = await matter16.executeQuickStartStep(stepIndex);
      auditDb.recordLog({
        userId: ctx.user ? ctx.user.id : 'anonymous',
        userName: ctx.user ? ctx.user.name : '미등록 엔지니어',
        userRole: ctx.user ? ctx.user.role : 'guest',
        boardId: ctx.boardId,
        boardName: ctx.boardName,
        category: 'SYSTEM',
        action: 'QUICKSTART_STEP',
        details: `Matter 1.6 퀵스타트 Step ${stepIndex} 실행: ${result.name}`,
        status: 'SUCCESS',
        ip: ctx.ip
      });
      return res.end(JSON.stringify(result));
    }

    // POST /api/matter16/quickstart/reset - Reset QuickStart Pipeline
    if (pathname === '/api/matter16/quickstart/reset' && method === 'POST') {
      const ctx = getAuthContext(req);
      const result = matter16.resetQuickStart();
      auditDb.recordLog({
        userId: ctx.user ? ctx.user.id : 'anonymous',
        userName: ctx.user ? ctx.user.name : '미등록 엔지니어',
        userRole: ctx.user ? ctx.user.role : 'guest',
        boardId: ctx.boardId,
        boardName: ctx.boardName,
        category: 'SYSTEM',
        action: 'QUICKSTART_RESET',
        details: 'Matter 1.6 퀵스타트 파이프라인 초기화',
        status: 'INFO',
        ip: ctx.ip
      });
      return res.end(JSON.stringify(result));
    }

    // POST /api/matter16/crl/update - Trigger CRL (Revocation List) chunk update
    if (pathname === '/api/matter16/crl/update' && method === 'POST') {
      const result = matter16.updateCrlChunk();
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
      const ctx = getAuthContext(req);
      const body = await parseJsonBody(req);
      const activeSample = samplesCatalog.setActiveSample(body.sampleId);
      if (board.appCore) {
        board.appCore.firmware = `${activeSample.sample.sdkPath} (Matter 1.6)`;
      }
      board.recordLineage('NCS Sample Switch', 'Catalog Selector', 'Application Core', 'Firmware: ' + activeSample.sample.id, 'Loaded ' + activeSample.sample.sdkPath, 'SUCCESS');
      board.addLog('INF', 'samples', `NCS Matter Sample activated: ${activeSample.sample.name} [${activeSample.sample.sdkPath}]`);
      sessionTracker.recordAction(req.headers['x-session-id'], 'SAMPLE_SELECT', `NCS 샘플 전환: ${activeSample.sample.name} (${activeSample.sample.sdkPath})`);
      auditDb.recordLog({
        userId: ctx.user ? ctx.user.id : 'anonymous',
        userName: ctx.user ? ctx.user.name : '미등록 엔지니어',
        userRole: ctx.user ? ctx.user.role : 'guest',
        boardId: ctx.boardId,
        boardName: ctx.boardName,
        category: 'FIRMWARE_FLASH',
        action: 'SAMPLE_SELECT',
        details: `NCS 예제 전환: ${activeSample.sample.name} (${activeSample.sample.sdkPath})`,
        status: 'SUCCESS',
        ip: ctx.ip
      });
      broadcastSse('samples', activeSample);
      broadcastSse('board', board.getBoardState());
      return res.end(JSON.stringify({ success: true, active: activeSample }));
    }

    // POST /api/samples/control - Interact with Active Sample Clusters
    if (pathname === '/api/samples/control' && method === 'POST') {
      const ctx = getAuthContext(req);
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
      auditDb.recordLog({
        userId: ctx.user ? ctx.user.id : 'anonymous',
        userName: ctx.user ? ctx.user.name : '미등록 엔지니어',
        userRole: ctx.user ? ctx.user.role : 'guest',
        boardId: ctx.boardId,
        boardName: ctx.boardName,
        category: 'MATTER_CLUSTER',
        action: 'CLUSTER_CONTROL',
        details: `Matter [${sampleId}] 클러스터 속성 변경: ${JSON.stringify(body.patch || {})}`,
        status: 'SUCCESS',
        ip: ctx.ip
      });
      broadcastSse('samples', samplesCatalog.getActiveSample());
      return res.end(JSON.stringify({ success: true, sampleId, liveState: updatedState }));
    }

    // -----------------------------------------------------------
    // USER SESSIONS & ACCESS AUDIT LOG API (LEGACY COMPATIBILITY)
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

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('================================================================');
    console.log(`  Nordic Matter Development Studio & Admin Center Running!`);
    console.log(`  Local URL: http://localhost:${PORT}`);
    console.log(`  J-Link Probe: ${jlink.hasJLink ? 'Active (/usr/local/bin/JLinkExe)' : 'Virtual Emulation Mode'}`);
    console.log('================================================================');
  });
}

module.exports = server;
