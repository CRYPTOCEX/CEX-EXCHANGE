import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    description:
      "AI market maker overview with bot performance, liquidity metrics, and system health.",
    href: "/admin/ai/market-maker",
    icon: "lucide:layout-dashboard",
    exact: true,
  },
  {
    key: "markets",
    title: "Markets",
    description:
      "Configure markets for AI market making with spread settings and volume parameters.",
    href: "/admin/ai/market-maker/market",
    icon: "lucide:bar-chart-3",
  },
  {
    key: "analytics",
    title: "Analytics",
    description:
      "Detailed analytics on market maker performance, profitability, and market impact.",
    href: "/admin/ai/market-maker/analytics",
    icon: "lucide:activity",
  },
  {
    key: "settings",
    title: "Settings",
    description:
      "Configure AI market maker parameters, risk controls, and bot behavior settings.",
    href: "/admin/ai/market-maker/settings",
    icon: "lucide:settings",
  },
  {
    key: "guide",
    title: "Guide",
    description:
      "Documentation and best practices for managing AI market maker operations.",
    href: "/admin/ai/market-maker/guide",
    icon: "lucide:book-open",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.ai;
