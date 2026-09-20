"use client";

/**
 * Ticket status, ticket priority and websocket connection state — one place.
 *
 * The list page and the detail page each carried their own identical
 * `getStatusColor` / `getImportanceColor` maps (26 lines apiece, eight
 * gradients, four `dark:` forks per entry) and then hand-built the badge
 * around them. They are the same state machine, so they are one component.
 *
 * Colour rules (DESIGN-SYSTEM.md):
 *   R2  status is a real state, so it keeps `success` / `warning` /
 *       `destructive` / `info` — but every chip ships its label, so status is
 *       never carried by colour alone.
 *   The colour rides the ICON, not the ink. `--success`, `--warning` and
 *       `--destructive` measure 2.81 / 2.99 / 3.64:1 as small text on their
 *       own tint in light mode, so a tinted chip with matching ink is
 *       unreadable exactly where the state matters. The label stays
 *       `foreground`, which clears 4.5:1 in both themes.
 *
 * WHICH hue a state wears is NOT decided here. These maps used to carry both
 * the glyph and the tone, which made this the 240th independent status decision
 * in the tree, and two of its entries disagreed with `lib/status-tone.ts`:
 *   - `OPEN` was `info`; the canonical table says `success`.
 *   - the unknown-status fallback was `destructive`, i.e. any backend enum
 *     value nobody had styled rendered as a RED error chip. The table's
 *     documented contract is that an unknown status is `neutral`.
 * Only the glyph and the pill's shape are local now; the tone comes from
 * `statusTone()`, so a new status can never arrive pre-coloured red again.
 */

import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle,
  Clock,
  HelpCircle,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { statusTone, statusLabel } from "@/lib/status-tone";
import { LivePill } from "@/components/landing/kit";
import { SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/**
 * Ink for the glyph. It sits on the card surface (the chip is `outline`), not on
 * a tint, so the raw status token is the right one — a glyph is a non-text
 * graphic and clears its 3:1 there in both themes.
 */
const TONE_GLYPH: Record<BadgeTone, string> = {
  primary: "text-primary",
  secondary: "text-secondary-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
  neutral: "text-muted-foreground",
};

/** Glyph only — the hue is `statusTone()`'s job. */
const STATUS_ICON: Record<string, LucideIcon> = {
  PENDING: Clock,
  OPEN: AlertCircle,
  REPLIED: MessageCircle,
  CLOSED: CheckCircle,
};

const PRIORITY_ICON: Record<string, LucideIcon> = {
  LOW: ArrowDown,
  MEDIUM: ArrowRight,
  HIGH: ArrowUp,
};

/**
 * `loading` renders the SAME chip — same `outline` variant, same `gap-1.5
 * text-xs`, same icon box — with the label replaced by a text-measured
 * placeholder.
 *
 * The alternative the detail page reached for was to withhold the chip
 * entirely until the ticket landed, which is worse than it sounds: these chips
 * sit in a `flex shrink-0` column beside the ticket title, so their absence let
 * the title column claim their width and the whole header re-flowed sideways
 * on arrival. A chip is a fixed-shape object; there is no reason for it not to
 * be on screen from the first frame.
 *
 * The glyph falls back to `HelpCircle`/`ArrowRight` — the same fallbacks an
 * unknown enum value gets — and the tone resolves through `statusTone("")`,
 * which the canonical table answers `neutral` for. So a pending chip is the
 * neutral chip, not a guess at which state is coming.
 */
function StateBadge({
  icon: Icon,
  state,
  label,
  className,
  loading = false,
}: {
  icon: LucideIcon;
  /** The raw enum value, resolved to a hue by the canonical table. */
  state: string;
  label: string;
  className?: string;
  loading?: boolean;
}) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 text-xs", className)}>
      {/* The "support" domain is passed for one status: `OPEN`. Platform-wide it
          means a live position or offer and is `success`; on a ticket it means
          "waiting for us to reply", and a green chip would read as resolved.
          See DOMAIN_STATUS_TONE in lib/status-tone.ts. */}
      <Icon
        className={TONE_GLYPH[statusTone(state, "support")]}
        aria-hidden="true"
      />
      {loading ? <SkeletonText placeholder={label} /> : label}
    </Badge>
  );
}

export function TicketStatusBadge({
  status,
  className,
  loading = false,
}: {
  status: string;
  className?: string;
  loading?: boolean;
}) {
  const t = useTranslations("common");
  return (
    <StateBadge
      icon={STATUS_ICON[status] ?? HelpCircle}
      state={status}
      /* The placeholder is a REAL label of representative length rather than a
         run of zeroes, so the chip reserves the width a status actually takes. */
      label={loading ? t("pending") : statusLabel(status)}
      className={className}
      loading={loading}
    />
  );
}

export function TicketPriorityBadge({
  importance,
  className,
  loading = false,
}: {
  importance: string;
  className?: string;
  loading?: boolean;
}) {
  const t = useTranslations("common");
  return (
    <StateBadge
      icon={PRIORITY_ICON[importance] ?? ArrowRight}
      state={importance}
      label={loading ? t("medium") : statusLabel(importance)}
      className={className}
      loading={loading}
    />
  );
}

/**
 * Websocket state. `up` on a healthy live feed is the one non-P&L reading the
 * rules allow, so a connected socket reuses the landing kit's `LivePill`
 * verbatim; degraded states take `warning` and `destructive` on the dot with
 * the label in `foreground`.
 */
export function ConnectionPill({
  status,
  label,
  className,
}: {
  status: "connected" | "connecting" | "disconnected";
  label: string;
  className?: string;
}) {
  if (status === "connected") return <LivePill label={label} />;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface-3 px-2.5 py-1",
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          status === "connecting" ? "animate-pulse bg-warning" : "bg-destructive"
        )}
      />
      <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
        {label}
      </span>
    </span>
  );
}
