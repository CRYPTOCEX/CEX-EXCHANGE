// components/support-layout.tsx
"use client";

import type { ReactNode } from "react";
import SiteHeader from "@/components/partials/header/site-header";
import LiveChat from "./ticket/components/live-chat";
import Footer from "@/components/partials/footer";

const supportMenu = [
  {
    key: "support-center",
    title: "Support Center",
    href: "/support",
    icon: "lucide:help-circle",
  },
  {
    key: "tickets",
    title: "Tickets",
    href: "/support/ticket",
    icon: "lucide:ticket",
  },
];

export default function SupportLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader menu={supportMenu} />
      <main className="mx-auto pt-14 md:pt-18">{children}</main>
      <LiveChat />
      <Footer />
    </div>
  );
}
