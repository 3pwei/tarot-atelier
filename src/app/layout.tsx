import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tarot Atelier｜塔羅工坊",
  description:
    "一座為自由牌陣與沉浸式解牌而生的數位塔羅工坊。Phase 00 靜態預覽。",
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
      <body>{children}</body>
    </html>
  );
}
