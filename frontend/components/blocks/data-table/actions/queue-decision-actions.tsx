"use client";

import React from "react";
import { Check, X } from "lucide-react";

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTableStore } from "../store";
import type { BulkAction, PendingDecision } from "../types/table";

/**
 * Approve / Reject, on the row, without leaving the list.
 *
 * Queue contract point 3. Deciding used to mean: open the row's detail page,
 * find the decision control, act, navigate back, lose your place in the list,
 * repeat. For a queue of forty pending payouts that is forty round trips.
 *
 * Nothing here calls an API. Both buttons raise a `pendingDecision`, which
 * `DecisionDialog` confirms and the store sends — so the row action, the bulk
 * action and any future surface all go through one code path that cannot forget
 * to ask for a reason.
 */

export interface QueueDecisionConfig {
  /** Where the decision is sent. Defaults to the table's own endpoint. */
  endpoint?: string;
  method?: "PUT" | "POST" | "PATCH";
  /** Status written on approve, e.g. "COMPLETED". */
  approveStatus: string;
  /** Status written on reject, e.g. "REJECTED". */
  rejectStatus: string;
  approveLabel?: string;
  rejectLabel?: string;
  /**
   * Rows this decision can still be applied to. A row already settled gets no
   * buttons — offering Approve on a COMPLETED withdrawal is an invitation to
   * pay twice.
   */
  actionableStatuses?: string[];
  statusKey?: string;
  /** Approving rarely needs a justification; rejecting always does. */
  approveReasonRequired?: boolean;
}

function decisionFor(
  config: QueueDecisionConfig,
  verb: "approve" | "reject",
  ids: string[]
): PendingDecision {
  const approving = verb === "approve";
  return {
    verb,
    label: approving
      ? config.approveLabel ?? "Approve"
      : config.rejectLabel ?? "Reject",
    ids,
    endpoint: config.endpoint,
    method: config.method ?? "PUT",
    body: { status: approving ? config.approveStatus : config.rejectStatus },
    // A rejection is the one the customer is told about and the one that gets
    // disputed, so its reason is mandatory. An approval's is optional by
    // default because the outcome speaks for itself.
    reasonRequired: approving ? config.approveReasonRequired ?? false : true,
    tone: approving ? "default" : "destructive",
    description: approving
      ? "The customer is notified and this is recorded against your account."
      : "The customer is notified with this reason, and it is recorded against your account.",
  };
}

export function QueueDecisionActions({
  row,
  config,
}: {
  row: any;
  config: QueueDecisionConfig;
}) {
  const requestDecision = useTableStore((s) => s.requestDecision);
  const hasEditPermission = useTableStore((s) => s.hasEditPermission);

  const statusKey = config.statusKey ?? "status";
  const actionable = (config.actionableStatuses ?? ["PENDING"]).map((s) =>
    s.toUpperCase()
  );
  const status = String(row?.[statusKey] ?? "").toUpperCase();

  // A settled row gets no decision entries: offering Approve on a COMPLETED
  // withdrawal is an invitation to pay twice.
  if (!hasEditPermission || !actionable.includes(status)) return null;

  const approveLabel = config.approveLabel ?? "Approve";
  const rejectLabel = config.rejectLabel ?? "Reject";

  // Rendered as DROPDOWN ITEMS, not as inline buttons. `extraRowActions` is
  // consumed inside the row's `⋯` DropdownMenuContent
  // (`content/rows/actions/index.tsx`), so icon-only buttons would land as two
  // unlabelled glyphs in a 224px menu whose every other entry is an
  // icon-plus-label row. These match their Edit/Delete siblings exactly.
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        aria-label={approveLabel}
        className={cn("cursor-pointer text-success-ink focus:text-success-ink")}
        onClick={(e) => {
          // The row itself opens the record on click; a decision must not also
          // trigger that.
          e.preventDefault();
          e.stopPropagation();
          requestDecision(decisionFor(config, "approve", [row.id]));
        }}
      >
        <Check className="mr-2 h-4 w-4" />
        {approveLabel}
      </DropdownMenuItem>
      <DropdownMenuItem
        aria-label={rejectLabel}
        className={cn(
          "cursor-pointer text-destructive focus:text-destructive"
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          requestDecision(decisionFor(config, "reject", [row.id]));
        }}
      >
        <X className="mr-2 h-4 w-4" />
        {rejectLabel}
      </DropdownMenuItem>
    </>
  );
}

/**
 * The same two decisions as bulk actions, sharing one reason across the
 * selection — queue contract point 4.
 *
 * Pass the result straight to `DataTable.bulkActions`. Note that supplying any
 * bulk action is also what makes the row checkboxes appear on a table that is
 * otherwise read-only, which is exactly what a queue wants: no create, no edit,
 * no delete, but selectable rows.
 */
export function queueDecisionBulkActions(
  config: QueueDecisionConfig
): BulkAction[] {
  const request = () => useTableStore.getState().requestDecision;
  return [
    {
      key: "queue-approve",
      label: config.approveLabel ?? "Approve selected",
      icon: Check,
      onClick: ({ ids }) => request()(decisionFor(config, "approve", ids)),
    },
    {
      key: "queue-reject",
      label: config.rejectLabel ?? "Reject selected",
      icon: X,
      variant: "destructive",
      onClick: ({ ids }) => request()(decisionFor(config, "reject", ids)),
    },
  ];
}

export default QueueDecisionActions;
