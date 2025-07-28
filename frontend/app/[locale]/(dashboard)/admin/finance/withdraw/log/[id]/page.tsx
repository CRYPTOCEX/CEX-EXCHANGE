"use client";
import { TransactionEdit } from "@/app/[locale]/(dashboard)/admin/finance/transaction/components/transaction-edit";
import React from "react";
const WithdrawTransactionEdit = () => {
  return (
    <TransactionEdit
      title="Withdraw Transaction Details"
      backUrl="/admin/finance/withdraw/log"
      updateEndpoint={(id: string) => `/api/admin/finance/withdraw/log/${id}`}
    />
  );
};
export default WithdrawTransactionEdit;
