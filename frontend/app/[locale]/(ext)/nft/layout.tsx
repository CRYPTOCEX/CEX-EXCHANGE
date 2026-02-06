"use client";

import SiteHeader from "@/components/partials/header/site-header";
import { ExtensionLayoutWrapper } from "@/components/layout/extension-layout-wrapper";
import { useTranslations } from "next-intl";
import { menu, colorSchema, adminPath } from "./menu";

function NFTFooter() {
  const t = useTranslations("ext_nft");
  return (
    <footer className="border-t border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>{t("n_2025_nft_market_all_rights_reserved")}</p>
          <div className="flex gap-6">
            <a href="/terms" className="hover:text-foreground transition">Terms</a>
            <a href="/privacy" className="hover:text-foreground transition">Privacy</a>
            <a href="/support" className="hover:text-foreground transition">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function NFTLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        adminPath={adminPath}
      />
      <ExtensionLayoutWrapper landingPath="/nft" customSubpageFooter={<NFTFooter />}>
        {children}
      </ExtensionLayoutWrapper>
    </div>
  );
}
