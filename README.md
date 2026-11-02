# Tarot Atelier

精美、浮誇、沉浸式，並以可存取性與工程品質為底線的繁體中文塔羅 Web App。

## Phase 03 現況

在 Phase 02 的牌組引擎與洗牌、抽牌、燒牌揭示之上，加入自由牌桌：

- 牌桌上可放 1–12 個牌位，自動編號；拖曳、方向鍵或數字鍵盤移動，可旋轉、改排序、刪除（刪除後依原順序連續重編並告知）。
- 每個牌位都必須有自己的 1–300 字問題才能洗牌、抽牌；主問題選填。
- 牌陣庫：內建經典三張、五張十字、圓環（8 位），可把目前牌陣命名儲存；內建與自存的都能刪除，也能還原預設範例；或從空白牌桌開始。
- 長按牌位後拖曳即可旋轉（靠近 45° 倍數時自動吸附），點選牌位後也可拖曳右下角的迴轉箭頭；輕點箭頭轉 45°，也可輸入精確角度。
- 點一次牌堆就把所有空牌位一起發完，再由玩家逐張點開。飛行落點就是牌位座標，牌桌縮放、平移或牌位旋轉都不影響。跳牌與主牌同屬一個牌位，不另占編號。已有抽牌結果的牌位可移動，但不會重抽。
- 牌陣以版本化 JSON 存在本機 `localStorage`，讀取時完整驗證與遷移，壞資料會被丟棄而不會白屏；提供「清除本次牌陣」。

抽牌不放回，每次抽牌有固定的跳牌機率（使用者不可調整、也不對外顯示），逆位機率預設 50%。domain 可注入 `RandomSource`；固定種子只供測試與可重現 demo，不是安全亂數。

規則、互動與儲存格式見 [`docs/spread-table.md`](docs/spread-table.md)。尚未實作上傳介面或 AI 解牌。

牌背為程式繪製的燙金星盤 SVG；牌面為牛皮紙底、深褐油墨與朱紅印章的原創 SVG，22 張大牌各有一幅線刻插圖，小牌依點數排列花色紋章、宮廷牌另加標記，目的是讓 78 張定義可辨識、可測試；不宣稱為 78 張完整插畫。

## 技術棧

- Next.js App Router、React、TypeScript strict
- Tailwind CSS 與共用 CSS design tokens
- Zustand（僅前端互動狀態）
- GSAP（延遲載入時間軸）
- Three.js / React Three Fiber（隔離、延遲載入的場景特效）
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

正式版部署於 [https://games.milespapa.com/tarot/](https://games.milespapa.com/tarot/)，並與其他 Milespapa 遊戲共用 Sites 專案。產生可發布的靜態輸出時使用：

```bash
NEXT_PUBLIC_BASE_PATH=/tarot pnpm check
```

將 `out/` 內容發布到遊戲站的 `dist/tarot/`；此 repository 不使用 GitHub Pages。

## 分層

```text
src/domain          純 TypeScript 規則與模型
src/application     Use cases 與 ports
src/infrastructure  外部能力實作
src/presentation    頁面、元件、互動狀態與隔離特效
src/shared          無業務語意的共用資源
src/app             Next.js 路由組裝層
```

ESLint 會阻擋向外層的 import，例如 `domain` 不得 import `presentation` 或 `infrastructure`。

## 素材狀態

`public/brand/tarot-atelier-mark.svg` 與 `public/art/stardust-field.svg` 是本專案原創的 Phase 00 placeholder，不是正式完稿美術。完整素材紀錄見 `docs/art-direction.md`。

Phase 02 起的卡牌使用 `src/presentation/components/cards/` 中的程序式 SVG。牌組格式、驗證規則、JSON Schema 與最小自製牌組範例見 [`docs/deck-engine.md`](docs/deck-engine.md)。

## 安全與產品聲明

目前不連接任何外部 AI、資料庫或付費服務。未來 API 金鑰只允許存在伺服器環境變數。塔羅內容僅供娛樂與自我反思，不取代醫療、法律或財務專業意見。
