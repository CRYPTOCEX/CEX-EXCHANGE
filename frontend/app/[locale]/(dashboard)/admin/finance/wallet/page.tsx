"use client";
import { useCallback, useState } from "react";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useViewConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { useTableStore } from "@/components/blocks/data-table/store";
import type { RowActionContext } from "@/components/blocks/data-table/types/table";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  AdjustBalanceDialog,
  type AdjustableWallet,
} from "@/components/blocks/wallet/adjust-balance-dialog";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { DollarSign, Loader2, Power, PowerOff, Wallet } from "lucide-react";

export default function WalletPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const columns = useColumns();
  const viewConfig = useViewConfig();
  const analytics = useAnalytics();

  // The store-based fetchData is the cleanest way to refresh the visible page
  // without blowing away scroll state or filters.
  const fetchData = useTableStore((s) => s.fetchData);

  /*
   * The adjust form itself lives in `components/blocks/wallet`, shared with the
   * wallet detail page. It owns its own type/amount/description/notify state and
   * mints one idempotency nonce per open, so this page only has to say WHICH
   * wallet and WHEN to open.
   */
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustRow, setAdjustRow] = useState<AdjustableWallet | null>(null);

  // Status toggle tracking (one-at-a-time per row)
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleStatusToggle = useCallback(
    async (row: any) => {
      if (!row?.id || togglingId) return;
      const next = !row.status;
      setTogglingId(row.id);
      try {
        const { error } = await $fetch({
          url: `/api/admin/finance/wallet/${row.id}/status`,
          method: "PUT",
          body: { status: next },
        });

        if (error) return;

        toast.success(`Wallet ${next ? "enabled" : "disabled"}`);
        await fetchData();
      } finally {
        setTogglingId(null);
      }
    },
    [togglingId, fetchData]
  );

  // Balance adjustments and freezing a wallet both move or lock real money, so
  // they need the same `edit.wallet` the endpoints demand.
  const extraRowActions = useCallback(
    (row: any, { canEdit }: RowActionContext) => {
      if (!canEdit) return null;
      const isToggling = togglingId === row.id;
      return (
        <>
          <DropdownMenuItem
            onClick={() => {
              setAdjustRow(row);
              setAdjustOpen(true);
            }}
            className="cursor-pointer"
          >
            <DollarSign className="mr-2 h-4 w-4 text-success" />
            {tCommon("adjust_balance")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleStatusToggle(row)}
            disabled={isToggling}
            className="cursor-pointer"
          >
            {isToggling ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : row.status ? (
              <PowerOff className="mr-2 h-4 w-4 text-destructive" />
            ) : (
              <Power className="mr-2 h-4 w-4 text-success" />
            )}
            {row.status ? t("disable_wallet") : t("enable_wallet")}
          </DropdownMenuItem>
        </>
      );
    },
    [togglingId, handleStatusToggle, t, tCommon]
  );

  return (
    <>
      <DataTable
        apiEndpoint="/api/admin/finance/wallet"
        model="wallet"
        permissions={{
          access: "access.wallet",
          view: "view.wallet",
          create: "create.wallet",
          edit: "edit.wallet",
          delete: "delete.wallet",
        }}
        pageSize={12}
        canCreate={false}
        canEdit={false}
        canDelete={false}
        canView={true}
        /*
         * Sends `View` to the record page rather than only the summary dialog.
         *
         * The dialog stays reachable by expanding a row (a configured
         * `viewConfig` outranks the "there's a detail page already" suppression
         * in `content/rows/index.tsx`), so the quick look is unchanged — but the
         * balance ledger, which is the thing an operator opens a wallet to read,
         * needs a page. Adjusting a balance here and auditing it on the owner's
         * CRM record was the round trip this removes.
         */
        viewLink="/admin/finance/wallet/[id]"
        isParanoid={true}
        title={t("wallet_management")}
        description={t("manage_user_wallets_and_balances")}
        itemTitle="Wallet"
        columns={columns}
        viewConfig={viewConfig}
        analytics={analytics}
        extraRowActions={extraRowActions}
        design={{
          icon: Wallet,
        }}
      />

      {/* The row is deliberately NOT cleared on close: Radix keeps the dialog
          subtree mounted through its exit animation, and nulling the wallet
          there would unmount the form — and its `DialogTitle` — mid-dismiss.
          A stale row behind a closed dialog is invisible, and the next open
          overwrites it before it is read. */}
      <AdjustBalanceDialog
        wallet={adjustRow}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        onAdjusted={fetchData}
      />
    </>
  );
}
