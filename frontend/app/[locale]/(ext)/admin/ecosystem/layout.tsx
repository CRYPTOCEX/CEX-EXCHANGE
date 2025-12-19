import type React from "react";
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";
import { menu, colorSchema } from "./menu";

export default function AdminEcosystemLayout({
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
