"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "../deposit/log/columns";
import { transactionAnalytics } from "../transaction/analytics";
export default function TransferLogPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/transfer"
      model="transaction"
      modelConfig={{
        type: "INCOMING_TRANSFER",
      }}
      permissions={{
        access: "access.transfer",
        view: "view.transfer",
        create: "create.transfer",
        edit: "edit.transfer",
        delete: "delete.transfer",
      }}
      pageSize={10}
      canCreate={false}
      canEdit={true}
      editLink="/admin/finance/transfer/[id]"
      viewLink="/admin/finance/transfer/[id]"
      editCondition={(item) => ["PENDING", "PROCESSING"].includes(item.status)}
      canDelete={true}
      canView={true}
      title="Transfer Log Management"
      itemTitle="Transfer Log"
      columns={columns}
      analytics={transactionAnalytics}
    />
  );
}
