import { NAV_COLOR_SCHEMAS } from "@/lib/nav-color-schema";

export const menu: MenuItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    description:
      "Overview of AI investment performance, plan metrics, and ROI analytics.",
    href: "/admin/ai/investment",
    icon: "lucide:layout-dashboard",
  },
  {
    key: "plans",
    title: "Plans",
    description:
      "Configure AI investment plans with risk profiles, expected returns, and investment parameters.",
    href: "/admin/ai/investment/plan",
    icon: "lucide:brain",
  },
  {
    key: "durations",
    title: "Durations",
    description:
      "Set investment duration options with associated interest rates and compound settings.",
    href: "/admin/ai/investment/duration",
    icon: "lucide:clock",
  },
  {
    key: "logs",
    title: "Investment Logs",
    description:
      "Monitor all AI investment activities, track performance, and manage payouts.",
    href: "/admin/ai/investment/log",
    icon: "lucide:history",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.ai;
