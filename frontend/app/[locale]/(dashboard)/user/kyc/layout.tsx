"use client";

import type { ReactNode } from "react";
import { useUserStore } from "@/store/user";
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";

const kycMenu = [
  {
    key: "kyc-home",
    title: "KYC Verification",
    href: "/user/kyc",
    icon: "lucide:shield-check",
  },
  {
    key: "profile",
    title: "Profile",
    href: "/user/profile",
    icon: "lucide:user",
  },
];

export default function KYCLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader menu={kycMenu} />
      <main className="mx-auto pt-14 md:pt-18">{children}</main>
      <Footer />
    </div>
  );
}
