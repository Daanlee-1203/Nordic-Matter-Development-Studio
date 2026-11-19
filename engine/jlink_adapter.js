const { exec } = require('child_process');
const fs = require('fs');

class JLinkAdapter {
  constructor() {
    this.jlinkPath = '/usr/local/bin/JLinkExe';
    this.hasJLink = fs.existsSync(this.jlinkPath);
    this.connected = false; // Real initial state
    this.serialNumber = null;
    this.targetDevice = 'nRF5340_xxAA_APP';
    this.cmdScriptPath = '/tmp/nrf5340_jlink_cmd.jlink';
    this.isExecuting = false;
    this.targetVoltage = 0.00;
  }

  checkInstallation() {
    return {
      installed: this.hasJLink,
      path: this.jlinkPath,
      connected: this.connected,
      serialNumber: this.serialNumber,
      targetVoltage: this.targetVoltage
    };
  }

  // Active Real-time Hardware Probe Scan
  async scanDevice() {
    if (!this.hasJLink) {
      this.connected = false;
      this.serialNumber = null;
      this.targetVoltage = 0.00;
      return {
        connected: false,
        serialNumber: null,
        targetVoltage: 0.00,
        message: 'JLinkExe 디버거 실행 파일이 설치되지 않았습니다.'
      };
    }

    return new Promise((resolve) => {
      // 1. Check physical USB enumeration on macOS (Vendor ID 0x1366 = SEGGER, or J-Link / PCA)
      exec('ioreg -p IOUSB -w0 -l | grep -i -E "1366|SEGGER|J-Link|PCA10095"', { timeout: 2500 }, (usbErr, stdout) => {
        const usbFound = Boolean(stdout && (stdout.includes('1366') || stdout.toLowerCase().includes('segger') || stdout.toLowerCase().includes('j-link') || stdout.includes('PCA10095')));

        if (!usbFound) {
          this.connected = false;
          this.serialNumber = null;
          this.targetVoltage = 0.00;
          return resolve({
            connected: false,
            serialNumber: null,
            targetVoltage: 0.00,
            message: '물리 보드가 USB에 연결되지 않았습니다. (가상 에뮬레이터 모드로 동작합니다)'
          });
        }

        // 2. Physical USB detected! Verify communication via JLink script
        try {
          const scriptContent = 'ShowEmuList\nconnect\nexit\n';
          fs.writeFileSync(this.cmdScriptPath, scriptContent);
          const cmd = `${this.jlinkPath} -device ${this.targetDevice} -if SWD -speed 4000 -autoconnect 1 -nogui 1 -CommandFile ${this.cmdScriptPath}`;

          exec(cmd, { timeout: 3500 }, (err, jlinkOut) => {
            if (err || !jlinkOut || jlinkOut.includes('FAILED') || jlinkOut.includes('Cannot connect')) {
              this.connected = false;
              this.serialNumber = null;
              this.targetVoltage = 0.00;
              return resolve({
                connected: false,
                serialNumber: null,
                targetVoltage: 0.00,
                message: 'USB 장치는 감지되었으나 J-Link SWD 응답이 없습니다. (케이블 및 전원 확인 필요)'
              });
            }

            // Extract Serial Number & Target Voltage
            const snMatch = jlinkOut.match(/Serial number:\s*(\d+)/i) || jlinkOut.match(/SN\s*(\d+)/i);
            const vtrefMatch = jlinkOut.match(/VTref\s*=\s*([\d\.]+)/i);

            this.connected = true;
            this.serialNumber = snMatch ? snMatch[1] : 'JLINK-DETECTED';
            this.targetVoltage = vtrefMatch ? parseFloat(vtrefMatch[1]) : 3.30;

            console.log(`[JLink Hardware Scan] Probe detected: S/N ${this.serialNumber}, VTref: ${this.targetVoltage}V`);
            return resolve({
              connected: true,
              serialNumber: this.serialNumber,
              targetVoltage: this.targetVoltage,
              message: `물리 J-Link 프로브 감지됨 (S/N: ${this.serialNumber}, ${this.targetVoltage}V)`
            });
          });
        } catch (e) {
          this.connected = false;
          return resolve({ connected: false, message: e.message });
        }
      });
    });
  }

  // Turn All 4 LEDs ON on nRF5340 DK (Active Low: P0.28..31 -> 0V)
  async turnAllLedsOn() {
    if (!this.connected) {
      console.log('[Virtual Engine] Driving P0.28..31 LOW (All 4 LEDs ON in Simulation)...');
      return { success: true, simulated: true, message: 'Virtual Engine: All LEDs ON' };
    }
    console.log('[Hardware J-Link] Driving P0.28..31 LOW (All 4 LEDs ON)...');
    return this.runCommands([
      'connect',
      'h',
      'w4 0x50842518 0xF0000000', // P0 DIRSET
      'w4 0x5084250C 0xF0000000', // P0 OUTCLR (0V -> LED ON)
      'exit'
    ]);
  }

  // Turn All 4 LEDs OFF on nRF5340 DK (Active Low: P0.28..31 -> 3.3V)
  async turnAllLedsOff() {
    if (!this.connected) {
      console.log('[Virtual Engine] Driving P0.28..31 HIGH (All 4 LEDs OFF in Simulation)...');
      return { success: true, simulated: true, message: 'Virtual Engine: All LEDs OFF' };
    }
    console.log('[Hardware J-Link] Driving P0.28..31 HIGH (All 4 LEDs OFF)...');
    return this.runCommands([
      'connect',
      'h',
      'w4 0x50842518 0xF0000000', // P0 DIRSET
      'w4 0x50842508 0xF0000000', // P0 OUTSET (3.3V -> LED OFF)
      'exit'
    ]);
  }

  // Real Hardware GPIO LED Control for individual states
  async setLedsHardware(ledStates) {
    if (!this.connected) {
      return { success: true, simulated: true, message: 'Virtual Engine: Individual LEDs updated' };
    }

    const pinMap = { led1: 28, led2: 29, led3: 30, led4: 31 };
    let clearMask = 0; // Turn ON
    let setMask = 0;   // Turn OFF

    for (const [key, state] of Object.entries(ledStates)) {
      const pin = pinMap[key];
      if (pin !== undefined) {
        if (state) {
          clearMask |= (1 << pin);
        } else {
          setMask |= (1 << pin);
        }
      }
    }

    const clearHex = '0x' + (clearMask >>> 0).toString(16).toUpperCase();
    const setHex = '0x' + (setMask >>> 0).toString(16).toUpperCase();

    const commands = [
      'connect',
      'h',
      'w4 0x50842518 0xF0000000' // Ensure Output direction
    ];

    if (clearMask !== 0) {
      commands.push(`w4 0x5084250C ${clearHex}`);
    }
    if (setMask !== 0) {
      commands.push(`w4 0x50842508 ${setHex}`);
    }
    commands.push('exit');

    return this.runCommands(commands);
  }

  async resetHardware() {
    if (!this.connected) return { success: true, simulated: true };
    return this.runCommands(['connect', 'r', 'g', 'exit']);
  }

  async eraseHardware() {
    if (!this.connected) return { success: true, simulated: true };
    return this.runCommands(['connect', 'h', 'erase', 'r', 'g', 'exit']);
  }

  runCommands(commands) {
    if (!this.hasJLink || !this.connected) {
      return Promise.resolve({ success: true, simulated: true, message: 'Virtual engine execution (No physical probe connected)' });
    }

    return new Promise((resolve) => {
      try {
        const scriptContent = commands.join('\n') + '\n';
        fs.writeFileSync(this.cmdScriptPath, scriptContent);

        // Fast high-speed SWD execution
        const cmd = `${this.jlinkPath} -device ${this.targetDevice} -if SWD -speed 4000 -autoconnect 1 -nogui 1 -CommandFile ${this.cmdScriptPath}`;
        
        exec(cmd, { timeout: 4500 }, (error, stdout, stderr) => {
          if (error) {
            console.error('[JLink Error]', error.message);
            return resolve({ success: false, error: error.message });
          }
          console.log('[JLink Executed Successfully]');
          resolve({ success: true, output: stdout });
        });
      } catch (err) {
        console.error('[JLink Exception]', err);
        resolve({ success: false, error: err.message });
      }
    });
  }
}

module.exports = new JLinkAdapter();
