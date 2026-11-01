# Tarot Atelier

精美、浮誇、沉浸式，並以可存取性與工程品質為底線的繁體中文塔羅 Web App。

## Phase 02 現況

目前完成可擴充牌組與卡牌引擎、78 張標準塔羅定義、牌組 registry，以及完整的洗牌、抽牌、燒牌揭示體驗：兩輪 riffle 洗牌、卡牌沿弧線飛向祭壇，落定後由使用者點擊，火焰從觸碰點燒開牌背、露出牌面。抽牌不放回，每次抽牌固定有 3% 機率額外出現一張「跳牌」（使用者不可調整），逆位機率預設 50%；牌組若關閉逆位則一律正位。尚未實作自由牌位、上傳介面或 AI 解牌。

介面固定使用 `rare=0.03`，每次最多額外一張；domain 仍保留 `off=0`、`normal=0.08`、`chaos=0.15` 模式，但不對使用者開放。domain 可注入 `RandomSource`；固定種子只供測試與可重現 demo，不是安全亂數。

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
