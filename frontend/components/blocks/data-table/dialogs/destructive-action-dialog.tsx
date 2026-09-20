"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTableStore } from "../store";
import type { PendingAction } from "../types/table";
import { useTranslations } from "next-intl";

/**
 * The one confirmation in front of every destructive table action.
 *
 * Mounted once by `DataTable`, driven entirely by `pendingAction` in the store,
 * so it covers the row `⋯` menu, the selection bar, all 30 core admin tables and
 * all 181 addon tables without any of them opting in. See the header note in
 * `store/actionsSlice.ts` for what it replaces.
 *
 * THREE THINGS IT DOES THAT A GENERIC `ConfirmDialog` DOES NOT
 * -----------------------------------------------------------
 * 1. It NAMES THE BLAST RADIUS: "Permanently delete 37 withdrawal records", not
 *    "Are you sure?". The count and the item noun both come from the store, so
 *    it cannot drift from what will actually be sent.
 * 2. A PERMANENT delete requires TYPING the word `delete`. Soft delete is
 *    recoverable from the bin and only needs a beat to think; `force: true` is
 *    not recoverable, and a bulk purge sits one keystroke from Cancel in a
 *    dropdown. Making the irreversible case cost more than the reversible one
 *    is the whole point.
 * 3. It captures a REASON. Optional today because no DELETE handler stores one
 *    yet (the audit spine is P3 in plans/ADMIN-SYSTEM.md); it is forwarded as a
 *    query param so it starts being recorded the moment that lands, with no
 *    change here.
 */

const CONFIRM_WORD = "delete";

export function DestructiveActionDialog() {
  const pendingAction = useTableStore((s) => s.pendingAction);
  if (!pendingAction) return null;

  /**
   * The body is a separate component so its `typed` / `reason` state is created
   * fresh on every open and destroyed on close, with no reset effect. That is
   * not just tidiness: a confirmation word left over from a previous dialog
   * would let the NEXT permanent delete through without the operator typing
   * anything.
   */
  return <DestructiveActionBody action={pendingAction} />;
}

function DestructiveActionBody({ action }: { action: PendingAction }) {
  const t = useTranslations("components_blocks");
  const tCommon = useTranslations("common");
  const isActionPending = useTableStore((s) => s.isActionPending);
  const cancelPendingAction = useTableStore((s) => s.cancelPendingAction);
  const confirmPendingAction = useTableStore((s) => s.confirmPendingAction);
  const itemTitle = useTableStore((s) => s.tableConfig?.itemTitle);

  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");

  const { count, permanent } = action;
  const noun = itemTitle || "record";
  const subject = `${count} ${noun}${count === 1 ? "" : "s"}`;
  const confirmed = !permanent || typed.trim().toLowerCase() === CONFIRM_WORD;

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !isActionPending) cancelPendingAction();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-destructive/10 text-destructive">
              {permanent ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </span>
            {permanent ? t("permanently_delete", { subject: String(subject) }) : t("delete", { subject: String(subject) })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {permanent
              ? t("this_cannot_be_undone_the_records")
              : t("the_records_are_moved_to_the")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {permanent && (
            <div className="space-y-1.5">
              <Label htmlFor="dt-confirm-word">
                Type <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to confirm
              </Label>
              <Input
                id="dt-confirm-word"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                placeholder={CONFIRM_WORD}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="dt-reason">
              Reason <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="dt-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("why_is_this_being_removed")}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isActionPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!confirmed || isActionPending}
            onClick={(e) => {
              // AlertDialogAction closes on click by default; the dialog has to
              // stay up while the request is in flight so the operator cannot
              // fire it twice.
              e.preventDefault();
              void confirmPendingAction(reason);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isActionPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tCommon("deleting")}…
              </>
            ) : permanent ? (
              t("permanently_delete_1")
            ) : (
              tCommon("delete")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DestructiveActionDialog;
