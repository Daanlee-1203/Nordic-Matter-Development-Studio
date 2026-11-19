class PowerProfiler {
  constructor() {
    this.voltage = 3.0; // Volts (VDD)
    this.sampleHistory = [];
    this.maxHistory = 100;
    this.blePulseCounter = 0;
    this.threadPulseCounter = 0;
    this.totalSamples = 0;
    this.sumCurrent = 0;
    this.minCurrent = 999999;
    this.maxCurrent = 0;
  }

  // Calculate current based on board state (returns current in mA)
  generateSample(boardState) {
    this.blePulseCounter++;
    this.threadPulseCounter++;

    let baseCurrent = 0.035; // 35 uA baseline in idle/sleepy mode

    if (boardState.appCore.status === 'Running') {
      baseCurrent += 4.2; // App core Cortex-M33 @ 128MHz
    } else if (boardState.appCore.status === 'Resetting') {
      baseCurrent += 6.5;
    }

    if (boardState.netCore.status === 'Running') {
      baseCurrent += 2.1; // Net core Cortex-M33 @ 64MHz
    }

    // Active LEDs (each LED draws approx 2.2mA)
    const activeLeds = Object.values(boardState.leds).filter(v => v).length;
    baseCurrent += activeLeds * 2.2;

    // Periodic BLE advertising burst (every 10 samples ~ 1s)
    let isBleTx = false;
    if (this.blePulseCounter % 10 === 0) {
      baseCurrent += 6.5 + (Math.random() * 1.5);
      isBleTx = true;
    }

    // Periodic Thread 802.15.4 mesh activity (every 25 samples ~ 2.5s)
    let isThreadTx = false;
    if (this.threadPulseCounter % 25 === 0) {
      baseCurrent += 11.2 + (Math.random() * 2.8);
      isThreadTx = true;
    }

    // Add slight realistic Gaussian noise
    const noise = (Math.random() - 0.5) * 0.15;
    let current_mA = Math.max(0.015, baseCurrent + noise);

    // Update stats
    this.totalSamples++;
    this.sumCurrent += current_mA;
    if (current_mA < this.minCurrent) this.minCurrent = current_mA;
    if (current_mA > this.maxCurrent) this.maxCurrent = current_mA;

    const sample = {
      timestamp: Date.now(),
      current_mA: Number(current_mA.toFixed(3)),
      voltage_V: this.voltage,
      power_mW: Number((current_mA * this.voltage).toFixed(3)),
      activeLeds,
      event: isThreadTx ? 'Thread TX' : (isBleTx ? 'BLE Adv' : 'Normal')
    };

    this.sampleHistory.push(sample);
    if (this.sampleHistory.length > this.maxHistory) {
      this.sampleHistory.shift();
    }

    return sample;
  }

  getSummary() {
    const avgCurrent = this.totalSamples > 0 ? (this.sumCurrent / this.totalSamples) : 0;
    return {
      voltage: this.voltage,
      current_mA: this.sampleHistory.length > 0 ? this.sampleHistory[this.sampleHistory.length - 1].current_mA : 0,
      avg_mA: Number(avgCurrent.toFixed(3)),
      min_mA: Number(this.minCurrent.toFixed(3)),
      max_mA: Number(this.maxCurrent.toFixed(3)),
      power_mW: Number((avgCurrent * this.voltage).toFixed(3)),
      batteryLifeEstimateHours: avgCurrent > 0 ? Number(((240 / avgCurrent)).toFixed(1)) : 0 // CR2032 (240mAh)
    };
  }

  getHistory() {
    return this.sampleHistory;
  }
}

module.exports = new PowerProfiler();
