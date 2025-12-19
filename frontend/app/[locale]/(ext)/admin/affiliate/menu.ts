import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    description:
      "Affiliate program overview with network growth, commission metrics, and top performers.",
    href: "/admin/affiliate",
    icon: "lucide:layout-dashboard",
    exact: true,
  },
  {
    key: "program-management",
    title: "Program",
    description: "Manage affiliate program settings and structure.",
    icon: "lucide:settings",
    child: [
      {
        key: "conditions",
        title: "Conditions",
        description:
          "Configure commission structures, tier requirements, and qualification rules.",
        href: "/admin/affiliate/condition",
        icon: "lucide:bar-chart-3",
      },
      {
        key: "rewards",
        title: "Rewards",
        description:
          "Manage reward programs, bonus structures, and payout thresholds.",
        href: "/admin/affiliate/reward",
        icon: "lucide:trophy",
      },
      {
        key: "settings",
        title: "Settings",
        description:
          "Affiliate program configuration including payout methods and program rules.",
        href: "/admin/affiliate/settings",
        icon: "lucide:settings",
      },
    ],
  },
  {
    key: "referrals",
    title: "Referrals",
    description:
      "Monitor referral activity, track conversions, and manage referral links.",
    href: "/admin/affiliate/referral",
    icon: "lucide:user-plus",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.affiliate;
