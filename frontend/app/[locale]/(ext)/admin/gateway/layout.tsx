"use client";

import type React from "react";
import Footer from "@/components/partials/footer";
import GatewayAdminNavbar from "./components/navbar";
import { usePathname } from "@/i18n/routing";
import { AdminGatewayModeProvider } from "./context/admin-gateway-mode";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  // Full-screen layout for design preview page
  if (pathname.includes("/settings/design")) {
    return <>{children}</>;
  }

  return (
    <AdminGatewayModeProvider>
      <GatewayAdminNavbar />
      <main
        className="flex-1 mx-auto container pt-8 space-y-8 pb-24"
        style={{ minHeight: "calc(100vh - 112px - 120px)" }}
      >
        {children}
      </main>
      <Footer />
    </AdminGatewayModeProvider>
  );
}
