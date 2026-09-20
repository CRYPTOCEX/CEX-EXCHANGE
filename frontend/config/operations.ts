import { createElement, type ReactElement } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  BookOpen,
  Bot,
  Boxes,
  Coins,
  CreditCard,
  Gavel,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  LifeBuoy,
  type LucideIcon,
  Package,
  Repeat,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Store,
  Target,
  Truck,
  Undo2,
  Users,
  Wallet,
} from "lucide-react";

import type { BadgeTone } from "@/components/ui/badge";

/**
 * How an operations queue PRESENTS itself.
 *
 * The server owns what a queue IS — its count, its SLA budget, its href and the
 * permission behind it (`api/admin/operations/summary.get.ts`). It deliberately
 * does not own the icon: a Lucide component cannot cross a JSON boundary, and
 * the alternative (an icon NAME string in the payload, resolved through a map on
 * the client) is the same map with an extra failure mode, where a typo in the
 * backend renders a blank square with nothing to catch it.
 *
 * So the map lives here, keyed by the queue key, and it is shared by BOTH
 * surfaces that render queues — the header dropdown and the dashboard's work
 * board. That sharing is the point: those two show the same data, and an
 * operator who learns that the scales-of-justice glyph means "a dispute" in one
 * should not have to relearn it in the other.
 *
 * A key with no entry falls back to a generic glyph rather than rendering
 * nothing, so adding a queue on the server can never blank a row here — it just
 * looks generic until someone picks an icon.
 */
export const QUEUE_ICONS: Record<string, LucideIcon> = {
  // ── core ────────────────────────────────────────────────────────────────
  verification: ShieldCheck,
  withdrawals: Banknote,
  deposits: Wallet,
  transfers: ArrowLeftRight,
  support: LifeBuoy,

  // ── addons ──────────────────────────────────────────────────────────────
  "p2p-disputes": Gavel,
  "p2p-offers": Repeat,
  "nft-disputes": Gavel,
  "nft-collections": ImageIcon,
  "ecommerce-orders": ShoppingBag,
  "ecommerce-shipping": Truck,
  "gateway-payouts": CreditCard,
  "gateway-refunds": Undo2,
  "gateway-merchants": Store,
  "ico-offerings": Rocket,
  "staking-withdrawals": Package,
  "mlm-referrals": Target,
  "copy-trading-leaders": Users,
  "bot-strategies": Bot,
  "faq-questions": HelpCircle,
  "dex-tokens": Coins,
  "ai-support-gaps": BookOpen,
  "forex-deposits": Globe,
  "forex-withdrawals": Globe,
  "fx-withdrawals": Globe,
};

export function queueIcon(key: string): LucideIcon {
  return QUEUE_ICONS[key] ?? Boxes;
}

/**
 * The queue's glyph as a ready-made element.
 *
 * Callers want `{queueGlyph(q.key, "h-4 w-4")}` rather than
 * `const Icon = queueIcon(q.key)` followed by `<Icon/>`, and the reason is a
 * lint rule rather than taste: `react-hooks/static-components` cannot tell a
 * LOOKUP of an existing component from the CREATION of a new one, so assigning
 * a called result to a capitalised local and rendering it reads to the analyser
 * as defining a component mid-render — which really would remount the subtree
 * on every render, if it were true.
 *
 * `createElement` says the same thing without the dynamic JSX tag, and it keeps
 * the map lookup in one place instead of at every call site.
 */
export function queueGlyph(key: string, className = "h-4 w-4"): ReactElement {
  return createElement(queueIcon(key), { className });
}

/** The one alarm glyph, so both surfaces mark "overdue" identically. */
export const OVERDUE_ICON = AlertTriangle;

/**
 * Where a queue sits against its own SLA.
 *
 * `unknown` is NOT a flavour of "clear". It means the table could not be read,
 * so the count of 0 the server had to send is a placeholder — presenting that
 * as an empty queue is the difference between "nothing to do" and "I cannot
 * tell you", and only one of those is safe to act on.
 */
export type QueueUrgency = "clear" | "fresh" | "due" | "breached" | "unknown";

export interface QueueLike {
  count: number;
  breached: number;
  slaHours: number;
  oldestAt: string | null;
  unavailable?: boolean;
}

export function queueAgeHours(queue: QueueLike, now = Date.now()): number {
  if (!queue.oldestAt) return 0;
  return Math.max(0, (now - new Date(queue.oldestAt).getTime()) / 3_600_000);
}

export function queueUrgency(queue: QueueLike, now = Date.now()): QueueUrgency {
  if (queue.unavailable) return "unknown";
  if (queue.count === 0) return "clear";
  if (queue.breached > 0) return "breached";
  if (!queue.oldestAt || queue.slaHours <= 0) return "fresh";
  /* Half the budget, matching `slaLevel` in `config/sla.ts`: a 24h support
     target and a 7-day KYC target should both mean "getting on" at the same
     FRACTION of the time available, not at the same hour count. */
  return queueAgeHours(queue, now) >= queue.slaHours / 2 ? "due" : "fresh";
}

/** Urgency -> the single tone decision every visual detail derives from. */
export const URGENCY_TONE: Record<QueueUrgency, BadgeTone> = {
  breached: "destructive",
  due: "warning",
  fresh: "primary",
  clear: "neutral",
  unknown: "neutral",
};

/*
 * Literal class strings keyed by tone. NOT built at runtime: Tailwind discovers
 * classes by scanning source text, so `bg-${tone}` emits no CSS and fails
 * silently in the browser.
 */
export const TONE_SOLID: Record<BadgeTone, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  neutral: "bg-border-strong",
};

export const TONE_INK: Record<BadgeTone, string> = {
  primary: "text-primary-ink",
  secondary: "text-secondary-foreground",
  success: "text-success-ink",
  warning: "text-warning-ink",
  destructive: "text-destructive-ink",
  info: "text-info-ink",
  neutral: "text-muted-foreground",
};

/** Icon-tile ground. A 10% tint, so it pairs with the `-ink` tokens above. */
export const TONE_TILE: Record<BadgeTone, string> = {
  primary: "bg-primary/10",
  secondary: "bg-secondary",
  success: "bg-success/10",
  warning: "bg-warning/10",
  destructive: "bg-destructive/10",
  info: "bg-info/10",
  neutral: "bg-surface-3",
};

/**
 * Sort order for a work list: the thing most likely to hurt, first.
 *
 * Overdue outranks everything, then how close to the target, then sheer size,
 * then the label so the order is stable between polls — without that last tie
 * break two queues with equal counts swap places every sixty seconds and the
 * list appears to twitch on its own.
 */
const URGENCY_RANK: Record<QueueUrgency, number> = {
  breached: 0,
  due: 1,
  fresh: 2,
  unknown: 3,
  clear: 4,
};

export function compareQueues<T extends QueueLike & { label: string }>(
  a: T,
  b: T
): number {
  return (
    URGENCY_RANK[queueUrgency(a)] - URGENCY_RANK[queueUrgency(b)] ||
    b.breached - a.breached ||
    b.count - a.count ||
    a.label.localeCompare(b.label)
  );
}
