const EventEmitter = require('events');

class MatterAdapter extends EventEmitter {
  constructor() {
    super();
    this.deviceType = 'Extended Color Light';
    this.deviceTypeId = '0x010D';
    this.endpointId = 1;
    this.nodeId = '0x17A8C9E23B01';
    this.fabricIndex = 1;

    // Current State
    this.state = {
      onOff: true,
      level: 180, // 1~254 (approx 71%)
      colorMode: 'temperature', // 'temperature' or 'color'
      colorTemperatureKelvin: 4000,
      colorTemperatureMireds: 250, // 1,000,000 / 4000
      hue: 200, // 0~360
      saturation: 80, // 0~100
      rgbHex: '#4facfe',
      transitionTimeMs: 400,
      lastUpdated: new Date().toISOString()
    };

    // Predefined Scenes
    this.scenes = [
      { id: 'reading', name: '독서 모드 (Reading)', onOff: true, level: 215, colorMode: 'temperature', colorTemperatureKelvin: 4000, colorTemperatureMireds: 250, rgbHex: '#fff0db' },
      { id: 'relax', name: '휴식 모드 (Relax)', onOff: true, level: 110, colorMode: 'temperature', colorTemperatureKelvin: 2700, colorTemperatureMireds: 370, rgbHex: '#ffd59e' },
      { id: 'focus', name: '집중 모드 (Concentrate)', onOff: true, level: 254, colorMode: 'temperature', colorTemperatureKelvin: 6500, colorTemperatureMireds: 153, rgbHex: '#d8eaff' },
      { id: 'night', name: '야간 조명 (Night Light)', onOff: true, level: 15, colorMode: 'temperature', colorTemperatureKelvin: 2200, colorTemperatureMireds: 454, rgbHex: '#ff9d47' },
      { id: 'nordic', name: '노르딕 시안 (Nordic Cyan)', onOff: true, level: 230, colorMode: 'color', rgbHex: '#00a9ce', hue: 191, saturation: 100 }
    ];

    // Alert & Event Pipeline
    this.activeAlert = null;
    this.stateSnapshot = null;
    this.eventHistory = [];
    this.processedEventIds = new Set();
  }

  getState() {
    return {
      endpoint: this.endpointId,
      deviceType: this.deviceType,
      deviceTypeId: this.deviceTypeId,
      nodeId: this.nodeId,
      fabricIndex: this.fabricIndex,
      state: this.state,
      activeAlert: this.activeAlert,
      scenes: this.scenes
    };
  }

  // Handle Level / OnOff / Color Commands
  updateControl(params) {
    let changed = false;

    if (params.level !== undefined) {
      let lvl = parseInt(params.level, 10);
      if (isNaN(lvl)) lvl = 1;
      this.state.level = Math.max(1, Math.min(254, lvl));
      if (this.state.level > 0 && params.onOff === undefined && !this.state.onOff && params.autoTurnOn === true) {
        this.state.onOff = true;
      }
      changed = true;
    }

    if (params.onOff !== undefined) {
      this.state.onOff = Boolean(params.onOff);
      changed = true;
    }

    if (params.colorTemperatureKelvin !== undefined) {
      let kelvin = Math.max(2200, Math.min(6500, parseInt(params.colorTemperatureKelvin, 10)));
      this.state.colorTemperatureKelvin = kelvin;
      this.state.colorTemperatureMireds = Math.round(1000000 / kelvin);
      this.state.colorMode = 'temperature';
      this.state.rgbHex = this.kelvinToRgbHex(kelvin);
      changed = true;
    }

    if (params.rgbHex !== undefined) {
      this.state.rgbHex = params.rgbHex;
      this.state.colorMode = 'color';
      changed = true;
    }

    if (params.hue !== undefined && params.saturation !== undefined) {
      this.state.hue = params.hue;
      this.state.saturation = params.saturation;
      this.state.colorMode = 'color';
      this.state.rgbHex = this.hslToHex(params.hue, params.saturation, 50);
      changed = true;
    }

    if (changed) {
      this.state.lastUpdated = new Date().toISOString();
      this.emit('stateChanged', this.state);
    }

    return this.getState();
  }

  applyScene(sceneId) {
    const scene = this.scenes.find(s => s.id === sceneId);
    if (!scene) {
      return { success: false, message: `Scene ${sceneId} not found` };
    }

    this.updateControl({
      onOff: scene.onOff,
      level: scene.level,
      colorMode: scene.colorMode,
      colorTemperatureKelvin: scene.colorTemperatureKelvin,
      rgbHex: scene.rgbHex,
      hue: scene.hue,
      saturation: scene.saturation
    });

    this.logEvent({
      id: `scene-${Date.now()}`,
      type: 'scene.activated',
      source: 'User UI',
      description: `적용된 장면: ${scene.name}`,
      timestamp: new Date().toISOString()
    });

    return { success: true, scene: scene.name, state: this.state };
  }

  // Trigger Notification Alert with Snapshot & Restore (PRD F-07)
  async triggerAlert(eventPayload) {
    const { eventId, eventType, source, label, alertColorHex, durationSeconds, blinkCount } = eventPayload;

    // Deduplication check
    if (this.processedEventIds.has(eventId)) {
      return { success: false, message: '중복된 이벤트 ID (이미 처리됨)' };
    }
    this.processedEventIds.add(eventId);

    // Save Snapshot of previous state
    if (!this.stateSnapshot) {
      this.stateSnapshot = JSON.parse(JSON.stringify(this.state));
    }

    const duration = (durationSeconds || 3) * 1000;
    const color = alertColorHex || '#ff3b30'; // default red alert

    this.activeAlert = {
      eventId,
      eventType: eventType || 'external.notification',
      source: source || 'Webhook',
      label: label || '외부 알림 이벤트',
      color,
      expiresAt: Date.now() + duration
    };

    this.logEvent({
      id: eventId,
      type: eventType,
      source,
      description: `[알림 실행] ${label} (${duration / 1000}초간 알림 표시 후 이전 상태 복원)`,
      timestamp: new Date().toISOString()
    });

    // Temporarily apply alert color and turn on
    this.updateControl({
      onOff: true,
      level: 254,
      rgbHex: color,
      colorMode: 'color'
    });

    this.emit('alertStarted', this.activeAlert);

    // Schedule restoration
    setTimeout(() => {
      if (this.activeAlert && this.activeAlert.eventId === eventId) {
        if (this.stateSnapshot) {
          this.state = JSON.parse(JSON.stringify(this.stateSnapshot));
          this.stateSnapshot = null;
        }
        this.activeAlert = null;
        this.emit('alertEnded', { eventId, restoredState: this.state });
        this.emit('stateChanged', this.state);

        this.logEvent({
          id: `restore-${Date.now()}`,
          type: 'alert.restored',
          source: 'System',
          description: `[상태 복원 완료] 이전 조명 상태로 안전하게 복귀됨`,
          timestamp: new Date().toISOString()
        });
      }
    }, duration);

    return { success: true, alert: this.activeAlert };
  }

  logEvent(evt) {
    this.eventHistory.unshift(evt);
    if (this.eventHistory.length > 50) this.eventHistory.pop();
  }

  getHistory() {
    return this.eventHistory;
  }

  // Helper converters
  kelvinToRgbHex(kelvin) {
    const temp = kelvin / 100;
    let red, green, blue;

    if (temp <= 66) {
      red = 255;
      green = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
      if (temp <= 19) {
        blue = 0;
      } else {
        blue = Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
      }
    } else {
      red = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
      green = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
      blue = 255;
    }

    const toHex = (n) => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
  }

  hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }
}

module.exports = new MatterAdapter();
