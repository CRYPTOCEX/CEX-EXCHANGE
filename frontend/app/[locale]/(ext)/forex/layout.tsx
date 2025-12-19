import type React from "react";
import type { Metadata } from "next";
import SiteHeader from "@/components/partials/header/site-header";
import { ExtensionLayoutWrapper } from "@/components/layout/extension-layout-wrapper";
import { menu, colorSchema, adminPath } from "./menu";

export const metadata: Metadata = {
  title: {
    default: "Forex - Trading Platform",
    template: "%s | Forex",
  },
  description: "Trade and invest in the global forex markets",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        adminPath={adminPath}
      />
      <ExtensionLayoutWrapper landingPath="/forex" mainClassName="flex-1 mx-auto">
        {children}
      </ExtensionLayoutWrapper>
    </div>
  );
}
