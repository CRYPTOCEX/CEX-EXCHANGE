"use client";

import type React from "react";
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";
import { menu, colorSchema } from "./menu";
import { usePathname } from "@/i18n/routing";
import { LicenseGate } from "@/components/license/LicenseGate";

export default function AdminP2PLayout({
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
    <LicenseGate extensionName="p2p">
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        userPath="/p2p"
        translationNamespace="ext_admin_p2p"
        translationNavPrefix="nav"
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </LicenseGate>
  );
}
