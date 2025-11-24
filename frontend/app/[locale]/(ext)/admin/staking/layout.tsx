import type React from "react";
import type { Metadata } from "next";
import Footer from "@/components/partials/footer";
import IcoNavbar from "../../ico/navbar";
import AdminNavbar from "./components/navbar";

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
      <AdminNavbar />
      <main className="flex-1 mx-auto container pt-8 space-y-8 pb-24">
        {children}
      </main>
      <Footer />
    </>
  );
}
