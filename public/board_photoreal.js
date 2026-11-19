/**
 * Photorealistic Nordic Matter Multi-Board Hardware Canvas Engine with Laser Lineage
 * Dynamically renders authentic physical DK hardware for:
 * 1. nRF5340 DK (PCA10095) - Dual-Core Matter over Thread Reference Kit
 * 2. nRF54LM20 DK (PCA10184) - Next-Gen 22nm Matter 1.6 Native NFC & BT 6.0 Channel Sounding
 * 3. nRF54L15 DK (PCA10156) - High Efficiency Sub-50uA/MHz Mainstream Matter Kit
 * 4. nRF52840 DK (PCA10056) - Classic Emerald Green Thread Reference Platform
 * 5. nRF7002 DK (PCA10143) - Matter over Wi-Fi 6 (2.4/5GHz Dual-Band) Kit
 * 6. Nordic Thingy:53 (PCA20053) - Multi-Sensor IoT Platform with High-Power RGB LED & BME688
 */

class PhotorealDKRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // Virtual Dimensions
    this.width = 1000;
    this.height = 600;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Active Board ID & Hardware Connection State
    this.activeBoardId = 'nrf5340dk';
    this.boardConfig = null;
    this.isHardwareConnected = false;
    this.serialNumber = '미연결 (Not Detected)';

    // Dynamic Components (Configured per board)
    this.leds = {};
    this.buttons = {};
    this.chips = [];
    this.usbPort = { x: 20, y: 245, w: 25, h: 42, type: 'usb' };

    // Circuit Laser Lineage Particles
    this.laserPulses = [];
    this.animFrame = null;

    // Apply default board
    this.applyBoardConfiguration('nrf5340dk');

    // Mouse Interaction
    this.initMouseInteractions();
    this.startRenderLoop();
  }

  // Update live hardware probe status
  syncHwStatus(connected, sn) {
    this.isHardwareConnected = Boolean(connected);
    if (sn) this.serialNumber = sn;
  }

  // Switch Active Development Board
  setBoardModel(boardId, boardData) {
    if (!boardId) return;
    this.activeBoardId = boardId;
    this.boardConfig = boardData || null;
    this.applyBoardConfiguration(boardId);
    if (typeof currentBoardState !== 'undefined' && currentBoardState && currentBoardState.leds) {
      Object.entries(currentBoardState.leds).forEach(([k, v]) => {
        this.setLedState(k, Boolean(v));
      });
    }
    this.draw();
  }

  applyBoardConfiguration(boardId) {
    this.laserPulses = []; // Clear in-flight lasers

    switch (boardId) {
      case 'nrf54lm20dk':
        // Next-Gen nRF54LM20 DK (PCA10184) - Matter 1.6 Native NFC & BT 6.0 Channel Sounding
        this.boardTheme = {
          name: 'nRF54LM20 DK',
          code: 'PCA10184 0.7.0',
          desc: '22nm Matter 1.6 / BT 6.0 Channel Sounding · 400861 0230GETR',
          pcbGradient: ['#09152b', '#060e1d', '#03070f'],
          borderGlow: '#00a9ce',
          goldPads: true,
          shape: 'dk'
        };
        this.usbPort = { x: 20, y: 245, w: 24, h: 40, type: 'usbc' };
        this.leds = {
          led0: { x: 730, y: 110, r: 10, pin: 'P0.00', label: 'LED 0 (SYS)', active: true, color: '#4ade80' },
          led1: { x: 780, y: 110, r: 10, pin: 'P0.01', label: 'LED 1 (MATTER)', active: true, color: '#38bdf8' },
          led2: { x: 830, y: 110, r: 10, pin: 'P0.02', label: 'LED 2 (THREAD)', active: true, color: '#f59e0b' },
          led3: { x: 880, y: 110, r: 10, pin: 'P0.03', label: 'LED 3 (NFC)', active: true, color: '#a855f7' }
        };
        this.buttons = {
          button0: { x: 720, y: 420, w: 36, h: 36, name: 'BTN 0', pin: 'P0.04', pressed: false },
          button1: { x: 770, y: 420, w: 36, h: 36, name: 'BTN 1', pin: 'P0.05', pressed: false },
          button2: { x: 820, y: 420, w: 36, h: 36, name: 'BTN 2', pin: 'P0.06', pressed: false },
          button3: { x: 870, y: 420, w: 36, h: 36, name: 'BTN 3', pin: 'P0.07', pressed: false }
        };
        this.chips = [
          { type: 'qfn', x: 120, y: 220, w: 85, h: 85, l1: 'SEGGER', l2: 'J-Link OB', l3: 'High-Speed USB-C' },
          { type: 'qfn', x: 440, y: 210, w: 135, h: 135, l1: 'nRF54LM20A', l2: '22nm ULP M33', l3: 'Secure Vault' },
          { type: 'sop', x: 620, y: 250, w: 48, h: 60, l1: '16MB QSPI', l2: 'PSRAM/NOR' }
        ];
        break;

      case 'nrf54l15dk':
        // High-Efficiency nRF54L15 DK (PCA10156)
        this.boardTheme = {
          name: 'nRF54L15 DK',
          code: 'PCA10156 v1.0.0',
          desc: 'High Efficiency Matter IoT Kit · Sub-50uA/MHz M33 + RISC-V',
          pcbGradient: ['#0a1e35', '#071526', '#040b15'],
          borderGlow: '#38bdf8',
          goldPads: true,
          shape: 'dk'
        };
        this.usbPort = { x: 20, y: 245, w: 24, h: 40, type: 'usbc' };
        this.leds = {
          led1: { x: 740, y: 120, r: 10, pin: 'P1.10', label: 'LED 1', active: true, color: '#4ade80' },
          led2: { x: 790, y: 120, r: 10, pin: 'P1.11', label: 'LED 2', active: true, color: '#38bdf8' },
          led3: { x: 840, y: 120, r: 10, pin: 'P1.12', label: 'LED 3', active: true, color: '#f59e0b' },
          led4: { x: 890, y: 120, r: 10, pin: 'P1.13', label: 'LED 4', active: true, color: '#ef4444' }
        };
        this.buttons = {
          button1: { x: 730, y: 380, w: 38, h: 38, name: 'BTN 1', pin: 'P0.08', pressed: false },
          button2: { x: 780, y: 380, w: 38, h: 38, name: 'BTN 2', pin: 'P0.09', pressed: false },
          button3: { x: 830, y: 380, w: 38, h: 38, name: 'BTN 3', pin: 'P0.10', pressed: false },
          button4: { x: 880, y: 380, w: 38, h: 38, name: 'BTN 4', pin: 'P0.11', pressed: false }
        };
        this.chips = [
          { type: 'qfn', x: 120, y: 220, w: 85, h: 85, l1: 'SEGGER', l2: 'J-Link OB', l3: 'USB-C' },
          { type: 'qfn', x: 440, y: 220, w: 130, h: 130, l1: 'nRF54L15', l2: 'M33 128MHz', l3: '1.5MB NVM' },
          { type: 'sop', x: 620, y: 260, w: 46, h: 56, l1: 'Power PMIC', l2: 'Ultra Low I' }
        ];
        break;

      case 'nrf52840dk':
        // Classic Emerald Green nRF52840 DK (PCA10056)
        this.boardTheme = {
          name: 'nRF52840 DK',
          code: 'PCA10056 v3.0.0',
          desc: 'Matter over Thread Reference Platform · Cortex-M4F 64MHz',
          pcbGradient: ['#09281a', '#061c12', '#030e09'],
          borderGlow: '#10b981',
          goldPads: true,
          shape: 'dk'
        };
        this.usbPort = { x: 20, y: 245, w: 25, h: 42, type: 'usb' };
        this.leds = {
          led1: { x: 740, y: 120, r: 10, pin: 'P0.13', label: 'LED 1', active: true, color: '#4ade80' },
          led2: { x: 790, y: 120, r: 10, pin: 'P0.14', label: 'LED 2', active: true, color: '#38bdf8' },
          led3: { x: 840, y: 120, r: 10, pin: 'P0.15', label: 'LED 3', active: true, color: '#f59e0b' },
          led4: { x: 890, y: 120, r: 10, pin: 'P0.16', label: 'LED 4', active: true, color: '#ef4444' }
        };
        this.buttons = {
          button1: { x: 730, y: 380, w: 38, h: 38, name: 'BTN 1', pin: 'P0.11', pressed: false },
          button2: { x: 780, y: 380, w: 38, h: 38, name: 'BTN 2', pin: 'P0.12', pressed: false },
          button3: { x: 830, y: 380, w: 38, h: 38, name: 'BTN 3', pin: 'P0.24', pressed: false },
          button4: { x: 880, y: 380, w: 38, h: 38, name: 'BTN 4', pin: 'P0.25', pressed: false }
        };
        this.chips = [
          { type: 'qfn', x: 120, y: 220, w: 90, h: 90, l1: 'SEGGER', l2: 'J-Link OB', l3: 'ATSAM3U' },
          { type: 'qfn', x: 440, y: 220, w: 140, h: 140, l1: 'nRF52840', l2: 'QIAA-C0', l3: 'Cortex-M4F' },
          { type: 'sop', x: 620, y: 260, w: 48, h: 60, l1: 'MX25R64', l2: 'QSPI 8MB' }
        ];
        break;

      case 'nrf7002dk':
        // Dual-Chip Wi-Fi 6 nRF7002 DK (PCA10143)
        this.boardTheme = {
          name: 'nRF7002 DK',
          code: 'PCA10143 v1.0.0',
          desc: 'Matter over Wi-Fi 6 (2.4/5GHz Dual-Band) · Dual-Chip Architecture',
          pcbGradient: ['#0e1726', '#09101c', '#05080f'],
          borderGlow: '#00a9ce',
          goldPads: true,
          shape: 'dk'
        };
        this.usbPort = { x: 20, y: 245, w: 25, h: 42, type: 'usb' };
        this.leds = {
          led1: { x: 760, y: 130, r: 11, pin: 'P0.28', label: 'LED 1 (Wi-Fi 6)', active: true, color: '#4ade80' },
          led2: { x: 840, y: 130, r: 11, pin: 'P0.29', label: 'LED 2 (Matter)', active: true, color: '#38bdf8' }
        };
        this.buttons = {
          button1: { x: 750, y: 380, w: 40, h: 40, name: 'BTN 1 (WPS)', pin: 'P1.08', pressed: false },
          button2: { x: 830, y: 380, w: 40, h: 40, name: 'BTN 2 (Matter)', pin: 'P1.09', pressed: false }
        };
        this.chips = [
          { type: 'qfn', x: 110, y: 220, w: 80, h: 80, l1: 'SEGGER', l2: 'J-Link OB', l3: 'USB Debug' },
          { type: 'qfn', x: 370, y: 215, w: 125, h: 125, l1: 'nRF5340', l2: 'Host M33', l3: 'Application' },
          { type: 'qfn', x: 570, y: 225, w: 105, h: 105, l1: 'nRF7002', l2: 'Wi-Fi 6 Companion', l3: '2.4 / 5GHz' },
          { type: 'sop', x: 710, y: 250, w: 42, h: 52, l1: 'QSPI Coex', l2: '8MB Flash' }
        ];
        break;

      case 'thingy53':
        // Compact Multi-Sensor IoT Platform Nordic Thingy:53 (PCA20053)
        this.boardTheme = {
          name: 'Nordic Thingy:53',
          code: 'PCA20053 v1.0.0',
          desc: 'Multi-Sensor Matter Prototyping Platform · Li-Po Powered · BME688 AI / IMU',
          pcbGradient: ['#131a26', '#0d121c', '#080c14'],
          borderGlow: '#00a9ce',
          goldPads: false,
          shape: 'thingy'
        };
        this.usbPort = { x: 35, y: 275, w: 20, h: 36, type: 'usbc' };
        this.leds = {
          rgb: { x: 500, y: 300, r: 24, pin: 'P0.25-27', label: 'RGB LED (Matter)', active: true, color: '#00a9ce' }
        };
        this.buttons = {
          userButton: { x: 190, y: 290, w: 46, h: 46, name: 'USER BTN', pin: 'P1.14', pressed: false }
        };
        this.chips = [
          { type: 'sensor', x: 310, y: 210, w: 64, h: 54, l1: 'BME688', l2: 'Gas/VOC/T/H/P' },
          { type: 'sensor', x: 310, y: 345, w: 64, h: 54, l1: 'BMI270', l2: '6-Axis IMU' },
          { type: 'qfn', x: 440, y: 140, w: 120, h: 120, l1: 'nRF5340', l2: 'Dual M33 SoC', l3: 'Edge Impulse' },
          { type: 'fem', x: 670, y: 220, w: 70, h: 60, l1: 'nRF21540', l2: 'RF Extender' },
          { type: 'battery', x: 670, y: 335, w: 80, h: 65, l1: '1350mAh', l2: 'Li-Po PMIC' }
        ];
        break;

      case 'nrf5340dk':
      default:
        // nRF5340 DK (PCA10095) - Dual Cortex-M33
        this.activeBoardId = 'nrf5340dk';
        this.boardTheme = {
          name: 'nRF5340 DK',
          code: 'PCA10095 v1.0.0',
          desc: 'Dual Cortex-M33 (128MHz / 64MHz) · Matter over Thread Reference Kit',
          pcbGradient: ['#122538', '#0d1c2d', '#081320'],
          borderGlow: '#00a9ce',
          goldPads: true,
          shape: 'dk'
        };
        this.usbPort = { x: 20, y: 245, w: 25, h: 42, type: 'usb' };
        this.leds = {
          led1: { x: 740, y: 120, r: 10, pin: 'P0.28', label: 'LED 1', active: true, color: '#4ade80' },
          led2: { x: 790, y: 120, r: 10, pin: 'P0.29', label: 'LED 2 (Matter)', active: true, color: '#38bdf8' },
          led3: { x: 840, y: 120, r: 10, pin: 'P0.30', label: 'LED 3', active: true, color: '#f59e0b' },
          led4: { x: 890, y: 120, r: 10, pin: 'P0.31', label: 'LED 4', active: true, color: '#ef4444' }
        };
        this.buttons = {
          button1: { x: 730, y: 380, w: 38, h: 38, name: 'BTN 1', pin: 'P1.08', pressed: false },
          button2: { x: 780, y: 380, w: 38, h: 38, name: 'BTN 2', pin: 'P1.09', pressed: false },
          button3: { x: 830, y: 380, w: 38, h: 38, name: 'BTN 3', pin: 'P0.23', pressed: false },
          button4: { x: 880, y: 380, w: 38, h: 38, name: 'BTN 4', pin: 'P0.24', pressed: false }
        };
        this.chips = [
          { type: 'qfn', x: 120, y: 220, w: 90, h: 90, l1: 'SEGGER', l2: 'J-Link OB', l3: 'ATSAM3U' },
          { type: 'qfn', x: 440, y: 220, w: 140, h: 140, l1: 'nRF5340', l2: 'QKAA-A0', l3: 'Dual M33' },
          { type: 'sop', x: 620, y: 260, w: 48, h: 60, l1: 'MX25R64', l2: 'QSPI 8MB' }
        ];
        break;
    }
  }

  // Trigger dynamic circuit laser pulse through board topology
  triggerLaserLineage(targetLeds, isTurnOn) {
    const pulseId = Date.now();
    const isThingy = this.activeBoardId === 'thingy53';

    // Dynamic Waypoints tailored to active board
    let waypoints = [];
    if (isThingy) {
      waypoints = [
        { x: this.usbPort.x + 10, y: this.usbPort.y + 18, delay: 0 },
        { x: 260, y: 280, delay: 50 },
        { x: 380, y: 220, delay: 110 },
        { x: 500, y: 200, delay: 170 },
        { x: 500, y: 300, delay: 240 } // Center RGB LED
      ];
    } else if (this.activeBoardId === 'nrf7002dk') {
      waypoints = [
        { x: this.usbPort.x + 12, y: this.usbPort.y + 20, delay: 0 },
        { x: 150, y: 260, delay: 50 },
        { x: 430, y: 275, delay: 120 }, // nRF5340 Host
        { x: 530, y: 275, delay: 170 }, // QSPI Coexistence Bus
        { x: 620, y: 275, delay: 220 }  // nRF7002 Wi-Fi 6
      ];
    } else if (this.activeBoardId === 'nrf54lm20dk') {
      waypoints = [
        { x: this.usbPort.x + 12, y: this.usbPort.y + 20, delay: 0 },
        { x: 160, y: 260, delay: 50 },
        { x: 320, y: 275, delay: 100 },
        { x: 500, y: 275, delay: 160 } // nRF54LM20A 22nm Core
      ];
    } else {
      waypoints = [
        { x: this.usbPort.x + 10, y: this.usbPort.y + 20, delay: 0 },
        { x: 160, y: 265, delay: 60 },
        { x: 300, y: 290, delay: 120 },
        { x: 510, y: 290, delay: 180 }
      ];
    }

    if (isThingy) {
      this.laserPulses.push({
        id: pulseId,
        points: waypoints,
        color: isTurnOn ? '#00a9ce' : '#ef4444',
        startTime: performance.now()
      });
      return;
    }

    // Branch out to specified target LEDs
    Object.keys(targetLeds || {}).forEach((key, idx) => {
      const ledPos = this.leds[key];
      if (ledPos) {
        this.laserPulses.push({
          id: pulseId,
          points: [
            ...waypoints,
            { x: 680, y: 190, delay: 220 },
            { x: ledPos.x, y: ledPos.y, delay: 260 + (idx * 25) }
          ],
          color: isTurnOn ? (ledPos.color || '#4ade80') : '#ef4444',
          startTime: performance.now()
        });
      }
    });
  }

  setLedState(key, active) {
    if (this.leds[key]) {
      this.leds[key].active = Boolean(active);
    }
  }

  setAllLedsState(active) {
    Object.keys(this.leds).forEach(k => {
      this.leds[k].active = Boolean(active);
    });
  }

  startRenderLoop() {
    const render = () => {
      this.draw();
      this.animFrame = requestAnimationFrame(render);
    };
    render();
  }

  draw() {
    const ctx = this.ctx;
    const now = performance.now();
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();

    // 1. PCB BASE & FORM FACTOR (Customized for each board)
    this.drawPcbBase(ctx);

    // 2. COPPER CIRCUIT TRACES & GROUND PLANES
    this.drawCopperTraces(ctx);

    // 3. SILKSCREEN GRAPHICS & OFFICIAL TYPOGRAPHY
    this.drawSilkscreen(ctx);

    // 4. HARDWARE CHIPS & ADVANCED MODULES
    this.drawHardwareChips(ctx);

    // 5. CONNECTORS, ANTENNAS & NFC COILS
    this.drawConnectorsAndAntennas(ctx);

    // 6. TACTILE USER PUSH BUTTONS
    this.drawTactileButtons(ctx);

    // 7. PHOTOREALISTIC OPTO-ELECTRONIC LEDs WITH RAY-TRACED BLOOM
    this.drawPhotorealLeds(ctx, now);

    // 8. REAL-TIME CIRCUIT LASER LINEAGE PULSES
    this.drawLaserLineagePulses(ctx, now);

    // 9. LIVE HARDWARE / SIMULATION WATERMARK BADGE
    this.drawHardwareStatusWatermark(ctx);

    ctx.restore();
  }

  // Draw PCB Base matching the physical DK board
  drawPcbBase(ctx) {
    const isThingy = this.boardTheme.shape === 'thingy';

    if (isThingy) {
      // Nordic Thingy:53 Rounded Enclosure Shape
      const cx = 500, cy = 300, rx = 440, ry = 250;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 45;
      ctx.shadowOffsetY = 24;

      const grad = ctx.createRadialGradient(cx, cy, 50, cx, cy, rx);
      grad.addColorStop(0, '#1c2433');
      grad.addColorStop(0.6, '#121824');
      grad.addColorStop(1, '#090d15');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outer Cyan Rubberized Accent Ring
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#00a9ce';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Inner Grip Bezel
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx - 18, ry - 18, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    // Standard Nordic DK Board Dimensions (PCA Rectangular PCB)
    const x = 30, y = 25, w = 940, h = 550, r = 24;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;

    const pcbGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    pcbGrad.addColorStop(0, this.boardTheme.pcbGradient[0]);
    pcbGrad.addColorStop(0.4, this.boardTheme.pcbGradient[1]);
    pcbGrad.addColorStop(1, this.boardTheme.pcbGradient[2]);

    ctx.fillStyle = pcbGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();

    // Chamfered Edge Sheen
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.boardTheme.borderGlow || '#00a9ce';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.stroke();

    // Gold Plated Ground Perimeter Strip
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([14, 8]);
    ctx.beginPath();
    ctx.roundRect(x + 12, y + 12, w - 24, h - 24, r - 6);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4 Corner Gold Mounting Holes
    const holes = [
      { x: x + 35, y: y + 35 },
      { x: x + w - 35, y: y + 35 },
      { x: x + 35, y: y + h - 35 },
      { x: x + w - 35, y: y + h - 35 }
    ];

    holes.forEach(hole => {
      const goldGrad = ctx.createRadialGradient(hole.x, hole.y, 4, hole.x, hole.y, 16);
      goldGrad.addColorStop(0, '#fbbf24');
      goldGrad.addColorStop(0.7, '#d97706');
      goldGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = goldGrad;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#03060a';
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, 8, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Draw Realistic Copper Circuit Traces
  drawCopperTraces(ctx) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 1.5;

    if (this.boardTheme.shape === 'thingy') {
      // Concentric Sensor & Power Bus Traces
      ctx.beginPath();
      ctx.arc(500, 300, 160, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(374, 237);
      ctx.lineTo(440, 200);
      ctx.lineTo(500, 200);
      ctx.stroke();
      return;
    }

    // Trace from USB to Debug MCU
    ctx.beginPath();
    ctx.moveTo(this.usbPort.x + 20, this.usbPort.y + 20);
    ctx.lineTo(120, 260);
    ctx.lineTo(160, 260);
    ctx.stroke();

    // Trace from Debug MCU to Main SoC
    ctx.beginPath();
    ctx.moveTo(210, 265);
    ctx.lineTo(310, 265);
    ctx.lineTo(370, 290);
    ctx.lineTo(440, 290);
    ctx.stroke();

    // Trace from SoC to LEDs
    ctx.beginPath();
    ctx.moveTo(580, 250);
    ctx.lineTo(660, 190);
    ctx.lineTo(720, 120);
    ctx.lineTo(890, 120);
    ctx.stroke();

    // Trace from SoC to Buttons
    ctx.beginPath();
    ctx.moveTo(580, 340);
    ctx.lineTo(660, 390);
    ctx.lineTo(720, 390);
    ctx.lineTo(890, 390);
    ctx.stroke();

    // If nRF7002 DK: Draw High-Speed QSPI Coexistence Bus
    if (this.activeBoardId === 'nrf7002dk') {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(495, 275);
      ctx.lineTo(570, 275);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Draw Silkscreen Markings
  drawSilkscreen(ctx) {
    // Official Nordic Semiconductor Logo Mark
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(70, 75);
    ctx.lineTo(84, 55);
    ctx.lineTo(98, 75);
    ctx.lineTo(91, 75);
    ctx.lineTo(84, 65);
    ctx.lineTo(77, 75);
    ctx.closePath();
    ctx.fill();

    // Brand Typography
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('NORDIC SEMICONDUCTOR', 108, 72);

    // Board Specific Model & Code Silkscreen
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(this.boardTheme.name, 108, 96);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillText(`${this.boardTheme.code} · ${this.boardTheme.desc}`, 70, 118);

    // Header Pins & Silkscreen Guides
    if (this.activeBoardId === 'nrf54lm20dk') {
      ctx.fillStyle = '#64748b';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillText('PORT 0 (GPIO P0.00~P0.31)', 70, 145);
      ctx.fillText('PORT 1 (ANALOG / HIGH PRECISION)', 70, 480);
      ctx.fillText('PORT 2 (HIGH-SPEED QSPI)', 520, 480);
      ctx.fillText('PORT 3 (DEBUG TRACE / SWD)', 750, 480);
    } else if (this.boardTheme.shape !== 'thingy') {
      ctx.fillStyle = '#64748b';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillText('ARDUINO UNO REV3 COMPATIBLE HEADERS', 70, 145);
      ctx.fillText('P1: POWER / RESET', 70, 480);
      ctx.fillText('P2: ANALOG IN', 240, 480);
      ctx.fillText('P3/P4: DIGITAL IO / PWM / I2C / SPI', 520, 480);
    }
  }

  // Draw SMD Hardware Chips
  drawHardwareChips(ctx) {
    this.chips.forEach(chip => {
      if (chip.type === 'qfn') {
        this.drawQfnChip(ctx, chip.x, chip.y, chip.w, chip.h, chip.l1, chip.l2, chip.l3);
      } else if (chip.type === 'sop') {
        this.drawSopChip(ctx, chip.x, chip.y, chip.w, chip.h, chip.l1, chip.l2);
      } else if (chip.type === 'sensor') {
        this.drawSensorChip(ctx, chip.x, chip.y, chip.w, chip.h, chip.l1, chip.l2);
      } else if (chip.type === 'fem' || chip.type === 'battery') {
        this.drawSopChip(ctx, chip.x, chip.y, chip.w, chip.h, chip.l1, chip.l2);
      }
    });

    // Draw SoC Clock Pulse Glow
    if (this.chips.length > 1) {
      const mainSoc = this.chips[1];
      const auraPulse = Math.sin(performance.now() / 450) * 0.18 + 0.35;
      ctx.strokeStyle = `rgba(0, 169, 206, ${auraPulse})`;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(mainSoc.x + mainSoc.w / 2, mainSoc.y + mainSoc.h / 2, mainSoc.w * 0.68, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw USB Shield
    const metalGrad = ctx.createLinearGradient(this.usbPort.x, this.usbPort.y, this.usbPort.x + this.usbPort.w, this.usbPort.y);
    metalGrad.addColorStop(0, '#64748b');
    metalGrad.addColorStop(0.5, '#cbd5e1');
    metalGrad.addColorStop(1, '#475569');
    ctx.fillStyle = metalGrad;
    ctx.fillRect(this.usbPort.x, this.usbPort.y, this.usbPort.w, this.usbPort.h);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(this.usbPort.x, this.usbPort.y, this.usbPort.w, this.usbPort.h);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.fillText(this.usbPort.type === 'usbc' ? 'USB-C' : 'USB J2', this.usbPort.x - 2, this.usbPort.y + this.usbPort.h + 12);
  }

  drawQfnChip(ctx, x, y, w, h, line1, line2, line3) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;

    const chipGrad = ctx.createRadialGradient(x + w * 0.4, y + h * 0.4, 5, x + w / 2, y + h / 2, w * 0.7);
    chipGrad.addColorStop(0, '#182436');
    chipGrad.addColorStop(1, '#050a12');
    ctx.fillStyle = chipGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Bevel Border
    ctx.strokeStyle = '#2a3d58';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pin 1 Indicator
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(x + 12, y + 12, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Gold Bond Wire Peripheral Pins
    ctx.fillStyle = '#fbbf24';
    const pinStep = 10;
    for (let px = x + 16; px <= x + w - 16; px += pinStep) {
      ctx.fillRect(px, y - 2, 4, 3);
      ctx.fillRect(px, y + h - 1, 4, 3);
    }
    for (let py = y + 16; py <= y + h - 16; py += pinStep) {
      ctx.fillRect(x - 2, py, 3, 4);
      ctx.fillRect(x + w - 1, py, 3, 4);
    }

    // Laser Text
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(line1, x + 18, y + h / 2 - 8);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText(line2, x + 18, y + h / 2 + 10);

    if (line3) {
      ctx.fillStyle = '#64748b';
      ctx.font = '600 9px "JetBrains Mono", monospace';
      ctx.fillText(line3, x + 18, y + h / 2 + 26);
    }
  }

  drawSopChip(ctx, x, y, w, h, line1, line2) {
    ctx.fillStyle = '#070d18';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.fillText(line1, x + 5, y + 22);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 7px "JetBrains Mono", monospace';
    ctx.fillText(line2, x + 5, y + 36);
  }

  drawSensorChip(ctx, x, y, w, h, line1, line2) {
    // Polished Silver Metal Shielded Package (e.g. Bosch BME688 / BMI270)
    const mGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    mGrad.addColorStop(0, '#94a3b8');
    mGrad.addColorStop(0.5, '#e2e8f0');
    mGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = mGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();

    ctx.strokeStyle = '#334155';
    ctx.strokeRect(x, y, w, h);

    // Laser Engraving
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 10px "JetBrains Mono", monospace';
    ctx.fillText(line1, x + 8, y + 22);
    ctx.fillStyle = '#334155';
    ctx.font = '700 7px "JetBrains Mono", monospace';
    ctx.fillText(line2, x + 8, y + 36);
  }

  // Draw Board-Specific Antennas and RF Elements
  drawConnectorsAndAntennas(ctx) {
    if (this.boardTheme.shape === 'thingy') return;

    if (this.activeBoardId === 'nrf54lm20dk') {
      // 1. Integrated 13.56MHz NFC Matching Loop with Gold Coils
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Outer Loop
      ctx.rect(260, 360, 140, 110);
      // Inner Loop
      ctx.rect(272, 372, 116, 86);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = '700 8.5px "JetBrains Mono", monospace';
      ctx.fillText('13.56MHz NFC-ONLY ANTENNA (MATTER 1.6 NATIVE)', 220, 486);

      // 2. Channel Sounding RF Port
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(890, 240, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(890, 240, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.fillText('BT6.0 CS RF', 865, 265);

    } else if (this.activeBoardId === 'nrf7002dk') {
      // Dual PCB Antennas for Dual-Band Wi-Fi 6 & Thread
      // 1. 2.4GHz Antenna (Top)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(900, 170);
      ctx.lineTo(900, 220);
      ctx.lineTo(875, 220);
      ctx.lineTo(875, 190);
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.fillText('2.4GHz ANT', 855, 235);

      // 2. 5GHz Wi-Fi 6 Antenna (Bottom)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(900, 280);
      ctx.lineTo(900, 330);
      ctx.lineTo(875, 330);
      ctx.lineTo(875, 305);
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.fillText('5GHz Wi-Fi 6 ANT', 835, 345);

    } else {
      // Standard 2.4GHz PCB Trace Antenna
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(900, 180);
      ctx.lineTo(900, 260);
      ctx.lineTo(880, 260);
      ctx.lineTo(880, 220);
      ctx.lineTo(860, 220);
      ctx.lineTo(860, 280);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillText('2.4GHz ANT', 850, 310);
    }
  }

  // Draw Tactile Push Buttons
  drawTactileButtons(ctx) {
    Object.entries(this.buttons).forEach(([key, btn]) => {
      ctx.fillStyle = btn.pressed ? '#0f172a' : '#1e293b';
      ctx.strokeStyle = '#00a9ce';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 6);
      ctx.fill();
      ctx.stroke();

      // Plunger Disc
      const discGrad = ctx.createRadialGradient(btn.x + btn.w / 2, btn.y + btn.h / 2, 2, btn.x + btn.w / 2, btn.y + btn.h / 2, 10);
      discGrad.addColorStop(0, btn.pressed ? '#1e293b' : '#64748b');
      discGrad.addColorStop(1, btn.pressed ? '#090d16' : '#334155');
      ctx.fillStyle = discGrad;
      ctx.beginPath();
      ctx.arc(btn.x + btn.w / 2, btn.y + btn.h / 2, 10, 0, Math.PI * 2);
      ctx.fill();

      // Label & Pin
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillText(btn.name, btn.x + 4, btn.y + btn.h + 14);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 7.5px "JetBrains Mono", monospace';
      ctx.fillText(btn.pin, btn.x + 4, btn.y + btn.h + 24);
    });
  }

  // Draw Opto-Electronic LEDs with Ray-Traced Bloom
  drawPhotorealLeds(ctx, now) {
    const isThingy = this.boardTheme.shape === 'thingy';

    if (isThingy) {
      // Draw Thingy:53 Mega Center RGB LED
      const rgbLed = this.leds.rgb;
      if (!rgbLed) return;

      // Outer Metal Bezel
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(rgbLed.x, rgbLed.y, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (rgbLed.active) {
        // Enormous Multi-Stage Chromatic Bloom
        const bloom = ctx.createRadialGradient(rgbLed.x, rgbLed.y, 6, rgbLed.x, rgbLed.y, 110);
        bloom.addColorStop(0, 'rgba(0, 169, 206, 0.95)');
        bloom.addColorStop(0.35, 'rgba(56, 189, 248, 0.55)');
        bloom.addColorStop(0.7, 'rgba(14, 165, 233, 0.2)');
        bloom.addColorStop(1, 'rgba(14, 165, 233, 0)');
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(rgbLed.x, rgbLed.y, 110, 0, Math.PI * 2);
        ctx.fill();

        // Core Prism Saturation
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(rgbLed.x, rgbLed.y, 14, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(rgbLed.x, rgbLed.y, 22, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '800 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('HIGH-POWER RGB LED', rgbLed.x - 65, rgbLed.y + 55);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillText('(P0.25 ~ P0.27 · Matter Light Bulb Status)', rgbLed.x - 90, rgbLed.y + 70);
      return;
    }

    // Standard User LEDs for DK Boards
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`USER LEDs (${Object.values(this.leds).map(l => l.pin).join(', ')})`, 730, 80);

    Object.entries(this.leds).forEach(([key, led], idx) => {
      // 1. SMD Solder Pad
      ctx.fillStyle = '#141e30';
      ctx.strokeStyle = '#22324a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(led.x - 16, led.y - 16, 32, 32, 6);
      ctx.fill();
      ctx.stroke();

      const ledColor = led.color || '#4ade80';

      if (led.active) {
        // High-Intensity Optical Bloom
        const boardScatter = ctx.createRadialGradient(led.x, led.y, 4, led.x, led.y, 65);
        boardScatter.addColorStop(0, hexToRgba(ledColor, 0.85));
        boardScatter.addColorStop(0.35, hexToRgba(ledColor, 0.45));
        boardScatter.addColorStop(0.7, hexToRgba(ledColor, 0.15));
        boardScatter.addColorStop(1, hexToRgba(ledColor, 0));
        ctx.fillStyle = boardScatter;
        ctx.beginPath();
        ctx.arc(led.x, led.y, 65, 0, Math.PI * 2);
        ctx.fill();

        const lensAura = ctx.createRadialGradient(led.x, led.y, 2, led.x, led.y, 24);
        lensAura.addColorStop(0, 'rgba(255, 255, 255, 1)');
        lensAura.addColorStop(0.4, hexToRgba(ledColor, 0.95));
        lensAura.addColorStop(0.8, hexToRgba(ledColor, 0.7));
        lensAura.addColorStop(1, hexToRgba(ledColor, 0));
        ctx.fillStyle = lensAura;
        ctx.beginPath();
        ctx.arc(led.x, led.y, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(led.x, led.y, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const offLens = ctx.createRadialGradient(led.x - 2, led.y - 2, 2, led.x, led.y, 10);
        offLens.addColorStop(0, '#334155');
        offLens.addColorStop(0.8, '#1e293b');
        offLens.addColorStop(1, '#0f172a');
        ctx.fillStyle = offLens;
        ctx.beginPath();
        ctx.arc(led.x, led.y, 9, 0, Math.PI * 2);
        ctx.fill();
      }

      // Specular Glass Reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(led.x - 3, led.y - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Label & Pin
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillText(led.label || `LED ${idx + 1}`, led.x - 14, led.y + 26);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 7.5px "JetBrains Mono", monospace';
      ctx.fillText(led.pin, led.x - 14, led.y + 36);
    });
  }

  // Draw Circuit Laser Pulses
  drawLaserLineagePulses(ctx, now) {
    if (this.laserPulses.length === 0) return;

    for (let i = this.laserPulses.length - 1; i >= 0; i--) {
      const p = this.laserPulses[i];
      const elapsed = now - p.startTime;
      const totalDuration = 320;

      if (elapsed > totalDuration) {
        this.laserPulses.splice(i, 1);
        continue;
      }

      const progress = Math.min(1, elapsed / totalDuration);
      const points = p.points;
      const numSegs = points.length - 1;
      const segIndex = Math.min(numSegs - 1, Math.floor(progress * numSegs));
      const segProgress = (progress * numSegs) - segIndex;

      const p1 = points[segIndex];
      const p2 = points[segIndex + 1];

      const curX = p1.x + (p2.x - p1.x) * segProgress;
      const curY = p1.y + (p2.y - p1.y) * segProgress;

      const laserGrad = ctx.createRadialGradient(curX, curY, 2, curX, curY, 18);
      laserGrad.addColorStop(0, '#ffffff');
      laserGrad.addColorStop(0.3, p.color);
      laserGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = laserGrad;
      ctx.beginPath();
      ctx.arc(curX, curY, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(curX, curY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw Top Right Watermark with Live Hardware / Simulation Indicator
  drawHardwareStatusWatermark(ctx) {
    const isConn = this.isHardwareConnected;
    const badgeW = 340;
    const badgeH = 34;
    const bx = this.width - badgeW - 40;
    const by = 40;

    ctx.fillStyle = isConn ? 'rgba(6, 78, 59, 0.75)' : 'rgba(30, 41, 59, 0.85)';
    ctx.strokeStyle = isConn ? '#10b981' : '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, badgeW, badgeH, 17);
    ctx.fill();
    ctx.stroke();

    // Pulse Dot
    ctx.fillStyle = isConn ? '#4ade80' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(bx + 18, by + 17, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Text Label
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    if (isConn) {
      ctx.fillText(`● HARDWARE CONNECTED (${this.serialNumber})`, bx + 32, by + 21);
    } else {
      ctx.fillText(`○ DIGITAL TWIN (가상 시뮬레이터 구동 중)`, bx + 32, by + 21);
    }
  }

  initMouseInteractions() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      // Check LED Click
      Object.entries(this.leds).forEach(([key, led]) => {
        const radius = led.r ? (led.r + 14) : 24;
        const dist = Math.hypot(clickX - led.x, clickY - led.y);
        if (dist <= radius) {
          if (typeof toggleLed === 'function') toggleLed(key);
        }
      });

      // Check Button Click
      Object.entries(this.buttons).forEach(([key, btn]) => {
        if (clickX >= btn.x && clickX <= btn.x + btn.w && clickY >= btn.y && clickY <= btn.y + btn.h) {
          btn.pressed = true;
          setTimeout(() => { btn.pressed = false; }, 200);
          if (typeof pressButton === 'function') pressButton(key);
        }
      });
    });
  }
}

// Utility: Hex to RGBA conversion for dynamic bloom
function hexToRgba(hex, alpha) {
  if (!hex || hex[0] !== '#') return `rgba(74, 222, 128, ${alpha})`;
  let c = hex.substring(1);
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Global Export
window.PhotorealDKRenderer = PhotorealDKRenderer;
