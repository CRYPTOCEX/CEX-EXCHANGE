"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { MetadataDisplay, parseMetadata } from "./metadata-display";
import { Tag } from "@/components/ui/tag";
import { useTranslations } from "next-intl";

export interface Transaction {
  id: string;
  type: string;
  status: "PENDING" | "COMPLETED" | "REJECTED" | string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  wallet: {
    currency: string;
    type: string;
  };
  metadata: string | null;
}

interface TransactionSummaryProps {
  transaction: Transaction;
}

export const TransactionSummary: React.FC<TransactionSummaryProps> = ({
  transaction,
}) => {
  const t = useTranslations("dashboard");
  const parsedMetadata = parseMetadata(transaction.metadata);
  const rejectionMessage =
    transaction.status === "REJECTED" && parsedMetadata?.message
      ? parsedMetadata.message
      : null;

  return (
    <Card className="p-6 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <strong>{t("id")}</strong> {transaction.id}
        </div>
        <div>
          <strong>{t("type")}</strong> {transaction.type}
        </div>
        <div>
          <strong>{t("status")}</strong>{" "}
          <Tag
            variant={
              transaction.status === "PENDING"
                ? "warning"
                : transaction.status === "COMPLETED"
                  ? "success"
                  : "destructive"
            }
          >
            {transaction.status}
          </Tag>
        </div>
        <div className="flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2" />
          <span>{new Date(transaction.createdAt).toLocaleString()}</span>
        </div>
        <div>
          <strong>{t("user")}</strong> {transaction.user.firstName}{" "}
          {transaction.user.lastName}
          (
          {transaction.user.email}
          )
        </div>
        <div>
          <strong>{t("wallet")}</strong> {transaction.wallet.currency}
          (
          {transaction.wallet.type}
          )
        </div>
      </div>
      <div className="mt-4">
        <strong>{t("metadata")}</strong>
        <MetadataDisplay metadata={transaction.metadata} />
      </div>
      {rejectionMessage && (
        <div className="mt-4">
          <strong>{t("rejection_reason")}</strong>
          <p className="text-red-600 dark:text-red-400">{rejectionMessage}</p>
        </div>
      )}
    </Card>
  );
};
