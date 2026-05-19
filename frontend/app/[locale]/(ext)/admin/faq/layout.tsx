"use client";

import type React from "react";
import SiteHeader from "@/components/partials/header/site-header";
import { menu, colorSchema } from "./menu";
import { LicenseGate } from "@/components/license/LicenseGate";

export default function AdminFaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LicenseGate extensionName="faq">
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        userPath="/faq"
        translationNamespace="ext_admin_faq"
        translationNavPrefix="nav"
      />
      <main className="flex-1 pb-24">{children}</main>
    </LicenseGate>
  );
}
