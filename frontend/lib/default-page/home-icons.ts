/**
 * The icon names the home page can actually draw.
 *
 * `home.tsx` resolves every stored `icon` string through a hand-built `iconMap`
 * and falls back to a generic glyph when the name is not in it — silently. So
 * an editor that offers a free-text field, or a longer list than this, lets an
 * owner pick an icon that renders as something else entirely with no warning
 * anywhere.
 *
 * This list mirrors that map. `home-icons.test.ts` parses `home.tsx` and fails
 * if the two ever disagree, because a comment asking the next person to keep
 * two lists in step is not a mechanism.
 */
export const HOME_ICON_NAMES = [
  "Activity",
  "ArrowLeftRight",
  "Award",
  "BadgePercent",
  "Banknote",
  "BarChart3",
  "Boxes",
  "Brain",
  "CandlestickChart",
  "CheckCircle",
  "CircleDollarSign",
  "Clock",
  "Coins",
  "Copy",
  "Cpu",
  "CreditCard",
  "Crosshair",
  "Database",
  "DollarSign",
  "Flame",
  "Folder",
  "Gavel",
  "Gem",
  "Gift",
  "Globe",
  "HandCoins",
  "Hexagon",
  "Image",
  "Landmark",
  "Layers",
  "LayoutGrid",
  "LineChart",
  "Lock",
  "Network",
  "Orbit",
  "Package",
  "Percent",
  "PieChart",
  "Rocket",
  "Scale",
  "Shield",
  "ShoppingBag",
  "ShoppingCart",
  "Sparkles",
  "Star",
  "Store",
  "Tag",
  "Target",
  "Timer",
  "TrendingDown",
  "TrendingUp",
  "Trophy",
  "UserCheck",
  "Users",
  "Wallet",
  "Zap",
] as const;

export type HomeIconName = (typeof HOME_ICON_NAMES)[number];

export function isHomeIcon(value: unknown): value is HomeIconName {
  return typeof value === "string" && (HOME_ICON_NAMES as readonly string[]).includes(value);
}
