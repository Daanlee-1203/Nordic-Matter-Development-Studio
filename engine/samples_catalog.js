/**
 * Nordic Semiconductor nRF Connect SDK (NCS) Official Matter Samples Catalog
 * Reference: https://nrfconnectdocs.nordicsemi.com/addons/ncs-matter/latest/samples/index.html#samples
 * Documentation: https://docs.nordicsemi.com/bundle/ncs-latest/page/nrf/samples/matter/
 */

const NCS_MATTER_SAMPLES = {
  light_bulb: {
    id: 'light_bulb',
    name: 'Matter: Light bulb (조명 전구)',
    sdkPath: 'nrf/samples/matter/light_bulb',
    docUrl: 'https://nrfconnectdocs.nordicsemi.com/addons/ncs-matter/latest/samples/light_bulb/README.html',
    category: '조명 및 제어 (Lighting)',
    icon: '💡',
    deviceType: '0x010C (Extended Color Light) / 0x0101 (Dimmable Light)',
    endpoint: 1,
    clusters: [
      { id: '0x0003', name: 'Identify', role: 'Server', desc: '장치 식별 및 LED 블링크' },
      { id: '0x0004', name: 'Groups', role: 'Server', desc: '그룹 제어 및 멀티캐스트' },
      { id: '0x0005', name: 'Scenes', role: 'Server', desc: '사전 설정 조명 씬 저장 및 재생' },
      { id: '0x0006', name: 'On/Off', role: 'Server', desc: '전원 켜기 / 끄기 제어' },
      { id: '0x0008', name: 'Level Control', role: 'Server', desc: '0~254 단계 밝기 디밍 제어' },
      { id: '0x0300', name: 'Color Control', role: 'Server', desc: 'Hue/Sat 색상 및 CCT(색온도) 제어' }
    ],
    transports: ['Matter over Thread', 'Matter over Wi-Fi', 'Matter over BLE (커미셔닝)'],
    supportedBoards: ['nrf5340dk', 'nrf54lm20dk', 'nrf54l15dk', 'nrf52840dk', 'nrf7002dk', 'thingy53'],
    defaultBoardTarget: 'nrf5340dk/nrf5340/cpuapp',
    kconfigSymbols: [
      'CONFIG_CHIP=y',
      'CONFIG_CHIP_ENABLE_PAIRING_AUTOSTART=y',
      'CONFIG_CHIP_PROJECT_CONFIG="include/CHIPProjectConfig.h"',
      'CONFIG_CHIP_FACTORY_DATA=y',
      'CONFIG_CHIP_ENABLE_DNSSD_SRP=y'
    ],
    westBuildCmd: 'west build -b nrf5340dk/nrf5340/cpuapp nrf/samples/matter/light_bulb',
    description: '디밍 및 색상 제어(HSV/RGB 및 켈빈 색온도)를 지원하는 표준 스마트 조명 전구 샘플입니다. 보드의 버튼 1(토글) 및 LED 2(조명 상태)와 연동됩니다.',
    hardwareMapping: {
      led: 'LED 2 (Matter 조명 상태 On/Off 및 PWM 밝기)',
      button: 'Button 1 (로컬 조명 토글), Button 2 (커미셔닝 시작)'
    },
    initialState: {
      onOff: true,
      level: 210,
      colorMode: 'colorTemperature',
      colorTemperatureKelvin: 4000,
      rgbHex: '#38bdf8'
    }
  },

  light_switch: {
    id: 'light_switch',
    name: 'Matter: Light switch (스위치 / 디머 컨트롤러)',
    sdkPath: 'nrf/samples/matter/light_switch',
    docUrl: 'https://nrfconnectdocs.nordicsemi.com/addons/ncs-matter/latest/samples/light_switch/README.html',
    category: '조명 및 제어 (Lighting)',
    icon: '🎛️',
    deviceType: '0x0103 (Dimmer Switch) / 0x0104 (Color Dimmer Switch)',
    endpoint: 1,
    clusters: [
      { id: '0x0003', name: 'Identify', role: 'Server/Client', desc: '스위치 식별' },
      { id: '0x0006', name: 'On/Off', role: 'Client', desc: '바인딩된 조명 On/Off 명령 발송' },
      { id: '0x0008', name: 'Level Control', role: 'Client', desc: '바인딩된 조명 밝기 조절' },
      { id: '0x001E', name: 'Binding', role: 'Server', desc: '원격 대상 기기 주소 바인딩 테이블' },
      { id: '0x003B', name: 'Switch', role: 'Server', desc: '클릭, 더블클릭, 롱프레스 이벤트 생성' }
    ],
    transports: ['Matter over Thread', 'Matter over Wi-Fi', 'Matter over BLE'],
    supportedBoards: ['nrf5340dk', 'nrf54lm20dk', 'nrf54l15dk', 'nrf52840dk', 'nrf7002dk', 'thingy53'],
    defaultBoardTarget: 'nrf5340dk/nrf5340/cpuapp',
    kconfigSymbols: [
      'CONFIG_CHIP=y',
      'CONFIG_CHIP_ENABLE_PAIRING_AUTOSTART=y',
      'CONFIG_CHIP_BINDING_TABLE_SIZE=10'
    ],
    westBuildCmd: 'west build -b nrf5340dk/nrf5340/cpuapp nrf/samples/matter/light_switch',
    description: '다른 Matter 조명 기기와 바인딩(Binding)되어 원격에서 불을 켜고 끄거나 디밍을 명령하는 컨트롤러 샘플입니다.',
    hardwareMapping: {
      led: 'LED 1 (네트워크 상태), LED 2 (명령 송신 인디케이터)',
      button: 'Button 1 (단일 클릭: On/Off, 더블 클릭: 밝기 Up), Button 2 (길게 누름: 밝기 Down)'
    },
    initialState: {
      boundNodeId: '0x123456780001',
      boundEndpoint: 1,
      switchState: 'Idle',
      lastAction: 'Single Click -> Toggle Sent',
      pressCount: 14
    }
  },

  lock: {
    id: 'lock',
    name: 'Matter: Door lock (스마트 도어락)',
    sdkPath: 'nrf/samples/matter/lock',
    docUrl: 'https://nrfconnectdocs.nordicsemi.com/addons/ncs-matter/latest/samples/lock/README.html',
    category: '보안 및 도어 (Security)',
    icon: '🔒',
    deviceType: '0x000A (Door Lock Device Type)',
    endpoint: 1,
    clusters: [
      { id: '0x0003', name: 'Identify', role: 'Server', desc: '도어락 식별' },
      { id: '0x0101', name: 'Door Lock', role: 'Server', desc: '볼트 잠금/해제, 자동 재잠금, PIN 인증' },
      { id: '0x0041', name: 'User Label', role: 'Server', desc: '사용자 태그 라벨 관리' },
      { id: '0x002F', name: 'Power Source', role: 'Server', desc: '도어락 배터리 잔량 모니터링' }
    ],
    transports: ['Matter over Thread (SED)', 'Matter over Wi-Fi', 'Matter over BLE'],
    supportedBoards: ['nrf5340dk', 'nrf54lm20dk', 'nrf54l15dk', 'nrf52840dk', 'nrf7002dk', 'thingy53'],
    defaultBoardTarget: 'nrf5340dk/nrf5340/cpuapp',
    kconfigSymbols: [
      'CONFIG_CHIP=y',
      'CONFIG_CHIP_ENABLE_PAIRING_AUTOSTART=y',
      'CONFIG_CHIP_DOOR_LOCK_AUTO_RELOCK=y',
      'CONFIG_CHIP_SED=y'
    ],
    westBuildCmd: 'west build -b nrf5340dk/nrf5340/cpuapp nrf/samples/matter/lock',
    description: '물리 볼트 메커니즘을 구동하고 잠금 상태를 감시하는 스마트 도어락 샘플입니다. Sleepy End Device(SED) 절전 프로필과 자동 재잠금을 지원합니다.',
    hardwareMapping: {
      led: 'LED 1 (네트워크), LED 2 (잠금=점등 / 해제=소등), LED 3 (알람/인증 실패)',
      button: 'Button 1 (수동 잠금/해제 토글), Button 2 (커미셔닝 모드)'
    },
    initialState: {
      lockState: 'Locked',
      boltState: 'Locked',
      doorState: 'Closed',
      autoRelockTimeSec: 10,
      batteryPercent: 92,
      lastUser: 'Master Pin (User 1)'
    }
  },

  thermostat: {
    id: 'thermostat',
    name: 'Matter: Thermostat (온도조절기 / 공조기)',
    sdkPath: 'nrf/samples/matter/thermostat',
    docUrl: 'https://nrfconnectdocs.nordicsemi.com/addons/ncs-matter/latest/samples/thermostat/README.html',
    category: 'HVAC 및 실내환경 (Climate)',
    icon: '🌡️',
    deviceType: '0x0301 (Thermostat Device Type)',
    endpoint: 1,
    clusters: [
      { id: '0x0003', name: 'Identify', role: 'Server', desc: '장치 식별' },
      { id: '0x0201', name: 'Thermostat', role: 'Server', desc: '냉난방 설정온도, 시스템 모드, 제어 알고리즘' },
      { id: '0x0204', name: 'Thermostat UI Config', role: 'Server', desc: '온도 표기 단위 (°C/°F) 설정' },
      { id: '0x0402', name: 'Temperature Measurement', role: 'Server', desc: '실시간 측정 실내온도' },
      { id: '0x0405', name: 'Relative Humidity Measurement', role: 'Server', desc: '실시간 측정 실내습도' }
    ],
    transports: ['Matter over Thread', 'Matter over Wi-Fi', 'Matter over BLE'],
    supportedBoards: ['nrf5340dk', 'nrf54lm20dk', 'nrf54l15dk', 'nrf52840dk', 'nrf7002dk', 'thingy53'],
    defaultBoardTarget: 'nrf5340dk/nrf5340/cpuapp',
    kconfigSymbols: [
      'CONFIG_CHIP=y',
      'CONFIG_CHIP_ENABLE_PAIRING_AUTOSTART=y',
      'CONFIG_CHIP_ENABLE_DNSSD_SRP=y'
    ],
    westBuildCmd: 'west build -b nrf5340dk/nrf5340/cpuapp nrf/samples/matter/thermostat',
    description: '실내 온·습도를 센싱하고 냉방 및 난방 목표 온도를 유지하는 공조(HVAC) 제어기 샘플입니다. Matter 1.6 Situational Awareness 및 에너지 절감 제안 기능을 제공합니다.',
    hardwareMapping: {
      led: 'LED 1 (네트워크), LED 2 (난방 가동 시 적색/점등), LED 3 (냉방 가동 시 청색/점등)',
      button: 'Button 1 (설정 온도 0.5°C 올림), Button 2 (설정 온도 0.5°C 내림)'
    },
    initialState: {
      localTemperature: 22.5,
      occupiedHeatingSetpoint: 21.0,
      occupiedCoolingSetpoint: 25.0,
      systemMode: 'Auto',
      humidity: 48,
      ecoMode: true
    }
  },

  window_covering: {
    id: 'window_covering',
    name: 'Matter: Window covering (전동 블라인드 / 셔터)',
    sdkPath: 'nrf/samples/matter/window_covering',
    docUrl: 'https://nrfconnectdocs.nordicsemi.com/addons/ncs-matter/latest/samples/window_covering/README.html',
    category: '가구 및 커버링 (Closures)',
    icon: '🪟',
    deviceType: '0x0202 (Window Covering Device Type)',
    endpoint: 1,
    clusters: [
      { id: '0x0003', name: 'Identify', role: 'Server', desc: '블라인드 식별' },
      { id: '0x0102', name: 'Window Covering', role: 'Server', desc: '리프트(상하 0~100%), 틸트(각도 0~100%) 제어' }
    ],
    transports: ['Matter over Thread', 'Matter over Wi-Fi', 'Matter over BLE'],
    supportedBoards: ['nrf5340dk', 'nrf54lm20dk', 'nrf54l15dk', 'nrf52840dk', 'nrf7002dk', 'thingy53'],
    defaultBoardTarget: 'nrf5340dk/nrf5340/cpuapp',
    kconfigSymbols: [
      'CONFIG_CHIP=y',
      'CONFIG_CHIP_ENABLE_PAIRING_AUTOSTART=y'
    ],
    westBuildCmd: 'west build -b nrf5340dk/nrf5340/cpuapp nrf/samples/matter/window_covering',
    description: '모터 구동식 롤러 블라인드, 셔터, 커튼의 상하 개폐율(Lift) 및 슬랫 각도(Tilt)를 정밀 제어하는 샘플입니다.',
    hardwareMapping: {
      led: 'LED 1 (네트워크), LED 2 (모터 상승 동작), LED 3 (모터 하강 동작)',
      button: 'Button 1 (블라인드 완전 열기 / 정지), Button 2 (블라인드 완전 닫기 / 정지)'
    },
    initialState: {
      currentPositionLiftPercent: 40,
      targetPositionLiftPercent: 40,
      currentPositionTiltPercent: 15,
      motorStatus: 'Stopped'
    }
  },

  contact_sensor: {
    id: 'contact_sensor',
    name: 'Matter: Contact sensor (도어/창문 개폐 센서)',
    sdkPath: 'nrf/samples/matter/contact_sensor',
    docUrl: 'https://nrfconnectdocs.nordicsemi.com/addons/ncs-matter/latest/samples/contact_sensor/README.html',
    category: '센서 및 보안 (Sensors)',
    icon: '🚪',
    deviceType: '0x0015 (Contact Sensor Device Type)',
    endpoint: 1,
    clusters: [
      { id: '0x0003', name: 'Identify', role: 'Server', desc: '센서 식별' },
      { id: '0x0045', name: 'Boolean State', role: 'Server', desc: '도어 열림(True) / 닫힘(False) 상태' },
      { id: '0x0046', name: 'ICD Management', role: 'Server', desc: 'Matter 1.4/1.6 Intermittent Connected Device 절전 관리' },
      { id: '0x002F', name: 'Power Source', role: 'Server', desc: '코인셀 배터리 전압 및 수명' }
    ],
    transports: ['Matter over Thread (SED / ICD)', 'Matter over BLE'],
    supportedBoards: ['nrf5340dk', 'nrf54lm20dk', 'nrf54l15dk', 'nrf52840dk', 'nrf7002dk', 'thingy53'],
    defaultBoardTarget: 'nrf5340dk/nrf5340/cpuapp',
    kconfigSymbols: [
      'CONFIG_CHIP=y',
      'CONFIG_CHIP_SED=y',
      'CONFIG_CHIP_ENABLE_ICD_SUPPORT=y',
      'CONFIG_PM=y'
    ],
    westBuildCmd: 'west build -b nrf5340dk/nrf5340/cpuapp nrf/samples/matter/contact_sensor',
    description: '초저전력 슬리피 엔드 디바이스(SED)로 동작하는 자석 리드 스위치 기반 도어/창문 감시 센서 샘플입니다.',
    hardwareMapping: {
      led: 'LED 1 (도어 열림 시 즉시 점등, 닫힘 시 소등)',
      button: 'Button 1 (자석 접촉/탈착 시뮬레이션 토글)'
    },
    initialState: {
      contactState: 'Closed',
      stateValue: false,
      batteryLevel: 98,
      icdIntervalMs: 5000
    }
  },

  smoke_co_alarm: {
    id: 'smoke_co_alarm',
    name: 'Matter: Smoke CO alarm (화재 연기 및 일산화탄소 경보기)',
    sdkPath: 'nrf/samples/matter/smoke_co_alarm',
    docUrl: 'https://nrfconnectdocs.nordicsemi.com/addons/ncs-matter/latest/samples/smoke_co_alarm/README.html',
    category: '센서 및 안전 (Safety)',
    icon: '🚨',
    deviceType: '0x0076 (Smoke CO Alarm Device Type)',
    endpoint: 1,
    clusters: [
      { id: '0x0003', name: 'Identify', role: 'Server', desc: '경보기 식별' },
      { id: '0x005C', name: 'Smoke CO Alarm', role: 'Server', desc: '연기/CO 상태, 셀프테스트, 음소거(Mute)' },
      { id: '0x002F', name: 'Power Source', role: 'Server', desc: '10년 리튬 배터리 잔량' }
    ],
    transports: ['Matter over Thread (SED)', 'Matter over BLE'],
    supportedBoards: ['nrf5340dk', 'nrf54lm20dk', 'nrf54l15dk', 'nrf52840dk', 'nrf7002dk', 'thingy53'],
    defaultBoardTarget: 'nrf5340dk/nrf5340/cpuapp',
    kconfigSymbols: [
      'CONFIG_CHIP=y',
      'CONFIG_CHIP_SED=y',
      'CONFIG_CHIP_ENABLE_PAIRING_AUTOSTART=y'
    ],
    westBuildCmd: 'west build -b nrf5340dk/nrf5340/cpuapp nrf/samples/matter/smoke_co_alarm',
    description: '화재 연기 및 일산화탄소(CO) 농도를 실시간 감지하여 허브 및 스마트폰으로 긴급 대피 알림을 발송하는 안전 경보기 샘플입니다.',
    hardwareMapping: {
      led: 'LED 1 (네트워크 정상), LED 4 (화재 경보 발생 시 초고속 점멸)',
      button: 'Button 1 (테스트 알람 트리거), Button 2 (경보 음소거 Mute)'
    },
    initialState: {
      smokeState: 'Normal',
      coState: 'Normal',
      alarmExpressed: false,
      batteryLevel: 99,
      endOfService: false
    }
  },

  weather_station: {
    id: 'weather_station',
    name: 'Matter: Weather station (온·습·기압 다중 기상관측기)',
    sdkPath: 'nrf/samples/matter/weather_station',
    docUrl: 'https://nrfconnectdocs.nordicsemi.com/addons/ncs-matter/latest/samples/weather_station/README.html',
    category: '센서 및 실내환경 (Sensors)',
    icon: '🌤️',
    deviceType: '0x0302 (Temp), 0x0307 (Humidity), 0x0305 (Pressure)',
    endpoint: 1,
    clusters: [
      { id: '0x0003', name: 'Identify', role: 'Server', desc: '기상 스테이션 식별' },
      { id: '0x0402', name: 'Temperature Measurement', role: 'Server', desc: '외기/실내 온도 측정' },
      { id: '0x0405', name: 'Relative Humidity Measurement', role: 'Server', desc: '상대 습도 (%)' },
      { id: '0x0403', name: 'Pressure Measurement', role: 'Server', desc: '대기압 (hPa/mbar)' },
      { id: '0x005B', name: 'Air Quality', role: 'Server', desc: 'VOC / 공기질 지수' }
    ],
    transports: ['Matter over Thread', 'Matter over Wi-Fi', 'Matter over BLE'],
    supportedBoards: ['thingy53', 'nrf5340dk', 'nrf54lm20dk', 'nrf54l15dk', 'nrf7002dk', 'nrf52840dk'],
    defaultBoardTarget: 'thingy53_nrf5340_cpuapp',
    kconfigSymbols: [
      'CONFIG_CHIP=y',
      'CONFIG_SENSOR=y',
      'CONFIG_BME680=y'
    ],
    westBuildCmd: 'west build -b thingy53_nrf5340_cpuapp nrf/samples/matter/weather_station',
    description: '온도, 상대습도, 기압, 공기질 지표를 동시에 읽어 Matter 패브릭에 브로드캐스트하는 복합 기상관측 플랫폼 샘플입니다 (Thingy:53 BME688 최적화).',
    hardwareMapping: {
      led: 'RGB LED (공기질 상태 색상: 좋음=녹색, 보통=황색, 나쁨=적색)',
      button: 'Button 1 (측정 주기 수동 갱신)'
    },
    initialState: {
      temperatureC: 23.4,
      humidityPercent: 52,
      pressureHpa: 1013.25,
      airQualityIndex: 'Good',
      vocIndex: 28
    }
  },

  all_clusters_app: {
    id: 'all_clusters_app',
    name: 'Matter: All clusters app (전체 클러스터 표준 적합성 시험기)',
    sdkPath: 'nrf/samples/matter/all_clusters_app',
    docUrl: 'https://nrfconnectdocs.nordicsemi.com/addons/ncs-matter/latest/samples/all_clusters_app/README.html',
    category: '코어 및 적합성 시험 (Core & Test)',
    icon: '🧪',
    deviceType: 'Multiple Endpoints (CSA Comprehensive Reference)',
    endpoint: 1,
    clusters: [
      { id: '0x001D', name: 'Descriptor', role: 'Server', desc: '엔드포인트 및 클러스터 디스크립터' },
      { id: '0x001F', name: 'Access Control', role: 'Server', desc: 'ACL 패브릭 보안 정책' },
      { id: '0x0028', name: 'Basic Information', role: 'Server', desc: '기기 제조사, 모델, 펌웨어 버전 정보' },
      { id: '0x0030', name: 'General Commissioning', role: 'Server', desc: '페어링 및 브레드크럼 관리' },
      { id: '0x0031', name: 'Network Commissioning', role: 'Server', desc: 'Thread / Wi-Fi 네트워크 프로비저닝' },
      { id: '0x0033', name: 'General Diagnostics', role: 'Server', desc: '시스템 업타임, 리부트 카운트' },
      { id: '0x0035', name: 'Thread Network Diagnostics', role: 'Server', desc: 'OpenThread 라우터/차일드 통계' }
    ],
    transports: ['Matter over Thread', 'Matter over Wi-Fi'],
    supportedBoards: ['nrf5340dk', 'nrf54lm20dk', 'nrf54l15dk', 'nrf52840dk', 'nrf7002dk'],
    defaultBoardTarget: 'nrf5340dk/nrf5340/cpuapp',
    kconfigSymbols: [
      'CONFIG_CHIP=y',
      'CONFIG_CHIP_ALL_CLUSTERS_APP=y',
      'CONFIG_CHIP_ENABLE_PAIRING_AUTOSTART=y'
    ],
    westBuildCmd: 'west build -b nrf5340dk/nrf5340/cpuapp nrf/samples/matter/all_clusters_app',
    description: 'CSA(Connectivity Standards Alliance) 공식 적합성 인증 시험(Certification Test Harness)을 위한 종합 클러스터 구현체 샘플입니다.',
    hardwareMapping: {
      led: 'LED 1~4 (테스트 하니스 커맨드 실행 인디케이터)',
      button: 'Button 1~4 (진단 이벤트 생성 및 팩토리 리셋)'
    },
    initialState: {
      activeEndpoints: [0, 1, 2],
      testHarnessState: 'Ready',
      aclRuleCount: 4,
      uptimeSeconds: 14820
    }
  },

  bridge: {
    id: 'bridge',
    name: 'Matter: Bridge (이종 네트워크 브릿지 - Zigbee/BLE)',
    sdkPath: 'nrf/samples/matter/bridge',
    docUrl: 'https://nrfconnectdocs.nordicsemi.com/addons/ncs-matter/latest/samples/bridge/README.html',
    category: '브릿징 및 레거시 연동 (Bridging)',
    icon: '🌉',
    deviceType: '0x000E (Aggregator) + 0x0013 (Bridged Node)',
    endpoint: 1,
    clusters: [
      { id: '0x000E', name: 'Aggregator', role: 'Server', desc: '가상 서브엔드포인트 동적 매핑' },
      { id: '0x0039', name: 'Bridged Device Basic Info', role: 'Server', desc: '브릿지 하위 기기 메타데이터' }
    ],
    transports: ['Matter over Thread / Wi-Fi + BLE / Zigbee Sub-radio'],
    supportedBoards: ['nrf5340dk', 'nrf54lm20dk', 'nrf7002dk', 'nrf52840dk'],
    defaultBoardTarget: 'nrf5340dk/nrf5340/cpuapp',
    kconfigSymbols: [
      'CONFIG_CHIP=y',
      'CONFIG_CHIP_BRIDGE=y',
      'CONFIG_CHIP_DYNAMIC_ENDPOINTS=y'
    ],
    westBuildCmd: 'west build -b nrf5340dk/nrf5340/cpuapp nrf/samples/matter/bridge',
    description: '기존의 비-Matter 기기(Zigbee, Bluetooth Mesh, Proprietary 무선 기기)를 Matter 패브릭 엔드포인트로 노출시켜 스마트홈 허브에서 원격 제어할 수 있게 변환해 주는 브릿지 샘플입니다.',
    hardwareMapping: {
      led: 'LED 1 (Matter 패브릭 연결), LED 2 (서브 무선 네트워크 통신)',
      button: 'Button 1 (신규 서브 노드 페어링), Button 2 (브릿지 데이터 동기화)'
    },
    initialState: {
      bridgedNodes: [
        { id: 1, name: 'Zigbee Dimmable Bulb', type: 'Dimmable Light', online: true, state: 'ON (75%)' },
        { id: 2, name: 'BLE Mesh Temp Sensor', type: 'Temperature Sensor', online: true, state: '22.8 °C' }
      ],
      totalBridgedEndpoints: 2
    }
  },

  pump: {
    id: 'pump',
    name: 'Matter: Pump & Controller (유체 펌프 및 제어기)',
    sdkPath: 'nrf/samples/matter/pump',
    docUrl: 'https://nrfconnectdocs.nordicsemi.com/addons/ncs-matter/latest/samples/pump/README.html',
    category: '산업 및 유체 제어 (Appliance)',
    icon: '🚰',
    deviceType: '0x0303 (Pump) / 0x0304 (Pump Controller)',
    endpoint: 1,
    clusters: [
      { id: '0x0003', name: 'Identify', role: 'Server', desc: '펌프 식별' },
      { id: '0x0200', name: 'Pump Config and Control', role: 'Server', desc: '운전 모드, 목표 압력, 유량, 속도 제어' },
      { id: '0x0403', name: 'Pressure Measurement', role: 'Server', desc: '토출 압력 센서' },
      { id: '0x0404', name: 'Flow Measurement', role: 'Server', desc: '순간 유량 (m³/h)' }
    ],
    transports: ['Matter over Thread', 'Matter over Wi-Fi'],
    supportedBoards: ['nrf5340dk', 'nrf54lm20dk', 'nrf54l15dk', 'nrf52840dk', 'nrf7002dk'],
    defaultBoardTarget: 'nrf5340dk/nrf5340/cpuapp',
    kconfigSymbols: [
      'CONFIG_CHIP=y',
      'CONFIG_CHIP_ENABLE_PAIRING_AUTOSTART=y'
    ],
    westBuildCmd: 'west build -b nrf5340dk/nrf5340/cpuapp nrf/samples/matter/pump',
    description: '스마트 빌딩 및 산업용 수처리 펌프를 Matter 네트워크에 연동하여 정밀 압력 및 유량을 제어하는 샘플입니다.',
    hardwareMapping: {
      led: 'LED 1 (네트워크), LED 2 (펌프 구동 상태 PWM)',
      button: 'Button 1 (펌프 기동/정지), Button 2 (목표 압력 증감)'
    },
    initialState: {
      pumpRunning: true,
      flowRateLpm: 42.5,
      targetPressureBar: 3.5,
      actualPressureBar: 3.48,
      speedRpm: 1750
    }
  },

  template: {
    id: 'template',
    name: 'Matter: Template application (커스텀 장치 템플릿)',
    sdkPath: 'nrf/samples/matter/template',
    docUrl: 'https://nrfconnectdocs.nordicsemi.com/addons/ncs-matter/latest/samples/template/README.html',
    category: '개발 템플릿 (Template)',
    icon: '📋',
    deviceType: 'Custom / Baseline Template',
    endpoint: 1,
    clusters: [
      { id: '0x0003', name: 'Identify', role: 'Server', desc: '기본 식별 클러스터' },
      { id: '0x001D', name: 'Descriptor', role: 'Server', desc: '엔드포인트 정의' }
    ],
    transports: ['Matter over Thread', 'Matter over Wi-Fi'],
    supportedBoards: ['nrf5340dk', 'nrf54lm20dk', 'nrf54l15dk', 'nrf52840dk', 'nrf7002dk', 'thingy53'],
    defaultBoardTarget: 'nrf5340dk/nrf5340/cpuapp',
    kconfigSymbols: [
      'CONFIG_CHIP=y',
      'CONFIG_CHIP_ENABLE_PAIRING_AUTOSTART=y'
    ],
    westBuildCmd: 'west build -b nrf5340dk/nrf5340/cpuapp nrf/samples/matter/template',
    description: '자체 커스텀 장치 타입이나 독자 클러스터를 신속하게 개발할 수 있도록 최소한의 필수 Matter 초기화 코드를 제공하는 클린 베이스라인 템플릿입니다.',
    hardwareMapping: {
      led: 'LED 1 (네트워크 인디케이터)',
      button: 'Button 1 (사용자 커스텀 핸들러)'
    },
    initialState: {
      customClusterActive: true,
      endpointId: 1,
      status: 'Template Baseline Ready'
    }
  }
};

class SamplesCatalog {
  constructor() {
    this.samples = NCS_MATTER_SAMPLES;
    this.activeSampleId = 'light_bulb';
    this.liveStates = {};

    // Initialize live states
    Object.keys(this.samples).forEach(id => {
      this.liveStates[id] = JSON.parse(JSON.stringify(this.samples[id].initialState));
    });
  }

  getAllSamples() {
    return Object.values(this.samples);
  }

  getSample(id) {
    return this.samples[id] || this.samples.light_bulb;
  }

  getActiveSample() {
    return {
      sample: this.getSample(this.activeSampleId),
      liveState: this.liveStates[this.activeSampleId]
    };
  }

  setActiveSample(id) {
    if (this.samples[id]) {
      this.activeSampleId = id;
      return this.getActiveSample();
    }
    return this.getActiveSample();
  }

  updateSampleState(id, patch) {
    if (this.liveStates[id]) {
      this.liveStates[id] = { ...this.liveStates[id], ...patch };
      return this.liveStates[id];
    }
    return null;
  }
}

module.exports = new SamplesCatalog();
