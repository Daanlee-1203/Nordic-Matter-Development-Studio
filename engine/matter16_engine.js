/**
 * Matter 1.6 Standard & Nordic Hands-on Lab Engine
 * Implements interactive modules for:
 * - Part 1: Environment & Toolchain Verification
 * - Part 2: Quick Start 6-Step Workflow & Ecosystem Pairing
 * - Part 3: VS Code Build, Factory Data & 3 Commissioning Methods
 * - Part 4: Matter 1.6 Core Features (NFC-only, Joint Fabric, Thermostat Suggestions, Product Security 1.1)
 * - Part 5: Nordic MCP Server AI Integration (Claude Code / Antigravity)
 * - Comprehensive Diagnostics & Reporting
 */

const EventEmitter = require('events');
const boardsCatalog = require('./boards_catalog');

class Matter16Engine extends EventEmitter {
  constructor() {
    super();

    // Default Commissioning Info
    this.commissioningData = {
      vendorId: 0xFFF1,
      vendorName: 'Nordic Semiconductor',
      productId: 0x8005,
      productName: 'Matter Light Bulb',
      discriminator: 3840,
      discriminatorHex: '0x0F00',
      passcode: 20202021,
      manualPairingCode: '34970112332',
      qrCodePayload: 'MT:Y.K9042C00KA0648G00',
      fabricId: '0x17A8C9E23B01',
      nodeId: '0x0000000000000001'
    };

    // Part 1: Toolchain State
    this.toolchainState = {
      vscodeInstalled: true,
      vscodeVersion: '1.95.2',
      ncsExtensionPack: {
        installed: true,
        extensions: [
          { id: 'nordicsemiconductor.nrf-connect', name: 'nRF Connect for VS Code', version: 'v2024.11.85', status: 'OK' },
          { id: 'nordicsemiconductor.nrf-terminal', name: 'nRF Terminal', version: 'v2024.9.14', status: 'OK' },
          { id: 'nordicsemiconductor.nrf-devicetree', name: 'nRF DeviceTree', version: 'v2024.10.22', status: 'OK' },
          { id: 'nordicsemiconductor.nrf-kconfig', name: 'nRF Kconfig', version: 'v2024.10.19', status: 'OK' },
          { id: 'ms-vscode.cpptools', name: 'C/C++ (Microsoft)', version: 'v1.22.11', status: 'OK' },
          { id: 'nordicsemiconductor.gnu-linker-map', name: 'GNU Linker Map files', version: 'v2024.8.10', status: 'OK' }
        ]
      },
      ncsSdk: {
        installed: true,
        version: 'v3.4.0 LTS',
        path: '/opt/nordic/ncs/v3.4.0',
        zephyrVersion: 'v3.7.99-ncs2'
      },
      toolchain: {
        installed: true,
        version: 'v3.4.0',
        path: '/opt/nordic/toolchains/v3.4.0',
        matched: true
      },
      nrfutil: {
        installed: true,
        version: '7.12.0',
        plugins: ['sdk-manager (0.3.2)', 'toolchain-manager (0.14.3)', 'device (2.4.1)']
      }
    };

    // Part 2: Quick Start Workflow State
    this.quickStartState = {
      currentStep: 1,
      selectedSample: 'matter_light_bulb',
      flashingProgress: 0,
      isFlashing: false,
      verificationPassed: true,
      selectedEcosystem: 'google_home'
    };

    // Part 4: Matter 1.6 Standard Live States
    this.matter16State = {
      // 1. NFC-Only Commissioning
      nfcCommissioning: {
        active: false,
        devicePowered: true,
        nfcFrequency: '13.56 MHz',
        bidirectionalSupported: true,
        lastTagTimestamp: null,
        stage: 'IDLE', // 'IDLE' -> 'NFC_TAGGED' -> 'MUTUAL_AUTH' -> 'CREDENTIALS_EXCHANGED' -> 'COMMISSIONED'
        tagCount: 0
      },

      // 2. Joint Fabric (Centralized Datastore)
      jointFabric: {
        enabled: true,
        datastoreId: 'ds-shared-corp-01',
        fabricIndexUsed: 1, // Consumes ONLY 1 Fabric index regardless of controller count!
        controllers: [
          { id: 'ctrl-google', name: 'Google Home Ecosystem', role: 'Admin', accessLevel: 'Full' },
          { id: 'ctrl-apple', name: 'Apple Home (HomeKit)', role: 'Admin', accessLevel: 'Full' },
          { id: 'ctrl-smartthings', name: 'Samsung SmartThings', role: 'Operator', accessLevel: 'Control' },
          { id: 'ctrl-building', name: 'Facility BMS (Commercial)', role: 'Auditor', accessLevel: 'ReadOnly' }
        ]
      },

      // 3. Thermostat Suggestions (Context-Driven Demand-Response)
      thermostatSuggestions: {
        currentTempC: 22.5,
        targetTempC: 22.0,
        mode: 'Auto',
        activeSuggestion: null,
        history: [
          { timestamp: '15:40:12', sender: 'Grid Demand-Response', suggestedTempC: 24.0, reason: 'PowerGrid Peak Shaving', decision: 'ACCEPTED', appliedTempC: 24.0 },
          { timestamp: '16:05:44', sender: 'AI Comfort Assistant', suggestedTempC: 21.0, reason: 'User Approaching Home', decision: 'REJECTED', rejectReason: 'UserManualOverrideRecent' }
        ]
      },

      // 4. Product Security 1.1 & Chunked CRL
      productSecurity: {
        specification: 'Product Security 1.1 (Level 2 Certified)',
        euCraCompliant: true, // EU Cyber Resilience Act (24h disclosure ready)
        crlVersion: '2026.11-rev4',
        crlChunkDistribution: {
          totalChunks: 16,
          updatedChunks: [2, 7, 13],
          chunkSizeBytes: '512 bytes',
          bandwidthSavedPct: 91.4
        }
      }
    };
  }

  // Part 1: Verify Environment
  verifyEnvironment() {
    return {
      timestamp: new Date().toISOString(),
      toolchain: this.toolchainState,
      overallStatus: 'READY_FOR_MATTER_16_DEV'
    };
  }

  // Part 2: Quick Start Step Execution
  advanceQuickStartStep(step, payload = {}) {
    this.quickStartState.currentStep = step;
    if (payload.sample) this.quickStartState.selectedSample = payload.sample;
    if (payload.ecosystem) this.quickStartState.selectedEcosystem = payload.ecosystem;

    this.emit('quickStartUpdated', this.quickStartState);
    return this.quickStartState;
  }

  // Part 3: Generate Factory Data (JSON, Hex, QR code string, Manual Code)
  generateFactoryData(params = {}) {
    const vid = params.vendorId || this.commissioningData.vendorId;
    const pid = params.productId || this.commissioningData.productId;
    const disc = params.discriminator || this.commissioningData.discriminator;
    const passcode = params.passcode || this.commissioningData.passcode;
    const serial = params.serialNumber || 'NORDIC-SIM-001';

    // Generate pairing code & QR
    const manualCode = `3497-${String(disc).padStart(4, '0')}-${String(passcode).slice(-4)}`;
    const qrPayload = `MT:Y.${vid.toString(16).toUpperCase()}KA${pid.toString(16).toUpperCase()}0648G00`;

    const factoryJson = {
      version: 1,
      discriminator: disc,
      passcode: passcode,
      spake2p: {
        iterations: 1000,
        salt: 'U1BBT0syUCBzYWx0IHZhbHVl',
        verifier: 'b3BlbmNocm9tZSBzcGFrZTJwIHZlcmlmaWVyIGJhc2U2NA=='
      },
      dac: {
        vendor_id: vid,
        product_id: pid,
        serial_number: serial,
        cert: 'MIIB0zCCAXugAwIBAgII... (Device Attestation Certificate)',
        priv_key: 'MHcCAQEE... (Secured Hardware Vault Private Key)'
      },
      pai: {
        cert: 'MIIBxzCCAW2gAwIBAgII... (Product Attestation Intermediate)'
      },
      cd: {
        certification_declaration: 'MIIB7wYKKwYBBAGCNwIBF... (CSA Matter 1.6 Certified)'
      }
    };

    return {
      manualCode,
      qrPayload,
      factoryJson,
      hexFileName: `factory_data_${serial}.hex`,
      pngFileName: `factory_data_${serial}_qr.png`,
      txtFileName: `factory_data_${serial}.txt`,
      runnersYamlSnippet: `
runners:
  - west
  - flash
  - --hex-file=build/zephyr/zephyr.hex
  - --hex-file=build/factory_data.hex
`
    };
  }

  // Part 4-1: Trigger NFC-Only Commissioning Tap
  triggerNfcTap(devicePowered = true) {
    this.matter16State.nfcCommissioning.active = true;
    this.matter16State.nfcCommissioning.devicePowered = devicePowered;
    this.matter16State.nfcCommissioning.lastTagTimestamp = new Date().toISOString();
    this.matter16State.nfcCommissioning.tagCount++;
    this.matter16State.nfcCommissioning.stage = 'COMMISSIONED';

    const result = {
      success: true,
      protocol: 'Matter 1.6 Bidirectional NFC (13.56 MHz)',
      poweredState: devicePowered ? 'Powered (AC/DC)' : 'Unpowered (Cold Shelf / Pre-Installation Tag)',
      durationMs: 420,
      steps: [
        '1. 13.56MHz NFC RF Field Generated by Smartphone',
        '2. Read PASE Verifier via NFC NDEF Record without BLE turning on',
        '3. Exchanged Thread Network Credentials (PAN ID: 0x1234, Channel 15)',
        '4. Operational Certificate Injected into Device Secure Storage',
        '5. Commissioning Verified: Fabric ID 0x17A8C9E23B01'
      ]
    };

    this.emit('matter16Updated', this.matter16State);
    return result;
  }

  // Part 4-2: Joint Fabric Controller Join / Manage
  addJointFabricController(controllerName, role = 'Operator') {
    const id = `ctrl-${Date.now().toString(36)}`;
    const newCtrl = { id, name: controllerName, role, accessLevel: 'Full' };
    this.matter16State.jointFabric.controllers.push(newCtrl);

    this.emit('matter16Updated', this.matter16State);
    return {
      success: true,
      fabricIndexUsed: 1, // Remains 1!
      totalControllers: this.matter16State.jointFabric.controllers.length,
      datastoreId: this.matter16State.jointFabric.datastoreId
    };
  }

  // Part 4-3: Thermostat Suggestion Dispatch
  sendThermostatSuggestion(suggestion) {
    const { sender, suggestedTempC, reason } = suggestion;
    const now = new Date().toLocaleTimeString('ko-KR', { hour12: false });

    // Business Logic: If current temp difference is > 3C or user manually adjusted in last 5m
    let decision = 'ACCEPTED';
    let rejectReason = null;

    if (suggestedTempC > 26 || suggestedTempC < 18) {
      decision = 'REJECTED';
      rejectReason = 'SafetyThresholdExceeded';
    } else if (reason.includes('Emergency') || reason.includes('Grid Demand-Response')) {
      decision = 'ACCEPTED';
      this.matter16State.thermostatSuggestions.targetTempC = suggestedTempC;
    } else {
      decision = 'ACCEPTED';
      this.matter16State.thermostatSuggestions.targetTempC = suggestedTempC;
    }

    const record = {
      timestamp: now,
      sender: sender || 'Grid Demand-Response System',
      suggestedTempC,
      reason: reason || 'Energy Conservation Program',
      decision,
      rejectReason,
      appliedTempC: this.matter16State.thermostatSuggestions.targetTempC
    };

    this.matter16State.thermostatSuggestions.history.unshift(record);
    if (this.matter16State.thermostatSuggestions.history.length > 10) {
      this.matter16State.thermostatSuggestions.history.pop();
    }

    this.emit('matter16Updated', this.matter16State);
    return record;
  }

  // Part 4-4: Product Security 1.1 CRL Chunk Update
  simulateCrlChunkUpdate(chunkIndex) {
    const idx = parseInt(chunkIndex, 10) || 5;
    if (!this.matter16State.productSecurity.crlChunkDistribution.updatedChunks.includes(idx)) {
      this.matter16State.productSecurity.crlChunkDistribution.updatedChunks.push(idx);
    }

    return {
      success: true,
      chunkIndex: idx,
      chunkSize: '512 bytes',
      crlVersion: `2026.11-rev${Date.now() % 1000}`,
      status: 'CRL Chunk verified and merged with zero downtime'
    };
  }

  // Part 5: Generate Nordic MCP Server Config JSON
  getMcpConfig() {
    return {
      mcpServerUrl: 'https://aidev.nordicsemi.com/mcp',
      antigravityConfig: {
        mcpServers: {
          'nordic-mcp': {
            command: 'npx',
            args: ['-y', 'mcp-remote', 'https://aidev.nordicsemi.com/mcp']
          }
        }
      },
      claudeCodeCliCommand: 'claude mcp add --transport http "nordic-mcp" https://aidev.nordicsemi.com/mcp',
      vsCodeCopilotCommand: 'code --add-mcp \'{"name":"nordic-mcp","type":"http","url":"https://aidev.nordicsemi.com/mcp"}\''
    };
  }

  // Diagnostic Report
  generateComprehensiveReport(boardId) {
    const board = boardsCatalog.getBoard(boardId);
    return {
      generatedAt: new Date().toISOString(),
      reportTitle: 'Nordic Matter Development Studio - Complete Verification & Audit Report',
      targetBoard: board,
      matter16Compliance: {
        status: 'FULLY_COMPLIANT',
        standard: 'Matter 1.6 (CSA Official 2026.06.17 Release)',
        nfcCommissioning: '13.56MHz Bidirectional Verified',
        jointFabric: 'Shared Datastore Enabled (1 Fabric Index)',
        thermostatSuggestions: 'Context-Driven Demand-Response Verified',
        productSecurity: 'Product Security 1.1 Level 2 (EU CRA Compliant)'
      },
      commissioningIdentity: this.commissioningData,
      toolchainEnvironment: this.toolchainState
    };
  }
}

module.exports = new Matter16Engine();
