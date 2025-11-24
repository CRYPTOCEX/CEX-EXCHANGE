// components/faq-layout.tsx
"use client";

import type { ReactNode } from "react";
import SiteHeader from "@/components/partials/header/site-header";

const faqMenu: MenuItem[] = [
  {
    key: "faq-home",
    title: "FAQ Home",
    href: "/faq",
    icon: "lucide:help-circle",
  },
];

export default function FaqLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader menu={faqMenu} />
      <main className="flex-1 py-24">{children}</main>
    </div>
  );
}
