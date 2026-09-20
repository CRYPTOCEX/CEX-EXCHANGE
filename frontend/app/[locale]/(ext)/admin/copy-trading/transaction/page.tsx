"use client";
import DataTable from "@/components/blocks/data-table";
import { Receipt, RotateCcw } from "lucide-react";
import { useColumns, useFormConfig, useViewConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";

export default function TransactionPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const viewConfig = useViewConfig();
  const analytics = useAnalytics();

  const handleReverse = async (transactionId: string, refresh?: () => void) => {
    const reason = prompt(t("enter_reversal_reason"));
    if (!reason) return;

    const { error } = await $fetch({
      url: `/api/admin/copy-trading/transaction/${transactionId}/reverse`,
      method: "POST",
      body: { reason },
    });

    if (!error) {
      toast.success(t("transaction_reversed_success"));
      refresh?.();
    }
  };

  return (
    <DataTable
      apiEndpoint="/api/admin/copy-trading/transaction"
      model="copyTradingTransaction"
      permissions={{
        access: "access.copy_trading",
        view: "view.copy_trading",
        create: "create.copy_trading",
        edit: "edit.copy_trading",
        delete: "delete.copy_trading",
      }}
      pageSize={20}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      // `canView` gates the row EXPAND, not just a detail link: with it off no
      // row can open and the ledger dialog below would never render. There is no
      // viewLink/onViewClick on this table, so this adds no row action.
      canView
      isParanoid={false}
      title={t("transactions_management")}
      description={t("view_all_copy_trading_transactions")}
      itemTitle="Transaction"
      columns={columns}
      formConfig={formConfig}
      viewConfig={viewConfig}
      analytics={analytics}
      design={{
        icon: Receipt,
      }}
      extraRowActions={(row: any, { canEdit, refresh }) => !canEdit ? null : (
        <>
          {/* REFUND is the type the reverse endpoint refuses outright ("Cannot
              reverse a refund transaction"); the guard used to name REVERSAL,
              which the model's enum has never contained, so the action was
              offered on rows that could only 400. */}
          {row.status === "COMPLETED" && row.type !== "REFUND" && (
            <DropdownMenuItem
              onClick={() => handleReverse(row.id, refresh)}
              className="text-destructive"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("reverse")}
            </DropdownMenuItem>
          )}
        </>
      )}
    />
  );
}
