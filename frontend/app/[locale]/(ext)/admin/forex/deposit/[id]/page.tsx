"use client";
import { TransactionEdit } from "@/app/[locale]/(dashboard)/admin/finance/transaction/components/transaction-edit";
import React from "react";
const ForexDepositTransactionEdit = () => {
  return (
    <TransactionEdit
      title="Forex Deposit Transaction Details"
      backUrl="/admin/forex/deposit"
      updateEndpoint={(id: string) => `/api/admin/forex/deposit/${id}`}
    />
  );
};
export default ForexDepositTransactionEdit;
