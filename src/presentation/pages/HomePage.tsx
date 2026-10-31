import Image from "next/image";
import { getFoundationPreview } from "@/application/use-cases/getFoundationPreview";
import { HeroReveal } from "@/presentation/components/HeroReveal";
import { StaticTarotTable } from "@/presentation/components/StaticTarotTable";
import { LazyAtmosphere } from "@/presentation/effects/LazyAtmosphere";

const preview = getFoundationPreview();

const foundationItems = [
  {
    title: "自由牌陣",
    description:
      "未來可在桌面上安排牌位與問題；本階段只建立可延伸的視覺與架構底座。",
  },
  {
    title: "可替換場景",
    description: "場景特效與操作介面分離，低效能或減少動態偏好下會自動降級。",
  },
  {
    title: "安全解牌",
    description:
      "解牌服務將透過介面注入，金鑰只留在伺服器端；目前尚未連接任何 AI。",
  },
] as const;

export function HomePage() {
  return (
    <div className="site-shell">
      <LazyAtmosphere />
      <header className="site-header content-wrap">
        <a className="brand" href="#top" aria-label="Tarot Atelier 首頁">
          <Image
            src="/brand/tarot-atelier-mark.svg"
            alt=""
            width={38}
            height={38}
          />
          <span className="brand-name">Tarot Atelier</span>
        </a>
        <span className="phase-chip">Phase 00 靜態預覽</span>
      </header>

      <main id="top">
        <HeroReveal>
          <section className="hero content-wrap" aria-labelledby="hero-title">
            <div className="hero-copy">
              <Image
                className="hero-logo"
                src="/brand/tarot-atelier-mark.svg"
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
                一座為自由牌陣、沉浸式動畫與繁體中文解牌而生的數位工坊。現在先看見空間，功能將逐階段誠實完成。
              </p>
              <a className="primary-link" href="#table-preview" data-reveal>
                查看空牌桌
              </a>
            </div>
          </section>
        </HeroReveal>

        <section
          id="table-preview"
          className="table-section content-wrap"
          aria-labelledby="table-title"
        >
          <div className="section-heading">
            <p className="eyebrow">Foundation preview</p>
            <h2 id="table-title">一張尚未開始占卜的桌</h2>
            <p>
              這是可預覽的靜態空牌桌，不會假裝已有抽牌能力。後續牌卡、牌位與互動都將在各自階段加入。
            </p>
          </div>
          <StaticTarotTable preview={preview} />
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
        Tarot Atelier Phase 00 · 僅供娛樂與自我反思 · 視覺素材目前皆為原創
        placeholder
      </footer>
    </div>
  );
}
