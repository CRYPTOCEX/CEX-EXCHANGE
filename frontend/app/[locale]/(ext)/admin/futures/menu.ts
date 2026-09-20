import { NAV_COLOR_SCHEMAS } from "@/lib/nav-color-schema";

export const menu: MenuItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    description:
      "Overview of futures trading activity, positions, and market performance.",
    href: "/admin/futures",
    icon: "lucide:layout-dashboard",
  },
  {
    key: "markets",
    title: "Markets",
    description:
      "Configure futures markets, set leverage limits, and manage contract specifications.",
    href: "/admin/futures/market",
    icon: "lucide:candlestick-chart",
  },
  {
    key: "positions",
    title: "Positions",
    description:
      "Monitor all open positions, track liquidations, and manage risk exposure.",
    href: "/admin/futures/position",
    icon: "lucide:arrow-left-right",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.futures;
