"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

const AtmosphereCanvas = dynamic(() => import("./AtmosphereCanvas"), {
  ssr: false,
  loading: () => <div className="atmosphere-fallback" aria-hidden />,
});

export function LazyAtmosphere() {
  const allowMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    motionIsAllowed,
    () => false,
  );

  return allowMotion ? (
    <AtmosphereCanvas />
  ) : (
    <div className="atmosphere-fallback" aria-hidden />
  );
}

function subscribeToMotionPreference(onChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function motionIsAllowed() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
