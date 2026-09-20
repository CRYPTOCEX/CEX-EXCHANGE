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
import { LicenseGate } from "@/components/license/LicenseGate";
import { useTranslations } from "next-intl";

function AdminModeToggle() {
  const tCommon = useTranslations("common");
  const { mode, setMode, isTestMode } = useAdminGatewayMode();

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${isTestMode ? "bg-warning/10 text-warning-ink" : "bg-success/10 text-success-ink"}`}
      >
        {isTestMode ? (
          <TestTube className="h-3 w-3" />
        ) : (
          <Zap className="h-3 w-3" />
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

function GatewayAdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Full-screen layout for the design preview page — a control rail beside a
  // live preview, which wants every pixel.
  //
  // Still behind the licence gate. The gate used to sit one level up, around
  // this whole component, so this branch inherited it; now that it wraps
  // content only, this branch has to name it explicitly or the routes it
  // covers become reachable without a valid licence.
  //
  // `endsWith("/settings")` used to be matched here too. /admin/gateway/settings
  // is not a preview — it is `SettingsPage`, a form with a category rail and no
  // top bar of its own — so hiding the nav left it with one route out and 64px
  // of `pt-header` reserved for a header that was not mounted. Full note in
  // components/admin/settings/layout.ts.
  if (pathname.includes("/settings/design")) {
    return <LicenseGate extensionName="gateway">{children}</LicenseGate>;
  }

  return (
    /*
     * `flex min-h-screen flex-col` is what makes the `flex-1` below MEAN
     * anything.
     *
     * The root was a bare fragment, so `<main className="flex-1">` had no flex
     * parent and `flex: 1` did nothing — main was content-height and the footer
     * sat immediately under it. The footer's position was therefore a function
     * of how tall the page's data happened to make it, so on a page that
     * settles shorter than the viewport the footer travelled UP as the content
     * resolved: measured 185.5px on this route, CLS 0.0169 — the only ext admin
     * route still shifting after the LicenseGate fix.
     *
     * With a real flex column, `flex-1` stretches main to fill the viewport and
     * the footer is pinned to the bottom on short pages and pushed down
     * naturally on long ones. Its position stops depending on the data, which
     * is the only way a fallback height could ever have been right for both.
     */
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        menu={menu}
        rightControls={<AdminModeToggle />}
        colorSchema={colorSchema}
        userPath="/gateway"
        translationNamespace="ext_admin_gateway"
        translationNavPrefix="nav"
      />
      <main className="flex-1">
        {/* Gate the CONTENT, not the chrome: `SiteHeader`/`Footer` are not
            licensed and used to sit inside the gate, so an in-flight licence
            check blanked the whole page — header, nav, content and footer —
            behind one centred spinner. See components/license/LicenseGate.tsx. */}
        <LicenseGate extensionName="gateway">{children}</LicenseGate>
      </main>
      <Footer />
    </div>
  );
}

export default function AdminGatewayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* `AdminGatewayModeProvider` is OUTSIDE the licence gate and has to be: the
     header's `AdminModeToggle` calls `useAdminGatewayMode`, which throws
     without the provider, and the header must render in every gate state. The
     provider carries no licensed data — it is a LIVE/TEST flag in
     localStorage.

     It is safe to have it wrapping the whole layout only because it now always
     renders its children. It used to do `if (!mounted) return null`, which
     blanked this entire back office on the server — the same "gate on
     client-only state must gate the smallest possible thing" defect the licence
     gate had, one level up. Fixed in `./context/admin-gateway-mode.tsx`; read
     the note there before reintroducing any mounted-check here. */
  return (
    <AdminGatewayModeProvider>
      <GatewayAdminLayoutContent>{children}</GatewayAdminLayoutContent>
    </AdminGatewayModeProvider>
  );
}
