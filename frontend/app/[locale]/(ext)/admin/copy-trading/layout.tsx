"use client";

import type React from "react";
import SiteHeader from "@/components/partials/header/site-header";
import { menu, colorSchema } from "./menu";
import Footer from "@/components/partials/footer";
import { usePathname } from "@/i18n/routing";

export default function CopyTradingAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSettingsPage = pathname.endsWith("/settings");

  // Full-screen layout for settings page
  if (isSettingsPage) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        userPath="/copy-trading"
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
