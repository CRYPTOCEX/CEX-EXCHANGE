"use client";

import { useState } from "react";
import { AlertTriangle, Download, Loader2, ShieldCheck } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

/**
 * The confirm step in front of an exchange import.
 *
 * Both import buttons in the admin were single unconfirmed GETs that deleted
 * rows: the currency import removed every currency the exchange had stopped
 * listing AND switched `status:false` on all the rest, the market import
 * removed delisted markets along with their watchlist entries and their
 * `exchangeOrder` rows — users' trading history.
 *
 * The endpoints are now preview-first. Called without `confirm=true` they read
 * the exchange, compute the plan and write nothing. This component shows that
 * plan, and only a second, explicit press applies it. Nothing here decides what
 * is safe: every number and every caveat below is the server's own plan object,
 * so the dialog cannot promise something different from what runs.
 */

export interface ImportPlan {
  provider?: string;
  toCreate?: number;
  toUpdate?: number;
  toDelete?: number;
  deleteSample?: string[];
  /** Markets kept because they still carry OPEN orders (markets import only). */
  keptForOpenOrders?: number;
  keptSample?: string[];
  /** Order rows that will be PRESERVED, not deleted (markets import only). */
  retainedOrderCount?: number;
  /** Currencies currently enabled, which the import no longer switches off. */
  enabledCount?: number;
}

interface ImportPreviewDialogProps {
  /** Import endpoint, without a query string. */
  endpoint: string;
  /** Button label, e.g. "Import Markets". */
  label: string;
  /** Noun for the summary line, e.g. "market" / "currency". */
  noun: string;
  /** Called after a confirmed import succeeds. */
  onImported?: () => void;
  className?: string;
}

function Figure({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "neutral" | "positive" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums",
          tone === "positive" && "text-success-ink",
          tone === "warning" && "text-destructive-ink",
          tone === "neutral" && "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export function ImportPreviewDialog({
  endpoint,
  label,
  noun,
  onImported,
  className,
}: ImportPreviewDialogProps) {
  const t = useTranslations("components_blocks");
  const tCommon = useTranslations("common");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const loadPreview = async () => {
    setIsPreviewing(true);
    const { data, error } = await $fetch({ url: endpoint, silentSuccess: true });
    setIsPreviewing(false);

    if (error) {
      toast.error(error);
      return;
    }
    // A server that ignored `confirm` and wrote anyway would answer
    // `dryRun: false`. Say so rather than showing a preview of work already done.
    if (data?.dryRun === false) {
      toast.success(data?.message || t("import_completed"));
      onImported?.();
      return;
    }
    setPlan(data?.plan ?? {});
  };

  const runImport = async () => {
    setIsImporting(true);
    const separator = endpoint.includes("?") ? "&" : "?";
    const { data, error } = await $fetch({
      url: `${endpoint}${separator}confirm=true`,
      silentSuccess: true,
    });
    setIsImporting(false);

    if (error) {
      toast.error(error);
      return;
    }
    toast.success(data?.message || t("import_completed"));
    setPlan(null);
    onImported?.();
  };

  const toDelete = plan?.toDelete ?? 0;
  const kept = plan?.keptForOpenOrders ?? 0;

  return (
    <>
      <Button
        onClick={loadPreview}
        disabled={isPreviewing}
        className={cn("flex items-center gap-2", className)}
      >
        {isPreviewing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {label}
      </Button>

      <AlertDialog
        open={plan !== null}
        onOpenChange={(open) => {
          if (!open && !isImporting) setPlan(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-md",
                  toDelete > 0
                    ? "bg-destructive/10 text-destructive-ink"
                    : "bg-primary/10 text-primary-ink"
                )}
              >
                {toDelete > 0 ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </span>
              {label}
              {plan?.provider ? ` — ${plan.provider}` : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete > 0
                ? `This removes ${toDelete} ${noun}${toDelete === 1 ? "" : "s"} the exchange no longer lists. Review the plan before applying it.`
                : t("nothing_will_be_removed_review_the")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Figure value={plan?.toCreate ?? 0} label="added" tone="positive" />
              <Figure
                value={plan?.toUpdate ?? 0}
                label="refreshed"
                tone="neutral"
              />
              <Figure
                value={toDelete}
                label="removed"
                tone={toDelete > 0 ? "warning" : "neutral"}
              />
            </div>

            {toDelete > 0 && plan?.deleteSample?.length ? (
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  {t("to_be_removed")}
                </p>
                <p className="text-sm font-mono break-words">
                  {plan.deleteSample.join(", ")}
                  {toDelete > plan.deleteSample.length
                    ? ` +${toDelete - plan.deleteSample.length} more`
                    : ""}
                </p>
              </div>
            ) : null}

            {/* The two guarantees the server makes, stated where the decision is
                being taken rather than buried in a changelog. */}
            {typeof plan?.retainedOrderCount === "number" && (
              <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/10 p-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-success-ink mt-0.5" />
                <p className="text-sm text-foreground">
                  {plan.retainedOrderCount} order record
                  {plan.retainedOrderCount === 1 ? "" : "s"} on those markets{" "}
                  <strong>{t("will_be_kept")}</strong>. Trading history is never deleted
                  by an import.
                </p>
              </div>
            )}

            {kept > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning-ink mt-0.5" />
                <p className="text-sm text-foreground">
                  {kept} delisted market{kept === 1 ? "" : "s"} will be{" "}
                  <strong>kept</strong> because {kept === 1 ? "it" : "they"} still
                  carry open orders holding user funds
                  {plan?.keptSample?.length ? (
                    <>
                      : <span className="font-mono">{plan.keptSample.join(", ")}</span>
                    </>
                  ) : null}
                  . Cancel those orders and re-import to remove them.
                </p>
              </div>
            )}

            {typeof plan?.enabledCount === "number" && (
              <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/10 p-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-success-ink mt-0.5" />
                <p className="text-sm text-foreground">
                  Your {plan.enabledCount} enabled {noun}
                  {plan.enabledCount === 1 ? "" : "s"}{" "}
                  <strong>{t("stay_enabled")}</strong>. The import refreshes precision,
                  fees and names only.
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isImporting}
              onClick={(e) => {
                // Keep the dialog up while the request is in flight so the
                // import cannot be fired twice.
                e.preventDefault();
                void runImport();
              }}
              className={cn(
                toDelete > 0 &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tCommon("importing")}…
                </>
              ) : (
                label
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ImportPreviewDialog;
