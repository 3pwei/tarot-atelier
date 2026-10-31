# Tarot Atelier

精美、浮誇、沉浸式，並以可存取性與工程品質為底線的繁體中文塔羅 Web App。

## Phase 00 現況

目前完成工程底座、首頁與「靜態空牌桌」預覽。尚未實作抽牌、翻牌、自由牌位、上傳牌組或 AI 解牌，介面不會把這些功能偽裝成已可使用。

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

## 安全與產品聲明

目前不連接任何外部 AI、資料庫或付費服務。未來 API 金鑰只允許存在伺服器環境變數。塔羅內容僅供娛樂與自我反思，不取代醫療、法律或財務專業意見。
