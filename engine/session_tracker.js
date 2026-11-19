const EventEmitter = require('events');

class SessionTracker extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.accessLogs = [];
    this.maxLogs = 500;

    // Default preset developer profiles for team collaboration
    this.presetProfiles = [
      { id: 'lead_dev', name: '임베디드 수석 엔지니어 (Main Dev)', role: 'Firmware Architect', email: 'firmware-lead@nordic-lab.local', avatar: '👨‍💻' },
      { id: 'qa_engineer', name: 'Matter 표준 QA 엔지니어', role: 'Test & Certification QA', email: 'qa-tester@nordic-lab.local', avatar: '🧪' },
      { id: 'security_auditor', name: 'Product Security 1.1 감사관', role: 'Security Compliance', email: 'sec-audit@nordic-lab.local', avatar: '🛡️' },
      { id: 'guest_observer', name: '게스트 참관자 (Guest)', role: 'Lab Observer', email: 'guest@nordic-lab.local', avatar: '👀' }
    ];

    // Seed initial system boot audit log
    this.recordAuditLog('system-init', 'SYSTEM_BOOT', 'Nordic Matter Development Studio Engine v2.5 started on port 3000', '127.0.0.1', {
      name: 'System Daemon',
      role: 'Core Host',
      avatar: '⚙️'
    }, 'macOS / Node.js v24');
  }

  parseUserAgent(ua = '') {
    let os = 'Unknown OS';
    if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
    else if (/Windows NT/i.test(ua)) os = 'Windows';
    else if (/Linux/i.test(ua)) os = 'Linux';
    else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
    else if (/Android/i.test(ua)) os = 'Android';

    let browser = 'Unknown Browser';
    if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
    else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Google Chrome';
    else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Apple Safari';
    else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';

    return { os, browser, raw: ua };
  }

  cleanIp(remoteAddress) {
    if (!remoteAddress) return '127.0.0.1';
    let ip = remoteAddress.replace(/^.*:/, '');
    if (ip === '' || ip === '1') return '127.0.0.1';
    return ip;
  }

  registerOrUpdateSession(sessionId, req, profileData = {}) {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ip = this.cleanIp(rawIp);
    const uaInfo = this.parseUserAgent(req.headers['user-agent'] || '');
    const now = new Date();

    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        ip,
        os: uaInfo.os,
        browser: uaInfo.browser,
        userAgent: req.headers['user-agent'] || '',
        connectedAt: now.toISOString(),
        lastActiveAt: now.toISOString(),
        profile: {
          name: profileData.name || '임베디드 수석 엔지니어',
          role: profileData.role || 'Firmware Architect',
          email: profileData.email || 'firmware-lead@nordic-lab.local',
          avatar: profileData.avatar || '👨‍💻'
        },
        actionCount: 1,
        lastAction: '웹소켓 / SSE 세션 연결 수립',
        isOnline: true
      };
      this.sessions.set(sessionId, session);

      this.recordAuditLog(sessionId, 'USER_CONNECT', `신규 세션 접속: ${session.profile.name} (${session.profile.role})`, ip, session.profile, `${uaInfo.os} · ${uaInfo.browser}`);
    } else {
      session.lastActiveAt = now.toISOString();
      session.isOnline = true;
      if (profileData.name) session.profile.name = profileData.name;
      if (profileData.role) session.profile.role = profileData.role;
      if (profileData.email) session.profile.email = profileData.email;
      if (profileData.avatar) session.profile.avatar = profileData.avatar;
    }

    this.emit('sessionsUpdated', this.getActiveSessionsSummary());
    return session;
  }

  markSessionDisconnected(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isOnline = false;
      session.disconnectedAt = new Date().toISOString();
      this.recordAuditLog(sessionId, 'USER_DISCONNECT', `세션 종료: ${session.profile.name}`, session.ip, session.profile, `${session.os} · ${session.browser}`);
      this.emit('sessionsUpdated', this.getActiveSessionsSummary());
    }
  }

  updateProfile(sessionId, newProfile) {
    const session = this.sessions.get(sessionId);
    if (session) {
      const prevName = session.profile.name;
      session.profile = { ...session.profile, ...newProfile };
      session.lastActiveAt = new Date().toISOString();
      session.actionCount++;
      session.lastAction = `프로필 변경: ${prevName} ➔ ${session.profile.name} (${session.profile.role})`;

      this.recordAuditLog(sessionId, 'PROFILE_CHANGE', session.lastAction, session.ip, session.profile, `${session.os} · ${session.browser}`);
      this.emit('sessionsUpdated', this.getActiveSessionsSummary());
      return session;
    }
    return null;
  }

  recordAction(sessionId, actionType, details, status = 'SUCCESS') {
    const session = this.sessions.get(sessionId) || {
      sessionId: sessionId || 'anonymous',
      ip: '127.0.0.1',
      profile: { name: '개발자 (Local Dev)', role: 'Embedded Engineer', avatar: '💻' },
      os: 'macOS',
      browser: 'Browser'
    };

    session.lastActiveAt = new Date().toISOString();
    session.actionCount = (session.actionCount || 0) + 1;
    session.lastAction = `${actionType}: ${details}`;

    this.recordAuditLog(sessionId, actionType, details, session.ip, session.profile, `${session.os} · ${session.browser}`, status);
    this.emit('sessionsUpdated', this.getActiveSessionsSummary());
  }

  recordAuditLog(sessionId, eventType, details, ip = '127.0.0.1', profile = {}, clientEnv = '', status = 'SUCCESS') {
    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: now.toISOString(),
      timeFormatted,
      sessionId: sessionId || 'system',
      eventType,
      details,
      status,
      ip,
      userName: profile.name || '시스템',
      userRole: profile.role || 'System',
      userAvatar: profile.avatar || '💻',
      clientEnv
    };

    this.accessLogs.unshift(logEntry);
    if (this.accessLogs.length > this.maxLogs) {
      this.accessLogs.pop();
    }

    this.emit('newAuditLog', logEntry);
    return logEntry;
  }

  getActiveSessions() {
    return Array.from(this.sessions.values()).filter(s => s.isOnline);
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  getActiveSessionsSummary() {
    const active = this.getActiveSessions();
    return {
      activeCount: active.length,
      totalTracked: this.sessions.size,
      activeSessions: active,
      recentLogs: this.accessLogs.slice(0, 50)
    };
  }

  getAuditLogs(filter = 'all', limit = 100) {
    if (filter === 'all') {
      return this.accessLogs.slice(0, limit);
    }
    return this.accessLogs.filter(l => l.eventType.toLowerCase().includes(filter.toLowerCase())).slice(0, limit);
  }

  exportCsv() {
    const headers = ['Timestamp', 'SessionId', 'Developer', 'Role', 'IP', 'Environment', 'EventType', 'Details', 'Status'];
    const rows = this.accessLogs.map(l => [
      l.timestamp,
      l.sessionId,
      `"${l.userName}"`,
      `"${l.userRole}"`,
      l.ip,
      `"${l.clientEnv}"`,
      l.eventType,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      l.status
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

module.exports = new SessionTracker();
