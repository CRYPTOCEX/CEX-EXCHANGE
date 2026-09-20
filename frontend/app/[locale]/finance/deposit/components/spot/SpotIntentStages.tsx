"use client";

/**
 * WHERE THE DEPOSIT IS, IN THE CUSTOMER'S WORDS.
 *
 * Before intents the spot screen had exactly one thing to say between "here is
 * the address" and "credited": a spinner and "please wait". Under ecosystem
 * custody there are now four real steps between those two — the transfer
 * arrives at the customer's own address, the platform moves it, it lands on the
 * exchange, the exchange confirms it — and every one of them is minutes long.
 * A spinner for that whole span is what makes a customer refresh, resend, or
 * open a ticket.
 *
 * The tracker draws the mode's OWN path (`stagesForMode`), so a hash-claim
 * deposit is not shown two steps it will never walk. The three unhappy stages —
 * review, failed, expired — are not points on the line; they replace it with a
 * banner that says what happened and where the money is, because that is the
 * only question being asked at that moment.
 */

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  Clock,
  Hourglass,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  FINISHED_STAGES,
  stagesForMode,
  type SpotDepositMode,
  type SpotIntentStage,
} from "./intent-utils";

const STAGE_ICONS: Record<SpotIntentStage, LucideIcon> = {
  waiting: Hourglass,
  received: CheckCircle2,
  moving: ArrowRightLeft,
  on_exchange: Building2,
  credited: CheckCircle2,
  review: ShieldAlert,
  failed: XCircle,
  expired: Clock,
};

export function SpotIntentStages({
  mode,
  stage,
  message,
}: {
  mode: SpotDepositMode;
  stage: SpotIntentStage;
  message?: string | null;
}) {
  const t = useTranslations("common");

  const label = (value: SpotIntentStage): string => {
    // A literal key per branch, never a key built from `value`: the i18n
    // scanner (tools/check-i18n-keys.mjs) can only prove a key exists when it
    // is a literal, and a key it cannot resolve is a key nothing guards.
    switch (value) {
      case "waiting":
        return t("spot_deposit_stage_waiting");
      case "received":
        return t("spot_deposit_stage_received");
      case "moving":
        return t("spot_deposit_stage_moving");
      case "on_exchange":
        return t("spot_deposit_stage_on_exchange");
      case "credited":
        return t("spot_deposit_stage_credited");
      case "review":
        return t("spot_deposit_stage_review");
      case "failed":
        return t("spot_deposit_stage_failed");
      case "expired":
      default:
        return t("spot_deposit_stage_expired");
    }
  };

  if (stage === "review" || stage === "failed" || stage === "expired") {
    const tone =
      stage === "review"
        ? { border: "border-warning/30", bg: "bg-warning/5", text: "text-warning" }
        : { border: "border-destructive/30", bg: "bg-destructive/5", text: "text-destructive" };
    const Icon = stage === "review" ? ShieldAlert : stage === "failed" ? XCircle : Clock;
    const hint =
      stage === "review"
        ? t("spot_deposit_review_hint")
        : stage === "failed"
          ? t("spot_deposit_failed_hint")
          : t("spot_deposit_expired_hint");

    return (
      <div className={`rounded-2xl border ${tone.border} ${tone.bg} p-4`}>
        <div className="flex items-start gap-3">
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.text}`} />
          <div className="space-y-1">
            <div className={`text-sm font-semibold ${tone.text}`}>{label(stage)}</div>
            <p className="text-xs text-muted-foreground">{message || hint}</p>
          </div>
        </div>
      </div>
    );
  }

  const path = stagesForMode(mode);
  const currentIndex = Math.max(0, path.indexOf(stage));
  const finished = FINISHED_STAGES.includes(stage);

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
          {t("spot_deposit_progress")}
        </div>
        {message && <div className="text-xs text-muted-foreground">{message}</div>}
      </div>

      <ol className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {path.map((value, index) => {
          const done = index < currentIndex || (finished && index <= currentIndex);
          const active = index === currentIndex && !finished;
          const Icon = STAGE_ICONS[value];
          return (
            <li key={value} className="flex flex-1 items-center gap-3 sm:flex-col sm:items-start">
              <div className="flex w-full items-center gap-2">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
                    done
                      ? "border-success/40 bg-success text-success-foreground"
                      : active
                        ? "border-primary/40 bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {active ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                {index < path.length - 1 && (
                  <div
                    className={`hidden h-px flex-1 sm:block ${done ? "bg-success/50" : "bg-border"}`}
                  />
                )}
              </div>
              <div
                className={`text-xs font-semibold ${
                  done || active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label(value)}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * The "held for review" banner the VERIFICATION socket raises (frame
 * `{ status: 202, message, review }`) while the customer is on the monitoring
 * screen after pasting a hash. It is a different surface from the tracker
 * above: there is no intent path to draw there, only a spinner to stop.
 */
export function SpotDepositReviewNotice({
  message,
  reason,
}: {
  message?: string | null;
  reason?: string | null;
}) {
  const t = useTranslations("common");
  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="space-y-1">
          <div className="text-sm font-semibold text-warning">{t("spot_deposit_under_review")}</div>
          <p className="text-xs text-muted-foreground">
            {message || t("spot_deposit_review_hint")}
          </p>
          {reason && (
            <p className="font-mono text-[11px] text-subtle-foreground">{reason}</p>
          )}
        </div>
      </div>
    </div>
  );
}
