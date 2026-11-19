/**
 * Nordic Matter Studio - Audit Log Engine & Multi-Dimensional Analytics Database
 * Stores and queries system, user, board, and Matter cluster interactions
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const LOGS_FILE = path.join(__dirname, '..', 'data', 'audit_logs.json');
const MAX_LOGS = 5000;

class AuditDb extends EventEmitter {
  constructor() {
    super();
    this.logs = [];
    this._ensureDataDir();
    this._loadLogs();
    this._seedInitialLogsIfEmpty();
  }

  _ensureDataDir() {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {
        // read-only filesystem in serverless
      }
    }
  }

  _loadLogs() {
    try {
      if (fs.existsSync(LOGS_FILE)) {
        const raw = fs.readFileSync(LOGS_FILE, 'utf8');
        this.logs = JSON.parse(raw);
        if (!Array.isArray(this.logs)) this.logs = [];
      }
    } catch (e) {
      this.logs = [];
    }
  }

  _saveLogs() {
    try {
      this._ensureDataDir();
      fs.writeFileSync(LOGS_FILE, JSON.stringify(this.logs.slice(0, MAX_LOGS), null, 2), 'utf8');
    } catch (e) {
      // serverless fallback
    }
  }

  _seedInitialLogsIfEmpty() {
    if (this.logs.length === 0) {
      const now = Date.now();
      const initialSeed = [
        {
          id: `log_seed_001`,
          timestamp: new Date(now - 3600000 * 5).toISOString(),
          userId: 'admin',
          userName: '최고관리자 (Admin)',
          userRole: 'admin',
          boardId: 'nrf5340dk',
          boardName: 'nRF5340 DK (Matter Dual-Core)',
          category: 'AUTH',
          action: 'USER_LOGIN',
          details: '최고관리자 세션 인증 성공 (IP: 127.0.0.1)',
          status: 'SUCCESS',
          ip: '127.0.0.1'
        },
        {
          id: `log_seed_002`,
          timestamp: new Date(now - 3600000 * 4).toISOString(),
          userId: 'admin',
          userName: '최고관리자 (Admin)',
          userRole: 'admin',
          boardId: 'nrf5340dk',
          boardName: 'nRF5340 DK (Matter Dual-Core)',
          category: 'BOARD_CONTROL',
          action: 'BOARD_INIT',
          details: 'Nordic nRF5340 DK 하드웨어 트윈 코어 엔진 시동',
          status: 'INFO',
          ip: '127.0.0.1'
        },
        {
          id: `log_seed_003`,
          timestamp: new Date(now - 3600000 * 3).toISOString(),
          userId: 'engineer',
          userName: '김임베디드 (Firmware Lead)',
          userRole: 'engineer',
          boardId: 'nrf54lm20dk',
          boardName: 'nRF54LM20 DK (Ultra-Low Power)',
          category: 'FIRMWARE_FLASH',
          action: 'FLASH_PROGRAM',
          details: 'samples/matter/light_bulb 펌웨어 이미지 빌드 및 플래시 성공',
          status: 'SUCCESS',
          ip: '192.168.1.15'
        },
        {
          id: `log_seed_004`,
          timestamp: new Date(now - 3600000 * 2).toISOString(),
          userId: 'qa',
          userName: '박검증 (QA Specialist)',
          userRole: 'qa',
          boardId: 'nrf5340dk',
          boardName: 'nRF5340 DK (Matter Dual-Core)',
          category: 'MATTER_CLUSTER',
          action: 'CLUSTER_WRITE',
          details: 'On/Off Cluster (0x0006) -> State changed to ON (LED1 Lit)',
          status: 'SUCCESS',
          ip: '192.168.1.42'
        },
        {
          id: `log_seed_005`,
          timestamp: new Date(now - 3600000 * 1).toISOString(),
          userId: 'guest',
          userName: '방문 참관자 (Guest)',
          userRole: 'guest',
          boardId: 'thingy53',
          boardName: 'Nordic Thingy:53 (Multi-Sensor IoT)',
          category: 'BOARD_CONTROL',
          action: 'GPIO_READ',
          details: 'BME688 환경센서 (온도/습도/기압) 실시간 텔레메트리 조회',
          status: 'INFO',
          ip: '127.0.0.1'
        }
      ];
      this.logs = initialSeed;
      this._saveLogs();
    }
  }

  /**
   * Record a new audit log
   */
  recordLog(entry) {
    const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const record = {
      id,
      timestamp: new Date().toISOString(),
      userId: entry.userId || 'anonymous',
      userName: entry.userName || '미등록 사용자',
      userRole: entry.userRole || 'guest',
      boardId: entry.boardId || 'system',
      boardName: entry.boardName || '시스템 공통',
      category: entry.category || 'SYSTEM',
      action: entry.action || 'GENERAL_ACTION',
      details: typeof entry.details === 'object' ? JSON.stringify(entry.details) : (entry.details || ''),
      status: entry.status || 'INFO', // SUCCESS, INFO, WARNING, ERROR
      ip: entry.ip || '127.0.0.1',
      userAgent: entry.userAgent || ''
    };

    this.logs.unshift(record);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }
    this._saveLogs();
    this.emit('newLog', record);
    return record;
  }

  /**
   * Multi-dimensional log querying
   */
  queryLogs({ userId, boardId, category, status, search, limit = 100, offset = 0 } = {}) {
    let filtered = this.logs;

    if (userId && userId !== 'all') {
      filtered = filtered.filter(l => (l.userId || '').toLowerCase() === userId.toLowerCase());
    }

    if (boardId && boardId !== 'all') {
      filtered = filtered.filter(l => (l.boardId || '').toLowerCase() === boardId.toLowerCase());
    }

    if (category && category !== 'all') {
      filtered = filtered.filter(l => (l.category || '').toUpperCase() === category.toUpperCase());
    }

    if (status && status !== 'all') {
      filtered = filtered.filter(l => (l.status || '').toUpperCase() === status.toUpperCase());
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(l => 
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        (l.userName && l.userName.toLowerCase().includes(q)) ||
        (l.boardName && l.boardName.toLowerCase().includes(q)) ||
        (l.id && l.id.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      total,
      limit,
      offset,
      logs: paginated
    };
  }

  /**
   * Comprehensive Statistics for Admin Dashboard
   */
  getStats() {
    const total = this.logs.length;
    const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
    const todayLogs = this.logs.filter(l => l.timestamp >= oneDayAgo).length;

    // Active Users in last 24h
    const recentUsers = new Set();
    this.logs.filter(l => l.timestamp >= oneDayAgo).forEach(l => {
      if (l.userId && l.userId !== 'anonymous') recentUsers.add(l.userId);
    });

    // Board Distribution
    const boardDist = {};
    const categoryDist = {};
    const statusDist = { SUCCESS: 0, INFO: 0, WARNING: 0, ERROR: 0 };
    let errorCount = 0;

    this.logs.forEach(l => {
      const b = l.boardId || 'system';
      boardDist[b] = (boardDist[b] || 0) + 1;

      const c = l.category || 'SYSTEM';
      categoryDist[c] = (categoryDist[c] || 0) + 1;

      const s = l.status || 'INFO';
      statusDist[s] = (statusDist[s] || 0) + 1;
      if (s === 'ERROR') errorCount++;
    });

    // Security Audit Score (0 - 100)
    let securityScore = 98;
    if (total > 0) {
      const errorRatio = errorCount / total;
      securityScore = Math.max(70, Math.min(100, Math.round(100 - (errorRatio * 150))));
    }

    return {
      totalLogs: total,
      todayLogs,
      activeUsers24h: Math.max(1, recentUsers.size),
      errorCount,
      securityScore,
      boardDistribution: boardDist,
      categoryDistribution: categoryDist,
      statusDistribution: statusDist
    };
  }

  /**
   * Export all filtered logs to CSV format
   */
  exportCsv(filter = {}) {
    const { logs } = this.queryLogs({ ...filter, limit: 2000, offset: 0 });
    const header = ['ID', 'Timestamp', 'User ID', 'User Name', 'Role', 'Board ID', 'Board Name', 'Category', 'Action', 'Status', 'Details', 'Client IP'];
    
    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = logs.map(l => [
      escapeCsv(l.id),
      escapeCsv(l.timestamp),
      escapeCsv(l.userId),
      escapeCsv(l.userName),
      escapeCsv(l.userRole),
      escapeCsv(l.boardId),
      escapeCsv(l.boardName),
      escapeCsv(l.category),
      escapeCsv(l.action),
      escapeCsv(l.status),
      escapeCsv(l.details),
      escapeCsv(l.ip)
    ].join(','));

    return [header.join(','), ...rows].join('\n');
  }

  /**
   * Purge all logs (Admin action)
   */
  clearLogs(adminUser) {
    this.logs = [];
    this.recordLog({
      userId: adminUser ? adminUser.id : 'admin',
      userName: adminUser ? adminUser.name : '최고관리자 (Admin)',
      userRole: 'admin',
      boardId: 'system',
      boardName: '전체 시스템',
      category: 'SECURITY_AUDIT',
      action: 'PURGE_AUDIT_LOGS',
      details: '관리자에 의해 이전 모든 감사 로그 데이터가 초기화되었습니다.',
      status: 'WARNING'
    });
    this._saveLogs();
    this.emit('logsCleared');
    return { success: true, message: '감사 로그가 성공적으로 초기화되었습니다.' };
  }
}

module.exports = new AuditDb();
