import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "발화 기록 · Good Morning",
};

export default function StatsLayout({ children }: LayoutProps<"/stats">) {
  return children;
}
