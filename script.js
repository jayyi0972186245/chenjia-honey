/* ============================================================
   陳加蜂蜜智慧蜂箱監測儀表板
   資料流：優先讀取 data/environment.json（Jetson 產出），
           讀取失敗時退回內建示範資料，畫面不會空白。
   ============================================================ */

/* ---- 顯示設定：前端負責樣式（標籤 / 單位 / 顏色），Jetson 只需送數字 ---- */
const SERIES_CONFIG = {
  temperature: { label: "溫度", unit: "°C", color: "#d4553f" },
  humidity: { label: "濕度", unit: "%", color: "#2d82bd" },
  co2: { label: "CO2", unit: " ppm", color: "#765ecb" },
};

const DEFAULT_LABELS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

/* ---- 示範資料：接上 Jetson 前用這組維持畫面 ---- */
const DEMO_DATA = {
  updatedAt: null,
  labels: DEFAULT_LABELS,
  series: {
    temperature: [26.1, 25.8, 25.7, 25.9, 26.2, 26.5, 27.4, 28.6, 29.8, 30.5, 31.1, 31.4, 31.3, 30.9, 30.3, 29.4, 28.8, 28.2, 27.8, 27.5, 27.2, 26.9, 26.7, 26.4],
    humidity: [84, 85, 85, 84, 83, 82, 79, 75, 70, 66, 63, 61, 60, 62, 65, 68, 72, 76, 79, 81, 82, 83, 84, 84],
    co2: [612, 628, 641, 650, 665, 682, 708, 736, 762, 788, 815, 842, 855, 848, 826, 801, 775, 742, 716, 690, 668, 646, 628, 618],
  },
  rail: { status: "掃描中", direction: "向右", mode: "連續巡航" },
};

/* ---- 執行期狀態 ---- */
const state = {
  source: "demo",            // "live"（已讀到 JSON）| "demo"（退回示範）
  updatedAt: null,           // Date 或 null
  labels: DEFAULT_LABELS.slice(),
  series: structuredClone(DEMO_DATA.series),
  rail: { ...DEMO_DATA.rail },
};

const DATA_URL = "data/environment.json";
const REFRESH_MS = 60 * 1000;        // 每 60 秒抓一次
const STALE_MS = 10 * 60 * 1000;     // 資料超過 10 分鐘未更新 → 標示延遲

const visibleSeries = new Set(Object.keys(SERIES_CONFIG));
const canvas = document.querySelector("#environmentChart");
const tooltip = document.querySelector("#chartTooltip");
const ctx = canvas.getContext("2d");
let hoverIndex = null;

/* ============================================================
   資料讀取
   ============================================================ */
async function fetchData() {
  try {
    const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    applyData(await res.json(), "live");
  } catch (err) {
    applyData(DEMO_DATA, "demo");
  }
}

function applyData(data, source) {
  state.source = source;
  state.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
  state.labels = Array.isArray(data.labels) && data.labels.length ? data.labels : DEFAULT_LABELS;

  Object.keys(SERIES_CONFIG).forEach((key) => {
    const incoming = data.series?.[key];
    state.series[key] = Array.isArray(incoming) && incoming.length ? incoming : DEMO_DATA.series[key];
  });

  if (data.rail) state.rail = { ...state.rail, ...data.rail };
  render();
}

/* ============================================================
   繪圖：24 小時折線圖（多單位，各序列獨立正規化）
   ============================================================ */
function scaleSeriesValue(key, value, top, bottom) {
  const values = state.series[key];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.12 || 1;
  return bottom - ((value - (min - padding)) / ((max + padding) - (min - padding))) * (bottom - top);
}

function drawChart() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 34, right: 28, bottom: 52, left: 54 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const activeKeys = [...visibleSeries];

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcf7";
  ctx.fillRect(0, 0, width, height);

  // 水平格線
  ctx.strokeStyle = "#dce3d2";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (plotHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  // X 軸端點標籤（跟著資料的 labels 走）
  ctx.fillStyle = "#637268";
  ctx.font = "700 15px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(state.labels[0] ?? "00:00", padding.left, height - 24);
  ctx.textAlign = "right";
  ctx.fillText(state.labels.at(-1) ?? "23:00", width - padding.right, height - 24);

  const lastIndex = state.labels.length - 1 || 23;

  activeKeys.forEach((key) => {
    const series = state.series[key];
    const points = series.map((value, index) => ({
      x: padding.left + (plotWidth / lastIndex) * index,
      y: scaleSeriesValue(key, value, padding.top, padding.top + plotHeight),
    }));

    // 單一序列時加上柔和面積填色，增加層次
    if (activeKeys.length === 1) {
      const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotHeight);
      grad.addColorStop(0, `${SERIES_CONFIG[key].color}2e`);
      grad.addColorStop(1, `${SERIES_CONFIG[key].color}00`);
      ctx.beginPath();
      points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.lineTo(points.at(-1).x, padding.top + plotHeight);
      ctx.lineTo(points[0].x, padding.top + plotHeight);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = SERIES_CONFIG[key].color;
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    // 最新值標記（永遠可見）
    const last = points.at(-1);
    ctx.fillStyle = "#fbfaf4";
    ctx.strokeStyle = SERIES_CONFIG[key].color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // 游標指示線與圓點
  if (hoverIndex !== null) {
    const x = padding.left + (plotWidth / lastIndex) * hoverIndex;
    ctx.strokeStyle = "rgba(31, 42, 36, 0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();

    activeKeys.forEach((key) => {
      const y = scaleSeriesValue(key, state.series[key][hoverIndex], padding.top, padding.top + plotHeight);
      ctx.fillStyle = "#fbfaf4";
      ctx.strokeStyle = SERIES_CONFIG[key].color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }
}

/* ============================================================
   Tooltip
   ============================================================ */
function updateTooltip(event) {
  const rect = canvas.getBoundingClientRect();
  const pointerX = (event.touches?.[0]?.clientX ?? event.clientX) - rect.left;
  const paddingLeft = 54;
  const paddingRight = 28;
  const plotWidth = rect.width - paddingLeft - paddingRight;
  const lastIndex = state.labels.length - 1 || 23;
  const rawIndex = Math.round(((pointerX - paddingLeft) / plotWidth) * lastIndex);
  hoverIndex = Math.max(0, Math.min(lastIndex, rawIndex));

  const rows = [...visibleSeries].map((key) => {
    const cfg = SERIES_CONFIG[key];
    return `${cfg.label} ${state.series[key][hoverIndex]}${cfg.unit}`;
  });

  tooltip.hidden = false;
  tooltip.innerHTML = `<strong>${state.labels[hoverIndex]}</strong><br>${rows.join("<br>")}`;
  tooltip.style.left = `${paddingLeft + (plotWidth / lastIndex) * hoverIndex}px`;
  tooltip.style.top = `${rect.height - 54}px`;
  drawChart();
}

function hideTooltip() {
  hoverIndex = null;
  tooltip.hidden = true;
  drawChart();
}

/* ============================================================
   卡片 / 狀態列 / 滑軌資訊
   ============================================================ */
function connectionInfo() {
  if (state.source === "demo") return { text: "示範資料", cls: "demo" };
  if (!state.updatedAt) return { text: "Online", cls: "ok" };
  const age = Date.now() - state.updatedAt.getTime();
  if (age > STALE_MS) return { text: "資料延遲", cls: "stale" };
  return { text: "Online", cls: "ok" };
}

function updateStatusStrip() {
  const conn = connectionInfo();
  const connEl = document.querySelector("#connectionStatus");
  if (connEl) {
    connEl.textContent = conn.text;
    connEl.className = conn.cls;
  }

  const lastEl = document.querySelector("#lastUpdate");
  if (lastEl) {
    lastEl.textContent = state.updatedAt
      ? state.updatedAt.toLocaleString("zh-TW", { hour: "2-digit", minute: "2-digit", month: "2-digit", day: "2-digit" })
      : "—";
  }
}

function updateMetricCards() {
  Object.keys(SERIES_CONFIG).forEach((key) => {
    const cfg = SERIES_CONFIG[key];
    const values = state.series[key];
    const nowEl = document.querySelector(`#${key}Now`);
    const rangeEl = document.querySelector(`#${key}Range`);
    if (nowEl) nowEl.textContent = `${values.at(-1)}${cfg.unit}`;
    if (rangeEl) rangeEl.textContent = `低 ${Math.min(...values)}${cfg.unit} ｜ 高 ${Math.max(...values)}${cfg.unit}`;
  });
}

function updateRailInfo() {
  const dirEl = document.querySelector("#railDirection");
  const statusEl = document.querySelector("#railStatus");
  const modeEl = document.querySelector("#railMode");
  if (dirEl) dirEl.textContent = state.rail.direction ?? "向右";
  if (statusEl) statusEl.textContent = state.rail.status ?? "掃描中";
  if (modeEl) modeEl.textContent = state.rail.mode ?? "連續巡航";
}

function render() {
  updateStatusStrip();
  updateMetricCards();
  updateRailInfo();
  drawChart();
}

/* ============================================================
   滑軌動畫：容器相對距離，方向文字跟著實際移動翻轉
   ============================================================ */
const railCar = document.querySelector(".rail-car");
const railTrack = document.querySelector(".rail-track");

function sizeRail() {
  if (!railCar || !railTrack) return;
  const trackW = railTrack.clientWidth;
  const start = trackW * 0.07;
  const end = trackW * 0.92 - railCar.offsetWidth;
  railCar.style.setProperty("--rail-travel", `${Math.max(0, end - start)}px`);
}

// 示範模式下，讓「向右/向左」和實際動畫同步；接真實資料後改用資料值
if (railCar) {
  railCar.addEventListener("animationiteration", () => {
    if (state.source !== "demo") return;
    state.rail.direction = state.rail.direction === "向右" ? "向左" : "向右";
    updateRailInfo();
  });
}

/* ============================================================
   事件綁定
   ============================================================ */
document.querySelectorAll(".legend-item").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.series;
    if (visibleSeries.has(key) && visibleSeries.size > 1) {
      visibleSeries.delete(key);
      button.classList.remove("active");
    } else {
      visibleSeries.add(key);
      button.classList.add("active");
    }
    hideTooltip();
  });
});

canvas.addEventListener("mousemove", updateTooltip);
canvas.addEventListener("touchmove", updateTooltip, { passive: true });
canvas.addEventListener("mouseleave", hideTooltip);
canvas.addEventListener("touchend", hideTooltip);
window.addEventListener("resize", () => {
  sizeRail();
  drawChart();
});

/* ============================================================
   啟動
   ============================================================ */
sizeRail();
fetchData();
setInterval(fetchData, REFRESH_MS);
