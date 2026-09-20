"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Download,
  Loader2,
  MinusCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBulkUpdateStore, type BulkUpdateItem } from "@/store/bulk-update";
import { useTranslations } from "next-intl";

/**
 * The progress surface for a bulk add-on update.
 *
 * The run itself lives in `store/bulk-update.ts` and NOT in this component,
 * which is what lets the operator close this dialog — or leave the page — with
 * a thirty-download run still going. Closing it is "run in background", not
 * "cancel"; cancelling is a separate, explicit button, and it can only take
 * effect between steps because the step in flight is a server-side download and
 * extraction with no safe abort point.
 */

const STATE_LABEL: Record<BulkUpdateItem["state"], string> = {
  queued: "Queued",
  checking: "Checking",
  updating: "Installing",
  done: "Updated",
  failed: "Failed",
  stopped: "Stopped",
  skipped: "Skipped",
};

function StateIcon({ state }: { state: BulkUpdateItem["state"] }) {
  switch (state) {
    case "checking":
      return <RefreshCw className="h-4 w-4 animate-spin text-primary" />;
    case "updating":
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "stopped":
    case "skipped":
      return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Download className="h-4 w-4 text-muted-foreground" />;
  }
}

function ItemRow({ item }: { item: BulkUpdateItem }) {
  const t = useTranslations("dashboard_admin");
  const isBusy = item.state === "checking" || item.state === "updating";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5",
        isBusy && "border-primary/40",
        item.state === "failed" && "border-destructive/40"
      )}
    >
      <span className="mt-0.5 shrink-0">
        <StateIcon state={item.state} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{item.title}</span>
          <Badge variant="outline" className="shrink-0 text-xs capitalize">
            {item.category}
          </Badge>
        </div>

        {/* One line that always answers "where is this product now". */}
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">v{item.startVersion}</span>
          <ArrowRight className="h-3 w-3" />
          <span
            className={cn(
              "font-mono tabular-nums",
              item.currentVersion !== item.startVersion && "text-success"
            )}
          >
            v{item.currentVersion}
          </span>
          {item.latestVersion && item.currentVersion !== item.latestVersion && (
            <span className="font-mono tabular-nums opacity-70">
              {t("latest_v")}{item.latestVersion})
            </span>
          )}
        </div>

        {item.state === "updating" && item.installingVersion && (
          <p className="mt-1 text-xs text-primary">
            {t("downloading_and_extracting_v")}{item.installingVersion}…
          </p>
        )}

        {item.error && (
          <p className="mt-1 text-xs text-destructive">{item.error}</p>
        )}

        {item.state === "stopped" && item.applied.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Stopped part-way — {item.applied.length} update
            {item.applied.length === 1 ? "" : "s"} applied. Run again to finish.
          </p>
        )}
      </div>

      <span className="shrink-0 text-xs text-muted-foreground">
        {/* A product can settle as `done` having applied nothing — it was
            queued off a stale badge and the licence server said it is current.
            Calling that "Updated" would be a lie in the only column an operator
            scans. */}
        {item.state === "done" && item.applied.length === 0
          ? t("already_current")
          : STATE_LABEL[item.state]}
      </span>
    </div>
  );
}

export function UpdateAllDialog() {
  const t = useTranslations("dashboard_admin");
  const { phase, items, error, stopRequested, isOpen, setOpen, requestStop } =
    useBulkUpdateStore();

  const summary = useMemo(() => {
    const settled = items.filter((item) =>
      ["done", "failed", "stopped", "skipped"].includes(item.state)
    );
    return {
      total: items.length,
      settled: settled.length,
      updated: items.filter((item) => item.applied.length > 0).length,
      failed: items.filter((item) => item.state === "failed").length,
      unattempted: items.filter(
        (item) => item.state === "stopped" || item.state === "skipped"
      ).length,
      versionsApplied: items.reduce((sum, item) => sum + item.applied.length, 0),
      percent: items.length
        ? Math.round((settled.length / items.length) * 100)
        : 0,
    };
  }, [items]);

  const isRunning = phase === "scanning" || phase === "running";

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent
        size="2xl"
        /* Closing is "keep going in the background", so the X stays. What is
           NOT allowed is dismissing by accident: a stray Escape or a click on
           the backdrop in the middle of a thirty-download run reads as a
           cancel, and the operator would have no way to tell which it was. */
        onEscapeKeyDown={(event) => {
          if (isRunning) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (isRunning) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("update_all_add_ons")}</DialogTitle>
          <DialogDescription>
            {t("every_licensed_add_on_is_taken")}
          </DialogDescription>
        </DialogHeader>

        {phase === "scanning" && (
          <div className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            {t("asking_the_licence_server_which_add_ons_are_behind")}…
          </div>
        )}

        {phase === "error" && (
          <Alert tone="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {phase === "finished" && items.length === 0 && (
          <Alert tone="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              {t("every_licensed_add_on_is_already")}
            </AlertDescription>
          </Alert>
        )}

        {items.length > 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {summary.settled} of {summary.total} add-on
                  {summary.total === 1 ? "" : "s"}
                  {summary.versionsApplied > 0 &&
                    ` · ${summary.versionsApplied} version${
                      summary.versionsApplied === 1 ? "" : "s"
                    } applied`}
                </span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {summary.percent}%
                </span>
              </div>
              <Progress value={summary.percent} className="h-2" />
            </div>

            <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
              {items.map((item) => (
                <ItemRow key={item.productId} item={item} />
              ))}
            </div>
          </div>
        )}

        {phase === "finished" && items.length > 0 && (
          <Alert
            tone={
              summary.failed > 0 || summary.unattempted > 0
                ? "warning"
                : "success"
            }
          >
            {summary.failed > 0 || summary.unattempted > 0 ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <AlertDescription>
              {summary.updated > 0
                ? `${summary.updated} add-on${summary.updated === 1 ? "" : "s"} brought up to date (${summary.versionsApplied} release${summary.versionsApplied === 1 ? "" : "s"} applied).`
                : t("no_releases_were_applied_every_add")}
              {summary.failed > 0 &&
                t("failed_the_reason_is_on_the_row_above", { failed: String(summary.failed) })}
              {summary.unattempted > 0 &&
                t("not_attempted_because_the_run_was_stopped", { unattempted: String(summary.unattempted) })}
              {(summary.failed > 0 || summary.unattempted > 0) &&
                t("running_it_again_picks_up_where")}
              {summary.versionsApplied > 0 &&
                t("restart_the_backend_so_the_new")}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          {isRunning ? (
            <>
              <Button
                variant="outline"
                onClick={requestStop}
                disabled={stopRequested}
              >
                {stopRequested ? `${t("stopping")}…` : t("stop_after_this_step")}
              </Button>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                {t("run_in_background")}
              </Button>
            </>
          ) : (
            <Button onClick={() => setOpen(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
