"use client";

/**
 * THE SECOND DOOR TO THE EMERGENCY STOP — NOW AS RIGOROUS AS THE FIRST.
 * ===========================================================================
 *
 * The console (`dashboard-client.tsx`) already fires this endpoint, behind a
 * confirmation that names what it halts, a REQUIRED reason, and a POST of that
 * reason so it lands in every affected market's history. This panel fired the
 * same endpoint with an empty body, so a stop triggered from Settings wrote the
 * handler's fallback string into the audit trail instead of an operator's
 * words — the same defect the console had before its rework, still live in the
 * other door. R6 asks for four parts; this had two.
 *
 * Also collapsed here: `EMERGENCY_ACTIONS` was an array of ONE with branches for
 * `pause_all` and `resume_all` ids that no entry has ever carried, and five
 * strings hardcoded in English inside it while the rest of the panel was
 * translated.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, OctagonAlert } from "lucide-react";

import $fetch from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CustomComponentProps } from "@/components/admin/settings";

export default function EmergencyActionsField({
  formValues,
}: CustomComponentProps) {
  const t = useTranslations("ext_admin");
  const tMm = useTranslations("ext_admin_ai_market-maker");
  const tCommon = useTranslations("common");

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const isGlobalPaused = formValues.aiMarketMakerGlobalPauseEnabled === true;
  const isMaintenanceMode = formValues.aiMarketMakerMaintenanceMode === true;

  const execute = async () => {
    setRunning(true);
    const { data, error } = await $fetch({
      url: "/api/admin/ai/market-maker/emergency/stop",
      method: "POST",
      // The endpoint has always accepted this and nothing was sending it, so
      // every stop from this screen was recorded as the handler's fallback.
      body: { reason: reason.trim() },
      silent: true,
    });
    setRunning(false);

    if (error) {
      toast.error(
        typeof error === "string" ? error : tMm("emergency_stop_failed")
      );
      return;
    }

    setOpen(false);
    setReason("");
    setDone(true);
    toast.success(
      tMm("emergency_stop_executed", {
        markets: (data as any)?.marketsStopped ?? 0,
        bots: (data as any)?.botsStopped ?? 0,
      })
    );
    // The button keeps its acknowledgement briefly; the toast is the record.
    setTimeout(() => setDone(false), 3000);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-destructive/10 text-destructive">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <Label className="text-sm font-medium">
              {t("emergency_controls")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("execute_emergency_controls_for_the_ai_trading_system")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isGlobalPaused ? (
            <Badge tone="warning" appearance="soft">
              {tCommon("paused")}
            </Badge>
          ) : null}
          {isMaintenanceMode ? (
            <Badge tone="warning" appearance="soft">
              {tCommon("maintenance")}
            </Badge>
          ) : null}
        </div>
      </div>

      <Alert tone="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("emergency_controls")}</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>
            {t("these_actions_have_immediate_effect_on")}{" "}
            {t("use_with_caution")}{" "}
            {t("emergency_stop_will_cancel_all_pending")}
          </span>
          {/* Opens a dialog; the dialog does the POST. A `variant="destructive"`
              button whose `onClick` fires the request directly is what R6's lint
              check exists to catch. */}
          <Button
            variant="outline"
            tone="destructive"
            onClick={() => setOpen(true)}
          >
            {done ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <OctagonAlert className="h-4 w-4" />
            )}
            {done ? tCommon("completed") : tCommon("emergency_stop")}
          </Button>
        </AlertDescription>
      </Alert>

      <div className="rounded-md border border-border bg-surface-2 p-4">
        <h5 className="mb-2 text-sm font-medium text-foreground">
          {t("what_happens_during_emergency_stop")}
        </h5>
        <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
          <li>{t("all_active_bots_will_be_immediately_terminated")}</li>
          <li>{t("all_pending_orders_will_be_cancelled")}</li>
          <li>{t("all_markets_will_be_set_to_stopped_status")}</li>
          <li>{t("no_new_trading_activity_will_occur")}</li>
          <li>{t("existing_positions_and_balances_are_preserved")}</li>
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        <strong>{tCommon("note")}: </strong>
        {t("emergency_actions_logged")}{" "}
        {t("emergency_actions_require_confirmation")}{" "}
        {t("routine_maintenance_hint")}
      </p>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!next && !running) setOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon("emergency_stop")}</AlertDialogTitle>
            <AlertDialogDescription>
              {/* The counts variant needs numbers this panel does not fetch, so
                  it uses the wording the console falls back to when its own
                  counts fail to read. */}
              {tMm("emergency_stop_confirm_unknown")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="mm-stop-reason" className="text-sm">
              {tCommon("reason")}
            </Label>
            <Textarea
              id="mm-stop-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={tMm("emergency_stop_reason_placeholder")}
              rows={3}
              disabled={running}
            />
            <p className="text-xs text-muted-foreground">
              {tMm("emergency_stop_reason_is_recorded")}
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            {/* Deliberately NOT `AlertDialogAction`: it closes on click, which
                dismisses the dialog before the request settles. */}
            <Button
              variant="destructive"
              disabled={running || !reason.trim()}
              onClick={execute}
            >
              <OctagonAlert className="h-4 w-4" />
              {tCommon("emergency_stop")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
