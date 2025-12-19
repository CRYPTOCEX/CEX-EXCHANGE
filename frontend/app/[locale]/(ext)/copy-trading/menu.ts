import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "discover",
    title: "Discover",
    href: "/copy-trading",
    icon: "lucide:search",
    exact: true,
    description:
      "Find top-performing traders to follow with detailed performance metrics and trading strategies.",
  },
  {
    key: "leaders",
    title: "Leaders",
    href: "/copy-trading/leader",
    icon: "lucide:trophy",
    description:
      "Browse verified trading leaders with proven track records, risk scores, and follower statistics.",
  },
  {
    key: "subscriptions",
    title: "Subscriptions",
    href: "/copy-trading/subscription",
    icon: "lucide:users-round",
    description:
      "Manage your active copy trading subscriptions and allocation settings.",
  },
  {
    key: "trades",
    title: "Trades",
    href: "/copy-trading/trade",
    icon: "lucide:activity",
    description:
      "View all copied trades with execution details, performance metrics, and profit/loss tracking.",
  },
  {
    key: "analytics",
    title: "Analytics",
    href: "/copy-trading/analytics",
    icon: "lucide:line-chart",
    description:
      "Advanced analytics dashboard with portfolio performance, risk metrics, and strategy insights.",
  },
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/copy-trading/dashboard",
    icon: "lucide:layout-dashboard",
    description:
      "Personal copy trading dashboard with quick access to subscriptions, performance, and settings.",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS["copy-trading"];
export const adminPath = "/admin/copy-trading";
