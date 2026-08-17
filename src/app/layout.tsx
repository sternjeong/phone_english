import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "phone_english",
  description: "AI가 먼저 전화를 거는 전화영어 연습 웹앱",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-ink-950">{children}</body>
    </html>
  );
}
