import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "통화 · phone_english",
};

export default function CallLayout({ children }: LayoutProps<"/call">) {
  return children;
}
