import type { ReactNode } from "react";
import SiteHeader from "@/components/partials/header/site-header";
import { ExtensionLayoutWrapper } from "@/components/layout/extension-layout-wrapper";
import { menu, colorSchema, adminPath } from "./menu";

interface StakingLayoutProps {
  children: ReactNode;
}

export default function StakingLayout({ children }: StakingLayoutProps) {
  return (
    <>
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        adminPath={adminPath}
      />
      <ExtensionLayoutWrapper landingPath="/staking">
        {children}
      </ExtensionLayoutWrapper>
    </>
  );
}
