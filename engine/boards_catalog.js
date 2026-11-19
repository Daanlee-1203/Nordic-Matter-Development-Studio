/**
 * Nordic Matter Development Hardware Catalog
 * Specifications, features, pinouts, and architecture for Nordic Matter DKs
 * Reference: https://www.nordicsemi.com/Products/Technologies/Matter/Development-Hardware
 */

const BOARDS_CATALOG = {
  nrf5340dk: {
    id: 'nrf5340dk',
    name: 'nRF5340 DK',
    code: 'PCA10095',
    version: 'v1.0.0',
    title: 'Dual-Core Matter over Thread Reference Development Kit',
    type: 'Matter over Thread / BLE',
    soc: 'nRF5340 Dual-Core SoC',
    isPhysicalConnected: false,
    cores: {
      app: { name: 'Application Core', cpu: 'Arm Cortex-M33 @ 128 MHz', flash: '1024 KB', ram: '512 KB', features: 'FPU, DSP, TrustZone, 8KB I-Cache' },
      net: { name: 'Network Core', cpu: 'Arm Cortex-M33 @ 64 MHz', flash: '256 KB', ram: '64 KB', features: 'Thread 802.15.4 & BLE 5.4 Controller' }
    },
    externalMemory: '8 MB QSPI NOR Flash (MX25R6435F)',
    wireless: ['Thread 802.15.4', 'Bluetooth 5.4 LE', 'Bluetooth Mesh', 'NFC-A Tag'],
    matterSupport: {
      protocols: ['Matter over Thread', 'Matter over BLE (Commissioning)'],
      matterVersion: 'Matter 1.4 / 1.6 Ready',
      roles: ['Light Bulb', 'Switch', 'Door Lock', 'Thermostat', 'Window Covering', 'Sensor']
    },
    boardTarget: 'nrf5340dk/nrf5340/cpuapp',
    features: [
      'Dual-Core Arm Cortex-M33 architecture',
      'Dedicated Network Core for real-time Thread 802.15.4 stack',
      'Active-Low 4 User LEDs (P0.28, P0.29, P0.30, P0.31)',
      '4 User Tactile Push Buttons (P1.08, P1.09, P0.23, P0.24)',
      'SEGGER J-Link On-Board debugger with VCOM & RTT',
      'Current measurement pins for Power Profiler Kit (PPK2)'
    ],
    leds: {
      led1: { pin: 'P0.28', desc: 'User LED 1 (Active-Low)', color: '#4ade80' },
      led2: { pin: 'P0.29', desc: 'User LED 2 / Matter Light State (Active-Low)', color: '#38bdf8' },
      led3: { pin: 'P0.30', desc: 'User LED 3 / Thread Network State (Active-Low)', color: '#f59e0b' },
      led4: { pin: 'P0.31', desc: 'User LED 4 / Pairing & Identification (Active-Low)', color: '#ef4444' }
    },
    buttons: {
      button1: { pin: 'P1.08', desc: 'User Button 1 (Matter Toggle On/Off)' },
      button2: { pin: 'P1.09', desc: 'User Button 2 (BLE Commissioning Start)' },
      button3: { pin: 'P0.23', desc: 'User Button 3 (Factory Reset Hold 10s)' },
      button4: { pin: 'P0.24', desc: 'User Button 4 (Custom Action / OTA Trigger)' }
    }
  },

  nrf54lm20dk: {
    id: 'nrf54lm20dk',
    name: 'nRF54LM20 DK',
    code: 'PCA10184',
    version: 'v0.7.0',
    title: 'Next-Gen Ultra-Low-Power Matter & Channel Sounding Kit',
    type: 'Matter 1.6 / Bluetooth 6.0',
    soc: 'nRF54LM20A SoC',
    isPhysicalConnected: false,
    cores: {
      app: { name: 'Application Core', cpu: 'Arm Cortex-M33 @ 128 MHz', flash: '2036 KB NVM', ram: '512 KB', features: 'High Efficiency 22nm, Secure Vault, Channel Sounding' }
    },
    externalMemory: '16 MB QSPI PSRAM / NOR Flash',
    wireless: ['Matter 1.6', 'Thread 1.4', 'Bluetooth 6.0 (Channel Sounding)', 'Zigbee', 'NFC 13.56MHz'],
    matterSupport: {
      protocols: ['Matter 1.6 Native', 'Matter over Thread', 'Matter over NFC Commissioning'],
      matterVersion: 'Matter 1.6 Standard Verified',
      roles: ['Smart Light', 'Smart Plug', 'Smart Door Lock (High-Precision Ranging)', 'Thermostat']
    },
    boardTarget: 'nrf54lm20dk/nrf54lm20b/cpuapp',
    features: [
      'Next-generation 22nm ultra-low-power radio architecture',
      'Native Matter 1.6 NFC-only commissioning support (Zero-BLE required)',
      'High-precision Channel Sounding distance measurement (<10cm)',
      'Up to 66 configurable GPIOs with advanced routing',
      'Hardware Cryptographic Engine (PSA Level 3 Security)'
    ],
    leds: {
      led0: { pin: 'P0.00', desc: 'User LED 0 (System Heartbeat)', color: '#4ade80' },
      led1: { pin: 'P0.01', desc: 'User LED 1 (Matter Light)', color: '#38bdf8' },
      led2: { pin: 'P0.02', desc: 'User LED 2 (Thread State)', color: '#f59e0b' },
      led3: { pin: 'P0.03', desc: 'User LED 3 (NFC Event)', color: '#8b5cf6' }
    },
    buttons: {
      button0: { pin: 'P0.04', desc: 'Button 0 (BLE / NFC Advertising)' },
      button1: { pin: 'P0.05', desc: 'Button 1 (Matter State Toggle)' },
      button2: { pin: 'P0.06', desc: 'Button 2 (Channel Sounding Test)' },
      button3: { pin: 'P0.07', desc: 'Button 3 (Factory Reset)' }
    }
  },

  nrf54l15dk: {
    id: 'nrf54l15dk',
    name: 'nRF54L15 DK',
    code: 'PCA10156',
    version: 'v1.0.0',
    title: 'High-Efficiency Mainstream Matter IoT Development Kit',
    type: 'Matter over Thread / BLE',
    soc: 'nRF54L15 SoC',
    isPhysicalConnected: false,
    cores: {
      app: { name: 'Application Core', cpu: 'Arm Cortex-M33 @ 128 MHz', flash: '1524 KB NVM', ram: '256 KB', features: 'Ultra-low sleep current, RISC-V coprocessor' }
    },
    externalMemory: 'Integrated high-density NVM',
    wireless: ['Thread 802.15.4', 'Bluetooth 5.4', 'NFC-A'],
    matterSupport: {
      protocols: ['Matter over Thread', 'Matter over BLE'],
      matterVersion: 'Matter 1.4 / 1.6 Ready',
      roles: ['Sensors', 'Asset Trackers', 'Smart Bulbs', 'Switches']
    },
    boardTarget: 'nrf54l15dk/nrf54l15/cpuapp',
    features: [
      'Low power active consumption (sub-50uA/MHz)',
      'Sub-microamp retention sleep mode',
      'Cost-optimized high-volume Matter product prototyping',
      'Full Zephyr RTOS & NCS SDK v3.4.0 support'
    ],
    leds: {
      led1: { pin: 'P1.10', desc: 'User LED 1', color: '#4ade80' },
      led2: { pin: 'P1.11', desc: 'User LED 2', color: '#38bdf8' },
      led3: { pin: 'P1.12', desc: 'User LED 3', color: '#f59e0b' },
      led4: { pin: 'P1.13', desc: 'User LED 4', color: '#ef4444' }
    },
    buttons: {
      button1: { pin: 'P0.08', desc: 'Button 1 (Toggle)' },
      button2: { pin: 'P0.09', desc: 'Button 2 (Pairing)' },
      button3: { pin: 'P0.10', desc: 'Button 3 (Reset)' },
      button4: { pin: 'P0.11', desc: 'Button 4 (Aux)' }
    }
  },

  nrf52840dk: {
    id: 'nrf52840dk',
    name: 'nRF52840 DK',
    code: 'PCA10056',
    version: 'v3.0.0',
    title: 'Industry Standard Matter over Thread Reference Platform',
    type: 'Matter over Thread / BLE / Zigbee',
    soc: 'nRF52840 SoC',
    isPhysicalConnected: false,
    cores: {
      app: { name: 'Main Core', cpu: 'Arm Cortex-M4F @ 64 MHz', flash: '1024 KB', ram: '256 KB', features: 'Hardware FPU, Cryptocell-310, USB 2.0 Full Speed' }
    },
    externalMemory: '8 MB QSPI Flash',
    wireless: ['Thread 802.15.4', 'Bluetooth 5.3', 'Zigbee 3.0', 'NFC-A Tag'],
    matterSupport: {
      protocols: ['Matter over Thread', 'Matter over BLE'],
      matterVersion: 'Matter 1.3 / 1.4 Certified',
      roles: ['Light Bulb', 'Switch', 'Sensor', 'Thread Border Router Radio Coprocessor (RCP)']
    },
    boardTarget: 'nrf52840dk_nrf52840',
    features: [
      'The most widely deployed Thread & Matter reference hardware globally',
      'Full USB Device interface for direct native communication',
      'Complete Arduino Uno Rev3 shield compatibility',
      'OpenThread certified Thread Reference Platform'
    ],
    leds: {
      led1: { pin: 'P0.13', desc: 'User LED 1 (Active-Low)', color: '#4ade80' },
      led2: { pin: 'P0.14', desc: 'User LED 2 (Active-Low)', color: '#38bdf8' },
      led3: { pin: 'P0.15', desc: 'User LED 3 (Active-Low)', color: '#f59e0b' },
      led4: { pin: 'P0.16', desc: 'User LED 4 (Active-Low)', color: '#ef4444' }
    },
    buttons: {
      button1: { pin: 'P0.11', desc: 'Button 1 (Toggle)' },
      button2: { pin: 'P0.12', desc: 'Button 2 (Pairing)' },
      button3: { pin: 'P0.24', desc: 'Button 3 (Action)' },
      button4: { pin: 'P0.25', desc: 'Button 4 (Factory Reset)' }
    }
  },

  nrf7002dk: {
    id: 'nrf7002dk',
    name: 'nRF7002 DK',
    code: 'PCA10143',
    version: 'v1.0.0',
    title: 'Matter over Wi-Fi 6 (2.4/5GHz Dual-Band) Development Kit',
    type: 'Matter over Wi-Fi 6',
    soc: 'nRF5340 Host + nRF7002 Wi-Fi 6 Companion IC',
    isPhysicalConnected: false,
    cores: {
      app: { name: 'Application Host', cpu: 'Arm Cortex-M33 @ 128 MHz (nRF5340)', flash: '1024 KB', ram: '512 KB', features: 'Matter App, IPv6/IPv4 Network Stack, TLS/Crypto' },
      wifi: { name: 'Wi-Fi 6 Companion', cpu: 'nRF7002 Wi-Fi 6 Companion IC', flash: 'QSPI Co-existence', ram: 'Internal Buffer', features: '802.11a/b/g/n/ac/ax (2.4GHz & 5GHz), Target Wake Time (TWT)' }
    },
    externalMemory: '8 MB QSPI NOR Flash',
    wireless: ['Wi-Fi 6 (2.4GHz & 5GHz)', 'Bluetooth 5.3 LE', 'NFC-A'],
    matterSupport: {
      protocols: ['Matter over Wi-Fi (No Thread Border Router Required)', 'Matter over BLE Commissioning'],
      matterVersion: 'Matter 1.3 / 1.4 / 1.6 Certified',
      roles: ['Matter Wi-Fi Smart Light', 'Smart Plug', 'Appliance Controller', 'Energy Monitor']
    },
    boardTarget: 'nrf7002dk_nrf5340_cpuapp',
    features: [
      'Dual-band Wi-Fi 6 (2.4 GHz & 5 GHz) for congested network environments',
      'Target Wake Time (TWT) support for battery-operated Wi-Fi devices',
      'Direct connection to home Wi-Fi AP without Thread Border Router requirement',
      'Seamless coexistence between Wi-Fi and Bluetooth LE'
    ],
    leds: {
      led1: { pin: 'P0.28', desc: 'User LED 1 (Wi-Fi Association)', color: '#4ade80' },
      led2: { pin: 'P0.29', desc: 'User LED 2 (Matter Status)', color: '#38bdf8' }
    },
    buttons: {
      button1: { pin: 'P1.08', desc: 'Button 1 (Wi-Fi WPS / Pairing)' },
      button2: { pin: 'P1.09', desc: 'Button 2 (Matter Control)' }
    }
  },

  thingy53: {
    id: 'thingy53',
    name: 'Nordic Thingy:53',
    code: 'PCA20053',
    version: 'v1.0.0',
    title: 'Multi-Sensor Matter Prototyping Platform with Built-in Battery',
    type: 'Matter Sensor & Prototyping',
    soc: 'nRF5340 Dual-Core SoC + nRF21540 FEM',
    isPhysicalConnected: false,
    cores: {
      app: { name: 'Application Core', cpu: 'Arm Cortex-M33 @ 128 MHz', flash: '1024 KB', ram: '512 KB', features: 'Embedded Machine Learning (Edge Impulse)' }
    },
    externalMemory: '8 MB QSPI Flash',
    wireless: ['Thread', 'Bluetooth LE', 'NFC', 'nRF21540 RF Range Extender'],
    matterSupport: {
      protocols: ['Matter over Thread'],
      matterVersion: 'Matter 1.4 / 1.6 Ready',
      roles: ['Matter Environmental Sensor (Temp, Humidity, Pressure, Air Quality)', 'Occupancy / Motion', 'Weather Station']
    },
    boardTarget: 'thingy53_nrf5340_cpuapp',
    features: [
      'Built-in 1350 mAh Li-Po rechargeable battery with USB-C charging',
      'Onboard BME688 Environmental Sensor (Gas, Temp, Humidity, Pressure)',
      'Low-power accelerometer and high-g accelerometer (BMI270, BMM150)',
      'Color sensor (BH1749), buzzer, and high-power RGB LED',
      'Edge Impulse machine learning firmware ready'
    ],
    leds: {
      rgb: { pin: 'P0.25-27', desc: 'High-Luminance RGB LED (Full Color)', color: '#00a9ce' }
    },
    buttons: {
      userButton: { pin: 'P1.14', desc: 'User Button (Main Action / Pairing)' }
    }
  }
};

class BoardsCatalog {
  constructor() {
    this.catalog = BOARDS_CATALOG;
    this.activeBoardId = 'nrf5340dk'; // Default active board
  }

  getAllBoards() {
    return Object.values(this.catalog);
  }

  getBoard(id) {
    return this.catalog[id] || this.catalog.nrf5340dk;
  }

  getActiveBoard() {
    return this.catalog[this.activeBoardId];
  }

  setActiveBoard(id) {
    if (this.catalog[id]) {
      this.activeBoardId = id;
      return this.catalog[id];
    }
    return this.getActiveBoard();
  }
}

module.exports = new BoardsCatalog();
