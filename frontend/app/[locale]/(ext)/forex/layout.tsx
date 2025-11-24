import type React from "react";
import type { Metadata } from "next";
import Footer from "@/components/partials/footer";
import ForexNavbar from "./navbar";

export const metadata: Metadata = {
  title: {
    default: "Forex - Trading Platform",
    template: "%s | Forex",
  },
  description: "Trade and invest in the global forex markets",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <ForexNavbar />
      <main className="flex-1 mx-auto pt-14 md:pt-18">{children}</main>
      <Footer />
    </div>
  );
}
