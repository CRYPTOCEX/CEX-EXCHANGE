"use client";
import DataTable from "@/components/blocks/data-table";
import { transactionAnalytics } from "../../../../(dashboard)/admin/finance/transaction/analytics";
import { columns } from "../../../../(dashboard)/admin/finance/deposit/log/columns";
export default function DepositLogPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/forex/deposit"
      model="transaction"
      modelConfig={{
        type: "FOREX_DEPOSIT",
      }}
      permissions={{
        access: "access.forex.deposit",
        view: "view.forex.deposit",
        create: "create.forex.deposit",
        edit: "edit.forex.deposit",
        delete: "delete.forex.deposit",
      }}
      pageSize={10}
      canCreate={false}
      canEdit={true}
      editLink="/admin/forex/deposit/[id]"
      viewLink="/admin/forex/deposit/[id]"
      editCondition={(item) => ["PENDING", "PROCESSING"].includes(item.status)}
      canDelete={true}
      canView={true}
      title="Forex Deposit Management"
      itemTitle="Forex Deposit"
      columns={columns}
      analytics={transactionAnalytics}
    />
  );
}
