"use client";

import { usePathname, Link } from "@/i18n/routing";
import Footer from "@/components/partials/footer";
import SiteHeader from "@/components/partials/header/site-header";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { menu, colorSchema } from "./menu";

function VisitMarketplaceButton() {
  const tExtAdmin = useTranslations("ext_admin");

  return (
    <Link href="/nft">
      <Button variant="outline" size="sm">
        <ExternalLink className="h-4 w-4 mr-2" />
        {tExtAdmin("visit_marketplace")}
      </Button>
    </Link>
  );
}

export default function NFTAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActivityPage = pathname.endsWith("/activity");
  const isSettingsPage = pathname.endsWith("/settings");

  // Skip layout for activity page or settings page
  if (isActivityPage || isSettingsPage) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader
        menu={menu}
        colorSchema={colorSchema}
        rightControls={<VisitMarketplaceButton />}
        userPath="/nft"
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
