"use client";

import type React from "react";
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";
import { menu, colorSchema } from "./menu";
import { LicenseGate } from "@/components/license/LicenseGate";

export default function AdminFuturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LicenseGate extensionName="futures">
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        userPath="/"
        translationNamespace="ext_admin_futures"
        translationNavPrefix="nav"
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </LicenseGate>
  );
}
