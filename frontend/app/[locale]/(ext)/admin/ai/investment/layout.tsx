import type React from "react";
import Footer from "@/components/partials/footer";
import SiteHeader from "@/components/partials/header/site-header";
import { menu, colorSchema } from "./menu";

export default function AdminAIInvestmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader menu={menu} colorSchema={colorSchema} userPath="/" />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
