import type React from "react";
import SiteHeader from "@/components/partials/header/site-header";
import { menu, colorSchema } from "./menu";

export default function AdminFaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader menu={menu} colorSchema={colorSchema} userPath="/faq" />
      <main className="flex-1 pb-24">{children}</main>
    </>
  );
}
