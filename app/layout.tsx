import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Editor Demo",
  description: "Tiptap editor with chapter switching and DeepSeek chat",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
