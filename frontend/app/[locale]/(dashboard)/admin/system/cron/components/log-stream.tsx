"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { ArrowDown, Pause, Play, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CronJob, CronLog } from "@/store/cron";

import { toDate } from "./job-state";

/**
 * The live log, over the WebSocket the backend already relays from the cron
 * process (`handler/ws/relay.ts`).
 *
 * WHAT MAKES IT READABLE, and why each of these is not optional here:
 *
 *  - **Severity is a colour AND a word.** Cron log traffic is overwhelmingly
 *    routine; the two lines an operator needs are a refusal and a failure. Both
 *    arrive as `error` and both must be findable while the stream is moving.
 *  - **Per-job filter.** ~65 jobs share one socket, several ticking every five
 *    seconds, so "show me only this one" is the difference between a log and a
 *    waterfall.
 *  - **Autoscroll that yields.** A stream that snaps back to the bottom while
 *    you are reading is a stream you cannot read. Scrolling up pauses it, and
 *    the button that resumes says how many lines arrived meanwhile — so pausing
 *    never feels like losing them.
 */

type Severity = CronLog["type"];

/**
 * Severity -> ink. Paint only: WHICH severity a message carries is decided by
 * the backend, and the colours are the platform's status tokens.
 */
const SEVERITY_INK: Record<Severity, string> = {
  error: "text-destructive",
  warning: "text-warning",
  success: "text-success",
  info: "text-muted-foreground",
};

const SEVERITY_LABEL_INK: Record<Severity, string> = {
  error: "bg-destructive/15 text-destructive-ink",
  warning: "bg-warning/15 text-warning-ink",
  success: "bg-success/15 text-success-ink",
  info: "bg-surface-3 text-subtle-foreground",
};

/** How close to the bottom still counts as "at the bottom", in px. */
const STICK_THRESHOLD_PX = 32;

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * The stick-to-bottom write has to land in the same frame the new row paints or
 * a fast stream flickers, which is a layout effect — but this is a client
 * component that Next still PRE-RENDERS on the server, where React warns that
 * useLayoutEffect does nothing. The measurement is meaningless without a DOM
 * anyway, so the server gets the harmless one.
 */
const useStickEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

interface LogStreamProps {
  logs: CronLog[];
  jobs: CronJob[];
  /** Pre-select a job — set when the operator opens one from the table. */
  focusedJob: string | null;
  onFocusJob: (name: string | null) => void;
  onClear: () => void;
  connected: boolean;
}

export function LogStream({
  logs,
  jobs,
  focusedJob,
  onFocusJob,
  onClear,
  connected,
}: LogStreamProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  const [errorsOnly, setErrorsOnly] = useState(false);
  const [stuck, setStuck] = useState(true);
  const [missed, setMissed] = useState(0);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  /** Mirrors `stuck` for the effect below without making it a dependency. */
  const stuckRef = useRef(true);

  const titleByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const job of jobs) map.set(job.name, job.title);
    return map;
  }, [jobs]);

  /**
   * Oldest first. The store keeps logs newest-first (it is a capped prepend
   * list), but a stream that grows DOWNWARD is the only one "scroll up to
   * pause" makes sense in.
   */
  const visible = useMemo(() => {
    const filtered = logs.filter((log) => {
      if (focusedJob && log.cronName !== focusedJob) return false;
      if (errorsOnly && log.type !== "error" && log.type !== "warning") {
        return false;
      }
      return true;
    });
    return filtered.slice().reverse();
  }, [logs, focusedJob, errorsOnly]);

  const handleScroll = useCallback(() => {
    const node = viewportRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    const atBottom = distance <= STICK_THRESHOLD_PX;
    stuckRef.current = atBottom;
    setStuck(atBottom);
    if (atBottom) setMissed(0);
  }, []);

  /**
   * Stick to the bottom, or count what was missed.
   *
   * A LAYOUT effect: the scroll has to happen in the same frame the new row is
   * painted, or a fast stream shows a visible one-frame jump on every line.
   */
  useStickEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    if (stuckRef.current) {
      node.scrollTop = node.scrollHeight;
    } else {
      setMissed((count) => count + 1);
    }
    // Length, not the array: a filter change rebuilds the array identity
    // without a new line having arrived, and that must not be counted as one.
  }, [visible.length]);

  // Changing the filter re-anchors: the operator asked for a different view,
  // and dropping them into the middle of it would be arbitrary.
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    stuckRef.current = true;
    setStuck(true);
    setMissed(0);
    node.scrollTop = node.scrollHeight;
  }, [focusedJob, errorsOnly]);

  const jumpToLatest = () => {
    const node = viewportRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
    stuckRef.current = true;
    setStuck(true);
    setMissed(0);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <Select
          value={focusedJob ?? "all"}
          onValueChange={(value) => onFocusJob(value === "all" ? null : value)}
        >
          <SelectTrigger className="h-8 w-full text-xs sm:w-56">
            <SelectValue placeholder={t("all_jobs")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_jobs")}</SelectItem>
            {jobs.map((job) => (
              <SelectItem key={job.name} value={job.name}>
                {job.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="2xs"
          variant={errorsOnly ? "default" : "outline"}
          tone={errorsOnly ? "destructive" : undefined}
          onClick={() => setErrorsOnly((value) => !value)}
        >
          {t("problems_only")}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Badge
            tone={stuck ? "success" : "warning"}
            appearance="soft"
            className="text-[11px]"
          >
            {stuck ? (
              <Play className="mr-1 h-3 w-3" />
            ) : (
              <Pause className="mr-1 h-3 w-3" />
            )}
            {stuck ? tCommon("following") : tCommon("paused")}
          </Badge>
          <Button
            size="2xs"
            variant="ghost"
            iconOnly
            aria-label={tCommon("clear")}
            onClick={onClear}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={viewportRef}
          onScroll={handleScroll}
          /*
            `bg-surface-2`, NOT `bg-overlay`.

            A console panel wants to be dark, and `--overlay` is dark in BOTH
            themes, so it looked like the right token — but it is a SCRIM, and
            its partner ink is `--overlay-foreground` (white in both themes).
            The severity colours are the status tokens, and in the light theme
            those are dark inks built for a light ground: `--success` is 26%
            lightness, `--warning` 34%. On an 8% ground that is under 2:1, so
            the two lines an operator opens this panel to find were the two
            least readable on it. A theme-aware surface keeps every status
            token at the contrast it was measured for.
          */
          className="h-full overflow-y-auto overflow-x-hidden bg-surface-2 p-3 font-mono text-[11px] leading-relaxed"
        >
          {visible.length === 0 ? (
            <p className="p-6 text-center font-sans text-sm text-muted-foreground">
              {connected ? `${t("waiting_for_cron_activity")}…` : t("cron_log_disconnected")}
            </p>
          ) : (
            visible.map((log) => {
              const at = toDate(log.timestamp);
              return (
                <div
                  key={log.id}
                  className={cn(
                    "flex gap-2 rounded-sm px-1 py-0.5",
                    log.type === "error" && "bg-destructive/10",
                    log.type === "warning" && "bg-warning/10"
                  )}
                >
                  <span className="shrink-0 tabular-nums text-subtle-foreground">
                    {at ? format(at, "HH:mm:ss") : "--:--:--"}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-sm px-1 uppercase",
                      SEVERITY_LABEL_INK[log.type] ?? SEVERITY_LABEL_INK.info
                    )}
                  >
                    {log.type}
                  </span>
                  {/* The job, always — one socket carries all 65. */}
                  <button
                    type="button"
                    onClick={() => onFocusJob(log.cronName)}
                    className="max-w-[10rem] shrink-0 truncate text-left text-info hover:underline"
                    title={log.cronName}
                  >
                    {titleByName.get(log.cronName) ?? log.cronName}
                  </button>
                  <span
                    className={cn(
                      "min-w-0 break-words",
                      SEVERITY_INK[log.type] ?? SEVERITY_INK.info
                    )}
                  >
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {!stuck && missed > 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <Button
              size="2xs"
              className="pointer-events-auto shadow-md"
              onClick={jumpToLatest}
            >
              <ArrowDown className="mr-1 h-3 w-3" />
              {t("new_log_lines", { count: missed })}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
