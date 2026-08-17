import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "발화 기록 · phone_english",
};

export default function StatsLayout({ children }: LayoutProps<"/stats">) {
  return children;
}
