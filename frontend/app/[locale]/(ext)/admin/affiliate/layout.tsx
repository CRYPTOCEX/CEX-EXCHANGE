"use client";

import type { ReactNode } from "react";
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";
import { menu, colorSchema } from "./menu";
import { usePathname } from "@/i18n/routing";

export default function AdminAffiliateLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isSettingsPage = pathname.endsWith("/settings");

  // Full-screen layout for settings page
  if (isSettingsPage) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader menu={menu} colorSchema={colorSchema} userPath="/affiliate" />
      <main className="flex-1 mx-auto">{children}</main>
      <Footer />
    </>
  );
}
