"use client";

import type React from "react";
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";
import { menu, colorSchema } from "./menu";
import { usePathname } from "@/i18n/routing";
import { LicenseGate } from "@/components/license/LicenseGate";

export default function AdminStakingLayout({
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
    <LicenseGate extensionName="staking">
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        userPath="/staking"
        translationNamespace="ext_admin_staking"
        translationNavPrefix="nav"
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </LicenseGate>
  );
}
