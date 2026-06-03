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
- `script.js`：24 小時圖表與滑軌狀態互動
- `assets/chenjia-apiary-hero.png`：蜂場視覺圖片

## GitHub Pages 發布方式

1. 到 GitHub 建立新的 repository。
2. 將本資料夾內的檔案上傳到 repository 根目錄。
3. 進入 repository 的 `Settings`。
4. 選擇 `Pages`。
5. Source 選擇 `Deploy from a branch`。
6. Branch 選擇 `main`，資料夾選擇 `/root`。
7. 儲存後等待 GitHub Pages 產生網址。

網站首頁檔名已經是 `index.html`，可直接作為 GitHub Pages 首頁。
