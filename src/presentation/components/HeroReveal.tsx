"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function HeroReveal({ children }: Readonly<{ children: ReactNode }>) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let disposed = false;
    let cleanup: () => void = () => undefined;

    void import("gsap").then(({ gsap }) => {
      if (disposed || !root.current) return;
      const context = gsap.context(() => {
        gsap.from("[data-reveal]", {
          y: 18,
          opacity: 0,
          duration: 0.85,
          stagger: 0.11,
          ease: "power2.out",
        });
      }, root);
      cleanup = () => context.revert();
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={root}>{children}</div>;
}
