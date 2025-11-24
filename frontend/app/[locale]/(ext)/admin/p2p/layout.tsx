import type React from "react";
import type { Metadata } from "next";
import Footer from "@/components/partials/footer";
import P2PAdminNavbar from "./components/navbar";

export const metadata: Metadata = {
  title: "P2P Admin Dashboard",
  description: "Admin dashboard for the P2P trading platform",
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <>
      <P2PAdminNavbar />
      <main className="flex-1 mx-auto container pt-8 space-y-8 pb-24" style={{ minHeight: 'calc(100vh - 112px - 120px)' }}>
        {children}
      </main>
      <Footer />
    </>
  );
}
