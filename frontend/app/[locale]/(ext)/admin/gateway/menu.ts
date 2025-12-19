import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    description:
      "Payment gateway overview with transaction volumes, merchant activity, and revenue metrics.",
    href: "/admin/gateway",
    icon: "lucide:layout-dashboard",
    exact: true,
  },
  {
    key: "merchants",
    title: "Merchants",
    description:
      "Manage merchant accounts, review applications, and configure merchant-specific settings.",
    href: "/admin/gateway/merchant",
    icon: "lucide:store",
  },
  {
    key: "payments",
    title: "Payments",
    description:
      "Monitor all payment transactions, handle disputes, and process refunds.",
    href: "/admin/gateway/payment",
    icon: "lucide:credit-card",
  },
  {
    key: "payouts",
    title: "Payouts",
    description:
      "Manage merchant payouts, configure payout schedules, and track disbursements.",
    href: "/admin/gateway/payout",
    icon: "lucide:wallet",
  },
  {
    key: "settings",
    title: "Settings",
    description:
      "Gateway configuration including fees, supported currencies, and integration settings.",
    href: "/admin/gateway/settings",
    icon: "lucide:settings",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.gateway;
