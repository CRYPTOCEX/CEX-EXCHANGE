import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/staking",
    icon: "lucide:layout-dashboard",
    exact: true,
    description:
      "Comprehensive staking overview with real-time analytics, pool performance metrics, and quick access to your staking positions.",
  },
  {
    key: "staking-pools",
    title: "Staking Pools",
    href: "/staking/pool",
    icon: "lucide:coins",
    description:
      "Browse available staking pools with competitive APY rates, lock periods, and detailed reward structures.",
  },
  {
    key: "my-positions",
    title: "My Positions",
    href: "/staking/position",
    icon: "lucide:wallet",
    description:
      "Track your active staking positions, accumulated rewards, and manage withdrawals from a unified dashboard.",
  },
  {
    key: "staking-guide",
    title: "Staking Guide",
    href: "/staking/guide",
    icon: "lucide:book-open",
    description:
      "Step-by-step tutorials and best practices for maximizing your staking rewards and understanding pool mechanics.",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.staking;
export const adminPath = "/admin/staking";
