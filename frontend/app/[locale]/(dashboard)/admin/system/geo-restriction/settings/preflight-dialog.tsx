"use client";

import React from "react";
import { AlertTriangle, ArrowRight, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

/**
 * The screen an operator sees before they take their own platform offline.
 *
 * The geographic restriction feature has a failure mode that does not announce
 * itself: the wrong combination of two individually sensible switches refuses
 * every visitor in the world, and the refusal is rendered as a calm compliance
 * notice that is indistinguishable from the feature working correctly. An
 * operator can shut down their exchange, look directly at the evidence, and
 * conclude that nothing is wrong.
 *
 * So the warning has to arrive BEFORE the save, has to say what happens to real
 * people rather than which flag is set, and has to be impossible to click past
 * without reading. Hence a modal listing every consequence with its remedy,
 * rather than a toast after the fact.
 *
 * Two shapes, deliberately different:
 *
 *   FORCEABLE — a judgement call. Real compliance obligations exist, and a tool
 *     that will not let a Super Admin be strict is a tool they route around.
 *     They get the consequences, then a way through.
 *
 *   NOT FORCEABLE — arithmetic, not judgement. The configuration refuses one
 *     hundred percent of requests, so the country rules are never reached and
 *     nothing anyone wanted is achieved. There is no confirm button, because
 *     there is nothing on the other side of it.
 */

export interface PreflightFinding {
  code: string;
  severity: "LOCKOUT" | "WARNING";
  forceable: boolean;
  title: string;
  detail: string;
  remedy: string;
  settingKey?: string;
}

interface PreflightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  findings: PreflightFinding[];
  warnings: PreflightFinding[];
  /** False when no override exists — the dialog becomes a dead end by design. */
  forceable: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function FindingCard({
  finding,
  tone,
}: {
  finding: PreflightFinding;
  tone: "destructive" | "warning";
}) {
  const styles =
    tone === "destructive"
      ? {
          box: "border-destructive/30 bg-destructive/5",
          icon: "text-destructive",
          title: "text-destructive-ink",
        }
      : {
          box: "border-warning/30 bg-warning/5",
          icon: "text-warning",
          title: "text-warning-ink",
        };

  return (
    <div className={`rounded-xl border p-4 ${styles.box}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${styles.icon}`} />
        <div className="min-w-0 space-y-2">
          <p className={`text-sm font-semibold leading-snug ${styles.title}`}>
            {finding.title}
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {finding.detail}
          </p>
          <p className="text-foreground flex items-start gap-2 text-sm leading-relaxed">
            <ArrowRight className="text-muted-foreground mt-1 h-3.5 w-3.5 shrink-0" />
            <span>{finding.remedy}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function PreflightDialog({
  open,
  onOpenChange,
  findings,
  warnings,
  forceable,
  onConfirm,
  onCancel,
}: PreflightDialogProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const blocking = findings.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
        onOpenChange(next);
      }}
    >
      <DialogContent size="2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {blocking ? (
              <ShieldAlert className="text-destructive h-5 w-5" />
            ) : (
              <ShieldCheck className="text-warning h-5 w-5" />
            )}
            {blocking
              ? forceable
                ? t("this_change_will_lock_people_out")
                : t("this_change_cannot_be_saved")
              : t("before_you_save")}
          </DialogTitle>
          <DialogDescription>
            {blocking
              ? forceable
                ? t("checked_against_your_live_platform_and")
                : t("this_configuration_would_refuse_every_request")
              : t("your_change_is_safe_to_save")}
          </DialogDescription>
        </DialogHeader>

        {/* The list can be long on a badly-configured install, and a modal that
            grows past the viewport puts its own buttons off screen — on the one
            dialog whose entire purpose is being read to the end. */}
        <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
          {findings.map((finding) => (
            <FindingCard key={finding.code} finding={finding} tone="destructive" />
          ))}
          {warnings.map((finding) => (
            <FindingCard key={finding.code} finding={finding} tone="warning" />
          ))}
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            {blocking && !forceable ? tCommon("back_to_settings") : tCommon("cancel")}
          </Button>
          {(!blocking || forceable) && (
            <Button
              variant={blocking ? "destructive" : "default"}
              onClick={onConfirm}
            >
              {blocking ? t("i_understand_save_anyway") : tCommon("save")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
