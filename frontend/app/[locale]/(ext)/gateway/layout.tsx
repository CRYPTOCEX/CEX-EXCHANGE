"use client";

import { ReactNode } from "react";
import { usePathname } from "@/i18n/routing";
import SiteHeader from "@/components/partials/header/site-header";
import { ExtensionLayoutWrapper } from "@/components/layout/extension-layout-wrapper";
import { MerchantModeProvider, useMerchantMode } from "./context/merchant-mode";
import { Switch } from "@/components/ui/switch";
import { TestTube, Zap } from "lucide-react";
import { menu, colorSchema, adminPath } from "./menu";
import { useTranslations } from "next-intl";

function ModeToggle() {
  const tCommon = useTranslations("common");
  const { mode, setMode, isTestMode } = useMerchantMode();

  return (
    <div className="flex items-center gap-2">
      {/*
        Test-vs-Live is real state, so it keeps a status colour — but the LABEL
        moves to neutral ink and the colour moves to the icon.

        `text-success` on `bg-success/20` measured 2.51:1 here: at light-mode
        lightness (33.9%) `--success` is too light to be 12px ink and too dark
        to carry white, so a coloured chip cannot be made legible at this size
        without changing the token. R2 already asks status to ship with an icon
        rather than as colour alone, which is also what makes it readable.
      */}
      <div
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium text-foreground transition-colors ${
          isTestMode ? "border-warning/40 bg-warning/10" : "border-success/40 bg-success/10"
        }`}
      >
        {isTestMode ? (
          <TestTube className="h-3 w-3 text-warning" />
        ) : (
          <Zap className="h-3 w-3 text-success" />
        )}
        {isTestMode ? tCommon("test") : tCommon("live")}
      </div>
      <Switch
        checked={!isTestMode}
        onCheckedChange={(checked) => setMode(checked ? "LIVE" : "TEST")}
        className="data-[state=checked]:bg-success data-[state=unchecked]:bg-warning"
      />
    </div>
  );
}

function GatewayLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Don't show header/footer for checkout pages
  if (pathname.includes("/checkout/")) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader
        menu={menu}
        rightControls={<ModeToggle />}
        adminPath={adminPath}
        colorSchema={colorSchema}
        translationNamespace="ext_gateway"
        translationNavPrefix="nav"
      />
      <ExtensionLayoutWrapper landingPath="/gateway" mainClassName="flex-1 mx-auto">
        {children}
      </ExtensionLayoutWrapper>
    </>
  );
}

export default function GatewayLayout({ children }: { children: ReactNode }) {
  return (
    <MerchantModeProvider>
      <GatewayLayoutContent>{children}</GatewayLayoutContent>
    </MerchantModeProvider>
  );
}
