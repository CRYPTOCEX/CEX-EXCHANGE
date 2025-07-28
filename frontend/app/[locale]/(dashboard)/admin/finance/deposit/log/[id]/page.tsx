"use client";
import { TransactionEdit } from "@/app/[locale]/(dashboard)/admin/finance/transaction/components/transaction-edit";
import React from "react";
const DepositTransactionEdit = () => {
  return (
    <TransactionEdit
      title="Deposit Transaction Details"
      backUrl="/admin/finance/deposit/log"
      updateEndpoint={(id: string) => `/api/admin/finance/deposit/log/${id}`}
    />
  );
};
export default DepositTransactionEdit;
