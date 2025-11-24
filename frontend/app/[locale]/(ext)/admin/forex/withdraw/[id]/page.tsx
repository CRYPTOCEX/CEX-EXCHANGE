"use client";
import { TransactionEdit } from "@/app/[locale]/(dashboard)/admin/finance/transaction/components/transaction-edit";
import React from "react";
const ForexWithdrawTransactionEdit = () => {
  return (
    <TransactionEdit
      title="Forex Withdraw Transaction Details"
      backUrl="/admin/forex/withdraw"
      updateEndpoint={(id: string) => `/api/admin/forex/withdraw/${id}`}
    />
  );
};
export default ForexWithdrawTransactionEdit;
