import type React from "react";
import type { Metadata } from "next";
import Footer from "@/components/partials/footer";
import InvestmentNavbar from "./navbar";

export const metadata: Metadata = {
  title: {
    default: "Investment - Portfolio Management",
    template: "%s | Investment",
  },
  description: "Professional investment platform with diverse opportunities",
};

export default function InvestmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <InvestmentNavbar />
      <main className="flex-1 mx-auto pt-14 md:pt-18">{children}</main>
      <Footer />
    </div>
  );
}
