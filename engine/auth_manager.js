/**
 * Nordic Matter Development Studio - User Authentication & Session Manager
 */
const crypto = require('crypto');

class AuthManager {
  constructor() {
    this.users = new Map();
    this.sessions = new Map(); // token -> session info

    // Seed default team accounts
    this.seedUsers();
  }

  seedUsers() {
    const defaultAccounts = [
      {
        id: 'admin',
        username: 'admin',
        password: this.hashPassword('admin1234'),
        name: '시스템 최고 관리자',
        role: 'admin',
        email: 'admin@nordic-matter.studio',
        avatar: '👑',
        status: 'active',
        createdAt: '2026-11-19T00:00:00.000Z'
      },
      {
        id: 'engineer',
        username: 'engineer',
        password: this.hashPassword('dev1234'),
        name: '임베디드 수석 엔지니어',
        role: 'engineer',
        email: 'engineer@nordic-matter.studio',
        avatar: '👨‍💻',
        status: 'active',
        createdAt: '2026-11-19T00:00:00.000Z'
      },
      {
        id: 'qa',
        username: 'qa',
        password: this.hashPassword('qa1234'),
        name: 'Matter 표준 QA 리드',
        role: 'qa',
        email: 'qa@nordic-matter.studio',
        avatar: '🧪',
        status: 'active',
        createdAt: '2026-11-19T00:00:00.000Z'
      },
      {
        id: 'guest',
        username: 'guest',
        password: this.hashPassword('guest1234'),
        name: '게스트 참관자',
        role: 'viewer',
        email: 'guest@nordic-matter.studio',
        avatar: '👀',
        status: 'active',
        createdAt: '2026-11-19T00:00:00.000Z'
      }
    ];

    defaultAccounts.forEach(acc => {
      this.users.set(acc.username.toLowerCase(), acc);
    });
  }

  hashPassword(plain) {
    return crypto.createHash('sha256').update(String(plain)).digest('hex');
  }

  login(username, password, clientInfo = {}) {
    const user = this.users.get((username || '').toLowerCase().trim());
    if (!user) {
      return { success: false, error: 'USER_NOT_FOUND', message: '존재하지 않는 사용자 계정입니다.' };
    }

    if (user.status === 'blocked') {
      return { success: false, error: 'USER_BLOCKED', message: '관리자에 의해 비활성화/차단된 계정입니다. 관리자에게 문의하세요.' };
    }

    const hashed = this.hashPassword(password);
    if (user.password !== hashed) {
      return { success: false, error: 'INVALID_PASSWORD', message: '비밀번호가 올바르지 않습니다.' };
    }

    // Create session token
    const token = 'tok_' + crypto.randomBytes(24).toString('hex');
    const session = {
      token,
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      email: user.email,
      ip: clientInfo.ip || '127.0.0.1',
      userAgent: clientInfo.userAgent || '',
      loginAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString()
    };

    this.sessions.set(token, session);
    user.lastLoginAt = session.loginAt;

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        email: user.email
      }
    };
  }

  register(userData) {
    const username = (userData.username || '').toLowerCase().trim();
    if (!username || username.length < 3) {
      return { success: false, error: 'INVALID_USERNAME', message: '아이디는 영문 3자 이상이어야 합니다.' };
    }

    if (this.users.has(username)) {
      return { success: false, error: 'USER_EXISTS', message: '이미 존재하는 사용자 아이디입니다.' };
    }

    if (!userData.password || userData.password.length < 4) {
      return { success: false, error: 'INVALID_PASSWORD', message: '비밀번호는 최소 4자 이상이어야 합니다.' };
    }

    const newUser = {
      id: 'usr_' + Date.now().toString(36),
      username,
      password: this.hashPassword(userData.password),
      name: userData.name || username,
      role: userData.role || 'engineer',
      email: userData.email || `${username}@nordic-matter.studio`,
      avatar: userData.avatar || '👨‍💻',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: null
    };

    this.users.set(username, newUser);

    // Auto login
    return this.login(username, userData.password, {});
  }

  logout(token) {
    if (this.sessions.has(token)) {
      this.sessions.delete(token);
      return { success: true };
    }
    return { success: true };
  }

  getSession(token) {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (session) {
      session.lastSeenAt = new Date().toISOString();
      return session;
    }
    return null;
  }

  getAllUsers() {
    return Array.from(this.users.values()).map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      email: u.email,
      avatar: u.avatar,
      status: u.status,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt
    }));
  }

  updateUserStatus(username, status) {
    const user = this.users.get((username || '').toLowerCase().trim());
    if (!user) return { success: false, message: '사용자를 찾을 수 없습니다.' };
    if (user.username === 'admin' && status === 'blocked') {
      return { success: false, message: '최고 관리자 계정은 비활성화할 수 없습니다.' };
    }
    user.status = status === 'blocked' ? 'blocked' : 'active';
    return { success: true, user };
  }

  updateUserRole(username, role) {
    const user = this.users.get((username || '').toLowerCase().trim());
    if (!user) return { success: false, message: '사용자를 찾을 수 없습니다.' };
    if (user.username === 'admin' && role !== 'admin') {
      return { success: false, message: '최고 관리자의 권한은 변경할 수 없습니다.' };
    }
    user.role = role;
    return { success: true, user };
  }
}

module.exports = new AuthManager();
