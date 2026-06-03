const hours = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, "0")}:00`);

const weatherData = {
  temperature: {
    label: "溫度",
    unit: "°C",
    color: "#cf503b",
    values: [26.2, 25.5, 25.5, 25.8, 26.1, 26.0, 27.6, 29.1, 30.2, 30.6, 31.2, 31.3, 31.3, 31.0, 31.6, 31.0, 30.5, 29.6, 27.7, 27.7, 27.8, 28.0, 27.6, 27.2],
  },
  humidity: {
    label: "濕度",
    unit: "%",
    color: "#2e7fbe",
    values: [78, 78, 82, 82, 83, 85, 78, 63, 60, 59, 59, 58, 60, 63, 60, 63, 65, 70, 78, 85, 84, 81, 82, 85],
  },
  wind: {
    label: "風速",
    unit: " km/h",
    color: "#7868c9",
    values: [2.8, 3.6, 2.7, 1.9, 2.2, 2.1, 6.0, 9.5, 9.0, 9.8, 10.2, 11.5, 13.2, 15.2, 12.8, 12.6, 13.7, 16.0, 14.0, 12.0, 13.8, 14.6, 16.2, 18.1],
  },
};

const visibleSeries = new Set(Object.keys(weatherData));
const canvas = document.querySelector("#weatherChart");
const tooltip = document.querySelector("#chartTooltip");
const ctx = canvas.getContext("2d");
let hoverIndex = null;

function scaleValue(value, min, max, top, bottom) {
  if (max === min) return (top + bottom) / 2;
  return bottom - ((value - min) / (max - min)) * (bottom - top);
}

function getBounds(seriesKeys) {
  const values = seriesKeys.flatMap((key) => weatherData[key].values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.12 || 1;
  return { min: min - padding, max: max + padding };
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
  const { min, max } = getBounds(activeKeys.length ? activeKeys : Object.keys(weatherData));

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcf7";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#dce3d2";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#657064";
  ctx.font = "700 14px Microsoft JhengHei, sans-serif";
  ctx.textBaseline = "middle";

  for (let index = 0; index <= 4; index += 1) {
    const y = padding.top + (plotHeight / 4) * index;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#657064";
  ctx.font = "800 16px Microsoft JhengHei, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("00:00", padding.left, height - 24);
  ctx.textAlign = "right";
  ctx.fillText("23:00", width - padding.right, height - 24);

  activeKeys.forEach((key) => {
    const series = weatherData[key];
    ctx.beginPath();
    series.values.forEach((value, index) => {
      const x = padding.left + (plotWidth / 23) * index;
      const y = scaleValue(value, min, max, padding.top, padding.top + plotHeight);
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
    ctx.strokeStyle = "rgba(36, 48, 40, 0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();

    activeKeys.forEach((key) => {
      const series = weatherData[key];
      const y = scaleValue(series.values[hoverIndex], min, max, padding.top, padding.top + plotHeight);
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
    const series = weatherData[key];
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
    const { values, unit } = weatherData[key];
    return {
      latest: `${values.at(-1)}${unit}`,
      range: `低 ${Math.min(...values)}${unit} ｜ 高 ${Math.max(...values)}${unit}`,
    };
  };

  const temperature = formatRange("temperature");
  const humidity = formatRange("humidity");
  const wind = formatRange("wind");

  document.querySelector("#temperatureNow").textContent = `最新 ${temperature.latest}`;
  document.querySelector("#temperatureRange").textContent = temperature.range;
  document.querySelector("#humidityNow").textContent = `最新 ${humidity.latest}`;
  document.querySelector("#humidityRange").textContent = humidity.range;
  document.querySelector("#windNow").textContent = `最新 ${wind.latest}`;
  document.querySelector("#windRange").textContent = wind.range;
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
drawChart();
