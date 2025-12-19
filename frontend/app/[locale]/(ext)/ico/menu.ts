import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "home",
    title: "Home",
    href: "/ico",
    icon: "lucide:home",
    exact: true,
    description:
      "Discover upcoming and active token sales with comprehensive project analysis and investment opportunities.",
  },
  {
    key: "offers",
    title: "Offers",
    href: "/ico/offer",
    icon: "lucide:package",
    description:
      "Browse all available ICO offerings with detailed tokenomics, vesting schedules, and project fundamentals.",
  },
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/ico/dashboard",
    icon: "lucide:layout-dashboard",
    description:
      "Personal investment dashboard tracking your token purchases, vesting status, and claim schedules.",
  },
  {
    key: "transactions",
    title: "Transactions",
    href: "/ico/transaction",
    icon: "lucide:receipt",
    description:
      "Complete transaction history of all your ICO participations with status tracking and receipts.",
  },
  {
    key: "creator",
    title: "Creator",
    icon: "lucide:users",
    description:
      "Launch and manage your own token sales with professional tools for project creators.",
    child: [
      {
        key: "creator-dashboard",
        title: "Dashboard",
        href: "/ico/creator",
        icon: "lucide:layout-dashboard",
        description:
          "Manage your token sale campaigns, monitor contributions, and track investor engagement.",
      },
      {
        key: "launch-token",
        title: "Launch Token",
        href: "/ico/creator/launch",
        icon: "lucide:rocket",
        description:
          "Create and deploy new token sales with customizable phases, pricing, and distribution rules.",
      },
      {
        key: "token-simulator",
        title: "Token Simulator",
        href: "/ico/creator/token-simulator",
        icon: "lucide:calculator",
        description:
          "Model your tokenomics and test different sale parameters before launching your ICO.",
      },
    ],
  },
  {
    key: "about",
    title: "About",
    href: "/ico/about",
    icon: "lucide:info",
    description:
      "Learn about our ICO platform features, security measures, and compliance standards.",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.ico;
export const adminPath = "/admin/ico";
