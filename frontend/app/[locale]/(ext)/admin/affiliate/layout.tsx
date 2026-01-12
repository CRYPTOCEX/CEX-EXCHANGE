"use client";

import type { ReactNode } from "react";
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";
import { menu, colorSchema } from "./menu";
import { usePathname } from "@/i18n/routing";
import { LicenseGate } from "@/components/license/LicenseGate";

export default function AdminAffiliateLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isSettingsPage = pathname.endsWith("/settings");
  const isConditionsPage = pathname.includes("/condition");

  // Full-screen layout for settings and conditions pages
  if (isSettingsPage || isConditionsPage) {
    return <>{children}</>;
  }

  return (
    <LicenseGate extensionName="mlm">
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        userPath="/affiliate"
        translationNamespace="ext_admin_affiliate"
        translationNavPrefix="nav"
      />
      <main className="flex-1 mx-auto">{children}</main>
      <Footer />
    </LicenseGate>
  );
}
