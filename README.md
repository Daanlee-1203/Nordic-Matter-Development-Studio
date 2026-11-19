# Nordic Matter Development Studio (nRF5340 DK & Multi-Board Studio)

**Nordic Semiconductor Matter 공식 개발보드 6종**과 **nRF Connect SDK(NCS) 공식 Matter 12종 샘플**, 그리고 최신 **Matter 1.6 표준**을 완벽하게 지원하는 브라우저 기반의 올인원 임베디드 IoT 개발·모니터링·감사 워크벤치입니다.

---

## 🌟 주요 핵심 기능

### 1. 포토리얼 하드웨어 디지털 트윈 (Photorealistic Digital Twin)
- **노르딕 공식 개발보드 6종 실시간 렌더링**:
  - `nRF5340 DK` (듀얼코어 플래그십 M33)
  - `nRF54LM20 DK` & `nRF54L15 DK` (차세대 초저전력 22nm)
  - `nRF52840 DK` (Thread / BLE 표준)
  - `nRF7002 DK` (Matter over Wi-Fi 6 이중 대역)
  - `Thingy:53` (온보드 8대 센서 멀티센서 플랫폼)
- **인터랙티브 촉각 제어**: 보드 상의 LED 1~4 및 Button SW1~SW4를 마우스로 직접 클릭하여 토글하고 물리 하드웨어와 실시간 동기화.
- **물리 하드웨어 자동 감지 & 안전 메커니즘**:
  - SEGGER J-Link 디버거 연결 상태(`jlinkConnected`) 및 VDD 전압 실시간 모니터링
  - 하드웨어 미연결 시 실제 보드 플래시를 원천 차단하고 가상 에뮬레이터 모드로 안내

### 2. NCS 공식 Matter 12대 샘플 라이브러리 및 동적 컨트롤러
- 공식 NCS 경로(`nrf/samples/matter/`)의 12대 전체 애플리케이션 탑재:
  1. `light_bulb`: 조명 전구 (On/Off, 레벨 디밍, CCT 색온도, RGB 피커)
  2. `light_switch`: 디머 스위치 (단일/더블클릭/롱프레스 이벤트)
  3. `lock`: 스마트 도어락 (볼트 잠금/해제, PIN 키패드 인증 시뮬레이션, 30초 자동 재잠금)
  4. `thermostat`: HVAC 공조기 (대형 온도계, ±0.5°C 조절, 냉난방/에코 모드)
  5. `window_covering`: 전동 블라인드 (슬랫 리프트 0~100%, 틸트 0~90% 애니메이션)
  6. `contact_sensor`: 도어/창문 개폐 감지 (ICD 저전력 Sleepy End Device)
  7. `smoke_co_alarm`: 화재/일산화탄소 경보기 (연기/CO ppm 게이지, 비상 알람 테스트)
  8. `weather_station`: 기상 관측소 (온도, 습도, 기압, AQI 공기질 4-in-1 게이지)
  9. `all_clusters_app`: CSA Matter Test Harness 적합성 검증기
  10. `bridge`: 레거시 Zigbee/BLE-Mesh 이종 네트워크 브릿지
  11. `pump`: 유체 펌프 및 제어기
  12. `template`: 커스텀 클러스터(0xFFF1) 베이스라인 템플릿
- **동적 디바이스 컨트롤러**: 대시보드에서 선택된 펌웨어에 따라 UI가 즉각 변신하여 조작 가능.

### 3. 실시간 명령 데이터 리니지 (Data Lineage Pipeline)
- UI 조작 Intent(S1) ➔ 드라이버 합성(S2) ➔ SWD 버스 전송(S3) ➔ M33 코어 디코딩(S4) ➔ GPIO 레지스터 쓰기(S5) ➔ 물리 LED 점등(S6)까지 **6단계 마이크로 지연시간(총 12ms) 실시간 시각화**.

### 4. Matter 1.6 표준 완벽 지원 (Part 4)
- **13.56MHz NFC-Only 커미셔닝**: 양방향 NDEF 레코드 교환 (전원 무인가 상태 지원)
- **Joint Fabric**: 중앙 데이터스토어 공유로 기기당 패브릭 테이블 슬롯 절감 (최대 5개 생태계 동시 연결)
- **Context-Driven Thermostat Suggestions**: 에너지 피크 절감 및 동적 온도 제안
- **Product Security 1.1**: 분할 CRL(Certificate Revocation List) 청크 업데이트 검증

### 5. 노르딕 DK 하드웨어 & 4대 개발도구 마스터 가이드
- `install_ncs.html` 기반 NCS SDK 3대 설치법 (VS Code GUI, Desktop Toolchain Manager, West 수동 CLI)
- J2(J-Link OB) vs J3(nRF USB) 포트 구분, SW8 전원, SW9 절체, P22 전류 측정 헤더 가이드
- `nrfjprog`, `nrfutil`, `west`, `SEGGER J-Link & RTT` 실무 CLI 명령어 치트시트 및 1클릭 복사
- APPROTECT 락 해제, Flash Overflow 최적화 등 실전 트러블슈팅

### 6. 개발자 접속 세션 추적 & 보안 감사 로그 (Audit Trail)
- 무장벽 자동 감지: 로그인 없이도 클라이언트 IP, OS, 브라우저, 세션 ID 자동 추적
- 상단바 1클릭 개발자 프로필 전환 (`임베디드 수석 엔지니어`, `QA 엔지니어`, `보안 감사관`, `게스트`)
- 시간대별 보안 감사 로그 테이블 및 CSV 내보내기

---

## 🚀 빠른 시작 (Quick Start)

### 요구 사양
- **Node.js:** v18 이상 권장 (순수 표준 내장 라이브러리 기반으로 추가 `npm install` 불필요)
- **브라우저:** Chrome, Edge, Safari, Firefox 등 최신 웹 브라우저

### 실행 방법
```bash
# 1. 저장소 클론
git clone https://github.com/<your-username>/Nordic-Matter-Development-Studio.git
cd Nordic-Matter-Development-Studio

# 2. 실행
./start.sh
# 또는
node server.js
```
브라우저에서 **`http://localhost:3000`** 으로 접속합니다.

---

## 🛠️ 기술 스택
- **Backend:** Node.js (Vanilla HTTP, SSE Stream, EventEmitter, J-Link Adapter)
- **Frontend:** HTML5, CSS3 (16:9 와이드 반응형, Glassmorphism), Vanilla JavaScript ES6+
- **Hardware Interface:** SEGGER J-Link (`/usr/local/bin/JLinkExe`), nrfjprog, SWD, USB CDC ACM
- **Standard Protocol:** Matter 1.6, Zephyr RTOS, OpenThread, BLE
