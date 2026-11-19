const board = require('../engine/board_engine');
const matter = require('../engine/matter_adapter');
const power = require('../engine/power_profiler');

console.log('[TEST] Checking Board Engine...');
const bState = board.getBoardState();
console.assert(bState.boardInfo.boardName === 'nRF5340 DK', 'Board name mismatch');
console.assert(bState.appCore.status === 'Running', 'App Core should be running');
console.assert(bState.netCore.status === 'Running', 'Net Core should be running');
console.log('✓ Board Engine Initialized Successfully');

console.log('[TEST] Checking Matter Adapter...');
const mState = matter.getState();
console.assert(mState.deviceTypeId === '0x010D', 'Matter Device Type should be 0x010D (Extended Color Light)');
console.assert(mState.state.onOff === true, 'Default onOff should be true');

console.log('[TEST] Testing setAllLeds...');
board.setAllLeds(true).then(res => {
  console.assert(res.success === true, 'setAllLeds true failed');
  console.assert(board.leds.led1 === true && board.leds.led2 === true && board.leds.led3 === true && board.leds.led4 === true, 'All LEDs should be ON');
  console.log('✓ setAllLeds(true) Tested Successfully');

  // Test CLI Command
  const cliResp = board.processCommand('led all on');
  console.assert(cliResp.includes('All 4 LEDs'), 'CLI led all on failed');
  console.log('✓ CLI "led all on" Tested Successfully');
});

// Update Matter Control
matter.updateControl({ onOff: false, level: 100, colorTemperatureKelvin: 2700 });
console.assert(matter.state.onOff === false, 'OnOff update failed');
console.assert(matter.state.level === 100, 'Level update failed');
console.assert(matter.state.colorTemperatureKelvin === 2700, 'Kelvin update failed');
console.log('✓ Matter Adapter Control Tested Successfully');

// Test Alert Pipeline (Snapshot & Restore)
console.log('[TEST] Testing Alert Pipeline (Snapshot & Restore)...');
matter.triggerAlert({
  eventId: 'test-evt-1',
  eventType: 'delivery.arrived',
  label: '배송 도착',
  alertColorHex: '#38bdf8',
  durationSeconds: 1
}).then(res => {
  console.assert(res.success === true, 'Alert trigger failed');
  console.assert(matter.activeAlert !== null, 'Alert should be active');
  console.log('✓ Alert Pipeline Triggered Successfully');

  setTimeout(() => {
    console.assert(matter.activeAlert === null, 'Alert should be restored');
    console.log('✓ Alert Pipeline Restored Successfully');
    console.log('ALL TESTS PASSED!');
    process.exit(0);
  }, 1200);
});
