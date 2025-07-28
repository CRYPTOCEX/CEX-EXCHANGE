import type React from "react";
import type { Metadata } from "next";
import Footer from "@/components/partials/footer";
import { IcoAdminMenu } from "./components/navbar";

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
    <>
      <IcoAdminMenu />
      <main className="flex-1 mx-auto pt-14 md:pt-18 min-h-screen">
        {children}
      </main>
      <Footer />
    </>
  );
}
