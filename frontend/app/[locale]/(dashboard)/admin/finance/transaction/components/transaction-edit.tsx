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
  const t = useTranslations("dashboard");
  const { id } = useParams() as { id: string };
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Editable fields
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("");
  const [description, setDescription] = useState("");
  const [referenceId, setReferenceId] = useState("");

  // For rejection dialog
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState(
    "Please provide a reason for rejection."
  );

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
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-5 text-center">
        <p>{t("loading_transaction_details")}.</p>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="p-5 text-center">
        <p>{t("transaction_not_found")}.</p>
      </div>
    );
  }

  const isEditable = transaction.status === "PENDING";

  return (
    <div className="max-w-4xl mx-auto p-5 space-y-6">
      <TransactionHeader title={title} backUrl={backUrl} />
      <TransactionSummary transaction={transaction} />
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
      {isEditable && (
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            color="success"
            onClick={() => updateTransaction("COMPLETED")}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {t("complete_transaction")}
          </Button>
          <Button
            color="destructive"
            onClick={() => setIsRejectDialogOpen(true)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {t("reject_transaction")}
          </Button>
        </div>
      )}
      <RejectDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        rejectionMessage={rejectionMessage}
        onRejectionMessageChange={(e) => setRejectionMessage(e.target.value)}
        onReject={() => updateTransaction("REJECTED")}
        isLoading={isLoading}
      />
    </div>
  );
};
