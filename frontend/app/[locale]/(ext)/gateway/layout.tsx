"use client";

import { ReactNode } from "react";
import { usePathname } from "@/i18n/routing";
import SiteHeader from "@/components/partials/header/site-header";
import { ExtensionLayoutWrapper } from "@/components/layout/extension-layout-wrapper";
import { MerchantModeProvider, useMerchantMode } from "./context/merchant-mode";
import { Switch } from "@/components/ui/switch";
import { TestTube, Zap } from "lucide-react";
import { menu, colorSchema, adminPath } from "./menu";

function ModeToggle() {
  const { mode, setMode, isTestMode } = useMerchantMode();

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
          isTestMode
            ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
            : "bg-green-500/20 text-green-600 dark:text-green-400"
        }`}
      >
        {isTestMode ? (
          <TestTube className="h-3 w-3" />
        ) : (
          <Zap className="h-3 w-3" />
        )}
        {isTestMode ? "Test" : "Live"}
      </div>
      <Switch
        checked={!isTestMode}
        onCheckedChange={(checked) => setMode(checked ? "LIVE" : "TEST")}
        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-yellow-500"
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
