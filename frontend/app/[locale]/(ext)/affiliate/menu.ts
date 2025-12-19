import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "home",
    title: "Home",
    href: "/affiliate",
    icon: "lucide:home",
    exact: true,
    description:
      "Join our affiliate program and earn commissions by referring new users to the platform.",
  },
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/affiliate/dashboard",
    icon: "lucide:layout-dashboard",
    description:
      "Track your referral performance, commissions earned, and network growth in real-time.",
  },
  {
    key: "network-management",
    title: "Network",
    description: "Manage your referral network and team performance.",
    icon: "lucide:users",
    child: [
      {
        key: "network",
        title: "Network",
        href: "/affiliate/network",
        icon: "lucide:users",
        description:
          "Visualize your referral network structure, downline activity, and team performance.",
      },
      {
        key: "referrals",
        title: "Referrals",
        href: "/affiliate/referral",
        icon: "lucide:user-plus",
        description:
          "Manage your referral links, track sign-ups, and monitor conversion rates.",
      },
      {
        key: "generator",
        title: "Link Generator",
        href: "/affiliate/referral-generator",
        icon: "lucide:link",
        description:
          "Create custom referral links with tracking parameters and campaign management.",
      },
    ],
  },
  {
    key: "earnings",
    title: "Earnings",
    description: "Track commissions and rewards.",
    icon: "lucide:gift",
    child: [
      {
        key: "rewards",
        title: "Rewards",
        href: "/affiliate/reward",
        icon: "lucide:gift",
        description:
          "View available rewards, claim bonuses, and track your reward history.",
      },
      {
        key: "conditions",
        title: "Commission Rates",
        href: "/affiliate/condition",
        icon: "lucide:percent",
        description:
          "Detailed breakdown of commission structures and earning potential at each level.",
      },
    ],
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.mlm;
export const adminPath = "/admin/affiliate";
