# Tarot Atelier

精美、浮誇、沉浸式，並以可存取性與工程品質為底線的繁體中文塔羅 Web App。

## Phase 01 現況

目前完成可擴充牌組與卡牌引擎、78 張標準塔羅定義、牌組 registry、牌庫瀏覽、單卡正逆位與牌背檢視，以及明確的缺圖 fallback。尚未實作正式抽牌流程、自由牌位、上傳介面或 AI 解牌。

牌面採用原創程序式卡框與符號，目的是讓 78 張定義可辨識、可測試；不宣稱為 78 張完整插畫。

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

Phase 01 的卡牌使用 CSS 程序式卡框與通用符號。牌組格式、驗證規則、JSON Schema 與最小自製牌組範例見 [`docs/deck-engine.md`](docs/deck-engine.md)。

## 安全與產品聲明

目前不連接任何外部 AI、資料庫或付費服務。未來 API 金鑰只允許存在伺服器環境變數。塔羅內容僅供娛樂與自我反思，不取代醫療、法律或財務專業意見。
