import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "온보딩 · Good Morning",
};

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return children;
}
