"use client";
import { SiteHeader } from "@/components/partials/header/site-header";
import { SiteFooter } from "@/components/partials/footer/user-footer";

interface LegalLayoutProps {
  children: React.ReactNode;
}

export default function LegalLayout({ children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 pt-16">{children}</main>
      <SiteFooter />
    </div>
  );
}
