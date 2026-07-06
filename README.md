# 陳加蜂蜜智慧蜂箱監測儀表板

這是屏東縣枋山鄉「陳加蜂蜜」的智慧蜂箱研究監測網站，主軸為 Jetson Orin Nano 邊緣運算平台與蜂巢片監測系統展示。

## 監測內容

- SCD30：溫度、濕度、CO2
- LOGI 4K 相機：蜜蜂巢片一般影像
- Lepton 2.5 熱像儀：蜜蜂巢片熱影像畫面
- 左右往復滑軌：搭載相機與熱像儀連續掃描巢片
- 24 小時圖表：溫度、濕度、CO2 趨勢

## 檔案內容

- `index.html`：智慧蜂箱監測儀表板
- `styles.css`：儀表板樣式
- `script.js`：讀取資料、24 小時圖表與滑軌狀態互動
- `data/environment.json`：感測資料來源（Jetson 產出，前端定時讀取）
- `assets/chenjia-apiary-hero.png`：蜂場視覺圖片

## 資料串接（Jetson Orin Nano）

前端每 60 秒讀取一次 `data/environment.json`。只要 Jetson 定期把最新資料
覆寫到這個檔案（或改 `script.js` 中的 `DATA_URL` 指向雲端 API），儀表板就會
自動更新，不需要改動版面。讀取失敗時會自動退回內建示範資料，畫面不會空白。

### JSON 格式

Jetson 只需輸出「時間戳 + 數字陣列」，樣式（標籤、單位、顏色）由前端負責。

```json
{
  "updatedAt": "2026-07-06T14:32:00+08:00",
  "labels": ["00:00", "01:00", "…", "23:00"],
  "series": {
    "temperature": [26.1, 25.8, "…（共 24 筆）"],
    "humidity":    [84, 85, "…"],
    "co2":         [612, 628, "…"]
  },
  "rail": { "status": "掃描中", "direction": "向右", "mode": "連續巡航" },
  "feeds": {
    "camera":  { "url": "https://圖床網址/camera-latest.jpg",  "updatedAt": "2026-07-06T14:32:00+08:00" },
    "thermal": { "url": "https://圖床網址/thermal-latest.jpg", "updatedAt": "2026-07-06T14:32:00+08:00" }
  }
}
```

欄位說明：

- `updatedAt`：ISO 8601 時間戳，含時區（例：`+08:00`）。顯示於「資料更新」，
  並用來判斷連線狀態——超過 10 分鐘未更新會標示「資料延遲」。
- `labels`：X 軸時間標籤，長度需與 `series` 各陣列相同（可省略，預設 00:00–23:00）。
- `series`：`temperature` / `humidity` / `co2` 三組數值陣列。缺項會退回示範資料。
- `rail`：滑軌狀態（`status` 狀態、`direction` 目前方向、`mode` 掃描方式），可省略。
- `feeds`：影像快照的**公開圖床網址**（見下方）。`url` 留空時顯示示範畫面。

調整讀取頻率或延遲判定門檻，可修改 `script.js` 最上方的 `REFRESH_MS`、`STALE_MS`。

## 影像串接（快照 + 雲端圖床）

GitHub Pages 只能放靜態檔案，無法跑即時串流，因此影像採「定時快照」：

1. Jetson 每隔幾秒擷取一張畫面，覆寫上傳到雲端圖床的**固定網址**
   （相機一張、Lepton 熱影像一張；熱影像建議在 Jetson 端先上好色階再上傳）。
2. 把兩個公開網址填進 `environment.json` 的 `feeds.camera.url` 與 `feeds.thermal.url`。
3. 網頁每 5 秒自動重抓最新快照（`script.js` 的 `IMG_REFRESH_MS` 可調），
   並帶防快取參數，畫面看起來就會持續更新。

`url` 留空 → 顯示示範畫面；圖床連不到 → 自動退回示範畫面並顯示「影像暫時無法讀取」，
不會破圖。`feeds.*.updatedAt` 會顯示成畫面左下角的「擷取時間」。

## GitHub Pages 發布方式

1. 到 GitHub 建立新的 repository。
2. 將本資料夾內的檔案上傳到 repository 根目錄。
3. 進入 repository 的 `Settings`。
4. 選擇 `Pages`。
5. Source 選擇 `Deploy from a branch`。
6. Branch 選擇 `main`，資料夾選擇 `/root`。
7. 儲存後等待 GitHub Pages 產生網址。

網站首頁檔名已經是 `index.html`，可直接作為 GitHub Pages 首頁。
