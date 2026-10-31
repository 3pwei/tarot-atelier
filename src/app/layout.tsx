import type { Metadata, Viewport } from "next";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const bodyStyle = {
  "--stardust-background": `url("${publicBasePath}/art/stardust-field.svg")`,
} as CSSProperties;

export const metadata: Metadata = {
  title: "Tarot Atelier｜塔羅工坊",
  description:
    "一座為自由牌陣與沉浸式解牌而生的數位塔羅工坊。Phase 01 可擴充牌組引擎。",
};

export const viewport: Viewport = {
  themeColor: "#080914",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body style={bodyStyle}>{children}</body>
    </html>
  );
}
