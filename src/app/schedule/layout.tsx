import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "일정 · phone_english",
};

export default function ScheduleLayout({ children }: LayoutProps<"/schedule">) {
  return children;
}
