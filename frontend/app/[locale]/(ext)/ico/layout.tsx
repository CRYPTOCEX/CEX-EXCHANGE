import type React from "react";
import type { Metadata } from "next";
import SiteHeader from "@/components/partials/header/site-header";
import { ExtensionLayoutWrapper } from "@/components/layout/extension-layout-wrapper";
import { PlatformAnnouncement } from "./components/platform-announcement";
import { menu, colorSchema, adminPath } from "./menu";

export const metadata: Metadata = {
  title: {
    default: "Initial Token Offering",
    template: "%s",
  },
  description: "Launch and invest in the next generation of digital assets",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        adminPath={adminPath}
      />
      <ExtensionLayoutWrapper landingPath="/ico">
        <PlatformAnnouncement />
        {children}
      </ExtensionLayoutWrapper>
    </div>
  );
}
