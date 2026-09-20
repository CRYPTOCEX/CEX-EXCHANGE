"use client";

/**
 * The bot's own output, streamed from the customer's machine.
 *
 * WHY THIS IS THE MOST VALUABLE PANE ON THE PAGE
 * Everything else here is inferred from orders. This is the bot SPEAKING —
 * the same lines it writes to its own terminal, including the ones that explain
 * why it is not doing anything. Before the agent existed, reading them meant
 * being at that machine.
 *
 * It is a TAIL, not a log service. The server keeps a bounded ring per user and
 * so does the client; nothing is persisted, and reconnecting shows whatever is
 * currently in the buffer rather than replaying history. Saying that plainly in
 * one place is what stops it from quietly becoming storage we did not agree to
 * run — the bot already keeps its own real log on the machine that owns it.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/terminal";
import type { TelemetryEvent } from "./agent-types";
import { useTranslations } from "next-intl";

/** Only levels the bot actually emits; anything else rides the default ink. */
const LEVEL_INK: Record<string, string> = {
  DEBUG: "text-subtle-foreground",
  INFO: "text-muted-foreground",
  WARNING: "text-warning",
  ERROR: "text-destructive",
  CRITICAL: "text-destructive",
};

const KIND_LABEL: Record<TelemetryEvent["kind"], string> = {
  log: "log",
  notify: "note",
  status: "stat",
  event: "evnt",
  agent: "link",
};

export function AgentLog({ events }: { events: TelemetryEvent[] }) {
  const t = useTranslations("components");
  const scroller = useRef<HTMLDivElement | null>(null);
  /**
   * Follow the tail, but stop the moment the operator scrolls up.
   *
   * A log pane that yanks itself to the bottom while someone is reading an error
   * three screens back is worse than one that does not follow at all — and the
   * moment they want to read is precisely the moment new lines are arriving.
   */
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    if (!pinned) return;
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events, pinned]);

  const rows = useMemo(
    () =>
      events.map((e, i) => ({
        ...e,
        // Events carry no id and two lines can share a millisecond, so the index
        // is part of the key. The list is append-only, so this is stable.
        key: `${e.at}-${i}`,
      })),
    [events]
  );

  if (!rows.length) {
    return (
      <EmptyState
        compact
        icon={<ScrollText className="h-5 w-5" />}
        title={t("nothing_from_the_bot_yet")}
        hint={t("with_the_agent_connected_the_bots")}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          // A small slack, because a fractional scrollHeight on a zoomed page
          // would otherwise never satisfy an exact comparison and the pane would
          // silently stop following.
          setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
        }}
        className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-2 py-1 font-mono text-[10px] leading-relaxed"
      >
        {rows.map((r) => (
          <div key={r.key} className="flex gap-2">
            <span className="shrink-0 tabular-nums text-subtle-foreground">
              {new Date(r.at).toLocaleTimeString(undefined, { hour12: false })}
            </span>
            <span
              className={cn(
                "shrink-0 uppercase",
                r.kind === "agent" ? "text-primary" : "text-subtle-foreground"
              )}
            >
              {KIND_LABEL[r.kind]}
            </span>
            <span
              className={cn(
                "min-w-0 whitespace-pre-wrap break-words",
                (r.level && LEVEL_INK[r.level]) || "text-foreground"
              )}
            >
              {r.text}
            </span>
          </div>
        ))}
      </div>
      {!pinned && (
        <button
          type="button"
          onClick={() => {
            setPinned(true);
            const el = scroller.current;
            if (el) el.scrollTop = el.scrollHeight;
          }}
          className="shrink-0 border-t border-border bg-surface-2 py-1 text-[10px] font-medium text-primary-ink transition-colors hover:bg-surface-3"
        >
          {t("jump_to_newest")}
        </button>
      )}
    </div>
  );
}
