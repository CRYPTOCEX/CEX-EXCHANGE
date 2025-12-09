import type React from "react";
import type { Metadata } from "next";
import Footer from "@/components/partials/footer";
import AIMarketMakerAdminNavbar from "./components/navbar";

export const metadata: Metadata = {
  title: "AI Market Maker Admin Dashboard",
  description: "Admin dashboard for AI-powered market making",
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <>
      <AIMarketMakerAdminNavbar />
      <main
        className="flex-1"
        style={{ minHeight: "calc(100vh - 112px - 120px)" }}
      >
        {children}
      </main>
      <Footer />
    </>
  );
}
