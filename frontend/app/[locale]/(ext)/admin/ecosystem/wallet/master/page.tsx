"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function EcosystemMasterWalletPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/ecosystem/wallet/master"
      model="ecosystemMasterWallet"
      permissions={{
        access: "access.ecosystem.master.wallet",
        view: "view.ecosystem.master.wallet",
        create: "create.ecosystem.master.wallet",
        edit: "edit.ecosystem.master.wallet",
        delete: "delete.ecosystem.master.wallet",
      }}
      pageSize={10}
      canCreate
      canView
      title="Master Wallets"
      itemTitle="Master Wallet"
      columns={columns}
    />
  );
}
