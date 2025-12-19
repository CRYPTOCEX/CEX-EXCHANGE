import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "gateway",
    title: "Gateway",
    href: "/gateway",
    icon: "lucide:home",
    exact: true,
    description:
      "Professional payment gateway for merchants to accept cryptocurrency payments with seamless integration.",
  },
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/gateway/dashboard",
    icon: "lucide:layout-dashboard",
    description:
      "Merchant dashboard with transaction analytics, payment tracking, and API management tools.",
  },
  {
    key: "payments",
    title: "Payments",
    href: "/gateway/payment",
    icon: "lucide:credit-card",
    description:
      "Complete payment transaction history with status tracking and reconciliation tools.",
  },
  {
    key: "payouts",
    title: "Payouts",
    href: "/gateway/payouts",
    icon: "lucide:wallet",
    description:
      "Manage withdrawal requests and track payout history with automated processing.",
  },
  {
    key: "integrations",
    title: "Integrations",
    href: "/gateway/integration",
    icon: "lucide:puzzle",
    description:
      "Comprehensive API documentation and integration guides for developers.",
  },
  {
    key: "settings",
    title: "Settings",
    href: "/gateway/settings",
    icon: "lucide:settings",
    description:
      "Configure gateway preferences, webhook endpoints, and notification settings.",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.gateway;
export const adminPath = "/admin/gateway";
