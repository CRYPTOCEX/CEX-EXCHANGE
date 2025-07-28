"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { walletAnalytics } from "./analytics";
export default function WalletPage() {
  return (
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
      pageSize={10}
      canCreate={false}
      canEdit={true}
      editCondition={(row) => row.type !== "ECO" && row.type !== "FUTURES"}
      canDelete={true}
      canView={true}
      title="Wallet Management"
      itemTitle="Wallet"
      columns={columns}
      analytics={walletAnalytics}
    />
  );
}
