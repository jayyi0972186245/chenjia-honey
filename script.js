const hours = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, "0")}:00`);

const environmentData = {
  temperature: {
    label: "溫度",
    unit: "°C",
    color: "#d4553f",
    values: [26.1, 25.8, 25.7, 25.9, 26.2, 26.5, 27.4, 28.6, 29.8, 30.5, 31.1, 31.4, 31.3, 30.9, 30.3, 29.4, 28.8, 28.2, 27.8, 27.5, 27.2, 26.9, 26.7, 26.4],
  },
  humidity: {
    label: "濕度",
    unit: "%",
    color: "#2d82bd",
    values: [84, 85, 85, 84, 83, 82, 79, 75, 70, 66, 63, 61, 60, 62, 65, 68, 72, 76, 79, 81, 82, 83, 84, 84],
  },
  co2: {
    label: "CO2",
    unit: " ppm",
    color: "#765ecb",
    values: [612, 628, 641, 650, 665, 682, 708, 736, 762, 788, 815, 842, 855, 848, 826, 801, 775, 742, 716, 690, 668, 646, 628, 618],
  },
};

const visibleSeries = new Set(Object.keys(environmentData));
const canvas = document.querySelector("#environmentChart");
const tooltip = document.querySelector("#chartTooltip");
const ctx = canvas.getContext("2d");
let hoverIndex = null;
let railDirection = "向右";

function scaleSeriesValue(key, value, top, bottom) {
  const values = environmentData[key].values;
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
  const padding = {
    top: 34,
    right: 28,
    bottom: 52,
    left: 54,
  };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const activeKeys = [...visibleSeries];

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcf7";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#dce3d2";
  ctx.lineWidth = 1;
  for (let index = 0; index <= 4; index += 1) {
    const y = padding.top + (plotHeight / 4) * index;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#637268";
  ctx.font = "800 16px Microsoft JhengHei, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("00:00", padding.left, height - 24);
  ctx.textAlign = "right";
  ctx.fillText("23:00", width - padding.right, height - 24);

  activeKeys.forEach((key) => {
    const series = environmentData[key];
    ctx.beginPath();
    series.values.forEach((value, index) => {
      const x = padding.left + (plotWidth / 23) * index;
      const y = scaleSeriesValue(key, value, padding.top, padding.top + plotHeight);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = series.color;
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  });

  if (hoverIndex !== null) {
    const x = padding.left + (plotWidth / 23) * hoverIndex;
    ctx.strokeStyle = "rgba(31, 42, 36, 0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();

    activeKeys.forEach((key) => {
      const series = environmentData[key];
      const y = scaleSeriesValue(key, series.values[hoverIndex], padding.top, padding.top + plotHeight);
      ctx.fillStyle = "#fbfaf4";
      ctx.strokeStyle = series.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }
}

function updateTooltip(event) {
  const rect = canvas.getBoundingClientRect();
  const pointerX = (event.touches?.[0]?.clientX ?? event.clientX) - rect.left;
  const paddingLeft = 54;
  const paddingRight = 28;
  const plotWidth = rect.width - paddingLeft - paddingRight;
  const rawIndex = Math.round(((pointerX - paddingLeft) / plotWidth) * 23);
  hoverIndex = Math.max(0, Math.min(23, rawIndex));

  const rows = [...visibleSeries].map((key) => {
    const series = environmentData[key];
    return `${series.label} ${series.values[hoverIndex]}${series.unit}`;
  });

  tooltip.hidden = false;
  tooltip.innerHTML = `<strong>${hours[hoverIndex]}</strong><br>${rows.join("<br>")}`;
  tooltip.style.left = `${paddingLeft + (plotWidth / 23) * hoverIndex}px`;
  tooltip.style.top = `${rect.height - 54}px`;
  drawChart();
}

function hideTooltip() {
  hoverIndex = null;
  tooltip.hidden = true;
  drawChart();
}

function updateMetricCards() {
  const formatRange = (key) => {
    const { values, unit } = environmentData[key];
    return {
      latest: `${values.at(-1)}${unit}`,
      range: `低 ${Math.min(...values)}${unit} ｜ 高 ${Math.max(...values)}${unit}`,
    };
  };

  const temperature = formatRange("temperature");
  const humidity = formatRange("humidity");
  const co2 = formatRange("co2");

  document.querySelector("#temperatureNow").textContent = `最新 ${temperature.latest}`;
  document.querySelector("#temperatureRange").textContent = temperature.range;
  document.querySelector("#humidityNow").textContent = `最新 ${humidity.latest}`;
  document.querySelector("#humidityRange").textContent = humidity.range;
  document.querySelector("#co2Now").textContent = `最新 ${co2.latest}`;
  document.querySelector("#co2Range").textContent = co2.range;
}

function updateSystemClock() {
  const now = new Date();
  const timeText = now.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
  });
  document.querySelector("#lastUpdate").textContent = timeText;
}

function updateRailDirection() {
  railDirection = railDirection === "向右" ? "向左" : "向右";
  document.querySelector("#railDirection").textContent = railDirection;
}

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
window.addEventListener("resize", drawChart);

updateMetricCards();
updateSystemClock();
drawChart();
setInterval(updateSystemClock, 60 * 1000);
setInterval(updateRailDirection, 6000);
