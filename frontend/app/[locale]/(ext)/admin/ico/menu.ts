import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    description:
      "ICO platform overview with active sales, contribution metrics, and project statistics.",
    href: "/admin/ico",
    icon: "lucide:layout-dashboard",
    exact: true,
  },
  {
    key: "offer",
    title: "Offers",
    description:
      "Manage token sale offerings, approve projects, and configure sale parameters.",
    href: "/admin/ico/offer",
    icon: "lucide:tag",
  },
  {
    key: "transaction",
    title: "Transactions",
    description:
      "Monitor all ICO transactions, process refunds, and track token distributions.",
    href: "/admin/ico/transaction",
    icon: "lucide:arrow-left-right",
  },
  {
    key: "settings",
    title: "Settings",
    description:
      "Configure ICO platform settings, fees, and compliance requirements.",
    href: "/admin/ico/settings",
    icon: "lucide:settings",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.ico;
