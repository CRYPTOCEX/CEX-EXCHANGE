"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTableStore } from "../store";
import type { PendingDecision } from "../types/table";
import { useTranslations } from "next-intl";

/**
 * The confirmation in front of a queue decision — approve, reject, close, assign.
 *
 * Sibling of `DestructiveActionDialog`, mounted once by `DataTable`, driven
 * entirely by `pendingDecision` in the store. Same shape, one hard difference:
 * THE REASON IS REQUIRED AND STARTS EMPTY.
 *
 * That is not fussiness. The reason field on the withdrawal reject dialog used
 * to be pre-filled with the literal string "Please provide a reason for
 * rejection." — so clicking straight through emailed that sentence to the
 * customer as the explanation for losing their money, and wrote it into the
 * audit row as the justification. A default value turns a required field into a
 * decorative one. There is no default here, and Confirm stays disabled until
 * the operator has typed something.
 */

export function DecisionDialog() {
  const pendingDecision = useTableStore((s) => s.pendingDecision);
  if (!pendingDecision) return null;

  // Separate component so `reason` is created fresh per open and destroyed on
  // close — no reset effect, and no chance of the previous decision's reason
  // being submitted with the next one.
  return <DecisionDialogBody decision={pendingDecision} />;
}

function DecisionDialogBody({ decision }: { decision: PendingDecision }) {
  const t = useTranslations("components_blocks");
  const tCommon = useTranslations("common");
  const isActionPending = useTableStore((s) => s.isActionPending);
  const cancelPendingDecision = useTableStore((s) => s.cancelPendingDecision);
  const confirmPendingDecision = useTableStore((s) => s.confirmPendingDecision);
  const itemTitle = useTableStore((s) => s.tableConfig?.itemTitle);

  const [reason, setReason] = useState("");

  const count = decision.ids.length;
  const noun = itemTitle || "record";
  const subject = `${count} ${noun}${count === 1 ? "" : "s"}`;
  const required = decision.reasonRequired !== false;
  const minLength = decision.minReasonLength ?? 3;
  const ready = !required || reason.trim().length >= minLength;
  const destructive = decision.tone === "destructive";

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !isActionPending) cancelPendingDecision();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {decision.label} — {subject}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {decision.description ||
              t("this_decision_is_recorded_against_your")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="dt-decision-reason">
            Reason{" "}
            <span className="text-muted-foreground">
              {required ? "(" + tCommon("required") + ")" : "(" + tCommon("optional") + ")"}
            </span>
          </Label>
          <Textarea
            id="dt-decision-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("what_did_you_check_and_what_did_you_conclude")}
            autoFocus
          />
          {required && reason.trim().length > 0 && !ready && (
            <p className="text-xs text-muted-foreground">
              At least {minLength} characters.
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isActionPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!ready || isActionPending}
            onClick={(e) => {
              // Keep the dialog up while the request is in flight so the
              // operator cannot fire the same decision twice.
              e.preventDefault();
              void confirmPendingDecision(reason);
            }}
            className={cn(
              destructive &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
          >
            {isActionPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tCommon("working")}…
              </>
            ) : (
              decision.label
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DecisionDialog;
