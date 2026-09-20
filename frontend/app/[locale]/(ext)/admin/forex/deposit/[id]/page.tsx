"use client";
import { TransactionEdit } from "@/app/[locale]/(dashboard)/admin/finance/transaction/components/transaction-edit";
import React from "react";
import { useTranslations } from "next-intl";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

const ForexDepositTransactionEdit = () => {
  const t = useTranslations("ext_admin");
  return (
    <div className={`container ${PAGE_PADDING}`}>
      <TransactionEdit
        title={t("forex_deposit_transaction_details")}
        backUrl="/admin/forex/deposit"
        updateEndpoint={(id: string) => `/api/admin/forex/deposit/${id}`}
      />
    </div>
  );
};
export default ForexDepositTransactionEdit;
