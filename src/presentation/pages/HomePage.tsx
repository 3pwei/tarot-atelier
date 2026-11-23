import Image from "next/image";
import { DeckLibrary } from "@/presentation/components/DeckLibrary";
import { DrawExperience } from "@/presentation/components/DrawExperience";
import { PUBLIC_BASE_PATH } from "@/shared/config/publicBasePath";

export function HomePage() {
  return (
    <div className="site-shell">
      <div className="page-glow" aria-hidden />
      <header className="site-header content-wrap">
        <a className="brand" href="#top" aria-label="Tarot Atelier 首頁">
          <Image
            src={`${PUBLIC_BASE_PATH}/brand/tarot-atelier-mark.svg`}
            alt=""
            width={38}
            height={38}
            loading="eager"
          />
          <span className="brand-name">Tarot Atelier</span>
        </a>
      </header>

      <main id="top">
        <section className="hero content-wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <Image
              className="hero-logo"
              src={`${PUBLIC_BASE_PATH}/brand/tarot-atelier-mark.svg`}
              alt="Tarot Atelier 原創占位標誌"
              width={136}
              height={136}
              preload
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

        <section
          id="draw-experience"
          className="table-section content-wrap"
          aria-labelledby="draw-experience-title"
        >
          <div className="section-heading">
            <p className="eyebrow">Arrange · Ask · Draw</p>
            <h2 id="draw-experience-title">把每個問題放在它該在的位置</h2>
            <p>
              從經典三張、五張十字、圓環開始，或完全自訂。拖曳、方向鍵或數字鍵盤都能移動牌位；每個牌位都要有自己的問題才能開始抽牌，牌堆偶爾還會多送出一張「跳牌」，與主牌落在同一個位置。牌陣庫和歷史紀錄保存在這台裝置。
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
      </main>

      <footer className="site-footer content-wrap">
        Tarot Atelier · 僅供娛樂與自我反思 · 程序式卡框與符號為原創開發素材
      </footer>
    </div>
  );
}
