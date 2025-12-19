"use client";

import type React from "react";
import Footer from "@/components/partials/footer";
import SiteHeader from "@/components/partials/header/site-header";
import { menu, colorSchema } from "./menu";
import { usePathname } from "@/i18n/routing";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const isSettingsPage = pathname.endsWith("/settings");

  // Full-screen layout for settings page
  if (isSettingsPage) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader menu={menu} colorSchema={colorSchema} userPath="/" />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
