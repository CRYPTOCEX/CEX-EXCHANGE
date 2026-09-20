"use client";

import type { ReactNode } from "react";
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";
import { AmbientBackground } from "./_components/finance-ui";

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
    <div className="relative min-h-screen text-foreground">
      <AmbientBackground tone="blue" />
      <SiteHeader menu={financeMenu} />
      {/* `pt-header-clear`, not `pt-24`: this layout renders the `fixed top-0`
          SiteHeader, so the top half of that padding is clearance and has to
          track `--header-height`. Same 96px at the shipped 4rem bar. */}
      <div className="relative pt-header-clear pb-16 min-h-[calc(100vh-56px)]">
        <main>{children}</main>
      </div>
      <Footer />
    </div>
  );
}
