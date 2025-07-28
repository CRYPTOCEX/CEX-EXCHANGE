"use client";
import { TransactionEdit } from "@/app/[locale]/(dashboard)/admin/finance/transaction/components/transaction-edit";
import React from "react";
const TransferTransactionEdit = () => {
  return (
    <TransactionEdit
      title="Transfer Transaction Details"
      backUrl="/admin/finance/transfer"
      updateEndpoint={(id: string) => `/api/admin/finance/transfer/${id}`}
    />
  );
};
export default TransferTransactionEdit;
