import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    description:
      "Copy trading platform overview with leader performance, subscription metrics, and system health.",
    href: "/admin/copy-trading",
    icon: "lucide:layout-dashboard",
    exact: true,
  },
  {
    key: "trading",
    title: "Trading",
    description: "Manage copy trading activities and user subscriptions.",
    icon: "lucide:activity",
    child: [
      {
        key: "leaders",
        title: "Leaders",
        description:
          "Review and approve trading leaders, monitor performance, and manage leader applications.",
        href: "/admin/copy-trading/leader",
        icon: "lucide:crown",
      },
      {
        key: "subscriptions",
        title: "Subscriptions",
        description:
          "Monitor user subscriptions, track copy relationships, and manage allocation settings.",
        href: "/admin/copy-trading/follower",
        icon: "lucide:users",
      },
      {
        key: "trades",
        title: "Trades",
        description:
          "View all copied trades, analyze execution quality, and investigate discrepancies.",
        href: "/admin/copy-trading/trade",
        icon: "lucide:activity",
      },
      {
        key: "transactions",
        title: "Transactions",
        description:
          "Track all copy trading financial transactions and commission distributions.",
        href: "/admin/copy-trading/transaction",
        icon: "lucide:arrow-left-right",
      },
    ],
  },
  {
    key: "system",
    title: "System",
    description: "System administration and monitoring tools.",
    icon: "lucide:settings",
    child: [
      {
        key: "audit",
        title: "Audit Log",
        description:
          "Comprehensive audit trail of all system activities and administrative actions.",
        href: "/admin/copy-trading/audit",
        icon: "lucide:file-text",
      },
      {
        key: "health",
        title: "Health",
        description:
          "System health monitoring with performance metrics and error tracking.",
        href: "/admin/copy-trading/health",
        icon: "lucide:heart-pulse",
      },
      {
        key: "settings",
        title: "Settings",
        description:
          "Platform configuration including copy parameters, fees, and risk controls.",
        href: "/admin/copy-trading/settings",
        icon: "lucide:settings",
      },
    ],
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS["copy-trading"];
