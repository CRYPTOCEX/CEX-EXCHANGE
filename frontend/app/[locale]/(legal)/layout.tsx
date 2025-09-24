"use client";
import { SiteHeader } from "@/components/partials/header/site-header";
import { SiteFooter } from "@/components/partials/footer/user-footer";

interface LegalLayoutProps {
  children: React.ReactNode;
}

export default function LegalLayout({ children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 pt-16 bg-background">{children}</main>
      <SiteFooter />
    </div>
  );
}
