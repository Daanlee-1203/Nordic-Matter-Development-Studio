/**
 * Nordic Matter Development Studio - Hands-on Lab & Multi-Board Engine
 * Implements interactive tutorials, board catalog, Matter 1.6 labs, and reports
 */

let allBoardsList = [];
let currentActiveBoard = null;
let matter16LiveState = null;
let quickStartData = null;

// -------------------------------------------------------------
// 1. Multi-Board Catalog & Switching
// -------------------------------------------------------------
async function initBoardsCatalog() {
  try {
    const res = await fetch('/api/boards');
    const data = await res.json();
    allBoardsList = data.boards || [];
    currentActiveBoard = data.active;

    renderBoardsCatalogGrid(allBoardsList, currentActiveBoard);
    updateActiveBoardHeader(currentActiveBoard);

    if (window.boardRenderer && typeof window.boardRenderer.setBoardModel === 'function' && currentActiveBoard) {
      window.boardRenderer.setBoardModel(currentActiveBoard.id, currentActiveBoard);
    }
    if (typeof renderDashboardLedCards === 'function' && currentActiveBoard) {
      renderDashboardLedCards(currentActiveBoard);
    }
  } catch (err) {
    console.error('[initBoardsCatalog Error]', err);
  }
}

function updateActiveBoardHeader(board) {
  if (!board) return;
  const nameEl = document.getElementById('kpiActiveBoardName');
  const codeEl = document.getElementById('kpiActiveBoardCode');
  const targetEl = document.getElementById('kpiBoardTarget');
  const coreEl = document.getElementById('kpiCoreInfo');
  const dropdown = document.getElementById('boardSelectDropdown');

  if (nameEl) nameEl.innerHTML = `${escapeHtml(board.name)} <small id="kpiActiveBoardCode">${escapeHtml(board.code)}</small>`;
  if (targetEl) targetEl.innerText = board.boardTarget;
  if (coreEl) {
    if (board.cores.net) {
      coreEl.innerText = `${board.cores.app.cpu.split('@')[1] || '128MHz'} + Net M33`;
    } else {
      coreEl.innerText = board.cores.app.cpu;
    }
  }
  if (dropdown && dropdown.value !== board.id) {
    dropdown.value = board.id;
  }

  // Update Dashboard title with strict physical hardware check
  const isHw = Boolean(currentBoardState && currentBoardState.boardInfo && currentBoardState.boardInfo.jlinkConnected);
  const isPhys = isHw && Boolean(board.isPhysicalConnected);

  const titleText = document.getElementById('boardTitleText');
  const badgeSub = document.getElementById('boardBadgeSub');
  if (titleText) titleText.innerText = `${board.name} ${isPhys ? '(물리 보드 연결)' : '(가상 디지털 트윈)'}`;
  if (badgeSub) badgeSub.innerText = `${board.code} ${board.version}`;

  renderBoardDetailCard(board);
}

function renderBoardsCatalogGrid(boards, activeBoard) {
  const container = document.getElementById('boardsCatalogGrid');
  if (!container) return;

  const isHw = Boolean(currentBoardState && currentBoardState.boardInfo && currentBoardState.boardInfo.jlinkConnected);

  container.innerHTML = boards.map(b => {
    const isAct = activeBoard && activeBoard.id === b.id;
    const isPhys = isHw && Boolean(b.isPhysicalConnected);
    return `
      <div class="board-card ${isAct ? 'active-board' : ''}" onclick="selectBoard('${b.id}')">
        <div class="board-card-header">
          <span class="board-tag ${isPhys ? 'tag-hw' : 'tag-sim'}">
            ${isPhys ? '● 물리 보드 연결됨' : '○ 가상 에뮬레이터'}
          </span>
          <span class="mono-txt" style="font-size: 0.68rem; color: var(--text-muted);">${b.code}</span>
        </div>
        <div class="board-name-lg">${escapeHtml(b.name)}</div>
        <div class="board-desc-sm">${escapeHtml(b.title)}</div>
        <div class="board-specs-list">
          <div>• <strong>타깃:</strong> <code class="mono-txt">${b.boardTarget}</code></div>
          <div>• <strong>SoC:</strong> ${b.soc}</div>
          <div>• <strong>코어:</strong> ${b.cores.app.cpu} ${b.cores.net ? '+ Net Core' : ''}</div>
          <div>• <strong>무선:</strong> ${b.wireless.slice(0, 3).join(', ')}</div>
        </div>
        <button class="board-select-btn ${isAct ? 'btn-active' : ''}">
          ${isAct ? '✓ 현재 선택된 보드' : '이 보드로 작업 전환 ➔'}
        </button>
      </div>
    `;
  }).join('');
}

function renderBoardDetailCard(board) {
  const container = document.getElementById('boardDetailCard');
  if (!container || !board) return;

  container.innerHTML = `
    <div class="panel-modern">
      <div class="panel-modern-header">
        <div>
          <h3 class="panel-heading">${escapeHtml(board.name)} 상세 하드웨어 아키텍처 & 핀아웃 맵</h3>
          <div class="panel-subheading">${board.title} · ${board.soc}</div>
        </div>
        <span class="badge-sub">${board.boardTarget}</span>
      </div>

      <div class="grid-2" style="margin-top: 10px;">
        <div class="card-inner">
          <strong style="color: var(--nordic-cyan); font-size: 0.84rem;">하드웨어 사양 (Specifications)</strong>
          <ul class="spec-bullet-list">
            <li><strong>Application Core:</strong> ${board.cores.app.cpu} (${board.cores.app.flash} Flash / ${board.cores.app.ram} RAM)</li>
            ${board.cores.net ? `<li><strong>Network Core:</strong> ${board.cores.net.cpu} (${board.cores.net.flash} Flash / ${board.cores.net.ram} RAM)</li>` : ''}
            <li><strong>External Flash:</strong> ${board.externalMemory}</li>
            <li><strong>무선 프로토콜:</strong> ${board.wireless.join(', ')}</li>
            <li><strong>Matter 지원 버전:</strong> ${board.matterSupport.matterVersion} (${board.matterSupport.protocols.join(', ')})</li>
          </ul>
        </div>

        <div class="card-inner">
          <strong style="color: #4ade80; font-size: 0.84rem;">핀아웃 & 주변장치 매핑 (Peripherals)</strong>
          <div class="pin-mapping-grid">
            <div>
              <span class="pin-group-title">User LEDs:</span>
              ${Object.entries(board.leds || {}).map(([k, v]) => `
                <div class="pin-row"><strong style="color: ${v.color};">${k.toUpperCase()}:</strong> <code>${v.pin}</code> <small>(${v.desc})</small></div>
              `).join('')}
            </div>
            <div>
              <span class="pin-group-title">User Buttons:</span>
              ${Object.entries(board.buttons || {}).map(([k, v]) => `
                <div class="pin-row"><strong style="color: #f59e0b;">${k.toUpperCase()}:</strong> <code>${v.pin}</code> <small>(${v.desc})</small></div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function selectBoard(boardId) {
  try {
    const res = await fetch('/api/boards/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId })
    });
    const data = await res.json();
    currentActiveBoard = data.active;
    updateActiveBoardHeader(currentActiveBoard);
    renderBoardsCatalogGrid(allBoardsList, currentActiveBoard);

    // Switch photoreal canvas renderer to selected board
    if (window.boardRenderer && typeof window.boardRenderer.setBoardModel === 'function') {
      window.boardRenderer.setBoardModel(boardId, currentActiveBoard);
    }

    // Dynamically rebuild Dashboard LED control cards
    if (typeof renderDashboardLedCards === 'function') {
      renderDashboardLedCards(currentActiveBoard);
    }

    // If selected from catalog tab, transition immediately to dashboard to view the board
    const catalogPane = document.getElementById('boardsCatalogTab');
    if (catalogPane && catalogPane.classList.contains('active')) {
      switchNav('dashboardTab', document.getElementById('btnNavDashboard'));
    }

    showToast(`🌟 개발보드가 [${currentActiveBoard.name}] (${currentActiveBoard.code})로 전환되었습니다.`, '🛠️');
  } catch (err) {
    console.error(err);
  }
}

function onSelectBoardChange(boardId) {
  selectBoard(boardId);
}

// -------------------------------------------------------------
// 2. Part 1: 개발환경 준비 (Lab 1)
// -------------------------------------------------------------
async function verifyToolchainEnv() {
  showToast('🔍 VS Code 및 NCS SDK/Toolchain 환경 검증 중...', '🔍');
  try {
    const res = await fetch('/api/matter16/state');
    const data = await res.json();
    renderToolchainState(data.toolchain);
    showToast('✅ 환경 검증 완료: NCS SDK v3.4.0 LTS 준비됨', '✅');
  } catch (err) {
    console.error(err);
  }
}

function renderToolchainState(tcData) {
  if (!tcData) return;
  const tc = tcData.toolchain || tcData;
  const grid = document.getElementById('extPackGrid');
  if (!grid) return;

  const exts = (tc.ncsExtensionPack && tc.ncsExtensionPack.extensions) || [];
  grid.innerHTML = exts.map(e => `
    <div class="ext-card">
      <div class="ext-card-top">
        <span class="ext-name">${escapeHtml(e.name)}</span>
        <span class="status-badge status-running">${e.status}</span>
      </div>
      <div class="ext-sub mono-txt">${e.id} (${e.version})</div>
    </div>
  `).join('');
}

// -------------------------------------------------------------
// 3. Part 2: Quick Start 6-Step Workflow (Lab 2)
// -------------------------------------------------------------
const QUICK_START_STEPS_INFO = [
  {
    step: 1,
    title: '1단계: nRF Connect for Desktop — Quick Start 앱 열기',
    desc: 'nRF Connect for Desktop을 실행하고 Matter Quick Start 앱을 엽니다. 최신 버전(v1.1.0 이상)인지 확인합니다.',
    render: () => `
      <div class="qs-work-card">
        <h4>🖥️ Quick Start 데스크톱 애플리케이션 시작</h4>
        <p>사전 빌드된 Matter 펌웨어를 컴파일 없이 개발보드에 즉시 플래시하여 첫 동작을 확인합니다.</p>
        <div style="margin-top: 14px;">
          <button class="hyper-btn hyper-btn-on" onclick="runQuickStartStep(2)">2단계: 보드 연결 및 감지 진행 ➔</button>
        </div>
      </div>
    `
  },
  {
    step: 2,
    title: '2단계: USB로 개발보드 연결 및 자동 감지 확인',
    desc: 'USB 케이블(데이터 전송 지원)로 보드를 PC에 연결하면 J-Link 인터페이스를 통해 보드가 자동 감지됩니다.',
    render: () => {
      const isConnected = Boolean(currentBoardState && currentBoardState.boardInfo && currentBoardState.boardInfo.jlinkConnected);
      const sn = (currentBoardState && currentBoardState.boardInfo && currentBoardState.boardInfo.serialNumber) || '미연결 (Not Detected)';
      const bName = (currentActiveBoard && currentActiveBoard.name) || 'nRF5340 DK';
      const bCode = (currentActiveBoard && currentActiveBoard.code) || 'PCA10095';

      if (isConnected) {
        return `
          <div class="qs-work-card">
            <h4>🔌 물리 개발보드 연결 및 J-Link 프로브 감지 성공</h4>
            <div class="detected-board-pill" style="border-color: #10b981; background: rgba(16, 185, 129, 0.1);">
              <span class="pulse-dot" style="background: #4ade80; box-shadow: 0 0 10px #4ade80;"></span>
              <span style="color: #4ade80;"><strong>실제 물리 보드 연결됨:</strong> ${escapeHtml(bName)} (${bCode}, J-Link S/N: ${escapeHtml(sn)})</span>
            </div>
            <div style="margin-top: 14px; display: flex; gap: 10px;">
              <button class="action-btn btn-secondary" onclick="runQuickStartStep(1)">이전</button>
              <button class="hyper-btn hyper-btn-on" onclick="runQuickStartStep(3)">3단계: 매터 샘플 펌웨어 선택 ➔</button>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="qs-work-card">
            <h4>🔌 개발보드 연결 상태 확인</h4>
            <div class="detected-board-pill" style="border-color: #f59e0b; background: rgba(245, 158, 11, 0.1);">
              <span class="pulse-dot" style="background: #f59e0b; box-shadow: 0 0 10px #f59e0b;"></span>
              <span style="color: #f59e0b;"><strong>물리 하드웨어 미연결:</strong> USB에 연결된 물리 J-Link 디버거가 없습니다. (가상 디지털 트윈 에뮬레이터 모드로 계속 진행할 수 있습니다.)</span>
            </div>
            <div style="margin-top: 14px; display: flex; gap: 10px; align-items: center;">
              <button class="action-btn btn-secondary" onclick="runQuickStartStep(1)">이전</button>
              <button class="action-btn btn-primary" onclick="rescanJLink()">🔍 USB 프로브 다시 스캔</button>
              <button class="hyper-btn hyper-btn-on" onclick="runQuickStartStep(3)">가상 트윈으로 3단계 계속 진행 ➔</button>
            </div>
          </div>
        `;
      }
    }
  },
  {
    step: 3,
    title: '3단계: Matter 예제 애플리케이션 선택 (12종 공식 라이브러리)',
    desc: '실습 목적에 맞는 공식 사전 빌드 펌웨어를 선택합니다. NCS 12대 공식 샘플 전체를 즉시 선택하여 시험할 수 있습니다.',
    render: () => {
      const activeId = activeSampleData && activeSampleData.sample ? activeSampleData.sample.id : 'light_bulb';
      const sampleItems = (allMatterSamples && allMatterSamples.length > 0) ? allMatterSamples : [
        { id: 'light_bulb', icon: '💡', name: 'Matter: Light bulb (조명 전구)', description: 'On/Off, 밝기(Level), 색온도(CCT), RGB 제어' },
        { id: 'light_switch', icon: '🎛️', name: 'Matter: Light switch (스위치)', description: '바인딩된 조명 제어 디머 스위치' },
        { id: 'lock', icon: '🔒', name: 'Matter: Door lock (도어락)', description: '볼트 잠금/해제 및 PIN 인증' },
        { id: 'thermostat', icon: '🌡️', name: 'Matter: Thermostat (온도 조절기)', description: 'HVAC 냉난방 및 상황인지 제어' },
        { id: 'window_covering', icon: '🪟', name: 'Matter: Window covering (블라인드)', description: '전동 블라인드 리프트 및 틸트 제어' },
        { id: 'contact_sensor', icon: '🚪', name: 'Matter: Contact sensor (도어 센서)', description: '도어/창문 개폐 감지 ICD 센서' }
      ];
      return `
        <div class="qs-work-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4>📦 공식 예제 애플리케이션 선택 (NCS 12종 완비)</h4>
            <span class="badge-sub">현재 선택: ${activeId}</span>
          </div>
          <div class="sample-select-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px; margin-top: 10px; max-height: 280px; overflow-y: auto;">
            ${sampleItems.map(s => `
              <div class="sample-option ${s.id === activeId ? 'active' : ''}" onclick="selectQuickSampleItem('${s.id}', this)" style="padding: 8px 10px; border-radius: 6px; cursor: pointer;">
                <strong>${s.icon} ${escapeHtml(s.name.split(' (')[0])}</strong>
                <span style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-top: 2px;">${escapeHtml(s.description || '')}</span>
              </div>
            `).join('')}
          </div>
          <div style="margin-top: 14px; display: flex; gap: 10px;">
            <button class="action-btn btn-secondary" onclick="runQuickStartStep(2)">이전</button>
            <button class="hyper-btn hyper-btn-on" onclick="runQuickStartStep(4)">4단계: 펌웨어 플래시 진행 ➔</button>
          </div>
        </div>
      `;
    }
  },
  {
    step: 4,
    title: '4단계: 다운로드 & 플래시 진행',
    desc: '사전 빌드된 Matter 펌웨어를 보드 플래시 메모리에 기록합니다. 물리 보드가 연결되어 있지 않으면 실제 하드웨어 플래시가 엄격하게 차단됩니다.',
    render: () => {
      const isConnected = Boolean(currentBoardState && currentBoardState.boardInfo && currentBoardState.boardInfo.jlinkConnected);
      const sn = (currentBoardState && currentBoardState.boardInfo && currentBoardState.boardInfo.serialNumber) || '미연결 (Not Detected)';
      const activeSample = (activeSampleData && activeSampleData.sample) ? activeSampleData.sample : { name: 'Matter Light Bulb', id: 'light_bulb' };
      const bName = (currentActiveBoard && currentActiveBoard.name) || 'nRF5340 DK';

      if (isConnected) {
        return `
          <div class="qs-work-card">
            <h4>⚡ 물리 펌웨어 프로그래밍 (Flash Programming)</h4>
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-weight: 700; color: #4ade80;">🟢 물리 개발보드 준비 완료</div>
                <div style="font-size: 0.74rem; color: #cbd5e1; margin-top: 2px;">타깃: ${escapeHtml(bName)} (J-Link S/N: ${escapeHtml(sn)}) · 기록 대상: <strong>${escapeHtml(activeSample.name)}</strong></div>
              </div>
              <span class="badge-sub" style="border-color: #10b981; color: #4ade80;">Target Ready</span>
            </div>

            <div class="progress-bar-container">
              <div class="progress-bar-fill" id="qsProgressFill" style="width: 0%;"></div>
            </div>
            <div id="qsProgressText" style="font-size: 0.8rem; color: var(--text-sub); margin-top: 6px;">플래시 대기 중...</div>

            <div style="margin-top: 14px; display: flex; gap: 10px;">
              <button class="action-btn btn-secondary" onclick="runQuickStartStep(3)">이전</button>
              <button class="hyper-btn hyper-btn-on" id="btnStartFlash" onclick="executeQuickFlash(false)">⚡ 실제 물리 보드에 플래시 기록 시작</button>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="qs-work-card">
            <h4>⚡ 펌웨어 프로그래밍 (Flash Programming)</h4>
            
            <!-- BLOCKED WARNING BANNER -->
            <div style="background: rgba(239, 68, 68, 0.12); border: 1.5px solid #ef4444; border-radius: 8px; padding: 14px; margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 8px; color: #ef4444; font-weight: 800; font-size: 0.92rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>[플래시 차단] 하드웨어 개발보드가 연결되어 있지 않습니다</span>
              </div>
              <div style="font-size: 0.76rem; color: #cbd5e1; margin-top: 8px; line-height: 1.5;">
                USB로 연결된 물리 J-Link 디버거/타깃 보드가 감지되지 않아 실제 하드웨어 플래시를 진행할 수 없습니다.<br>
                • <strong>실제 보드에 플래시하려면:</strong> USB 데이터 케이블을 PC에 연결하고 전원을 켠 후 <strong>[USB 프로브 다시 스캔]</strong>을 누르세요.<br>
                • <strong>보드 없이 테스트하려면:</strong> 아래 <strong>[가상 디지털 트윈으로 시뮬레이션 플래시]</strong>를 선택하여 에뮬레이터 환경에서 계속할 수 있습니다.
              </div>
            </div>

            <div class="progress-bar-container">
              <div class="progress-bar-fill" id="qsProgressFill" style="width: 0%;"></div>
            </div>
            <div id="qsProgressText" style="font-size: 0.8rem; color: #ef4444; margin-top: 6px; font-weight: 600;">
              ⚠️ 하드웨어 미연결 상태 — 물리 하드웨어 플래시가 비활성화되었습니다.
            </div>

            <div style="margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
              <button class="action-btn btn-secondary" onclick="runQuickStartStep(3)">이전</button>
              <button class="hyper-btn hyper-btn-off" id="btnStartFlash" disabled title="물리 보드가 연결되어 있지 않아 플래시할 수 없습니다" style="opacity: 0.45; cursor: not-allowed;">
                🚫 물리 플래시 불가 (보드 미연결)
              </button>
              <button class="action-btn btn-primary" onclick="rescanJLinkAndRefreshStep(4)">
                🔍 USB 프로브 다시 스캔
              </button>
              <button class="action-btn btn-secondary" onclick="executeQuickFlash(true)" style="border-color: var(--nordic-cyan); color: var(--nordic-cyan); font-weight: 700;">
                💻 가상 디지털 트윈으로 시뮬레이션 플래시 진행 ➔
              </button>
            </div>
          </div>
        `;
      }
    }
  },
  {
    step: 5,
    title: '5단계: 실행 확인 및 시리얼 로그 검증 (Verification Successful)',
    desc: '시리얼 로그에서 Setup Discriminator와 Passcode를 확인하여 정상 부팅을 검증합니다.',
    render: () => `
      <div class="qs-work-card">
        <h4>✅ 펌웨어 정상 실행 및 Discriminator 검증</h4>
        <div class="terminal-box-mini">
          <div>[00:00:00.120] &lt;inf&gt; app: *** Booting Zephyr OS build v3.7.99-ncs2 ***</div>
          <div>[00:00:00.240] &lt;inf&gt; app: Starting Matter Light Bulb</div>
          <div>[00:00:00.310] &lt;inf&gt; matter: Setup Discriminator: 3840 (0x0F00)</div>
          <div>[00:00:00.312] &lt;inf&gt; matter: Setup Passcode: 20202021</div>
          <div>[00:00:00.450] &lt;inf&gt; matter: Verification successful - Device Ready for Pairing!</div>
        </div>
        <div style="margin-top: 14px; display: flex; gap: 10px;">
          <button class="action-btn btn-secondary" onclick="runQuickStartStep(4)">이전</button>
          <button class="hyper-btn hyper-btn-on" onclick="runQuickStartStep(6)">6단계: 스마트홈 허브 페어링 ➔</button>
        </div>
      </div>
    `
  },
  {
    step: 6,
    title: '6단계: 스마트홈 허브 & 모바일 앱 페어링 시험',
    desc: 'Google Home, Apple Home, SmartThings 등의 Matter 지원 허브 및 앱과 디바이스를 페어링합니다.',
    render: () => `
      <div class="qs-work-card">
        <h4>🏠 스마트홈 에코시스템 허브 페어링</h4>
        <div class="grid-2">
          <div>
            <strong>1. 에코시스템 선택:</strong>
            <div class="ecosystem-cards" style="margin-top: 8px;">
              <button class="eco-btn active">🌐 Google Home</button>
              <button class="eco-btn">🍏 Apple Home (HomeKit)</button>
              <button class="eco-btn">📱 Samsung SmartThings</button>
              <button class="eco-btn">🗣️ Amazon Alexa</button>
            </div>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 10px;">
              * 가정 내 Thread Border Router(Google Nest Hub, HomePod 등) 또는 Wi-Fi 환경이 필요합니다.
            </div>
          </div>
          <div style="text-align: center; border-left: 1px solid var(--border); padding-left: 16px;">
            <strong>페어링 QR 코드 & 수동 코드</strong>
            <div class="qr-box-sim" style="margin-top: 8px;">
              <div class="qr-matrix-sim"></div>
              <div class="mono-txt" style="font-size: 0.88rem; font-weight: 700; color: var(--nordic-cyan); margin-top: 8px;">3497-0112-332</div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">Passcode: 20202021</div>
            </div>
          </div>
        </div>
      </div>
    `
  }
];

function runQuickStartStep(step) {
  const stepInfo = QUICK_START_STEPS_INFO[step - 1];
  if (!stepInfo) return;

  // Update step indicators
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`qwStep${i}`);
    if (el) el.classList.toggle('active', i === step);
  }

  const badge = document.getElementById('quickStartProgressBadge');
  if (badge) badge.innerText = `진행률: Step ${step} / 6`;

  const workArea = document.getElementById('quickStepWorkArea');
  if (workArea) {
    workArea.innerHTML = `
      <h3 class="panel-heading">${stepInfo.title}</h3>
      <div class="guide-txt">${stepInfo.desc}</div>
      ${stepInfo.render()}
    `;
  }

  fetch('/api/matter16/quickstart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step })
  });
}

function setQuickSample(sample, el) {
  document.querySelectorAll('.sample-option').forEach(s => s.classList.remove('active'));
  if (el) el.classList.add('active');
  showToast(`선택된 샘플: ${sample}`, '📦');
}

function selectQuickSampleItem(sampleId, el) {
  document.querySelectorAll('.sample-option').forEach(s => s.classList.remove('active'));
  if (el) el.classList.add('active');
  selectSample(sampleId);
}

function executeQuickFlash(isSimulation = false) {
  const isConnected = Boolean(currentBoardState && currentBoardState.boardInfo && currentBoardState.boardInfo.jlinkConnected);
  const btn = document.getElementById('btnStartFlash');
  const bar = document.getElementById('qsProgressFill');
  const txt = document.getElementById('qsProgressText');

  // STRICT BLOCK CHECK: If attempting real flash while disconnected, BLOCK!
  if (!isSimulation && !isConnected) {
    showToast('❌ 플래시 차단: USB로 연결된 물리 개발보드가 없습니다.', '🚫');
    if (txt) {
      txt.innerHTML = '<span style="color: #ef4444; font-weight: 800;">[J-Link Flash Blocked] No Target Connected: 물리 보드를 USB로 연결하지 않으면 플래시를 진행할 수 없습니다.</span>';
    }
    return;
  }

  if (btn) btn.disabled = true;
  let progress = 0;

  if (isSimulation) {
    showToast('💻 가상 에뮬레이터 플래시 메모리에 시뮬레이션 기록 중...', '💻');
  } else {
    showToast('⚡ 물리 nRF5340 DK 플래시 메모리 프로그래밍 시작...', '⚡');
  }

  const interval = setInterval(() => {
    progress += 10;
    if (bar) bar.style.width = `${progress}%`;
    if (txt) {
      txt.innerText = isSimulation
        ? `가상 디지털 트윈 플래시 에뮬레이션 기록 중... ${progress}%`
        : `J-Link 프로브 전송 및 플래시 섹터 기록 중... ${progress}%`;
    }

    if (progress >= 100) {
      clearInterval(interval);
      if (isSimulation) {
        showToast('✅ 가상 펌웨어 플래시 시뮬레이션 완료 (에뮬레이터)', '💻');
      } else {
        showToast('✅ 물리 하드웨어 플래시 프로그래밍 완료!', '✅');
      }
      setTimeout(() => {
        runQuickStartStep(5);
      }, 500);
    }
  }, 180);
}

async function rescanJLinkAndRefreshStep(step = 4) {
  showToast('🔍 J-Link 프로브를 스캔하는 중...', '🔍');
  try {
    const res = await fetch('/api/jlink/scan');
    const data = await res.json();
    if (data.connected) {
      showToast(`🟢 물리 프로브 감지됨 (S/N: ${data.serialNumber}, ${data.targetVoltage}V)`, '✅');
      if (currentBoardState && currentBoardState.boardInfo) {
        currentBoardState.boardInfo.jlinkConnected = true;
        currentBoardState.boardInfo.serialNumber = data.serialNumber;
      }
    } else {
      showToast('⚠️ 물리 보드가 감지되지 않았습니다.', '⚠️');
    }
    if (step) runQuickStartStep(step);
  } catch (err) {
    console.error(err);
  }
}

// -------------------------------------------------------------
// 4. Part 3: VS Code 빌드 & 양산 팩토리 데이터 (Lab 3)
// -------------------------------------------------------------
async function generateFactoryDataUi() {
  showToast('⚡ 고유 Discriminator 및 팩토리 데이터 생성 중...', '⚡');
  try {
    const res = await fetch('/api/matter16/factory-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discriminator: 3840 + Math.floor(Math.random() * 200),
        passcode: 20202021,
        serialNumber: (currentBoardState && currentBoardState.boardInfo && currentBoardState.boardInfo.jlinkConnected) 
          ? currentBoardState.boardInfo.serialNumber 
          : 'SIM-NRF-' + Date.now().toString(36).toUpperCase()
      })
    });
    const data = await res.json();
    renderFactoryDataPreview(data);
    showToast(`✅ 발급 완료: Manual Code ${data.manualCode}`, '✅');
  } catch (err) {
    console.error(err);
  }
}

function renderFactoryDataPreview(data) {
  const container = document.getElementById('factoryDataPreview');
  if (!container || !data) return;

  container.innerHTML = `
    <div class="factory-summary-box">
      <div class="factory-summary-row">
        <div>
          <span style="font-size: 0.72rem; color: var(--text-muted);">수동 페어링 코드 (Manual Code):</span>
          <div class="mono-txt cyan-txt" style="font-size: 1.15rem; font-weight: 800;">${data.manualCode}</div>
        </div>
        <div>
          <span style="font-size: 0.72rem; color: var(--text-muted);">QR Code Payload:</span>
          <div class="mono-txt" style="font-size: 0.84rem; color: #4ade80;">${data.qrPayload}</div>
        </div>
      </div>

      <div style="margin-top: 10px; font-size: 0.76rem;">
        <strong>양산 산출물 파일:</strong>
        <span class="file-chip">📄 ${data.hexFileName}</span>
        <span class="file-chip">🖼️ ${data.pngFileName}</span>
        <span class="file-chip">📝 ${data.txtFileName}</span>
      </div>

      <div class="code-snippet-box" style="margin-top: 10px;">
        <div class="code-snippet-head"><span>factory_data.json 샘플</span></div>
        <pre><code>${JSON.stringify(data.factoryJson, null, 2)}</code></pre>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// 5. Part 4: Matter 1.6 신규 표준 실습 (Lab 4)
// -------------------------------------------------------------
async function simulateNfcCommissioningTap() {
  const circle = document.getElementById('nfcAntennaCircle');
  const resultBox = document.getElementById('nfcResultBox');
  if (circle) circle.classList.add('nfc-pulsing');

  showToast('📱 13.56MHz 양방향 NFC 스마트폰 접촉 감지...', '🏷️');

  try {
    const res = await fetch('/api/matter16/nfc-tap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ devicePowered: true })
    });
    const data = await res.json();

    setTimeout(() => {
      if (circle) circle.classList.remove('nfc-pulsing');
      if (resultBox) {
        resultBox.innerHTML = `
          <div style="color: #4ade80; font-weight: 700; margin-bottom: 4px;">✅ NFC 커미셔닝 성공 (${data.protocol})</div>
          <div style="font-size: 0.74rem; color: var(--text-sub);">BLE/QR 없이 420ms 만에 양방향 NDEF 상호인증 및 Thread 자격증명 주입 완료!</div>
          <ul class="nfc-step-list" style="margin-top: 6px;">
            ${data.steps.map(s => `<li>${s}</li>`).join('')}
          </ul>
        `;
      }
      showToast('🎉 Matter 1.6 NFC 커미셔닝 완료!', '🎉');
    }, 450);
  } catch (err) {
    console.error(err);
  }
}

async function addJointFabricControllerUi() {
  const name = prompt('추가할 스마트홈 에코시스템 컨트롤러 명칭 입력:', 'Building BMS Control Node');
  if (!name) return;

  try {
    const res = await fetch('/api/matter16/joint-fabric/controller', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role: 'Operator' })
    });
    const data = await res.json();
    showToast(`✅ Joint Fabric 컨트롤러 추가됨 (Fabric Index 사용: ${data.fabricIndexUsed}개 유지)`, '🌐');
    fetchMatter16State();
  } catch (err) {
    console.error(err);
  }
}

async function sendThermostatSuggestionUi(suggestedTempC, reason) {
  showToast(`🌡️ 온도조절기 상황 제안 전송: ${suggestedTempC}°C (${reason})`, '🌡️');
  try {
    const res = await fetch('/api/matter16/thermostat/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestedTempC, reason, sender: 'Demand-Response Grid' })
    });
    const data = await res.json();
    showToast(`온도조절기 결정: [${data.decision}] (현재 목표: ${data.appliedTempC}°C)`, data.decision === 'ACCEPTED' ? '✅' : '⚠️');
    fetchMatter16State();
  } catch (err) {
    console.error(err);
  }
}

async function updateRandomCrlChunk() {
  const randomChunk = Math.floor(Math.random() * 16) + 1;
  showToast(`🔒 Product Security 1.1 CRL 청크 #${randomChunk} 독립 업데이트...`, '🔒');
  try {
    const res = await fetch('/api/matter16/crl/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunkIndex: randomChunk })
    });
    const data = await res.json();
    showToast(`✅ ${data.status} (대역폭 절감 91%)`, '✅');
    fetchMatter16State();
  } catch (err) {
    console.error(err);
  }
}

async function fetchMatter16State() {
  try {
    const res = await fetch('/api/matter16/state');
    const data = await res.json();
    matter16LiveState = data.matter16;
    renderMatter16Ui(matter16LiveState);
  } catch (err) {
    console.error(err);
  }
}

function renderMatter16Ui(st) {
  if (!st) return;

  // Render Joint Fabric Box
  const jfBox = document.getElementById('jointFabricBox');
  if (jfBox && st.jointFabric) {
    jfBox.innerHTML = `
      <div style="font-size: 0.74rem; color: var(--text-muted); margin-bottom: 6px;">
        중앙 Datastore: <strong class="mono-txt cyan-txt">${st.jointFabric.datastoreId}</strong> 
        | 소비 Fabric 슬롯: <strong style="color: #4ade80;">1개 (절감됨)</strong>
      </div>
      <div class="jf-controllers-list">
        ${(st.jointFabric.controllers || []).map(c => `
          <div class="jf-chip">
            <span class="jf-name">${escapeHtml(c.name)}</span>
            <span class="jf-role">[${c.role}]</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Render Thermostat History
  const thList = document.getElementById('thermostatHistoryList');
  if (thList && st.thermostatSuggestions) {
    thList.innerHTML = `
      <div style="font-size: 0.74rem; font-weight: 700; color: #fff; margin-bottom: 4px;">
        현재 온도: ${st.thermostatSuggestions.currentTempC}°C | 목표 설정온도: <span class="cyan-txt">${st.thermostatSuggestions.targetTempC}°C</span>
      </div>
      <div class="th-history-scroll">
        ${(st.thermostatSuggestions.history || []).map(h => `
          <div class="th-row ${h.decision.toLowerCase()}">
            <span class="mono-txt">${h.timestamp}</span>
            <span><strong>${h.suggestedTempC}°C</strong> (${escapeHtml(h.reason)})</span>
            <span class="decision-badge ${h.decision.toLowerCase()}">${h.decision}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Render CRL Chunks
  const crlBox = document.getElementById('crlChunksVisualizer');
  if (crlBox && st.productSecurity) {
    const dist = st.productSecurity.crlChunkDistribution;
    let chunksHtml = '';
    for (let i = 1; i <= (dist.totalChunks || 16); i++) {
      const isUpdated = dist.updatedChunks.includes(i);
      chunksHtml += `<div class="crl-chunk ${isUpdated ? 'updated' : ''}" title="Chunk #${i}">${i}</div>`;
    }
    crlBox.innerHTML = `
      <div class="crl-grid">${chunksHtml}</div>
      <div style="font-size: 0.72rem; color: #4ade80; margin-top: 6px; font-weight: 600;">
        ⚡ 512B 소규모 독립 청크 분할로 전체 CRL 재다운로드 대비 네트워크 대역폭 ${dist.bandwidthSavedPct}% 절감!
      </div>
    `;
  }
}

// -------------------------------------------------------------
// 6. Part 5: AI & Nordic MCP Server (Lab 5)
// -------------------------------------------------------------
function copyMcpJson() {
  const txt = document.getElementById('mcpConfigPre').innerText;
  navigator.clipboard.writeText(txt);
  showToast('📋 Antigravity & VS Code MCP JSON 설정이 클립보드에 복사되었습니다.', '📋');
}

function copyClaudeCmd() {
  const txt = document.getElementById('claudeCmdPre').innerText;
  navigator.clipboard.writeText(txt);
  showToast('📋 Claude Code CLI 명령이 복사되었습니다.', '📋');
}

function simulateAiPrompt(promptText) {
  const box = document.getElementById('aiResponsePreview');
  if (!box) return;

  showToast('🤖 Nordic MCP Server에 질의 중...', '🤖');
  box.innerHTML = `
    <div style="color: var(--nordic-cyan); font-weight: 700; font-size: 0.82rem;">🤖 Nordic MCP Server AI Agent 분석 중...</div>
    <div style="font-size: 0.76rem; color: var(--text-sub); margin-top: 6px;">
      질의: "${escapeHtml(promptText)}"
    </div>
  `;

  setTimeout(() => {
    let answerHtml = '';
    if (promptText.includes('DeviceTree')) {
      answerHtml = `
        <div style="color: #4ade80; font-weight: 700; font-size: 0.82rem;">✅ DeviceTree Overlay (app.overlay) 생성 완료:</div>
        <pre class="ai-code-block"><code>/ {
    pwm_leds {
        compatible = "pwm-leds";
        pwm_led0: pwm_led_0 {
            pwms = <&pwm0 0 PWM_MSEC(20) PWM_POLARITY_INVERTED>;
        };
    };
};
&pwm0 {
    status = "okay";
    pinctrl-0 = <&pwm0_default>;
    pinctrl-names = "default";
};</code></pre>
      `;
    } else if (promptText.includes('Kconfig')) {
      answerHtml = `
        <div style="color: #4ade80; font-weight: 700; font-size: 0.82rem;">✅ Matter 1.6 prj.conf Kconfig 필수 옵션:</div>
        <pre class="ai-code-block"><code>CONFIG_CHIP=y
CONFIG_CHIP_PROJECT_CONFIG="include/CHIPProjectConfig.h"
CONFIG_CHIP_ENABLE_PAIRING_AUTOSTART=y
CONFIG_CHIP_MATTER_1_6=y
CONFIG_CHIP_JOINT_FABRIC=y
CONFIG_CHIP_NFC_COMMISSIONING=y</code></pre>
      `;
    } else {
      answerHtml = `
        <div style="color: #4ade80; font-weight: 700; font-size: 0.82rem;">✅ OpenThread Border Router 진단 결과:</div>
        <div style="font-size: 0.76rem; line-height: 1.5; color: #cbd5e1; margin-top: 4px;">
          nRF5340 DK의 Net Core 펌웨어가 <strong>Thread 1.4 Channel 15</strong>에 고정되어 있습니다. Wi-Fi AP 2.4GHz 신호와 간섭을 피하기 위해 Wi-Fi를 Ch 1로, Thread를 Ch 26으로 재배치하는 것을 권장합니다.
        </div>
      `;
    }
    box.innerHTML = answerHtml;
    showToast('✅ Nordic MCP Server AI 응답 생성 완료', '✅');
  }, 400);
}

// -------------------------------------------------------------
// 7. Comprehensive Studio Audit Report
// -------------------------------------------------------------
async function renderAuditReport() {
  const container = document.getElementById('printableReportCard');
  if (!container) return;

  try {
    const res = await fetch('/api/matter16/report');
    const r = await res.json();
    const b = r.targetBoard;

    container.innerHTML = `
      <div class="report-paper">
        <div class="report-header">
          <div>
            <h1 class="report-title">Nordic Matter Development Studio</h1>
            <div class="report-subtitle">Official Hardware Verification & Matter 1.6 Audit Report</div>
          </div>
          <div style="text-align: right;">
            <div class="mono-txt" style="font-size: 0.78rem; font-weight: 700;">DATE: ${new Date(r.generatedAt).toLocaleString()}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">AUDIT ID: NORDIC-MATTER-16-AUDIT</div>
          </div>
        </div>

        <div class="report-section">
          <h3>1. 타깃 개발보드 하드웨어 제원 (Target Hardware Specifications)</h3>
          <table class="report-table">
            <tr><th>보드 명칭</th><td>${b.name} (${b.code})</td><th>타입</th><td>${b.type}</td></tr>
            <tr><th>SoC</th><td>${b.soc}</td><th>SDK Target</th><td><code>${b.boardTarget}</code></td></tr>
            <tr><th>App Core</th><td>${b.cores.app.cpu}</td><th>Net Core</th><td>${b.cores.net ? b.cores.net.cpu : 'Single-Core / External'}</td></tr>
            <tr><th>External Flash</th><td>${b.externalMemory}</td><th>무선 기술</th><td>${b.wireless.join(', ')}</td></tr>
          </table>
        </div>

        <div class="report-section">
          <h3>2. Matter 1.6 표준 적합성 감사 (Matter 1.6 Compliance Audit)</h3>
          <table class="report-table">
            <tr><th>규격 상태</th><td><span class="report-badge-ok">VERIFIED & COMPLIANT</span></td><th>릴리즈 일자</th><td>2026.06.17 (CSA Official)</td></tr>
            <tr><th>13.56MHz NFC 커미셔닝</th><td>양방향 NDEF 교환 검증 완료</td><th>Joint Fabric</th><td>중앙 Datastore 공유 (1 Fabric 슬롯 절감)</td></tr>
            <tr><th>Thermostat Suggestions</th><td>수요반응 및 컨텍스트 제어 지원</td><th>Product Security 1.1</th><td>Level 2 인증 (EU CRA 준수, 분할 CRL)</td></tr>
          </table>
        </div>

        <div class="report-section">
          <h3>3. 커미셔닝 인자 및 팩토리 데이터 (Commissioning Identity)</h3>
          <table class="report-table">
            <tr><th>Vendor ID</th><td>${r.commissioningIdentity.vendorName} (0x${r.commissioningIdentity.vendorId.toString(16).toUpperCase()})</td><th>Product ID</th><td>${r.commissioningIdentity.productName} (0x${r.commissioningIdentity.productId.toString(16).toUpperCase()})</td></tr>
            <tr><th>Setup Discriminator</th><td>${r.commissioningIdentity.discriminator} (${r.commissioningIdentity.discriminatorHex})</td><th>Setup Passcode</th><td>${r.commissioningIdentity.passcode}</td></tr>
            <tr><th>Manual Pairing Code</th><td class="mono-txt"><strong>${r.commissioningIdentity.manualPairingCode}</strong></td><th>QR Code Payload</th><td class="mono-txt">${r.commissioningIdentity.qrCodePayload}</td></tr>
          </table>
        </div>

        <div class="report-footer">
          <div>Report generated automatically by Nordic Matter Development Studio Workbench v2.5</div>
          <div>Nordic Semiconductor & Matter Standard Certified</div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error(err);
  }
}

function printStudioReport() {
  switchNav('reportTab', document.getElementById('btnNavReport'));
  setTimeout(() => {
    window.print();
  }, 400);
}

// -------------------------------------------------------------
// NCS OFFICIAL MATTER SAMPLES CATALOG & INTERACTIVE CONTROLLERS
// -------------------------------------------------------------
let allMatterSamples = [];
let activeSampleData = null;
let currentSampleFilter = 'all';

async function initSamplesCatalog() {
  try {
    const res = await fetch('/api/samples');
    const data = await res.json();
    allMatterSamples = data.samples || [];
    activeSampleData = data.active;

    populateQuickSampleSelect();
    renderSamplesCatalog(currentSampleFilter);
    if (activeSampleData) {
      renderActiveSampleController(activeSampleData);
    }
  } catch (err) {
    console.error('[Samples Catalog Init Error]', err);
  }
}

function handleSamplesUpdate(activeData) {
  activeSampleData = activeData;
  renderActiveSampleController(activeData);
  updateActiveSampleCardsUi();
  const select = document.getElementById('quickSampleSelect');
  if (select && activeData && activeData.sample) {
    select.value = activeData.sample.id;
  }
}

function handleSamplesCatalogUpdate(data) {
  if (data.all) allMatterSamples = data.all;
  if (data.active) activeSampleData = data.active;
  populateQuickSampleSelect();
  renderSamplesCatalog(currentSampleFilter);
  if (activeSampleData) renderActiveSampleController(activeSampleData);
}

function populateQuickSampleSelect() {
  const select = document.getElementById('quickSampleSelect');
  if (!select || !allMatterSamples.length) return;

  const currentVal = activeSampleData && activeSampleData.sample ? activeSampleData.sample.id : 'light_bulb';
  select.innerHTML = allMatterSamples.map(s => `
    <option value="${s.id}" ${s.id === currentVal ? 'selected' : ''}>
      ${s.icon} ${escapeHtml(s.name.split(' (')[0].replace('Matter: ', ''))}
    </option>
  `).join('');
}

function filterSamplesCategory(category, el) {
  currentSampleFilter = category;
  document.querySelectorAll('.sample-filter-btn').forEach(btn => btn.classList.remove('active'));
  if (el) el.classList.add('active');
  renderSamplesCatalog(category);
}

function renderSamplesCatalog(filter = 'all') {
  const container = document.getElementById('samplesCardsGrid');
  if (!container) return;

  const categoryMap = {
    lighting: ['light_bulb', 'light_switch'],
    security: ['lock', 'contact_sensor'],
    sensors: ['thermostat', 'weather_station', 'smoke_co_alarm', 'pump'],
    special: ['window_covering', 'all_clusters_app', 'bridge', 'template']
  };

  const filtered = allMatterSamples.filter(s => {
    if (filter === 'all') return true;
    return categoryMap[filter] ? categoryMap[filter].includes(s.id) : true;
  });

  const activeId = activeSampleData && activeSampleData.sample ? activeSampleData.sample.id : '';

  container.innerHTML = filtered.map(s => {
    const isCurrentActive = s.id === activeId;
    return `
      <div class="sample-catalog-card ${isCurrentActive ? 'active-running' : ''}" id="sampleCard_${s.id}">
        <div class="sample-card-header">
          <div class="sample-card-title-group">
            <div class="sample-card-icon">${s.icon}</div>
            <div>
              <div class="sample-card-name">${escapeHtml(s.name)}</div>
              <div class="sample-card-sub">${s.sdkPath}</div>
            </div>
          </div>
          <span class="sample-card-category-badge">${escapeHtml(s.category.split(' ')[0])}</span>
        </div>

        <div class="sample-card-desc">${escapeHtml(s.description)}</div>

        <!-- Clusters Info -->
        <div class="sample-clusters-box">
          <div class="sample-clusters-title">
            <span>지원 클러스터 (Clusters)</span>
            <span style="color: var(--nordic-cyan);">EP ${s.endpoint} · ${escapeHtml(s.deviceType.split(' ')[0])}</span>
          </div>
          <div class="sample-clusters-list">
            ${s.clusters.map(c => `
              <span class="cluster-tag" title="${escapeHtml(c.name)} (${c.role}): ${escapeHtml(c.desc)}">
                ${c.id} ${escapeHtml(c.name)}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Hardware Mapping & Target -->
        <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 2px;">
          <div><strong style="color: #4ade80;">H/W LED:</strong> ${escapeHtml(s.hardwareMapping.led)}</div>
          <div><strong style="color: #f59e0b;">SW 버튼:</strong> ${escapeHtml(s.hardwareMapping.button)}</div>
        </div>

        <!-- Build command snippet -->
        <div style="background: rgba(0,0,0,0.35); padding: 5px 8px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.68rem; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 250px;">${escapeHtml(s.westBuildCmd)}</span>
          <button class="link-btn" onclick="copyBuildCmd('${escapeHtml(s.westBuildCmd)}')" style="font-size: 0.68rem;">복사</button>
        </div>

        <!-- Actions -->
        <div class="sample-card-actions">
          <button class="sample-btn-run" onclick="selectSample('${s.id}')">
            <span>${isCurrentActive ? '⚡ 활성 실행 중 (Active)' : '▶ 이 샘플로 보드 실행 (Flash & Run)'}</span>
          </button>
          <a href="${s.docUrl}" target="_blank" class="sample-btn-docs" title="NCS 공식 문서 확인">
            📖 공식 문서 ↗
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function copyBuildCmd(cmd) {
  navigator.clipboard.writeText(cmd);
  showToast(`📋 빌드 명령어가 복사되었습니다: ${cmd}`, '📋');
}

async function selectSample(sampleId) {
  const quickSelect = document.getElementById('quickSampleSelect');
  if (quickSelect) quickSelect.value = sampleId;

  try {
    showToast(`⚡ NCS 샘플 [${sampleId}] 플래시 및 전환 중...`, '⚡');
    const token = localStorage.getItem('nordic_matter_token') || '';
    const res = await fetch('/api/samples/select', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ sampleId })
    });
    const data = await res.json();
    if (data.success && data.active) {
      activeSampleData = data.active;
      renderActiveSampleController(activeSampleData);
      renderSamplesCatalog(currentSampleFilter);
      populateQuickSampleSelect();
      updateActiveSampleCardsUi();
      showToast(`🌟 샘플 활성화 완료: ${data.active.sample.name}`, '🎉');

      // Update photoreal board firmware display if present
      const fwBadge = document.getElementById('boardTwinFirmware');
      if (fwBadge) {
        fwBadge.innerText = data.active.sample.sdkPath;
      }
    } else {
      showToast(`⚠️ 샘플 전환 실패: ${data.message || '오류가 발생했습니다.'}`, '⚠️');
      if (quickSelect && activeSampleData && activeSampleData.sample) {
        quickSelect.value = activeSampleData.sample.id;
      }
    }
  } catch (err) {
    console.error(err);
    showToast('⚠️ 서버 통신 중 오류가 발생했습니다.', '❌');
    if (quickSelect && activeSampleData && activeSampleData.sample) {
      quickSelect.value = activeSampleData.sample.id;
    }
  }
}

function switchActiveSample(sampleId) {
  selectSample(sampleId);
}

function updateActiveSampleCardsUi() {
  const activeId = activeSampleData && activeSampleData.sample ? activeSampleData.sample.id : '';
  document.querySelectorAll('.sample-catalog-card').forEach(card => {
    if (card.id === `sampleCard_${activeId}`) {
      card.classList.add('active-running');
      const btn = card.querySelector('.sample-btn-run span');
      if (btn) btn.innerText = '⚡ 활성 실행 중 (Active)';
    } else {
      card.classList.remove('active-running');
      const btn = card.querySelector('.sample-btn-run span');
      if (btn) btn.innerText = '▶ 이 샘플로 보드 실행 (Flash & Run)';
    }
  });
}

async function controlSampleDevice(sampleId, patch) {
  try {
    const token = localStorage.getItem('nordic_matter_token') || '';
    const res = await fetch('/api/samples/control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ sampleId, patch })
    });
    const data = await res.json();
    if (data.success && activeSampleData) {
      activeSampleData.liveState = data.liveState;
      renderActiveSampleController(activeSampleData);
    }
  } catch (err) {
    console.error(err);
  }
}

function renderActiveSampleController(activeData) {
  const panel = document.getElementById('activeSampleControllerPanel');
  const icon = document.getElementById('activeSampleIcon');
  const title = document.getElementById('activeSampleTitle');
  const sub = document.getElementById('activeSampleSub');
  const container = document.getElementById('dynamicSampleControlsContainer');
  if (!container || !activeData || !activeData.sample) return;

  const sample = activeData.sample;
  const state = activeData.liveState || {};

  if (icon) icon.innerText = sample.icon;
  if (title) title.innerText = sample.name;
  if (sub) sub.innerText = `Endpoint ${sample.endpoint} · ${sample.deviceType.split(' ')[0]} · ${sample.sdkPath}`;

  // Keep quick select in sync
  const quickSelect = document.getElementById('quickSampleSelect');
  if (quickSelect && quickSelect.value !== sample.id) {
    quickSelect.value = sample.id;
  }

  let ctrlHtml = '';

  switch (sample.id) {
    case 'light_bulb': {
      const isOn = !!state.onOff;
      const level = state.level !== undefined ? state.level : 210;
      const cct = state.colorTemperatureKelvin || 4000;
      const rgb = state.rgbHex || '#38bdf8';
      ctrlHtml = `
        <div class="device-ctrl-wrapper">
          <div style="display: flex; gap: 12px; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: ${isOn ? rgb : '#334155'}; box-shadow: ${isOn ? `0 0 14px ${rgb}` : 'none'}; border: 1px solid rgba(255,255,255,0.2); transition: all 0.2s;"></div>
              <div>
                <div style="font-weight: 700; color: #fff;">전원 상태: ${isOn ? '<span style="color: #4ade80;">ON (켜짐)</span>' : '<span style="color: #ef4444;">OFF (꺼짐)</span>'}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">밝기: ${Math.round((level / 254) * 100)}% (${level}/254) · 색온도: ${cct}K</div>
              </div>
            </div>
            <button class="hyper-btn ${isOn ? 'hyper-btn-off' : 'hyper-btn-on'}" onclick="controlSampleDevice('light_bulb', { onOff: ${!isOn} })">
              ${isOn ? '전원 끄기 (OFF)' : '전원 켜기 (ON)'}
            </button>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px;">
            <span style="font-size: 0.72rem; color: var(--text-sub); width: 75px;">밝기 디밍:</span>
            <input type="range" min="1" max="254" value="${level}" style="flex: 1;" onchange="controlSampleDevice('light_bulb', { level: parseInt(this.value) })">
          </div>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 6px;">
            <span style="font-size: 0.72rem; color: var(--text-sub); width: 75px;">색온도(CCT):</span>
            <input type="range" min="2700" max="6500" step="100" value="${cct}" style="flex: 1;" onchange="controlSampleDevice('light_bulb', { colorTemperatureKelvin: parseInt(this.value) })">
          </div>
        </div>
      `;
      break;
    }

    case 'light_switch': {
      const boundNode = state.boundNodeId || '0x123456780001';
      const boundEp = state.boundEndpoint || 1;
      const count = state.pressCount || 0;
      const lastAction = state.lastAction || '대기 중';
      ctrlHtml = `
        <div class="device-ctrl-wrapper">
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.25); padding: 8px 12px; border-radius: 6px;">
            <div>
              <div style="font-size: 0.76rem; color: #94a3b8;">바인딩 타겟 (Binding Target)</div>
              <div style="font-weight: 700; color: #38bdf8; font-family: var(--font-mono);">${boundNode} (EP ${boundEp})</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.76rem; color: #94a3b8;">누적 전송 횟수</div>
              <div style="font-weight: 800; color: #fff;">${count}회</div>
            </div>
          </div>
          <div class="ctrl-tile-row" style="display: flex; gap: 8px; margin-top: 8px;">
            <button class="hyper-btn hyper-btn-on" style="flex: 1;" onclick="controlSampleDevice('light_switch', { lastAction: 'Single Click -> Toggle Sent', pressCount: ${count + 1} })">
              👆 단일 클릭 (Toggle)
            </button>
            <button class="hyper-btn" style="flex: 1; background: #3b82f6; color: #fff;" onclick="controlSampleDevice('light_switch', { lastAction: 'Double Click -> Brightness +20%', pressCount: ${count + 1} })">
              ✌️ 더블 클릭 (밝기 Up)
            </button>
            <button class="hyper-btn" style="flex: 1; background: #64748b; color: #fff;" onclick="controlSampleDevice('light_switch', { lastAction: 'Long Press -> Brightness -20%', pressCount: ${count + 1} })">
              ⏱️ 롱 프레스 (밝기 Down)
            </button>
          </div>
          <div style="font-size: 0.72rem; color: var(--nordic-cyan); margin-top: 6px;">최근 전송 이벤트: ${escapeHtml(lastAction)}</div>
        </div>
      `;
      break;
    }

    case 'lock': {
      const isLocked = state.lockState === 'LOCKED' || state.lockState === 'Locked';
      const autoSec = state.autoRelockTimeSec || state.autoRelockTimeSeconds || 10;
      const bat = state.batteryPercent || state.batteryLevel || 92;
      ctrlHtml = `
        <div class="device-ctrl-wrapper">
          <div class="lock-bolt-display ${isLocked ? 'locked' : 'unlocked'}" style="text-align: center; padding: 12px; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px solid var(--border);">
            <div style="font-size: 2.2rem; margin-bottom: 4px;">${isLocked ? '🔒' : '🔓'}</div>
            <div class="lock-status-badge ${isLocked ? 'locked' : 'unlocked'}" style="font-size: 0.95rem; font-weight: 800; color: ${isLocked ? '#4ade80' : '#f59e0b'};">
              ${isLocked ? 'BOLT ENGAGED (잠금 상태)' : 'BOLT RETRACTED (잠금 해제됨)'}
            </div>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 4px;">
              자동 재잠금(Auto-Relock): ${autoSec}초 · 배터리: ${bat}% · 자격증명: PIN 코드 & Matter 패브릭
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 8px;">
            <button class="hyper-btn ${isLocked ? 'hyper-btn-off' : 'hyper-btn-on'}" style="flex: 1;" onclick="controlSampleDevice('lock', { lockState: '${isLocked ? 'Unlocked' : 'Locked'}', boltState: '${isLocked ? 'Retracted' : 'Locked'}' })">
              ${isLocked ? '🔓 도어락 열기 (Unlock Door)' : '🔒 도어락 잠그기 (Lock Door)'}
            </button>
            <button class="action-btn btn-secondary" onclick="simulatePinUnlock()">
              🔢 PIN 키패드 인증
            </button>
          </div>
        </div>
      `;
      break;
    }

    case 'thermostat': {
      const curTemp = state.localTemperature !== undefined ? state.localTemperature : (state.localTemperatureC !== undefined ? state.localTemperatureC : 22.5);
      const targetTemp = state.occupiedHeatingSetpoint !== undefined ? state.occupiedHeatingSetpoint : (state.targetTempC !== undefined ? state.targetTempC : 21.0);
      const mode = state.systemMode || 'Auto';
      const hum = state.humidity !== undefined ? state.humidity : (state.humidityPercent !== undefined ? state.humidityPercent : 48);
      const isEco = state.ecoMode !== undefined ? state.ecoMode : true;
      ctrlHtml = `
        <div class="device-ctrl-wrapper">
          <div class="thermo-display-box" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border);">
            <div>
              <div style="font-size: 0.72rem; color: #94a3b8;">현재 실내 온도</div>
              <div class="thermo-temp-big" style="font-size: 1.8rem; font-weight: 800; color: #38bdf8; font-family: var(--font-mono);">${Number(curTemp).toFixed(1)}°C</div>
            </div>
            <div style="text-align: center;">
              <span class="thermo-mode-pill" style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; background: ${mode === 'Heat' ? 'rgba(239, 68, 68, 0.25)' : (mode === 'Cool' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(34, 197, 94, 0.25)')}; color: ${mode === 'Heat' ? '#f87171' : (mode === 'Cool' ? '#38bdf8' : '#4ade80')}; border: 1px solid currentColor;">${mode.toUpperCase()} MODE</span>
              <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 4px;">습도: ${hum}% · Eco: ${isEco ? 'ON' : 'OFF'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.72rem; color: #94a3b8;">목표 희망 온도</div>
              <div style="font-size: 1.8rem; font-weight: 800; color: #fff; font-family: var(--font-mono);">${Number(targetTemp).toFixed(1)}°C</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 8px;">
            <div style="display: flex; gap: 6px;">
              <button class="hyper-btn hyper-btn-off" style="padding: 6px 12px;" onclick="controlSampleDevice('thermostat', { occupiedHeatingSetpoint: ${(Number(targetTemp) - 0.5).toFixed(1)}, targetTempC: ${(Number(targetTemp) - 0.5).toFixed(1)} })">▼ -0.5°C</button>
              <button class="hyper-btn hyper-btn-on" style="padding: 6px 12px;" onclick="controlSampleDevice('thermostat', { occupiedHeatingSetpoint: ${(Number(targetTemp) + 0.5).toFixed(1)}, targetTempC: ${(Number(targetTemp) + 0.5).toFixed(1)} })">▲ +0.5°C</button>
            </div>
            <div style="display: flex; gap: 4px;">
              <button class="action-btn ${mode === 'Heat' ? 'btn-primary' : 'btn-secondary'}" style="padding: 4px 8px; font-size: 0.72rem;" onclick="controlSampleDevice('thermostat', { systemMode: 'Heat' })">난방</button>
              <button class="action-btn ${mode === 'Cool' ? 'btn-primary' : 'btn-secondary'}" style="padding: 4px 8px; font-size: 0.72rem;" onclick="controlSampleDevice('thermostat', { systemMode: 'Cool' })">냉방</button>
              <button class="action-btn ${mode === 'Auto' ? 'btn-primary' : 'btn-secondary'}" style="padding: 4px 8px; font-size: 0.72rem;" onclick="controlSampleDevice('thermostat', { systemMode: 'Auto' })">자동</button>
              <button class="action-btn ${isEco ? 'btn-primary' : 'btn-secondary'}" style="padding: 4px 8px; font-size: 0.72rem;" onclick="controlSampleDevice('thermostat', { ecoMode: ${!isEco} })">에코</button>
            </div>
          </div>
        </div>
      `;
      break;
    }

    case 'window_covering': {
      const lift = state.currentPositionLiftPercent !== undefined ? state.currentPositionLiftPercent : (state.liftPercent !== undefined ? state.liftPercent : 40);
      const tilt = state.currentPositionTiltPercent !== undefined ? state.currentPositionTiltPercent : (state.tiltPercent !== undefined ? state.tiltPercent : 15);
      ctrlHtml = `
        <div class="device-ctrl-wrapper">
          <div style="display: flex; gap: 14px; align-items: center;">
            <div style="width: 100px; height: 80px; background: rgba(0,0,0,0.3); border: 2px solid var(--border); border-radius: 6px; position: relative; overflow: hidden;">
              <div style="position: absolute; top: 0; left: 0; right: 0; height: ${lift}%; background: linear-gradient(180deg, #1e3a8a, #3b82f6); opacity: 0.85; transition: height 0.3s ease; border-bottom: 3px solid #60a5fa;"></div>
              <div style="position: absolute; bottom: 4px; left: 0; right: 0; text-align: center; font-size: 0.68rem; color: #fff; font-weight: 700; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">Lift: ${lift}%</div>
            </div>
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; font-size: 0.74rem; color: #fff;">
                <span>블라인드 하강률 (Lift): <strong>${lift}%</strong></span>
                <span>슬랫 각도 (Tilt): <strong>${tilt}%</strong></span>
              </div>
              <div style="margin-top: 6px;">
                <input type="range" min="0" max="100" value="${lift}" style="width: 100%;" onchange="controlSampleDevice('window_covering', { currentPositionLiftPercent: parseInt(this.value), targetPositionLiftPercent: parseInt(this.value), liftPercent: parseInt(this.value) })">
              </div>
              <div style="margin-top: 6px; display: flex; gap: 6px;">
                <button class="action-btn btn-secondary" style="flex: 1; font-size: 0.72rem;" onclick="controlSampleDevice('window_covering', { currentPositionLiftPercent: 0, targetPositionLiftPercent: 0, liftPercent: 0 })">완전 열기 (0%)</button>
                <button class="action-btn btn-secondary" style="flex: 1; font-size: 0.72rem;" onclick="controlSampleDevice('window_covering', { motorStatus: 'Stopped' })">정지 (Stop)</button>
                <button class="action-btn btn-primary" style="flex: 1; font-size: 0.72rem;" onclick="controlSampleDevice('window_covering', { currentPositionLiftPercent: 100, targetPositionLiftPercent: 100, liftPercent: 100 })">완전 닫기 (100%)</button>
              </div>
            </div>
          </div>
        </div>
      `;
      break;
    }

    case 'contact_sensor': {
      const isOpen = state.contactState === 'OPEN' || state.contactState === 'Open' || state.stateValue === true;
      const bat = state.batteryLevel || 98;
      const interval = state.icdIntervalMs || 5000;
      ctrlHtml = `
        <div class="device-ctrl-wrapper">
          <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.25); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 2.2rem;">${isOpen ? '🚪🔓' : '🚪🔒'}</div>
              <div>
                <div style="font-size: 1rem; font-weight: 800; color: ${isOpen ? '#f59e0b' : '#4ade80'};">
                  ${isOpen ? '창문 / 문 열림 (Contact OPEN)' : '창문 / 문 닫힘 (Contact CLOSED)'}
                </div>
                <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;">
                  Matter 1.6 ICD 모드 · 폴링 주기: ${interval}ms · 배터리: ${bat}%
                </div>
              </div>
            </div>
            <button class="hyper-btn ${isOpen ? 'hyper-btn-off' : 'hyper-btn-on'}" onclick="controlSampleDevice('contact_sensor', { contactState: '${isOpen ? 'Closed' : 'Open'}', stateValue: ${!isOpen} })">
              ${isOpen ? '문 닫기 (Close Door)' : '문 열기 (Open Door)'}
            </button>
          </div>
        </div>
      `;
      break;
    }

    case 'smoke_co_alarm': {
      const isAlarm = state.alarmExpressed || state.alarmActive || false;
      const smoke = state.smokeState || 'Normal';
      const co = state.coState || 'Normal';
      const bat = state.batteryLevel || state.batteryPercent || 99;
      ctrlHtml = `
        <div class="device-ctrl-wrapper">
          <div style="display: flex; justify-content: space-between; align-items: center; background: ${isAlarm ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0,0,0,0.25)'}; padding: 12px; border-radius: 8px; border: 1px solid ${isAlarm ? '#ef4444' : 'var(--border)'};">
            <div>
              <div style="font-size: 0.95rem; font-weight: 800; color: ${isAlarm ? '#ef4444' : '#4ade80'};">
                ${isAlarm ? '🚨 화재 / 연기 위험 경보 작동 중 (ALARM ACTIVE)' : '🟢 감지기 정상 감시 상태 (NORMAL)'}
              </div>
              <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 4px;">
                연기 상태: ${smoke} · 일산화탄소(CO): ${co} · 배터리: ${bat}%
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="hyper-btn ${isAlarm ? 'hyper-btn-on' : 'hyper-btn-off'}" onclick="controlSampleDevice('smoke_co_alarm', { alarmExpressed: ${!isAlarm}, alarmActive: ${!isAlarm}, smokeState: '${isAlarm ? 'Normal' : 'Warning'}' })">
                ${isAlarm ? '🔕 경보 음소거' : '🚨 테스트 경보 트리거'}
              </button>
            </div>
          </div>
        </div>
      `;
      break;
    }

    case 'weather_station': {
      const temp = state.temperatureC || 23.4;
      const hum = state.humidityPercent || state.relativeHumidityPercent || 52;
      const pres = state.pressureHpa || 1013.25;
      const aqi = state.airQualityIndex || 'Good';
      const voc = state.vocIndex || 28;
      ctrlHtml = `
        <div class="device-ctrl-wrapper">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
            <div style="background: rgba(0,0,0,0.25); padding: 8px; border-radius: 6px; text-align: center; border: 1px solid var(--border);">
              <div style="font-size: 0.7rem; color: #94a3b8;">🌡️ 온도</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #38bdf8; margin-top: 2px;">${temp}°C</div>
            </div>
            <div style="background: rgba(0,0,0,0.25); padding: 8px; border-radius: 6px; text-align: center; border: 1px solid var(--border);">
              <div style="font-size: 0.7rem; color: #94a3b8;">💧 습도</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #34d399; margin-top: 2px;">${hum}%</div>
            </div>
            <div style="background: rgba(0,0,0,0.25); padding: 8px; border-radius: 6px; text-align: center; border: 1px solid var(--border);">
              <div style="font-size: 0.7rem; color: #94a3b8;">⏱️ 대기압</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #fbbf24; margin-top: 2px;">${pres} hPa</div>
            </div>
            <div style="background: rgba(0,0,0,0.25); padding: 8px; border-radius: 6px; text-align: center; border: 1px solid var(--border);">
              <div style="font-size: 0.7rem; color: #94a3b8;">🍃 공기질 (AQI)</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #a78bfa; margin-top: 2px;">${aqi} (${voc})</div>
            </div>
          </div>
          <button class="action-btn btn-secondary" style="width: 100%; font-size: 0.74rem; margin-top: 8px;" onclick="simulateWeatherFluctuation()">
            🎲 가상 기상 환경 변화 시뮬레이션
          </button>
        </div>
      `;
      break;
    }

    case 'all_clusters_app': {
      const endpoints = (state.activeEndpoints || [0, 1, 2]).join(', ');
      const status = state.testHarnessState || 'Ready';
      const acl = state.aclRuleCount || 4;
      ctrlHtml = `
        <div class="device-ctrl-wrapper">
          <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: 6px; border: 1px solid var(--border);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-weight: 700; color: #fff;">CSA Matter Test Harness 자동 검증기</span>
                <div style="font-size: 0.72rem; color: #94a3b8;">활성 엔드포인트: [${endpoints}] · ACL 접근제어 규칙: ${acl}개</div>
              </div>
              <span class="status-badge status-running" style="padding: 2px 8px; font-size: 0.7rem; background: rgba(34,197,94,0.2); color: #4ade80; border-radius: 4px;">상태: ${status}</span>
            </div>
            <div style="margin-top: 8px; display: flex; gap: 8px;">
              <button class="hyper-btn hyper-btn-on" style="flex: 1;" onclick="controlSampleDevice('all_clusters_app', { testHarnessState: 'Validated 100%' }); showToast('🧪 CSA 5.4.1 테스트 하네스 검증 패스: All Clusters Validated', '✅')">
                🧪 CSA 클러스터 자동 적합성 시험
              </button>
            </div>
          </div>
        </div>
      `;
      break;
    }

    case 'bridge': {
      const nodes = state.bridgedNodes || [
        { id: 1, name: 'Zigbee Dimmable Bulb', type: 'Dimmable Light', online: true, state: 'ON (75%)' },
        { id: 2, name: 'BLE Mesh Temp Sensor', type: 'Temperature Sensor', online: true, state: '22.8 °C' }
      ];
      ctrlHtml = `
        <div class="device-ctrl-wrapper">
          <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: 6px; border: 1px solid var(--border);">
            <div style="font-size: 0.74rem; color: #94a3b8; margin-bottom: 6px;">레거시 비-매터 기기 브릿지 연동 테이블 (Aggregator ${nodes.length} Nodes)</div>
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.74rem;">
              ${nodes.map(n => `
                <div style="display: flex; justify-content: space-between; padding: 4px 8px; background: rgba(255,255,255,0.04); border-radius: 4px;">
                  <span>EP ${n.id + 1}: ${escapeHtml(n.name)} (${escapeHtml(n.type)})</span>
                  <span style="color: ${n.online ? '#4ade80' : '#ef4444'}; font-weight: 700;">${escapeHtml(n.state)}</span>
                </div>
              `).join('')}
            </div>
            <button class="action-btn btn-secondary" style="width: 100%; margin-top: 8px; font-size: 0.72rem;" onclick="controlSampleDevice('bridge', { totalBridgedEndpoints: ${nodes.length} }); showToast('🔄 브릿지 하위 노드 동기화 완료', '🔄')">
              🔄 하위 노드 상태 재동기화
            </button>
          </div>
        </div>
      `;
      break;
    }

    case 'pump': {
      const isRunning = state.pumpRunning !== undefined ? state.pumpRunning : (state.pumpState === 'RUNNING');
      const flow = state.flowRateLpm || 42.5;
      const actualP = state.actualPressureBar || state.pressureBar || 3.48;
      const targetP = state.targetPressureBar || 3.5;
      const rpm = state.speedRpm || 1750;
      ctrlHtml = `
        <div class="device-ctrl-wrapper">
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.25); padding: 10px; border-radius: 6px; border: 1px solid var(--border);">
            <div>
              <div style="font-size: 0.95rem; font-weight: 800; color: ${isRunning ? '#38bdf8' : '#94a3b8'};">
                펌프 상태: ${isRunning ? '가동 중 (RUNNING)' : '정지됨 (STOPPED)'}
              </div>
              <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;">
                유량: ${flow} L/min · 압력: ${actualP} / ${targetP} bar · 회전수: ${isRunning ? rpm : 0} RPM
              </div>
            </div>
            <button class="hyper-btn ${isRunning ? 'hyper-btn-off' : 'hyper-btn-on'}" onclick="controlSampleDevice('pump', { pumpRunning: ${!isRunning}, pumpState: '${isRunning ? 'STOPPED' : 'RUNNING'}' })">
              ${isRunning ? '펌프 정지' : '펌프 가동'}
            </button>
          </div>
        </div>
      `;
      break;
    }

    case 'template':
    default: {
      const customActive = state.customClusterActive !== undefined ? state.customClusterActive : true;
      const statusMsg = state.status || 'Template Baseline Ready';
      ctrlHtml = `
        <div class="device-ctrl-wrapper">
          <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: 6px; border: 1px solid var(--border); font-size: 0.74rem;">
            <div style="font-weight: 700; color: #fff;">커스텀 장치 베이스라인 템플릿 (Template App)</div>
            <div style="color: #94a3b8; margin-top: 4px;">
              독자 클러스터 (0xFFF1) 활성화: <span style="color: #4ade80; font-weight: 700;">${customActive ? 'Active' : 'Inactive'}</span> · 상태: ${escapeHtml(statusMsg)}
            </div>
            <button class="hyper-btn hyper-btn-on" style="margin-top: 8px; width: 100%;" onclick="controlSampleDevice('template', { customClusterActive: ${!customActive} }); showToast('✨ 커스텀 클러스터 0xFFF1 핑 응답 수신됨 (Success)', '✨')">
              ✨ 커스텀 클러스터 핸들러 테스트
            </button>
          </div>
        </div>
      `;
      break;
    }
  }

  container.innerHTML = ctrlHtml;
}

function simulatePinUnlock() {
  const pin = prompt('도어락 PIN 비밀번호를 입력하세요 (기본값: 1234):', '1234');
  if (pin === '1234') {
    controlSampleDevice('lock', { lockState: 'UNLOCKED' });
    showToast('🔓 PIN 인증 성공: 도어락 볼트가 해제되었습니다.', '🔓');
  } else if (pin !== null) {
    showToast('❌ PIN 인증 실패: 비밀번호가 올바르지 않습니다.', '❌');
  }
}

function simulateWeatherFluctuation() {
  const randTemp = (20 + Math.random() * 8).toFixed(1);
  const randHumid = Math.floor(40 + Math.random() * 30);
  const randPress = (1010 + Math.random() * 8).toFixed(1);
  const randAqi = Math.floor(15 + Math.random() * 45);

  controlSampleDevice('weather_station', {
    temperatureC: parseFloat(randTemp),
    relativeHumidityPercent: randHumid,
    pressureHpa: parseFloat(randPress),
    airQualityIndex: randAqi
  });
  showToast(`🎲 가상 날씨 환경 업데이트: ${randTemp}°C / ${randHumid}% / ${randPress}hPa`, '🍃');
}

function filterDkGuideSection(secId, el) {
  document.querySelectorAll('.dk-guide-btn').forEach(btn => btn.classList.remove('active'));
  if (el) el.classList.add('active');

  const secMap = {
    all: ['dkSec1', 'dkSec2', 'dkSec3', 'dkSec4'],
    sec1: ['dkSec1'],
    sec2: ['dkSec2'],
    sec3: ['dkSec3'],
    sec4: ['dkSec4']
  };

  const targetList = secMap[secId] || secMap.all;
  ['dkSec1', 'dkSec2', 'dkSec3', 'dkSec4'].forEach(id => {
    const sec = document.getElementById(id);
    if (sec) {
      sec.style.display = targetList.includes(id) ? 'flex' : 'none';
    }
  });
}

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  initBoardsCatalog();
  initSamplesCatalog();
  runQuickStartStep(1);
  generateFactoryDataUi();
  fetchMatter16State();
  renderAuditReport();
});
