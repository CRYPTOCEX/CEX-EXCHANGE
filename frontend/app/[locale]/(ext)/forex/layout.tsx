"use client";

import type React from "react";
import { usePathname } from "next/navigation";
import SiteHeader from "@/components/partials/header/site-header";
import { ExtensionLayoutWrapper } from "@/components/layout/extension-layout-wrapper";
import { menu, colorSchema, adminPath } from "./menu";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Check if we're on the trade page (full-screen trading terminal)
  const isTradePage = pathname?.includes("/forex/trade/");

  // For trade page, render without any layout wrapper
  if (isTradePage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        adminPath={adminPath}
        translationNamespace="ext_forex"
        translationNavPrefix="nav"
      />
      <ExtensionLayoutWrapper landingPath="/forex" mainClassName="flex-1 mx-auto">
        {children}
      </ExtensionLayoutWrapper>
    </div>
  );
}
