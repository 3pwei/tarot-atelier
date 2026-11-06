import Image from "next/image";
import { DeckLibrary } from "@/presentation/components/DeckLibrary";
import { DrawExperience } from "@/presentation/components/DrawExperience";
import { HeroReveal } from "@/presentation/components/HeroReveal";
import { LazyAtmosphere } from "@/presentation/effects/LazyAtmosphere";

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const foundationItems = [
  {
    title: "穩定身份",
    description: "卡牌與牌組使用 stable ID；替換圖像不會改變抽牌紀錄中的身份。",
  },
  {
    title: "可驗證擴充",
    description:
      "Manifest 會驗證版本、張數、重複 ID 與素材宣告，再進入 registry。",
  },
  {
    title: "誠實素材",
    description:
      "本階段使用原創程序式卡框與符號；缺少素材時清楚顯示 fallback，不冒充完整插畫。",
  },
] as const;

export function HomePage() {
  return (
    <div className="site-shell">
      <LazyAtmosphere />
      <header className="site-header content-wrap">
        <a className="brand" href="#top" aria-label="Tarot Atelier 首頁">
          <Image
            src={`${publicBasePath}/brand/tarot-atelier-mark.svg`}
            alt=""
            width={38}
            height={38}
          />
          <span className="brand-name">Tarot Atelier</span>
        </a>
        <span className="phase-chip">DEV 預覽測試 第 2 版</span>
      </header>

      <main id="top">
        <HeroReveal>
          <section className="hero content-wrap" aria-labelledby="hero-title">
            <div className="hero-copy">
              <Image
                className="hero-logo"
                src={`${publicBasePath}/brand/tarot-atelier-mark.svg`}
                alt="Tarot Atelier 原創占位標誌"
                width={136}
                height={136}
                priority
                data-reveal
              />
              <p className="eyebrow" data-reveal>
                A digital atelier for reflection
              </p>
              <h1 id="hero-title" data-reveal>
                在星光與金箔之間，
                <span className="gold-text">鋪開你的牌桌</span>
              </h1>
              <p className="hero-intro" data-reveal>
                在牌桌上自由擺放 1–12
                個牌位，為每個位置寫下自己的問題，再看牌一張張落進你指定的位置。
              </p>
              <a className="primary-link" href="#draw-experience" data-reveal>
                進入抽牌儀式
              </a>
            </div>
          </section>
        </HeroReveal>

        <section
          id="draw-experience"
          className="table-section content-wrap"
          aria-labelledby="draw-experience-title"
        >
          <div className="section-heading">
            <p className="eyebrow">Arrange · Ask · Draw</p>
            <h2 id="draw-experience-title">把每個問題放在它該在的位置</h2>
            <p>
              從經典三張、五張十字、圓環開始，或完全自訂。拖曳、方向鍵或數字鍵盤都能移動牌位；每個牌位都要有自己的問題才能開始抽牌，牌堆偶爾還會多送出一張「跳牌」，與主牌落在同一個位置。牌陣會自動保存在這台裝置。
            </p>
          </div>
          <DrawExperience />
        </section>

        <section
          id="deck-library"
          className="table-section content-wrap"
          aria-labelledby="deck-library-title"
        >
          <div className="section-heading">
            <p className="eyebrow">Extensible deck engine</p>
            <h2 id="deck-library-title">一座能辨認每張牌的收藏室</h2>
            <p>
              內建 22 張大牌與 56
              張小牌的中英文名稱、序號、花色、階級與原創簡義。牌面是程序式識別素材，不是完整插畫集。
            </p>
          </div>
          <DeckLibrary />
        </section>

        <section
          className="feature-grid content-wrap"
          aria-label="工程底座重點"
        >
          {foundationItems.map((item) => (
            <article className="feature-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="site-footer content-wrap">
        Tarot Atelier Phase 03 · 僅供娛樂與自我反思 ·
        程序式卡框與符號為原創開發素材
      </footer>
    </div>
  );
}
