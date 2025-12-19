import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "overview",
    title: "Overview",
    description:
      "P2P trading platform overview with active trades, dispute metrics, and system performance.",
    href: "/admin/p2p",
    icon: "lucide:layout-dashboard",
    exact: true,
  },
  {
    key: "trading",
    title: "Trading",
    description: "Manage all P2P trading activities and resolve disputes.",
    icon: "lucide:repeat",
    child: [
      {
        key: "trades",
        title: "Trades",
        description:
          "Monitor active and completed trades, intervene in disputes, and ensure platform integrity.",
        href: "/admin/p2p/trade",
        icon: "lucide:repeat",
      },
      {
        key: "offers",
        title: "Offers",
        description:
          "Review and moderate user offers, manage suspicious listings, and enforce trading policies.",
        href: "/admin/p2p/offer",
        icon: "lucide:tag",
      },
      {
        key: "disputes",
        title: "Disputes",
        description:
          "Handle trade disputes, review evidence, and make fair resolutions between parties.",
        href: "/admin/p2p/dispute",
        icon: "lucide:shield",
      },
    ],
  },
  {
    key: "payment-methods",
    title: "Payment Methods",
    description:
      "Configure available payment methods, set limits, and manage payment provider integrations.",
    href: "/admin/p2p/payment-method",
    icon: "lucide:credit-card",
  },
  {
    key: "settings",
    title: "Settings",
    description:
      "P2P platform configuration including fees, limits, and trading rules.",
    href: "/admin/p2p/settings",
    icon: "lucide:settings",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.p2p;
