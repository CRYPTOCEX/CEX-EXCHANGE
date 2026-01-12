"use client";

import type { ReactNode } from "react";
import SiteHeader from "@/components/partials/header/site-header";
import { ExtensionLayoutWrapper } from "@/components/layout/extension-layout-wrapper";
import { menu, colorSchema, adminPath } from "./menu";

export default function AffiliateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        adminPath={adminPath}
        translationNamespace="ext_affiliate"
        translationNavPrefix="nav"
      />
      <ExtensionLayoutWrapper landingPath="/affiliate">
        {children}
      </ExtensionLayoutWrapper>
    </div>
  );
}
