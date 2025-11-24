"use client";

import type { ReactNode } from "react";
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";

const financeMenu = [
  {
    key: "wallets",
    title: "Wallets",
    href: "/finance/wallet",
    icon: "lucide:wallet",
  },
  {
    key: "deposit",
    title: "Deposit",
    href: "/finance/deposit",
    icon: "lucide:arrow-down-to-line",
  },
  {
    key: "withdraw",
    title: "Withdraw",
    href: "/finance/withdraw",
    icon: "lucide:arrow-up-from-line",
  },
  {
    key: "transfer",
    title: "Transfer",
    href: "/finance/transfer",
    icon: "lucide:arrow-left-right",
  },
  {
    key: "history",
    title: "History",
    href: "/finance/history",
    icon: "lucide:history",
  },
];

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Consistent top nav */}
      <SiteHeader menu={financeMenu} />
      <div className="container mx-auto px-4 pt-24 pb-18 min-h-[calc(100vh-56px)]">
        {/* Main content below header */}
        <main>{children}</main>
      </div>
      <Footer />
    </div>
  );
}
