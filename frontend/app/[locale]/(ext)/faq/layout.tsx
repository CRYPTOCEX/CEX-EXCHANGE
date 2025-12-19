"use client";

import type { ReactNode } from "react";
import SiteHeader from "@/components/partials/header/site-header";
import { ExtensionLayoutWrapper } from "@/components/layout/extension-layout-wrapper";
import { menu, colorSchema, adminPath } from "./menu";

export default function FaqLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        adminPath={adminPath}
      />
      <ExtensionLayoutWrapper landingPath="/faq">
        {children}
      </ExtensionLayoutWrapper>
    </div>
  );
}
