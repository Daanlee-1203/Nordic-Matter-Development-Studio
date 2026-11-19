const jlink = require('../engine/jlink_adapter');

async function run() {
  console.log('1. Turning OFF all LEDs on real nRF5340 DK...');
  await jlink.setLedsHardware({ led1: false, led2: false, led3: false, led4: false });
  console.log('LEDs should be OFF now.');

  await new Promise(r => setTimeout(r, 1500));

  console.log('2. Turning ON all LEDs on real nRF5340 DK...');
  await jlink.setLedsHardware({ led1: true, led2: true, led3: true, led4: true });
  console.log('LEDs should be ON now.');
}

run();
