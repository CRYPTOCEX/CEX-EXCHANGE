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
    <LicenseGate extensionName="ai_investment">
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        userPath="/"
        translationNamespace="ext_admin_ai_investment"
        translationNavPrefix="nav"
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </LicenseGate>
  );
}
