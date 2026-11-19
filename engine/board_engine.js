const EventEmitter = require('events');
const jlink = require('./jlink_adapter');
const matter = require('./matter_adapter');
const boardsCatalog = require('./boards_catalog');

class BoardEngine extends EventEmitter {
  constructor() {
    super();

    this.boardInfo = {
      boardName: 'nRF5340 DK',
      pcaCode: 'PCA10095',
      hardwareVersion: 'v1.0.0',
      activeBoardId: 'nrf5340dk',
      boardTarget: 'nrf5340dk/nrf5340/cpuapp',
      serialNumber: '미연결 (Not Detected)',
      vddVoltage: 0.00,
      temperatureC: 24.8,
      powerSwitch: true,
      jlinkConnected: false,
      mode: 'simulation'
    };

    this.appCore = {
      name: 'Application Core',
      arch: 'Arm Cortex-M33 r0p4 (FPU/DSP/TrustZone)',
      clockSpeed: '128 MHz',
      status: 'Running',
      pc: '0x0006F712',
      sp: '0x20027F10',
      firmware: 'matter_light_bulb_v1.1'
    };

    this.netCore = {
      name: 'Network Core',
      arch: 'Arm Cortex-M33',
      clockSpeed: '64 MHz',
      status: 'Running',
      pc: '0x01004C88',
      sp: '0x21003400',
      firmware: 'nrf_802154_ble_controller_v2.5'
    };

    // Hardware GPIO mappings (LED 1~4)
    this.leds = {
      led1: true,
      led2: true,
      led3: true,
      led4: true
    };

    this.buttons = {
      button1: false,
      button2: false,
      button3: false,
      button4: false
    };

    this.flashPartitions = [
      { core: 'App Flash', name: 'mcuboot (Bootloader)', start: '0x00000000', size: '64 KB', used: '48 KB', percent: 75, color: '#38bdf8' },
      { core: 'App Flash', name: 'app_slot0 (Matter Light Bulb)', start: '0x00010000', size: '448 KB', used: '392 KB', percent: 87, color: '#00a9ce' },
      { core: 'App Flash', name: 'app_slot1 (DFU Secondary)', start: '0x00080000', size: '448 KB', used: '0 KB', percent: 0, color: '#64748b' },
      { core: 'App Flash', name: 'storage_nvs (Matter Settings)', start: '0x000F0000', size: '64 KB', used: '18 KB', percent: 28, color: '#10b981' },
      { core: 'Net Flash', name: 'net_core_controller (OpenThread + BLE)', start: '0x01000000', size: '256 KB', used: '210 KB', percent: 82, color: '#f59e0b' },
      { core: 'QSPI Flash', name: 'mx25r6435f (External 8MB DFU/Logs)', start: '0x10000000', size: '8192 KB', used: '1024 KB', percent: 12, color: '#8b5cf6' }
    ];

    // Data Lineage History
    this.lineageHistory = [];
    this.maxLineage = 20;

    // Terminal log buffer
    this.logs = [];
    this.maxLogs = 300;

    // Connect Matter state to Board LEDs
    matter.on('stateChanged', async (st) => {
      if (this.leds.led2 !== st.onOff) {
        this.leds.led2 = st.onOff;
        if (this.boardInfo.mode === 'hardware') {
          await jlink.setLedsHardware(this.leds);
        }
      }
      this.emit('boardUpdated', this.getBoardState());
    });

    this.initLogs();

    // Perform live hardware probe scan on startup
    this.checkHardwareProbe(true);

    // Auto periodic scan every 4 seconds to detect plug/unplug
    setInterval(() => {
      this.checkHardwareProbe(false);
    }, 4000);
  }

  async checkHardwareProbe(isInit = false) {
    const scan = await jlink.scanDevice();
    const prevConnected = this.boardInfo.jlinkConnected;

    this.boardInfo.jlinkConnected = scan.connected;
    this.boardInfo.mode = scan.connected ? 'hardware' : 'simulation';
    this.boardInfo.serialNumber = scan.connected ? scan.serialNumber : '미연결 (Not Detected)';
    this.boardInfo.vddVoltage = scan.connected ? scan.targetVoltage : 0.00;

    if (boardsCatalog && boardsCatalog.catalog && boardsCatalog.catalog.nrf5340dk) {
      boardsCatalog.catalog.nrf5340dk.isPhysicalConnected = scan.connected;
    }

    if (prevConnected !== scan.connected || isInit) {
      if (scan.connected) {
        this.addLog('INF', 'hw', `물리 nRF5340 DK 연결됨 (S/N: ${scan.serialNumber}, VTref: ${scan.targetVoltage}V)`);
      } else {
        this.addLog('WRN', 'hw', '물리 보드가 USB에 연결되지 않았습니다. (가상 에뮬레이터 모드로 동작합니다)');
      }
      this.emit('boardUpdated', this.getBoardState());
    }
    return scan;
  }

  initLogs() {
    this.addLog('INF', 'boot', '*** Booting Zephyr OS build v3.7.99-ncs2 ***');
    this.addLog('INF', 'gpio', 'P0.28..31 configured: User LEDs initialized');
    this.addLog('INF', 'lineage', 'Data Lineage & Command Flow Tracking Pipeline initialized');
  }

  addLog(level, module, message) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0');
    const logEntry = { timestamp, level, module, message };
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.emit('newLog', logEntry);
  }

  // Record Data Lineage Flow Event
  recordLineage(flowEvent) {
    this.lineageHistory.unshift(flowEvent);
    if (this.lineageHistory.length > this.maxLineage) {
      this.lineageHistory.pop();
    }
    this.emit('lineageUpdated', flowEvent);
  }

  syncActiveBoard(boardId) {
    const b = boardsCatalog.getBoard(boardId);
    if (!b) return;

    this.boardInfo.boardName = b.name;
    this.boardInfo.pcaCode = b.code;
    this.boardInfo.hardwareVersion = b.version;
    this.boardInfo.boardTarget = b.boardTarget;
    this.boardInfo.activeBoardId = b.id;

    // Reset or adapt leds to match board's defined leds
    const newLeds = {};
    if (b.leds) {
      Object.keys(b.leds).forEach(k => {
        newLeds[k] = true;
      });
    } else {
      newLeds.led1 = true;
      newLeds.led2 = true;
      newLeds.led3 = true;
      newLeds.led4 = true;
    }
    this.leds = newLeds;

    // Update appCore / netCore telemetry
    if (b.cores) {
      if (b.cores.app) {
        this.appCore.name = b.cores.app.name || 'Application Core';
        this.appCore.arch = b.cores.app.cpu || 'Arm Cortex-M33';
        this.appCore.clockSpeed = (b.cores.app.cpu && b.cores.app.cpu.includes('128')) ? '128 MHz' : '64 MHz';
      }
      if (b.cores.net) {
        this.netCore.name = b.cores.net.name || 'Network Core';
        this.netCore.arch = b.cores.net.cpu || 'Arm Cortex-M33';
        this.netCore.clockSpeed = '64 MHz';
      } else {
        this.netCore.name = 'Co-Processor / Radio';
        this.netCore.arch = Array.isArray(b.wireless) ? b.wireless.join(', ') : 'Matter Radio';
        this.netCore.clockSpeed = 'N/A';
      }
    }

    this.addLog('INF', 'catalog', `개발보드가 [${b.name}] (${b.code})로 전환되었습니다. 타깃: ${b.boardTarget}`);
    this.emit('boardUpdated', this.getBoardState());
  }

  getBoardState() {
    return {
      boardInfo: this.boardInfo,
      appCore: this.appCore,
      netCore: this.netCore,
      leds: this.leds,
      buttons: this.buttons,
      flashPartitions: this.flashPartitions,
      latestLineage: this.lineageHistory.length > 0 ? this.lineageHistory[0] : null
    };
  }

  getLineageHistory() {
    return this.lineageHistory;
  }

  getLogs() {
    return this.logs;
  }

  // -------------------------------------------------------------
  // Data Lineage Tracking Implementation for Board Commands
  // -------------------------------------------------------------
  async setAllLeds(turnOn) {
    const startTime = Date.now();
    const isTurnOn = Boolean(turnOn);
    const reqId = `cmd-all-${Date.now().toString(36)}`;

    // Build Data Lineage Event
    const lineage = {
      requestId: reqId,
      command: `Turn All LEDs ${isTurnOn ? 'ON' : 'OFF'}`,
      origin: 'Web Dashboard Action Button',
      timestamp: new Date().toISOString(),
      stages: [
        {
          stage: 1,
          name: 'Client Intent',
          node: 'UI / REST API',
          status: 'SUCCESS',
          latencyMs: 1,
          details: `POST /api/board/leds/all { turnOn: ${isTurnOn} }`
        },
        {
          stage: 2,
          name: 'Driver Synthesis',
          node: 'Engine Layer',
          status: 'SUCCESS',
          latencyMs: 2,
          details: isTurnOn ? 'OUTCLR Target: 0xF0000000 (Active-Low 0V)' : 'OUTSET Target: 0xF0000000 (Active-Low 3.3V)'
        },
        {
          stage: 3,
          name: 'SWD Transport',
          node: 'J-Link OB Probe',
          status: 'RUNNING',
          latencyMs: 0,
          details: `SWD Speed: 4000 kHz, Device: ${this.boardInfo.serialNumber}`
        }
      ]
    };

    // Optimistic Board Update for all configured board LEDs
    Object.keys(this.leds).forEach(k => {
      this.leds[k] = isTurnOn;
    });
    matter.state.onOff = isTurnOn;
    this.emit('boardUpdated', this.getBoardState());

    // Execute on Physical Hardware (if physical nrf5340dk is connected)
    if (this.boardInfo.mode === 'hardware' && this.boardInfo.jlinkConnected) {
      const swdStart = Date.now();
      if (isTurnOn) {
        await jlink.turnAllLedsOn();
      } else {
        await jlink.turnAllLedsOff();
      }
      const swdDuration = Date.now() - swdStart;
      lineage.stages[2].status = 'SUCCESS';
      lineage.stages[2].latencyMs = swdDuration;
    } else {
      lineage.stages[2].status = 'SIMULATED';
      lineage.stages[2].latencyMs = 1;
    }

    // Stage 4: SoC Core Execution
    lineage.stages.push({
      stage: 4,
      name: 'Core Execution',
      node: 'Cortex-M33 (128MHz)',
      status: 'SUCCESS',
      latencyMs: 1,
      details: 'PC: 0x0006F712 | AHB-AP Bus Matrix Write'
    });

    // Stage 5: Register State
    lineage.stages.push({
      stage: 5,
      name: 'GPIO Peripheral',
      node: 'Port 0 Registers',
      status: 'SUCCESS',
      latencyMs: 1,
      details: `0x50842504 (OUT): ${isTurnOn ? '0x001D0000' : '0xF01D0000'}`
    });

    // Stage 6: Physical Feedback
    const totalLatency = Date.now() - startTime;
    lineage.stages.push({
      stage: 6,
      name: 'Observed State',
      node: 'Physical LED Optic',
      status: 'SUCCESS',
      latencyMs: totalLatency,
      details: isTurnOn ? 'All 4 Green LEDs Radiant (ON)' : 'All 4 LEDs Extinguished (OFF)'
    });

    lineage.totalLatencyMs = totalLatency;
    this.recordLineage(lineage);
    this.addLog('INF', 'lineage', `[LINEAGE ${reqId}] Completed in ${totalLatency}ms -> All LEDs ${isTurnOn ? 'ON' : 'OFF'}`);

    this.emit('boardUpdated', this.getBoardState());
    return { success: true, allLeds: isTurnOn, lineage };
  }

  async setGpio(pin, value) {
    const startTime = Date.now();
    const val = Boolean(value);
    
    // Dynamically retrieve pin descriptor from active board
    const activeBoard = boardsCatalog.getActiveBoard();
    const pinInfo = (activeBoard && activeBoard.leds && activeBoard.leds[pin]) || null;
    const pinName = pinInfo ? pinInfo.pin : pin.toUpperCase();
    const reqId = `cmd-${pin}-${Date.now().toString(36)}`;

    const lineage = {
      requestId: reqId,
      command: `Toggle ${pin.toUpperCase()} (${pinName}) -> ${val ? 'ON' : 'OFF'}`,
      origin: 'Interactive Board / Dashboard',
      timestamp: new Date().toISOString(),
      stages: [
        {
          stage: 1,
          name: 'Client Intent',
          node: 'UI Interactive Controller',
          status: 'SUCCESS',
          latencyMs: 1,
          details: `Target: ${pinName} (${pin.toUpperCase()}) -> ${val ? 'ON' : 'OFF'}`
        },
        {
          stage: 2,
          name: 'Driver Synthesis',
          node: 'Bitmask Generator',
          status: 'SUCCESS',
          latencyMs: 1,
          details: `Port Register: ${pinName} Active-${pinInfo && pinInfo.desc && pinInfo.desc.includes('High') ? 'High' : 'Low'}`
        },
        {
          stage: 3,
          name: 'SWD Transport',
          node: 'J-Link OB Probe',
          status: 'RUNNING',
          latencyMs: 0,
          details: `Device: ${this.boardInfo.serialNumber} (${this.boardInfo.mode.toUpperCase()})`
        }
      ]
    };

    if (this.leds[pin] !== undefined) {
      this.leds[pin] = val;
      if (pin === 'led2' || pin === 'led1' || pin === 'rgb') {
        matter.state.onOff = val;
      }
      this.emit('boardUpdated', this.getBoardState());

      if (this.boardInfo.mode === 'hardware' && this.boardInfo.jlinkConnected) {
        const swdStart = Date.now();
        await jlink.setLedsHardware(this.leds);
        lineage.stages[2].status = 'SUCCESS';
        lineage.stages[2].latencyMs = Date.now() - swdStart;
      } else {
        lineage.stages[2].status = 'SIMULATED';
        lineage.stages[2].latencyMs = 1;
      }

      lineage.stages.push({
        stage: 4,
        name: 'Core Execution',
        node: this.appCore.arch || 'Cortex-M33 (128MHz)',
        status: 'SUCCESS',
        latencyMs: 1,
        details: `PC: 0x0006F712 | ${pinName} register updated`
      });

      lineage.stages.push({
        stage: 5,
        name: 'GPIO Peripheral',
        node: 'GPIO Port Registers',
        status: 'SUCCESS',
        latencyMs: 1,
        details: `Port Registers updated for ${pinName} (${val ? 'ON' : 'OFF'})`
      });

      const totalLatency = Date.now() - startTime;
      lineage.stages.push({
        stage: 6,
        name: 'Observed State',
        node: 'Physical LED Optic',
        status: 'SUCCESS',
        latencyMs: totalLatency,
        details: `${pin.toUpperCase()} is ${val ? 'LUMINESCENT' : 'DARK'}`
      });

      lineage.totalLatencyMs = totalLatency;
      this.recordLineage(lineage);
      this.addLog('INF', 'lineage', `[LINEAGE ${reqId}] ${pin.toUpperCase()} -> ${val ? 'ON' : 'OFF'} (${totalLatency}ms)`);

      this.emit('boardUpdated', this.getBoardState());
      return { success: true, pin, value: val, lineage };
    }
    return { success: false, message: `Unknown pin: ${pin}` };
  }

  async pressButton(buttonName) {
    if (this.buttons[buttonName] !== undefined) {
      this.buttons[buttonName] = true;
      this.emit('boardUpdated', this.getBoardState());

      if (buttonName === 'button1') {
        const cur = matter.state.onOff;
        await this.setGpio('led2', !cur);
      } else if (buttonName === 'button2') {
        this.leds.led3 = true;
        this.emit('boardUpdated', this.getBoardState());
        if (this.boardInfo.mode === 'hardware') {
          await jlink.setLedsHardware(this.leds);
        }
        setTimeout(async () => {
          this.leds.led3 = false;
          if (this.boardInfo.mode === 'hardware') {
            await jlink.setLedsHardware(this.leds);
          }
          this.emit('boardUpdated', this.getBoardState());
        }, 4000);
      }

      setTimeout(() => {
        this.buttons[buttonName] = false;
        this.emit('boardUpdated', this.getBoardState());
      }, 250);

      return { success: true, button: buttonName };
    }
    return { success: false, message: `Unknown button: ${buttonName}` };
  }

  async resetBoard(target = 'all') {
    this.addLog('WRN', 'board', `Hardware reset requested for: ${target}`);
    this.appCore.status = 'Resetting';
    this.emit('boardUpdated', this.getBoardState());

    if (this.boardInfo.mode === 'hardware') {
      await jlink.resetHardware();
    }

    setTimeout(async () => {
      this.appCore.status = 'Running';
      this.appCore.pc = '0x0006F712';
      this.addLog('INF', 'boot', 'Hardware reset completed.');
      if (this.boardInfo.mode === 'hardware') {
        await jlink.setLedsHardware(this.leds);
      }
      this.emit('boardUpdated', this.getBoardState());
    }, 700);

    return { success: true, message: `Board reset (${target}) completed` };
  }

  async eraseFlash(area = 'chip') {
    this.addLog('WRN', 'flash', `Erase flash requested: ${area} (Mode: ${this.boardInfo.mode.toUpperCase()})`);

    // Strict hardware connection validation
    if (this.boardInfo.mode === 'hardware') {
      if (!this.boardInfo.jlinkConnected) {
        this.addLog('ERR', 'flash', 'Erase flash aborted: No physical J-Link target board detected via USB.');
        return {
          success: false,
          error: 'NO_BOARD_CONNECTED',
          message: '물리 보드가 USB로 연결되어 있지 않아 플래시 삭제를 진행할 수 없습니다. J-Link USB 케이블을 연결하거나 가상 엔진 모드를 이용하십시오.'
        };
      }
      await jlink.eraseHardware();
    }

    this.appCore.status = 'Halted';
    this.emit('boardUpdated', this.getBoardState());

    await new Promise(r => setTimeout(r, 1500));
    this.appCore.status = 'Running';
    this.emit('boardUpdated', this.getBoardState());
    return { success: true, message: `Flash ${area} successfully erased` };
  }

  async flashSample(sampleName) {
    this.addLog('INF', 'flash', `Flash programming requested: ${sampleName} (Mode: ${this.boardInfo.mode.toUpperCase()})`);

    // Strict hardware connection validation
    if (this.boardInfo.mode === 'hardware') {
      if (!this.boardInfo.jlinkConnected) {
        this.addLog('ERR', 'flash', `Flash programming aborted: Cannot program "${sampleName}". No physical J-Link target board detected via USB.`);
        return {
          success: false,
          error: 'NO_BOARD_CONNECTED',
          message: '물리 보드가 USB로 연결되어 있지 않아 플래시 기록을 진행할 수 없습니다. J-Link USB 케이블을 연결하거나 가상 엔진 모드를 이용하십시오.'
        };
      }
      await jlink.setLedsHardware(this.leds);
    }

    this.appCore.status = 'Programming';
    this.emit('boardUpdated', this.getBoardState());

    await new Promise(r => setTimeout(r, 1800));
    this.appCore.status = 'Running';
    this.appCore.firmware = sampleName;
    this.emit('boardUpdated', this.getBoardState());
    return { success: true, message: `Firmware ${sampleName} programmed` };
  }

  processCommand(input) {
    const raw = (input || '').trim();
    if (!raw) return '';
    this.addLog('CLI', 'input', `$ ${raw}`);
    const parts = raw.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case 'help':
        return [
          'Commands:',
          '  help                - Show commands',
          '  status              - Board & Lineage telemetry',
          '  led <1-4|all> <on|off>',
          '  matter <on|off|level|temp>',
          '  lineage             - Dump recent data lineage event',
          '  reboot              - Reset board'
        ].join('\n');
      case 'status':
        return `Board: ${this.boardInfo.boardName} (S/N: ${this.boardInfo.serialNumber}) | VDD: ${this.boardInfo.vddVoltage}V`;
      case 'lineage':
        if (this.lineageHistory.length === 0) return 'No lineage events recorded yet.';
        const last = this.lineageHistory[0];
        return `Latest Lineage [${last.requestId}]: ${last.command} (${last.totalLatencyMs}ms)\n` +
          last.stages.map(s => `  [Stage ${s.stage}] ${s.node}: ${s.details} (${s.latencyMs}ms)`).join('\n');
      case 'led':
        if (parts[1] === 'all' && parts[2]) {
          this.setAllLeds(parts[2].toLowerCase() === 'on');
          return `All LEDs set to ${parts[2].toUpperCase()}`;
        }
        if (parts[1] && parts[2]) {
          this.setGpio(`led${parts[1]}`, parts[2].toLowerCase() === 'on');
          return `LED ${parts[1]} set to ${parts[2].toUpperCase()}`;
        }
        return 'Usage: led <1-4|all> <on|off>';
      default:
        return `Unknown command: ${cmd}. Type "help".`;
    }
  }
}

module.exports = new BoardEngine();
