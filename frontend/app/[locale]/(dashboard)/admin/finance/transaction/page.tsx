"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { transactionAnalytics } from "./analytics";
export default function TransactionPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/transaction"
      model="transaction"
      permissions={{
        access: "access.transaction",
        view: "view.transaction",
        create: "create.transaction",
        edit: "edit.transaction",
        delete: "delete.transaction",
      }}
      pageSize={10}
      canCreate={false}
      canEdit={true}
      canDelete={true}
      canView={true}
      title="Transaction Management"
      itemTitle="Transaction"
      columns={columns}
      analytics={transactionAnalytics}
    />
  );
}
