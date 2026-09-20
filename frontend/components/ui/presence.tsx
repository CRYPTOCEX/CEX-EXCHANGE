"use client";

/**
 * IS THIS PERSON THERE RIGHT NOW.
 *
 * WHY IT IS ONE COMPONENT FOR THE WHOLE APP
 * -----------------------------------------
 * Three surfaces drew a presence dot before this file existed and no two of
 * them agreed:
 *
 *   - `p2p/components/kit/trust.tsx` drew a green dot ONLY when the trader was
 *     online, and nothing at all otherwise. Absent and idle looked identical,
 *     which is the one distinction a P2P board needs — an offer from somebody
 *     last seen in March is not an offer.
 *   - `user/profile/.../premium-sidebar.tsx` drew a green dot with no source at
 *     all. It happens to be TRUE — that dot is the signed-in reader's own, and
 *     somebody looking at their sidebar is by definition online — but it is a
 *     fourth shape and a fourth green, arrived at independently.
 *   - The blog drew nothing, on any surface.
 *
 * A dot is a claim about a person, and three components making that claim from
 * three different rules is how one of them ends up lying. This is the only
 * place the thresholds live and the only place the colours are chosen.
 *
 * THE THREE STATES, AND WHY THERE IS A FOURTH THAT DRAWS NOTHING
 * -------------------------------------------------------------
 *   green  ONLINE   seen within `PRESENCE_ONLINE_SECONDS`. They are here.
 *   grey   AWAY     seen since, but not now. A normal account between sessions.
 *   red    STALE    not seen for `PRESENCE_STALE_DAYS` or more. On a market
 *                   whose payment windows are counted in minutes, this is the
 *                   fact that decides whether an offer is worth taking.
 *   none   UNKNOWN  no timestamp at all. NOT drawn as grey: grey asserts "seen
 *                   recently, just not now", and we would be asserting it about
 *                   somebody we have never had a reading for. An honest gap
 *                   beats a plausible wrong colour.
 *
 * `PRESENCE_STALE_DAYS` is 3 and the brief said "3-5 days or more", so this is
 * the cautious end of that range: the cost of flagging a trader who was away
 * for a long weekend is that somebody picks a different counterparty; the cost
 * of the other error is a trade opened against a person who will not answer
 * before the payment window expires.
 *
 * THE TIMESTAMP IS OPTIONAL, THE STATE IS NOT.
 * P2P surfaces already publish `lastSeenAt` and get the precise label out of it
 * ("Active 20 min ago"). The blog deliberately publishes only the BUCKET — see
 * `backend/src/utils/presence.ts` — so this takes either, and a caller holding
 * only a bucket gets the coarse wording rather than an invented minute.
 */

import { cn } from "@/lib/utils";

export type PresenceState = "online" | "away" | "stale";

/** Seen within this many seconds and they are treated as here. */
export const PRESENCE_ONLINE_SECONDS = 300;

/** Not seen for this many days and the dot turns red. */
export const PRESENCE_STALE_DAYS = 3;

const STALE_SECONDS = PRESENCE_STALE_DAYS * 24 * 60 * 60;

/**
 * The bucket for a timestamp, or `null` when there is nothing to judge.
 *
 * A FUTURE timestamp is `null`, not `online`. Clock skew between a server and a
 * browser is normal and small; a reading minutes ahead of now is a broken
 * source, and "online" is exactly the answer a broken source should not be able
 * to produce.
 */
export function presenceStateFrom(
  lastSeenAt: string | Date | null | undefined
): PresenceState | null {
  if (!lastSeenAt) return null;
  const ms = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const seconds = (Date.now() - ms) / 1000;
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  if (seconds <= PRESENCE_ONLINE_SECONDS) return "online";
  if (seconds >= STALE_SECONDS) return "stale";
  return "away";
}

/** Plain-language age. Deliberately coarse — this is a reading, not a clock. */
function ageLabel(seconds: number): string {
  if (seconds < 90) return `${Math.max(1, Math.round(seconds))} sec`;
  const minutes = seconds / 60;
  if (minutes < 90) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 36) return `${Math.round(hours)} hr`;
  return `${Math.round(hours / 24)} days`;
}

/** The wording for a caller that has only a bucket. */
export function presenceLabelForState(state: PresenceState | null): string {
  if (state === "online") return "Online now";
  if (state === "away") return "Recently active";
  if (state === "stale") return `Not seen in over ${PRESENCE_STALE_DAYS} days`;
  return "Last seen unknown";
}

/**
 * State and wording together, from a timestamp.
 *
 * `online` is returned alongside the state because several P2P surfaces branch
 * on it directly — a badge tone, a sort key — and re-deriving
 * `state === "online"` at each of them is how the two drift.
 */
export function presenceInfo(lastSeenAt: string | Date | null | undefined): {
  state: PresenceState | null;
  label: string;
  online: boolean;
} {
  const state = presenceStateFrom(lastSeenAt);
  if (!state) return { state: null, label: presenceLabelForState(null), online: false };
  if (state === "online") return { state, label: "Online now", online: true };

  const seconds = (Date.now() - new Date(lastSeenAt as any).getTime()) / 1000;
  return { state, label: `Active ${ageLabel(seconds)} ago`, online: false };
}

/**
 * The bucket off a payload whose TYPE predates it.
 *
 * The blog's user shapes come from `userAttributes`, generated from the DB
 * columns — and `presence` is not a column, it is what `redactPublicNames`
 * puts on the way out in place of one. Rather than teach the generator about a
 * field the database does not have, or scatter `as any` across four files,
 * every blog call site reads it through here.
 *
 * It VALIDATES rather than casts. The value crosses the network, and an old
 * cached payload or a proxy that mangles JSON should produce no dot, not a
 * className built from an arbitrary string.
 */
export function presenceOf(user: unknown): PresenceState | null {
  const value = (user as any)?.presence;
  return value === "online" || value === "away" || value === "stale" ? value : null;
}

const DOT_SIZE = {
  xs: "size-2",
  sm: "size-2.5",
  md: "size-3",
  lg: "size-3.5",
} as const;

/**
 * `--color-*` tokens, not raw colours: presence IS a status, which is the one
 * thing the platform's status hues are reserved for. Grey is
 * `subtle-foreground` rather than a border token — it has to read as a dot on
 * top of an avatar, not as an edge of one.
 */
const DOT_TONE: Record<PresenceState, string> = {
  online: "bg-success",
  away: "bg-subtle-foreground",
  stale: "bg-destructive",
};

/**
 * The dot itself. Positioned by the CALLER, because the thing it hangs off is
 * a different size and shape on every surface.
 *
 * `ringClassName` exists because the ring is what separates the dot from the
 * avatar beneath it, so it has to match the surface the avatar sits ON — a
 * card on the board, the page ground on a profile masthead. Defaulting it to
 * `ring-card` gets the common case right and makes the exceptions say so.
 *
 * The accessible name is the LABEL, in a visually hidden span. A `title` alone
 * is a tooltip most assistive tech will not announce and no touch device will
 * ever show, and this dot means nothing to somebody who cannot see it.
 */
export function PresenceDot({
  state,
  label,
  size = "sm",
  className,
  ringClassName = "ring-card",
}: {
  state: PresenceState | null | undefined;
  /** Overrides the default wording — pass the precise one when you have it. */
  label?: string;
  size?: keyof typeof DOT_SIZE;
  className?: string;
  ringClassName?: string;
}) {
  if (!state) return null;
  const text = label || presenceLabelForState(state);
  return (
    <span
      className={cn(
        "rounded-full ring-2",
        DOT_SIZE[size],
        DOT_TONE[state],
        ringClassName,
        className
      )}
      title={text}
    >
      <span className="sr-only">{text}</span>
    </span>
  );
}

/**
 * The dot in its usual place: the bottom-trailing corner of a round avatar.
 *
 * `-end-0.5`, not `-right-0.5`. The corner it belongs in is the trailing one,
 * and in an RTL locale the whole avatar row mirrors — a `right` offset parks
 * the dot over the neighbouring text instead of over the avatar's own edge.
 */
export function AvatarPresenceDot(props: Parameters<typeof PresenceDot>[0]) {
  return (
    <PresenceDot
      {...props}
      className={cn("absolute -bottom-0.5 -end-0.5", props.className)}
    />
  );
}
