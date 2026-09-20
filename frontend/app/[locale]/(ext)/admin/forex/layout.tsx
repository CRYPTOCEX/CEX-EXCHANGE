"use client";

import type { ReactNode } from "react";
import SiteHeader from "@/components/partials/header/site-header";
import { LayoutWrapper } from "@/components/partials/dashboard/layout-wrapper";
import Footer from "@/components/partials/footer";
import { menu, colorSchema } from "./menu";
import { LicenseGate } from "@/components/license/LicenseGate";

export default function AdminForexLayout({ children }: { children: ReactNode }) {
  return (
    /* `flex min-h-screen flex-col` is what gives the `flex-1` below any effect.
       The root was a bare fragment, so `<main>` was content-height and the
       footer's position depended on how tall the data made the page — measured
       on /en/admin/gateway as 185.5px of footer travel, CLS 0.0169, on a route
       that settles under one viewport. Full note in
       app/[locale]/(ext)/admin/gateway/layout.tsx. */
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        userPath="/forex"
        translationNamespace="ext_admin_forex"
        translationNavPrefix="nav"
      />
      {/* `flex-1` here is this layout's stand-in for the `<main className="flex-1">`
          every other ext admin has — it is the child of the flex column that
          must absorb the slack, so the footer is pinned to the bottom rather
          than riding on the content height. `page-min-height-horizontal` below
          is `min-height: calc(100vh - 170px)` and stays as a floor. */}
      <div className="content-wrapper transition-all duration-150 flex-1">
        <div className="page-min-height-horizontal">
          <LayoutWrapper>
            {/* Gate the CONTENT, not the chrome. This is the only ext admin
                layout whose content box is `content-wrapper >
                page-min-height-horizontal > LayoutWrapper` rather than a bare
                `<main className="flex-1">`, so the gate goes INSIDE
                `LayoutWrapper` — that is where the `<main>` actually is, and it
                is the box the settled page occupies. Header and footer stay
                outside it and never move. See
                components/license/LicenseGate.tsx. */}
            <LicenseGate extensionName="forex">{children}</LicenseGate>
          </LayoutWrapper>
        </div>
      </div>
      <Footer />
    </div>
  );
}
