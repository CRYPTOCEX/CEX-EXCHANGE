import type React from "react";
import ShopNavbar from "./components/navbar";
import Footer from "@/components/partials/footer";

export default function EcommerceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <ShopNavbar />
      <div className="mx-auto pt-14 md:pt-18 min-h-[calc(100vh-56px)]">
        {children}
      </div>
      <Footer />
    </div>
  );
}
