"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  RefreshCw,
  Timer,
  XCircle,
} from "lucide-react";
import { m } from "framer-motion";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loadable } from "@/components/ui/skeleton";
import { statusTone } from "@/lib/status-tone";
import { cn } from "@/lib/utils";

import type { HealthData, SchedulerStatus } from "./types";
import { useTranslations } from "next-intl";

/**
 * Is the platform actually working?
 *
 * The score, the ring and the service list come from
 * `/api/admin/system/health/batch`, which probes eleven services for real. The
 * dashboard endpoint used to render a second, competing answer built from
 * `Math.random()` — three gauges labelled CPU, Memory and Disk that were
 * re-rolled on every page load. That is gone; this is the only health surface.
 *
 * THE SCHEDULER IS BROKEN OUT ON ITS OWN, above the service list, because it is
 * the one failure the rest of the page cannot show you. When the dedicated cron
 * process dies, every other probe stays green — the database answers, Redis
 * answers, the API answers — while nothing scheduled runs: no price refresh, no
 * investment settlement, no expiry sweep. It is the highest-consequence,
 * lowest-visibility failure in the product, so it gets a line of its own rather
 * than a row eight deep in a collapsed list.
 */

/** Ink for a tone where the thing being painted is text or a glyph, not a pill. */
const TONE_INK: Record<BadgeTone, string> = {
  primary: "text-primary-ink",
  secondary: "text-secondary-foreground",
  success: "text-success-ink",
  warning: "text-warning-ink",
  destructive: "text-destructive-ink",
  info: "text-info-ink",
  neutral: "text-muted-foreground",
};

/**
 * The score ring takes a colour VALUE, not a class — it is an SVG `stroke`.
 *
 * A token holds a bare HSL triple (`--success: 142 71% 45%`), so it has to be
 * wrapped: `stroke="var(--success)"` is not a valid colour, the declaration is
 * dropped, and the ring silently does not paint.
 */
function scoreStroke(score: number): string {
  if (score >= 80) return "hsl(var(--success))";
  if (score >= 60) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

function scoreInk(score: number): string {
  if (score >= 80) return "text-success-ink";
  if (score >= 60) return "text-warning-ink";
  return "text-destructive-ink";
}

function ServiceIcon({ status }: { status: string }) {
  const cls = cn("h-3 w-3 shrink-0", TONE_INK[statusTone(status)]);
  if (status === "up") return <CheckCircle2 className={cls} />;
  if (status === "down") return <XCircle className={cls} />;
  if (status === "warning") return <AlertTriangle className={cls} />;
  return <Clock className={cls} />;
}

export function PlatformHealth({
  health,
  scheduler,
  loading,
  onRefresh,
}: {
  health: HealthData | null;
  scheduler: SchedulerStatus | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const t = useTranslations("dashboard_admin");
  const [expanded, setExpanded] = useState(false);

  /**
   * THE PENDING CARD WAS A SECOND CARD, AND IT HAD ALREADY DRIFTED.
   * ==========================================================================
   *
   * What was here: `if (loading && !health) return <Card>…</Card>` — a
   * hand-built copy of this component's own card that was missing the refresh
   * button in its header, the scheduler row, the "Show N services" toggle and
   * the whole `space-y-3` rhythm of the real `CardContent`. So the card was
   * about 130px tall while pending and about 210px once the health check
   * returned, on the admin dashboard's first fold, where it sits in a grid
   * beside other cards that were all resized with it.
   *
   * The three `Skeleton className="h-3 w-…"` bars were also a guess about text
   * they did not share an element with: the block they stood in for is a
   * `Badge` plus an `text-xs` service tally, which is not three 12px bars.
   *
   * There is one card below, and `loading` now only decides what goes in the
   * two places that are genuinely unknown — the score and the status word.
   */
  const pending = loading && !health;

  const score = health?.overall?.score ?? 0;
  const status = health?.overall?.status ?? "warning";
  const services = health?.services ?? [];

  const up = services.filter((s) => s.status === "up").length;
  const warning = services.filter((s) => s.status === "warning").length;
  const down = services.filter((s) => s.status === "down").length;

  /* `running` is the only good outcome. `unknown` deliberately does NOT read as
     healthy — it means the heartbeat could not be read, which is exactly when a
     dead scheduler would look fine. */
  const schedulerTone: BadgeTone =
    scheduler?.status === "running"
      ? "success"
      : scheduler?.status === "unknown"
        ? "neutral"
        : scheduler?.status === "duplicate"
          ? "warning"
          : "destructive";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="grid h-7 w-7 place-items-center rounded-sm bg-info/15 text-info">
              <Activity className="h-3.5 w-3.5" />
            </span>
            {t("platform_health")}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRefresh}
            aria-label={t("re_run_health_checks")}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-5">
          <div className="relative h-20 w-20 shrink-0">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 100 100">
              <circle
                className="stroke-surface-3"
                strokeWidth="8"
                fill="none"
                r="42"
                cx="50"
                cy="50"
              />
              <circle
                className="transition-all duration-1000"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
                r="42"
                cx="50"
                cy="50"
                stroke={pending ? "transparent" : scoreStroke(score)}
                strokeDasharray={`${score * 2.64} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* `pending ? "text-muted-foreground"` because `scoreInk(0)`
                  is the DESTRUCTIVE ink: an unfetched platform was about to
                  render a red 0/100 for the length of the health check, which
                  is the most alarming thing this card can say and it would
                  have been saying it about nothing. */}
              <span
                className={cn(
                  "font-mono text-xl font-semibold tabular-nums",
                  pending ? "text-muted-foreground" : scoreInk(score)
                )}
              >
                <Loadable loading={pending} placeholder="00">
                  {score}
                </Loadable>
              </span>
              <span className="text-[10px] text-subtle-foreground">/ 100</span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <Badge
              tone={pending ? "neutral" : statusTone(status)}
              appearance="soft"
              className="capitalize"
            >
              <Loadable loading={pending} placeholder="healthy">
                {status}
              </Loadable>
            </Badge>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {up > 0 && (
                <span className="flex items-center gap-1 text-success-ink">
                  <CheckCircle2 className="h-3 w-3" />
                  {up} up
                </span>
              )}
              {warning > 0 && (
                <span className="flex items-center gap-1 text-warning-ink">
                  <AlertTriangle className="h-3 w-3" />
                  {warning} warning
                </span>
              )}
              {down > 0 && (
                <span className="flex items-center gap-1 text-destructive-ink">
                  <XCircle className="h-3 w-3" />
                  {down} down
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scheduler — see the header note on why this is not just another row.
            `|| pending` so the row exists in both states: it is ~44px of the
            card's height, and gating it on data alone made the card grow by
            that much at the moment the check returned. */}
        {(scheduler || pending) && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg p-2.5",
              !scheduler || scheduler.status === "running"
                ? "bg-surface-2"
                : "bg-warning/10"
            )}
          >
            <Timer
              className={cn(
                "mt-0.5 h-3.5 w-3.5 shrink-0",
                pending ? "text-muted-foreground" : TONE_INK[schedulerTone]
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Scheduler</span>
                <Badge
                  tone={pending ? "neutral" : schedulerTone}
                  appearance="soft"
                  className="capitalize"
                >
                  <Loadable loading={pending} placeholder="running">
                    {scheduler?.status}
                  </Loadable>
                </Badge>
              </div>
              {scheduler && scheduler.status !== "running" && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {scheduler.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Same reasoning as the scheduler row: 28px that used to appear only
            after the fetch. Disabled while pending because there is nothing to
            expand yet. */}
        {(services.length > 0 || pending) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full justify-between px-2 text-xs"
            disabled={pending}
            onClick={() => setExpanded(!expanded)}
          >
            <span>
              {expanded ? (
                t("hide_services")
              ) : (
                <>
                  Show{" "}
                  <Loadable loading={pending} placeholder="0">
                    {services.length}
                  </Loadable>{" "}
                  services
                </>
              )}
            </span>
            <ChevronRight
              className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")}
            />
          </Button>
        )}

        {expanded && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-1.5 border-t border-border pt-2"
          >
            {services.map((service) => (
              <div key={service.name} className="rounded-lg bg-surface-2 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <ServiceIcon status={service.status} />
                    <span className="truncate text-xs font-medium">{service.name}</span>
                    {service.critical && (
                      <Badge tone="neutral" appearance="outline" className="shrink-0">
                        Critical
                      </Badge>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {service.latency !== undefined && (
                      <span className="font-mono text-[10px] tabular-nums text-subtle-foreground">
                        {service.latency}ms
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-[10px] capitalize",
                        TONE_INK[statusTone(service.status)]
                      )}
                    >
                      {service.status}
                    </span>
                  </div>
                </div>
                {(service.status === "warning" || service.status === "down") &&
                  service.message && (
                    <p className="ms-5 mt-1.5 text-[10px] text-muted-foreground">
                      {service.message}
                    </p>
                  )}
              </div>
            ))}
            {health?.timestamp && (
              <p className="pt-1 text-center text-[10px] text-subtle-foreground">
                {t("last_checked")} {health.timestamp}
              </p>
            )}
          </m.div>
        )}
      </CardContent>
    </Card>
  );
}
