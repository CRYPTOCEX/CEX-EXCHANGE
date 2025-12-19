import type React from "react";
import type { Metadata } from "next";
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";
import { menu, colorSchema } from "./menu";

export const metadata: Metadata = {
  title: {
    default: "Initial Token Offering",
    template: "%s",
  },
  description: "Launch and invest in the next generation of digital assets",
};

export default function AdminIcoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader menu={menu} colorSchema={colorSchema} userPath="/ico" />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
