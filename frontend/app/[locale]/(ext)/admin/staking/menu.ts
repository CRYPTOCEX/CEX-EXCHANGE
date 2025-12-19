import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "overview",
    title: "Overview",
    description:
      "Administrative dashboard with staking pool performance, user positions, and system health metrics.",
    href: "/admin/staking",
    icon: "lucide:layout-dashboard",
    exact: true,
  },
  {
    key: "pools",
    title: "Pools",
    description:
      "Create and manage staking pools with configurable APY rates, lock periods, and reward distributions.",
    href: "/admin/staking/pool",
    icon: "lucide:coins",
  },
  {
    key: "positions",
    title: "Positions",
    description:
      "Monitor all user staking positions, process early withdrawals, and manage stake allocations.",
    href: "/admin/staking/position",
    icon: "lucide:wallet",
  },
  {
    key: "earnings",
    title: "Earnings",
    description:
      "Track platform earnings, reward distributions, and staking revenue analytics.",
    href: "/admin/staking/earning",
    icon: "lucide:dollar-sign",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.staking;
