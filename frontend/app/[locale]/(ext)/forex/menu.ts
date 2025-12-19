import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "home",
    title: "Home",
    href: "/forex",
    icon: "lucide:home",
    exact: true,
    description:
      "Access professional forex trading with competitive spreads and institutional-grade execution.",
  },
  {
    key: "investment-plans",
    title: "Plans",
    href: "/forex/plan",
    icon: "lucide:briefcase",
    description:
      "Browse investment plans with various risk profiles, expected returns, and flexible durations.",
  },
  {
    key: "dashboard",
    title: "Account",
    href: "/forex/dashboard",
    icon: "lucide:layout-dashboard",
    description:
      "Manage your forex trading accounts, monitor performance, and track your investments.",
  },
  {
    key: "investments",
    title: "Investments",
    href: "/forex/investment",
    icon: "lucide:trending-up",
    description:
      "View your active forex investments, returns, and detailed performance analytics.",
  },
  {
    key: "transactions",
    title: "Transactions",
    href: "/forex/transaction",
    icon: "lucide:receipt",
    description:
      "Complete history of all forex-related transactions including deposits, withdrawals, and trades.",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.forex;
export const adminPath = "/admin/forex/account";
