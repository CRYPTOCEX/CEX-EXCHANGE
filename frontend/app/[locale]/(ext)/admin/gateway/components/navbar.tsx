"use client";

import { ExtNavbar, NavItem } from "@/app/[locale]/(ext)/navbar";
import { Switch } from "@/components/ui/switch";
import {
  LayoutDashboard,
  Store,
  CreditCard,
  Wallet,
  Settings,
  TestTube,
  Zap,
} from "lucide-react";
import { useAdminGatewayMode } from "../context/admin-gateway-mode";

const adminNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin/gateway",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "Merchants",
    href: "/admin/gateway/merchant",
    icon: Store,
  },
  {
    title: "Payments",
    href: "/admin/gateway/payment",
    icon: CreditCard,
  },
  {
    title: "Payouts",
    href: "/admin/gateway/payout",
    icon: Wallet,
  },
  {
    title: "Settings",
    href: "/admin/gateway/settings",
    icon: Settings,
  },
];

function AdminModeToggle() {
  const { mode, setMode, isTestMode } = useAdminGatewayMode();

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

export default function GatewayAdminNavbar() {
  return (
    <ExtNavbar
      navItems={adminNavItems}
      isAdmin={true}
      backHref="/admin"
      rightSlot={<AdminModeToggle />}
    />
  );
}
