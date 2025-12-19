import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
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
