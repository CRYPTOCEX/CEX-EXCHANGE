"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "../../../../(dashboard)/admin/finance/deposit/log/columns";
import { transactionAnalytics } from "../../../../(dashboard)/admin/finance/transaction/analytics";
export default function DepositLogPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/forex/withdraw"
      model="transaction"
      modelConfig={{
        type: "FOREX_WITHDRAW",
      }}
      permissions={{
        access: "access.forex.withdraw",
        view: "view.forex.withdraw",
        create: "create.forex.withdraw",
        edit: "edit.forex.withdraw",
        delete: "delete.forex.withdraw",
      }}
      pageSize={10}
      canCreate={false}
      canEdit={true}
      editLink="/admin/forex/withdraw/[id]"
      viewLink="/admin/forex/withdraw/[id]"
      editCondition={(item) => ["PENDING", "PROCESSING"].includes(item.status)}
      canDelete={true}
      canView={true}
      title="Forex Withdraw Management"
      itemTitle="Forex Withdraw"
      columns={columns}
      analytics={transactionAnalytics}
    />
  );
}
