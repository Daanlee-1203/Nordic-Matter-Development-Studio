// ============================================================
// Nordic nRF5340 DK Studio & Matter Controller Client App
// Responsive Optimistic UI, Real-time Lineage, Tactile Controls
// ============================================================

let currentBoardState = null;
let currentMatterState = null;
let powerSamples = [];
const maxPowerSamples = 90;
let eventSource = null;
let boardRenderer = null;

// -------------------------------------------------------------
// Toast Notification System
// -------------------------------------------------------------
function showToast(message, icon = '💡') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2400);
}

// -------------------------------------------------------------
// Sidebar Navigation (Zero-Failure Tab Switching)
// -------------------------------------------------------------
function switchNav(tabId, el) {
  // Hide all tab panes
  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.remove('active');
  });

  // Deactivate all nav buttons
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.remove('active');
  });

  // Activate target pane
  const target = document.getElementById(tabId);
  if (target) {
    target.classList.add('active');
  }

  // Activate button
  if (el) {
    el.classList.add('active');
  } else {
    // Fallback: search by tabId
    const mappedBtn = document.querySelector(`[onclick*="${tabId}"]`);
    if (mappedBtn) mappedBtn.classList.add('active');
  }

  // Redraw canvases or trigger updates if needed
  if (tabId === 'dashboardTab') {
    if (window.boardRenderer && typeof window.boardRenderer.draw === 'function') {
      requestAnimationFrame(() => window.boardRenderer.draw());
    }
  }
  if (tabId === 'powerTab') {
    requestAnimationFrame(renderPowerChart);
  }
  if (tabId === 'reportTab' && typeof renderAuditReport === 'function') {
    renderAuditReport();
  }
}

let clientSessionId = localStorage.getItem('nordic_studio_sessionId');
if (!clientSessionId) {
  clientSessionId = `sess-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
  localStorage.setItem('nordic_studio_sessionId', clientSessionId);
}
let currentAuditLogs = [];
let activeSessionsSummary = null;
let currentAuditCategory = 'all';
let currentAuditSearch = '';

// -------------------------------------------------------------
// Server-Sent Events (SSE) Stream Connection
// -------------------------------------------------------------
function initSse() {
  eventSource = new EventSource(`/api/stream?sessionId=${clientSessionId}`);

  eventSource.addEventListener('board', (e) => {
    try {
      currentBoardState = JSON.parse(e.data);
      updateBoardUi(currentBoardState);
    } catch (err) {
      console.error('[SSE Board Parse Error]', err);
    }
  });

  eventSource.addEventListener('matter', (e) => {
    try {
      currentMatterState = JSON.parse(e.data);
      updateMatterUi(currentMatterState);
    } catch (err) {
      console.error('[SSE Matter Parse Error]', err);
    }
  });

  eventSource.addEventListener('boards', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (typeof updateActiveBoardHeader === 'function' && data.active) {
        updateActiveBoardHeader(data.active);
      }
      if (typeof renderBoardsCatalogGrid === 'function' && data.all) {
        renderBoardsCatalogGrid(data.all, data.active);
      }
      if (window.boardRenderer && typeof window.boardRenderer.setBoardModel === 'function' && data.active) {
        window.boardRenderer.setBoardModel(data.active.id, data.active);
      }
      if (typeof renderDashboardLedCards === 'function' && data.active) {
        renderDashboardLedCards(data.active);
      }
    } catch (err) {}
  });

  eventSource.addEventListener('matter16', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (typeof renderMatter16Ui === 'function') {
        renderMatter16Ui(data);
      }
    } catch (err) {}
  });

  eventSource.addEventListener('logs', (e) => {
    try {
      const logs = JSON.parse(e.data);
      const container = document.getElementById('terminalLogs');
      if (container) {
        container.innerHTML = '';
        logs.forEach(l => appendLogLine(l));
        container.scrollTop = container.scrollHeight;
      }
    } catch (err) {}
  });

  eventSource.addEventListener('log', (e) => {
    try {
      const log = JSON.parse(e.data);
      appendLogLine(log);
      const container = document.getElementById('terminalLogs');
      if (container) container.scrollTop = container.scrollHeight;
    } catch (err) {}
  });

  eventSource.addEventListener('lineage', (e) => {
    try {
      const lineage = JSON.parse(e.data);
      animateLineageFlow(lineage);
    } catch (err) {}
  });

  eventSource.addEventListener('power_init', (e) => {
    try {
      const data = JSON.parse(e.data);
      powerSamples = data.history || [];
      updatePowerSummary(data.summary);
    } catch (err) {}
  });

  eventSource.addEventListener('power', (e) => {
    try {
      const data = JSON.parse(e.data);
      powerSamples.push(data.sample);
      if (powerSamples.length > maxPowerSamples) powerSamples.shift();
      updatePowerSummary(data.summary);
      renderPowerChart();
    } catch (err) {}
  });

  eventSource.addEventListener('alert', (e) => {
    try {
      const alertData = JSON.parse(e.data);
      if (alertData.type === 'started') {
        showToast(`🔔 스마트홈 알림 시작: ${alertData.alert ? alertData.alert.label : '이벤트'}`, '🚨');
      }
    } catch (err) {}
  });

  eventSource.addEventListener('samples', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (typeof handleSamplesUpdate === 'function') {
        handleSamplesUpdate(data);
      }
    } catch (err) {}
  });

  eventSource.addEventListener('samples_catalog', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (typeof handleSamplesCatalogUpdate === 'function') {
        handleSamplesCatalogUpdate(data);
      }
    } catch (err) {}
  });

  eventSource.addEventListener('sessions', (e) => {
    try {
      const data = JSON.parse(e.data);
      renderActiveSessions(data);
    } catch (err) {}
  });

  eventSource.addEventListener('access_logs', (e) => {
    try {
      const logs = JSON.parse(e.data);
      currentAuditLogs = logs || [];
      renderAuditLogs(currentAuditLogs);
    } catch (err) {}
  });

  eventSource.addEventListener('access_log', (e) => {
    try {
      const log = JSON.parse(e.data);
      currentAuditLogs.unshift(log);
      if (currentAuditLogs.length > 500) currentAuditLogs.pop();
      renderAuditLogs(currentAuditLogs);
    } catch (err) {}
  });

  eventSource.addEventListener('current_session', (e) => {
    try {
      const sess = JSON.parse(e.data);
      if (sess && sess.profile) {
        updateTopbarProfileUi(sess.profile);
      }
    } catch (err) {}
  });

  eventSource.onerror = () => {
    console.warn('SSE disconnected, retrying in 2s...');
    setTimeout(initSse, 2000);
  };
}

// -------------------------------------------------------------
// UI Update Functions
// -------------------------------------------------------------
function updateBoardUi(st) {
  if (!st) return;

  // Operation Mode Switcher Buttons
  const isHw = st.boardInfo.mode === 'hardware';
  const isConnected = Boolean(st.boardInfo.jlinkConnected);
  const hwBtn = document.getElementById('modeHwBtn');
  const simBtn = document.getElementById('modeSimBtn');
  if (hwBtn) hwBtn.classList.toggle('active', isHw);
  if (simBtn) simBtn.classList.toggle('active', !isHw);

  // Sidebar Status details & dynamic indicators
  const connText = document.getElementById('sidebarConnText');
  const snChip = document.getElementById('sidebarSnChip');
  const vddChip = document.getElementById('sidebarVddChip');
  const pulseDot = document.querySelector('.sidebar-status-card .pulse-dot');

  if (connText) {
    if (isConnected) {
      connText.innerText = '물리 하드웨어 연결됨';
      connText.style.color = '#4ade80';
    } else {
      connText.innerText = '하드웨어 미연결 (가상 엔진)';
      connText.style.color = '#f59e0b';
    }
  }

  if (pulseDot) {
    pulseDot.style.background = isConnected ? '#4ade80' : '#f59e0b';
    pulseDot.style.boxShadow = isConnected ? '0 0 10px #4ade80' : '0 0 10px #f59e0b';
  }

  if (snChip) {
    snChip.innerText = isConnected ? `S/N: ${st.boardInfo.serialNumber}` : 'S/N: 미연결 (None)';
    snChip.style.color = isConnected ? '#38bdf8' : '#94a3b8';
  }

  if (vddChip) {
    const vdd = typeof st.boardInfo.vddVoltage === 'number' ? st.boardInfo.vddVoltage : parseFloat(st.boardInfo.vddVoltage || 0);
    vddChip.innerText = isConnected ? `VDD: ${vdd.toFixed(2)}V` : 'VDD: 0.00V (전원 없음)';
    vddChip.style.color = isConnected ? '#38bdf8' : '#ef4444';
  }

  // Sync to Board Canvas Renderer
  if (boardRenderer) {
    boardRenderer.syncHwStatus(Boolean(st.boardInfo.jlinkConnected), st.boardInfo.serialNumber);
    if (st.leds) {
      Object.entries(st.leds).forEach(([k, v]) => {
        boardRenderer.setLedState(k, Boolean(v));
      });
    }
  }

  // Update Dynamic Dashboard LED Cards
  if (typeof updateDashboardLedCardsStatus === 'function') {
    updateDashboardLedCardsStatus(st.leds);
  }

  // Sync active board header text to reflect real hardware connection
  if (typeof updateActiveBoardHeader === 'function' && typeof currentActiveBoard !== 'undefined' && currentActiveBoard) {
    updateActiveBoardHeader(currentActiveBoard);
  }

  // Cores Telemetry status
  updateCoreBox('app', st.appCore);
  updateCoreBox('net', st.netCore);

  // Flash Partitions
  renderPartitions(st.flashPartitions);
}

function updateCoreBox(prefix, core) {
  if (!core) return;
  const badge = document.getElementById(`${prefix}CoreBadge`);
  const pc = document.getElementById(`${prefix}CorePc`);
  const sp = document.getElementById(`${prefix}CoreSp`);

  if (badge) {
    badge.innerText = core.status;
    badge.className = `status-badge status-${core.status.toLowerCase()}`;
  }
  if (pc) pc.innerText = core.pc;
  if (sp) sp.innerText = core.sp;
}

function renderPartitions(partitions) {
  const container = document.getElementById('partitionContainer');
  if (!container || !partitions) return;

  container.innerHTML = partitions.map(p => `
    <div class="partition-bar">
      <div class="partition-info">
        <span><strong>${p.name}</strong> <small style="color: var(--text-muted);">[${p.core}] ${p.start}</small></span>
        <span style="font-family: var(--font-mono); color: ${p.color}; font-weight: 700;">${p.used} / ${p.size} (${p.percent}%)</span>
      </div>
      <div class="partition-track">
        <div class="partition-fill" style="width: ${p.percent}%; background: ${p.color};"></div>
      </div>
    </div>
  `).join('');
}

function updateMatterUi(matterData) {
  const state = matterData.state || matterData;
  if (!state) return;

  const on = state.onOff;
  const level = state.level || 180;
  const pct = Math.round((level / 254) * 100);
  const color = state.rgbHex || '#4facfe';
  const kelvin = state.colorTemperatureKelvin || 4000;
  const mireds = state.colorTemperatureMireds || 250;

  // Nav item badge
  const navBadge = document.getElementById('navMatterBadge');
  if (navBadge) {
    navBadge.innerText = on ? 'ON' : 'OFF';
    navBadge.className = on ? 'nav-badge nav-badge-green' : 'nav-badge';
  }

  const pwrBadge = document.getElementById('matterPowerBadge');
  if (pwrBadge) {
    pwrBadge.innerText = on ? 'ON (켜짐)' : 'OFF (꺼짐)';
    pwrBadge.style.background = on ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
    pwrBadge.style.color = on ? '#4ade80' : '#ef4444';
  }

  // SVG Bulb Fill and Ambient Glow
  const bulbGlass = document.getElementById('bulbGlass');
  const bulbHalo = document.getElementById('bulbHalo');
  const bulbAmbientRoom = document.getElementById('bulbAmbientRoom');

  if (on) {
    if (bulbGlass) {
      bulbGlass.setAttribute('fill', color);
      bulbGlass.setAttribute('opacity', 0.25 + (level / 254) * 0.75);
    }
    if (bulbHalo) {
      bulbHalo.style.background = color;
      bulbHalo.style.opacity = (level / 254) * 0.75;
      bulbHalo.style.transform = `scale(${0.7 + (level / 254) * 0.6})`;
    }
    if (bulbAmbientRoom) {
      bulbAmbientRoom.style.background = color;
      bulbAmbientRoom.style.opacity = (level / 254) * 0.45;
    }
  } else {
    if (bulbGlass) {
      bulbGlass.setAttribute('fill', '#334155');
      bulbGlass.setAttribute('opacity', 0.3);
    }
    if (bulbHalo) bulbHalo.style.opacity = 0;
    if (bulbAmbientRoom) bulbAmbientRoom.style.opacity = 0.05;
  }

  // Status text
  const titleEl = document.getElementById('bulbStatusTitle');
  const subEl = document.getElementById('bulbStatusSub');
  if (titleEl) titleEl.innerText = on ? `전원 켜짐 — 밝기 ${pct}%` : '전원 꺼짐 (Off)';
  if (subEl) subEl.innerText = `색온도: ${kelvin} K · RGB: ${color.toUpperCase()}`;

  // Sliders sync
  const inLvl = document.getElementById('inputLevel');
  const inKelvin = document.getElementById('inputKelvin');
  const inRgb = document.getElementById('inputRgbColor');
  const hexLbl = document.getElementById('rgbHexLabel');

  if (inLvl) inLvl.value = level;
  const lvlVal = document.getElementById('sliderLevelVal');
  if (lvlVal) lvlVal.innerText = `${pct}% (${level}/254)`;

  if (inKelvin) inKelvin.value = kelvin;
  const kelvinVal = document.getElementById('sliderKelvinVal');
  if (kelvinVal) kelvinVal.innerText = `${kelvin} K (${mireds} Mireds)`;

  if (inRgb) inRgb.value = color;
  if (hexLbl) hexLbl.innerText = color.toUpperCase();
}

// -------------------------------------------------------------
// Power Profiler Real-time Chart
// -------------------------------------------------------------
function renderPowerChart() {
  const canvas = document.getElementById('powerCanvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Clear background
  ctx.fillStyle = '#04070e';
  ctx.fillRect(0, 0, w, h);

  // Grid Lines
  ctx.strokeStyle = '#121d30';
  ctx.lineWidth = 1;
  for (let y = 30; y < h; y += 45) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  if (powerSamples.length < 2) return;

  const maxVal = Math.max(16, ...powerSamples.map(s => s.current_mA * 1.15));

  // Draw Waveform
  ctx.beginPath();
  ctx.strokeStyle = '#00a9ce';
  ctx.lineWidth = 2.5;

  const step = w / (maxPowerSamples - 1);
  const startX = w - (powerSamples.length * step);

  powerSamples.forEach((sample, i) => {
    const x = startX + (i * step);
    const y = h - ((sample.current_mA / maxVal) * (h - 40)) - 20;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Gradient fill under waveform
  ctx.lineTo(w, h);
  ctx.lineTo(Math.max(0, startX), h);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(0, 169, 206, 0.35)');
  grad.addColorStop(1, 'rgba(0, 169, 206, 0.0)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Burst Points
  powerSamples.forEach((sample, i) => {
    if (sample.event === 'Thread TX' || sample.event === 'BLE Adv') {
      const x = startX + (i * step);
      const y = h - ((sample.current_mA / maxVal) * (h - 40)) - 20;
      ctx.fillStyle = sample.event === 'Thread TX' ? '#f59e0b' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function updatePowerSummary(summary) {
  if (!summary) return;
  const kpiEl = document.getElementById('kpiCurrent');
  if (kpiEl) kpiEl.innerHTML = `${summary.current_mA.toFixed(2)} mA <small>@ 3.30V</small>`;

  const navPowerBadge = document.getElementById('navPowerBadge');
  if (navPowerBadge) navPowerBadge.innerText = `${summary.current_mA.toFixed(1)} mA`;

  const statCurr = document.getElementById('statCurrCurrent');
  const statAvg = document.getElementById('statAvgCurrent');
  const statMax = document.getElementById('statMaxCurrent');

  if (statCurr) statCurr.innerText = `${summary.current_mA.toFixed(3)} mA`;
  if (statAvg) statAvg.innerText = `${summary.avg_mA.toFixed(3)} mA`;
  if (statMax) statMax.innerText = `${summary.max_mA.toFixed(3)} mA`;
}

// -------------------------------------------------------------
// Actions & REST API Handlers
// -------------------------------------------------------------

// -------------------------------------------------------------
// Dynamic Board LED Cards Generator (Supports All 6 Boards)
// -------------------------------------------------------------
function renderDashboardLedCards(board, stateLeds) {
  const container = document.getElementById('ledCardGridContainer');
  const subhead = document.getElementById('ledCardSubheading');
  if (!container || !board) return;

  const leds = board.leds || {};
  const currentLeds = stateLeds || (currentBoardState && currentBoardState.leds) || {};

  if (subhead) {
    const pinStr = Object.values(leds).map(l => l.pin).join(', ');
    subhead.innerText = `${board.name} GPIO 포트 (${pinStr}) 즉시 제어`;
  }

  // Check if board is Thingy:53 (Single RGB LED)
  if (board.id === 'thingy53') {
    const isOn = currentLeds.rgb !== false;
    container.className = 'led-card-single-rgb';
    container.innerHTML = `
      <div class="led-ctrl-card active" id="cardLed_rgb" onclick="toggleLed('rgb')">
        <div class="led-card-top">
          <div class="led-indicator-dot on" id="dotLed_rgb" style="background: #00a9ce; box-shadow: 0 0 14px #00a9ce;"></div>
          <span class="led-pin-badge">P0.25-27 (RGB)</span>
        </div>
        <div class="led-card-name">Thingy:53 RGB Optical LED</div>
        <div class="led-card-status" id="statusTextLed_rgb">${isOn ? '점등 (Matter Full Color ON)' : '소등 (OFF)'}</div>
        <button class="led-toggle-btn active" id="btnToggleLed_rgb">토글 (TOGGLE)</button>
        <div class="rgb-quick-palette" onclick="event.stopPropagation()">
          <span class="rgb-swatch" style="background:#00a9ce;" onclick="setThingyColor('#00a9ce')" title="Nordic Cyan"></span>
          <span class="rgb-swatch" style="background:#4ade80;" onclick="setThingyColor('#4ade80')" title="Emerald"></span>
          <span class="rgb-swatch" style="background:#f59e0b;" onclick="setThingyColor('#f59e0b')" title="Amber Warm"></span>
          <span class="rgb-swatch" style="background:#ef4444;" onclick="setThingyColor('#ef4444')" title="Red Alert"></span>
          <span class="rgb-swatch" style="background:#a855f7;" onclick="setThingyColor('#a855f7')" title="Purple"></span>
        </div>
      </div>
    `;
    return;
  }

  const entries = Object.entries(leds);
  container.className = entries.length <= 2 ? 'led-card-grid-1x2' : 'led-card-grid-2x2';

  container.innerHTML = entries.map(([key, info]) => {
    const isOn = currentLeds[key] !== false;
    const isMatter = key === 'led2' || key === 'led1';
    return `
      <div class="led-ctrl-card ${isOn ? 'active' : ''}" id="cardLed_${key}" onclick="toggleLed('${key}')">
        <div class="led-card-top">
          <div class="led-indicator-dot ${isOn ? 'on' : ''}" id="dotLed_${key}" style="background: ${info.color || '#4ade80'}; ${isOn ? `box-shadow: 0 0 10px ${info.color || '#4ade80'};` : ''}"></div>
          <span class="led-pin-badge">${escapeHtml(info.pin)}</span>
        </div>
        <div class="led-card-name">${escapeHtml(key.toUpperCase())}</div>
        <div class="led-card-status" id="statusTextLed_${key}">
          ${isOn ? (isMatter ? '켜짐 (Matter 연동)' : '켜짐 (ON)') : '꺼짐 (OFF)'}
        </div>
        <button class="led-toggle-btn ${isOn ? 'active' : ''}" id="btnToggleLed_${key}">토글 (TOGGLE)</button>
      </div>
    `;
  }).join('');
}

function updateDashboardLedCardsStatus(stateLeds) {
  if (!stateLeds) return;
  Object.entries(stateLeds).forEach(([key, val]) => {
    const isOn = Boolean(val);
    const card = document.getElementById(`cardLed_${key}`);
    const dot = document.getElementById(`dotLed_${key}`);
    const statusTxt = document.getElementById(`statusTextLed_${key}`);
    const btn = document.getElementById(`btnToggleLed_${key}`);

    if (card) card.classList.toggle('active', isOn);
    if (dot) dot.classList.toggle('on', isOn);
    if (statusTxt) {
      if (key === 'led2' || key === 'led1' || key === 'rgb') {
        statusTxt.innerText = isOn ? '켜짐 (Matter 연동)' : '꺼짐 (소등)';
      } else {
        statusTxt.innerText = isOn ? '켜짐 (ON)' : '꺼짐 (OFF)';
      }
    }
    if (btn) btn.classList.toggle('active', isOn);
  });
}

function setThingyColor(hex) {
  if (boardRenderer && boardRenderer.leds && boardRenderer.leds.rgb) {
    boardRenderer.leds.rgb.color = hex;
    boardRenderer.setLedState('rgb', true);
    boardRenderer.triggerLaserLineage({ rgb: true }, true);
  }
  const dot = document.getElementById('dotLed_rgb');
  if (dot) {
    dot.style.background = hex;
    dot.style.boxShadow = `0 0 14px ${hex}`;
  }
  showToast(`🎨 Thingy:53 RGB 색상이 [${hex}]로 설정되었습니다.`, '🎨');
}

// Instant Optimistic UI for Master All LEDs Control
async function setAllLeds(turnOn) {
  const isTurnOn = Boolean(turnOn);
  console.log(`[UI Action] setAllLeds -> ${isTurnOn ? 'ON' : 'OFF'}`);

  // 1. Instant Optimistic UI for Dashboard LED Cards
  if (boardRenderer && boardRenderer.leds) {
    Object.keys(boardRenderer.leds).forEach(key => {
      const card = document.getElementById(`cardLed_${key}`);
      const dot = document.getElementById(`dotLed_${key}`);
      const statusTxt = document.getElementById(`statusTextLed_${key}`);
      const btn = document.getElementById(`btnToggleLed_${key}`);

      if (card) card.classList.toggle('active', isTurnOn);
      if (dot) dot.classList.toggle('on', isTurnOn);
      if (statusTxt) statusTxt.innerText = isTurnOn ? '켜짐 (ON)' : '꺼짐 (OFF)';
      if (btn) btn.classList.toggle('active', isTurnOn);
    });

    boardRenderer.setAllLedsState(isTurnOn);
    const allKeys = {};
    Object.keys(boardRenderer.leds).forEach(k => allKeys[k] = true);
    boardRenderer.triggerLaserLineage(allKeys, isTurnOn);
  }

  showToast(isTurnOn ? '🔆 개발보드의 모든 LED가 켜졌습니다.' : '🚫 개발보드의 모든 LED가 꺼졌습니다.', isTurnOn ? '🔆' : '⭕');

  // Send to hardware / engine
  try {
    const res = await fetch('/api/board/leds/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnOn: isTurnOn })
    });
    const data = await res.json();
    console.log('[Hardware Sync Result]:', data);
  } catch (err) {
    console.error('[setAllLeds Error]:', err);
  }
}

// Instant Optimistic UI for Individual LED Toggle
async function toggleLed(pin) {
  let isCurrentlyOn = false;
  if (currentBoardState && currentBoardState.leds && currentBoardState.leds[pin] !== undefined) {
    isCurrentlyOn = Boolean(currentBoardState.leds[pin]);
  } else if (boardRenderer && boardRenderer.leds[pin]) {
    isCurrentlyOn = Boolean(boardRenderer.leds[pin].active);
  }

  const nextVal = !isCurrentlyOn;

  // Optimistic Card Update
  const card = document.getElementById(`cardLed_${pin}`);
  const dot = document.getElementById(`dotLed_${pin}`);
  const statusTxt = document.getElementById(`statusTextLed_${pin}`);
  const btn = document.getElementById(`btnToggleLed_${pin}`);

  if (card) card.classList.toggle('active', nextVal);
  if (dot) dot.classList.toggle('on', nextVal);
  if (statusTxt) statusTxt.innerText = nextVal ? '켜짐 (ON)' : '꺼짐 (OFF)';
  if (btn) btn.classList.toggle('active', nextVal);

  if (boardRenderer) {
    boardRenderer.setLedState(pin, nextVal);
    const targetObj = {};
    targetObj[pin] = true;
    boardRenderer.triggerLaserLineage(targetObj, nextVal);
  }

  showToast(`💡 ${pin.toUpperCase()} 포트가 ${nextVal ? '점등' : '소등'}되었습니다.`, nextVal ? '💡' : '🌑');

  try {
    await fetch('/api/board/gpio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, value: nextVal })
    });
  } catch (err) {
    console.error('[toggleLed Error]:', err);
  }
}

async function pressButton(button) {
  try {
    showToast(`🔘 버튼 ${button}이 눌렸습니다.`, '🔘');
    await fetch('/api/board/button', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ button })
    });
  } catch (err) {
    console.error(err);
  }
}

async function handleReset(target) {
  showToast(`🔄 ${target.toUpperCase()} 리셋을 수행합니다...`, '🔄');
  try {
    await fetch('/api/board/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target })
    });
  } catch (err) {
    console.error(err);
  }
}

async function setMatterControl(params) {
  try {
    const res = await fetch('/api/matter/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    updateMatterUi(data);
    if (params.onOff !== undefined) {
      showToast(`Matter 조명이 ${params.onOff ? '켜졌습니다' : '꺼졌습니다'}. (보드 LED2 연동)`, '💡');
    }
  } catch (err) {
    console.error(err);
  }
}

function onLevelInput(val) {
  setMatterControl({ level: parseInt(val, 10) });
}

function onKelvinInput(val) {
  setMatterControl({ colorTemperatureKelvin: parseInt(val, 10) });
}

function onRgbColorChange(hex) {
  setMatterControl({ rgbHex: hex });
}

async function applyScene(sceneId) {
  try {
    showToast(`🎨 씬 적용: ${sceneId}`, '🎨');
    const res = await fetch('/api/matter/scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sceneId })
    });
    const data = await res.json();
    if (data.state) updateMatterUi(data.state);
  } catch (err) {
    console.error(err);
  }
}

async function triggerAlertEvent(type, label, color) {
  try {
    showToast(`🚨 이벤트 알림 발송: ${label}`, '🚨');
    await fetch('/api/matter/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: type,
        label,
        alertColorHex: color,
        durationSeconds: 3
      })
    });
  } catch (err) {
    console.error(err);
  }
}

async function setOperationMode(mode) {
  const isConnected = Boolean(currentBoardState && currentBoardState.boardInfo && currentBoardState.boardInfo.jlinkConnected);
  if (mode === 'hardware' && !isConnected) {
    showToast('⚠️ 물리 보드 미감지: USB 케이블을 연결해야 하드웨어 제어가 가능합니다.', '⚠️');
  } else {
    showToast(`⚙️ 동작 모드 전환: ${mode === 'hardware' ? '물리 하드웨어' : '가상 엔진'}`, '⚙️');
  }
  try {
    await fetch('/api/board/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
  } catch (err) {
    console.error(err);
  }
}

async function rescanJLink() {
  showToast('🔍 J-Link 프로브를 스캔하는 중...', '🔍');
  try {
    const res = await fetch('/api/jlink/scan');
    const data = await res.json();
    if (data.connected) {
      showToast(`🟢 물리 프로브 감지됨 (S/N: ${data.serialNumber}, ${data.targetVoltage}V)`, '✅');
    } else {
      showToast('⚠️ 물리 보드가 감지되지 않았습니다. (가상 에뮬레이터 모드 유지)', '⚠️');
    }
  } catch (err) {
    console.error(err);
  }
}

async function eraseFlashMemory(area) {
  const isHw = currentBoardState && currentBoardState.boardInfo && currentBoardState.boardInfo.mode === 'hardware';
  const isConnected = Boolean(currentBoardState && currentBoardState.boardInfo && currentBoardState.boardInfo.jlinkConnected);

  if (isHw && !isConnected) {
    showToast('❌ 플래시 삭제 차단: 물리 보드가 연결되어 있지 않습니다.', '🚫');
    alert('❌ 플래시 삭제 불가\n\n물리 하드웨어 모드로 설정되어 있으나, USB로 연결된 개발보드(J-Link)가 없습니다.\n\n1. 보드를 USB로 연결한 뒤 [USB 프로브 다시 스캔]을 실행하거나\n2. 상단의 [💻 가상 엔진] 모드로 전환 후 진행하세요.');
    return;
  }

  if (!confirm(`플래시 메모리 [${area}] 영역을 정말로 초기화하시겠습니까?`)) return;
  showToast(`🧹 플래시 메모리(${area}) 삭제 중...`, '🧹');
  try {
    const res = await fetch('/api/board/flash/erase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area })
    });
    const data = await res.json();
    if (data.success) {
      showToast('✅ 플래시 삭제가 완료되었습니다.', '✅');
    } else {
      showToast(`❌ 플래시 삭제 차단: ${data.message || '오류 발생'}`, '🚫');
      alert(`❌ 플래시 삭제 실패: ${data.message}`);
    }
  } catch (err) {
    console.error(err);
  }
}

async function flashSampleFirmware(sample) {
  const isHw = currentBoardState && currentBoardState.boardInfo && currentBoardState.boardInfo.mode === 'hardware';
  const isConnected = Boolean(currentBoardState && currentBoardState.boardInfo && currentBoardState.boardInfo.jlinkConnected);

  if (isHw && !isConnected) {
    showToast('❌ 플래시 차단: 물리 보드가 연결되어 있지 않습니다.', '🚫');
    alert('❌ 플래시 불가\n\n물리 하드웨어 모드로 설정되어 있으나, USB로 연결된 개발보드(J-Link)가 감지되지 않았습니다.\n\n1. 보드를 USB 케이블로 PC에 연결한 뒤 [USB 프로브 다시 스캔]을 실행하거나\n2. 상단의 [💻 가상 엔진] 모드로 전환 후 진행하세요.');
    return;
  }

  showToast(isHw ? `⚡ 물리 보드에 펌웨어 [${sample}] 플래시 진행 중...` : `💻 가상 트윈 메모리에 [${sample}] 시뮬레이션 플래시 중...`, '⚡');
  try {
    const res = await fetch('/api/board/flash/program', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample })
    });
    const data = await res.json();
    if (data.success) {
      showToast(isHw ? '✅ 물리 펌웨어 프로그래밍 완료!' : '✅ 가상 펌웨어 프로그래밍 완료 (에뮬레이터)', '✅');
    } else {
      showToast(`❌ 플래시 차단: ${data.message || '오류 발생'}`, '🚫');
      alert(`❌ 플래시 실패: ${data.message}`);
    }
  } catch (err) {
    console.error(err);
  }
}

// -------------------------------------------------------------
// Terminal Logging & CLI
// -------------------------------------------------------------
function appendLogLine(log) {
  const container = document.getElementById('terminalLogs');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'log-line';
  div.innerHTML = `
    <span class="log-time">[${log.timestamp}]</span>
    <span class="log-lvl-${log.level}">&lt;${log.level}&gt;</span>
    <span class="log-mod">${log.module}:</span>
    <span class="log-msg">${escapeHtml(log.message)}</span>
  `;
  container.appendChild(div);
}

function clearLogs() {
  const el = document.getElementById('terminalLogs');
  if (el) el.innerHTML = '';
}

function executeQuickCmd(cmd) {
  const input = document.getElementById('terminalInput');
  if (input) {
    input.value = cmd;
    sendCliCommand(new Event('submit'));
  }
}

async function sendCliCommand(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('terminalInput');
  if (!input) return;
  const cmd = input.value.trim();
  if (!cmd) return;

  input.value = '';
  try {
    const res = await fetch('/api/terminal/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd })
    });
    const data = await res.json();
    if (data.response) {
      appendLogLine({
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + '.000',
        level: 'CLI',
        module: 'out',
        message: data.response
      });
      const container = document.getElementById('terminalLogs');
      if (container) container.scrollTop = container.scrollHeight;
    }
  } catch (err) {
    console.error(err);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// -------------------------------------------------------------
// Real-time Data Lineage Flow Animation & Pipeline Tracking
// -------------------------------------------------------------
function animateLineageFlow(lineage) {
  if (!lineage) return;

  const totalBadge = document.getElementById('lineageTotalLatency');
  if (totalBadge) {
    totalBadge.innerText = `총 지연: ${lineage.totalLatencyMs || 12}ms (정상)`;
  }

  const fullBadge = document.getElementById('lineageFullLatencyBadge');
  if (fullBadge) {
    fullBadge.innerText = `⚡ 총 지연시간: ${lineage.totalLatencyMs || 12}ms (VERIFIED)`;
  }

  // Update Inspector Cards
  const cmdEl = document.getElementById('inspCmd');
  const payloadEl = document.getElementById('inspPayload');
  const regEl = document.getElementById('inspReg');
  const statusEl = document.getElementById('inspStatus');

  if (cmdEl) cmdEl.innerText = lineage.command || 'GPIO Operation';
  if (payloadEl && lineage.stages && lineage.stages[1]) payloadEl.innerText = lineage.stages[1].details;
  if (regEl && lineage.stages && lineage.stages[4]) regEl.innerText = lineage.stages[4].details;
  if (statusEl && lineage.stages && lineage.stages[5]) statusEl.innerText = lineage.stages[5].details;

  // Staggered Node Glow Animation (Stages 1 through 6)
  for (let i = 1; i <= 6; i++) {
    const nodeEl = document.getElementById(`nodeStage${i}`);
    const metricEl = document.getElementById(`metricStage${i}`);
    const fullStage = document.getElementById(`fullStage${i}`);
    const fullMetric = document.getElementById(`fullMetric${i}`);
    
    if (lineage.stages && lineage.stages[i - 1]) {
      const stage = lineage.stages[i - 1];
      if (metricEl) metricEl.innerText = `${stage.latencyMs}ms`;
      if (fullMetric) fullMetric.innerText = `${stage.latencyMs} ms`;
    }

    if (nodeEl) {
      setTimeout(() => {
        nodeEl.style.transform = 'scale(1.1)';
        nodeEl.style.borderColor = '#38bdf8';
        setTimeout(() => {
          nodeEl.style.transform = 'scale(1)';
          nodeEl.style.borderColor = 'rgba(56, 189, 248, 0.4)';
        }, 300);
      }, (i - 1) * 60);
    }

    if (fullStage) {
      setTimeout(() => {
        fullStage.classList.add('active');
        setTimeout(() => fullStage.classList.remove('active'), 500);
      }, (i - 1) * 60);
    }
  }

  // Prepend to Lineage History Table
  appendLineageHistoryRecord(lineage);
}

function appendLineageHistoryRecord(lineage) {
  const container = document.getElementById('lineageHistoryContainer');
  if (!container) return;

  const card = document.createElement('div');
  card.className = 'lineage-record-card';
  card.innerHTML = `
    <div>
      <span class="record-cmd">${escapeHtml(lineage.command)}</span>
      <small style="margin-left: 10px; color: var(--text-muted); font-family: var(--font-mono);">[${lineage.requestId || 'REQ'}]</small>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-family: var(--font-mono); color: #4ade80; font-weight: 700;">${lineage.totalLatencyMs}ms</span>
      <span style="color: var(--nordic-cyan); font-size: 0.72rem;">6/6 STAGES OK</span>
    </div>
  `;
  container.prepend(card);
}

// -------------------------------------------------------------
// DEVELOPER SESSIONS & ACCESS AUDIT LOG SYSTEM
// -------------------------------------------------------------
function updateTopbarProfileUi(profile) {
  if (!profile) return;
  const avatar = document.getElementById('topbarAvatar');
  const name = document.getElementById('topbarUserName');
  const role = document.getElementById('topbarUserRole');

  if (avatar && profile.avatar) avatar.innerText = profile.avatar;
  if (name && profile.name) name.innerText = profile.name;
  if (role && profile.role) role.innerText = profile.role;
}

function renderActiveSessions(summary) {
  if (!summary) return;
  activeSessionsSummary = summary;

  // Update badges
  const badgeNav = document.getElementById('navActiveSessionsBadge');
  const kpiCount = document.getElementById('kpiActiveSessionsCount');
  const kpiLogs = document.getElementById('kpiTotalAuditLogs');

  if (badgeNav) badgeNav.innerText = `${summary.activeCount || 1}명 온라인`;
  if (kpiCount) kpiCount.innerText = `${summary.activeCount || 1} 세션 (온라인)`;
  if (kpiLogs && currentAuditLogs) kpiLogs.innerText = `${currentAuditLogs.length} 건`;

  const container = document.getElementById('activeSessionsGrid');
  if (!container) return;

  const sessions = summary.activeSessions || [];
  if (sessions.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem; padding: 10px;">접속 중인 활성 세션이 없습니다.</div>`;
    return;
  }

  container.innerHTML = sessions.map(s => {
    const isMe = s.sessionId === clientSessionId;
    const connTime = s.connectedAt ? new Date(s.connectedAt).toLocaleTimeString() : '방금';

    return `
      <div class="session-card ${isMe ? 'is-current' : ''}">
        <div class="session-card-header">
          <div class="session-user-group">
            <span class="user-avatar-circle" style="font-size: 1.2rem;">${s.profile ? s.profile.avatar : '💻'}</span>
            <div>
              <div style="font-size: 0.86rem; font-weight: 700; color: #fff;">
                ${escapeHtml(s.profile ? s.profile.name : '개발자')}
                ${isMe ? '<span class="status-badge status-running" style="font-size: 0.62rem; margin-left: 4px;">내 세션 (Current)</span>' : ''}
              </div>
              <div style="font-size: 0.7rem; color: var(--nordic-cyan);">${escapeHtml(s.profile ? s.profile.role : '엔지니어')}</div>
            </div>
          </div>
          <span class="online-indicator-dot" title="온라인 상태"></span>
        </div>

        <div style="font-size: 0.72rem; color: #cbd5e1; display: flex; flex-direction: column; gap: 3px; background: rgba(0,0,0,0.25); padding: 8px; border-radius: 6px;">
          <div><strong style="color: #94a3b8;">IP / 환경:</strong> <code>${escapeHtml(s.ip)}</code> · ${escapeHtml(s.os)} (${escapeHtml(s.browser)})</div>
          <div><strong style="color: #94a3b8;">접속 시각:</strong> ${connTime} · <strong>누적 작업:</strong> ${s.actionCount || 1}회</div>
          <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong style="color: #4ade80;">최근 액션:</strong> ${escapeHtml(s.lastAction || '세션 연결됨')}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderAuditLogs(logs = []) {
  const tbody = document.getElementById('auditLogsTableBody');
  const kpiLogs = document.getElementById('kpiTotalAuditLogs');
  if (kpiLogs) kpiLogs.innerText = `${logs.length} 건`;
  if (!tbody) return;

  const filtered = logs.filter(l => {
    // Category filter
    if (currentAuditCategory !== 'all') {
      if (!l.eventType.toUpperCase().includes(currentAuditCategory.toUpperCase())) {
        return false;
      }
    }
    // Search query filter
    if (currentAuditSearch.trim()) {
      const q = currentAuditSearch.toLowerCase();
      const match = (l.userName || '').toLowerCase().includes(q) ||
                    (l.userRole || '').toLowerCase().includes(q) ||
                    (l.details || '').toLowerCase().includes(q) ||
                    (l.ip || '').toLowerCase().includes(q) ||
                    (l.eventType || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">일치하는 감사 로그가 없습니다.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(l => {
    const isSuccess = l.status === 'SUCCESS';
    return `
      <tr>
        <td style="font-family: var(--font-mono); font-size: 0.72rem; color: #94a3b8;">${l.timeFormatted || l.timestamp.split('T')[1].slice(0, 8)}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; color: #fff;">
            <span>${l.userAvatar || '👤'}</span>
            <span>${escapeHtml(l.userName || '시스템')}</span>
          </div>
        </td>
        <td style="color: var(--nordic-cyan); font-size: 0.74rem;">${escapeHtml(l.userRole || '-')}</td>
        <td style="font-family: var(--font-mono); font-size: 0.72rem;">${escapeHtml(l.ip || '127.0.0.1')}</td>
        <td style="font-size: 0.72rem; color: #cbd5e1;">${escapeHtml(l.clientEnv || '-')}</td>
        <td><span class="cluster-tag" style="background: rgba(255,255,255,0.06); color: #cbd5e1; border-color: rgba(255,255,255,0.15);">${escapeHtml(l.eventType)}</span></td>
        <td style="font-size: 0.74rem; color: #f1f5f9;">${escapeHtml(l.details || '-')}</td>
        <td>
          <span style="font-size: 0.68rem; font-weight: 700; color: ${isSuccess ? '#4ade80' : '#ef4444'};">
            ${isSuccess ? '● OK' : '✕ FAIL'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAuditLogsCategory(category, el) {
  currentAuditCategory = category;
  document.querySelectorAll('#accessLogsTab .sample-filter-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderAuditLogs(currentAuditLogs);
}

function filterAuditLogsTable(query) {
  currentAuditSearch = query || '';
  renderAuditLogs(currentAuditLogs);
}

function exportAuditLogsCsv() {
  window.open('/api/access-logs/export', '_blank');
  showToast('📥 감사 로그 CSV 다운로드를 시작합니다.', '📥');
}

// -------------------------------------------------------------
// Developer Profile Modal Actions
// -------------------------------------------------------------
function openDeveloperModal() {
  const modal = document.getElementById('devProfileModal');
  if (modal) {
    modal.classList.add('active');
  }
}

function closeDeveloperModal() {
  const modal = document.getElementById('devProfileModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

const PRESET_PROFILES = {
  lead_dev: { name: '임베디드 수석 엔지니어', role: 'Firmware Architect', email: 'firmware-lead@nordic-lab.local', avatar: '👨‍💻' },
  qa_engineer: { name: 'Matter 표준 QA 엔지니어', role: 'Certification Tester', email: 'qa-tester@nordic-lab.local', avatar: '🧪' },
  security_auditor: { name: 'Security 1.1 감사관', role: 'Compliance Auditor', email: 'sec-audit@nordic-lab.local', avatar: '🛡️' },
  guest_observer: { name: '게스트 참관자 (Guest)', role: 'Lab Observer', email: 'guest@nordic-lab.local', avatar: '👀' }
};

function applyPresetProfile(presetId, el) {
  document.querySelectorAll('.dev-preset-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');

  const p = PRESET_PROFILES[presetId];
  if (!p) return;

  const nameInput = document.getElementById('devModalNameInput');
  const roleInput = document.getElementById('devModalRoleInput');
  const emailInput = document.getElementById('devModalEmailInput');
  const avatarInput = document.getElementById('devModalAvatarInput');

  if (nameInput) nameInput.value = p.name;
  if (roleInput) roleInput.value = p.role;
  if (emailInput) emailInput.value = p.email;
  if (avatarInput) avatarInput.value = p.avatar;
}

async function saveDeveloperProfile() {
  const name = document.getElementById('devModalNameInput').value.trim();
  const role = document.getElementById('devModalRoleInput').value.trim();
  const email = document.getElementById('devModalEmailInput').value.trim();
  const avatar = document.getElementById('devModalAvatarInput').value.trim() || '👨‍💻';

  const profile = { name, role, email, avatar };
  localStorage.setItem('nordic_studio_profile', JSON.stringify(profile));

  updateTopbarProfileUi(profile);
  closeDeveloperModal();

  showToast(`👤 개발자 프로필 적용 완료: ${name} (${role})`, '✅');

  try {
    await fetch('/api/sessions/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': clientSessionId
      },
      body: JSON.stringify({ sessionId: clientSessionId, ...profile })
    });
  } catch (err) {
    console.error(err);
  }
}

// -------------------------------------------------------------
// Initialization on DOM Ready
// -------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  // Load saved developer profile if any
  try {
    const saved = localStorage.getItem('nordic_studio_profile');
    if (saved) {
      const p = JSON.parse(saved);
      updateTopbarProfileUi(p);
      fetch('/api/sessions/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': clientSessionId },
        body: JSON.stringify({ sessionId: clientSessionId, ...p })
      }).catch(() => {});
    }
  } catch (err) {}
  // Initialize Photorealistic Canvas Engine
  if (typeof PhotorealDKRenderer === 'function') {
    boardRenderer = new PhotorealDKRenderer('photorealCanvas');
    window.boardRenderer = boardRenderer;
    if (typeof currentActiveBoard !== 'undefined' && currentActiveBoard) {
      boardRenderer.setBoardModel(currentActiveBoard.id, currentActiveBoard);
      if (typeof renderDashboardLedCards === 'function') {
        renderDashboardLedCards(currentActiveBoard);
      }
    }
  }
  initSse();
});
