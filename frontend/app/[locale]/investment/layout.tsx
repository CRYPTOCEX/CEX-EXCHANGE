"use client";

import type { ReactNode } from "react";
import { useUserStore } from "@/store/user";
import { usePathname } from "@/i18n/routing";
import SiteHeader from "@/components/partials/header/site-header";
import { ExtensionLayoutWrapper } from "@/components/layout/extension-layout-wrapper";
import { WorkspaceGround } from "@/components/layout/workspace-ground";
import { menu as baseMenu, colorSchema, adminPath } from "./menu";

/**
 * The investment chrome.
 *
 * WHAT CHANGED
 * ------------
 * This was a plain `<div>` wrapping a local `navbar.tsx`, a `<main>` and the
 * footer, and it left three things on the floor that every neighbouring product
 * already had:
 *
 *   NO GROUND. Every route below was a flat `bg-background`, so walking from
 *   /staking or /p2p into /investment looked like arriving at a different,
 *   emptier product. `WorkspaceGround` is drawn here, once, so a route added
 *   later inherits it — and gated on the path rather than layered under the
 *   landing's, because the landing renders `LandingShell`, which brings its own
 *   ground, and two fixed `-z-10` grounds in one tree both paint with DOM order
 *   deciding the winner.
 *
 *   NO TRANSLATION SCOPE. `SiteHeader` was mounted with no `translationNamespace`,
 *   so it fell back to the core `menu` namespace — and `menuScopeFor({ namespace:
 *   "menu" })` returns null, which means this menu had no stable override
 *   identity and admin menu edits in /admin/menus could not target it at all.
 *
 *   NO AUTH FILTER. All four items rendered for signed-out visitors, two of
 *   them onto sign-in walls.
 *
 * `main` also carried `flex-1 mx-auto` on a parent that was never a flex column
 * — `flex-1` did nothing and `mx-auto` centred a full-width block against
 * itself — and the footer consequently did not stick on short pages.
 * `ExtensionLayoutWrapper` owns that now, and swaps in the marketing footer on
 * the landing page the way every other product does.
 */
export default function InvestmentLayout({ children }: { children: ReactNode }) {
  const { user } = useUserStore();
  const pathname = usePathname();
  const menu = baseMenu.filter((item) => !item.auth || !!user);

  const isLanding = pathname === "/investment" || pathname === "/investment/";

  return (
    <div className="min-h-screen flex flex-col">
      {!isLanding && <WorkspaceGround />}
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        adminPath={adminPath}
        translationNamespace="investment"
        translationNavPrefix="nav"
      />
      <ExtensionLayoutWrapper landingPath="/investment">
        {children}
      </ExtensionLayoutWrapper>
    </div>
  );
}
