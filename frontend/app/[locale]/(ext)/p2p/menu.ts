import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "home",
    title: "Home",
    href: "/p2p",
    icon: "lucide:home",
    exact: true,
    description:
      "Peer-to-peer cryptocurrency exchange with secure escrow and multiple payment methods.",
  },
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/p2p/dashboard",
    icon: "lucide:layout-dashboard",
    auth: true,
    description:
      "Personal P2P trading dashboard with active orders, trade history, and reputation score.",
  },
  {
    key: "offer",
    title: "Offers",
    href: "/p2p/offer",
    icon: "lucide:tag",
    description:
      "Browse and create buy/sell offers with customizable rates and payment methods.",
  },
  {
    key: "trade",
    title: "Trades",
    href: "/p2p/trade",
    icon: "lucide:arrow-left-right",
    description:
      "Manage your active P2P trades, communicate with counterparties, and track transaction status.",
  },
  {
    key: "guided-matching",
    title: "Quick Match",
    href: "/p2p/guided-matching",
    icon: "lucide:compass",
    description:
      "Intelligent matching system to find the best offers based on your trading preferences.",
  },
  {
    key: "guide",
    title: "Guide",
    href: "/p2p/guide",
    icon: "lucide:book-open",
    description:
      "Comprehensive P2P trading guide with safety tips, best practices, and dispute resolution process.",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.p2p;
export const adminPath = "/admin/p2p";
