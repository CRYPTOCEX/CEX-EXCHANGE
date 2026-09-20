"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { TransactionSummary, Transaction } from "./transaction-summary";
import { TransactionEditForm } from "./transaction-edit-form";
import { RejectDialog } from "./reject-dialog";
import { TransactionHeader } from "./transaction-header";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface TransactionEditProps {
  title: string;
  backUrl: string;
  updateEndpoint: (id: string) => string;
}

export const TransactionEdit: React.FC<TransactionEditProps> = ({
  title,
  backUrl,
  updateEndpoint,
}) => {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const { id } = useParams() as { id: string };
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /*
    SAVING IS NOT LOADING, AND SHARING ONE FLAG BETWEEN THEM COST THE WHOLE PAGE.

    `updateTransaction` used to set `isLoading` — the same flag the initial fetch
    sets — so completing or rejecting a transaction replaced the entire screen
    with the centred line "Loading transaction details." for the length of the
    round trip, and then rebuilt it. The operator's click made the record they
    were reading disappear.

    Two flags: `isLoading` is "we have not read the record yet", `isSaving` is
    "we are writing". The buttons stay disabled during a write exactly as
    before — that behaviour is preserved, it just no longer unmounts the page.
  */
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("");
  const [description, setDescription] = useState("");
  const [referenceId, setReferenceId] = useState("");

  // For rejection dialog
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  // Empty, NOT the prompt text — see the matching note in the deposit,
  // withdraw and transfer detail clients. Pre-filling this stored the prompt
  // sentence as the rejection reason and emailed it to the customer.
  const [rejectionMessage, setRejectionMessage] = useState("");

  const fetchTransaction = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/admin/finance/transaction/${id}`,
        silent: true,
      });
      if (!error && data) {
        setTransaction(data);
        setAmount(String(data.amount));
        setFee(String(data.fee));
        setDescription(data.description || "");
        setReferenceId(data.referenceId || "");
      }
    } catch (err) {
      console.error("Failed to fetch transaction", err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchTransaction();
    }
  }, [id, fetchTransaction]);

  const updateTransaction = async (newStatus: string) => {
    if (!id) return;
    setIsSaving(true);
    try {
      // Build the payload.
      const payload: any = {
        status: newStatus,
        amount: parseFloat(amount),
        fee: parseFloat(fee),
        description,
        referenceId,
      };

      if (newStatus === "REJECTED") {
        let currentMeta = {};
        try {
          currentMeta = transaction?.metadata
            ? JSON.parse(transaction.metadata)
            : {};
        } catch (err) {
          console.error("Failed to parse metadata, using empty object", err);
        }
        payload.metadata = { ...currentMeta, message: rejectionMessage };
      } else {
        try {
          payload.metadata = transaction?.metadata
            ? JSON.parse(transaction.metadata)
            : {};
        } catch (err) {
          payload.metadata = {};
        }
      }

      const { error } = await $fetch({
        method: "PUT",
        url: updateEndpoint(id),
        body: payload,
      });
      if (!error) {
        setTransaction((prev) =>
          prev
            ? {
                ...prev,
                ...payload,
                status: newStatus,
                metadata: JSON.stringify(payload.metadata),
              }
            : prev
        );
        if (newStatus === "REJECTED") {
          setIsRejectDialogOpen(false);
        }
      }
    } catch (err) {
      console.error("Failed to update transaction", err);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * TWO EARLY RETURNS, TWO DIFFERENT PAGES, NEITHER OF THEM THIS ONE.
   * ==========================================================================
   *
   * `if (isLoading) return <div className="p-5 text-center">Loading…</div>` and
   * `if (!transaction) return <div className="p-5 text-center">Not found.</div>`
   * both replaced the whole route with a single centred line. The heading, the
   * back button, the form's four labelled fields and its card — all of it is
   * markup, none of it depends on the fetch, and all of it arrived at once.
   *
   * The frame renders in both states now. `recordMissing` is named here rather
   * than written inline because "there is no such transaction" is a CONCLUSION,
   * only reachable once the request has finished, and the old code let a slow
   * fetch produce the same screen as a failed one.
   */
  const recordMissing = !isLoading && !transaction;
  const isEditable = transaction?.status === "PENDING";
  /* Reserved while the record is in flight: an operator opening this page has
     come to act on a PENDING transaction, so the action row is the expected
     outcome and withholding it means the page grows by a button row at the
     moment the data lands. Disabled until we know, so it cannot be clicked on
     a record we have not read. */
  const showActions = isLoading || isEditable;

  return (
    <div className="max-w-4xl mx-auto p-5 space-y-6">
      <TransactionHeader title={title} backUrl={backUrl} />

      {recordMissing && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-ink">
          {tCommon("transaction_not_found")}.
        </p>
      )}

      {/*
        The summary card is the one thing here that still waits for its data,
        and deliberately so: `TransactionSummary` dereferences
        `transaction.user.firstName`, `transaction.wallet.currency` and
        `new Date(transaction.createdAt)` unconditionally, so it has no pending
        state to express — handing it an empty record would print "Invalid Date"
        and an empty red status pill rather than a placeholder. The fix belongs
        in that component as a `loading` prop; hand-copying its six-field grid
        here would be the duplicate-tree failure SKELETONS.md is about.
      */}
      {transaction && <TransactionSummary transaction={transaction} />}

      {/* Renders in BOTH states. Its inputs are fixed-height boxes that fill in
          rather than appear, and it is disabled until the record says it is
          editable — which a record we have not read yet does not. */}
      <TransactionEditForm
        amount={amount}
        fee={fee}
        description={description}
        referenceId={referenceId}
        onAmountChange={(e) => setAmount(e.target.value)}
        onFeeChange={(e) => setFee(e.target.value)}
        onDescriptionChange={(e) => setDescription(e.target.value)}
        onReferenceIdChange={(e) => setReferenceId(e.target.value)}
        disabled={!isEditable}
      />
      {showActions && (
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            color="success"
            onClick={() => updateTransaction("COMPLETED")}
            disabled={isLoading || isSaving}
            className="w-full sm:w-auto"
          >
            {t("complete_transaction")}
          </Button>
          <Button
            color="destructive"
            onClick={() => setIsRejectDialogOpen(true)}
            disabled={isLoading || isSaving}
            className="w-full sm:w-auto"
          >
            {tCommon("reject_transaction")}
          </Button>
        </div>
      )}
      <RejectDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        rejectionMessage={rejectionMessage}
        onRejectionMessageChange={(e) => setRejectionMessage(e.target.value)}
        onReject={() => updateTransaction("REJECTED")}
        isLoading={isSaving}
      />
    </div>
  );
};
