import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "accounts",
    title: "Accounts",
    description:
      "Manage user trading accounts, view balances, and handle account-related requests.",
    href: "/admin/forex/account",
    icon: "lucide:clipboard-list",
  },
  {
    key: "plans",
    title: "Plans",
    description: "Configure forex investment plans and duration options.",
    icon: "lucide:rocket",
    child: [
      {
        key: "plans-list",
        title: "Plans",
        description:
          "Create and manage investment plans with risk profiles and return structures.",
        href: "/admin/forex/plan",
        icon: "lucide:rocket",
      },
      {
        key: "durations",
        title: "Durations",
        description:
          "Configure investment duration options and associated interest rates.",
        href: "/admin/forex/duration",
        icon: "lucide:clock",
      },
    ],
  },
  {
    key: "investments",
    title: "Investments",
    description:
      "Monitor all user investments, track performance, and process payouts.",
    href: "/admin/forex/investment",
    icon: "lucide:bar-chart-3",
  },
  {
    key: "signals",
    title: "Signals",
    description:
      "Manage trading signals, configure signal providers, and track signal performance.",
    href: "/admin/forex/signal",
    icon: "lucide:activity",
  },
  {
    key: "transactions",
    title: "Transactions",
    description: "Monitor all forex-related financial transactions.",
    icon: "lucide:wallet",
    child: [
      {
        key: "deposit",
        title: "Deposit",
        description:
          "Review deposit requests, process approvals, and handle deposit issues.",
        href: "/admin/forex/deposit",
        icon: "lucide:arrow-down-circle",
      },
      {
        key: "withdraw",
        title: "Withdraw",
        description:
          "Process withdrawal requests, verify compliance, and manage payout queue.",
        href: "/admin/forex/withdraw",
        icon: "lucide:arrow-up-circle",
      },
    ],
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.forex;
