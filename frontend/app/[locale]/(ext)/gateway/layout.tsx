"use client";

import { ReactNode } from "react";
import { usePathname } from "@/i18n/routing";
import GatewayNavbar from "./components/navbar";
import Footer from "@/components/partials/footer";
import { MerchantModeProvider } from "./context/merchant-mode";

export default function GatewayLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Don't show header/footer for checkout and docs pages
  if (pathname.includes("/checkout/") || pathname.endsWith("/gateway/docs")) {
    return <>{children}</>;
  }

  return (
    <MerchantModeProvider>
      <GatewayNavbar />
      <main
        className="flex-1 mx-auto container pt-8 space-y-8 pb-24"
        style={{ minHeight: "calc(100vh - 112px - 120px)" }}
      >
        {children}
      </main>
      <Footer />
    </MerchantModeProvider>
  );
}
