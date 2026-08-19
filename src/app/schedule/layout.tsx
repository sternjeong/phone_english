import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "일정 · Good Morning",
};

export default function ScheduleLayout({ children }: LayoutProps<"/schedule">) {
  return children;
}
