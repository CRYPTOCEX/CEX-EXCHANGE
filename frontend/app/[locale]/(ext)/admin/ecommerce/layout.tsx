import type React from "react";
import Client from "./client";
import Footer from "@/components/partials/footer";

export default function AdminEcommerceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Client>{children}</Client>
      <Footer />
    </div>
  );
}
