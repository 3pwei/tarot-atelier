# Tarot Atelier

精美、浮誇、沉浸式，並以可存取性與工程品質為底線的繁體中文塔羅 Web App。

## 目前功能

牌組引擎、洗牌選牌、燒牌揭示之上，有自由牌桌、解讀、歷史紀錄與分享：

- 牌桌上可放 1–12 個牌位，自動編號；拖曳、方向鍵或數字鍵盤移動，可旋轉、改排序、刪除（刪除後依原順序連續重編並告知）。
- 每個牌位都必須有自己的 1–300 字問題才能洗牌、抽牌；主問題選填。
- 牌陣庫：內建經典三張、單張指引、五張十字、圓環（8 位），平時就能在牌桌上方直接點選，存過的牌陣也會列在其中；可把目前牌陣命名儲存；內建與自存的都能刪除，也能還原預設範例；或從空白牌桌開始。
- 長按牌位後拖曳即可旋轉（靠近 45° 倍數時自動吸附），點選牌位後也可拖曳右下角的迴轉箭頭；輕點箭頭轉 45°，也可輸入精確角度。
- 按住牌桌任何地方（含牌位上）洗牌，放開後從牌輪逐張選牌放入空牌位，再由玩家逐張點開。兩指仍可縮放牌桌。飛行落點就是牌位座標，牌桌縮放（兩指或觸控板捏合，沒有縮放按鈕）、平移或牌位旋轉都不影響。跳牌與主牌同屬一個牌位，不另占編號。已有抽牌結果的牌位可移動，但不會重抽。
- 每次開啟或重新整理都從預設牌陣重新開始，不還原上一輪；牌陣庫與歷史紀錄以版本化 JSON 存在本機 `localStorage`，讀取時完整驗證，壞資料會被丟棄而不會白屏；提供「清除本次牌陣」（↺）。見 [`docs/decisions/0008-fresh-table-on-every-visit.md`](docs/decisions/0008-fresh-table-on-every-visit.md)。
- 歷史紀錄：牌全部翻開時自動存一筆，產生解讀後補進同一筆；只存在這台裝置、最多 10 筆（超過蓋掉最舊一筆），可唯讀檢視、用當時的牌和問題「產生解讀／重新解讀」（覆蓋舊解讀）、刪除單筆或全部清除。見 [`docs/decisions/0006-reading-history-on-the-device.md`](docs/decisions/0006-reading-history-on-the-device.md)。
- 分享：翻完牌的牌桌或歷史紀錄裡的一筆都能分享。在裝置上產生 1080×1350 圖卡與文字，用系統分享面板送出（不支援就下載圖片），也可只複製文字；預設帶問題，可勾選「隱藏我寫的問題」。見 [`docs/decisions/0007-share-from-the-device.md`](docs/decisions/0007-share-from-the-device.md)。

抽牌不放回，每次抽牌有固定的跳牌機率（使用者不可調整、也不對外顯示），逆位機率預設 50%。domain 可注入 `RandomSource`；固定種子只供測試與可重現 demo，不是安全亂數。

- 解讀：AI 解讀走本站自己的 Pages Function 呼叫 Cloudflare Workers AI（只用免費額度，有每日上限），額度用完或失敗時改用預寫解讀。見 [`docs/reading.md`](docs/reading.md)。

規則、互動與儲存格式見 [`docs/spread-table.md`](docs/spread-table.md)。尚未實作自製牌組的上傳介面。

牌背為程式繪製的燙金星盤 SVG；牌面為牛皮紙底、深褐油墨與朱紅印章的原創 SVG，22 張大牌各有一幅線刻插圖，小牌依點數排列花色紋章、宮廷牌另加標記，目的是讓 78 張定義可辨識、可測試；不宣稱為 78 張完整插畫。

## 技術棧

- Next.js App Router、React、TypeScript strict
- Tailwind CSS 與共用 CSS design tokens
- CSS keyframes（金色龍捲風洗牌、牌輪、飛牌與標題進場動畫）
- Vitest、React Testing Library、Playwright
- ESLint、Prettier、GitHub Actions

## 本機啟動

需求：Node.js 24、Corepack，以及 `package.json` 指定的 pnpm 版本。

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

瀏覽 `http://localhost:3000`。

## 品質檢查

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

`pnpm check` 會依序執行前五項。PR CI 不自動執行 E2E，以避免不必要費用；E2E workflow 只允許手動觸發。

## 部署

正式版部署於 [https://games.milespapa.com/tarot/](https://games.milespapa.com/tarot/)，由 Cloudflare Pages 從 [`3pwei/milespapa-games`](https://github.com/3pwei/milespapa-games) 的 `main` 發布；此 repository 不直接發布，也不使用 GitHub Pages。

- **DEV 預覽**：每個 PR 由另一個 Cloudflare Pages 專案以 `pnpm preview:build` 建置，提供可驗收的預覽網址（路徑同正式站 `/tarot/`，不被搜尋引擎收錄）。
- **正式發布**：由專案擁有者決定時機。執行 `pnpm release:stage ../milespapa-games`（完整品質檢查並取代遊戲站的 `site/tarot/`），再於 `milespapa-games` 開 `deploy: tarot <commit>` PR，合併後上線。

設定步驟、發布流程與回滾方式見 [`docs/deployment.md`](docs/deployment.md)。

## 分層

```text
src/domain          純 TypeScript 規則與模型
src/application     Use cases 與 ports
src/infrastructure  外部能力實作
src/presentation    頁面、元件、互動狀態與隔離特效（透過 ports 取用外部能力）
src/composition     瀏覽器端組裝點：挑選實際的 adapter 交給 presentation
src/server          AI 解讀端點（Cloudflare Pages Function）
src/shared          無業務語意的共用資源
src/app             Next.js 路由組裝層
```

ESLint 會阻擋向外層的 import，例如 `domain` 不得 import `presentation` 或 `infrastructure`，`presentation` 也不得直接 import `infrastructure`。

## 素材狀態

網站是一本放在木桌上的魔法書：封面、扉頁與桌面是本專案原創的 SVG（`art/book/`），以 `pnpm book-art` 輸出成 `public/book/` 的 WebP。完整素材與字型授權紀錄見 `docs/art-direction.md`。

Phase 02 起的卡牌使用 `src/presentation/components/cards/` 中的程序式 SVG。牌組格式、驗證規則、JSON Schema 與最小自製牌組範例見 [`docs/deck-engine.md`](docs/deck-engine.md)。

## 安全與產品聲明

AI 解讀只透過本站的 Pages Function 呼叫 Cloudflare Workers AI 免費額度，用量計數存在 Cloudflare D1；不接任何付費服務。綁定與密鑰只存在伺服器端。詳見 [`docs/security.md`](docs/security.md)。塔羅內容僅供娛樂與自我反思，不取代醫療、法律或財務專業意見。
