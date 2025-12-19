"use client";

import type { ReactNode } from "react";
import { useUserStore } from "@/store/user";
import SiteHeader from "@/components/partials/header/site-header";
import { ExtensionLayoutWrapper } from "@/components/layout/extension-layout-wrapper";
import { menu as baseMenu, colorSchema, adminPath } from "./menu";

export default function P2PLayout({ children }: { children: ReactNode }) {
  const { user } = useUserStore();
  const menu = baseMenu.filter((item) => !item.auth || !!user);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        adminPath={adminPath}
      />
      <ExtensionLayoutWrapper landingPath="/p2p">
        {children}
      </ExtensionLayoutWrapper>
    </div>
  );
}
