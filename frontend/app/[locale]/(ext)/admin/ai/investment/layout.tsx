"use client";

import type React from "react";
import Footer from "@/components/partials/footer";
import SiteHeader from "@/components/partials/header/site-header";
import { menu, colorSchema } from "./menu";
import { LicenseGate } from "@/components/license/LicenseGate";

export default function AdminAIInvestmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* `flex min-h-screen flex-col` is what gives the `flex-1` below any effect.
       The root was a bare fragment, so `<main>` was content-height and the
       footer's position depended on how tall the data made the page — measured
       on /en/admin/gateway as 185.5px of footer travel, CLS 0.0169, on a route
       that settles under one viewport. Full note in
       app/[locale]/(ext)/admin/gateway/layout.tsx. */
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        userPath="/"
        translationNamespace="ext_admin_ai_investment"
        translationNavPrefix="nav"
      />
      <main className="flex-1">
        {/* Gate the CONTENT, not the chrome: `SiteHeader`/`Footer` are not
            licensed and used to sit inside the gate, so an in-flight licence
            check blanked the whole page — header, nav, content and footer —
            behind one centred spinner. See components/license/LicenseGate.tsx. */}
        <LicenseGate extensionName="ai_investment">{children}</LicenseGate>
      </main>
      <Footer />
    </div>
  );
}
