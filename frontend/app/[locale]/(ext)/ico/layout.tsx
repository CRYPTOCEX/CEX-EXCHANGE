import type React from "react";
import type { Metadata } from "next";
import Footer from "@/components/partials/footer";
import IcoNavbar from "./navbar";
import { PlatformAnnouncement } from "./components/platform-announcement";

export const metadata: Metadata = {
  title: {
    default: "Initial Token Offering",
    template: "%s",
  },
  description: "Launch and invest in the next generation of digital assets",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <IcoNavbar />
      <main className="flex-1 pt-14 md:pt-18">
        <PlatformAnnouncement />
        {children}
      </main>
      <Footer />
    </div>
  );
}
