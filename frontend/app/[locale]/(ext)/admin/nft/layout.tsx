"use client";

import { usePathname, Link } from "@/i18n/routing";
import Footer from "@/components/partials/footer";
import SiteHeader from "@/components/partials/header/site-header";
import { menu, colorSchema } from "./menu";
import { LicenseGate } from "@/components/license/LicenseGate";

export default function NFTAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActivityPage = pathname.endsWith("/activity");

  /* `isSettingsPage` was the other half of this condition and is gone.
     `SettingsPage` renders a form with a category rail and a back chevron —
     no top bar — so hiding this nav left /admin/nft/settings with one route
     out, and its `pt-header` reserved 64px for a header that was not mounted.
     Full note in components/admin/settings/layout.ts. */
  if (isActivityPage) {
    /*
      THE CHROME GOES; THE GATE DOES NOT.

      This returned `{children}` bare, so /admin/nft/activity — the mint,
      transfer and sale feed — was the one extension admin route in the product
      that rendered on an install holding no NFT licence. The early return is
      here to drop the header and footer for a full-viewport surface, which is
      a layout decision; it was silently also dropping the licence check, which
      is not.

      Every other addon layout gates the content and leaves the chrome outside.
      This is the same rule, with no chrome to leave outside — but `<main>`
      stays: dropping the header and footer is a design choice, and dropping
      the document's only landmark is not one.
    */
    return (
      <main>
        <LicenseGate extensionName="nft">{children}</LicenseGate>
      </main>
    );
  }

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
        userPath="/nft"
        translationNamespace="ext_admin_nft"
        translationNavPrefix="nav"
      />
      <main className="flex-1">
        {/* Gate the CONTENT, not the chrome: `SiteHeader`/`Footer` are not
            licensed and used to sit inside the gate, so an in-flight licence
            check blanked the whole page — header, nav, content and footer —
            behind one centred spinner. See components/license/LicenseGate.tsx. */}
        <LicenseGate extensionName="nft">{children}</LicenseGate>
      </main>
      <Footer />
    </div>
  );
}
