import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
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
