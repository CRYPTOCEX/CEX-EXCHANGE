"use client";

import type React from "react";
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";
import { Switch } from "@/components/ui/switch";
import { TestTube, Zap } from "lucide-react";
import { usePathname } from "@/i18n/routing";
import {
  AdminGatewayModeProvider,
  useAdminGatewayMode,
} from "./context/admin-gateway-mode";
import { menu, colorSchema } from "./menu";

function AdminModeToggle() {
  const { mode, setMode, isTestMode } = useAdminGatewayMode();

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${isTestMode ? "bg-yellow-500/20 text-yellow-600" : "bg-green-500/20 text-green-600"}`}
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

function GatewayAdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isSettingsPage = pathname.endsWith("/settings");

  // Full-screen layout for settings page or design preview page
  if (isSettingsPage || pathname.includes("/settings/design")) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader
        menu={menu}
        rightControls={<AdminModeToggle />}
        colorSchema={colorSchema}
        userPath="/gateway"
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

export default function AdminGatewayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGatewayModeProvider>
      <GatewayAdminLayoutContent>{children}</GatewayAdminLayoutContent>
    </AdminGatewayModeProvider>
  );
}
