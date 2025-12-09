"use client";

import { ExtNavbar, NavItem } from "@/app/[locale]/(ext)/navbar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  Settings,
  TestTube,
  Zap,
  Puzzle,
} from "lucide-react";
import { useMerchantMode } from "../context/merchant-mode";

const merchantNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/gateway/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "Payments",
    href: "/gateway/payment",
    icon: CreditCard,
  },
  {
    title: "Payouts",
    href: "/gateway/payouts",
    icon: Wallet,
  },
  {
    title: "Integrations",
    href: "/gateway/integration",
    icon: Puzzle,
  },
  {
    title: "Settings",
    href: "/gateway/settings",
    icon: Settings,
  },
];

function ModeToggle() {
  const { mode, setMode, isTestMode } = useMerchantMode();

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
          isTestMode
            ? "bg-yellow-500/20 text-yellow-600"
            : "bg-green-500/20 text-green-600"
        }`}
      >
        {isTestMode ? (
          <TestTube className="h-3 w-3" />
        ) : (
          <Zap className="h-3 w-3" />
        )}
        {isTestMode ? "Test" : "Live"}
      </div>
      <Switch
        checked={!isTestMode}
        onCheckedChange={(checked) => setMode(checked ? "LIVE" : "TEST")}
        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-yellow-500"
      />
    </div>
  );
}

export default function GatewayNavbar() {
  return (
    <ExtNavbar
      navItems={merchantNavItems}
      backHref="/"
      rightSlot={<ModeToggle />}
    />
  );
}
