"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function EcosystemCustodialWalletPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/ecosystem/wallet/custodial"
      model="ecosystemCustodialWallet"
      permissions={{
        access: "access.ecosystem.custodial.wallet",
        view: "view.ecosystem.custodial.wallet",
        create: "create.ecosystem.custodial.wallet",
        edit: "edit.ecosystem.custodial.wallet",
        delete: "delete.ecosystem.custodial.wallet",
      }}
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Custodial Wallets"
      itemTitle="Custodial Wallet"
      columns={columns}
    />
  );
}
