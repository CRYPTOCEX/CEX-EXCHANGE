import type { ReactNode } from "react";
import SiteHeader from "@/components/partials/header/site-header";
import { ExtensionLayoutWrapper } from "@/components/layout/extension-layout-wrapper";
import { menu, colorSchema, adminPath } from "./menu";

interface CopyTradingLayoutProps {
  children: ReactNode;
}

export default function CopyTradingLayout({
  children,
}: CopyTradingLayoutProps) {
  return (
    <>
      <SiteHeader menu={menu} colorSchema={colorSchema} adminPath={adminPath} />
      <ExtensionLayoutWrapper landingPath="/copy-trading">
        {children}
      </ExtensionLayoutWrapper>
    </>
  );
}
